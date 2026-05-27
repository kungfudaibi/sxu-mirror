---
name: sxusync
description: "SXU Mirror 选择性同步工具 — 估算大小、选择性同步、自动更新前端状态。集成 websearch/webfetch 技能实时查询上游最新版本。"
---

# sxusync — SXU Mirror 同步工作流

## ⚠️ 血的教训 — 先搞清楚镜像内容再估算

### 2026-05-26 Alpine 同步事故

**经过：**
1. 看到 alpine 配置了选择性同步（v3.22+v3.23+v3.24+edge）
2. 随手估了 ~5-10GB
3. 直接跑 rsync 开始同步
4. 传到一半发现仅 edge/community/aarch64 就 9.3GB
5. 细查才发现 edge 下有 9 个架构，每个架构 ~9GB
6. 如果跑完：edge 全架构 ~81GB + v3.22~v3.24 ~300GB = **~400GB+**
7. 被迫中断重来，浪费了 ~30 分钟带宽

**原因：** 没有先查看 TUNA 上 alpine 的实际目录结构

**教训：同步任何镜像前必须执行以下步骤：**

```bash
# 1. 列出上游目录结构，确认有几个子目录
rsync --list-only rsync://上游地址/镜像名/

# 2. 递归查看一级子目录的层级深度
rsync --list-only rsync://上游地址/镜像名/子目录/

# 3. 确认架构数量（alpine 的坑就在这里）
rsync --list-only rsync://上游地址/镜像名/edge/community/
# → 看到 9 个架构目录就该警觉了

# 4. 抽样查询单个架构大小
rsync -an --stats rsync://.../指定架构目录/ | grep "Total file size"
# 乘以架构数 + 版本数，得到真实估算
```

**核心原则：**
- 永远不要只看顶层目录就估大小
- rsync 选择性同步时，**子目录数量 × 内容量**才是真实大小
- 优先只同步 x86_64 + aarch64（覆盖 99% 用户）
- 对于分架构的镜像（alpine、debian 等），先 `--list-only` 看架构列表
- 对于分版本的镜像（nodejs、ubuntu-releases 等），先确认版本数量和 keep_versions 的作用范围

## 工作流程

```
你说: "同步 Ubuntu"
   ↓
① 实时查询 upstream
   ┌─ rsync --list-only     (有 rsync 服务)
   ├─ webfetch releases.ubuntu.com   (HTTP 页面)
   ├─ websearch "Ubuntu latest release"  (搜索引擎)
   └─ curl -sI / HEAD       (下载文件)
   ↓
② 估算大小
   sxusync estimate sxusync.yml
   ↓
③ 选择性同步（只同步你指定的版本）
   sxusync sync sxusync.yml
   ↓
④ 同步状态自动写入
   → frontend/dist/data/sync-status.json
   → nginx → 前端实时展示
```

## 依赖技能

```
技能             用途                         安装状态
────────────────────────────────────────────────────────
webfetch         抓取网页内容转 Markdown/text   ✅ npm i -g @lyhue1991/webfetch
websearch        搜索引擎查询最新版本信息       ❌ 需要 SearXNG 实例
```

### webfetch 用法
```bash
# 查 Ubuntu 最新版本
webfetch "http://releases.ubuntu.com/" -f text -q

# 查 Alpine 最新版本
webfetch "https://alpinelinux.org/downloads/" -f text -q

# 查 Arch Linux 最新 ISO
webfetch "https://archlinux.org/download/" -f text -q
```

### 实时查版本的三种方式

| 方式 | 命令 | 适用场景 |
|------|------|---------|
| rsync --list-only | `rsync rsync://...` | 有 rsync 服务的镜像 |
| webfetch | `webfetch URL -f text -q` | 有 HTTP 页面的镜像 |
| websearch | `websearch "query"` | 需要搜索引擎的场景 |

## 命令参考

```bash
cd /home/user/sxu-mirror/sxusync

# 预估所有镜像大小 (同步前查看)
./sxusync estimate sxusync.yml

# 同步所有启用的镜像
./sxusync sync sxusync.yml

# 查看同步状态
./sxusync status sxusync.yml

# 列出配置的镜像
./sxusync list sxusync.yml

# 生成默认配置
./sxusync init
```

## 如何估算镜像大小

### ⚠️ 重要：先搞清楚镜像结构，再算大小

**错误做法（我犯过的错）：**
> alpine 选择性同步 v3.22+v3.23+v3.24+edge → 大概 5-10GB 吧

**正确做法：**
1. `rsync --list-only` 列出上游，看有几个顶层目录
2. 对每个目录 `--list-only` 看子目录层级和数量
3. 特别关注**架构目录**（aarch64、x86_64、armhf 等）
4. 用 `--stats` 抽查单个架构的大小
5. 真实大小 ≈ 单架构大小 × 架构数 × 版本数

**常见镜像的架构分布参考：**
| 镜像 | 架构数 | 说明 |
|------|--------|------|
| alpine | 9（aarch64,armhf,armv7,loongarch64,ppc64le,riscv64,s390x,x86,x86_64）| 全架构同步极耗空间，只保留 x86_64 + aarch64 |
| archlinux | 1（x86_64）| 单架构，简单 |
| ubuntu-releases | 1（ISO 不区分架构目录）| 简单 |
| debian | 3+（amd64,i386,arm64 等）| 需选择性同步 |
| docker-ce | 多发行版 × 多架构 | 结构复杂，需仔细评估 |

### rsync 镜像
```
实时连接上游 rsync 服务器
解析文件列表中的大小字段
如果检测到 .pool 目录 (ISO 集中存储)
  → 自动计算 pool 中所有 ISO 的总和
否则
  → 计算顶层目录的文件大小
```

### Git 仓库
```
通过 GitHub API 查询仓库大小
```

### HTTP 下载
```
发送 HEAD 请求 → 读取 Content-Length
```

### webfetch 辅助
```
对于没有 rsync 服务的镜像
通过 webfetch 抓取页面获取版本信息和下载链接
```

## 配置文件结构

```yaml
# /home/user/sxu-mirror/sxusync/sxusync.yml
global:
  mirror_dir: /data/mirrors                # 同步文件存放路径 (ZFS: 21.6T)
  concurrent: 3
  status_file: /home/.../dist/data/sync-status.json

mirrors:
  - name: ubuntu-releases
    provider: rsync
    upstream: rsync://rsync.releases.ubuntu.com/releases/
    keep_versions: 2          # 保留最近 2 个版本
    interval: 360             # 6小时
    enabled: true
```

## 数据流

```
sxusync sync sxusync.yml
    │
    ├── 同步文件 → /data/mirrors/<name>/
    │
    ├── 状态 JSON → frontend/dist/data/sync-status.json
    │                → nginx → /data/sync-status.json → 前端
    │
    └── 用户访问 → http://MIRROR_HOST/
```

## 典型同步场景

### 场景 1: 同步特定版本
```
你说: "同步 Ubuntu 24.04"
我执行:
  rsync --list-only → 确认 24.04 目录存在
  rsync ... 24.04/  → 只同步 24.04，不碰 26.04
  更新状态 JSON
```

### 场景 2: 同步最新版
```
你说: "同步 Ubuntu"
我执行:
  webfetch "releases.ubuntu.com" → 最新是 26.04 Resolute
  rsync --list-only → 确认 pool 中 26.04 ISO 存在
  估算: 桌面版 6.5GB + 服务版 2.9GB = 9.4GB
  询问你是否继续
  → 确认后开始同步
```

### 场景 3: 只同步桌面版 ISO
```
你说: "同步 Ubuntu 桌面版"
我执行:
  rsync --include="24.04/" --include=".pool/...desktop..."
  只同步桌面版 ISO (约 6.5GB)
```

## 项目路径

```
/home/user/sxu-mirror/
├── sxusync/           # Go 同步工具 (4MB)
├── frontend/          # Bun + React SPA
├── data/              # 数据文件
├── scripts/           # 自定义同步脚本
└── SKILL.md           # 本文档
```
