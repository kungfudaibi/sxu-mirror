# PRD: Real-time Sync Dashboard

## 目标
在 sxu-mirror 前端添加一个实时同步仪表盘页面，替代当前只显示最终结果的静态 status 页。

## 需求

### 页面位置
- 路由: `/dashboard`
- 导航栏新增 "实时同步" 入口
- 与现有 `/status` 页面共存（旧 status 保留作为历史记录）

### 数据来源
同步进度数据通过以下方式获取：

**后端数据（需要新增）：**
- 创建一个轻量级监控脚本 `scripts/sync-monitor.sh`，每隔 5 秒检测当前运行的 rsync/git 进程，提取进度信息
- 输出到 `frontend/public/data/sync-progress.json`
- 同时读取已有的 `sync-status.json` 作为基准数据

**`sync-progress.json` 格式：**
```json
{
  "active": [
    {
      "name": "alpine",
      "pid": 12345,
      "type": "rsync",
      "started_at": "2026-05-26T08:06:00Z",
      "progress_pct": 45,
      "transferred_bytes": "3.9GB",
      "total_bytes": "8.5GB",
      "current_file": "edge/community/aarch64/xxx.apk",
      "speed": "12MB/s",
      "eta": "5m30s"
    }
  ],
  "queue": ["docker-ce", "nodejs-release"],
  "updated_at": "2026-05-26T08:16:00Z"
}
```

### 仪表盘功能

1. **当前同步状态卡片**：正在同步的镜像列表
   - 镜像名称、类型（rsync/git）
   - 进度条（百分比）
   - 已传输/总计大小
   - 当前正在传输的文件
   - 实时速度
   - 预估剩余时间

2. **同步队列**：等待同步的镜像列表

3. **已完成/失败**：本次批次中已完成或失败的镜像

4. **实时日志**：最近几行同步输出（可选）

### 刷新策略
- 前端每 2-3 秒轮询 `sync-progress.json`
- 使用 Ant Design Progress 组件显示进度条
- 页面不自动刷新（避免闪烁），仅数据更新

### 技术方案
- 使用现有 React + Ant Design + TypeScript 技术栈
- 新增 `DashboardPage.tsx` 页面组件
- 新增 `scripts/sync-monitor.sh` 监控脚本
- 页面放在 `/dashboard` 路由

## 文件清单
- `src/pages/DashboardPage.tsx` — 仪表盘主页面
- `src/lib/monitor.ts` — 进度数据加载函数
- `scripts/sync-monitor.sh` — 后端监控脚本

## 注意事项
- 保持与现有 UI 风格一致（全局 CSS、颜色、布局）
- 监控脚本用 shell 实现，依赖 `ps`、`rsync` 输出解析
- 不要改动 sxusync Go 代码
- npm run build 后需要把 scripts/sync-monitor.sh 部署到服务器上持续运行
