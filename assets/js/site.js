(() => {
  'use strict';

  // A hidden source document only supplies the editable publication HTML.
  if (window.parent !== window && new URL(location.href).searchParams.get('publication-source') === '1') return;

  // Ordinary page URLs remain usable directly and in new tabs. Normal primary
  // clicks reuse this document so browser zoom survives local-file navigation.
  document.documentElement.classList.add('js');
  const mobile = window.matchMedia('(max-width: 700px)');
  const shortViewport = window.matchMedia('(max-height: 540px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('.navigation');
  const visible = nav?.querySelector('.visible-links');
  const overflow = nav?.querySelector('.nav-overflow');
  const more = nav?.querySelector('.more-button');
  const moreLabel = more?.querySelector('.more-label');
  const indicator = nav?.querySelector('.nav-indicator');
  const pageLinks = Array.from(nav?.querySelectorAll('a.nav-link') || []);
  const sidebar = document.querySelector('.sidebar');
  const profile = sidebar?.querySelector('.profile');
  const toc = sidebar?.querySelector('details.page-toc');
  const summary = toc?.querySelector('summary');
  const tocNav = toc?.querySelector('.toc-links');
  const main = document.querySelector('#main');
  const backTop = document.querySelector('.back-to-top');
  let tocLinks = [];
  let tocTargets = [];
  function refreshToc() {
    tocLinks = Array.from(tocNav?.querySelectorAll('a.toc-link') || []);
    tocTargets = tocLinks.map(link => {
      let id;
      try { id = decodeURIComponent(link.hash.slice(1)); } catch { return null; }
      return document.getElementById(id);
    });
  }
  refreshToc();
  let compact = null;
  let layoutFrame = 0;
  let scrollFrame = 0;
  const pageNames = ['index.html', 'publications.html', 'grants-awards.html', 'service.html'];
  const pageData = window.academicPages || {};
  const historyKey = 'academicPage';
  const scrollPositions = new Map();
  let entryNumber = 0;
  let activeEntry = null;
  let navigationEnabled = false;
  let restoration = 0;
  let renderedPage = pageNames.find(name => pageData[name]?.page === document.body.dataset.page) ||
    (location.pathname.split('/').pop() || 'index.html');

  function pageNameFor(url) {
    const queryPage = url.protocol === 'file:' ? url.searchParams.get('page') : null;
    if (pageNames.includes(queryPage)) return queryPage;
    const name = url.pathname.split('/').pop() || 'index.html';
    return pageNames.includes(name) ? name : null;
  }

  function routeURL(name, ordinaryURL) {
    if (location.protocol !== 'file:') return new URL(ordinaryURL || name, location.href);
    // History may change a file URL's query and hash, but never its pathname.
    const url = new URL(location.href);
    url.searchParams.set('page', name);
    url.hash = '';
    return url;
  }

  function historyState(record) {
    const previous = history.state && typeof history.state === 'object' ? history.state : {};
    return {...previous, [historyKey]: record};
  }

  function newRecord(name, url, x = 0, y = 0) {
    return {id: `${Date.now().toString(36)}-${++entryNumber}`, page: name, url: url.href, x, y};
  }

  function rememberPosition(persist = false) {
    if (!navigationEnabled || !activeEntry) return;
    const point = {x: window.scrollX, y: window.scrollY};
    scrollPositions.set(activeEntry, point);
    const record = history.state?.[historyKey];
    if (persist && record?.id === activeEntry && record.url === location.href) {
      history.replaceState(historyState({...record, ...point}), '');
    }
  }

  function renderPage(name) {
    const data = pageData[name];
    if (!data || !main || !tocNav) return false;
    if (renderedPage !== name) {
      main.innerHTML = data.main;
      tocNav.innerHTML = data.toc;
      renderedPage = name;
      refreshToc();
      compact = null;
    }
    document.title = data.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', data.description);
    document.body.dataset.page = data.page;
    for (const link of pageLinks) {
      const target = new URL(link.getAttribute('href'), location.href).pathname.split('/').pop();
      if (target === name) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    closeMenu();
    requestLayout();
    return true;
  }

  function restorePosition(point, useHash = false, focusMain = false) {
    const version = ++restoration;
    // Let the responsive menu settle before measuring an anchor's offset.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (version !== restoration) return;
      if (focusMain) main?.focus({preventScroll: true});
      let target = null;
      if (useHash && location.hash) {
        try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch {}
      }
      if (target) target.scrollIntoView({behavior: 'instant', block: 'start'});
      else window.scrollTo({left: point?.x || 0, top: point?.y || 0, behavior: 'instant'});
      rememberPosition(true);
      updateToc();
      updateBackTop();
    }));
  }

  function handleLocationChange() {
    if (!navigationEnabled) return;
    const url = new URL(location.href);
    const name = pageNameFor(url);
    if (!name || !pageData[name]) return;
    const stored = history.state?.[historyKey];
    const known = stored?.url === url.href && stored.page === name;
    const record = known ? stored : newRecord(name, url, window.scrollX, window.scrollY);
    try {
      if (!known) history.replaceState(historyState(record), '');
      activeEntry = record.id;
      const changed = renderedPage !== name;
      renderPage(name);
      const point = scrollPositions.get(record.id) || record;
      // A fresh native hash entry inherits the preceding state. Give it its
      // own record and follow the anchor; history traversals restore position.
      restorePosition(point, !known && Boolean(url.hash), changed);
    } catch {
      location.assign(new URL(name, location.href).href);
    }
  }

  function navigatePage(name, ordinaryURL) {
    const url = routeURL(name, ordinaryURL);
    try {
      rememberPosition(true);
      if (url.href === location.href && name === renderedPage) {
        closeMenu();
        restorePosition({x: 0, y: 0}, false, true);
        return;
      }
      const record = newRecord(name, url);
      history.pushState(historyState(record), '', url.href);
      activeEntry = record.id;
      scrollPositions.set(record.id, {x: 0, y: 0});
      renderPage(name);
      restorePosition({x: 0, y: 0}, false, true);
    } catch {
      location.assign(ordinaryURL);
    }
  }

  function closeMenu(returnFocus = false) {
    if (!overflow || !more) return;
    overflow.hidden = true;
    more.setAttribute('aria-expanded', 'false');
    if (returnFocus && !more.hidden) more.focus();
  }

  function paintIndicator() {
    if (!nav || !more) return;
    const current = pageLinks.find(link => link.getAttribute('aria-current') === 'page');
    const inOverflow = current?.parentElement === overflow;
    more.classList.toggle('has-current', Boolean(inOverflow));
    if (moreLabel) moreLabel.textContent = mobile.matches ? 'Menu' : 'More';
    more.setAttribute('aria-label', (mobile.matches ? 'Navigation menu' : 'More pages') +
      (inOverflow ? ': ' + current.textContent.trim() : ''));
    if (!indicator) return;
    const target = inOverflow ? more : current;
    if (!target || target.hidden || !target.getClientRects().length) {
      indicator.style.opacity = '0';
      return;
    }
    const rect = target.getBoundingClientRect();
    const base = nav.getBoundingClientRect();
    indicator.style.width = rect.width + 'px';
    indicator.style.height = rect.height + 'px';
    indicator.style.transform = `translate(${rect.left - base.left}px, ${rect.top - base.top}px)`;
    indicator.style.opacity = '1';
  }

  function layoutMainNav() {
    if (!nav || !visible || !overflow || !more) return;
    const focused = document.activeElement;
    for (const link of pageLinks) visible.append(link);
    more.hidden = true;
    if (mobile.matches) {
      for (const link of pageLinks) overflow.append(link);
      more.hidden = false;
    } else if (visible.scrollWidth > nav.clientWidth) {
      more.hidden = false;
      const gap = parseFloat(getComputedStyle(nav).columnGap) || 8;
      while (visible.lastElementChild &&
        visible.scrollWidth + more.offsetWidth + gap > nav.clientWidth) {
        overflow.prepend(visible.lastElementChild);
      }
    }
    if (!overflow.children.length) closeMenu();
    if (pageLinks.includes(focused) && focused.parentElement === overflow && overflow.hidden) {
      more.focus({preventScroll: true});
    }
    paintIndicator();
  }

  function layoutToc() {
    if (!sidebar || !profile || !toc || !summary || !tocNav) return;
    const oldOpen = toc.open;
    // A closed details element has no measurable list. Measure before paint,
    // then restore the reader's choice while the responsive mode is unchanged.
    toc.open = true;
    const shellHeight = Math.max(summary.offsetHeight,
      toc.offsetHeight - tocNav.offsetHeight);
    const naturalHeight = shellHeight + tocNav.scrollHeight;
    const computedSidebar = getComputedStyle(sidebar);
    const stickyTop = parseFloat(computedSidebar.top) ||
      ((header?.offsetHeight || 0) + 24);
    const gap = parseFloat(computedSidebar.rowGap) ||
      parseFloat(getComputedStyle(toc).marginTop) || 24;
    const available = Math.max(100, window.innerHeight - stickyTop - 20);
    const nextCompact = mobile.matches || shortViewport.matches ||
      profile.offsetHeight + gap + naturalHeight > available;
    const remaining = Math.max(100, available - profile.offsetHeight - gap - shellHeight);
    toc.style.setProperty('--toc-max-height', remaining + 'px');
    sidebar.classList.toggle('toc-compact', nextCompact);
    toc.open = compact === nextCompact ? oldOpen : !nextCompact;
    compact = nextCompact;
    // On unusually short desktop windows, the profile itself must remain
    // reachable along with the menu rather than clipping below the viewport.
    const sidebarMustScroll = !mobile.matches && !shortViewport.matches &&
      profile.offsetHeight + gap + shellHeight > available;
    sidebar.style.maxHeight = sidebarMustScroll ? available + 'px' : '';
    sidebar.style.overflowY = sidebarMustScroll ? 'auto' : '';
  }

  function updateToc() {
    if (!tocLinks.length) return;
    const firstTarget = tocTargets.find(Boolean);
    const threshold = (parseFloat(firstTarget && getComputedStyle(firstTarget).scrollMarginTop) || 18) + 8;
    let active = tocTargets.findIndex(Boolean);
    tocTargets.forEach((target, index) => {
      if (target && target.getBoundingClientRect().top <= threshold) active = index;
    });
    // At the document end an anchor can be visible without reaching the top
    // threshold. Honor that selected anchor when further scrolling is clamped.
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (location.hash && window.scrollY > 0 && window.scrollY >= maxScroll - 2) {
      let selected = '';
      try { selected = decodeURIComponent(location.hash.slice(1)); } catch {}
      const index = tocTargets.findIndex(target => target?.id === selected);
      const top = tocTargets[index]?.getBoundingClientRect().top;
      if (top > threshold && top < window.innerHeight) active = index;
    }
    // A short page can display several targets simultaneously. Only the last
    // passed target is current; reaching the bottom does not skip ahead.
    let category = -1;
    for (let index = 0; index <= active; index++) {
      if (tocLinks[index].classList.contains('toc-heading')) category = index;
    }
    tocLinks.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
      link.classList.toggle('has-active', index === category && active !== category);
    });
  }

  function updateBackTop() {
    if (!backTop) return;
    const visible = window.scrollY > 200;
    if (!visible && document.activeElement === backTop) main?.focus({preventScroll: true});
    backTop.hidden = !visible;
  }

  function requestLayout() {
    if (layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      if (header) document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
      layoutMainNav();
      layoutToc();
      updateToc();
      updateBackTop();
    });
  }

  function closeToc(returnFocus = false) {
    if (!compact || !toc?.open) return;
    toc.open = false;
    if (returnFocus) summary?.focus();
  }

  backTop?.addEventListener('click', () => {
    ++restoration;
    closeMenu();
    closeToc();
    window.scrollTo({left: 0, top: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
    updateBackTop();
  });

  more?.addEventListener('click', () => {
    overflow.hidden = !overflow.hidden;
    more.setAttribute('aria-expanded', String(!overflow.hidden));
  });
  more?.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    overflow.hidden = false;
    more.setAttribute('aria-expanded', 'true');
    overflow.querySelector('a')?.focus();
  });
  nav?.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !overflow?.hidden) {
      event.preventDefault();
      closeMenu(true);
    }
  });
  nav?.addEventListener('focusout', () => {
    setTimeout(() => { if (!nav.contains(document.activeElement)) closeMenu(); }, 0);
  });
  toc?.addEventListener('keydown', event => {
    if (event.key === 'Escape' && compact && toc.open) {
      event.preventDefault();
      closeToc(true);
    }
  });
  tocNav?.addEventListener('click', event => {
    const link = event.target.closest('a.toc-link');
    if (!link || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    closeToc();
    requestAnimationFrame(updateToc);
  });
  // Save the departing anchor entry before the browser's native hash action.
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!navigationEnabled || !link || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const target = new URL(link.href, location.href);
    const here = new URL(location.href);
    if (target.pathname === here.pathname && target.search === here.search && target.hash) {
      try { rememberPosition(true); } catch {}
    }
  }, true);
  nav?.addEventListener('click', event => {
    const link = event.target.closest('a.nav-link');
    if (!navigationEnabled || !link || !pageLinks.includes(link) || event.defaultPrevented ||
      event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey ||
      link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href, location.href);
    const here = new URL(location.href);
    if (url.protocol !== here.protocol || url.host !== here.host ||
      url.pathname.slice(0, url.pathname.lastIndexOf('/') + 1) !==
      here.pathname.slice(0, here.pathname.lastIndexOf('/') + 1)) return;
    const name = url.pathname.split('/').pop();
    if (!pageNames.includes(name) || !pageData[name]) return;
    event.preventDefault();
    navigatePage(name, url.href);
  });
  document.addEventListener('click', event => {
    if (!nav?.contains(event.target)) closeMenu();
    if (!toc?.contains(event.target)) closeToc();
  });
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      rememberPosition();
      updateToc();
      updateBackTop();
    });
  }, {passive: true});
  window.addEventListener('popstate', handleLocationChange);
  window.addEventListener('hashchange', () => {
    if (navigationEnabled && history.state?.[historyKey]?.url !== location.href) handleLocationChange();
    requestAnimationFrame(updateToc);
  });
  window.addEventListener('pagehide', () => { try { rememberPosition(true); } catch {} });
  window.addEventListener('resize', requestLayout);
  mobile.addEventListener('change', () => { closeMenu(); requestLayout(); });
  shortViewport.addEventListener('change', requestLayout);
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(requestLayout);
    if (header) observer.observe(header);
    if (nav) observer.observe(nav);
    if (profile) observer.observe(profile);
  }

  // Preserve bookmarks made before the original single page was separated.
  const initialURL = new URL(location.href);
  let requestedPage = pageNameFor(initialURL);
  let requestedURL = initialURL;
  if (requestedPage === 'index.html' && location.hash) {
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { hash = ''; }
    const aliases = {
      publications: ['publications.html', 'publications'],
      'grants--awards': ['grants-awards.html', 'grants--awards'],
      'grants-awards': ['grants-awards.html', 'grants--awards'],
      awards: ['grants-awards.html', 'grants--awards'],
      'professional-service': ['service.html', 'professional-service'],
      service: ['service.html', 'professional-service']
    };
    const year = /^publications-(\d{4})$/.exec(hash);
    const destination = year ? ['publications.html',
      (year[1] === '2021' ? 'journal-' : 'conference-') + year[1]] : aliases[hash];
    if (destination) {
      requestedPage = destination[0];
      requestedURL = routeURL(destination[0]);
      if (location.protocol !== 'file:') requestedURL.search = location.search;
      requestedURL.hash = destination[1];
    }
  }
  const completeBundle = pageNames.every(name => {
    const data = pageData[name];
    return data && typeof data.main === 'string' && typeof data.toc === 'string';
  });
  if (completeBundle && main && tocNav && requestedPage &&
    ['file:', 'http:', 'https:'].includes(location.protocol)) {
    try {
      const stored = history.state?.[historyKey];
      const known = stored?.url === requestedURL.href && stored.page === requestedPage;
      const record = known ? stored : newRecord(requestedPage, requestedURL, window.scrollX, window.scrollY);
      if (requestedURL.href === location.href) history.replaceState(historyState(record), '');
      else history.replaceState(historyState(record), '', requestedURL.href);
      navigationEnabled = true;
      activeEntry = record.id;
      history.scrollRestoration = 'manual';
      renderPage(requestedPage);
      if (known || requestedURL.hash) restorePosition(record, !known && Boolean(requestedURL.hash));
    } catch {
      navigationEnabled = false;
      if (requestedURL.href !== initialURL.href) location.replace(requestedURL.href);
    }
  } else if (requestedURL.href !== initialURL.href) {
    // Old bookmarks continue to work when scripts or bundled data are absent.
    const fallback = new URL(requestedPage, location.href);
    fallback.hash = requestedURL.hash;
    location.replace(fallback.href);
    return;
  }
  requestLayout();
  document.fonts?.ready.then(requestLayout);
  // Publications come from their current HTML rather than a copied bundle.
  // This also preserves the document/zoom when opening local file pages.
  window.publicationsReady?.then(data => {
    if (!data || renderedPage !== 'publications.html' || !main?.isConnected || main.innerHTML === data.main) return;
    const position = {x: window.scrollX, y: window.scrollY};
    renderedPage = null;
    renderPage('publications.html');
    restorePosition(position, Boolean(location.hash));
  });
})();
