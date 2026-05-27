# Alpine Linux

**镜像地址：** `https://MIRROR_ADDR/alpine/`

## 上游

- **镜像源：** [清华大学 TUNA 镜像站](https://mirrors.tuna.tsinghua.edu.cn)
- **上游地址：** `rsync://mirrors.tuna.tsinghua.edu.cn/alpine/`
- **同步策略：** 仅同步 x86_64 架构（v3.24 正式版 + edge 开发版），每 6 小时自动更新

## 同步内容

本镜像站同步了 Alpine Linux 的以下版本和组件：

| 版本 | 组件 | 说明 |
|------|------|------|
| **v3.24** (当前稳定版) | main、community、releases | 正式发布的稳定版本 |
| **edge** (开发版) | main、community | 最新的滚动更新版本 |

> 仅同步 **x86_64** 架构，如需其他架构请使用 TUNA 等上游镜像站。

## 使用方法

### 替换 apk 镜像源

编辑 `/etc/apk/repositories`，将 dl-cdn.alpinelinux.org 替换为本镜像站：

```ini
# 稳定版 v3.24
https://MIRROR_ADDR/alpine/v3.24/main
https://MIRROR_ADDR/alpine/v3.24/community

# 或者使用 edge 开发版
# https://MIRROR_ADDR/alpine/edge/main
# https://MIRROR_ADDR/alpine/edge/community
```

### 快速替换命令

```bash
# 一键替换为本站（当前版本）
sed -i 's|dl-cdn.alpinelinux.org|MIRROR_ADDR/alpine|g' /etc/apk/repositories

# 更新包索引
apk update
```

### 安装软件

```bash
# 安装软件包
apk add nginx

# 更新系统
apk upgrade
```

### Docker 中使用

如果你在 Docker 中使用 Alpine，可以编写如下 Dockerfile：

```dockerfile
FROM alpine:3.24

# 替换为本站
RUN sed -i 's|dl-cdn.alpinelinux.org|MIRROR_ADDR/alpine|g' /etc/apk/repositories

RUN apk update && apk add nginx
```

## 验证同步状态

```bash
curl -I https://MIRROR_ADDR/alpine/v3.24/main/x86_64/APKINDEX.tar.gz
```

## 相关链接

- [Alpine Linux 官方网站](https://alpinelinux.org)
- [Alpine Linux 清华镜像](https://mirrors.tuna.tsinghua.edu.cn/alpine/)
