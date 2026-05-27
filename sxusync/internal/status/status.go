package status

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/sxuosa/sxusync/internal/sync"
)

// SyncStatusOutput is the JSON output structure for the frontend
type SyncStatusOutput struct {
	UpdatedAt string              `json:"updated_at"`
	Version   string              `json:"version"`
	Mirrors   []sync.MirrorResult `json:"mirrors"`
}

// WriteJSON writes sync results as JSON to the specified path
func WriteJSON(results []sync.MirrorResult, path string) error {
	output := SyncStatusOutput{
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
		Version:   "1.0",
		Mirrors:   results,
	}

	if path == "" {
		path = os.Getenv("SXUSYNC_STATUS_FILE")
	}
	if path == "" {
		path = "../data/sync-status.json"
	}

	data, err := json.MarshalIndent(output, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal status: %w", err)
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("write status file: %w", err)
	}

	fmt.Printf("Status written to %s\n", path)
	return nil
}
