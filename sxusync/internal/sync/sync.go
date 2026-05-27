package sync

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/sxuosa/sxusync/internal/config"
)

var dryRun bool

var versionDirPattern = regexp.MustCompile(`^v?(\d+)\.\d+\.\d+(-[a-zA-Z0-9.]+)?$`)

// MirrorResult represents the result of a sync operation
type MirrorResult struct {
	Name      string `json:"name"`
	Status    string `json:"status"` // success, failed, skipped
	Size      string `json:"size,omitempty"`
	Duration  string `json:"duration,omitempty"`
	Error     string `json:"error,omitempty"`
	Timestamp string `json:"timestamp"`
	UpdateAt  string `json:"last_update,omitempty"`
}

func SetDryRun(enabled bool) {
	dryRun = enabled
}

// RunAll executes all enabled mirror sync jobs
// Writes status incrementally after each mirror completes
// If nameFilter is non-empty, only mirrors with matching Name are processed
func RunAll(mirrors []config.MirrorConfig, statusPath, logDir, nameFilter string) []MirrorResult {
	if err := os.MkdirAll(logDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "create log dir %s: %v\n", logDir, err)
	}

	// If nameFilter is set, load existing results to preserve other mirrors' statuses
	existingResults := loadExistingResults(statusPath)
	results := existingResults
	if results == nil {
		results = make([]MirrorResult, 0, len(mirrors))
	}

	for _, m := range mirrors {
		// Name filter: skip non-matching mirrors (keep their existing status)
		if nameFilter != "" && m.Name != nameFilter {
			continue
		}

		if !*m.Enabled {
			result := MirrorResult{
				Name:      m.Name,
				Status:    "disabled",
				Timestamp: time.Now().UTC().Format(time.RFC3339),
			}
			results = replaceOrAppend(results, result)
			flushStatus(results, statusPath)
			continue
		}

		fmt.Printf("Syncing %s...\n", m.Name)
		result := syncMirror(m, logDir)
		results = replaceOrAppend(results, result)

		// Write status after each mirror (incremental)
		flushStatus(results, statusPath)

		if result.Status == "success" {
			fmt.Printf("  ✓ %s\n", m.Name)
		} else {
			fmt.Printf("  ✗ %s: %s\n", m.Name, result.Error)
		}
	}

	return results
}

// replaceOrAppend replaces an existing entry by Name, or appends if not found
func replaceOrAppend(results []MirrorResult, newResult MirrorResult) []MirrorResult {
	for i, r := range results {
		if r.Name == newResult.Name {
			results[i] = newResult
			return results
		}
	}
	return append(results, newResult)
}

// loadExistingResults reads status file and returns existing mirror results
func loadExistingResults(path string) []MirrorResult {
	if path == "" {
		return nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	var output struct {
		Mirrors []MirrorResult `json:"mirrors"`
	}
	if err := json.Unmarshal(data, &output); err != nil {
		return nil
	}
	return output.Mirrors
}

// flushStatus writes current results to the status file immediately
func flushStatus(results []MirrorResult, path string) {
	if path == "" {
		return
	}

	output := struct {
		UpdatedAt string         `json:"updated_at"`
		Version   string         `json:"version"`
		Mirrors   []MirrorResult `json:"mirrors"`
	}{
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
		Version:   "1.0",
		Mirrors:   results,
	}

	data, err := json.MarshalIndent(output, "", "  ")
	if err != nil {
		return
	}
	os.WriteFile(path, data, 0644)
}

// StatusAll checks the current status of all mirrors without syncing
// Writes status incrementally after each check
// If nameFilter is non-empty, only mirrors with matching Name are checked
// Existing status for non-filtered mirrors is preserved from the status file
func StatusAll(mirrors []config.MirrorConfig, statusPath, nameFilter string) []MirrorResult {
	// When filtering by name, load existing results to preserve other mirrors' statuses
	results := loadExistingResults(statusPath)
	if results == nil {
		results = make([]MirrorResult, 0, len(mirrors))
	}

	for _, m := range mirrors {
		// Name filter: skip non-matching mirrors
		if nameFilter != "" && m.Name != nameFilter {
			continue
		}

		if !*m.Enabled {
			result := MirrorResult{
				Name:      m.Name,
				Status:    "disabled",
				Timestamp: time.Now().UTC().Format(time.RFC3339),
			}
			results = replaceOrAppend(results, result)
			flushStatus(results, statusPath)
			continue
		}

		// Check if mirror dir exists and when it was last updated
		mirrorPath := m.MirrorDir
		info, err := os.Stat(mirrorPath)
		if err != nil {
			results = replaceOrAppend(results, MirrorResult{
				Name:      m.Name,
				Status:    "pending",
				Timestamp: time.Now().UTC().Format(time.RFC3339),
			})
			continue
		}

		size := dirSize(mirrorPath)
		results = replaceOrAppend(results, MirrorResult{
			Name:      m.Name,
			Status:    "success",
			Size:      formatBytes(size),
			UpdateAt:  info.ModTime().UTC().Format(time.RFC3339),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		})
		flushStatus(results, statusPath)
	}

	return results
}

func syncMirror(m config.MirrorConfig, logDir string) MirrorResult {
	start := time.Now()

	// Determine sync approach based on provider
	switch m.Provider {
	case "rsync":
		return syncRsync(m, start, logDir)
	case "git":
		return syncGit(m, start, logDir)
	case "download":
		return syncDownload(m, start)
	case "command":
		return syncCommand(m, start)
	default:
		return MirrorResult{
			Name:      m.Name,
			Status:    "failed",
			Error:     fmt.Sprintf("unsupported provider: %s", m.Provider),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
	}
}

func syncRsync(m config.MirrorConfig, start time.Time, logDir string) MirrorResult {
	// Ensure mirror directory exists
	if err := os.MkdirAll(m.MirrorDir, 0755); err != nil {
		return MirrorResult{
			Name: m.Name, Status: "failed",
			Error: err.Error(), Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
	}

	// Build rsync args
	args := []string{
		"-avzH",
		"--delete",
		"--delete-delay",
		"--copy-dirlinks",
		"--timeout=300",
		"--chmod=Du=rwx,Dg=rx,Do=rx,Fu=rw,Fg=r,Fo=r",
	}
	if dryRun {
		args = append(args, "--dry-run")
	}

	// Add include/exclude patterns for selective sync
	for _, incl := range m.Include {
		args = append(args, "--include="+incl)
	}
	for _, excl := range m.Exclude {
		args = append(args, "--exclude="+excl)
	}

	if m.UseIPv6 {
		args = append(args, "-6")
	} else {
		args = append(args, "-4")
	}

	// Source and dest
	args = append(args, m.Upstream, m.MirrorDir)

	cmd := exec.Command("rsync", args...)
	logFile, err := openMirrorLog(logDir, m.Name)
	if err != nil {
		return MirrorResult{
			Name:      m.Name,
			Status:    "failed",
			Error:     err.Error(),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
	}
	defer logFile.Close()
	fmt.Fprintf(logFile, "\n[%s] starting rsync %s\n", time.Now().UTC().Format(time.RFC3339), m.Name)
	cmd.Stdout = logFile
	cmd.Stderr = logFile

	err = cmd.Run()
	duration := time.Since(start)

	if err != nil {
		return MirrorResult{
			Name:      m.Name,
			Status:    "failed",
			Error:     err.Error(),
			Duration:  duration.Round(time.Second).String(),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
	}

	if m.KeepVersions > 0 {
		if err := cleanOldVersions(m.MirrorDir, m.KeepVersions); err != nil {
			return MirrorResult{
				Name:      m.Name,
				Status:    "failed",
				Error:     err.Error(),
				Duration:  duration.Round(time.Second).String(),
				Timestamp: time.Now().UTC().Format(time.RFC3339),
			}
		}
	}

	size := dirSize(m.MirrorDir)

	return MirrorResult{
		Name:      m.Name,
		Status:    "success",
		Size:      formatBytes(size),
		Duration:  duration.Round(time.Second).String(),
		UpdateAt:  time.Now().UTC().Format(time.RFC3339),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}

func syncCommand(m config.MirrorConfig, start time.Time) MirrorResult {
	if m.Script == "" {
		return MirrorResult{
			Name:      m.Name,
			Status:    "failed",
			Error:     "no script specified for command provider",
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
	}

	cmd := exec.Command(m.Script)
	cmd.Dir = m.MirrorDir
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Env = append(os.Environ(),
		"SXUSYNC_MIRROR_NAME="+m.Name,
		"SXUSYNC_UPSTREAM="+m.Upstream,
		"SXUSYNC_MIRROR_DIR="+m.MirrorDir,
	)

	err := cmd.Run()
	duration := time.Since(start)

	if err != nil {
		return MirrorResult{
			Name:      m.Name,
			Status:    "failed",
			Error:     err.Error(),
			Duration:  duration.Round(time.Second).String(),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
	}

	size := dirSize(m.MirrorDir)

	return MirrorResult{
		Name:      m.Name,
		Status:    "success",
		Size:      formatBytes(size),
		Duration:  duration.Round(time.Second).String(),
		UpdateAt:  time.Now().UTC().Format(time.RFC3339),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}

func syncGit(m config.MirrorConfig, start time.Time, logDir string) MirrorResult {
	// Ensure mirror dir exists
	if err := os.MkdirAll(m.MirrorDir, 0755); err != nil {
		return MirrorResult{
			Name: m.Name, Status: "failed",
			Error: err.Error(), Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
	}

	// Detect if already cloned (bare mirror: HEAD exists in dir; non-bare: .git/HEAD)
	gitDir := filepath.Join(m.MirrorDir, ".git")
	bareHead := filepath.Join(m.MirrorDir, "HEAD")
	var cmd *exec.Cmd

	if _, err := os.Stat(gitDir); err == nil {
		// Already cloned (non-bare) — fetch latest
		fmt.Printf("  git pull %s\n", m.Name)
		cmd = exec.Command("git", "-C", m.MirrorDir, "pull", "--ff-only")
	} else if _, err := os.Stat(bareHead); err == nil {
		// Bare mirror repo — use remote update
		fmt.Printf("  git remote update %s\n", m.Name)
		cmd = exec.Command("git", "-C", m.MirrorDir, "remote", "update", "--prune")
	} else {
		// Fresh clone
		fmt.Printf("  git clone %s\n", m.Name)
		args := []string{"clone"}
		if m.GitShallow {
			depth := m.GitDepth
			if depth <= 0 {
				depth = 1
			}
			args = append(args, "--depth", fmt.Sprintf("%d", depth))
		}
		if m.GitBranch != "" {
			args = append(args, "--branch", m.GitBranch)
		}
		args = append(args, "--mirror", m.Upstream, m.MirrorDir)
		cmd = exec.Command("git", args...)
	}

	logFile, err := openMirrorLog(logDir, m.Name)
	if err != nil {
		return MirrorResult{
			Name:      m.Name,
			Status:    "failed",
			Error:     err.Error(),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
	}
	defer logFile.Close()
	fmt.Fprintf(logFile, "\n[%s] starting git sync %s\n", time.Now().UTC().Format(time.RFC3339), m.Name)
	cmd.Stdout = logFile
	cmd.Stderr = logFile

	err = cmd.Run()
	duration := time.Since(start)

	if err != nil {
		return MirrorResult{
			Name: m.Name, Status: "failed",
			Error: err.Error(), Duration: duration.Round(time.Second).String(),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
	}

	return MirrorResult{
		Name: m.Name, Status: "success",
		Size:      formatBytes(dirSize(m.MirrorDir)),
		Duration:  duration.Round(time.Second).String(),
		UpdateAt:  time.Now().UTC().Format(time.RFC3339),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}

func syncDownload(m config.MirrorConfig, start time.Time) MirrorResult {
	// Ensure target directory exists
	if err := os.MkdirAll(m.MirrorDir, 0755); err != nil {
		return MirrorResult{
			Name: m.Name, Status: "failed",
			Error: err.Error(), Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
	}

	// Use wget for downloading
	args := []string{
		"-c", // continue partial downloads
		"-N", // timestamping
		"-P", m.MirrorDir,
		"--show-progress",
	}

	if m.DownloadRecursive {
		args = append(args, "-r", "-np")
	}
	if len(m.DownloadFiles) > 0 {
		for _, f := range m.DownloadFiles {
			args = append(args, fmt.Sprintf("%s/%s", m.Upstream, f))
		}
	} else {
		args = append(args, m.Upstream)
	}

	cmd := exec.Command("wget", args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	err := cmd.Run()
	duration := time.Since(start)

	if err != nil {
		return MirrorResult{
			Name: m.Name, Status: "failed",
			Error: err.Error(), Duration: duration.Round(time.Second).String(),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		}
	}

	return MirrorResult{
		Name: m.Name, Status: "success",
		Size:      formatBytes(dirSize(m.MirrorDir)),
		Duration:  duration.Round(time.Second).String(),
		UpdateAt:  time.Now().UTC().Format(time.RFC3339),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}

func openMirrorLog(logDir, name string) (*os.File, error) {
	return os.OpenFile(filepath.Join(logDir, name+".log"), os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
}

// Helper: calculate directory size
func dirSize(path string) int64 {
	var size int64
	filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return nil
	})
	return size
}

// Helper: format bytes to human-readable string
func formatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%dB", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f%cB", float64(b)/float64(div), "KMGTPE"[exp])
}

type mirrorVersionDir struct {
	name  string
	path  string
	major int
	minor int
	patch int
}

func cleanOldVersions(mirrorDir string, keepCount int) error {
	if keepCount <= 0 {
		return nil
	}

	entries, err := os.ReadDir(mirrorDir)
	if err != nil {
		return fmt.Errorf("read mirror dir %s: %w", mirrorDir, err)
	}

	byMajor := make(map[int][]mirrorVersionDir)
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		version, ok := parseVersionDir(entry.Name(), mirrorDir)
		if !ok {
			continue
		}
		byMajor[version.major] = append(byMajor[version.major], version)
	}

	majors := make([]int, 0, len(byMajor))
	for major := range byMajor {
		majors = append(majors, major)
	}
	sort.Ints(majors)

	for _, major := range majors {
		versions := byMajor[major]
		sort.Slice(versions, func(i, j int) bool {
			if versions[i].major != versions[j].major {
				return versions[i].major > versions[j].major
			}
			if versions[i].minor != versions[j].minor {
				return versions[i].minor > versions[j].minor
			}
			if versions[i].patch != versions[j].patch {
				return versions[i].patch > versions[j].patch
			}
			return versions[i].name > versions[j].name
		})

		if len(versions) <= keepCount {
			continue
		}

		oldVersions := versions[keepCount:]
		oldNames := make([]string, 0, len(oldVersions))
		for _, version := range oldVersions {
			oldNames = append(oldNames, version.name)
		}

		fmt.Printf("[cleanup] %s: keeping %d for v%d.x, removing %s\n", mirrorDir, keepCount, major, strings.Join(oldNames, ", "))
		for _, version := range oldVersions {
			fmt.Printf("[cleanup] removing %s\n", version.path)
			if dryRun {
				continue
			}
			if err := os.RemoveAll(version.path); err != nil {
				return fmt.Errorf("remove old version %s: %w", version.path, err)
			}
		}
	}

	return nil
}

func parseVersionDir(name, mirrorDir string) (mirrorVersionDir, bool) {
	if !versionDirPattern.MatchString(name) {
		return mirrorVersionDir{}, false
	}

	version := strings.TrimPrefix(name, "v")
	version = strings.SplitN(version, "-", 2)[0]
	parts := strings.Split(version, ".")
	if len(parts) != 3 {
		return mirrorVersionDir{}, false
	}

	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return mirrorVersionDir{}, false
	}
	minor, err := strconv.Atoi(parts[1])
	if err != nil {
		return mirrorVersionDir{}, false
	}
	patch, err := strconv.Atoi(parts[2])
	if err != nil {
		return mirrorVersionDir{}, false
	}

	return mirrorVersionDir{
		name:  name,
		path:  filepath.Join(mirrorDir, name),
		major: major,
		minor: minor,
		patch: patch,
	}, true
}
