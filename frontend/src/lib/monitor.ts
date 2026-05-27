import type { SyncMirrorResult } from "./types";

export interface ActiveSyncProgress {
  name: string;
  pid: number;
  type: "rsync" | "git" | string;
  started_at?: string;
  progress_pct: number;
  transferred_bytes?: string;
  total_bytes?: string;
  current_file?: string;
  speed?: string;
  eta?: string;
}

export interface SyncProgress {
  active: ActiveSyncProgress[];
  queue: string[];
  completed?: SyncMirrorResult[];
  failed?: SyncMirrorResult[];
  logs?: string[];
  updated_at: string;
}

export async function loadSyncProgress(): Promise<SyncProgress | null> {
  try {
    const resp = await fetch(`/data/sync-progress.json?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}
