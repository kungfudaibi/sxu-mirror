package estimate

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"strings"

	"github.com/sxuosa/sxusync/internal/config"
)

// EstimateResult holds size estimation for a mirror
type EstimateResult struct {
	Name     string `json:"name"`
	Provider string `json:"provider"`
	Upstream string `json:"upstream"`
	Size     string `json:"size"`
	Bytes    int64  `json:"bytes"`
	Files    int    `json:"files"`
	Error    string `json:"error,omitempty"`
}

// RunAll estimates sizes for all configured mirrors
// If nameFilter is non-empty, only mirrors with matching Name are estimated
func RunAll(mirrors []config.MirrorConfig, nameFilter string) []EstimateResult {
	results := make([]EstimateResult, 0, len(mirrors))

	for _, m := range mirrors {
		if nameFilter != "" && m.Name != nameFilter {
			continue
		}

		if !*m.Enabled {
			results = append(results, EstimateResult{
				Name: m.Name, Provider: m.Provider,
				Upstream: m.Upstream, Size: "disabled",
			})
			continue
		}

		fmt.Printf("Estimating %s (%s)... ", m.Name, m.Provider)
		result := estimateMirror(m)
		if result.Error != "" {
			fmt.Printf("✗ %s\n", result.Error)
		} else {
			fmt.Printf("✓ %s (%d files)\n", result.Size, result.Files)
		}
		results = append(results, result)
	}

	return results
}

func estimateMirror(m config.MirrorConfig) EstimateResult {
	switch m.Provider {
	case "rsync":
		return estimateRsync(m)
	case "git":
		return estimateGit(m)
	case "download":
		return estimateDownload(m)
	default:
		return EstimateResult{
			Name: m.Name, Provider: m.Provider,
			Upstream: m.Upstream, Error: "unsupported provider",
		}
	}
}

// estimateRsync connects to rsync server and parses file sizes from listing
func estimateRsync(m config.MirrorConfig) EstimateResult {
	totalBytes, fileCount := estimateRsyncSize(m.Upstream)

	return EstimateResult{
		Name:     m.Name,
		Provider: "rsync",
		Upstream: m.Upstream,
		Size:     FormatBytes(totalBytes),
		Bytes:    totalBytes,
		Files:    fileCount,
	}
}

// estimateRsyncSize lists an rsync URL and returns total bytes + file count
func estimateRsyncSize(url string) (int64, int) {
	args := []string{"--list-only", "--timeout=10", url}
	cmd := exec.Command("rsync", args...)
	output, err := cmd.Output()
	if err != nil {
		return 0, 0
	}

	raw := string(output)
	lines := strings.Split(raw, "\n")

	var totalBytes int64
	var fileCount int

	// Check if there's a .pool or pool subdirectory for actual file sizes
	hasPool := false
	for _, line := range lines {
		if strings.Contains(line, " .pool") || strings.Contains(line, " pool") {
			hasPool = true
			break
		}
	}

	if hasPool {
		poolURL := strings.TrimRight(url, "/") + "/.pool/"
		totalBytes, fileCount = parseRsyncFiles(listRsync(poolURL))
	} else {
		totalBytes, fileCount = parseRsyncFiles(raw)
	}

	return totalBytes, fileCount
}

// listRsync runs rsync --list-only and returns the output string
func listRsync(url string) string {
	args := []string{"--list-only", "--timeout=10", url}
	cmd := exec.Command("rsync", args...)
	output, err := cmd.Output()
	if err != nil {
		return ""
	}
	return string(output)
}

// estimateGit estimates git repo size via GitHub API or partial clone
func estimateGit(m config.MirrorConfig) EstimateResult {
	// Try GitHub API first
	if strings.Contains(m.Upstream, "github.com") {
		// Extract owner/repo from URL
		parts := strings.Split(strings.TrimSuffix(m.Upstream, ".git"), "/")
		if len(parts) >= 2 {
			owner := parts[len(parts)-2]
			repo := parts[len(parts)-1]
			apiURL := fmt.Sprintf("https://api.github.com/repos/%s/%s", owner, repo)

			cmd := exec.Command("curl", "-s", apiURL)
			output, err := cmd.Output()
			if err == nil {
				var data map[string]interface{}
				if json.Unmarshal(output, &data) == nil {
					if size, ok := data["size"].(float64); ok {
						return EstimateResult{
							Name: m.Name, Provider: "git",
							Upstream: m.Upstream,
							Size:     FormatBytes(int64(size) * 1024),
							Bytes:    int64(size) * 1024,
						}
					}
				}
			}
		}
	}

	// Fallback: try git ls-remote to estimate (less accurate)
	cmd := exec.Command("git", "ls-remote", "--heads", m.Upstream)
	output, err := cmd.Output()
	if err != nil {
		return EstimateResult{
			Name: m.Name, Provider: "git",
			Upstream: m.Upstream,
			Error:    fmt.Sprintf("cannot estimate: %v", err),
		}
	}

	branchCount := len(strings.Split(strings.TrimSpace(string(output)), "\n"))
	return EstimateResult{
		Name:     m.Name,
		Provider: "git",
		Upstream: m.Upstream,
		Size:     fmt.Sprintf("~%d branches", branchCount),
		Files:    branchCount,
	}
}

// estimateDownload checks Content-Length via HTTP HEAD
func estimateDownload(m config.MirrorConfig) EstimateResult {
	cmd := exec.Command("curl", "-sI", m.Upstream)
	output, err := cmd.Output()
	if err != nil {
		return EstimateResult{
			Name: m.Name, Provider: "download",
			Upstream: m.Upstream,
			Error:    fmt.Sprintf("HEAD failed: %v", err),
		}
	}

	// Parse Content-Length header
	for _, line := range strings.Split(string(output), "\n") {
		lower := strings.ToLower(strings.TrimSpace(line))
		if strings.HasPrefix(lower, "content-length:") {
			sizeStr := strings.TrimSpace(line[15:])
			size, err := strconv.ParseInt(sizeStr, 10, 64)
			if err == nil {
				return EstimateResult{
					Name: m.Name, Provider: "download",
					Upstream: m.Upstream,
					Size:     FormatBytes(size),
					Bytes:    size,
				}
			}
		}
	}

	// Also check if it's an HTML directory listing
	for _, line := range strings.Split(string(output), "\n") {
		if strings.Contains(strings.ToLower(line), "text/html") {
			return EstimateResult{
				Name: m.Name, Provider: "download",
				Upstream: m.Upstream,
				Size:     "unknown (HTML)",
			}
		}
	}

	return EstimateResult{
		Name: m.Name, Provider: "download",
		Upstream: m.Upstream,
		Error:    "cannot determine size (no Content-Length)",
	}
}

// parseRsyncFiles parses rsync --list-only output and returns total bytes and file count
func parseRsyncFiles(output string) (int64, int) {
	var totalBytes int64
	var fileCount int

	re := regexp.MustCompile(`^[-dl]\S+\s+(\S+)\s+\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2}\s+(.+)$`)

	for _, line := range strings.Split(output, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "total") || strings.HasPrefix(line, "This is") || strings.HasPrefix(line, "receiving") || strings.HasPrefix(line, "sent") {
			continue
		}

		matches := re.FindStringSubmatch(line)
		if matches == nil || line[0] == 100 {
			continue
		}

		sizeStr := strings.ReplaceAll(matches[1], ",", "")
		size, err := strconv.ParseInt(sizeStr, 10, 64)
		if err != nil {
			continue
		}
		totalBytes += size
		fileCount++
	}

	return totalBytes, fileCount
}

func FormatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%dB", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}
