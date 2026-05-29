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
  var matchedJobs = null;
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
      var matchBadge = '';
      if (job.matchScore !== undefined) {
        var cls = job.matchScore >= 80 ? 'match-high' : job.matchScore >= 60 ? 'match-mid' : 'match-low';
        var lbl = job.matchScore >= 80 ? '高マッチ' : job.matchScore >= 60 ? '中マッチ' : '参考';
        matchBadge = '<span class="match-badge ' + cls + '">' + lbl + ' ' + job.matchScore + '点</span>';
      }
      var matchReason = job.matchReason ? '<div class="match-reason">' + escapeHtml(job.matchReason) + '</div>' : '';
      var category = job.category ? '<span class="job-category-badge">' + escapeHtml(job.category) + '</span>' : '';
      var subcategory = job.subcategory ? '<span class="job-category-badge sub">' + escapeHtml(job.subcategory) + '</span>' : '';
      var jobIdBadge = '<span class="job-id-badge">ID:' + escapeHtml(job.id) + '</span>';
      return '<div class="job-card-new' + (job.matchScore !== undefined ? ' matched' : '') + '">' +
        '<div class="job-card-badges">' + category + subcategory + matchBadge + jobIdBadge + '</div>' +
        '<div class="job-card-title">' + escapeHtml(job.title) + '</div>' +
        matchReason +
        '<div class="job-card-meta">' +
          '<span>📍 ' + formatPrefecture(job.prefecture) + '</span>' +
          '<span>👔 ' + escapeHtml(job.employment) + '</span>' +
          '<span class="job-salary">💰 ' + escapeHtml(job.salary) + '</span>' +
        '</div>' +
        (tags ? '<div class="job-card-tags">' + tags + '</div>' : '') +
        '<div class="job-card-footer">' +
          '<span class="job-card-date">更新：' + date + '</span>' +
          '<button class="btn-detail" onclick="showJobDetail(\'' + job.id + '\', \'' + escapeHtml(job.matchReason||'') + '\', ' + (job.matchScore !== undefined ? job.matchScore : 'undefined') + ')">詳細を見る</button>' +
        '</div>' +
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
  window.showJobDetail = function(id, matchReason, matchScore) {
    var modal = document.getElementById('jobDetailModal');
    if (!modal) return;

    document.getElementById('modalTitle').textContent = '読み込み中...';
    document.getElementById('modalBody').innerHTML = '<div style="text-align:center;padding:2rem;color:#888">取得中...</div>';
    modal.classList.add('open');

    fetch('/api/jobs/detail/' + id)
      .then(function(res) { return res.json(); })
      .then(function(job) {
        document.getElementById('modalTitle').textContent = job.title || '求人詳細';

        var tags = (job.tags || []).map(function(t) {
          return '<span class="job-tag">' + escapeHtml(t) + '</span>';
        }).join('');

        var agentHtml = '';
        if (job.agent) {
          var a = job.agent;
          var agentItems = [
            a.age ? '年齢条件：' + a.age : '',
            a.gender ? '性別：' + a.gender : '',
            a.job_change_count ? '転職回数：' + a.job_change_count : '',
            a.foreign_national ? '外国籍：' + a.foreign_national : '',
            a.headcount ? '採用人数：' + a.headcount : '',
            a.fee ? '紹介手数料：' + a.fee : '',
            a.fee_definition ? '手数料定義：' + a.fee_definition : '',
            a.refund ? '返金規定：' + a.refund : '',
            a.note ? '注記：' + a.note : '',
            a.other ? 'その他：' + a.other : '',
          ].filter(Boolean);
          if (agentItems.length) {
            agentHtml = '<div class="detail-section">' +
              '<div class="detail-label" style="color:#059669">エージェント向け情報</div>' +
              '<div class="detail-text" style="background:#f0fdf4;padding:10px 14px;border-radius:8px;color:#065f46">' +
              agentItems.map(function(s) { return escapeHtml(s); }).join('<br>') +
              '</div></div>';
          }
        }

        var matchHtml = '';
        if (matchScore !== undefined) {
          var cls = matchScore >= 80 ? 'match-high' : matchScore >= 60 ? 'match-mid' : 'match-low';
          var lbl = matchScore >= 80 ? '高マッチ' : matchScore >= 60 ? '中マッチ' : '参考';
          matchHtml = '<div class="detail-section">' +
            '<div class="detail-label">AIマッチング結果</div>' +
            '<div class="detail-text" style="background:#f0fdf4;padding:10px 14px;border-radius:8px">' +
            '<span class="match-badge ' + cls + '">' + lbl + ' ' + matchScore + '点</span>' +
            (matchReason ? '<br><span style="font-size:13px;color:#065f46">' + escapeHtml(matchReason) + '</span>' : '') +
            '</div></div>';
        }

        document.getElementById('modalBody').innerHTML =
          // 基本情報
          '<div class="detail-section">' +
            '<div class="detail-label">基本情報</div>' +
            '<div class="detail-text">' +
              '会社名：' + escapeHtml(job.company) + '<br>' +
              '職種：' + escapeHtml(job.category) + (job.subcategory ? ' / ' + escapeHtml(job.subcategory) : '') + '<br>' +
              '勤務地：' + escapeHtml(job.prefecture) + '<br>' +
              '給与：' + escapeHtml(job.salary) + '<br>' +
              '雇用形態：' + escapeHtml(job.employment) +
            '</div>' +
          '</div>' +
          // タグ
          (tags ? '<div class="detail-section"><div class="job-card-tags">' + tags + '</div></div>' : '') +
          // マッチング結果
          matchHtml +
          // 仕事内容
          '<div class="detail-section">' +
            '<div class="detail-label">仕事内容</div>' +
            '<div class="detail-text">' + escapeHtml(job.description || '').replace(/\n/g, '<br>') + '</div>' +
          '</div>' +
          // 応募資格
          '<div class="detail-section">' +
            '<div class="detail-label">応募資格</div>' +
            '<div class="detail-text">' + escapeHtml(job.requirements || '').replace(/\n/g, '<br>') + '</div>' +
          '</div>' +
          // エージェント向け情報
          agentHtml;
      })
      .catch(function() {
        document.getElementById('modalTitle').textContent = '取得エラー';
        document.getElementById('modalBody').innerHTML = '<p style="color:#888">詳細情報の取得に失敗しました。</p>';
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

  // ===== AIマッチング =====
  var uploadedFiles = [];

  // ドラッグ＆ドロップ
  var uploadArea = document.getElementById('uploadArea');
  if (uploadArea) {
    uploadArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      uploadArea.style.borderColor = '#1a3a5c';
    });
    uploadArea.addEventListener('dragleave', function() {
      uploadArea.style.borderColor = '#c8d8ef';
    });
    uploadArea.addEventListener('drop', function(e) {
      e.preventDefault();
      uploadArea.style.borderColor = '#c8d8ef';
      var files = Array.from(e.dataTransfer.files);
      addFiles(files);
    });
  }

  var fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      addFiles(Array.from(this.files));
      this.value = '';
    });
  }

  function addFiles(files) {
    files.forEach(function(f) {
      if (!uploadedFiles.find(function(u) { return u.name === f.name; })) {
        uploadedFiles.push(f);
      }
    });
    renderFileList();
  }

  function renderFileList() {
    var el = document.getElementById('fileList');
    if (!el) return;
    el.innerHTML = uploadedFiles.map(function(f) {
      var icon = f.name.endsWith('.pdf') ? '📄' : f.name.endsWith('.docx') ? '📝' : '📃';
      return '<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#555;padding:4px 0">' +
        '<span>' + icon + '</span>' +
        '<span style="flex:1">' + escapeHtml(f.name) + '</span>' +
        '<span style="color:#aaa">(' + (f.size/1024).toFixed(0) + 'KB)</span>' +
        '<button onclick="removeFile(this.dataset.name)" data-name="' + escapeHtml(f.name) + '" style="background:none;border:none;cursor:pointer;color:#888;font-size:14px">×</button>' +
      '</div>';
    }).join('');
  }

  window.removeFile = function(name) {
    if (!name && this && this.dataset) name = this.dataset.name;
    uploadedFiles = uploadedFiles.filter(function(f) { return f.name !== name; });
    renderFileList();
  };

  async function fileToText(file) {
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      return await file.text();
    }
    if (file.name.endsWith('.docx') || file.name.endsWith('.doc') ||
        file.name.endsWith('.pdf') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      try {
        var formData = new FormData();
        formData.append('file', file);
        var res = await fetch('/api/extract', { method: 'POST', body: formData });
        if (res.ok) {
          var data = await res.json();
          return data.text || '';
        }
      } catch(e) {}
    }
    try { return (await file.text()).slice(0, 3000); } catch(e) { return ''; }
  }

  // AIマッチング開始ボタン
  var aiBtn = document.getElementById('aiBtn');
  if (aiBtn) {
    aiBtn.addEventListener('click', function() {
      runAIMatch();
    });
  }

  async function runAIMatch() {
    var manualText = document.getElementById('resumeText') ? document.getElementById('resumeText').value.trim() : '';
    var userWishes = document.getElementById('userWishes') ? document.getElementById('userWishes').value.trim() : '';

    if (!uploadedFiles.length && !manualText) {
      alert('ファイルをアップロードするかテキストを入力してください。');
      return;
    }

    var btn = document.getElementById('aiBtn');
    if (btn) btn.disabled = true;

    var pw = document.getElementById('progressWrap');
    var pf = document.getElementById('progressFill');
    var pl = document.getElementById('progressLabel');
    if (pw) pw.classList.remove('hidden');

    function setProgress(pct, label) {
      if (pf) pf.style.width = pct + '%';
      if (pl) pl.textContent = label;
    }

    try {
      setProgress(10, 'ファイルを読み込み中...');
      var docText = '';
      for (var i = 0; i < uploadedFiles.length; i++) {
        docText += '\n\n=== ' + uploadedFiles[i].name + ' ===\n' + (await fileToText(uploadedFiles[i]));
      }
      if (manualText) docText += '\n\n=== テキスト入力 ===\n' + manualText;

      setProgress(30, 'AIが書類を解析中...');

      // 生年月日から年齢をJS側で抽出
      var extractedAge = null;
      var birthMatch = docText.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*生/);
      if (birthMatch) {
        var birthYear = parseInt(birthMatch[1]);
        var birthMonth = parseInt(birthMatch[2]);
        var now = new Date();
        var age = now.getFullYear() - birthYear;
        if (now.getMonth() + 1 < birthMonth) age--;
        extractedAge = age;
      }

      // プロフィール抽出
      var profileRes = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          temperature: 0,
          messages: [{ role: 'user', content: '以下の書類から候補者のプロフィールを抽出し、JSONのみ返してください。\n\n【重要】候補者の「現在の職種・役職」を最優先で判断してください。\n\nフィールド:\n- skills（スキル配列）\n- job_types（希望職種配列。「ITエンジニア・ITコンサル」「営業・営業企画系」「管理・経営」「建築・土木技術職」「エンジニア（機械・電気・電子・半導体・制御）」「商品企画・マーケ・購買」「接客販売系」「コンサル」「事務系」「クリエイティブ職（ゲーム/マルチメディア）」「医療系専門職」から選択）\n- prefectures（希望都道府県配列）\n- summary（150字以内の要約）\n- keywords（重要キーワード配列）\n- current_job_type（現在の職種を一言で）\n- age（年齢を数値、不明ならnull）\n- job_change_count（転職回数、不明ならnull）\n- gender（「男性」「女性」「不明」）\n\n書類:\n' + docText.slice(0, 3000) }]
        })
      });

      if (!profileRes.ok) throw new Error('プロフィール抽出エラー: ' + profileRes.status);
      var pd = await profileRes.json();
      var profile;
      try {
        profile = JSON.parse(pd.content[0].text.replace(/```json|```/g, '').trim());
      } catch(e) {
        profile = { summary: manualText || docText.slice(0, 200), skills: [], keywords: [], prefectures: [], job_types: [] };
      }
      if (extractedAge !== null) profile.age = extractedAge;

      setProgress(55, '求人データを絞り込み中...');

      var categoryMap = {
        '人事': ['管理・経営','事務系'], '採用': ['管理・経営','事務系'],
        '労務': ['管理・経営','事務系'], '総務': ['管理・経営','事務系'],
        '経理': ['管理・経営','事務系'], '財務': ['管理・経営','事務系'],
        '営業': ['営業・営業企画系'], 'IT': ['ITエンジニア・ITコンサル'],
        'エンジニア': ['ITエンジニア・ITコンサル','エンジニア（機械・電気・電子・半導体・制御）'],
        'コンサル': ['コンサル'], '建築': ['建築・土木技術職'],
        'マーケ': ['商品企画・マーケ・購買'], '企画': ['商品企画・マーケ・購買','営業・営業企画系'],
      };

      var targetCategories = [].concat(profile.job_types || []);
      (profile.job_types || []).forEach(function(jt) {
        Object.keys(categoryMap).forEach(function(key) {
          if (jt.includes(key)) targetCategories = targetCategories.concat(categoryMap[key]);
        });
      });
      targetCategories = targetCategories.filter(function(v, i, a) { return a.indexOf(v) === i; });

      var selectedTags = Array.from(document.querySelectorAll('.filter-checks input:checked')).map(function(cb) { return cb.value; });
      var selectedCategory = document.getElementById('searchCategory') ? document.getElementById('searchCategory').value : '';
      var selectedPref = document.getElementById('searchArea') ? document.getElementById('searchArea').value : '';

      var candidates = allJobs.filter(function(j) {
        if (selectedCategory && !j.category.includes(selectedCategory)) return false;
        if (selectedPref && !(j.prefecture || '').includes(selectedPref)) return false;
        if (selectedTags.length > 0 && !selectedTags.every(function(tag) { return (j.tags || []).includes(tag); })) return false;
        if (targetCategories.length > 0 && !targetCategories.some(function(t) { return j.category.includes(t) || t.includes(j.category); })) return false;
        return true;
      });

      if (candidates.length < 10) {
        candidates = allJobs.filter(function(j) {
          if (selectedCategory && !j.category.includes(selectedCategory)) return false;
          if (selectedPref && !(j.prefecture || '').includes(selectedPref)) return false;
          if (selectedTags.length > 0 && !selectedTags.every(function(tag) { return (j.tags || []).includes(tag); })) return false;
          return true;
        });
      }

      if (candidates.length > 60) {
        var kws = [].concat(profile.skills || [], profile.keywords || [], profile.job_types || []);
        var currentJob = profile.current_job_type || '';
        candidates = candidates.map(function(j) {
          var subcatScore = 0;
          if (currentJob) {
            var subcatList = (j.subcategory || '').split(',').map(function(s) { return s.trim(); });
            var matchSubcats = subcatList.filter(function(s) { return s.includes(currentJob) || currentJob.includes(s); });
            if (subcatList.length > 0) subcatScore = Math.round((matchSubcats.length / subcatList.length) * 30);
          }
          var titleMatch = currentJob && j.title.includes(currentJob) ? 20 : 0;
          var kwScore = kws.filter(function(k) { return j.title.includes(k) || j.description.includes(k); }).length;
          return Object.assign({}, j, { _s: subcatScore + titleMatch + kwScore });
        }).sort(function(a, b) { return b._s - a._s; }).slice(0, 60);
      }

      if (!candidates.length) {
        setProgress(100, '完了');
        alert('条件に合う求人が見つかりませんでした。条件を変更してから再度お試しください。');
        if (btn) btn.disabled = false;
        return;
      }

      setProgress(75, 'AIがマッチングスコアを計算中...');

      var jobLines = candidates.map(function(j, i) {
        return i + '|' + j.title + '|' + j.category + '|' + (j.subcategory || '') + '|' + j.prefecture + '|' + j.salary + '|' + (j.requirements || '').slice(0, 200);
      }).join('\n');

      var matchRes = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1500,
          temperature: 0,
          messages: [{ role: 'user', content: 'あなたは優秀な人材紹介エージェントです。候補者のプロフィールと求人リストを照合し、マッチ度をスコアリングしてください。\n\n【候補者プロフィール】\n現在の職種: ' + (profile.current_job_type || profile.job_types?.[0] || '不明') + '\n年齢: ' + (profile.age ? profile.age + '歳' : '不明') + '\n' + profile.summary + '\nスキル: ' + (profile.skills || []).join(', ') + '\n希望職種: ' + (profile.job_types || []).join(', ') + '\n希望勤務地: ' + (profile.prefectures || []).join(', ') + '\n' + (userWishes ? '本人の希望条件:\n' + userWishes : '') + '\n\n【絶対ルール】\n・候補者の現在の職種「' + (profile.current_job_type || '') + '」と全く異なる職種の求人はスコアを5以下にしてください\n・reasonには給与・年収の金額を含めないでください\n\n【求人リスト（インデックス|タイトル|職種（親）|職種（子）|都道府県|給与|応募資格）】\n' + jobLines + '\n\n上位10件をマッチ度でスコアリングし、JSON配列のみ返してください。\nフィールド: index（数値）, score（0-100の整数）, reason（マッチ理由を100字以内）' }]
        })
      });

      if (!matchRes.ok) throw new Error('マッチングエラー: ' + matchRes.status);
      var md = await matchRes.json();
      var results;
      try {
        results = JSON.parse(md.content[0].text.replace(/```json|```/g, '').trim());
      } catch(e) {
        throw new Error('マッチング結果の解析に失敗しました。');
      }

      setProgress(95, '結果を表示中...');

      matchedJobs = results.map(function(r) {
        var j = candidates[r.index];
        if (!j) return null;
        return Object.assign({}, j, { matchScore: r.score, matchReason: r.reason });
      }).filter(Boolean).sort(function(a, b) { return b.matchScore - a.matchScore; });

      filteredJobs = matchedJobs.slice();
      currentJobPage = 1;
      renderJobs();

      // バナー表示
      var banner = document.getElementById('matchBanner');
      if (banner) {
        banner.textContent = 'AIマッチング結果 ' + matchedJobs.length + '件';
        banner.classList.remove('hidden');
      }

      setProgress(100, '完了！');
      setTimeout(function() {
        if (pw) pw.classList.add('hidden');
        if (btn) btn.disabled = false;
      }, 1000);

    } catch(e) {
      alert('エラーが発生しました: ' + e.message);
      if (pw) pw.classList.add('hidden');
      if (btn) btn.disabled = false;
    }
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
