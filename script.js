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
      window.open('https://jobmatch-4jzs.onrender.com/job_search.html', '_blank');
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
    });
  }

  // ===== ファイルアップロードUI =====
  var fileInput = document.getElementById('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', function() {
      var fileList = document.getElementById('fileList');
      if (!fileList) return;
      fileList.innerHTML = Array.from(this.files).map(function(f) {
        return '<div style="font-size:12px;color:#555;padding:4px 0">📄 ' + f.name + '</div>';
      }).join('');
    });
  }

  // ===== 詳細モーダル =====
  window.showJobDetail = function(id) {
    var modal = document.getElementById('jobDetailModal');
    var titles = {
      1: '営業マネージャー / IT系メーカー（東京）',
      2: '経理・財務担当 / 大手商社グループ（神奈川）',
      3: '人事・採用担当 / ベンチャー企業（東京・リモート可）'
    };
    var title = document.getElementById('modalTitle');
    if (title) title.textContent = titles[id] || '求人詳細';
    ['modalDesc','modalReq','modalInfo'].forEach(function(elId) {
      var el = document.getElementById(elId);
      if (el) el.textContent = '※DB連携後に詳細情報が表示されます。';
    });
    if (modal) modal.classList.add('open');
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
            '<div class="note-title">' + item.title + '</div>' +
            '</a></div>';
        }).join('');
      })
      .catch(function() {
        if (el) el.innerHTML = '<div class="note-error"><a href="https://note.com/abilitystaff" target="_blank" rel="noopener" style="color:#2d5a8e">noteでコラムを読む →</a></div>';
      });
  }

}); // DOMContentLoaded
