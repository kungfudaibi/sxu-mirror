package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// MirrorConfig defines a single mirror sync configuration
type MirrorConfig struct {
	Name     string `yaml:"name"`     // mirror name, e.g. "ubuntu"
	Provider string `yaml:"provider"` // rsync, command, git, download
	Upstream string `yaml:"upstream"` // upstream URL

	// Selective sync options (rsync)
	KeepVersions int      `yaml:"keep_versions"` // number of versions to keep (0 = all)
	Exclude      []string `yaml:"exclude"`       // rsync exclude patterns
	Include      []string `yaml:"include"`       // rsync include patterns

	// Git options (provider=git)
	GitBranch  string `yaml:"git_branch"`  // specific branch to mirror (empty = all)
	GitShallow bool   `yaml:"git_shallow"` // shallow clone (latest only)
	GitDepth   int    `yaml:"git_depth"`   // shallow depth

	// Download options (provider=download)
	DownloadFiles     []string `yaml:"download_files"`     // specific files/patterns to download
	DownloadRecursive bool     `yaml:"download_recursive"` // recursive download

	// Scheduling
	Interval int `yaml:"interval"` // sync interval in minutes

	// Paths
	MirrorDir string `yaml:"mirror_dir"` // local storage path
	Script    string `yaml:"script"`     // custom sync script path (for provider=command)

	// Controls
	Enabled *bool  `yaml:"enabled"` // nil = default(true)
	UseIPv6 bool   `yaml:"use_ipv6"`
	MaxSize string `yaml:"max_size"` // max size, e.g. "100GB"

	// Post-sync hooks
	PostSync []string `yaml:"post_sync"`
}

// Config is the root sxusync configuration
type Config struct {
	Global  GlobalConfig   `yaml:"global"`
	Mirrors []MirrorConfig `yaml:"mirrors"`
}

type GlobalConfig struct {
	MirrorDir  string `yaml:"mirror_dir"`  // base mirror directory
	LogDir     string `yaml:"log_dir"`     // log directory
	Concurrent int    `yaml:"concurrent"`  // max concurrent syncs
	StatusFile string `yaml:"status_file"` // status JSON output path
}

// Load reads and parses the config YAML file
func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read config: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	// Apply defaults
	if cfg.Global.Concurrent == 0 {
		cfg.Global.Concurrent = 3
	}
	if cfg.Global.StatusFile == "" {
		cfg.Global.StatusFile = "../data/sync-status.json"
	}
	if cfg.Global.MirrorDir == "" {
		cfg.Global.MirrorDir = "/data/mirrors"
	}
	if cfg.Global.LogDir == "" {
		cfg.Global.LogDir = "../logs"
	}

	// Apply per-mirror defaults
	for i := range cfg.Mirrors {
		m := &cfg.Mirrors[i]
		// Enable by default if not explicitly set
		if m.Enabled == nil {
			defaultTrue := true
			m.Enabled = &defaultTrue
		}
		// Use global mirror_dir + name if not set
		if m.MirrorDir == "" {
			m.MirrorDir = filepath.Join(cfg.Global.MirrorDir, m.Name)
		}
	}

	return &cfg, nil
}

// GenerateDefault creates a default config file
// boolPtr returns a pointer to a bool value
func boolPtr(b bool) *bool {
	return &b
}

func GenerateDefault() error {
	def := Config{
		Global: GlobalConfig{
			MirrorDir:  "/data/mirrors",
			LogDir:     "../logs",
			Concurrent: 3,
			StatusFile: "../data/sync-status.json",
		},
		Mirrors: []MirrorConfig{
			{
				Name:         "ubuntu-releases",
				Provider:     "rsync",
				Upstream:     "rsync://rsync.releases.ubuntu.com/releases/",
				KeepVersions: 3,
				Interval:     360,
				Enabled:      boolPtr(true),
			},
			{
				Name:         "debian-cd",
				Provider:     "rsync",
				Upstream:     "rsync://cdimage.debian.org/debian-cd/",
				KeepVersions: 2,
				Interval:     360,
				Enabled:      boolPtr(true),
				Exclude:      []string{"*-dbg-*", "*-mac-*"},
			},
			{
				Name:     "archlinux",
				Provider: "rsync",
				Upstream: "rsync://rsync.archlinux.org/ftp/",
				Interval: 180,
				Enabled:  boolPtr(true),
				Exclude:  []string{"iso/*"}, // only package repo
			},
			{
				Name:     "alpine",
				Provider: "rsync",
				Upstream: "rsync://rsync.alpinelinux.org/alpine/",
				Interval: 360,
				Enabled:  boolPtr(true),
			},
			{
				Name:     "homebrew-bottles",
				Provider: "rsync",
				Upstream: "rsync://rsync.homebrew.bottles.example/bottles/",
				Interval: 720,
				Enabled:  boolPtr(false),
			},
			{
				Name:         "docker-ce",
				Provider:     "rsync",
				Upstream:     "rsync://rsync.docker.com/linux/",
				KeepVersions: 2,
				Interval:     720,
				Enabled:      boolPtr(true),
			},

			// === Git repositories ===
			{
				Name:       "linux-kernel",
				Provider:   "git",
				Upstream:   "https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git",
				Interval:   1440,
				Enabled:    boolPtr(false),
				GitShallow: true,
				GitDepth:   1,
			},
			{
				Name:     "sxu-mirror",
				Provider: "git",
				Upstream: "https://github.com/SXU-Opensource-Association/sxu-mirror.git",
				Interval: 1440,
				Enabled:  boolPtr(false),
			},

			// === Dataset / File downloads ===
			{
				Name:     "huggingface-datasets",
				Provider: "download",
				Upstream: "https://huggingface.co/datasets/",
				Interval: 1440,
				Enabled:  boolPtr(false),
			},
			{
				Name:     "models",
				Provider: "command",
				Script:   "../scripts/download-models.sh",
				Interval: 4320,
				Enabled:  boolPtr(false),
			},
		},
	}

	data, err := yaml.Marshal(&def)
	if err != nil {
		return fmt.Errorf("marshal default config: %w", err)
	}

	if err := os.WriteFile("sxusync.yml", data, 0644); err != nil {
		return fmt.Errorf("write config: %w", err)
	}

	fmt.Println("Default config generated: sxusync.yml")
	return nil
}
