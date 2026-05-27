#!/usr/bin/env bash

#set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

OUTPUT_FILE="${SYNC_PROGRESS_FILE:-$FRONTEND_DIR/public/data/sync-progress.json}"
STATUS_FILE="${SYNC_STATUS_FILE:-$FRONTEND_DIR/public/data/sync-status.json}"
LOG_DIR="${SYNC_LOG_DIR:-./logs}"
QUEUE_FILE="${SYNC_QUEUE_FILE:-}"
INTERVAL="${SYNC_MONITOR_INTERVAL:-5}"

json_escape() {
  printf '%s' "$1" \
    | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g; s/\r/\\r/g' \
    | awk '{printf "%s%s", sep, $0; sep="\\n"}'
}

iso_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

started_at_from_elapsed() {
  local elapsed="$1"
  date -u -d "@$(( $(date +%s) - elapsed ))" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || iso_now
}

detect_type() {
  case "$1" in
    *rsync*) printf 'rsync' ;;
    *git*) printf 'git' ;;
    *) printf 'process' ;;
  esac
}

mirror_name_from_args() {
  local args="$1"
  local match token

  match="$(printf '%s\n' "$args" | sed -n 's#.*\(/srv/mirrors/\([^/[:space:]]\+\)\).*#\2#p' | head -n 1)"
  if [ -n "$match" ]; then
    printf '%s' "$match"
    return
  fi

  match="$(printf '%s\n' "$args" | sed -n 's#.*\(/mirrors/\([^/[:space:]]\+\)\).*#\2#p' | head -n 1)"
  if [ -n "$match" ]; then
    printf '%s' "$match"
    return
  fi

  for token in $args; do
    case "$token" in
      -*|rsync|git|clone|fetch|pull|sync-monitor.sh) continue ;;
      *::*) token="${token##*::}" ;;
      *@*:*) token="${token##*:}" ;;
    esac
    token="${token%/}"
    token="${token##*/}"
    token="${token%.git}"
    if [ -n "$token" ]; then
      printf '%s' "$token"
      return
    fi
  done

  printf 'unknown'
}

latest_log_for_name() {
  local name="$1"
  if [ -z "$LOG_DIR" ] || [ ! -d "$LOG_DIR" ]; then
    return
  fi

  find "$LOG_DIR" -type f \( -name "$name*.log" -o -name "*$name*.log" \) \
    -printf '%T@ %p\n' 2>/dev/null \
    | sort -nr \
    | awk 'NR == 1 { $1=""; sub(/^ /, ""); print }'
}

parse_progress_field() {
  local log_file="$1"
  local field="$2"
  local line pct transferred speed eta total current

  if [ -z "$log_file" ] || [ ! -f "$log_file" ]; then
    [ "$field" = "pct" ] && printf '0'
    return
  fi

  line="$(tail -n 200 "$log_file" | grep -E '[0-9]+%[[:space:]]+[0-9.,]+[KMGT]?B/s' | tail -n 1)"
  pct="$(printf '%s' "$line" | sed -n 's/.* \([0-9][0-9]*\)%.*/\1/p')"
  transferred="$(printf '%s' "$line" | awk '{for (i=1; i<=NF; i++) if ($i ~ /^[0-9.,]+[KMGT]?B$/) {print $i; exit}}')"
  speed="$(printf '%s' "$line" | awk '{for (i=1; i<=NF; i++) if ($i ~ /^[0-9.,]+[KMGT]?B\/s$/) {print $i; exit}}')"
  eta="$(printf '%s' "$line" | awk '{for (i=1; i<=NF; i++) if ($i ~ /^[0-9]+:[0-9][0-9](:[0-9][0-9])?$/) value=$i} END {print value}')"
  total="$(tail -n 200 "$log_file" | sed -n 's/.*total size is \([^ ]\+\).*/\1/p' | tail -n 1)"
  current="$(tail -n 200 "$log_file" | grep -v -E '(%|^sending |^sent |^total size|^receiving )' | tail -n 1 | sed 's/^[[:space:]]*//')"

  case "$field" in
    pct) printf '%s' "${pct:-0}" ;;
    transferred) printf '%s' "$transferred" ;;
    total) printf '%s' "$total" ;;
    speed) printf '%s' "$speed" ;;
    eta) printf '%s' "$eta" ;;
    current) printf '%s' "$current" ;;
  esac
}

status_names_by_state() {
  local states="$1"
  if [ ! -f "$STATUS_FILE" ]; then
    return
  fi

  tr '{' '\n' < "$STATUS_FILE" \
    | sed -n 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1 \2/p' \
    | awk -v states="$states" '
      BEGIN { split(states, allowed, ","); for (i in allowed) ok[allowed[i]]=1 }
      ok[$2] { print $1 }
    '
}

result_objects_by_state() {
  local states="$1"
  if [ ! -f "$STATUS_FILE" ]; then
    return
  fi

  tr '{' '\n' < "$STATUS_FILE" \
    | grep '"name"' \
    | while IFS= read -r item; do
      local name status size duration error timestamp last_update state_ok
      name="$(printf '%s' "$item" | sed -n 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
      status="$(printf '%s' "$item" | sed -n 's/.*"status"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
      state_ok=",${states},"
      case "$state_ok" in
        *,"$status",*) ;;
        *) continue ;;
      esac
      size="$(printf '%s' "$item" | sed -n 's/.*"size"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
      duration="$(printf '%s' "$item" | sed -n 's/.*"duration"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
      error="$(printf '%s' "$item" | sed -n 's/.*"error"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
      timestamp="$(printf '%s' "$item" | sed -n 's/.*"timestamp"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
      last_update="$(printf '%s' "$item" | sed -n 's/.*"last_update"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"

      printf '{"name":"%s","status":"%s","size":"%s","duration":"%s","error":"%s","timestamp":"%s","last_update":"%s"}\n' \
        "$(json_escape "$name")" \
        "$(json_escape "$status")" \
        "$(json_escape "$size")" \
        "$(json_escape "$duration")" \
        "$(json_escape "$error")" \
        "$(json_escape "${timestamp:-$(iso_now)}")" \
        "$(json_escape "$last_update")"
    done
}

json_string_array_from_lines() {
  local first=1 line
  printf '['
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    if [ "$first" -eq 0 ]; then printf ','; fi
    printf '"%s"' "$(json_escape "$line")"
    first=0
  done
  printf ']'
}

json_object_array_from_lines() {
  local first=1 line
  printf '['
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    if [ "$first" -eq 0 ]; then printf ','; fi
    printf '%s' "$line"
    first=0
  done
  printf ']'
}

write_snapshot() {
  local tmp active_file active_names_file queue_file completed_file failed_file logs_file
  tmp="$(mktemp)"
  active_file="$(mktemp)"
  active_names_file="$(mktemp)"
  queue_file="$(mktemp)"
  completed_file="$(mktemp)"
  failed_file="$(mktemp)"
  logs_file="$(mktemp)"

  local prev_size_file="${OUTPUT_FILE%.json}.size"
  local prev_time_file="${OUTPUT_FILE%.json}.time"

  ps -eo pid=,etimes=,comm=,args= \
    | awk '/(^|[[:space:]])(rsync|git)([[:space:]]|$)/ && !/sync-monitor\.sh/ {print}' \
    | while IFS= read -r line; do
      set -- $line
      local pid="$1" etimes="$2" comm="$3"
      shift 3
      local args="$*"
      local type name started transferred_hr current speed mirror_dir
      type="$(detect_type "$comm $args")"
      name="$(mirror_name_from_args "$args")"
      started="$(started_at_from_elapsed "$etimes")"

      # Extract mirror dir from rsync args
      mirror_dir=""
      for token in $args; do
        case "$token" in /data/mirrors/*) mirror_dir="${token%/}";; esac
      done

      if [ -d "$mirror_dir" ]; then
        current="$(find "$mirror_dir" -type f -mmin -1 2>/dev/null | head -3 | sed "s|$mirror_dir/||" | tr '\n' ';' | sed 's/;$//')"
        transferred="$(du -sb "$mirror_dir" 2>/dev/null | awk '{print $1}')"
        transferred_hr="$(numfmt --to=iec "${transferred:-0}" 2>/dev/null || echo '0')"

        # Simple speed estimate from size delta
        local prev_sz="$(grep "^${name}=" "$prev_size_file" 2>/dev/null | cut -d= -f2)"
        local prev_ts="$(grep "^${name}=" "$prev_time_file" 2>/dev/null | cut -d= -f2)"
        local now=$(date +%s)
        if [ -n "$prev_sz" ] && [ -n "$prev_ts" ] && [ "$transferred" -gt "$prev_sz" ] 2>/dev/null; then
          local delta=$(( transferred - prev_sz ))
          local dt=$(( now - prev_ts ))
          [ "$dt" -gt 0 ] && speed="$(numfmt --to=iec $(( delta / dt )) 2>/dev/null)B/s"
        fi
      fi
      transferred_hr="${transferred_hr:-0}"

      printf '%s\n' "$name" >> "$active_names_file"
      printf '{"name":"%s","pid":%s,"type":"%s","started_at":"%s","progress_pct":0,"transferred_bytes":"%s","total_bytes":"","current_file":"%s","speed":"%s","eta":""}\n' \
        "$(json_escape "$name")" "$pid" "$(json_escape "$type")" "$(json_escape "$started")" \
        "$(json_escape "$transferred_hr")" "$(json_escape "$current")" \
        "$(json_escape "$speed")" >> "$active_file"

      # Persist state for speed calc next round
      local now=$(date +%s)
      echo "${name}=${transferred:-0}" >> "$prev_size_file.$$"
    done

  if [ -n "$QUEUE_FILE" ] && [ -f "$QUEUE_FILE" ]; then
    grep -v '^[[:space:]]*$' "$QUEUE_FILE" > "$queue_file" || true
  else
    status_names_by_state "pending,syncing" > "$queue_file" || true
  fi

  if [ -s "$active_names_file" ]; then
    grep -Fvx -f "$active_names_file" "$queue_file" > "$queue_file.filtered" || true
    mv "$queue_file.filtered" "$queue_file"
  fi

  result_objects_by_state "success,skipped" > "$completed_file" || true
  result_objects_by_state "failed" > "$failed_file" || true

  if [ -n "$LOG_DIR" ] && [ -d "$LOG_DIR" ]; then
    find "$LOG_DIR" -type f -name '*.log' -printf '%T@ %p\n' 2>/dev/null \
      | sort -nr \
      | awk 'NR <= 3 { $1=""; sub(/^ /, ""); print }' \
      | xargs -r tail -n 8 2>/dev/null \
      | tail -n 20 > "$logs_file" || true
  fi

  {
    printf '{'
    printf '"active":'
    json_object_array_from_lines < "$active_file"
    printf ',"queue":'
    json_string_array_from_lines < "$queue_file"
    printf ',"completed":'
    json_object_array_from_lines < "$completed_file"
    printf ',"failed":'
    json_object_array_from_lines < "$failed_file"
    printf ',"logs":'
    json_string_array_from_lines < "$logs_file"
    printf ',"updated_at":"%s"' "$(iso_now)"
    printf '}\n'
  } > "$tmp"

  mkdir -p "$(dirname "$OUTPUT_FILE")"
  mv "$tmp" "$OUTPUT_FILE"
  chmod 644 "$OUTPUT_FILE"
  rm -f "$active_file" "$active_names_file" "$queue_file" "$completed_file" "$failed_file" "$logs_file"
}

case "${1:-watch}" in
  once)
    write_snapshot
    ;;
  watch)
    while true; do
      write_snapshot
      sleep "$INTERVAL"
    done
    ;;
  *)
    printf 'Usage: %s [once|watch]\n' "$0" >&2
    exit 2
    ;;
esac
