package cmd

import (
	"fmt"
	"os"
	"strings"

	"github.com/sxuosa/sxusync/internal/config"
	"github.com/sxuosa/sxusync/internal/estimate"
	"github.com/sxuosa/sxusync/internal/sync"
)

// CLI command dispatch
func Execute() error {
	if len(os.Args) < 2 {
		printUsage()
		return nil
	}

	cmd := os.Args[1]
	rest := os.Args[2:]

	// Parse [config] and optional flags: --name <name>, --dry-run
	cfgPath := "sxusync.yml"
	var nameFilter string
	var dryRun bool

	for i := 0; i < len(rest); i++ {
		arg := rest[i]
		if arg == "--name" && i+1 < len(rest) {
			nameFilter = rest[i+1]
			i++ // skip the value
		} else if arg == "--dry-run" {
			dryRun = true
		} else if !strings.HasPrefix(arg, "--") {
			cfgPath = arg
		}
	}

	switch cmd {
	case "sync":
		return runSync(cfgPath, nameFilter, dryRun)
	case "status":
		return runStatus(cfgPath, nameFilter)
	case "list":
		return runList(cfgPath)
	case "estimate":
		return runEstimate(cfgPath, nameFilter)
	case "init":
		return runInit()
	default:
		printUsage()
		return nil
	}
}

func printUsage() {
	fmt.Print(`sxusync — SXU Mirror selective sync tool

Usage:
  sxusync sync [config] [--name <mirror>] [--dry-run]
                                                   Sync all (or specific) mirrors
  sxusync status [config] [--name <mirror>]    Print sync status JSON
  sxusync list [config]                        List configured mirrors
  sxusync estimate [config]                    Estimate mirror sizes before syncing
  sxusync init                                 Generate default config
`)
}

func runSync(cfgPath, nameFilter string, dryRun bool) error {
	cfg, err := config.Load(cfgPath)
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	sync.SetDryRun(dryRun)
	sync.RunAll(cfg.Mirrors, cfg.Global.StatusFile, cfg.Global.LogDir, nameFilter)
	return nil
}

func runStatus(cfgPath, nameFilter string) error {
	cfg, err := config.Load(cfgPath)
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	sync.StatusAll(cfg.Mirrors, cfg.Global.StatusFile, nameFilter)
	return nil
}

func runList(cfgPath string) error {
	cfg, err := config.Load(cfgPath)
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	fmt.Printf("Configured mirrors (%d total):\n", len(cfg.Mirrors))
	fmt.Println(string(repeat('-', 60)))
	for _, m := range cfg.Mirrors {
		status := "enabled"
		if !*m.Enabled {
			status = "disabled"
		}
		fmt.Printf("  %-20s %-10s %s\n", m.Name, m.Provider, status)
	}
	return nil
}

func runEstimate(cfgPath, nameFilter string) error {
	cfg, err := config.Load(cfgPath)
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	results := estimate.RunAll(cfg.Mirrors, nameFilter)

	// Print summary table
	fmt.Println()
	fmt.Printf("%-25s %-10s %-15s %s\n", "Mirror", "Provider", "Size", "Files")
	fmt.Println(string(repeat('-', 70)))
	var totalBytes int64
	for _, r := range results {
		if r.Error != "" {
			fmt.Printf("%-25s %-10s %-15s ✗ %s\n", r.Name, r.Provider, r.Size, r.Error)
		} else {
			fmt.Printf("%-25s %-10s %-15s %d\n", r.Name, r.Provider, r.Size, r.Files)
			totalBytes += r.Bytes
		}
	}
	fmt.Println(string(repeat('-', 70)))
	fmt.Printf("%-25s %-10s %-15s\n", "TOTAL", "", estimate.FormatBytes(totalBytes))
	fmt.Println()
	return nil
}

func runInit() error {
	return config.GenerateDefault()
}

func repeat(c byte, n int) string {
	b := make([]byte, n)
	for i := range b {
		b[i] = c
	}
	return string(b)
}
