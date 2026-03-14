/* ============================================================
   Help Book — Logic
   ============================================================ */

(function () {
  'use strict';

  var config = null;
  var chapters = [];      // flat list of { id, title, file, parentId }
  var chapterTexts = {};  // id → raw markdown text (for search)
  var currentId = null;

  // ─── DOM refs ──────────────────────────────────────────────

  var $title    = document.querySelector('.help-title');
  var $nav      = document.querySelector('.help-nav');
  var $article  = document.querySelector('.help-article');
  var $toc      = document.querySelector('.help-toc');
  var $footer   = document.querySelector('.help-footer');
  var $sidebar  = document.querySelector('.help-sidebar');
  var $overlay  = document.querySelector('.help-sidebar-overlay');
  var $toggle   = document.querySelector('.help-sidebar-toggle');
  var $theme    = document.querySelector('.help-theme-toggle');
  var $search   = document.querySelector('.help-search');
  var $results  = document.querySelector('.help-search-results');

  // ─── Init ──────────────────────────────────────────────────

  initTheme();
  loadConfig();

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
        buildNav(config.chapters, $nav, null);
        flattenChapters(config.chapters, null);
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

  function buildNav(items, parent, parentId) {
    items.forEach(function (item) {
      var li = document.createElement('li');

      if (item.children && item.children.length > 0) {
        // Group with children
        var btn = document.createElement('button');
        btn.className = 'help-nav-item help-nav-group-toggle';
        btn.innerHTML = '<svg class="chevron" width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4 2l4 4-4 4"/></svg> ' + escapeHtml(item.title);
        btn.addEventListener('click', function () {
          btn.classList.toggle('expanded');
          ul.classList.toggle('expanded');
        });
        li.appendChild(btn);

        // If group itself has a file, make the title clickable to load it
        if (item.file) {
          btn.dataset.id = item.id;
          btn.addEventListener('click', function () {
            navigate(item.id);
          });
        }

        var ul = document.createElement('ul');
        ul.className = 'help-nav-children';
        buildNav(item.children, ul, item.id);
        li.appendChild(ul);
      } else {
        // Leaf chapter
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

  function flattenChapters(items, parentId) {
    items.forEach(function (item) {
      if (item.file) {
        chapters.push({ id: item.id, title: item.title, file: item.file, parentId: parentId });
      }
      if (item.children) {
        flattenChapters(item.children, item.id);
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

  function navigate(id) {
    var ch = chapters.find(function (c) { return c.id === id; });
    if (!ch) {
      if (chapters.length > 0) navigate(chapters[0].id);
      return;
    }

    currentId = id;
    window.location.hash = id;
    closeSidebar();

    // Highlight active nav item
    var navItems = $nav.querySelectorAll('.help-nav-item');
    navItems.forEach(function (el) { el.classList.remove('active'); });
    var active = $nav.querySelector('[data-id="' + id + '"]');
    if (active) {
      active.classList.add('active');
      // Expand parent groups
      expandParents(active);
    }

    // Load and render
    fetch(ch.file)
      .then(function (r) { return r.ok ? r.text() : '# Not Found'; })
      .then(function (md) {
        chapterTexts[id] = md;
        renderMarkdown(md);
        buildToc();
        buildPrevNext();
        $article.scrollTop = 0;
        window.scrollTo(0, 0);
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

    $article.innerHTML = marked.parse(md);

    // Add IDs to headings for TOC links
    var headings = $article.querySelectorAll('h1, h2, h3, h4');
    headings.forEach(function (h) {
      if (!h.id) {
        h.id = h.textContent
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }
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

  function buildToc() {
    var headings = $article.querySelectorAll('h2, h3, h4');
    if (headings.length < 2) {
      $toc.classList.remove('active');
      return;
    }

    var html = '<div class="help-toc-title">On this page</div><ul class="help-toc-list">';
    headings.forEach(function (h) {
      var tag = h.tagName.toLowerCase();
      html += '<li class="toc-' + tag + '"><a href="#' + h.id + '">' + escapeHtml(h.textContent) + '</a></li>';
    });
    html += '</ul>';

    $toc.innerHTML = html;
    $toc.classList.add('active');

    // TOC link clicks
    $toc.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.getElementById(a.getAttribute('href').slice(1));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    // Scroll spy
    initScrollSpy(headings);
  }

  function initScrollSpy(headings) {
    var tocLinks = $toc.querySelectorAll('a');
    if (!tocLinks.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          tocLinks.forEach(function (a) { a.classList.remove('active'); });
          var link = $toc.querySelector('a[href="#' + entry.target.id + '"]');
          if (link) link.classList.add('active');
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });

    headings.forEach(function (h) { observer.observe(h); });
  }

  // ─── Prev / Next ───────────────────────────────────────────

  function buildPrevNext() {
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

      // Remove old prev/next if exists
      var existing = document.querySelectorAll('.help-prev-next');
      if (existing.length > 1) existing[0].remove();
    } else {
      var old = document.querySelector('.help-prev-next');
      if (old) old.remove();
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

  function performSearch(query) {
    var results = [];

    chapters.forEach(function (ch) {
      var text = chapterTexts[ch.id] || '';
      var lower = text.toLowerCase();
      var idx = lower.indexOf(query);
      if (idx === -1) return;

      // Extract snippet around match
      var start = Math.max(0, idx - 40);
      var end = Math.min(text.length, idx + query.length + 60);
      var snippet = (start > 0 ? '...' : '') +
        text.substring(start, end).replace(/\n/g, ' ') +
        (end < text.length ? '...' : '');

      // Highlight match in snippet
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

      $results.querySelectorAll('.help-search-result').forEach(function (el) {
        el.addEventListener('click', function (e) {
          e.preventDefault();
          var id = el.getAttribute('href').slice(1);
          $search.value = '';
          $results.classList.remove('active');
          navigate(id);
        });
      });
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

  function initTheme() {
    var saved = localStorage.getItem('help-theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }

  $theme.addEventListener('click', function () {
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('help-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('help-theme', 'dark');
    }
  });

  // ─── Keyboard Shortcuts ────────────────────────────────────

  document.addEventListener('keydown', function (e) {
    // Ctrl/Cmd + K → focus search
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
