'use strict';

const { stripHTML, unescapeHTML } = require('hexo-util');

// 去掉高亮代码的行号并还原实体，摘要和搜索结果只呈现可读正文。
function plainText(content) {
  return unescapeHTML(stripHTML(content
    .replace(/<td class="gutter">[\s\S]*?<\/td>/g, '')
    .replace(/<\/(?:p|h[1-6]|li|pre|tr)>/g, ' ')))
    .replace(/\s+/g, ' ').trim();
}

// 中文序号只服务卷次和日期；大数回落为阿拉伯数字，避免不完整的汉字拼接。
hexo.extend.helper.register('yun_number', function (value) {
  const n = Number(value);
  const digits = '零一二三四五六七八九';
  if (n < 10) return digits[n];
  if (n < 100) return `${n < 20 ? '' : digits[Math.floor(n / 10)]}十${n % 10 ? digits[n % 10] : ''}`;
  return String(n);
});

hexo.extend.helper.register('yun_minutes', function (post) {
  return Math.max(1, Math.ceil(plainText(post.content || '').replace(/\s/g, '').length / 400));
});

hexo.extend.helper.register('yun_summary', function (post, length = 110) {
  const text = plainText(post.description || post.excerpt || post.content || '');
  return text.length > length ? `${text.slice(0, length)}…` : text;
});

// 发布日期改用中文纪年，与文章头部和卷末落款保持一致。
hexo.extend.helper.register('yun_han_date', function (value) {
  const year = this.date(value, 'YYYY').replace(/\d/g, digit => '〇一二三四五六七八九'[digit]);
  return `${year}年${this.yun_number(Number(this.date(value, 'M')))}月${this.yun_number(Number(this.date(value, 'D')))}日`;
});

// 由 Markdown 渲染器生成三线表的滚动容器，保留列对齐且不包裹高亮代码表格。
hexo.extend.filter.register('marked:renderer', function (renderer) {
  renderer.table = function ({ header, rows }) {
    const renderRow = cells => this.tablerow({ text: cells.map(cell => this.tablecell(cell)).join('') });
    return `<div class="prose-table" role="region" aria-label="文章表格，可横向滚动" tabindex="0"><table><thead>${renderRow(header)}</thead><tbody>${rows.map(renderRow).join('')}</tbody></table></div>\n`;
  };
});

hexo.extend.helper.register('yun_icon', function (name) {
  const paths = {
    // 与现有线性图标共用尺寸和笔画，主题按钮无需引入图标库。
    monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    moon: '<path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
    menu: '<path d="M4 7h16M8 12h12M4 17h16"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    book: '<path d="M12 5v15M12 6C8 3 4 4 2 5v14c4-2 7-1 10 1 3-2 6-3 10-1V5c-2-1-6-2-10 1Z"/>',
    github: '<path d="M9 19c-4 1-4-2-6-2m12 5v-4c0-1 .2-2-1-3 4-.5 6-2 6-6 0-1-.3-2-1-3 .3-1 .3-2 0-3-2 0-3 1-4 1-2-.5-4-.5-6 0-1 0-2-1-4-1-.3 1-.3 2 0 3-1 1-1 2-1 3 0 4 2 5.5 6 6-1 1-1 2-1 3v4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 6 9 7 9-7"/>',
    copy: '<rect x="8" y="8" width="12" height="13" rx="1"/><path d="M16 8V3H3v13h5"/>',
    up: '<path d="M12 20V4m-6 6 6-6 6 6"/>'
  };
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
});

// 由 Hexo 的文章数据生成索引，不依赖服务器或额外搜索插件。
hexo.extend.generator.register('yunshen-pages', function (locals) {
  const posts = locals.posts.sort('-date').toArray();
  const routes = [{
    path: 'search.json',
    data: JSON.stringify(posts.map(post => ({
      title: post.title,
      path: hexo.extend.helper.get('url_for').call(hexo, post.path),
      date: post.date.format('YYYY-MM-DD'),
      categories: post.categories.toArray().map(category => category.name),
      tags: post.tags.toArray().map(tag => tag.name),
      text: plainText(post.content)
    })))
  }];
  // 用户已有同路径页面时，保留其 Markdown 内容与 front matter。
  const existing = new Set(locals.pages.toArray().map(page => page.path));
  for (const [path, kind, title] of [
    [`${hexo.config.tag_dir}/index.html`, 'tags', '万象'],
    [`${hexo.config.category_dir}/index.html`, 'categories', '分门'],
    ['about/index.html', 'about', '洞府'],
    ['404.html', '404', '山径未至']
  ]) {
    if (!existing.has(path)) routes.push({ path, layout: kind === '404' ? '404' : kind === 'about' ? 'about' : 'taxonomy', data: { title, kind } });
  }
  return routes;
});
