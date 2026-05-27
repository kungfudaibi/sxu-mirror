import type { Mirror, SyncStatus, HelpDoc } from "./types";

// Load mirror list from JSON
export async function loadMirrors(): Promise<Mirror[]> {
  try {
    const resp = await fetch("/data/mirrors.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data.mirrors || data;
  } catch {
    // Fallback to embedded list for development
    return getDefaultMirrors();
  }
}

// Load sync status
export async function loadSyncStatus(): Promise<SyncStatus | null> {
  try {
    const resp = await fetch("/data/sync-status.json");
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// Load help docs
export async function loadHelpDocs(): Promise<HelpDoc[]> {
  try {
    const resp = await fetch("/data/help.json");
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();
  } catch {
    return [];
  }
}

// Fetch individual help doc content
export async function loadHelpDocContent(mirrorId: string): Promise<string | null> {
  try {
    const resp = await fetch(`/help/${mirrorId}.md`);
    if (!resp.ok) return null;
    return await resp.text();
  } catch {
    return null;
  }
}

// Default mirrors for development
function getDefaultMirrors(): Mirror[] {
  return [
    {
      name: "ubuntu",
      desc: "Ubuntu 的官方软件包仓库",
      url: "/ubuntu/",
      category: "linux-distro",
      status: "success",
    },
    {
      name: "ubuntu-releases",
      desc: "Ubuntu 的安装镜像",
      url: "/ubuntu-releases/",
      category: "linux-distro",
    },
    {
      name: "debian",
      desc: "Debian Linux 的官方软件包仓库",
      url: "/debian/",
      category: "linux-distro",
    },
    {
      name: "archlinux",
      desc: "Arch Linux 的安装镜像和官方软件包仓库",
      url: "/archlinux/",
      category: "linux-distro",
    },
    {
      name: "alpine",
      desc: "Alpine Linux 的安装镜像和官方软件包仓库",
      url: "/alpine/",
      category: "linux-distro",
    },
    {
      name: "docker-ce",
      desc: "Docker Community Edition 的安装包",
      url: "/docker-ce/",
      category: "dev-tools",
    },
    {
      name: "nodejs-release",
      desc: "预编译的 Node.js 二进制程序",
      url: "/nodejs-release/",
      category: "dev-tools",
    },
    {
      name: "pypi",
      desc: "Python 软件包索引源",
      url: "/pypi/",
      category: "dev-tools",
    },
    {
      name: "homebrew-bottles",
      desc: "预编译的 Homebrew 软件包",
      url: "/homebrew-bottles/",
      category: "dev-tools",
    },
    {
      name: "debian-cd",
      desc: "Debian Linux 的安装镜像",
      url: "/debian-cd/",
      category: "linux-distro",
    },
  ];
}
