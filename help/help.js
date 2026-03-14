/* ============================================================
   Help Book — Logic
   ============================================================ */

(function () {
  'use strict';

  var config = null;
  var chapters = [];      // flat list of { id, title, file }
  var chapterTexts = {};  // id → raw markdown text (for search)
  var currentId = null;
  var activeNavEl = null; // cached active sidebar element

  // ─── DOM refs ──────────────────────────────────────────────

  var $title    = document.querySelector('.help-title');
  var $nav      = document.querySelector('.help-nav');
  var $article  = document.querySelector('.help-article');
  var $toc      = document.querySelector('.help-toc-bar');
  var $footer   = document.querySelector('.help-footer');
  var $sidebar  = document.querySelector('.help-sidebar');
  var $overlay  = document.querySelector('.help-sidebar-overlay');
  var $toggle   = document.querySelector('.help-sidebar-toggle');
  var $theme    = document.querySelector('.help-theme-toggle');
  var $search   = document.querySelector('.help-search');
  var $results  = document.querySelector('.help-search-results');

  // ─── Init ──────────────────────────────────────────────────

  initTheme();
  configureMarked();
  loadConfig();

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
      .then(function (r) { return r.json(); })
      .then(function (data) {
        config = data;
        if (config.accent) {
          document.documentElement.style.setProperty('--help-accent', config.accent);
        }
        $title.textContent = config.title || 'Help';
        document.title = config.title || 'Help';
        buildNav(config.chapters, $nav);
        flattenChapters(config.chapters);
        preloadChapters();
        navigateFromHash();
        $footer.innerHTML = 'made by <a href="https://leminkozey.me" target="_blank">leminkozey</a>' +
          (config.version ? ' &middot; ' + escapeHtml(config.version) : '');
      })
      .catch(function () {
        $article.innerHTML = '<p>Failed to load chapters.json</p>';
      });
  }

  // ─── Build Sidebar Nav ─────────────────────────────────────

  function buildNav(items, parent) {
    items.forEach(function (item) {
      var li = document.createElement('li');

      if (item.children && item.children.length > 0) {
        var btn = document.createElement('button');
        btn.className = 'help-nav-item help-nav-group-toggle';
        btn.innerHTML = '<svg class="chevron" width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4 2l4 4-4 4"/></svg> ' + escapeHtml(item.title);
        if (item.file) btn.dataset.id = item.id;
        btn.addEventListener('click', function (e) {
          btn.classList.toggle('expanded');
          ul.classList.toggle('expanded');
          if (item.file && !e.target.closest('.chevron')) {
            navigate(item.id);
          }
        });
        li.appendChild(btn);

        var ul = document.createElement('ul');
        ul.className = 'help-nav-children';
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

  // ─── Flatten chapters for ordering ─────────────────────────

  function flattenChapters(items) {
    items.forEach(function (item) {
      if (item.file) {
        chapters.push({ id: item.id, title: item.title, file: item.file });
      }
      if (item.children) {
        flattenChapters(item.children);
      }
    });
  }

  // ─── Preload chapter texts for search ──────────────────────

  function preloadChapters() {
    chapters.forEach(function (ch) {
      fetch(ch.file)
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (text) { chapterTexts[ch.id] = text; });
    });
  }

  // ─── Navigation ────────────────────────────────────────────

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

    currentId = id;
    window.location.hash = id;
    closeSidebar();
    setActiveNav(id);

    var cached = chapterTexts[id];
    var promise = cached
      ? Promise.resolve(cached)
      : fetch(ch.file)
          .then(function (r) { return r.ok ? r.text() : '# Not Found'; });

    promise
      .then(function (md) {
        chapterTexts[id] = md;
        renderMarkdown(md);
        buildToc();
        buildPrevNext();
        window.scrollTo(0, 0);
      })
      .catch(function () {
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
      }
      parent = parent.parentElement.closest('.help-nav-children');
    }
  }

  function navigateFromHash() {
    var hash = window.location.hash.slice(1);
    if (hash && chapters.find(function (c) { return c.id === hash; })) {
      navigate(hash);
    } else if (chapters.length > 0) {
      navigate(chapters[0].id);
    }
  }

  window.addEventListener('hashchange', function () {
    var hash = window.location.hash.slice(1);
    if (hash !== currentId) navigateFromHash();
  });

  // ─── Markdown Rendering ────────────────────────────────────

  function renderMarkdown(md) {
    $article.innerHTML = marked.parse(md);

    // Add IDs to headings for TOC links (deduplicate)
    var usedIds = {};
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

    // Add copy buttons to code blocks
    var pres = $article.querySelectorAll('pre');
    pres.forEach(function (pre) {
      var btn = document.createElement('button');
      btn.className = 'help-copy-btn';
      btn.textContent = 'Copy';
      btn.addEventListener('click', function () {
        var code = pre.querySelector('code');
        var text = code ? code.textContent : pre.textContent;
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = 'Copied!';
          setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
        });
      });
      pre.appendChild(btn);
    });
  }

  // ─── Chapter TOC ───────────────────────────────────────────

  var tocObserver = null;
  var tocLinks = [];  // cached for scroll spy
  var tocLinkMap = {}; // id → link element for O(1) scroll spy lookup
  var activeTocLink = null;
  var scrollSpyLocked = false;

  var STICKY_OFFSET = 92; // header (56) + toc bar (36)

  function buildToc() {
    if (tocObserver) { tocObserver.disconnect(); tocObserver = null; }
    tocLinks = [];
    tocLinkMap = {};
    activeTocLink = null;
    scrollSpyLocked = false;

    var headings = $article.querySelectorAll('h2');
    if (headings.length < 2) {
      $toc.classList.remove('active');
      $toc.innerHTML = '';
      return;
    }

    var inner = document.createElement('div');
    inner.className = 'help-toc-bar-inner';
    headings.forEach(function (h) {
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.innerHTML = '<span class="toc-dot"></span>' + escapeHtml(h.textContent);
      a.addEventListener('click', function (e) {
        e.preventDefault();
        setActiveTocLink(a);
        scrollToHeading(h.id);
      });
      inner.appendChild(a);
      tocLinks.push(a);
      tocLinkMap[h.id] = a;
    });

    $toc.innerHTML = '';
    $toc.appendChild(inner);
    $toc.classList.add('active');

    initScrollSpy(headings);
  }

  function scrollToHeading(id) {
    var target = document.getElementById(id);
    if (!target) return;
    // Lock scroll spy during programmatic scroll to prevent flickering
    scrollSpyLocked = true;
    var top = target.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET - 8;
    window.scrollTo({ top: top, behavior: 'smooth' });
    setTimeout(function () { scrollSpyLocked = false; }, 600);
  }

  function setActiveTocLink(link) {
    if (activeTocLink === link) return;
    if (activeTocLink) activeTocLink.classList.remove('active');
    link.classList.add('active');
    activeTocLink = link;

    // Only scroll bar if link is not fully visible
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
  }

  // ─── Prev / Next ───────────────────────────────────────────

  function buildPrevNext() {
    var old = document.querySelector('.help-prev-next');
    if (old) old.remove();

    var idx = chapters.findIndex(function (c) { return c.id === currentId; });
    var html = '';

    if (idx > 0) {
      var prev = chapters[idx - 1];
      html += '<a href="#' + prev.id + '" class="prev"><span class="prev-label">Previous</span><br>' + escapeHtml(prev.title) + '</a>';
    }

    if (idx < chapters.length - 1) {
      var next = chapters[idx + 1];
      html += '<a href="#' + next.id + '" class="next"><span class="next-label">Next</span><br>' + escapeHtml(next.title) + '</a>';
    }

    if (html) {
      var nav = document.createElement('div');
      nav.className = 'help-prev-next';
      nav.innerHTML = html;
      $article.after(nav);
    }
  }

  // ─── Search ────────────────────────────────────────────────

  var searchTimeout = null;

  $search.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    var q = $search.value.trim().toLowerCase();
    if (q.length < 2) {
      $results.classList.remove('active');
      $results.innerHTML = '';
      return;
    }
    searchTimeout = setTimeout(function () { performSearch(q); }, 150);
  });

  $search.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      $search.value = '';
      $results.classList.remove('active');
    }
  });

  // Close search on outside click
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.help-search-wrapper')) {
      $results.classList.remove('active');
    }
  });

  // Event delegation for search results
  $results.addEventListener('click', function (e) {
    var result = e.target.closest('.help-search-result');
    if (!result) return;
    e.preventDefault();
    var id = result.getAttribute('href').slice(1);
    $search.value = '';
    $results.classList.remove('active');
    navigate(id);
  });

  function performSearch(query) {
    var results = [];

    chapters.forEach(function (ch) {
      var text = chapterTexts[ch.id] || '';
      var lower = text.toLowerCase();
      var idx = lower.indexOf(query);
      if (idx === -1) return;

      var start = Math.max(0, idx - 40);
      var end = Math.min(text.length, idx + query.length + 60);
      var snippet = (start > 0 ? '...' : '') +
        text.substring(start, end).replace(/\n/g, ' ') +
        (end < text.length ? '...' : '');

      var escaped = escapeHtml(snippet);
      var re = new RegExp('(' + escapeRegex(escapeHtml(query)) + ')', 'gi');
      escaped = escaped.replace(re, '<mark>$1</mark>');

      results.push({ id: ch.id, title: ch.title, snippet: escaped });
    });

    if (results.length === 0) {
      $results.innerHTML = '<div class="help-search-empty">No results found</div>';
    } else {
      $results.innerHTML = results.slice(0, 10).map(function (r) {
        return '<a class="help-search-result" href="#' + r.id + '">' +
          '<div class="help-search-result-title">' + escapeHtml(r.title) + '</div>' +
          '<div class="help-search-result-snippet">' + r.snippet + '</div></a>';
      }).join('');
    }

    $results.classList.add('active');
  }

  // ─── Sidebar Toggle (Mobile) ───────────────────────────────

  $toggle.addEventListener('click', function () {
    $sidebar.classList.toggle('open');
  });

  $overlay.addEventListener('click', closeSidebar);

  function closeSidebar() {
    $sidebar.classList.remove('open');
  }

  // ─── Theme Toggle ─────────────────────────────────────────

  function setHljsTheme(dark) {
    var light = document.getElementById('hljs-light');
    var darkSheet = document.getElementById('hljs-dark');
    if (light) light.disabled = dark;
    if (darkSheet) darkSheet.disabled = !dark;
  }

  function initTheme() {
    var saved = localStorage.getItem('help-theme');
    var dark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    setHljsTheme(dark);
  }

  $theme.addEventListener('click', function () {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('help-theme', 'light');
      setHljsTheme(false);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('help-theme', 'dark');
      setHljsTheme(true);
    }
  });

  // ─── Keyboard Shortcuts ────────────────────────────────────

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      $search.focus();
    }
  });

  // ─── Helpers ───────────────────────────────────────────────

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

})();
