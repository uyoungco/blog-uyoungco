---
title: Jenkins部署Go应用
date: 2021-08-05 15:36:00
categories: 学习册
tags: [Jenkins, Docker, Go, 持续集成]
# 迁移保留旧站短链接；修订时间取自该文件在源仓库的最后一次提交。
permalink: Jenkins-golang/
updated: 2021-08-06 11:00:26
---

### 为Jenkins安装Docker插件

> 没有安装Jenkins可以看我的上一篇文章 {% post_link docker-jenkins docker部署Jenkins %}

因为是Docker打包和部署应用所以不安装Go环境（又轻松了一步）


找到左侧的`系统管理` -> `插件管理` -> `可选插件` -> 搜索`Docker`

勾选安装 `Docker Pipeline`

安装完成后重启Jenkins

<!--more-->

### 新建任务

回到首页 选择新建任务

选择`构建一个自由风格的软件项目`

填写项目名称

![newTaks](/images/jenkins-golang-1.jpg)

### 编辑任务

#### 源码管理
在`源码管理`里选择Git选项

![gitadd](/images/jenkins-golang-2.jpg)

Repository URL：填写你的Git项目地址或者绝对路径
Credentials：填写git的凭证 公开项目可以不写
Branches to build：你要监控的分支名称 默认master但是现在GitHub也大搞文字狱所以注意不要写错GitHub默认main


#### 构建触发器

其他任务触发、定时构建、轮询GitHub项目、GitHub Hook
暂时可以先啥都不选，有需要手动运行调试

#### 构建环境

啥都不需要，最容易出事的地方就是这里

### 构建

我这里使用shell命令来打包和部署

> 由于我的Jenkins可以直接访问到宿主机的Docker，应用完成打包后直接生成镜像(Image)

![build](/images/jenkins-golang-3.jpg)

```bash
IMAGES_NAME='go-qqbot'
CONTAINER_NAME='qqbot1'

echo "IMAGES_ID：$GIT_COMMIT"

docker build  -t ${IMAGES_NAME}  .
docker stop ${CONTAINER_NAME} || true
docker rm ${CONTAINER_NAME} || true
docker run -d --network botnetwork --name ${CONTAINER_NAME} ${IMAGES_NAME}
docker rmi $(docker images | grep "none" | awk '{print $3}')

echo "部署完成！"
```

在来贴一下的我的Dockerfile文件
```dockerfile

FROM golang:1.15-alpine AS builder

RUN go env -w GO111MODULE=auto \
  && go env -w CGO_ENABLED=0 \
  && go env -w GOPROXY=https://mirrors.tencent.com/go/,https://goproxy.cn,direct

WORKDIR /build

COPY ./ .

RUN set -ex \
    && cd /build \
    && go build -ldflags "-s -w -extldflags '-static'" -o botqq

FROM alpine:latest

COPY --from=builder /build/botqq /usr/bin/botqq
RUN chmod +x /usr/bin/botqq

WORKDIR /data

ENTRYPOINT [ "/usr/bin/botqq" ]
```
使用`golang:1.15-alpine`这个镜像来打包应用，然后将打包的文件拷贝到`alpine:latest`来运行

