# SXU Mirror — 山西大学开源软件镜像站

山西大学开源软件协会维护的开源软件镜像站，提供 Linux 发行版 ISO、软件仓库、开发者工具等镜像服务。

## 架构

```
用户 → Nginx (React SPA + 文件列表)
         ↓
  存储层 (mirror data)
         ↓
  sxusync (Go 同步引擎)
         ↓
  上游镜像站 (TUNA / NJU 等)
```

## 目录结构

```
sxu-mirror/
├── sxusync/          # 同步工具 (Go)
│   ├── main.go
│   ├── cmd/           # CLI 命令
│   ├── internal/      # 配置 / 同步 / 状态 / 估算
│   ├── sxusync.yml    # 镜像配置（生产环境，不进 git）
│   └── sxusync.yml.example  # 配置模板
├── frontend/          # 前端 (React + Vite + Ant Design)
│   ├── src/           # 源码 (pages, components, lib, styles)
│   ├── public/        # 静态资源 (data, help md, images)
│   └── dist/          # 构建产物
├── logs/              # 同步日志 (gitignored)
└── README.md
```

## 快速开始

### 环境要求

- Go 1.22+
- Node.js 20+
- rsync 3.2+

### 编译 & 使用

```bash
# 编译同步工具
cd sxusync
go build -o sxusync .

# 复制配置模板并编辑
cp sxusync.yml.example sxusync.yml
# 编辑 sxusync.yml 中的路径

# 同步指定镜像
./sxusync sync --name archlinux

# 全量同步所有镜像
./sxusync sync

# 查看状态
./sxusync status
```

### 前端构建

```bash
cd frontend
npm install
npm run build
```

## 同步配置

配置文件 `sxusync.yml` 支持以下提供者：

| provider | 说明 |
|----------|------|
| `rsync` | 通过 rsync 同步目录 |
| `git` | Git 仓库镜像 |
| `command` | 自定义脚本同步 |

### 选择性同步

使用 `include` / `exclude` 控制同步范围：

```yaml
- name: example
  provider: rsync
  upstream: rsync://mirrors.example.com/example/
  interval: 360
  enabled: true
  include:
    - "path/to/include/**"
  exclude:
    - "*"
```

> 注意：选择性同步需逐级列出目录路径，详见 `sxusync.yml.example` 中的 docker-ce 示例。

## 前端部署

```nginx
location / {
    root   /path/to/sxu-mirror/frontend/dist;
    index  index.html;
    try_files $uri $uri/ /index.html;
}

location /files/ {
    alias /path/to/mirror-data/;
    fancyindex on;
}
```

## 帮助文档

帮助文档为 Markdown 格式，位于 `frontend/public/help/`，索引见 `frontend/public/data/help.json`。

添加新镜像帮助：

```bash
# 1. 写 markdown
vim frontend/public/help/new-mirror.md

# 2. 注册到索引
vim frontend/public/data/help.json

# 3. 同步到 dist
cp -r frontend/public/help frontend/dist/
cp frontend/public/data/help.json frontend/dist/data/
```

## License

[MIT](LICENSE)
