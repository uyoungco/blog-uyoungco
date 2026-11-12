# 云深处 · Hexo 博客

已启用本地主题 `themes/yunshen`。风格参考橘猫小窝：宣纸、黛墨、朱砂、泥金与水墨远山。

```bash
corepack yarn install --immutable
corepack yarn build
```

项目使用 Yarn `4.18.1`，由 `package.json` 的 `packageManager` 固定版本；上述命令通过 Corepack 调用该版本，已启用 Corepack 时可直接使用 `yarn`。`.yarnrc.yml` 保留 `node_modules` 布局，维持 Hexo 插件与本地主题的依赖解析方式。

静态产物生成到 `public/`。主题配置、文章写法与安装方式见 [主题说明](themes/yunshen/README.md)。

站点信息在 `_config.yml`，主题外观在 `themes/yunshen/_config.yml`；也可以创建根目录 `_config.yunshen.yml` 覆盖主题配置。

`source/_posts/` 已通过 `gh` 迁入 [uyoungco/uyoung.co](https://github.com/uyoungco/uyoung.co/tree/996eec8d1fec742430fa30d21e76bc61de11dbf4/source/_posts) 的全部 4 篇文章：Jenkins部署Go应用、docker部署Jenkins、golang并发编程、Hello World。正文引用的 3 张截图位于 `source/images/`。

迁入文章保留原始标题、发布日期和分类，通过各自的 `permalink` 保留旧站短链接；`updated` 使用该文件在源仓库的最后一次提交时间（北京时间），避免将导入时间误作修订时间。文章互链使用 Hexo 的 `post_link` 指向本站。发布前设置自己的站点信息和真实 `url`。

## Cloudflare Pages 部署

`yarn.lock` 已迁移为 Yarn 4 格式。Cloudflare Pages 需在项目设置中显式配置 `YARN_VERSION=4.18.1`，让云端与本地使用同一版本，避免安装时因版本不一致再次迁移锁文件并触发 CI 的 `YN0028` 错误。

在 Pages 项目的构建设置中填写：

| 配置项 | 值 |
| --- | --- |
| 构建命令 | `yarn build` |
| 构建输出目录 | `public` |
| 根目录 | 仓库根目录（留空） |
| 环境变量 | `YARN_VERSION=4.18.1` |

环境变量需应用于生产与预览环境，保存后重试部署。Pages 会先自动安装依赖，再执行构建命令，因此只修改构建命令无法解决此前安装阶段的错误。

配置依据：[Cloudflare Pages 构建环境](https://developers.cloudflare.com/pages/configuration/build-image/)、[Yarn YN0028 说明](https://yarnpkg.com/advanced/error-codes#yn0028---frozen_lockfile_exception)。
