# 云深处 · Hexo 博客

已启用本地主题 `themes/yunshen`。风格参考橘猫小窝：宣纸、黛墨、朱砂、泥金与水墨远山。

```bash
npm run build
```

静态产物生成到 `public/`。主题配置、文章写法与安装方式见 [主题说明](themes/yunshen/README.md)。

站点信息在 `_config.yml`，主题外观在 `themes/yunshen/_config.yml`；也可以创建根目录 `_config.yunshen.yml` 覆盖主题配置。

`source/_posts/` 已通过 `gh` 迁入 [uyoungco/uyoung.co](https://github.com/uyoungco/uyoung.co/tree/996eec8d1fec742430fa30d21e76bc61de11dbf4/source/_posts) 的全部 4 篇文章：Jenkins部署Go应用、docker部署Jenkins、golang并发编程、Hello World。正文引用的 3 张截图位于 `source/images/`。

迁入文章保留原始标题、发布日期和分类，通过各自的 `permalink` 保留旧站短链接；`updated` 使用该文件在源仓库的最后一次提交时间（北京时间），避免将导入时间误作修订时间。文章互链使用 Hexo 的 `post_link` 指向本站。发布前设置自己的站点信息和真实 `url`。
