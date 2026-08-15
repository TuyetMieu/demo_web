/* ══════════════════════════════════════════════════
   ROADMAP — Lộ trình học TUYẾN TÍNH.

   Mỗi lộ trình là MỘT mạch thẳng từ trên xuống, không rẽ nhánh:
   các chủ đề con của một chặng nằm trong drawer chi tiết chứ không
   vẽ thành node trái/phải như bản cũ.

   Tab bar:
     [✏️ Tùy chỉnh]  ← luôn đứng đầu, canvas kéo-thả của người dùng
     [🎯 Lộ trình của tôi]  ← sinh từ khảo sát (nếu có)
     [<các lộ trình đã ghim>]  [+]

   Trạng thái chặng:
     · Chặng gắn khóa học (stage.course) → TỰ ĐỘNG suy từ tiến độ thật
       (/api/enrolled): đang học → active, 100% → done.
     · Chặng còn lại → user tự đánh dấu; lưu localStorage (tri-state)
       và đồng bộ "done" lên server qua /api/roadmap.

   Định danh: mọi thứ chạy bằng roadmap ID (slug), KHÔNG phải tên hiển
   thị — đổi tên tiếng Việt không làm mất tiến độ đã lưu.
   ══════════════════════════════════════════════════ */
(function () {
  /* v4: bản cũ lưu theo TÊN lộ trình và danh mục đã thay đổi hoàn toàn,
     nên dùng key mới thay vì cố migrate dữ liệu không còn ánh xạ được. */
  var LS_PINNED = 'roadmap_pinned_v4';
  var LS_ACTIVE = 'roadmap_active_v4';
  var LS_PROGRESS = 'roadmap_progress_v4';
  var LS_SEEN_GENERATED = 'roadmap_generated_seen_v2';

  var CUSTOM_TAB = 'personal';        // tab "Tùy chỉnh" (canvas kéo-thả)
  var MY_TAB = '__my__';              // tab "Lộ trình của tôi" (từ khảo sát)
  var DEFAULT_PINNED = ['frontend', 'backend', 'ai-engineer'];

  /* ── Truy cập danh mục ── */
  function listMeta(id) {
    return (typeof ROADMAP_LIST !== 'undefined')
      ? ROADMAP_LIST.find(function (r) { return r.id === id; })
      : null;
  }
  function isValidTab(id) {
    return id === CUSTOM_TAB || id === MY_TAB || !!listMeta(id);
  }

  function getPinned() {
    var v = null;
    try { v = JSON.parse(localStorage.getItem(LS_PINNED)); } catch (e) { /* noop */ }
    if (!Array.isArray(v)) v = DEFAULT_PINNED.slice();
    v = v.filter(isValidTab);
    return v.length ? v : DEFAULT_PINNED.slice();
  }
  function setPinned(arr) { localStorage.setItem(LS_PINNED, JSON.stringify(arr)); }
  function getActive() {
    var id = localStorage.getItem(LS_ACTIVE);
    if (id && isValidTab(id)) return id;
    return getPinned()[0] || DEFAULT_PINNED[0];
  }
  function setActive(id) { localStorage.setItem(LS_ACTIVE, id); }
  function getOverrides() {
    try { return JSON.parse(localStorage.getItem(LS_PROGRESS)) || {}; }
    catch (e) { return {}; }
  }
  function setOverride(key, status) {
    var o = getOverrides();
    o[key] = status;
    localStorage.setItem(LS_PROGRESS, JSON.stringify(o));
  }

  /* ── Đồng bộ tiến độ khóa học thật (/api/enrolled) ──
     main.js cũng nạp window.enrolledCourses — dùng chung nếu đã có. */
  var _enrolledPromise = null;
  var _enrolledReady = false;
  function fetchEnrolled() {
    if (window.enrolledCourses && window.enrolledCourses.length) {
      _enrolledReady = true;
      return Promise.resolve(window.enrolledCourses);
    }
    if (!_enrolledPromise) {
      _enrolledPromise = fetch('/api/enrolled', { credentials: 'include' })
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; })
        .then(function (data) {
          _enrolledReady = true;
          // /enrolled trả { ok, enrolled: [...] } — BỌC, không phải mảng trần.
          var list = Array.isArray(data) ? data : ((data && data.enrolled) || []);
          if (!window.enrolledCourses || !window.enrolledCourses.length) {
            window.enrolledCourses = list;
          }
          return window.enrolledCourses;
        });
    }
    return _enrolledPromise;
  }
  function findEnrolled(courseId) {
    var list = window.enrolledCourses || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === courseId) return list[i];
    }
    return null;
  }
  /* 'done' | 'active' | null (chưa đăng ký khóa) */
  function courseStatus(courseId) {
    var c = findEnrolled(courseId);
    if (!c) return null;
    return (c.progress || 0) >= 100 ? 'done' : 'active';
  }

  /* ── Tiến độ thủ công lưu server (bảng roadmap_progress) ──
     Server chỉ lưu boolean done; 'active' chỉ nằm ở localStorage. */
  var _serverDone = {};
  var _serverDonePromise = {};
  function fetchServerDone(slug) {
    if (!_serverDonePromise[slug]) {
      _serverDonePromise[slug] = fetch('/api/roadmap?roadmap_id=' + encodeURIComponent(slug),
        { credentials: 'include' })
        .then(function (r) { return r.ok ? r.json() : { doneItems: [] }; })
        .catch(function () { return { doneItems: [] }; })
        .then(function (d) {
          _serverDone[slug] = d.doneItems || [];
          return _serverDone[slug];
        });
    }
    return _serverDonePromise[slug];
  }
  var _pushChain = {}; // slug:item -> promise; tuần tự hóa PUT để toggle nhanh
                       // liên tiếp không về server sai thứ tự (done cuối phải thắng)
  function pushServerDone(slug, itemId, done) {
    var key = slug + ':' + itemId;
    var send = function () {
      return fetch('/api/roadmap/' + encodeURIComponent(itemId), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: done, roadmap_id: slug })
      }).catch(function () { /* offline → localStorage vẫn giữ trạng thái */ });
    };
    _pushChain[key] = (_pushChain[key] || Promise.resolve()).then(send, send);
    var arr = _serverDone[slug] || (_serverDone[slug] = []);
    var idx = arr.indexOf(itemId);
    if (done && idx === -1) arr.push(itemId);
    if (!done && idx !== -1) arr.splice(idx, 1);
  }

  /* ── Trạng thái hiệu lực của 1 chặng ──
     Ưu tiên: tiến độ khóa học thật > đánh dấu tay (local) > done từ server. */
  function getStatus(rmId, stage) {
    if (stage.course) {
      var cs = courseStatus(stage.course);
      if (cs) return cs;
    }
    var ov = getOverrides()[rmId + ':' + stage.id];
    if (ov) return ov;
    if (_serverDone[rmId] && _serverDone[rmId].indexOf(stage.id) !== -1) return 'done';
    return 'locked';
  }

  var STATUS_LABEL = { done: 'Đã học', active: 'Đang học', locked: 'Chưa học' };
  var RES_CFG = {
    article: { icon: 'file-text', label: 'Bài viết' },
    video:   { icon: 'youtube', label: 'Video' },
    course:  { icon: 'graduation-cap', label: 'Khóa học' },
    docs:    { icon: 'book-open', label: 'Tài liệu' }
  };

  function escHtmlR(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

  /* Sắp xếp node id theo số thứ tự thực (rm_2 < rm_10), không theo alphabet */
  function sortNodeIds(ids) {
    return ids.slice().sort(function (a, b) {
      var na = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
      var nb = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
      return na - nb;
    });
  }

  /* ── Chuẩn hoá dữ liệu 1 lộ trình → mảng chặng tuyến tính ── */
  function normalize(rmId) {
    var raw = (typeof ROADMAP_DATA !== 'undefined' && ROADMAP_DATA[rmId]) || [];
    return raw.map(function (s, i) {
      return {
        id: 's' + i,
        title: s.title,
        desc: s.desc || '',
        topics: s.topics || [],
        course: s.course || null,
        res: s.res || []
      };
    });
  }

  /* Cache chặng của tab đang mở — drawer tra cứu lại mà không dựng lại mảng */
  var _stages = [];
  var _stagesFor = null;
  function stagesOf(rmId) {
    if (_stagesFor === rmId) return _stages;
    return normalize(rmId);
  }

  /* ══════════════ TAB BAR ══════════════ */
  function tabBtn(id, label, isActive, extraCls) {
    return '<button type="button" class="rm-tab' + (isActive ? ' active' : '') + (extraCls ? ' ' + extraCls : '') +
      '" onclick="window.roadmapSelectTab(\'' + esc(id) + '\')">' + label + '</button>';
  }

  function renderTabs() {
    var bar = document.getElementById('rm-tabbar');
    if (!bar) return;
    var pinned = getPinned();
    var active = getActive();

    // "Tùy chỉnh" LUÔN đứng đầu — đây là chỗ người dùng tự dựng lộ trình riêng.
    var html = tabBtn(CUSTOM_TAB, '<span class="rm-tab-ico">✏️</span> Tùy chỉnh',
      active === CUSTOM_TAB, 'rm-tab--custom');
    html += '<span class="rm-tab-divider"></span>';

    html += pinned.map(function (id) {
      if (id === MY_TAB) {
        return tabBtn(id, '<span class="rm-tab-ico">🎯</span> Lộ trình của tôi', active === id, 'rm-tab--mine');
      }
      var meta = listMeta(id);
      if (!meta) return '';
      return tabBtn(id, '<span class="rm-tab-ico">' + meta.emoji + '</span> ' + escHtmlR(meta.name), active === id);
    }).join('');

    html += '<button type="button" class="rm-tab-plus" onclick="window.roadmapOpenBrowse()" aria-label="Thêm lộ trình">' +
      '<span data-icon="plus" data-size="14"></span></button>';
    bar.innerHTML = html;
    if (window.mountIcons) mountIcons(bar);
  }

  /* ══════════════ HEADER LỘ TRÌNH ══════════════ */
  function progressOf(rmId, stages) {
    var done = 0, active = 0;
    stages.forEach(function (s) {
      var st = getStatus(rmId, s);
      if (st === 'done') done++; else if (st === 'active') active++;
    });
    return {
      done: done, active: active, locked: stages.length - done - active,
      total: stages.length,
      pct: stages.length ? Math.round((done / stages.length) * 100) : 0
    };
  }

  function renderHeader(opts) {
    var el = document.getElementById('rm-head');
    if (!el) return;
    var p = opts.progress;
    var courseCount = (opts.stages || []).filter(function (s) { return !!s.course; }).length;
    el.innerHTML =
      '<div class="rm-head-icon">' + (opts.emoji || '🧭') + '</div>' +
      '<div class="rm-head-body">' +
        (opts.badge ? '<span class="rm-head-badge">' + opts.badge + '</span>' : '') +
        '<h2 class="rm-head-title">' + escHtmlR(opts.title) + '</h2>' +
        '<p class="rm-head-desc">' + escHtmlR(opts.desc || '') + '</p>' +
        '<div class="rm-head-meta">' +
          '<span class="rm-head-chip">' + p.total + ' chặng</span>' +
          (courseCount ? '<span class="rm-head-chip rm-head-chip--course">📚 ' + courseCount + ' chặng có khóa học</span>' : '') +
          '<span class="rm-head-chip">Lộ trình thẳng, học từ trên xuống</span>' +
        '</div>' +
      '</div>' +
      '<div class="rm-head-ring" style="--pct:' + p.pct + '">' +
        '<svg viewBox="0 0 44 44" aria-hidden="true">' +
          '<circle class="rm-ring-bg" cx="22" cy="22" r="19"></circle>' +
          '<circle class="rm-ring-fg" cx="22" cy="22" r="19" stroke-dasharray="' + (p.pct * 1.194) + ' 200"></circle>' +
        '</svg>' +
        '<span class="rm-head-pct">' + p.pct + '<i>%</i></span>' +
        '<span class="rm-head-ring-sub">' + p.done + '/' + p.total + ' chặng</span>' +
      '</div>';
    el.style.display = 'flex';
  }

  /* ══════════════ MẠCH LỘ TRÌNH (tuyến tính) ══════════════ */
  function stageHtml(rmId, stage, index, total) {
    var status = getStatus(rmId, stage);
    var isLast = index === total - 1;
    var topics = (stage.topics || []).slice(0, 4).map(function (t) {
      return '<span class="rm-topic">' + escHtmlR(t) + '</span>';
    }).join('');
    var more = (stage.topics || []).length > 4
      ? '<span class="rm-topic rm-topic--more">+' + ((stage.topics || []).length - 4) + '</span>'
      : '';
    var mark = status === 'done'
      ? '<span class="rm-step-check">✓</span>'
      : '<span class="rm-step-num">' + (index + 1) + '</span>';

    return '<div class="rm-step rm-step--' + status + (isLast ? ' rm-step--last' : '') + '" style="animation-delay:' + Math.min(index * 0.035, 0.4) + 's">' +
      '<div class="rm-step-rail"><span class="rm-step-bullet">' + mark + '</span></div>' +
      '<button type="button" class="rm-step-card" onclick="window.roadmapOpenDrawer(\'' + esc(rmId) + '\',\'' + esc(stage.id) + '\')">' +
        '<span class="rm-step-head">' +
          '<span class="rm-step-title">' + escHtmlR(stage.title) + '</span>' +
          (stage.course ? '<span class="rm-step-course" title="Có khóa học trên nền tảng — tiến độ tự đồng bộ">📚 Khóa học</span>' : '') +
          '<span class="rm-step-state">' + STATUS_LABEL[status] + '</span>' +
        '</span>' +
        (stage.desc ? '<span class="rm-step-desc">' + escHtmlR(stage.desc) + '</span>' : '') +
        (topics ? '<span class="rm-step-topics">' + topics + more + '</span>' : '') +
      '</button>' +
      '</div>';
  }

  function buildTrackHtml(rmId, stages) {
    return '<div class="rm-track">' + stages.map(function (s, i) {
      return stageHtml(rmId, s, i, stages.length);
    }).join('') + '</div>';
  }

  /* ── Render một lộ trình tĩnh ── */
  function renderFlow(rmId) {
    var wrap = document.getElementById('rm-flow-wrap');
    if (!wrap) return;
    var meta = listMeta(rmId);
    var stages = normalize(rmId);
    _stages = stages; _stagesFor = rmId;

    if (!stages.length) {
      hideHeader();
      wrap.innerHTML = '<div class="rm-flow-empty">Chưa có dữ liệu cho lộ trình này.</div>';
      renderStatsPill({ done: 0, active: 0, locked: 0 });
      return;
    }
    var p = progressOf(rmId, stages);
    renderHeader({
      emoji: meta ? meta.emoji : '🧭',
      title: meta ? meta.name : rmId,
      desc: meta ? meta.desc : '',
      stages: stages,
      progress: p
    });
    wrap.innerHTML = buildTrackHtml(rmId, stages);
    renderStatsPill(p);
    ensureAsyncData(rmId);
  }

  /* Nạp dữ liệu bất đồng bộ (tiến độ khóa học + done từ server) đúng 1 lần,
     xong thì render lại tab nếu user vẫn đang xem. */
  function ensureAsyncData(rmId) {
    var need = [];
    if (!_enrolledReady) need.push(fetchEnrolled());
    if (!_serverDone[rmId]) need.push(fetchServerDone(rmId));
    if (!need.length) return;
    Promise.all(need).then(function () {
      if (getActive() === rmId) renderFlow(rmId);
    });
  }

  function hideHeader() {
    var el = document.getElementById('rm-head');
    if (el) el.style.display = 'none';
  }

  function renderStatsPill(p) {
    var pill = document.getElementById('rm-stats-pill');
    if (!pill) return;
    pill.innerHTML =
      '<span class="rm-stat-item"><span class="rm-stat-dot rm-stat-dot--done"></span><b>' + p.done + '</b> Đã học</span>' +
      '<span class="rm-stat-item"><span class="rm-stat-dot rm-stat-dot--active"></span><b>' + p.active + '</b> Đang học</span>' +
      '<span class="rm-stat-item"><span class="rm-stat-dot rm-stat-dot--locked"></span><b>' + p.locked + '</b> Chưa học</span>';
  }

  /* ══════════════ TAB "LỘ TRÌNH CỦA TÔI" (từ khảo sát) ══════════════ */
  var _myRoadmapPromise = null;
  function fetchMyRoadmap() {
    if (!_myRoadmapPromise) {
      _myRoadmapPromise = fetch('/api/me/roadmap', { credentials: 'include' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          window._myRoadmapCache = data && data.mermaid_def ? data : null;
          return window._myRoadmapCache;
        })
        .catch(function () {
          // Lỗi mạng (backend chưa dậy / offline) KHÔNG cache — lần gọi sau thử lại.
          _myRoadmapPromise = null;
          return null;
        });
    }
    return _myRoadmapPromise;
  }

  function renderGeneratedRoadmap(apiData) {
    window._generatedRoadmapData = apiData;
    var wrap = document.getElementById('rm-flow-wrap');
    if (!wrap) return;
    var nodesObj = apiData.nodes || {};
    var nodeIds = sortNodeIds(Object.keys(nodesObj));
    if (!nodeIds.length) {
      hideHeader();
      wrap.innerHTML = '<div class="rm-flow-empty">Bạn chưa có chặng nào. Dùng tab <b>Tùy chỉnh</b> để tự dựng lộ trình của riêng bạn.</div>';
      renderStatsPill({ done: 0, active: 0, locked: 0 });
      return;
    }
    var stages = nodeIds.map(function (nid) {
      var d = nodesObj[nid] || {};
      return {
        id: nid,
        title: d.title || nid,
        desc: '',                 // desc của node sinh ra là HTML → chỉ hiện trong drawer
        html: d.desc || '',
        topics: [],
        course: d.course_id || null,
        res: []
      };
    });
    _stages = stages; _stagesFor = MY_TAB;

    var p = progressOf(MY_TAB, stages);
    renderHeader({
      emoji: apiData.icon || '🎯',
      badge: '✨ Dựa trên khảo sát của bạn',
      title: apiData.title || 'Lộ trình của tôi',
      desc: 'Chuỗi chặng học được gợi ý riêng cho mục tiêu bạn đã khai trong bộ khảo sát.',
      stages: stages,
      progress: p
    });
    wrap.innerHTML = buildTrackHtml(MY_TAB, stages);
    renderStatsPill(p);
    if (window.mountIcons) mountIcons(wrap);
  }

  /* ══════════════ CHUYỂN TAB ══════════════ */
  window.roadmapSelectTab = function (id) {
    setActive(id);
    renderTabs();
    var flowScroll = document.querySelector('.rm-flow-scroll');
    var statsPill = document.getElementById('rm-stats-pill');
    var personalView = document.getElementById('roadmap-personal-view');

    if (id === CUSTOM_TAB) {
      hideHeader();
      if (flowScroll) flowScroll.style.display = 'none';
      if (statsPill) statsPill.style.display = 'none';
      if (personalView) personalView.style.display = 'flex';
      if (window._rmPersonalLoaded && typeof _rmVInitCanvas === 'function') {
        _rmVInitCanvas();
        _rmVRender();
      } else if (typeof loadPersonalRoadmap === 'function') {
        loadPersonalRoadmap();
      }
      return;
    }

    if (flowScroll) flowScroll.style.display = '';
    if (personalView) personalView.style.display = 'none';
    if (statsPill) statsPill.style.display = '';

    if (id === MY_TAB) {
      // GUARD: nếu user đổi tab trước khi fetch xong, callback phải bỏ qua.
      // fetchServerDone(MY_TAB) đi kèm: roadmapSetStatus PUSH tiến độ tay của
      // tab này lên server dưới roadmap_id '__my__', nên cũng phải NẠP lại,
      // không thì đánh dấu xong đổi tab quay về là mất.
      var requested = id;
      Promise.all([fetchMyRoadmap(), fetchEnrolled(), fetchServerDone(MY_TAB)]).then(function (results) {
        if (getActive() !== requested) return;
        var data = results[0];
        if (data) {
          renderGeneratedRoadmap(data);
        } else {
          hideHeader();
          // QUAN TRỌNG: ghi vào #rm-flow-wrap, KHÔNG PHẢI .rm-flow-scroll —
          // flowScroll là container cha chứa cả #rm-head lẫn #rm-flow-wrap,
          // ghi đè innerHTML của nó sẽ XÓA 2 element con này khỏi DOM.
          var emptyWrap = document.getElementById('rm-flow-wrap');
          if (emptyWrap) {
            emptyWrap.innerHTML = '<div class="rm-flow-empty">Bạn chưa có lộ trình gợi ý nào. ' +
              'Hãy <a href="/questionaire">hoàn thành bộ khảo sát</a> để nhận lộ trình phù hợp.</div>';
          }
          renderStatsPill({ done: 0, active: 0, locked: 0 });
        }
      });
      return;
    }

    renderFlow(id);
  };

  /* ══════════════ DRAWER CHI TIẾT ══════════════ */
  function courseButtonHtml(courseId, label) {
    return '<button type="button" class="rm-course-btn" onclick="window.location.href=\'/courses/' + escHtmlR(courseId) + '\'">' +
      '<span data-icon="graduation-cap" data-size="15"></span> ' + (label || 'Xem khóa học') + '</button>';
  }

  function courseProgressHtml(courseId) {
    var c = findEnrolled(courseId);
    if (!c) {
      return '<div class="rm-drawer-course rm-drawer-course--new">' +
        '<span class="rm-drawer-course-label">Bạn chưa đăng ký khóa học này</span>' +
        '</div>' + courseButtonHtml(courseId, 'Học ngay');
    }
    var pct = Math.min(c.progress || 0, 100);
    var doneLessons = c.completedLessons || 0;
    var total = c.totalLessons || c.lessons || 0;
    var btnLabel = pct >= 100 ? 'Xem lại khóa học' : 'Tiếp tục học';
    return '<div class="rm-drawer-course">' +
      '<div class="rm-drawer-course-head">' +
        '<span class="rm-drawer-course-label">' + escHtmlR(c.title || 'Khóa học') + '</span>' +
        '<span class="rm-drawer-course-pct">' + pct + '%</span>' +
      '</div>' +
      '<div class="rm-drawer-course-bar"><div class="rm-drawer-course-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="rm-drawer-course-meta">📖 ' + doneLessons + '/' + total + ' bài · ⏱ ' + escHtmlR(c.timeSpent || '0h') + '</div>' +
      '</div>' + courseButtonHtml(courseId, btnLabel);
  }

  function resourcesHtml(list) {
    return (list || []).map(function (r, i) {
      var rc = RES_CFG[r.type] || RES_CFG.article;
      var attrs;
      if (r.course_id) {
        attrs = 'href="#" onclick="event.preventDefault();window.location.href=\'/courses/' + escHtmlR(r.course_id) + '\'"';
      } else if (r.url) {
        attrs = 'href="' + escHtmlR(r.url) + '" target="_blank" rel="noopener noreferrer"';
      } else {
        attrs = 'href="#" onclick="event.preventDefault()"';
      }
      return '<a class="rm-res-item" ' + attrs + ' style="animation-delay:' + (i * 0.05) + 's">' +
        '<span class="rm-res-icon"><span data-icon="' + rc.icon + '" data-size="15"></span></span>' +
        '<span class="rm-res-body"><span class="rm-res-title">' + escHtmlR(r.title) + '</span>' +
        '<span class="rm-res-meta">' + rc.label + ' · ' + escHtmlR(r.source) + '</span></span>' +
        '<span data-icon="external-link" data-size="14"></span>' +
        '</a>';
    }).join('');
  }

  /* Fallback theo từ khoá — dùng cho node sinh từ khảo sát */
  function detailByLabel(label) {
    if (typeof ROADMAP_DETAILS === 'undefined') return null;
    var key = String(label).toLowerCase().trim().replace(/^\d+[.)]\s*/, '');
    return ROADMAP_DETAILS[key] || null;
  }

  window.roadmapOpenDrawer = function (rmId, stageId) {
    var drawer = document.getElementById('rm-drawer');
    var backdrop = document.getElementById('rm-drawer-backdrop');
    if (!drawer) return;

    var stages = stagesOf(rmId);
    var idx = -1;
    for (var i = 0; i < stages.length; i++) { if (stages[i].id === stageId) { idx = i; break; } }
    if (idx === -1) return;
    var stage = stages[idx];

    drawer.dataset.roadmap = rmId;
    drawer.dataset.stageId = stageId;

    var fallback = detailByLabel(stage.title);
    var courseId = stage.course || (fallback && fallback.course_id) || null;
    var status = getStatus(rmId, stage);

    document.getElementById('rm-drawer-step').textContent = 'Chặng ' + (idx + 1) + '/' + stages.length;
    document.getElementById('rm-drawer-title').textContent = stage.title;

    renderDrawerStatus(status, !!courseId);

    // Mô tả: HTML từ roadmap sinh sẵn > desc tĩnh > fallback từ khoá
    var descEl = document.getElementById('rm-drawer-desc');
    if (stage.html) descEl.innerHTML = stage.html;
    else descEl.textContent = stage.desc || (fallback && fallback.desc) ||
      'Chặng này chưa có mô tả chi tiết. Hãy tìm hiểu thêm về "' + stage.title + '" qua tài liệu chính thức.';

    // Chủ đề con — thay cho các node nhánh của bản cũ
    var topicsEl = document.getElementById('rm-drawer-topics');
    if ((stage.topics || []).length) {
      topicsEl.innerHTML = '<div class="rm-drawer-sec-label">Nội dung cần nắm</div>' +
        '<ul class="rm-drawer-topics">' + stage.topics.map(function (t) {
          return '<li>' + escHtmlR(t) + '</li>';
        }).join('') + '</ul>';
      topicsEl.style.display = '';
    } else {
      topicsEl.innerHTML = '';
      topicsEl.style.display = 'none';
    }

    // Tài nguyên + khối tiến độ khóa học
    var res = (stage.res && stage.res.length) ? stage.res : ((fallback && fallback.resources) || []);
    var resWrap = document.getElementById('rm-drawer-resources');
    var resHtml = res.length
      ? '<div class="rm-drawer-sec-label">Tài nguyên</div>' + resourcesHtml(res)
      : '';
    resWrap.innerHTML = resHtml + (courseId ? courseProgressHtml(courseId) : '');

    if (window.mountIcons) mountIcons(drawer);
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  };

  /* Chặng gắn khóa học: trạng thái tự đồng bộ, không cho toggle tay. */
  function renderDrawerStatus(status, isCourseStage) {
    var wrap = document.getElementById('rm-drawer-status');
    if (!wrap) return;
    var items = [
      { key: 'locked', label: 'Chưa học' },
      { key: 'active', label: 'Đang học' },
      { key: 'done', label: 'Đã học' }
    ];
    if (isCourseStage) {
      wrap.innerHTML =
        '<div class="rm-drawer-autonote">' +
        '<span class="rm-status-chip rm-status-chip--' + status + '">' + STATUS_LABEL[status] + '</span>' +
        '<span>Tự đồng bộ từ tiến độ khóa học trên nền tảng</span>' +
        '</div>';
      return;
    }
    wrap.innerHTML = items.map(function (it) {
      return '<button type="button" class="rm-status-btn rm-status-btn--' + it.key +
        (status === it.key ? ' active' : '') +
        '" onclick="window.roadmapSetStatus(\'' + it.key + '\')">' + it.label + '</button>';
    }).join('');
  }

  window.roadmapSetStatus = function (status) {
    var drawer = document.getElementById('rm-drawer');
    if (!drawer) return;
    var rmId = drawer.dataset.roadmap, stageId = drawer.dataset.stageId;
    setOverride(rmId + ':' + stageId, status);
    pushServerDone(rmId, stageId, status === 'done');
    renderDrawerStatus(status, false);
    if (rmId === MY_TAB) {
      if (window._generatedRoadmapData) renderGeneratedRoadmap(window._generatedRoadmapData);
    } else {
      renderFlow(rmId);
    }
  };

  window.roadmapCloseDrawer = function () {
    var drawer = document.getElementById('rm-drawer');
    var backdrop = document.getElementById('rm-drawer-backdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  };

  /* ══════════════ PANEL KHÁM PHÁ ══════════════ */
  window.roadmapOpenBrowse = function () {
    var grid = document.getElementById('rm-browse');
    var backdrop = document.getElementById('rm-browse-backdrop');
    renderBrowseList('');
    if (grid) grid.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    var input = document.getElementById('rm-browse-search');
    if (input) { input.value = ''; setTimeout(function () { input.focus(); }, 260); }
  };
  window.roadmapCloseBrowse = function () {
    var grid = document.getElementById('rm-browse');
    var backdrop = document.getElementById('rm-browse-backdrop');
    if (grid) grid.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  };
  window.roadmapBrowseSearch = function (q) { renderBrowseList(q); };

  /* Số chặng gắn khóa học trên nền tảng (đếm course_id duy nhất) */
  function countCourses(rmId) {
    var stages = (typeof ROADMAP_DATA !== 'undefined' && ROADMAP_DATA[rmId]) || [];
    var seen = {};
    stages.forEach(function (s) { if (s.course) seen[s.course] = 1; });
    return Object.keys(seen).length;
  }

  function renderBrowseList(query) {
    var list = document.getElementById('rm-browse-list');
    if (!list || typeof ROADMAP_LIST === 'undefined') return;
    var q = (query || '').toLowerCase().trim();
    var pinned = getPinned();
    var groups = {}, order = [];
    ROADMAP_LIST.forEach(function (r) {
      // Khớp cả tên nhóm: gõ "bảo mật" phải ra được Cyber Security dù mô tả
      // của nó không chứa đúng cụm từ đó.
      var hay = (r.name + ' ' + r.desc + ' ' + r.group).toLowerCase();
      if (q && hay.indexOf(q) < 0) return;
      if (!groups[r.group]) { groups[r.group] = []; order.push(r.group); }
      groups[r.group].push(r);
    });
    var html = order.map(function (g) {
      var cards = groups[g].map(function (r) {
        var isPinned = pinned.indexOf(r.id) !== -1;
        var nCourses = countCourses(r.id);
        var nStages = ((typeof ROADMAP_DATA !== 'undefined' && ROADMAP_DATA[r.id]) || []).length;
        return '<div class="rm-browse-card' + (isPinned ? ' is-pinned' : '') + '">' +
          '<button type="button" class="rm-browse-open" onclick="window.roadmapGoTo(\'' + esc(r.id) + '\')">' +
            '<span class="rm-browse-emoji">' + r.emoji + '</span>' +
            '<span class="rm-browse-name">' + escHtmlR(r.name) + '</span>' +
          '</button>' +
          '<button type="button" class="rm-browse-pin' + (isPinned ? ' active' : '') +
            '" title="' + (isPinned ? 'Bỏ ghim' : 'Ghim lên tab bar') + '"' +
            ' onclick="window.roadmapTogglePin(\'' + esc(r.id) + '\')">' + (isPinned ? '✓' : '+') + '</button>' +
          '<p class="rm-browse-desc">' + escHtmlR(r.desc) + '</p>' +
          '<div class="rm-browse-meta">' +
            '<span class="rm-browse-tag">' + nStages + ' chặng</span>' +
            (nCourses ? '<span class="rm-browse-tag rm-browse-tag--course">📚 ' + nCourses + ' khóa học</span>' : '') +
          '</div>' +
          '</div>';
      }).join('');
      return '<div class="rm-browse-group-label">' + escHtmlR(g) + '</div><div class="rm-browse-grid">' + cards + '</div>';
    }).join('');
    list.innerHTML = html || '<div class="rm-flow-empty">Không tìm thấy lộ trình phù hợp.</div>';
  }

  /* Mở lộ trình mà không cần ghim */
  window.roadmapGoTo = function (rmId) {
    var pinned = getPinned();
    if (pinned.indexOf(rmId) === -1) {
      pinned.push(rmId);
      setPinned(pinned);
    }
    window.roadmapSelectTab(rmId);
    window.roadmapCloseBrowse();
  };

  window.roadmapTogglePin = function (rmId) {
    var pinned = getPinned();
    var idx = pinned.indexOf(rmId);
    var wasUnpinned = idx === -1;
    if (wasUnpinned) pinned.push(rmId); else pinned.splice(idx, 1);
    setPinned(pinned);
    renderTabs();
    var searchInput = document.getElementById('rm-browse-search');
    renderBrowseList(searchInput ? searchInput.value : '');
    // Vừa bỏ ghim đúng tab đang xem → chuyển về tab đầu tiên còn lại
    if (!wasUnpinned && getActive() === rmId) {
      window.roadmapSelectTab(getPinned()[0] || CUSTOM_TAB);
    }
  };

  /* ══════════════ ENTRY POINT ══════════════ */
  window.initRoadmapPage = function () {
    // Render ngay tab hiện có — không chờ fetch, tránh màn hình trống khi
    // Neon DB cold-start (có thể mất vài giây để phản hồi).
    renderTabs();
    window.roadmapSelectTab(getActive());
    fetchEnrolled();

    // Có roadmap gợi ý từ khảo sát → ghim tab "Lộ trình của tôi"; chỉ tự nhảy
    // vào đó ĐÚNG MỘT LẦN, các lần sau tôn trọng tab user đang chọn.
    fetchMyRoadmap().then(function (data) {
      if (!data) return;
      var pinned = getPinned();
      if (pinned.indexOf(MY_TAB) === -1) {
        pinned.unshift(MY_TAB);
        setPinned(pinned);
      }
      var alreadySeen = localStorage.getItem(LS_SEEN_GENERATED) === '1';
      if (!alreadySeen) {
        localStorage.setItem(LS_SEEN_GENERATED, '1');
        setActive(MY_TAB);
        renderTabs();
        window.roadmapSelectTab(MY_TAB);
      } else {
        renderTabs();
        if (getActive() === MY_TAB) renderGeneratedRoadmap(data);
      }
    });
  };
})();
