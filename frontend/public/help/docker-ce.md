# Docker CE

**镜像地址：** `https://MIRROR_ADDR/docker-ce/`

## 上游

- **镜像源：** [清华大学 TUNA 镜像站](https://mirrors.tuna.tsinghua.edu.cn)
- **上游地址：** `rsync://mirrors.tuna.tsinghua.edu.cn/docker-ce/`
- **同步策略：** 仅同步 ubuntu/debian/centos 的 amd64 stable 版本 + 静态二进制包，每 12 小时自动更新

## 同步内容

本镜像站同步了 Docker CE 的以下发行版安装包：

| 发行版 | 架构 | 渠道 | 说明 |
|--------|------|------|------|
| **Ubuntu** | amd64 | stable | 适用于 20.04+ (focal/noble 等) |
| **Debian** | amd64 | stable | 适用于 11+ (bullseye/bookworm) |
| **CentOS / RHEL** | x86_64 | stable | 适用于 CentOS 7+ / RHEL 8+ |
| **静态二进制** | x86_64 | stable | 无需安装直接运行 |

## 使用方法

### Ubuntu / Debian

```bash
# 安装依赖
sudo apt update
sudo apt install -y ca-certificates curl

# 添加 Docker 官方 GPG 密钥
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc

# 添加镜像源
echo \
  "deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.asc] \
  https://MIRROR_ADDR/docker-ce/linux/ubuntu \
  $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io
```

### CentOS / RHEL

```bash
# 安装依赖
sudo yum install -y yum-utils

# 添加镜像源
sudo yum-config-manager \
  --add-repo \
  https://MIRROR_ADDR/docker-ce/linux/centos/docker-ce.repo

# 替换为本站地址
sudo sed -i 's|download.docker.com|MIRROR_ADDR/docker-ce|g' \
  /etc/yum.repos.d/docker-ce.repo

# 安装 Docker
sudo yum install -y docker-ce docker-ce-cli containerd.io
```

### 静态二进制（免安装）

```bash
# 下载最新 Docker 静态二进制
wget https://MIRROR_ADDR/docker-ce/linux/static/stable/x86_64/docker-<version>-ce.tgz

# 解压
tar xzvf docker-<version>-ce.tgz
sudo cp docker/* /usr/local/bin/
```

## 相关链接

- [Docker 官方文档](https://docs.docker.com)
- [Docker CE 清华镜像](https://mirrors.tuna.tsinghua.edu.cn/docker-ce/)
