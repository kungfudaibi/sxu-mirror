# Arch Linux

**镜像地址：** `https://MIRROR_ADDR/archlinux/`

## 上游

- **镜像源：** [清华大学 TUNA 镜像站](https://mirrors.tuna.tsinghua.edu.cn)
- **上游地址：** `rsync://mirrors.tuna.tsinghua.edu.cn/archlinux/`
- **同步策略：** 全量同步，每 3 小时自动更新

## 同步内容

本镜像站全量同步了 Arch Linux 官方仓库，包括：

- **核心仓库：** `core`、`extra`、`community`、`multilib`
- **安装镜像：** `iso/` 目录下的最新 Arch Linux ISO
- **所有架构：** x86_64

## 使用方法

### 替换 pacman 镜像源

编辑 `/etc/pacman.d/mirrorlist`，将服务器地址修改为本站：

```ini
# 山西大学开源软件协会镜像站
Server = https://MIRROR_ADDR/archlinux/$repo/os/$arch
```

建议将本镜像站放在列表最前面：

```ini
# 首选
Server = https://MIRROR_ADDR/archlinux/$repo/os/$arch
# 备用
Server = https://mirrors.tuna.tsinghua.edu.cn/archlinux/$repo/os/$arch
```

### 刷新包缓存

```bash
sudo pacman -Syy
```

### 更新系统

```bash
sudo pacman -Syu
```

### 下载安装 ISO

```bash
# 查看可用 ISO
curl -s https://MIRROR_ADDR/archlinux/iso/latest/ | grep ".iso"

# 下载最新 ISO
wget https://MIRROR_ADDR/archlinux/iso/latest/archlinux-<version>-x86_64.iso
```

## 验证同步状态

```bash
# 检查镜像是否正常
curl -I https://MIRROR_ADDR/archlinux/core/os/x86_64/core.db
```

如果返回 `200 OK`，说明镜像运行正常。

## 相关链接

- [Arch Linux 官方网站](https://archlinux.org)
- [Arch Linux 清华镜像](https://mirrors.tuna.tsinghua.edu.cn/archlinux/)
- [Arch Linux Wiki：镜像源](https://wiki.archlinux.org/title/Mirrors)
