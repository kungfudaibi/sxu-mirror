# Debian 安装镜像

**镜像地址：** `https://MIRROR_ADDR/debian-cd/`

## 上游

- **镜像源：** [清华大学 TUNA 镜像站](https://mirrors.tuna.tsinghua.edu.cn)
- **上游地址：** `rsync://mirrors.tuna.tsinghua.edu.cn/debian-cd/`
- **同步策略：** 仅同步 amd64 架构的 DVD-1 和 netinst CD，每 12 小时自动更新，保留最近 2 个版本

## 同步内容

本镜像站仅同步 Debian 安装镜像的 **amd64 架构**，包含以下文件：

| 文件 | 大小 | 说明 |
|------|------|------|
| `debian-*-amd64-DVD-1.iso` | ~4 GB | 完整安装 DVD，含桌面环境 |
| `debian-*-amd64-netinst.iso` | ~800 MB | 网络安装 CD，仅含安装器 |

## 使用方法

### 查看可用版本

```
https://MIRROR_ADDR/debian-cd/current/
```

`current` 目录始终指向最新的 Debian 稳定版。

### 下载 ISO

```bash
# 下载 DVD-1（完整安装，推荐）
wget https://MIRROR_ADDR/debian-cd/current/amd64/iso-dvd/debian-12.8.0-amd64-DVD-1.iso

# 下载 netinst（网络安装，体积小）
wget https://MIRROR_ADDR/debian-cd/current/amd64/iso-cd/debian-12.8.0-amd64-netinst.iso
```

### 安装建议

- **桌面用户：** 推荐下载 **DVD-1**，安装时无需网络即可完成桌面环境安装
- **服务器用户：** 推荐下载 **netinst**，安装时按需从镜像站下载所需软件包

### 制作启动 U 盘

```bash
# 将 ISO 写入 U 盘
sudo dd if=debian-12.8.0-amd64-DVD-1.iso of=/dev/sdX bs=4M status=progress
```

## 相关链接

- [Debian 官方网站](https://www.debian.org)
- [Debian CD 清华镜像](https://mirrors.tuna.tsinghua.edu.cn/debian-cd/)
