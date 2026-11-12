(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  // 首次加载与历史恢复都读取实际滚动位置，回到顶部时恢复透明页头。
  function updateHeader() {
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  }
  addEventListener('scroll', updateHeader, { passive: true });
  addEventListener('pageshow', updateHeader);
  updateHeader();

  // 旧版 iOS WebView 只提供 addListener，不能让媒体查询监听中断后续图片和代码初始化。
  function onMediaChange(query, listener) {
    if (typeof query.addEventListener === 'function') query.addEventListener('change', listener);
    else query.addListener(listener);
  }

  const themeControl = document.querySelector('.theme-control');
  const themeToggle = document.querySelector('.theme-toggle');
  const themeMenu = document.querySelector('.theme-menu');
  const themeChoices = [...themeMenu.querySelectorAll('[data-theme-choice]')];
  const deviceTheme = matchMedia('(prefers-color-scheme: dark)');
  let themeTransition;

  // 明暗只由偏好决定；时间更新从不写主题，手动选择不会被日落或设备覆盖。
  function applyTheme(mode, animate = true) {
    const theme = mode === 'auto' ? (deviceTheme.matches ? 'dark' : 'light') : mode;
    if (animate && theme !== root.dataset.theme) {
      clearTimeout(themeTransition);
      root.classList.add('theme-changing');
      themeTransition = setTimeout(() => root.classList.remove('theme-changing'), 280);
    }
    root.dataset.themeMode = mode;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const label = { auto: '跟随设备', light: '浅色', dark: '深色' }[mode];
    themeToggle.setAttribute('aria-label', `切换主题，当前${label}${mode === 'auto' ? `，${theme === 'dark' ? '深色' : '浅色'}` : ''}`);
    themeToggle.title = `主题：${label}`;
    themeChoices.forEach(button => button.setAttribute('aria-checked', String(button.dataset.themeChoice === mode)));
    document.querySelectorAll('[data-theme-icon]').forEach(icon => { icon.hidden = icon.dataset.themeIcon !== mode; });
    document.querySelector('.theme-auto-status').textContent = `当前${deviceTheme.matches ? '深色' : '浅色'}`;
  }

  function closeThemeMenu() {
    if (themeMenu.hidden) return;
    themeMenu.hidden = true;
    themeToggle.setAttribute('aria-expanded', 'false');
    themeToggle.focus({ preventScroll: true });
  }

  function openThemeMenu() {
    themeMenu.hidden = false;
    themeToggle.setAttribute('aria-expanded', 'true');
    themeChoices.find(button => button.dataset.themeChoice === root.dataset.themeMode).focus();
  }

  themeControl.hidden = false;
  applyTheme(root.dataset.themeMode || 'auto', false);
  themeToggle.addEventListener('click', () => { if (themeMenu.hidden) openThemeMenu(); else closeThemeMenu(); });
  themeToggle.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openThemeMenu(); }
  });
  themeChoices.forEach(button => button.addEventListener('click', () => {
    const mode = button.dataset.themeChoice;
    // 存储属于浏览器边界；被禁用时仍在当前页面应用主题。
    try { localStorage.setItem('yunshen-theme', mode); } catch {}
    applyTheme(mode);
    closeThemeMenu();
  }));
  themeMenu.addEventListener('keydown', event => {
    const index = themeChoices.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % themeChoices.length;
    if (event.key === 'ArrowUp') next = (index + themeChoices.length - 1) % themeChoices.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = themeChoices.length - 1;
    if (next !== undefined) { event.preventDefault(); themeChoices[next].focus(); }
    if (event.key === 'Tab') closeThemeMenu();
  });
  document.addEventListener('click', event => { if (!themeControl.contains(event.target)) closeThemeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !themeMenu.hidden) { event.preventDefault(); closeThemeMenu(); }
  });
  onMediaChange(deviceTheme, () => {
    document.querySelector('.theme-auto-status').textContent = `当前${deviceTheme.matches ? '深色' : '浅色'}`;
    if (root.dataset.themeMode === 'auto') applyTheme('auto');
  });
  addEventListener('storage', event => {
    if (event.key === 'yunshen-theme' || event.key === null) {
      applyTheme(['light', 'dark'].includes(event.newValue) ? event.newValue : 'auto');
    }
  });
  addEventListener('pageshow', event => {
    if (!event.persisted) return;
    // 历史缓存可能早于另一标签页的设置，恢复时重新读取；禁用存储时保留本页选择。
    let mode = root.dataset.themeMode;
    try {
      const saved = localStorage.getItem('yunshen-theme');
      mode = ['light', 'dark'].includes(saved) ? saved : 'auto';
    } catch {}
    applyTheme(mode, false);
  });

  const sky = document.querySelector('.sky-track');
  if (sky) {
    const phasePath = sky.querySelector('.moon-phase');
    const clipPath = sky.querySelector('.moon-clip');
    let lunarCalendar;
    try {
      const calendar = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { day: 'numeric' });
      if (calendar.resolvedOptions().calendar === 'chinese') lunarCalendar = calendar;
    } catch {}
    let calendarDate = '';
    let lunarDay = 1;
    let monthLength = 30;
    let skyTimer;

    function updateSky() {
      const now = new Date();
      const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
      const day = hours >= 6 && hours < 18;
      const progress = day ? (hours - 6) / 12 : ((hours + 6) % 24) / 12;
      root.dataset.sky = day ? 'day' : 'night';
      sky.style.setProperty('--sky-elevation', Math.sin(Math.PI * progress).toFixed(5));

      // 按本地公历日期缓存农历换算；以当地中午探测大小月，避开夏令时边界。
      const date = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      if (lunarCalendar && date !== calendarDate) {
        calendarDate = date;
        lunarDay = Number(lunarCalendar.formatToParts(now).find(part => part.type === 'day').value);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30 - lunarDay, 12);
        monthLength = Number(lunarCalendar.formatToParts(end).find(part => part.type === 'day').value) === 30 ? 30 : 29;
      }

      // 月龄是日历近似：外侧半圆与椭圆明暗交界组合，保留上下半月相反的受光方向。
      const phase = lunarCalendar ? (lunarDay - 1 + hours / 24) / monthLength : .5;
      const cosine = Math.cos(2 * Math.PI * phase);
      const waxing = phase < .5;
      const radius = Math.abs(45 * cosine);
      const terminator = radius < .001 ? 'L50 5' : `A${radius.toFixed(4)} 45 0 0 ${waxing === (cosine >= 0) ? 0 : 1} 50 5`;
      const path = `M50 5A45 45 0 0 ${waxing ? 1 : 0} 50 95${terminator}Z`;
      phasePath.setAttribute('d', path);
      clipPath.setAttribute('d', path);
      sky.style.setProperty('--moon-scale', (.72 + .28 * (1 - cosine) / 2).toFixed(5));
      sky.dataset.lunarDay = lunarCalendar ? String(lunarDay) : '';
      sky.dataset.lunarMonthLength = lunarCalendar ? String(monthLength) : '';
    }

    function scheduleSky() {
      clearTimeout(skyTimer);
      if (document.hidden) return;
      updateSky();
      skyTimer = setTimeout(scheduleSky, 60000 - Date.now() % 60000);
    }
    // 首次排版前计算；后台不计时，恢复时校准，不重播入场动画。
    scheduleSky();
    document.addEventListener('visibilitychange', scheduleSky);
    addEventListener('pageshow', scheduleSky);
    addEventListener('pagehide', () => clearTimeout(skyTimer));
  }

  const scene = document.querySelector('.sky-scene');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let sceneVisible = false;

  // CSS 动画保留自身进度；只在页头可见、页面在前台且入场结束后运行。
  function updateAmbient() {
    scene.classList.toggle('ambient-running', sceneVisible && !document.hidden && !reducedMotion.matches && root.classList.contains('entrance-complete'));
  }
  // 缺少可见性观察器时保持装饰静止，文章交互仍照常初始化。
  if (typeof IntersectionObserver === 'function') {
    const sceneObserver = new IntersectionObserver(([entry]) => {
      sceneVisible = entry.isIntersecting;
      updateAmbient();
    });
    sceneObserver.observe(scene);
  }
  document.addEventListener('visibilitychange', updateAmbient);
  onMediaChange(reducedMotion, updateAmbient);
  addEventListener('pagehide', () => scene.classList.remove('ambient-running'));
  addEventListener('pageshow', updateAmbient);

  // 入场结束后释放合成层并启动轻微环境动效；历史恢复不重新隐藏页面。
  document.addEventListener('yunshen:ready', () => {
    setTimeout(() => { root.classList.add('entrance-complete'); updateAmbient(); }, 1100);
  }, { once: true });

  // 卷末与页头分别观察可见性，读到页脚才播放薄雾、小舟；暂停时保留动画进度。
  const footer = document.querySelector('.site-footer');
  let footerVisible = false;
  function updateFooterAmbient() {
    footer.classList.toggle('ambient-running', footerVisible && !document.hidden && !reducedMotion.matches);
  }
  if (typeof IntersectionObserver === 'function') {
    const footerObserver = new IntersectionObserver(([entry]) => {
      footerVisible = entry.isIntersecting;
      updateFooterAmbient();
    });
    footerObserver.observe(footer);
  }
  document.addEventListener('visibilitychange', updateFooterAmbient);
  onMediaChange(reducedMotion, updateFooterAmbient);
  addEventListener('pagehide', () => footer.classList.remove('ambient-running'));
  addEventListener('pageshow', updateFooterAmbient);

  const menuToggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.main-nav');
  function closeMenu() {
    menu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '展开导航');
  }
  menuToggle.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '收起导航' : '展开导航');
  });
  menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      closeMenu();
      menuToggle.focus();
    }
  });
  onMediaChange(matchMedia('(min-width: 761px)'), event => { if (event.matches) closeMenu(); });

  const dialog = document.querySelector('#search-dialog');
  const viewer = document.querySelector('#image-viewer');
  const input = document.querySelector('#search-input');
  const status = document.querySelector('.search-status');
  const results = document.querySelector('.search-results');
  let searchIndex;
  let indexRequest;

  // 按需加载并复用索引；失败后允许重试，过期的查询不会覆盖最新输入。
  async function loadIndex() {
    if (!indexRequest) {
      indexRequest = fetch(dialog.dataset.index).then(response => {
        if (!response.ok) throw new Error('index unavailable');
        return response.json();
      }).catch(error => { indexRequest = undefined; throw error; });
    }
    searchIndex = await indexRequest;
    return searchIndex;
  }

  // 所有文章文本经 textContent 写入；只把命中部分包为 mark，不解析文章 HTML。
  function highlighted(text, words) {
    const fragment = document.createDocumentFragment();
    const pattern = new RegExp(words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi');
    let offset = 0;
    for (const match of text.matchAll(pattern)) {
      fragment.append(document.createTextNode(text.slice(offset, match.index)));
      const mark = document.createElement('mark');
      mark.textContent = match[0];
      fragment.append(mark);
      offset = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(text.slice(offset)));
    return fragment;
  }

  async function search() {
    const query = input.value.trim();
    results.replaceChildren();
    if (!query) { status.textContent = '输入篇名、正文或签引，寻一卷好文。'; return; }
    status.textContent = '循墨寻踪中…';
    try {
      const posts = await loadIndex();
      if (input.value.trim() !== query) return;
      const words = query.toLocaleLowerCase().split(/\s+/);
      const matches = posts.map(post => {
        const title = post.title.toLocaleLowerCase();
        const labels = [...post.tags, ...post.categories].join(' ').toLocaleLowerCase();
        const text = post.text.toLocaleLowerCase();
        const haystack = `${title} ${labels} ${text}`;
        return { post, score: words.every(word => haystack.includes(word)) ? words.reduce((score, word) => score + (title.includes(word) ? 4 : 0) + (labels.includes(word) ? 2 : 0) + 1, 0) : 0 };
      }).filter(match => match.score).sort((a, b) => b.score - a.score);
      status.textContent = matches.length ? `寻得 ${matches.length} 篇文字${matches.length > 30 ? '，先呈前 30 篇' : ''}。` : '未寻得相应文字，试试另一个词。';
      const fragment = document.createDocumentFragment();
      matches.slice(0, 30).forEach(({ post }) => {
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = post.path;
        const heading = document.createElement('strong');
        heading.append(highlighted(post.title, words));
        const snippet = document.createElement('p');
        const matchIndex = Math.max(0, post.text.toLocaleLowerCase().indexOf(words[0]));
        const start = Math.max(0, matchIndex - 25);
        snippet.append(highlighted(`${start ? '…' : ''}${post.text.slice(start, start + 110)}${post.text.length > start + 110 ? '…' : ''}`, words));
        const meta = document.createElement('small');
        meta.textContent = `${post.date} · ${post.categories.join(' / ') || '随笔'}`;
        link.append(meta, heading, snippet);
        li.append(link);
        fragment.append(li);
      });
      results.append(fragment);
    } catch {
      if (input.value.trim() === query) status.textContent = '暂时未能取到卷目，请检查网络后重新输入。';
    }
  }

  function openSearch() {
    // 原生模态框之间不叠加；查看图片时，搜索快捷键仍被消费但不打开搜索。
    if (viewer?.hasAttribute('open')) return;
    closeMenu();
    if (!dialog.open) dialog.showModal();
    input.focus();
  }
  document.querySelectorAll('.search-trigger').forEach(button => button.addEventListener('click', openSearch));
  document.querySelector('.search-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    // 点击 dialog 外的遮罩才关闭，面板内部留白不触发关闭。
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  document.querySelector('.search-form').addEventListener('submit', event => { event.preventDefault(); search(); });
  let searchTimer;
  input.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(search, 150); });
  document.addEventListener('keydown', event => {
    const editing = event.target instanceof HTMLElement && (event.target.matches('input,textarea,select') || event.target.isContentEditable);
    if (!editing && (event.key === '/' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k'))) {
      event.preventDefault();
      openSearch();
    }
  });

  const articleImages = [...document.querySelectorAll('.article-paper .prose img')].filter(image => !image.closest('a,button'));
  if (viewer && articleImages.length) {
    const stage = viewer.querySelector('.image-viewer-stage');
    const caption = viewer.querySelector('.image-viewer-caption');
    const count = viewer.querySelector('.image-viewer-count');
    const status = viewer.querySelector('.image-viewer-status');
    const previous = viewer.querySelector('.image-viewer-prev');
    const next = viewer.querySelector('.image-viewer-next');
    const zoomOut = viewer.querySelector('.image-viewer-out');
    const zoomIn = viewer.querySelector('.image-viewer-in');
    const fit = viewer.querySelector('.image-viewer-fit');
    const percentage = viewer.querySelector('.image-viewer-scale');
    const close = viewer.querySelector('.image-viewer-close');
    let image = viewer.querySelector('.image-viewer-image');
    let activeIndex = 0;
    let origin;
    let scrollPosition;
    let width = 0;
    let height = 0;
    let scale = 1;
    let maxScale = 4;
    let x = 0;
    let y = 0;
    let gesture;
    const pointers = new Map();
    const nativeViewer = typeof viewer.showModal === 'function' && typeof viewer.close === 'function';
    let backdrop;

    if (!nativeViewer) {
      // 不支持原生 dialog 的微信仍使用站内查看器；移出 main 的隔离层，避免被页头遮住。
      viewer.classList.add('image-viewer-fallback');
      viewer.setAttribute('role', 'dialog');
      viewer.setAttribute('aria-modal', 'true');
      document.body.append(viewer);
      backdrop = document.createElement('div');
      backdrop.className = 'image-viewer-backdrop';
      backdrop.hidden = true;
      backdrop.setAttribute('aria-hidden', 'true');
      viewer.before(backdrop);
      backdrop.addEventListener('click', closeViewer);
      document.addEventListener('focusin', event => {
        if (viewer.hasAttribute('open') && !viewer.contains(event.target)) close.focus({ preventScroll: true });
      });
    }

    function closeViewer() {
      if (nativeViewer) viewer.close();
      else {
        viewer.removeAttribute('open');
        backdrop.hidden = true;
        restoreReading();
      }
    }

    // 用原生按钮补足键盘入口；picture 整体移动，保留响应式图片和已有链接语义。
    const pictures = articleImages.map((source, index) => {
      const label = source.closest('figure')?.querySelector('figcaption')?.textContent.trim() || source.title || source.alt;
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'image-trigger';
      trigger.setAttribute('aria-label', `放大查看图片${label ? `：${label}` : ` ${index + 1}`}`);
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-controls', 'image-viewer');
      const content = source.closest('picture') || source;
      content.before(trigger);
      trigger.append(content);
      trigger.addEventListener('click', () => {
        origin = trigger;
        scrollPosition = { left: window.scrollX, top: window.scrollY };
        closeMenu();
        closeThemeMenu();
        root.classList.add('image-viewer-open');
        if (nativeViewer) viewer.showModal();
        else {
          // 固定背景并保留阅读偏移，避免旧版 iOS 仅设置 overflow 后仍能滚动正文。
          root.style.setProperty('--image-viewer-scroll-top', `${-scrollPosition.top}px`);
          root.classList.add('image-viewer-fallback-open');
          backdrop.hidden = false;
          viewer.setAttribute('open', '');
        }
        showImage(index);
        close.focus();
      });
      return { source, label };
    });

    function renderImage() {
      // 平移按实际屏幕像素计算；只允许移动超出视窗的部分，避免图片被拖出可视范围。
      const limitX = Math.max(0, (width * scale - stage.clientWidth) / 2);
      const limitY = Math.max(0, (height * scale - stage.clientHeight) / 2);
      x = Math.max(-limitX, Math.min(limitX, x));
      y = Math.max(-limitY, Math.min(limitY, y));
      image.style.transform = `translate(-50%,-50%) translate(${x}px,${y}px) scale(${scale})`;
      stage.classList.toggle('is-zoomed', width > 0 && scale > 1);
      stage.classList.toggle('is-dragging', pointers.size > 0 && scale > 1);
      percentage.value = `${Math.round(scale * 100)}%`;
      zoomOut.disabled = !width || scale <= 1;
      zoomIn.disabled = !width || scale >= maxScale;
      fit.disabled = !width || scale === 1;
    }

    function fitImage() {
      const ratio = Math.min(1, (stage.clientWidth - 32) / image.naturalWidth, (stage.clientHeight - 32) / image.naturalHeight);
      width = image.naturalWidth * ratio;
      height = image.naturalHeight * ratio;
      maxScale = Math.max(4, 1 / ratio);
      image.style.width = `${width}px`;
      image.style.height = `${height}px`;
      scale = 1;
      x = y = 0;
      pointers.clear();
      gesture = undefined;
      renderImage();
    }

    function showImage(index) {
      activeIndex = index;
      pointers.clear();
      gesture = undefined;
      width = height = 0;
      scale = 1;
      x = y = 0;
      const picture = pictures[index];
      caption.textContent = picture.label;
      count.textContent = `${index + 1} / ${pictures.length}`;
      previous.hidden = next.hidden = pictures.length === 1;
      previous.disabled = index === 0;
      next.disabled = index === pictures.length - 1;
      status.hidden = false;
      status.textContent = '正在展图…';

      // 每次切图独立监听加载，忽略已切走或已关闭的请求，避免迟到的事件覆盖当前图片。
      const incoming = new Image();
      incoming.className = 'image-viewer-image';
      incoming.alt = picture.source.alt;
      incoming.draggable = false;
      incoming.hidden = true;
      incoming.addEventListener('load', () => {
        if (image !== incoming || !viewer.hasAttribute('open')) return;
        fitImage();
        incoming.hidden = false;
        status.hidden = true;
      }, { once: true });
      incoming.addEventListener('error', () => {
        if (image !== incoming || !viewer.hasAttribute('open')) return;
        status.textContent = '图片暂未展开，请稍后再试。';
      }, { once: true });
      image.replaceWith(incoming);
      image = incoming;
      renderImage();
      incoming.src = picture.source.currentSrc || picture.source.src;
    }

    function zoomImage(value, anchorX = 0, anchorY = 0) {
      const nextScale = Math.max(1, Math.min(maxScale, value));
      // 锚点在缩放前后对应同一个图片位置，滚轮和双指操作不会把关注的细节推走。
      const ratio = nextScale / scale;
      x = anchorX - (anchorX - x) * ratio;
      y = anchorY - (anchorY - y) * ratio;
      scale = nextScale;
      renderImage();
    }

    previous.addEventListener('click', () => showImage(activeIndex - 1));
    next.addEventListener('click', () => showImage(activeIndex + 1));
    zoomOut.addEventListener('click', () => zoomImage(scale / 1.25));
    zoomIn.addEventListener('click', () => zoomImage(scale * 1.25));
    fit.addEventListener('click', fitImage);
    close.addEventListener('click', closeViewer);
    viewer.addEventListener('click', event => {
      const rect = viewer.getBoundingClientRect();
      if (event.target === viewer && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeViewer();
    });
    viewer.addEventListener('keydown', event => {
      // 两种弹层都衔接首尾焦点；下标取尾元素兼容尚无 Array.at 的 iOS。
      if (event.key === 'Tab') {
        const buttons = [...viewer.querySelectorAll('button:not(:disabled):not([hidden])')];
        if (event.shiftKey && document.activeElement === buttons[0]) {
          event.preventDefault();
          buttons[buttons.length - 1].focus();
        } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
          event.preventDefault();
          buttons[0].focus();
        }
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        if (event.key === 'ArrowLeft' && activeIndex > 0) showImage(activeIndex - 1);
        if (event.key === 'ArrowRight' && activeIndex < pictures.length - 1) showImage(activeIndex + 1);
      }
      if (event.key === 'Escape' && !nativeViewer) {
        event.preventDefault();
        closeViewer();
      }
    });
    function restoreReading() {
      // close 事件异步派发；若已重新打开，不让上一轮清理解除当前模态锁定。
      if (viewer.hasAttribute('open')) return;
      pointers.clear();
      gesture = undefined;
      root.classList.remove('image-viewer-fallback-open');
      root.style.removeProperty('--image-viewer-scroll-top');
      // 先释放固定背景，用数值坐标兼容旧 WebKit；保留滚动锁的 auto 行为，防止平滑滚动跳页。
      window.scrollTo(scrollPosition.left, scrollPosition.top);
      root.classList.remove('image-viewer-open');
      origin.focus({ preventScroll: true });
    }
    viewer.addEventListener('close', restoreReading);

    stage.addEventListener('wheel', event => {
      event.preventDefault();
      if (!width) return;
      const rect = stage.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1);
      zoomImage(scale * Math.exp(-delta * .002), event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2);
    }, { passive: false });

    function beginGesture() {
      const points = [...pointers.values()];
      const rect = stage.getBoundingClientRect();
      if (points.length === 2) {
        const [a, b] = points;
        gesture = { scale, x, y, distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
          anchorX: (a.x + b.x) / 2 - rect.left - rect.width / 2,
          anchorY: (a.y + b.y) / 2 - rect.top - rect.height / 2 };
      } else if (points.length === 1) {
        gesture = { x, y, startX: points[0].x, startY: points[0].y };
      } else {
        gesture = undefined;
      }
      stage.classList.toggle('is-dragging', points.length > 0 && scale > 1);
    }

    stage.addEventListener('pointerdown', event => {
      if (!width || event.button !== 0 || pointers.size === 2) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      stage.setPointerCapture(event.pointerId);
      beginGesture();
    });
    stage.addEventListener('pointermove', event => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const points = [...pointers.values()];
      if (points.length === 2) {
        const [a, b] = points;
        const rect = stage.getBoundingClientRect();
        const nextScale = Math.max(1, Math.min(maxScale, gesture.scale * Math.hypot(b.x - a.x, b.y - a.y) / gesture.distance));
        const ratio = nextScale / gesture.scale;
        x = (a.x + b.x) / 2 - rect.left - rect.width / 2 - (gesture.anchorX - gesture.x) * ratio;
        y = (a.y + b.y) / 2 - rect.top - rect.height / 2 - (gesture.anchorY - gesture.y) * ratio;
        scale = nextScale;
      } else if (scale > 1) {
        x = gesture.x + event.clientX - gesture.startX;
        y = gesture.y + event.clientY - gesture.startY;
      }
      renderImage();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      stage.addEventListener(name, event => {
        if (pointers.delete(event.pointerId)) beginGesture();
      });
    }
    // 窗口或手机方向变化后重新适屏；绝对定位的图片不会反过来触发视窗尺寸变化。
    function resizeImage() {
      if (viewer.hasAttribute('open') && width) fitImage();
    }
    // 观察器属于浏览器能力边界；旧 WebView 通过窗口尺寸事件处理横竖屏切换。
    if (typeof ResizeObserver === 'function') new ResizeObserver(resizeImage).observe(stage);
    else addEventListener('resize', resizeImage);
  }

  const quotePanel = document.querySelector('[data-quotes]');
  if (quotePanel) {
    const quotes = JSON.parse(quotePanel.dataset.quotes);
    let quoteIndex = 0;
    quotePanel.querySelector('.quote-refresh').addEventListener('click', () => {
      quoteIndex = (quoteIndex + 1) % quotes.length;
      quotePanel.querySelector('[data-quote-text]').textContent = quotes[quoteIndex].text;
      quotePanel.querySelector('[data-quote-author]').textContent = `— ${quotes[quoteIndex].author}`;
    });
  }

  const backTop = document.querySelector('.back-top');
  function updateBackTop() { backTop.hidden = window.scrollY < 500; }
  addEventListener('scroll', updateBackTop, { passive: true });
  updateBackTop();
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));

  document.querySelectorAll('.prose .highlight').forEach(block => {
    // 语言与复制移到固定标题栏，横向滚动只作用于代码，不再遮住内容。
    const toolbar = document.createElement('figcaption');
    toolbar.className = 'code-toolbar';
    const language = document.createElement('span');
    language.className = 'code-language';
    language.textContent = [...block.classList].find(name => name !== 'highlight') || 'text';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-code';
    button.textContent = '复制';
    button.setAttribute('aria-label', '复制代码');
    const table = block.querySelector('table');
    const scroll = document.createElement('div');
    scroll.className = 'code-scroll';
    table.before(scroll);
    scroll.append(table);
    toolbar.append(language, button);
    block.prepend(toolbar);
    button.addEventListener('click', async () => {
      const text = block.querySelector('.code pre').innerText;
      try {
        // Clipboard API 需要安全上下文；失败时给出明确反馈。
        await navigator.clipboard.writeText(text);
        button.textContent = '已复制';
        button.classList.add('is-copied');
      } catch {
        button.textContent = '请选中复制';
      }
      setTimeout(() => { button.textContent = '复制'; button.classList.remove('is-copied'); }, 2000);
    });
  });

  const shareButton = document.querySelector('.share-article');
  if (shareButton) {
    shareButton.addEventListener('click', async () => {
      const status = document.querySelector('.share-status');
      try {
        const url = new URL(location.href);
        url.hash = '';
        await navigator.clipboard.writeText(url.href);
        status.textContent = '链接已复制，可传与同道。';
      } catch {
        status.textContent = '请复制地址栏中的文章链接。';
      }
    });
  }

  // 标题位置预先缓存；滚动时二分查找当前章节，解决长章节空隙中的目录失焦。
  const tocLinks = [...document.querySelectorAll('.toc-link')];
  const article = document.querySelector('.article-paper');
  if (article) {
    const progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.append(progress);
    const sections = tocLinks.map(link => ({ link, heading: document.getElementById(decodeURIComponent(link.hash.slice(1))), top: 0 }));
    let articleTop = 0;
    let articleHeight = 0;
    let activeLink;
    let scheduled = false;

    function updateReading() {
      scheduled = false;
      const position = window.scrollY + 125;
      progress.style.transform = `scaleX(${Math.min(1, Math.max(0, (position - articleTop) / articleHeight))})`;
      let left = 0;
      let right = sections.length - 1;
      let active = -1;
      while (left <= right) {
        const middle = (left + right) >> 1;
        if (sections[middle].top <= position) { active = middle; left = middle + 1; }
        else right = middle - 1;
      }
      const next = sections[active]?.link;
      if (activeLink === next) return;
      if (activeLink) { activeLink.classList.remove('is-active'); activeLink.removeAttribute('aria-current'); }
      if (next) { next.classList.add('is-active'); next.setAttribute('aria-current', 'location'); }
      activeLink = next;
    }

    function measureReading() {
      articleTop = article.getBoundingClientRect().top + window.scrollY;
      articleHeight = article.offsetHeight;
      sections.forEach(section => { section.top = section.heading.getBoundingClientRect().top + window.scrollY; });
      updateReading();
    }
    addEventListener('scroll', () => {
      if (!scheduled) { scheduled = true; requestAnimationFrame(updateReading); }
    }, { passive: true });
    // 字体、图片和窗口宽度改变时重算位置，避免缓存因排版变化而偏移。
    // 无 ResizeObserver 时仍在窗口变化、字体和图片加载后校准目录及进度。
    if (typeof ResizeObserver === 'function') new ResizeObserver(measureReading).observe(article);
    else {
      addEventListener('resize', measureReading);
      article.addEventListener('load', measureReading, true);
    }
    document.fonts.ready.then(measureReading);
    measureReading();
  }
})();
