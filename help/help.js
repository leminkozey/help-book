(function () {
  'use strict';

  var chapters = [];
  // hold full markdown for every chapter — search needs full text, dropping would force re-fetches
  var chapterTexts = Object.create(null);
  var currentId = null;
  var chaptersReady = false;
  var activeNavEl = null;
  var scrollHeadingTimer = null;

  var $title    = document.querySelector('.help-title');
  var $nav      = document.querySelector('.help-nav');
  var $article  = document.querySelector('.help-article');
  var $toc      = document.querySelector('.help-toc-bar');
  var $tocMobile     = document.querySelector('.help-toc-mobile');
  var $tocMobileList = document.querySelector('.help-toc-mobile-list');
  var $footer   = document.querySelector('.help-footer');
  var $sidebar  = document.querySelector('.help-sidebar');
  var $overlay  = document.querySelector('.help-sidebar-overlay');
  var $toggle   = document.querySelector('.help-sidebar-toggle');
  var $theme    = document.querySelector('.help-theme-toggle');
  var $search   = document.querySelector('.help-search');
  var $results  = document.querySelector('.help-search-results');
  var $main     = document.querySelector('main');

  initTheme();
  configureMarked();
  loadConfig();
  initArticleDelegation();
  initTocDelegation();

  function configureMarked() {
    marked.setOptions({
      highlight: function (code, lang) {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      },
      breaks: false,
      gfm: true,
    });
  }

  function loadConfig() {
    fetch('chapters.json')
      .then(function (r) {
        if (!r.ok) throw new Error('Failed to load chapters.json');
        return r.json();
      })
      .then(function (data) {
        if (data.accent && /^#[0-9a-f]{3,8}$|^(rgb|hsl|oklch)\(/i.test(data.accent)) {
          document.documentElement.style.setProperty('--help-accent', data.accent);
        }
        $title.textContent = data.title || 'Help';
        document.title = data.title || 'Help';
        buildNav(data.chapters, $nav);
        flattenChapters(data.chapters);
        preloadChapters();
        navigateFromHash();
        $footer.innerHTML = 'made by <a href="https://leminkozey.me" target="_blank" rel="noopener noreferrer">leminkozey</a>' +
          (data.version ? ' &middot; ' + escapeHtml(data.version) : '');
      })
      .catch(function () {
        $article.innerHTML = '<p>Failed to load chapters.json</p>';
      });
  }

  function buildNav(items, parent) {
    items.forEach(function (item) {
      var li = document.createElement('li');

      if (item.children && item.children.length > 0) {
        var btn = document.createElement('button');
        btn.className = 'help-nav-item help-nav-group-toggle';
        btn.setAttribute('aria-expanded', 'false');
        btn.innerHTML = '<svg class="chevron" width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4 2l4 4-4 4"/></svg> ' + escapeHtml(item.title);
        if (item.file) btn.dataset.id = item.id;
        var ul = document.createElement('ul');
        ul.className = 'help-nav-children';
        btn.addEventListener('click', function (e) {
          var clickedChevron = !!e.target.closest('.chevron');
          if (clickedChevron || !item.file) {
            var expanded = btn.classList.toggle('expanded');
            ul.classList.toggle('expanded');
            btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
          } else {
            btn.classList.add('expanded');
            ul.classList.add('expanded');
            btn.setAttribute('aria-expanded', 'true');
            navigate(item.id);
          }
        });
        li.appendChild(btn);

        buildNav(item.children, ul);
        li.appendChild(ul);
      } else {
        var a = document.createElement('a');
        a.className = 'help-nav-item';
        a.href = '#' + item.id;
        a.textContent = item.title;
        a.dataset.id = item.id;
        a.addEventListener('click', function (e) {
          e.preventDefault();
          navigate(item.id);
        });
        li.appendChild(a);
      }

      parent.appendChild(li);
    });
  }

  function flattenChapters(items) {
    items.forEach(function (item) {
      if (item.file && isSafeChapterFile(item.file)) {
        chapters.push({ id: item.id, title: item.title, file: item.file });
      }
      if (item.children) {
        flattenChapters(item.children);
      }
    });
  }

  function isSafeChapterFile(file) {
    if (typeof file !== 'string') return false;
    if (!/^[\w./-]+\.md$/.test(file)) return false;
    // reject path traversal escaping the docs root
    var parts = file.split('/');
    var depth = 0;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === '' || p === '.') continue;
      if (p === '..') { depth--; if (depth < 0) return false; }
      else depth++;
    }
    return true;
  }

  function preloadChapters() {
    var promises = chapters.map(function (ch) {
      return fetch(ch.file)
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (text) { chapterTexts[ch.id] = text; })
        .catch(function () { chapterTexts[ch.id] = ''; });
    });
    Promise.all(promises).then(function () { chaptersReady = true; });
  }

  function setActiveNav(id) {
    if (activeNavEl) activeNavEl.classList.remove('active');
    var el = $nav.querySelector('[data-id="' + CSS.escape(id) + '"]');
    if (el) {
      el.classList.add('active');
      expandParents(el);
      activeNavEl = el;
    }
  }

  function navigate(id) {
    var ch = chapters.find(function (c) { return c.id === id; });
    if (!ch) {
      if (chapters.length > 0) navigate(chapters[0].id);
      return;
    }

    // set currentId before hash update so hashchange handler can bail without redundant fetch
    currentId = id;
    if (window.location.hash.slice(1) !== id) {
      window.location.hash = id;
    }
    closeSidebar();
    setActiveNav(id);

    var navId = id; // race guard: snapshot for stale-fetch detection below
    var cached = chapterTexts[id];
    var promise = cached
      ? Promise.resolve(cached)
      : fetch(ch.file)
          .then(function (r) { return r.ok ? r.text() : '# Not Found'; });

    promise
      .then(function (md) {
        // bail if user navigated elsewhere while fetch was in flight
        if (navId !== currentId) return;
        chapterTexts[id] = md;
        // must lock before programmatic scroll, else IntersectionObserver flips active H2 mid-render
        scrollSpyLocked = true;
        renderMarkdown(md);
        buildToc();
        buildPrevNext();
        window.scrollTo(0, 0);
        // re-apply find highlights in the freshly rendered chapter (cross-chapter jump)
        if (lastQueryRaw && lastQueryRaw.length >= 2) {
          applyFindHighlights(lastQueryRaw);
          if (pendingFindAfterRender && findMarks.length) {
            pendingFindAfterRender = false;
            requestAnimationFrame(function () { gotoMatch(0); });
          } else {
            pendingFindAfterRender = false;
          }
          if ($results.classList.contains('active')) updateFindCounter();
        }
        if ($main && typeof $main.focus === 'function') {
          $main.focus({ preventScroll: true });
        }
      })
      .catch(function () {
        if (navId !== currentId) return;
        $article.innerHTML = '<p>Failed to load chapter.</p>';
      });
  }

  function expandParents(el) {
    var parent = el.closest('.help-nav-children');
    while (parent) {
      parent.classList.add('expanded');
      var toggle = parent.previousElementSibling;
      if (toggle && toggle.classList.contains('help-nav-group-toggle')) {
        toggle.classList.add('expanded');
        toggle.setAttribute('aria-expanded', 'true');
      }
      parent = parent.parentElement.closest('.help-nav-children');
    }
  }

  function navigateFromHash() {
    var hash = window.location.hash.slice(1);
    try { hash = decodeURIComponent(hash); } catch (e) { /* leave raw */ }
    if (hash && chapters.find(function (c) { return c.id === hash; })) {
      navigate(hash);
    } else if (chapters.length > 0) {
      navigate(chapters[0].id);
    }
  }

  window.addEventListener('hashchange', function () {
    var hash = window.location.hash.slice(1);
    try { hash = decodeURIComponent(hash); } catch (e) { /* leave raw */ }
    if (hash !== currentId) navigateFromHash();
  });

  function renderMarkdown(md) {
    var clean = DOMPurify.sanitize(marked.parse(md), {
      ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel|#|\/|\.\/|\.\.\/)/i,
      FORBID_TAGS: ['svg', 'math', 'form', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['style'],
      ADD_ATTR: ['target', 'rel'],
    });
    $article.innerHTML = clean;

    // todo: demote first H1 to H2 (multiple H1s per SPA view) — skipped, chapter css targets h1 explicitly
    var usedIds = Object.create(null);
    var headings = $article.querySelectorAll('h1, h2, h3, h4');
    headings.forEach(function (h) {
      if (!h.id) {
        var base = h.textContent
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        var id = base;
        var n = 1;
        while (usedIds[id]) { id = base + '-' + n++; }
        h.id = id;
      }
      usedIds[h.id] = true;
    });

    // click handler is delegated on $article, see initArticleDelegation
    var pres = $article.querySelectorAll('pre');
    pres.forEach(function (pre) {
      var btn = document.createElement('button');
      btn.className = 'help-copy-btn';
      btn.type = 'button';
      btn.textContent = 'Copy';
      pre.appendChild(btn);
    });
  }

  function initArticleDelegation() {
    if (!$article) return;
    $article.addEventListener('click', function (e) {
      var btn = e.target.closest('.help-copy-btn');
      if (!btn || !$article.contains(btn)) return;
      var pre = btn.closest('pre');
      if (!pre) return;
      var code = pre.querySelector('code');
      var text = code ? code.textContent : pre.textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = 'Copied!';
          setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
        });
      }
    });
  }

  var tocObserver = null;
  var tocLinks = [];
  var tocLinkMap = Object.create(null); // O(1) lookup for scroll spy
  var activeTocLink = null;
  var scrollSpyLocked = false;

  var STICKY_OFFSET = 56;
  var HEADER_HEIGHT = 56;

  function buildToc() {
    if (tocObserver) { tocObserver.disconnect(); tocObserver = null; }
    tocLinks = [];
    tocLinkMap = Object.create(null);
    activeTocLink = null;

    var headings = $article.querySelectorAll('h2');
    if (headings.length < 2) {
      $toc.classList.remove('active');
      $toc.innerHTML = '';
      if ($tocMobile) $tocMobile.hidden = true;
      if ($tocMobileList) $tocMobileList.innerHTML = '';
      // release lock that navigate() set, since initScrollSpy() won't run to release it
      requestAnimationFrame(function () { scrollSpyLocked = false; });
      return;
    }

    var inner = document.createElement('div');
    inner.className = 'help-toc-bar-inner';
    if ($tocMobileList) $tocMobileList.innerHTML = '';
    headings.forEach(function (h) {
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.dataset.headingId = h.id;
      a.innerHTML = '<span class="toc-dot"></span>' + escapeHtml(h.textContent);
      inner.appendChild(a);
      tocLinks.push(a);
      tocLinkMap[h.id] = a;

      if ($tocMobileList) {
        var li = document.createElement('li');
        var mobileLink = document.createElement('a');
        mobileLink.href = '#' + h.id;
        mobileLink.dataset.headingId = h.id;
        mobileLink.textContent = h.textContent;
        li.appendChild(mobileLink);
        $tocMobileList.appendChild(li);
      }
    });

    $toc.innerHTML = '';
    $toc.appendChild(inner);
    $toc.classList.add('active');
    if ($tocMobile) $tocMobile.hidden = false;

    initScrollSpy(headings);
  }

  function initTocDelegation() {
    if ($toc) {
      $toc.addEventListener('click', function (e) {
        var a = e.target.closest('a[data-heading-id]');
        if (!a || !$toc.contains(a)) return;
        e.preventDefault();
        setActiveTocLink(a);
        scrollToHeading(a.dataset.headingId);
      });
    }
    if ($tocMobileList) {
      $tocMobileList.addEventListener('click', function (e) {
        var a = e.target.closest('a[data-heading-id]');
        if (!a) return;
        e.preventDefault();
        var headingId = a.dataset.headingId;
        var headerLink = tocLinkMap[headingId];
        if (headerLink) setActiveTocLink(headerLink);
        scrollToHeading(headingId);
        if ($tocMobile) $tocMobile.open = false;
      });
    }
  }

  function scrollToHeading(id) {
    var target = document.getElementById(id);
    if (!target) return;
    // lock during programmatic scroll to prevent active-link flicker
    scrollSpyLocked = true;
    if (scrollHeadingTimer) clearTimeout(scrollHeadingTimer);
    var top = target.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT - 16;
    window.scrollTo({ top: top, behavior: 'smooth' });
    scrollHeadingTimer = setTimeout(function () {
      scrollSpyLocked = false;
      scrollHeadingTimer = null;
    }, 600);
  }

  function setActiveTocLink(link) {
    if (activeTocLink === link) return;
    if (activeTocLink) activeTocLink.classList.remove('active');
    link.classList.add('active');
    activeTocLink = link;

    // only scroll bar when link not fully visible
    var barRect = $toc.getBoundingClientRect();
    var linkRect = link.getBoundingClientRect();
    if (linkRect.left < barRect.left || linkRect.right > barRect.right) {
      var offset = linkRect.left - barRect.left - (barRect.width / 2) + (linkRect.width / 2);
      $toc.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }

  function initScrollSpy(headings) {
    if (!tocLinks.length) return;

    tocObserver = new IntersectionObserver(function (entries) {
      if (scrollSpyLocked) return;
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var link = tocLinkMap[entry.target.id];
          if (link) setActiveTocLink(link);
        }
      });
    }, { rootMargin: '-' + STICKY_OFFSET + 'px 0px -60% 0px' });

    headings.forEach(function (h) { tocObserver.observe(h); });

    // double-rAF: release lock from navigate() only after layout settles post scrollTo(0,0)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { scrollSpyLocked = false; });
    });
  }

  function buildPrevNext() {
    var old = document.querySelector('.help-prev-next');
    if (old) old.remove();

    var idx = chapters.findIndex(function (c) { return c.id === currentId; });
    var html = '';

    if (idx > 0) {
      var prev = chapters[idx - 1];
      html += '<a href="#' + encodeURIComponent(prev.id) + '" class="prev"><span class="prev-label">Previous</span><br>' + escapeHtml(prev.title) + '</a>';
    }

    if (idx < chapters.length - 1) {
      var next = chapters[idx + 1];
      html += '<a href="#' + encodeURIComponent(next.id) + '" class="next"><span class="next-label">Next</span><br>' + escapeHtml(next.title) + '</a>';
    }

    if (html) {
      var nav = document.createElement('div');
      nav.className = 'help-prev-next';
      nav.innerHTML = html;
      $article.after(nav);
    }
  }

  var searchTimeout = null;
  // in-page find state
  var findMarks = [];          // <mark> nodes in render order
  var currentMatchIdx = -1;    // active index into findMarks
  var lastQueryRaw = '';       // last query as typed (preserves case for re-apply)
  var pendingFindAfterRender = false; // re-apply highlights after navigate() renders
  // skip text inside these containers when wrapping matches
  var FIND_SKIP_SELECTOR = 'mark, .help-heading-anchor, .help-copy-btn';

  $search.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    var raw = $search.value;
    if (raw.length > 200) raw = raw.slice(0, 200);
    lastQueryRaw = raw.trim();
    var q = lastQueryRaw.toLocaleLowerCase('de');
    if (q.length < 2) {
      clearFindHighlights();
      $results.classList.remove('active');
      $results.innerHTML = '';
      return;
    }
    if (!chaptersReady) {
      clearFindHighlights();
      $results.innerHTML = '<div class="help-search-empty">Indexing…</div>';
      $results.classList.add('active');
      return;
    }
    // immediate in-page highlight feels responsive, cross-chapter list can debounce
    applyFindHighlights(lastQueryRaw);
    searchTimeout = setTimeout(function () { performSearch(q); }, 150);
  });

  $search.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeFind();
      $search.blur();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!findMarks.length) return;
      if (e.shiftKey) gotoMatch(currentMatchIdx - 1);
      else gotoMatch(currentMatchIdx + 1);
    }
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('.help-search-wrapper')) return;
    if (e.target.closest('.help-find-mark')) return;
    // click outside: close popup AND clear highlights (per spec)
    closeFind();
  });

  $results.addEventListener('click', function (e) {
    // nav buttons inside the "auf dieser seite" counter
    var navBtn = e.target.closest('[data-find-nav]');
    if (navBtn) {
      e.preventDefault();
      if (!findMarks.length) return;
      if (navBtn.dataset.findNav === 'prev') gotoMatch(currentMatchIdx - 1);
      else gotoMatch(currentMatchIdx + 1);
      return;
    }

    var result = e.target.closest('.help-search-result');
    if (!result) return;
    e.preventDefault();
    var id = result.getAttribute('href').slice(1);
    // keep the query, re-apply highlights after the new chapter renders
    if (id !== currentId) {
      pendingFindAfterRender = true;
      navigate(id);
    } else {
      // already here — just jump to first match
      if (findMarks.length) gotoMatch(0);
    }
  });

  function closeFind() {
    $search.value = '';
    lastQueryRaw = '';
    pendingFindAfterRender = false;
    $results.classList.remove('active');
    $results.innerHTML = '';
    clearFindHighlights();
  }

  // walk text nodes inside $article and wrap matches of query (case-insensitive)
  // in <mark class="help-find-mark">. skips pre/code/anchor blocks.
  function applyFindHighlights(rawQuery) {
    clearFindHighlights();
    if (!rawQuery || rawQuery.length < 2 || !$article) return;
    var qLower = rawQuery.toLocaleLowerCase('de');
    var qLen = rawQuery.length;

    var walker = document.createTreeWalker($article, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        var p = node.parentNode;
        while (p && p !== $article) {
          if (p.nodeType === 1 && p.matches && p.matches(FIND_SKIP_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
          p = p.parentNode;
        }
        // cheap reject: only wrap if the text actually contains the query
        if (node.nodeValue.toLocaleLowerCase('de').indexOf(qLower) === -1) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    var hits = [];
    var n;
    while ((n = walker.nextNode())) hits.push(n);

    hits.forEach(function (textNode) {
      var text = textNode.nodeValue;
      var lower = text.toLocaleLowerCase('de');
      var frag = document.createDocumentFragment();
      var last = 0;
      var idx = lower.indexOf(qLower);
      while (idx !== -1) {
        if (idx > last) frag.appendChild(document.createTextNode(text.slice(last, idx)));
        var mark = document.createElement('mark');
        mark.className = 'help-find-mark';
        // preserve original casing from the source text
        mark.textContent = text.slice(idx, idx + qLen);
        frag.appendChild(mark);
        findMarks.push(mark);
        last = idx + qLen;
        idx = lower.indexOf(qLower, last);
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      textNode.parentNode.replaceChild(frag, textNode);
    });

    currentMatchIdx = -1;
  }

  function clearFindHighlights() {
    if (!findMarks.length) {
      currentMatchIdx = -1;
      return;
    }
    findMarks.forEach(function (mark) {
      var parent = mark.parentNode;
      if (!parent) return;
      // replace mark with its text content and merge with neighboring text nodes
      var textNode = document.createTextNode(mark.textContent);
      parent.replaceChild(textNode, mark);
      parent.normalize();
    });
    findMarks = [];
    currentMatchIdx = -1;
  }

  function gotoMatch(idx) {
    if (!findMarks.length) return;
    // wrap around
    if (idx < 0) idx = findMarks.length - 1;
    if (idx >= findMarks.length) idx = 0;
    if (currentMatchIdx >= 0 && findMarks[currentMatchIdx]) {
      findMarks[currentMatchIdx].classList.remove('help-find-mark--active');
    }
    currentMatchIdx = idx;
    var el = findMarks[idx];
    el.classList.add('help-find-mark--active');
    try {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (e) {
      el.scrollIntoView();
    }
    updateFindCounter();
  }

  function updateFindCounter() {
    var counter = $results.querySelector('[data-find-counter]');
    if (!counter) return;
    if (!findMarks.length) {
      counter.textContent = 'Keine Treffer hier';
    } else {
      counter.textContent = (currentMatchIdx + 1) + ' von ' + findMarks.length + ' auf dieser Seite';
    }
  }

  // strip the most disruptive markdown syntax so snippets read like plain text.
  // not a full parser — good enough for inline preview.
  function stripMarkdown(text) {
    return text
      .replace(/```[\s\S]*?```/g, ' ')           // fenced code blocks
      .replace(/`([^`]+)`/g, '$1')               // inline code
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')  // images → alt text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')   // links → label
      .replace(/^#{1,6}\s+/gm, '')               // heading markers
      .replace(/(\*\*|__)(.*?)\1/g, '$2')        // bold
      .replace(/(\*|_)(.*?)\1/g, '$2')           // italic
      .replace(/^\s*>\s?/gm, '')                 // blockquote
      .replace(/^\s*[-*+]\s+/gm, '')             // unordered list bullet
      .replace(/\s+/g, ' ')                      // collapse whitespace
      .trim();
  }

  function buildSnippet(text, query) {
    var clean = stripMarkdown(text);
    if (!clean) return null;
    var lower = clean.toLocaleLowerCase('de');
    var idx = lower.indexOf(query);
    if (idx === -1) return null;
    // ~120 chars centered on the match
    var pad = Math.max(0, Math.floor((120 - query.length) / 2));
    var start = Math.max(0, idx - pad);
    var end = Math.min(clean.length, idx + query.length + pad);
    return {
      before: (start > 0 ? '…' : '') + clean.substring(start, idx),
      match:  clean.substring(idx, idx + query.length),
      after:  clean.substring(idx + query.length, end) + (end < clean.length ? '…' : '')
    };
  }

  function buildPreview(text) {
    var clean = stripMarkdown(text);
    if (!clean) return '';
    if (clean.length <= 120) return clean;
    return clean.substring(0, 120) + '…';
  }

  // build the snippet element using text nodes + <mark>, so chapter content
  // never reaches the DOM as raw html.
  function renderSnippet(container, parts) {
    if (parts) {
      container.appendChild(document.createTextNode(parts.before));
      var mark = document.createElement('mark');
      mark.textContent = parts.match;
      container.appendChild(mark);
      container.appendChild(document.createTextNode(parts.after));
    }
  }

  function performSearch(query) {
    if (!chaptersReady) return;
    var results = [];

    chapters.forEach(function (ch) {
      // hide current chapter from "andere kapitel" — user is already here
      if (ch.id === currentId) return;
      var text = chapterTexts[ch.id] || '';
      var titleLower = (ch.title || '').toLocaleLowerCase('de');
      var bodyLower = text.toLocaleLowerCase('de');
      var titleMatch = titleLower.indexOf(query) !== -1;
      var bodyMatch = bodyLower.indexOf(query) !== -1;
      if (!titleMatch && !bodyMatch) return;

      var entry = { id: ch.id, title: ch.title, parts: null, preview: '' };
      if (bodyMatch) {
        entry.parts = buildSnippet(text, query);
      }
      if (!entry.parts) {
        // title-only hit or empty body — fall back to first chunk of content
        entry.preview = buildPreview(text);
      }
      results.push(entry);
    });

    $results.innerHTML = '';

    // top row: in-page counter + prev/next buttons
    var counterRow = document.createElement('div');
    counterRow.className = 'help-find-counter-row';
    var counter = document.createElement('span');
    counter.className = 'help-find-counter';
    counter.setAttribute('data-find-counter', '');
    counterRow.appendChild(counter);

    var navWrap = document.createElement('span');
    navWrap.className = 'help-find-nav';
    var prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'help-find-nav-btn';
    prevBtn.dataset.findNav = 'prev';
    prevBtn.setAttribute('aria-label', 'Vorheriger Treffer');
    prevBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3,8 6,4 9,8"/></svg>';
    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'help-find-nav-btn';
    nextBtn.dataset.findNav = 'next';
    nextBtn.setAttribute('aria-label', 'Naechster Treffer');
    nextBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3,4 6,8 9,4"/></svg>';
    navWrap.appendChild(prevBtn);
    navWrap.appendChild(nextBtn);
    counterRow.appendChild(navWrap);
    $results.appendChild(counterRow);
    updateFindCounter();

    // "andere kapitel" section
    if (results.length > 0) {
      var header = document.createElement('div');
      header.className = 'help-find-section-header';
      header.textContent = 'Andere Kapitel';
      $results.appendChild(header);

      results.slice(0, 10).forEach(function (r) {
        var a = document.createElement('a');
        a.className = 'help-search-result';
        a.href = '#' + encodeURIComponent(r.id);

        var title = document.createElement('div');
        title.className = 'help-search-result-title';
        title.textContent = r.title;
        a.appendChild(title);

        var snippet = document.createElement('div');
        snippet.className = 'help-search-result-snippet';
        if (r.parts) {
          renderSnippet(snippet, r.parts);
        } else {
          snippet.textContent = r.preview;
        }
        a.appendChild(snippet);

        $results.appendChild(a);
      });
    } else if (!findMarks.length) {
      // nothing here, nothing elsewhere
      var empty = document.createElement('div');
      empty.className = 'help-search-empty';
      empty.textContent = 'Keine Ergebnisse';
      $results.appendChild(empty);
    }

    $results.classList.add('active');
  }

  $toggle.addEventListener('click', function () {
    var open = $sidebar.classList.toggle('open');
    $toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  $overlay.addEventListener('click', closeSidebar);

  function closeSidebar() {
    $sidebar.classList.remove('open');
    if ($toggle) $toggle.setAttribute('aria-expanded', 'false');
  }

  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) closeSidebar();
  });

  function setHljsTheme(dark) {
    var light = document.getElementById('hljs-light');
    var darkSheet = document.getElementById('hljs-dark');
    if (light) light.disabled = dark;
    if (darkSheet) darkSheet.disabled = !dark;
  }

  function applyTheme(theme) {
    var dark = theme === 'dark';
    if (dark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    setHljsTheme(dark);
    if ($theme) $theme.setAttribute('aria-pressed', dark ? 'true' : 'false');
  }

  function initTheme() {
    var saved = localStorage.getItem('help-theme');
    var dark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    applyTheme(dark ? 'dark' : 'light');
  }

  $theme.addEventListener('click', function () {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var next = isDark ? 'light' : 'dark';
    localStorage.setItem('help-theme', next);
    applyTheme(next);
  });

  // follow OS only when user hasn't picked one explicitly
  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  if (mql && typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', function (e) {
      if (!localStorage.getItem('help-theme')) applyTheme(e.matches ? 'dark' : 'light');
    });
  }

  // cross-tab sync — newValue null means storage cleared, fall back to OS pref
  window.addEventListener('storage', function (e) {
    if (e.key !== 'help-theme') return;
    if (e.newValue === 'dark' || e.newValue === 'light') {
      applyTheme(e.newValue);
    } else {
      applyTheme(mql && mql.matches ? 'dark' : 'light');
    }
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      var t = e.target;
      // allow cmd+k from our own search input, skip when typing in other inputs
      if (t && t !== $search && t.matches && t.matches('input,textarea,[contenteditable],[contenteditable="true"]')) {
        return;
      }
      e.preventDefault();
      $search.focus();
    }
    if (e.key === 'Escape' && $sidebar && $sidebar.classList.contains('open')) {
      closeSidebar();
    }
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();
