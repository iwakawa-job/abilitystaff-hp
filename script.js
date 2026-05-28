document.addEventListener('DOMContentLoaded', function() {

  // ===== ページ管理 =====
  var pages = ['home','service','hrsupport','newgraduate','jobs','column','about','client','contact'];
  var currentPage = 'home';
  var isAnimating = false;

  function showPage(targetPage) {
    if (!targetPage || targetPage === currentPage || isAnimating) return;
    if (pages.indexOf(targetPage) === -1) return;
    isAnimating = true;

    var currentEl = document.getElementById('page-' + currentPage);
    var targetEl  = document.getElementById('page-' + targetPage);
    if (!currentEl || !targetEl) { isAnimating = false; return; }

    currentEl.style.transition = 'opacity 0.2s ease';
    currentEl.style.opacity = '0';

    setTimeout(function() {
      currentEl.style.display = 'none';
      currentEl.style.opacity = '';
      currentEl.style.transition = '';

      targetEl.style.opacity = '0';
      targetEl.style.display = 'block';
      targetEl.style.transition = 'opacity 0.25s ease';

      window.scrollTo(0, 0);

      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          targetEl.style.opacity = '1';
          setTimeout(function() {
            targetEl.style.opacity = '';
            targetEl.style.transition = '';
            currentPage = targetPage;
            isAnimating = false;
            updateNavActive();
            if (targetPage === 'column') loadNoteArticles();
            if (targetPage === 'jobs') initJobsPage();
          }, 270);
        });
      });
    }, 220);
  }

  function updateNavActive() {
    document.querySelectorAll('[data-page]').forEach(function(el) {
      el.classList.toggle('active', el.dataset.page === currentPage);
    });
  }

  // ===== リンクイベント =====
  document.addEventListener('click', function(e) {
    var link = e.target.closest('[data-page]');
    if (!link) return;
    e.preventDefault();
    document.getElementById('navMobile').classList.remove('open');
    showPage(link.dataset.page);
  });

  // ===== ハンバーガーメニュー =====
  var hamburger = document.getElementById('hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', function() {
      document.getElementById('navMobile').classList.toggle('open');
    });
  }

  // ===== 求人タブ切替 =====
  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.add('hidden'); });
      var target = document.getElementById('tab-' + tab.dataset.tab);
      if (target) target.classList.remove('hidden');
      if (tab.dataset.tab === 'all') initJobsPage();
    });
  });

  // ===== プレミアム「すべて見る」 =====
  var premiumMoreBtn = document.getElementById('premiumMoreBtn');
  if (premiumMoreBtn) {
    premiumMoreBtn.addEventListener('click', function() {
      var more = document.getElementById('premiumMore');
      var wrap = document.getElementById('premiumMoreWrap');
      if (more) more.classList.remove('hidden');
      if (wrap) wrap.style.display = 'none';
    });
  }

  // ===== 求人データ管理 =====
  var allJobs = [];
  var filteredJobs = [];
  var jobsLoaded = false;
  var PAGE_SIZE = 20;
  var currentJobPage = 1;

  function initJobsPage() {
    if (jobsLoaded) {
      renderJobs();
      return;
    }
    loadJobsFromDB();
  }

  function loadJobsFromDB() {
    var resultsEl = document.getElementById('jobsList');
    var countEl = document.getElementById('jobsCount');
    if (!resultsEl) return;

    resultsEl.innerHTML = '<div class="search-placeholder"><div class="search-placeholder-icon">⏳</div><p>求人データを読み込み中...</p></div>';
    if (countEl) countEl.textContent = '読み込み中...';

    fetch('/api/jobs')
      .then(function(res) { return res.json(); })
      .then(function(data) {
        allJobs = data;
        filteredJobs = data;
        jobsLoaded = true;
        currentJobPage = 1;
        buildFilterOptions(data);
        renderJobs();
      })
      .catch(function(err) {
        console.error('求人取得エラー:', err);
        resultsEl.innerHTML = '<div class="search-placeholder"><div class="search-placeholder-icon">⚠️</div><p>求人データの取得に失敗しました。</p></div>';
      });
  }

  // ===== 職種・エリアの選択肢をDBデータから動的生成 =====
  function buildFilterOptions(jobs) {
    // 職種
    var categories = [];
    jobs.forEach(function(j) {
      if (j.category && categories.indexOf(j.category) === -1) categories.push(j.category);
    });
    categories.sort();
    var catSel = document.getElementById('searchCategory');
    if (catSel) {
      catSel.innerHTML = '<option value="">すべての職種</option>';
      categories.forEach(function(c) {
        var opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        catSel.appendChild(opt);
      });
    }

    // 都道府県
    var prefectures = [];
    jobs.forEach(function(j) {
      (j.prefecture || '').split(',').forEach(function(p) {
        p = p.trim();
        if (p && prefectures.indexOf(p) === -1) prefectures.push(p);
      });
    });
    prefectures.sort();
    var prefSel = document.getElementById('searchArea');
    if (prefSel) {
      prefSel.innerHTML = '<option value="">すべての地域</option>';
      prefectures.forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        prefSel.appendChild(opt);
      });
    }
  }

  function applyFilter() {
    var category   = document.getElementById('searchCategory') ? document.getElementById('searchCategory').value : '';
    var area       = document.getElementById('searchArea') ? document.getElementById('searchArea').value : '';
    var employment = document.getElementById('searchEmployment') ? document.getElementById('searchEmployment').value : '';
    var tags = [];
    document.querySelectorAll('.tag-check input:checked').forEach(function(el) { tags.push(el.value); });
    var sortOrder  = document.getElementById('sortOrder') ? document.getElementById('sortOrder').value : 'new';

    filteredJobs = allJobs.filter(function(job) {
      if (category && job.category.indexOf(category) === -1 && job.subcategory.indexOf(category) === -1) return false;
      if (area && job.prefecture.indexOf(area) === -1) return false;
      if (employment && job.employment.indexOf(employment) === -1) return false;
      if (tags.length > 0) {
        var jobTags = job.tags || [];
        var matched = tags.every(function(tag) {
          return jobTags.some(function(jt) { return jt.indexOf(tag) !== -1; });
        });
        if (!matched) return false;
      }
      return true;
    });

    // ソート
    filteredJobs.sort(function(a, b) {
      if (sortOrder === 'new') return b.updated > a.updated ? 1 : -1;
      if (sortOrder === 'old') return a.updated > b.updated ? 1 : -1;
      if (sortOrder === 'salary') {
        var sa = parseInt(a.salary.replace(/[^0-9]/g, '')) || 0;
        var sb = parseInt(b.salary.replace(/[^0-9]/g, '')) || 0;
        return sb - sa;
      }
      return 0;
    });

    currentJobPage = 1;
    renderJobs();
  }
  window.applyFilter = applyFilter;

  function renderJobs() {
    var resultsEl = document.getElementById('jobsList');
    var countEl   = document.getElementById('jobsCount');
    var paginationEl = document.getElementById('pagination');
    if (!resultsEl) return;

    var total = filteredJobs.length;
    var totalPages = Math.ceil(total / PAGE_SIZE);
    var start = (currentJobPage - 1) * PAGE_SIZE;
    var end   = Math.min(start + PAGE_SIZE, total);
    var pageJobs = filteredJobs.slice(start, end);

    if (countEl) countEl.textContent = total + ' 件の求人';

    if (total === 0) {
      resultsEl.innerHTML = '<div class="search-placeholder"><div class="search-placeholder-icon">🔍</div><p>条件に合う求人が見つかりませんでした。</p></div>';
      if (paginationEl) paginationEl.innerHTML = '';
      return;
    }

    resultsEl.innerHTML = pageJobs.map(function(job) {
      var tags = (job.tags || []).map(function(tag) {
        return '<span class="job-tag">' + escapeHtml(tag) + '</span>';
      }).join('');
      var date = job.updated ? job.updated.substring(0, 10) : '';
      return '<div class="job-card-new">' +
        '<div class="job-card-header">' +
          '<span class="badge-normal">一般求人</span>' +
          '<span class="job-card-date">' + date + '</span>' +
        '</div>' +
        '<div class="job-card-title">' + escapeHtml(job.title) + '</div>' +
        '<div class="job-card-meta">' +
          '<span>📍 ' + formatPrefecture(job.prefecture) + '</span>' +
          '<span>💰 ' + escapeHtml(job.salary) + '</span>' +
          '<span>👔 ' + escapeHtml(job.employment) + '</span>' +
        '</div>' +
        (tags ? '<div class="job-card-tags">' + tags + '</div>' : '') +
        '<button class="btn-detail" onclick="showJobDetail(\'' + job.id + '\')">詳細を見る</button>' +
      '</div>';
    }).join('');

    // ページング
    if (paginationEl) {
      if (totalPages <= 1) {
        paginationEl.innerHTML = '';
      } else {
        var pages = [];
        // 前へボタン
        if (currentJobPage > 1) {
          pages.push('<button class="page-btn" onclick="goToPage(' + (currentJobPage - 1) + ')">‹</button>');
        }
        // ページ番号
        var startPage = Math.max(1, currentJobPage - 2);
        var endPage   = Math.min(totalPages, currentJobPage + 2);
        if (startPage > 1) pages.push('<button class="page-btn" onclick="goToPage(1)">1</button>');
        if (startPage > 2) pages.push('<span>...</span>');
        for (var i = startPage; i <= endPage; i++) {
          pages.push('<button class="page-btn' + (i === currentJobPage ? ' active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>');
        }
        if (endPage < totalPages - 1) pages.push('<span>...</span>');
        if (endPage < totalPages) pages.push('<button class="page-btn" onclick="goToPage(' + totalPages + ')">' + totalPages + '</button>');
        // 次へボタン
        if (currentJobPage < totalPages) {
          pages.push('<button class="page-btn" onclick="goToPage(' + (currentJobPage + 1) + ')">›</button>');
        }
        paginationEl.innerHTML = pages.join('');
      }
    }
  }

  window.goToPage = function(page) {
    currentJobPage = page;
    renderJobs();
    document.getElementById('page-jobs').scrollIntoView({ behavior: 'smooth' });
  };

  // ===== 詳細モーダル =====
  window.showJobDetail = function(id) {
    var modal = document.getElementById('jobDetailModal');
    if (!modal) return;

    // ローディング表示
    document.getElementById('modalTitle').textContent = '読み込み中...';
    document.getElementById('modalDesc').textContent = '取得中...';
    document.getElementById('modalReq').textContent = '取得中...';
    document.getElementById('modalInfo').textContent = '取得中...';
    modal.classList.add('open');

    // DB から詳細取得
    fetch('/api/jobs/detail/' + id)
      .then(function(res) { return res.json(); })
      .then(function(job) {
        document.getElementById('modalTitle').textContent = job.title || '求人詳細';
        document.getElementById('modalDesc').textContent = job.description || '詳細情報なし';
        document.getElementById('modalReq').textContent = job.requirements || '詳細情報なし';
        document.getElementById('modalInfo').textContent =
          '勤務地：' + (job.prefecture || '') +
          '　給与：' + (job.salary || '') +
          '　雇用形態：' + (job.employment || '');
      })
      .catch(function() {
        document.getElementById('modalTitle').textContent = '取得エラー';
        document.getElementById('modalDesc').textContent = '詳細情報の取得に失敗しました。';
      });
  };

  window.closeJobDetail = function() {
    var modal = document.getElementById('jobDetailModal');
    if (modal) modal.classList.remove('open');
  };

  var jobDetailModal = document.getElementById('jobDetailModal');
  if (jobDetailModal) {
    jobDetailModal.addEventListener('click', function(e) {
      if (e.target === jobDetailModal) window.closeJobDetail();
    });
  }

  // ===== 絞り込みリセット =====
  var searchReset = document.getElementById('searchReset');
  if (searchReset) {
    searchReset.addEventListener('click', function() {
      ['searchCategory','searchArea','searchEmployment'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
      });
      document.querySelectorAll('.tag-check input').forEach(function(el) { el.checked = false; });
      filteredJobs = allJobs;
      currentJobPage = 1;
      renderJobs();
    });
  }

  // ===== AIマッチングボタン =====
  var aiBtn = document.getElementById('aiBtn');
  if (aiBtn) {
    aiBtn.addEventListener('click', function() {
      var resumeText = document.getElementById('resumeText');
      var input = resumeText ? resumeText.value.trim() : '';
      if (!input) {
        alert('職務経歴・スキル・希望条件を入力してください。');
        return;
      }
      // TODO: AIマッチング実装
      alert('AIマッチング機能は実装中です。');
    });
  }

  // ===== ファイルアップロードUI =====
  var fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      var fileList = document.getElementById('fileList');
      if (!fileList) return;
      fileList.innerHTML = Array.from(this.files).map(function(f) {
        return '<div style="font-size:12px;color:#555;padding:4px 0">📄 ' + escapeHtml(f.name) + '</div>';
      }).join('');
    });
  }

  // ===== noteコラム RSS取得 =====
  var noteLoaded = false;
  function loadNoteArticles() {
    if (noteLoaded) return;
    var el = document.getElementById('noteCards');
    if (!el) return;

    fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent('https://note.com/abilitystaff/rss'))
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (!data.items || !data.items.length) throw new Error();
        noteLoaded = true;
        el.innerHTML = data.items.slice(0, 6).map(function(item) {
          var d = new Date(item.pubDate);
          var dateStr = d.getFullYear() + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + String(d.getDate()).padStart(2,'0');
          return '<div class="note-card"><a href="' + item.link + '" target="_blank" rel="noopener">' +
            '<div class="note-date">' + dateStr + '</div>' +
            '<div class="note-title">' + escapeHtml(item.title) + '</div>' +
            '</a></div>';
        }).join('');
      })
      .catch(function() {
        if (el) el.innerHTML = '<div class="note-error"><a href="https://note.com/abilitystaff" target="_blank" rel="noopener" style="color:#2d5a8e">noteでコラムを読む →</a></div>';
      });
  }

  // ===== ユーティリティ =====
  function formatPrefecture(prefecture) {
    if (!prefecture) return '';
    var prefs = prefecture.split(',').map(function(p) { return p.trim(); }).filter(Boolean);
    if (prefs.length > 3) {
      return escapeHtml(prefs.slice(0, 3).join('、') + '…');
    }
    return escapeHtml(prefs.join('、'));
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

}); // DOMContentLoaded
