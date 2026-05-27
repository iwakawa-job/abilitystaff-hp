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

    if (!currentEl || !targetEl) {
      isAnimating = false;
      return;
    }

    var currentIdx = pages.indexOf(currentPage);
    var targetIdx  = pages.indexOf(targetPage);
    var goingForward = targetIdx > currentIdx;

    // ターゲットを準備
    targetEl.style.display = 'block';
    targetEl.style.position = 'fixed';
    targetEl.style.top = '64px';
    targetEl.style.left = '0';
    targetEl.style.width = '100%';
    targetEl.style.zIndex = '50';
    targetEl.style.transform = goingForward ? 'translateX(100%)' : 'translateX(-100%)';
    targetEl.style.transition = 'transform 0.35s ease';

    // 少し待ってからアニメーション開始
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        targetEl.style.transform = 'translateX(0)';

        setTimeout(function() {
          // アニメーション完了
          currentEl.style.display = 'none';

          targetEl.style.position = '';
          targetEl.style.top = '';
          targetEl.style.left = '';
          targetEl.style.width = '';
          targetEl.style.zIndex = '';
          targetEl.style.transform = '';
          targetEl.style.transition = '';

          currentPage = targetPage;
          isAnimating = false;

          window.scrollTo(0, 0);
          updateNavActive();

          if (targetPage === 'column') loadNoteArticles();

        }, 380);
      });
    });
  }

  function updateNavActive() {
    document.querySelectorAll('[data-page]').forEach(function(el) {
      if (el.dataset.page === currentPage) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  // ===== リンクイベント =====
  document.addEventListener('click', function(e) {
    var link = e.target.closest('[data-page]');
    if (!link) return;
    e.preventDefault();
    var page = link.dataset.page;
    document.getElementById('navMobile').classList.remove('open');
    showPage(page);
  });

  // ===== ハンバーガーメニュー =====
  var hamburger = document.getElementById('hamburger');
  var navMobile = document.getElementById('navMobile');
  if (hamburger) {
    hamburger.addEventListener('click', function() {
      navMobile.classList.toggle('open');
    });
  }

  // ===== 求人タブ切替 =====
  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(function(t) {
        t.classList.remove('active');
      });
      tab.classList.add('active');
      document.querySelectorAll('.tab-content').forEach(function(c) {
        c.classList.add('hidden');
      });
      var target = document.getElementById('tab-' + tab.dataset.tab);
      if (target) target.classList.remove('hidden');
    });
  });

  // ===== プレミアム「すべて見る」 =====
  var premiumMoreBtn = document.getElementById('premiumMoreBtn');
  var premiumMore = document.getElementById('premiumMore');
  var premiumMoreWrap = document.getElementById('premiumMoreWrap');
  if (premiumMoreBtn) {
    premiumMoreBtn.addEventListener('click', function() {
      if (premiumMore) premiumMore.classList.remove('hidden');
      if (premiumMoreWrap) premiumMoreWrap.style.display = 'none';
    });
  }

  // ===== AIマッチングボタン =====
  var aiBtn = document.getElementById('aiBtn');
  if (aiBtn) {
    aiBtn.addEventListener('click', function() {
      var input = document.getElementById('aiInput');
      if (!input || !input.value.trim()) {
        alert('職務経歴・スキル・希望条件を入力してください。');
        return;
      }
      window.open('https://jobmatch-4jzs.onrender.com/job_search.html', '_blank');
    });
  }

  // ===== 求人検索ボタン =====
  var searchBtn = document.getElementById('searchBtn');
  var searchReset = document.getElementById('searchReset');

  if (searchBtn) {
    searchBtn.addEventListener('click', function() {
      var keyword    = document.getElementById('searchKeyword') ? document.getElementById('searchKeyword').value.trim() : '';
      var category   = document.getElementById('searchCategory') ? document.getElementById('searchCategory').value : '';
      var area       = document.getElementById('searchArea') ? document.getElementById('searchArea').value : '';
      var employment = document.getElementById('searchEmployment') ? document.getElementById('searchEmployment').value : '';
      var tags = [];
      document.querySelectorAll('.tag-check input:checked').forEach(function(el) {
        tags.push(el.value);
      });

      var params = new URLSearchParams();
      if (keyword)    params.set('q', keyword);
      if (category)   params.set('category', category);
      if (area)       params.set('area', area);
      if (employment) params.set('employment', employment);
      if (tags.length) params.set('tags', tags.join(','));

      var url = 'https://jobmatch-4jzs.onrender.com/job_search.html';
      if (params.toString()) url += '?' + params.toString();
      window.open(url, '_blank');
    });
  }

  if (searchReset) {
    searchReset.addEventListener('click', function() {
      if (document.getElementById('searchKeyword'))    document.getElementById('searchKeyword').value = '';
      if (document.getElementById('searchCategory'))   document.getElementById('searchCategory').value = '';
      if (document.getElementById('searchArea'))       document.getElementById('searchArea').value = '';
      if (document.getElementById('searchEmployment')) document.getElementById('searchEmployment').value = '';
      document.querySelectorAll('.tag-check input').forEach(function(el) { el.checked = false; });
      var results = document.getElementById('searchResults');
      if (results) {
        results.innerHTML = '<div class="search-placeholder"><div class="search-placeholder-icon">🔍</div><p>条件を入力して「求人を検索する」を押してください</p><p style="font-size:12px;color:#aaa;margin-top:0.5rem">※検索するとAIマッチングシステムへ移動します</p></div>';
      }
    });
  }

  // ===== noteコラム RSS取得 =====
  var noteLoaded = false;
  function loadNoteArticles() {
    if (noteLoaded) return;
    var el = document.getElementById('noteCards');
    if (!el) return;

    var NOTE_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url=';
    var NOTE_RSS   = 'https://note.com/abilitystaff/rss';

    fetch(NOTE_PROXY + encodeURIComponent(NOTE_RSS))
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (!data.items || !data.items.length) throw new Error();
        noteLoaded = true;
        el.innerHTML = data.items.slice(0, 6).map(function(item) {
          var d = new Date(item.pubDate);
          var dateStr = d.getFullYear() + '.' +
            String(d.getMonth()+1).padStart(2,'0') + '.' +
            String(d.getDate()).padStart(2,'0');
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
