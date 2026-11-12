---
title: docker部署Jenkins
date: 2021-08-05 13:00:00
categories: 学习册
tags: [Docker, Jenkins, CentOS]
# 迁移保留旧站短链接；修订时间取自该文件在源仓库的最后一次提交。
permalink: docker-jenkins/
updated: 2021-08-05 16:04:46
---

### 安装Docker

docker官网都各系统的安装方式请自行查看安装，我是CentOS本次演示以次为主

<!--more-->

[Docker 官方安装教程](https://docs.docker.com/get-docker/)

#### 卸载旧版本
```bash
$ sudo yum remove docker \
                  docker-client \
                  docker-client-latest \
                  docker-common \
                  docker-latest \
                  docker-latest-logrotate \
                  docker-logrotate \
                  docker-engine
```
<br> 

### 安装方法

官方有好几种安装方式 可以安装指定版本，本次安装使用最简单版本

#### 设置存储库

安装`yum-utils`包（提供`yum-config-manager` 实用程序）并设置稳定存储库

```bash
 $ sudo yum install -y yum-utils
 
 $ sudo yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo
```

#### 安装 Docker 引擎

1. 安装最新版本的 Docker Engine 和 containerd
```bash
$ sudo yum install docker-ce docker-ce-cli containerd.io
```
2. 启动 Docker
```bash
$ sudo systemctl start docker
```
3. 通过运行`hello-world`映像验证 Docker Engine 是否已正确安装
```bash
$ sudo docker run hello-world
```
<br>

### 通过docker镜像(image)安装Jenkins

#### 拉取镜像

如果拉取镜像速度慢可以更换镜像源，这里就不多赘述安装方法请自行查找

```bash
$ docker pull jenkinsci/blueocean
```

拉取完成可以使用`docker images`查看

```bash
$ docker images

EPOSITORY                      TAG           IMAGE ID       CREATED       SIZE
jenkinsci/blueocean           latest        4428e9c342c6   2 weeks ago   699MB
```

#### 使用`jenkinsci/blueocean`镜像

```bash
$ docker run \
  -d \
  -u root \
  -p 8080:8080 \
  -v /root/jenkins-data:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$HOME":/home \
  jenkinsci/blueocean
```

- -d: 后台运行容器，并返回容器ID；
- -u: 以root用户执行
- -p: 指定端口映射，格式为：`主机(宿主)端口:容器端口`
- -v: 映射路径


这里`-v /var/run/docker.sock:/var/run/docker.sock ` 以后可以在Jenkins容器内操作主机(宿主)Docker
