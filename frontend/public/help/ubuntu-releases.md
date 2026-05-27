# Ubuntu 安装镜像

**镜像地址：** `https://MIRROR_ADDR/ubuntu-releases/`

## 上游

- **镜像源：** [清华大学 TUNA 镜像站](https://mirrors.tuna.tsinghua.edu.cn)
- **上游地址：** `rsync://mirrors.tuna.tsinghua.edu.cn/ubuntu-releases/`
- **同步策略：** 全量同步，每 6 小时自动更新

## 同步内容

本镜像站同步了 Ubuntu 官方发布的**所有版本**的安装镜像（包括 LTS 和中间版本），涵盖 **amd64、arm64** 等主流架构。

## 使用方法

### 查看可用版本

你可以直接通过浏览器访问镜像目录，查看所有可用的 Ubuntu 版本：

```
https://MIRROR_ADDR/ubuntu-releases/
```

### 下载 ISO

Ubuntu 的 ISO 文件命名规则如下：

```
ubuntu-<版本号>-desktop-<架构>.iso    # 桌面版
ubuntu-<版本号>-live-server-<架构>.iso  # 服务器版
```

例如下载 Ubuntu 24.04 LTS 桌面版：

```bash
# 命令行下载
wget https://MIRROR_ADDR/ubuntu-releases/24.04/ubuntu-24.04-desktop-amd64.iso

# 或使用 curl
curl -LO https://MIRROR_ADDR/ubuntu-releases/24.04/ubuntu-24.04-desktop-amd64.iso
```

### 校验文件完整性

每个版本目录下都有 `SHA256SUMS` 和 `SHA1SUMS` 校验文件：

```bash
# 下载校验文件
wget https://MIRROR_ADDR/ubuntu-releases/24.04/SHA256SUMS

# 校验 ISO
sha256sum -c SHA256SUMS 2>/dev/null | grep "OK"
```

### 制作启动 U 盘

```bash
# 将 ISO 写入 U 盘（假设 U 盘为 /dev/sdX）
sudo dd if=ubuntu-24.04-desktop-amd64.iso of=/dev/sdX bs=4M status=progress
```

> ⚠️ 请谨慎确认 U 盘设备名，避免误写。

## 相关链接

- [Ubuntu 官方网站](https://ubuntu.com)
- [Ubuntu 清华镜像站](https://mirrors.tuna.tsinghua.edu.cn/ubuntu-releases/)
