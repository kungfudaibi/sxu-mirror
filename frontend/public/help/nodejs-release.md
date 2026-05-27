# Node.js

**镜像地址：** `https://MIRROR_ADDR/nodejs-release/`

## 上游

- **镜像源：** [清华大学 TUNA 镜像站](https://mirrors.tuna.tsinghua.edu.cn)
- **上游地址：** `rsync://mirrors.tuna.tsinghua.edu.cn/nodejs-release/`
- **同步策略：** 全量同步（所有版本），每 12 小时自动更新

## 同步内容

本镜像站全量同步了 Node.js 的**所有发布版本**的预编译二进制包，涵盖：

- 所有大版本：从 v0.x 到最新的 v23.x
- 所有平台：Linux、macOS、Windows
- 所有架构：x64、arm64、armv7l 等

## 使用方法

### 使用环境变量 `NODEJS_ORG_MIRROR`

推荐通过设置 `NODEJS_ORG_MIRROR` 环境变量来使用本镜像站，**nvm、n、fnm** 等版本管理器均支持此变量：

```bash
# 临时使用
export NODEJS_ORG_MIRROR=https://MIRROR_ADDR/nodejs-release

# 安装 Node.js 20 LTS
nvm install 20
```

#### 持久化设置

```bash
# 写入 bashrc（推荐）
echo 'export NODEJS_ORG_MIRROR=https://MIRROR_ADDR/nodejs-release' >> ~/.bashrc
source ~/.bashrc
```

### nvm（Node Version Manager）

```bash
# 设置镜像
export NVM_NODEJS_ORG_MIRROR=https://MIRROR_ADDR/nodejs-release

# 安装 Node.js
nvm install 22
nvm use 22

# 查看可安装版本
nvm ls-remote
```

### fnm（Fast Node Manager）

```bash
# fnm 使用 NODEJS_ORG_MIRROR
export NODEJS_ORG_MIRROR=https://MIRROR_ADDR/nodejs-release

# 安装 Node.js
fnm install 22
fnm use 22
```

### 直接下载

你也可以直接下载所需的二进制包：

```bash
# 查看可用版本
curl -s https://MIRROR_ADDR/nodejs-release/ | grep "v"

# 下载 Linux x64 版本
wget https://MIRROR_ADDR/nodejs-release/v22.16.0/node-v22.16.0-linux-x64.tar.xz

# 下载 macOS arm64 版本
wget https://MIRROR_ADDR/nodejs-release/v22.16.0/node-v22.16.0-darwin-arm64.tar.gz

# 下载 Windows x64 安装包
wget https://MIRROR_ADDR/nodejs-release/v22.16.0/node-v22.16.0-x64.msi
```

### npm 镜像

Node.js 自带的 npm 也可以通过镜像加速：

```bash
# 设置 npm 镜像
npm config set registry https://MIRROR_ADDR/repository/npm/

# 或使用清华 npm 镜像
npm config set registry https://mirrors.tuna.tsinghua.edu.cn/npm/
```

> 注意：本站目前仅提供 Node.js 二进制包的镜像，尚未提供 npm 包仓库镜像。

## 验证同步状态

```bash
# 检查最新版本是否可用
curl -I https://MIRROR_ADDR/nodejs-release/v22.16.0/node-v22.16.0-linux-x64.tar.xz
```

## 相关链接

- [Node.js 官方网站](https://nodejs.org)
- [Node.js 清华镜像](https://mirrors.tuna.tsinghua.edu.cn/nodejs-release/)
