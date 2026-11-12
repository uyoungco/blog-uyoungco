---
title: golang并发编程
date: 2021-08-20 13:12:00
categories: 学习册
tags: [Go, 并发编程, goroutine, channel]
# 迁移保留旧站短链接；修订时间取自该文件在源仓库的最后一次提交。
permalink: go-concurrent/
updated: 2021-08-20 13:22:29
---

## 概念
- Concurrency is not parallelism: 并发不等于并行
- channel有不同种类的类型 <-, ->箭头指明了channel的方向
- channel的buffer size表明了channel是同步channel还是异步channel
- CAS: compare-and-swap: 在设计并发算法是用到了CAS技术，提高了多线程执行的安全性


### CAS

CAS原理: <b>CAS有三个操作数：内存值V、旧的预期值A、要修改的值B，当且仅当预期值A和内存值V相同时，将内存值修改为B并返回true，否则什么都不做并返回false。</b>

- CAS操作是由操作系统提供相应的接口，并且在硬件层面提供支持
```go
if *addr == old {
  *addr = new
  return true
}
return false
```

- CAS golang实现锁
```go
package main
  import (
    "sync/atomic"
  )
  type Mutex struct {
    state int32
  }
  func (m *Mutex) Lock() {
    for(!atomic.CompareAndSwapInt32(&m.state, 0, 1)) {
        return
    }
  }
  func (m *Mutex) Unlock() {
    atomic.CompareAndSwapInt32(&m.state, 1, 0)
  }
```
- 基于CAS实现sync.Map: goroutine 线程安全


## 初级

### 生成器(generator)

channel 在golang中和基本变量如int，string类型一样是第一级别的类型，生成器即函数返回一个channel，函数内部给channel添加东西。

生成器模式最为常用，可以用来实现最简单的生产者消费者模式，或者订阅发布模式。

```go
func boring(msg string) <-chan string { // Returns receive-only channel of strings.
    c := make(chan string)
    go func() { // We launch the goroutine from inside the function.
        for i := 0; ; i++ {
            c <- fmt.Sprintf("%s %d", msg, i)
            time.Sleep(time.Duration(rand.Intn(1e3)) * time.Millisecond)
        }
    }()
    return c // Return the channel to the caller.
}
```

### 复用channel(select)
```go
func main() {
  c := boring("Joe")
  timeout := time.After(5 * time.Second)
  timer := time.NewTimer(3 * time.Second)
  for {
    select {
    case s := <-c:
      fmt.Println(s)
    case <-timer.C:
      //定时轮训事情
      timer.Reset(3 * time.Second)
    case <-timeout: // 监听超时信号
      fmt.Println("You talk too much.")
      return
    case <-quit: // 监听退出信号
      return
    }
  }
}
```

### 控制并发(WaitGroup->chan->context)

#### WaitGroup

waitGroup为基础控制并发的类
```go
func main() {
  var wg sync.WaitGroup
​
  wg.Add(2)
  go func() {
      time.Sleep(2*time.Second)
      fmt.Println("1号完成")
      wg.Done()
  }()
  go func() {
      time.Sleep(2*time.Second)
      fmt.Println("2号完成")
      wg.Done()
  }()
  wg.Wait()
  fmt.Println("好了，大家都干完了，放工")
}
```

#### Context

context有如下4个函数用来由上级父context衍生新的context。
```go
func WithCancel(parent Context) (ctx Context, cancel CancelFunc)
func WithDeadline(parent Context, deadline time.Time) (Context, CancelFunc)
func WithTimeout(parent Context, timeout time.Duration) (Context, CancelFunc)
func WithValue(parent Context, key, val interface{}) Context
```
- WithCancel：返回ctx和取消函数
- WithDeadline：返回ctx和取消函数，当时间超过deadline时自动取消
- WithTimeout：和WithDeadline类似，不过是超时时间
- WithValue：传递元数据，通过ctx.Value(key)的方式获得数据

context即上下文，如下代码为构造一个，带取消函数的context, 即执行取消方法之后，watch函数响应退出。

context通常用来处理request请求的每个goroutine。
```go
func main() {
  ctx, cancel := context.WithCancel(context.Background())
  go watch(ctx,"【监控1】")
  go watch(ctx,"【监控2】")
  go watch(ctx,"【监控3】")
​
  time.Sleep(10 * time.Second)
  fmt.Println("可以了，通知监控停止")
  cancel()
  //为了检测监控过是否停止，如果没有监控输出，就表示停止了
  time.Sleep(5 * time.Second)
}
​
func watch(ctx context.Context, name string) {
  for {
    select {
    case <-ctx.Done():
      fmt.Println(name,"监控退出，停止了...")
      return
    default:
      fmt.Println(name,"goroutine监控中...")
      time.Sleep(2 * time.Second)
    }
  }
}
```

### worker调度

基础的worker队列调度方式
```go
idleWorker<-workerQueue
​
func(){
  idleWorker.DoTask()
  defer workerQueue<-idleWorker
}
```


## Reference

[golang并发编程](https://dreamgoing.github.io/go%E5%B9%B6%E5%8F%91%E7%BC%96%E7%A8%8B%E6%A8%A1%E5%BC%8F.html)
