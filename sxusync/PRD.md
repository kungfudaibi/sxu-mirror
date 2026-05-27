# PRD: Implement Proper `keep_versions` Cleanup for Rsync Mirrors

## Background

当前 `syncRsync()` 中的 `keep_versions` 实现是个空壳，只加了个 `--exclude=*-old/` 到 rsync 参数里，对 nodejs-release 这种版本目录镜像完全不生效。

**后果**：nodejs-release 镜像积压了 793 个版本（v0.0.1 ~ v23.x），占用 481G。配置了 `keep_versions: 3` 但没有任何清理发生。

**核心需求**：同步完成后，对支持版本化目录结构的镜像，根据 `keep_versions` 配置清理旧版本。

---

## Requirements

### 1. Post-Sync Cleanup Hook

在 `syncRsync()` 同步 rsync 成功完成后，调用一个 cleanup 函数：

```go
func cleanOldVersions(mirrorDir string, keepCount int) error
```

### 2. 版本目录解析逻辑

`cleanOldVersions` 的规则：

1. 扫描 `mirrorDir` 下的所有**一级子目录**
2. 只匹配语义化版本号格式的目录名，匹配规则（按优先级尝试）：
   - **Pattern A** — `v<major>.<minor>.<patch>` 或 `v<major>.<minor>.<patch>-<prerelease>`（如 `v22.16.0`、`v10.5.0-rc1`）
   - **Pattern B** — `<major>.<minor>.<patch>`（无 v 前缀，如 `1.2.3`）
3. 用正则提取 major 版本号（第一个数字段）
4. 按 major 版本分组
5. 每组内按 semver 排序（降序），**保留最新的 `keepCount` 个**，删除其余
6. 不匹配版本号格式的目录**不动**（跳过）

### 3. 走查验证：nodejs-release

以 `/data/mirrors/nodejs-release` 为例：

- 目录下有 `v0.0.1` ~ `v23.x.x` 共 793 个版本目录
- `keep_versions = 3`
- 分组后每组保留最新 3 个，如：
  - v22.x: 保留 v22.16.0, v22.15.1, v22.15.0
  - v20.x: 保留 v20.18.3, v20.18.2, v20.18.1
  - v0.x: 保留 v0.12.18, v0.12.17, v0.12.16
  - 其余每组类似
- 老版本目录用 `os.RemoveAll()` 删除

### 4. 删除前日志输出

cleanup 执行时打印每个被删除的目录路径，方便审计：

```
[cleanup] nodejs-release: keeping 3 versions for v20.x, removing v20.18.0, v20.17.0, ...
[cleanup] nodejs-release: removing /data/mirrors/nodejs-release/v20.17.0
```

### 5. 不需要改动配置格式

`keep_versions` 字段已经在 `MirrorConfig` 里，无需改 config 结构。

### 6. 对其他 provider 的影响

- `cleanOldVersions` 只在 rsync provider 同步成功后执行
- 其他 provider（git, command, download）不动

### 7. 文件位置

将 `cleanOldVersions` 函数放在 `internal/sync/sync.go` 文件末尾，作为一个新的导出函数。

---

## Tasks

- [ ] Implement `cleanOldVersions(mirrorDir string, keepCount int) error` function in `internal/sync/sync.go`
- [ ] In `syncRsync()`, call `cleanOldVersions(m.MirrorDir, m.KeepVersions)` after successful rsync completion (when `KeepVersions > 0`)
- [ ] Write semver parsing: extract major version from directory names like `v22.16.0`, `v10.5.0-rc1`, `1.2.3`
- [ ] Group by major version, sort each group descending, keep latest N
- [ ] Print log for each removed directory
- [ ] Test by building (`go build -o sxusync .`) and running `./sxusync sync --name nodejs-release` (dry-run mode or simulate)
- [ ] Verify `keep_versions` is wired from config to the cleanup call
