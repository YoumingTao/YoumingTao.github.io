(() => {
  'use strict';

  const PAGE = 'publications.html';
  const MESSAGE = 'academic-publications';
  const GROUPS = [
    {type: 'conference', title: 'Conference Papers'},
    {type: 'journal', title: 'Journal Papers'}
  ];

  function element(doc, name, text, attributes = {}) {
    const node = doc.createElement(name);
    if (text !== undefined) node.textContent = text;
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }

  // HTML is the only paper source. Add navigation and year lines without moving
  // a paper: its position in the corresponding <ol> is its display position.
  function enhance(main, toc) {
    if (!main || !toc) throw new TypeError('Publications main content and navigation are required.');
    const doc = main.ownerDocument;
    const navigation = doc.createDocumentFragment();

    for (const group of GROUPS) {
      const block = main.querySelector(`#${group.type}-papers`);
      const list = block?.querySelector('.publication-list');
      if (!block || !list) continue;
      const title = block.querySelector('h2')?.textContent.trim() || group.title;
      navigation.append(element(doc, 'a', title, {
        class: 'toc-link toc-heading', href: `#${block.id}`
      }));
      list.removeAttribute('start');
      list.removeAttribute('reversed');

      const papers = Array.from(list.children).filter(node => node.matches('li.publication'));
      // Clean up only the generated year decoration; paper HTML stays intact.
      for (const paper of papers) {
        paper.removeAttribute('value');
        paper.classList.remove('starts-year');
        for (const child of Array.from(paper.children)) {
          if (child.classList.contains('year-divider')) child.remove();
        }
        if (paper.hasAttribute('data-publication-year-anchor') ||
            /^(conference|journal)-\d{4}(?:-\d+)?$/.test(paper.id)) {
          paper.removeAttribute('id');
          paper.removeAttribute('tabindex');
        }
        paper.removeAttribute('data-publication-year-anchor');
        paper.dataset.kind = group.type;
      }

      const occurrences = new Map();
      const listedYears = new Set();
      let previousYear = null;
      for (const paper of papers) {
        const year = paper.getAttribute('data-year')?.trim();
        if (!/^\d{4}$/.test(year || '') || Number(year) < 1000) {
          console.warn('[Publications] A paper needs a four-digit data-year:', paper);
          previousYear = null;
          continue;
        }
        if (year !== previousYear) {
          const count = (occurrences.get(year) || 0) + 1;
          occurrences.set(year, count);
          const yearID = `${group.type}-${year}${count > 1 ? `-${count}` : ''}`;
          paper.classList.add('starts-year');
          // Reserve the generated anchor names; a custom paper ID may remain.
          const anchor = element(doc, 'span', year, {
            class: 'year-divider', 'aria-label': `Year ${year}`
          });
          if (paper.id) anchor.id = yearID;
          else {
            paper.id = yearID;
            paper.tabIndex = -1;
            paper.setAttribute('data-publication-year-anchor', '');
          }
          paper.prepend(anchor);
          if (!listedYears.has(year)) {
            navigation.append(element(doc, 'a', year, {
              class: 'toc-link toc-year', href: `#${yearID}`
            }));
            listedYears.add(year);
          }
        }
        previousYear = year;
      }
    }
    toc.replaceChildren(navigation);
    return {main: main.innerHTML, toc: toc.innerHTML};
  }

  function publish(page) {
    const pages = window.academicPages && typeof window.academicPages === 'object' ?
      window.academicPages : (window.academicPages = {});
    pages[PAGE] = page;
    return page;
  }

  function statusPage(unavailable = false) {
    const section = element(document, 'section', undefined, {
      class: 'content-section publications', id: 'publications',
      'aria-labelledby': 'publications-heading', tabindex: '-1'
    });
    section.append(element(document, 'h1', 'Publications', {id: 'publications-heading'}));
    const message = element(document, 'p', unavailable ?
      'The publications could not be loaded. ' : 'Loading publications…', {role: 'status'});
    if (unavailable) message.append(element(document, 'a', 'Open the publications page.', {href: PAGE}));
    section.append(message);
    return {
      title: 'Youming Tao (陶又铭) — Publications',
      description: 'Publications by Youming Tao.', page: 'publications',
      main: section.outerHTML,
      toc: element(document, 'a', 'Publications', {
        class: 'toc-link toc-heading', href: '#publications'
      }).outerHTML
    };
  }

  function installDocument() {
    let page;
    const main = document.querySelector('#main');
    const toc = document.querySelector('.toc-links');
    try {
      page = {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || 'Publications by Youming Tao.',
        page: 'publications', ...enhance(main, toc)
      };
    } catch (error) {
      console.error('[Publications] Unable to enhance publications.html:', error);
      page = statusPage(true);
      if (main) main.innerHTML = page.main;
      if (toc) toc.innerHTML = page.toc;
    }
    publish(page);
    window.publicationsReady = Promise.resolve(page);
    if (new URL(location.href).searchParams.get('publication-source') === '1' && window.parent !== window) {
      window.parent.postMessage({type: MESSAGE, page}, '*');
    }
  }

  function loadDocument() {
    publish(statusPage());
    window.publicationsReady = new Promise(resolve => {
      const frame = element(document, 'iframe', undefined, {
        hidden: '', title: 'Publication content', 'aria-hidden': 'true', tabindex: '-1'
      });
      const url = new URL(PAGE, document.baseURI);
      url.search = '';
      url.searchParams.set('publication-source', '1');
      url.hash = '';
      frame.src = url.href;
      let settled = false;
      let timeout;
      function finish(page) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        window.removeEventListener('message', receive);
        frame.removeEventListener('error', failed);
        frame.remove();
        resolve(publish(page));
      }
      function failed() {
        console.warn('[Publications] Unable to load publications.html.');
        finish(statusPage(true));
      }
      function receive(event) {
        if (event.source !== frame.contentWindow || event.data?.type !== MESSAGE) return;
        const page = event.data.page;
        if (!page || page.page !== 'publications' ||
            !['title', 'description', 'main', 'toc'].every(key => typeof page[key] === 'string')) return;
        finish(page);
      }
      window.addEventListener('message', receive);
      frame.addEventListener('error', failed);
      timeout = setTimeout(failed, 10000);
      document.body.append(frame);
    });
  }

  window.publicationsRenderer = Object.freeze({enhance});
  if (document.body?.dataset.page === 'publications') installDocument();
  else loadDocument();
})();
