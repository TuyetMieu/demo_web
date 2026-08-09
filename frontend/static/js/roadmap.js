/* ══════════════════════════════════════════════════
   ROADMAP — Định hướng học tập theo khóa học trên nền tảng.
   Danh mục lộ trình tĩnh (ROADMAP_LIST/ROADMAP_DATA/ROADMAP_DETAILS
   trong roadmapData.js). Trạng thái node:
   · Chặng gắn khóa học (section.course) → TỰ ĐỘNG suy từ tiến độ
     thật (/api/enrolled): đang học → active, 100% → done.
   · Node kỹ năng bổ trợ → user tự đánh dấu; lưu localStorage (tri-state)
     và đồng bộ "done" lên server qua /api/roadmap (roadmap_progress).
   Roadmap cá nhân (canvas kéo-thả) giữ nguyên ở main.js.
   ══════════════════════════════════════════════════ */
(function () {
  var LS_PINNED = 'roadmap_pinned_v2';
  var LS_ACTIVE = 'roadmap_active_v2';
  var LS_PROGRESS = 'roadmap_progress_v3';
  var LS_SEEN_GENERATED = 'roadmap_generated_seen_v1';
  var DEFAULT_PINNED = ['Frontend Web', 'Python & AI'];
  var MY_ROADMAP_TAB = 'Lộ trình của tôi';

  function listMeta(name) {
    return (typeof ROADMAP_LIST !== 'undefined')
      ? ROADMAP_LIST.find(function (r) { return r.name === name; })
      : null;
  }
  /* Slug ổn định làm roadmap_id khi lưu tiến độ lên server */
  function roadmapSlug(name) {
    var meta = listMeta(name);
    return meta ? meta.id : null;
  }
  function isValidTab(name) {
    return name === 'personal' || name === MY_ROADMAP_TAB || !!listMeta(name);
  }

  function getPinned() {
    var v = null;
    try { v = JSON.parse(localStorage.getItem(LS_PINNED)); } catch (e) { /* noop */ }
    if (!Array.isArray(v)) v = DEFAULT_PINNED.slice();
    // Lọc tên lộ trình cũ không còn tồn tại (đổi danh mục giữa các phiên bản)
    v = v.filter(isValidTab);
    return v.length ? v : DEFAULT_PINNED.slice();
  }
  function setPinned(arr) { localStorage.setItem(LS_PINNED, JSON.stringify(arr)); }
  function getActive() {
    var name = localStorage.getItem(LS_ACTIVE);
    if (name && isValidTab(name)) return name;
    return getPinned()[0] || DEFAULT_PINNED[0];
  }
  function setActive(name) { localStorage.setItem(LS_ACTIVE, name); }
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
          // Không ghi đè nếu main.js đã nạp dữ liệu mới hơn
          if (!window.enrolledCourses || !window.enrolledCourses.length) {
            window.enrolledCourses = data || [];
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
     Server chỉ lưu boolean done; trạng thái 'active' chỉ nằm ở localStorage. */
  var _serverDone = {};        // slug -> mảng item_id đã done
  var _serverDonePromise = {}; // slug -> promise fetch (chống gửi trùng)
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

  /* ── Trạng thái hiệu lực của 1 node ──
     Ưu tiên: tiến độ khóa học thật > đánh dấu tay (local) > done từ server > mặc định. */
  function getStatus(name, node) {
    if (node.course) {
      var cs = courseStatus(node.course);
      if (cs) return cs;
    }
    var ov = getOverrides()[name + ':' + node.id];
    if (ov) return ov;
    var slug = roadmapSlug(name);
    if (slug && _serverDone[slug] && _serverDone[slug].indexOf(node.id) !== -1) return 'done';
    return node.status || 'locked';
  }

  var SC = {
    done:   { mainBg: '#0E2A20', childBg: 'rgba(16,185,129,0.16)', stroke: '#10B981', mainText: '#6EE7B7', childText: '#34D399' },
    active: { mainBg: '#0E2138', childBg: 'rgba(59,130,246,0.18)', stroke: '#3B82F6', mainText: '#93C5FD', childText: '#60A5FA' },
    locked: { mainBg: '#101725', childBg: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.16)', mainText: '#CBD5E1', childText: '#64748B' }
  };
  var RES_CFG = {
    article: { icon: 'file-text', label: 'Bài viết', color: '#60A5FA' },
    video:   { icon: 'youtube', label: 'Video', color: '#F87171' },
    course:  { icon: 'graduation-cap', label: 'Khóa học', color: '#A78BFA' },
    docs:    { icon: 'book-open', label: 'Tài liệu', color: '#34D399' }
  };

  function escHtmlR(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }

  /* Sắp xếp node id theo số thứ tự thực (rm_2 < rm_10), không theo alphabet */
  function sortNodeIds(ids) {
    return ids.slice().sort(function (a, b) {
      var na = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
      var nb = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
      return na - nb;
    });
  }

  function normalize(name) {
    var sections = (typeof ROADMAP_DATA !== 'undefined' && ROADMAP_DATA[name]) || [];
    function norm(raw) {
      if (Array.isArray(raw)) return { label: raw[0], status: raw[1] };
      return { label: raw, status: 'locked' };
    }
    return sections.map(function (sec, i) {
      var main = norm(sec.main);
      var left = (sec.left || []).map(norm);
      var right = (sec.right || []).map(norm);
      return {
        main: Object.assign({ id: i + '-m', course: sec.course || null }, main),
        left: left.map(function (n, j) { return Object.assign({ id: i + '-l' + j }, n); }),
        right: right.map(function (n, j) { return Object.assign({ id: i + '-r' + j }, n); })
      };
    });
  }

  /* ── Tab bar ── */
  function renderTabs() {
    var bar = document.getElementById('rm-tabbar');
    if (!bar) return;
    var pinned = getPinned();
    var active = getActive();
    var html = pinned.map(function (name) {
      var meta = listMeta(name);
      var isActive = active === name;
      return '<button type="button" class="rm-tab' + (isActive ? ' active' : '') + '" onclick="window.roadmapSelectTab(\'' + esc(name) + '\')">' +
        (meta ? meta.emoji + ' ' : '') + escHtmlR(name) + '</button>';
    }).join('');
    html += '<button type="button" class="rm-tab' + (active === 'personal' ? ' active' : '') + '" onclick="window.roadmapSelectTab(\'personal\')">✏️ Cá nhân</button>';
    html += '<span class="rm-tab-divider"></span>';
    html += '<button type="button" class="rm-tab-plus" onclick="window.roadmapOpenBrowse()" aria-label="Thêm lộ trình"><span data-icon="plus" data-size="14"></span></button>';
    bar.innerHTML = html;
    if (window.mountIcons) mountIcons(bar);
  }

  /* ── Node box ── */
  function nodeBoxHtml(name, node, kind) {
    var status = getStatus(name, node);
    var c = SC[status] || SC.locked;
    var cls = 'rm-node rm-node--' + kind + ' rm-node--' + status;
    var onclick = "window.roadmapOpenDrawer('" + esc(name) + "','" + node.id + "','" + esc(node.label) + "','" + (node.course || '') + "')";
    if (kind === 'main') {
      // Chip 📚: chặng gắn khóa học trên nền tảng — tiến độ tự đồng bộ
      var chip = node.course
        ? '<span class="rm-node-chip" title="Có khóa học trên nền tảng — tiến độ tự đồng bộ">📚</span>'
        : '';
      return '<button type="button" class="' + cls + (node.course ? ' rm-node--course' : '') + '" style="background:' + c.mainBg + ';border-color:' + c.stroke + ';color:' + c.mainText + '" onclick="' + onclick + '">' + escHtmlR(node.label) + chip + '</button>';
    }
    var dotHtml = status === 'done'
      ? '<span class="rm-node-dot rm-node-dot--done">' + (window.Icon ? Icon('check', 9, '#fff') : '') + '</span>'
      : '<span class="rm-node-dot rm-node-dot--' + status + '"></span>';
    return '<button type="button" class="' + cls + '" style="background:' + c.childBg + ';border-color:' + c.stroke + ';color:' + c.childText + '" onclick="' + onclick + '">' + escHtmlR(node.label) + dotHtml + '</button>';
  }

  /* ── HTML cho danh sách section (spine + main + nhánh trái/phải) — dùng chung
     bởi renderFlow (roadmap tĩnh) và renderGeneratedRoadmap (roadmap cá nhân) ── */
  function buildSectionsHtml(name, sections) {
    return sections.map(function (sec) {
      var leftHtml = sec.left.length
        ? '<div class="rm-branch rm-branch--left">' + sec.left.map(function (n) { return nodeBoxHtml(name, n, 'child'); }).join('') + '</div><div class="rm-dash rm-dash--right"></div>'
        : '';
      var rightHtml = sec.right.length
        ? '<div class="rm-dash rm-dash--left"></div><div class="rm-branch rm-branch--right">' + sec.right.map(function (n) { return nodeBoxHtml(name, n, 'child'); }).join('') + '</div>'
        : '';
      return '<div class="rm-section">' +
        '<div class="rm-section-left">' + leftHtml + '</div>' +
        '<div class="rm-section-main">' + nodeBoxHtml(name, sec.main, 'main') + '</div>' +
        '<div class="rm-section-right">' + rightHtml + '</div>' +
        '</div>';
    }).join('');
  }

  /* ── Header cá nhân hoá cho tab "Lộ trình của tôi" ── */
  function renderMyHeader(apiData, sections) {
    var el = document.getElementById('rm-my-header');
    if (!el) return;
    var done = 0;
    sections.forEach(function (sec) {
      if (getStatus(MY_ROADMAP_TAB, sec.main) === 'done') done++;
    });
    var pct = sections.length ? Math.round((done / sections.length) * 100) : 0;
    el.innerHTML =
      '<div class="rm-my-header-icon">' + (apiData.icon || '🎯') + '</div>' +
      '<div class="rm-my-header-body">' +
        '<span class="rm-my-header-badge">✨ Dựa trên khảo sát của bạn</span>' +
        '<h3 class="rm-my-header-title">' + escHtmlR(apiData.title || 'Lộ trình của tôi') + '</h3>' +
        '<p class="rm-my-header-sub">' + sections.length + ' chặng học · Gợi ý riêng cho mục tiêu của bạn</p>' +
      '</div>' +
      '<div class="rm-my-header-progress">' +
        '<span class="rm-my-header-pct">' + pct + '%</span>' +
        '<div class="rm-my-header-bar"><div class="rm-my-header-bar-fill" style="width:' + pct + '%"></div></div>' +
      '</div>';
    el.style.display = 'flex';
  }

  function hideMyHeader() {
    var el = document.getElementById('rm-my-header');
    if (el) el.style.display = 'none';
  }

  /* Fetch '/api/me/roadmap' đúng 1 lần cho cả vòng đời trang — mọi nơi cần
     dữ liệu (initRoadmapPage, roadmapSelectTab) đều dùng chung promise này,
     tránh gửi trùng request khi cả 2 cùng cần dữ liệu lúc mới vào trang. */
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
          // Lỗi mạng (backend chưa dậy / offline) KHÔNG cache — lần gọi sau
          // (mở lại tab, initRoadmapPage) thử lại thay vì kẹt null vĩnh viễn.
          _myRoadmapPromise = null;
          return null;
        });
    }
    return _myRoadmapPromise;
  }

  /* ── Render roadmap generated từ API (tab "Lộ trình của tôi") ──
     Tái sử dụng cấu trúc spine+section giống các roadmap tĩnh khác,
     nhưng mỗi chặng chỉ có 1 node chính (không rẽ nhánh trái/phải) vì
     đây là chuỗi tuần tự theo đúng thứ tự học. Node có course_id (từ
     nodes_json) cũng tự đồng bộ tiến độ khóa học như roadmap tĩnh. ── */
  function renderGeneratedRoadmap(apiData) {
    window._generatedRoadmapData = apiData;
    var wrap = document.getElementById('rm-flow-wrap');
    if (!wrap) return;
    var nodesObj = apiData.nodes || {};
    var nodeIds = sortNodeIds(Object.keys(nodesObj));
    if (!nodeIds.length) {
      hideMyHeader();
      wrap.innerHTML = '<div class="rm-flow-empty">Bạn chưa có node nào. Sử dụng phần "Cá nhân" để tạo lộ trình của riêng bạn.</div>';
      renderStatsPill(MY_ROADMAP_TAB, []);
      return;
    }
    var sections = nodeIds.map(function (nid) {
      var nodeData = nodesObj[nid] || {};
      var node = { id: nid, label: nodeData.title || nid, status: 'locked', course: nodeData.course_id || null };
      return { main: node, left: [], right: [] };
    });
    renderMyHeader(apiData, sections);
    wrap.innerHTML = '<div class="rm-spine"></div>' + buildSectionsHtml(MY_ROADMAP_TAB, sections);
    renderStatsPill(MY_ROADMAP_TAB, sections);
    if (window.mountIcons) mountIcons(wrap);
  }

  /* ── Flow chính (roadmap tĩnh) ── */
  function renderFlow(name) {
    hideMyHeader();
    var wrap = document.getElementById('rm-flow-wrap');
    if (!wrap) return;
    var sections = normalize(name);
    if (!sections.length) {
      wrap.innerHTML = '<div class="rm-flow-empty">Chưa có dữ liệu cho lộ trình này.</div>';
      renderStatsPill(name, []);
      return;
    }
    wrap.innerHTML = '<div class="rm-spine"></div>' + buildSectionsHtml(name, sections);
    renderStatsPill(name, sections);
    ensureAsyncData(name);
  }

  /* Nạp dữ liệu bất đồng bộ (tiến độ khóa học + done từ server) đúng 1 lần,
     xong thì render lại tab nếu user vẫn đang xem — các lần render sau
     dữ liệu đã có sẵn trong cache nên không lặp. */
  function ensureAsyncData(name) {
    var need = [];
    if (!_enrolledReady) need.push(fetchEnrolled());
    var slug = roadmapSlug(name);
    if (slug && !_serverDone[slug]) need.push(fetchServerDone(slug));
    if (!need.length) return;
    Promise.all(need).then(function () {
      if (getActive() === name) renderFlow(name);
    });
  }

  function renderStatsPill(name, sections) {
    var pill = document.getElementById('rm-stats-pill');
    if (!pill) return;
    var done = 0, active = 0, locked = 0;
    (sections || []).forEach(function (sec) {
      [sec.main].concat(sec.left, sec.right).forEach(function (n) {
        var st = getStatus(name, n);
        if (st === 'done') done++; else if (st === 'active') active++; else locked++;
      });
    });
    pill.innerHTML =
      '<span class="rm-stat-item"><span class="rm-stat-dot" style="background:#10B981"></span><b style="color:#10B981">' + done + '</b> Đã học</span>' +
      '<span class="rm-stat-item"><span class="rm-stat-dot" style="background:#3B82F6"></span><b style="color:#3B82F6">' + active + '</b> Đang học</span>' +
      '<span class="rm-stat-item"><span class="rm-stat-dot" style="background:#64748B"></span><b style="color:#64748B">' + locked + '</b> Chưa học</span>';
  }

  /* ── Chuyển tab ── */
  window.roadmapSelectTab = function (name) {
    setActive(name);
    renderTabs();
    var flowScroll = document.querySelector('.rm-flow-scroll');
    var statsPill = document.getElementById('rm-stats-pill');
    var personalView = document.getElementById('roadmap-personal-view');
    if (name === MY_ROADMAP_TAB) {
      // Render roadmap generated từ API. Lưu ý: .rm-flow-scroll là block
      // container bình thường (header + flow-wrap xếp DỌC) — không phải flex.
      if (flowScroll) flowScroll.style.display = '';
      if (personalView) personalView.style.display = 'none';
      if (statsPill) statsPill.style.display = 'flex';
      // GUARD: capture tab được yêu cầu — nếu user chuyển sang tab khác trước
      // khi fetch xong, callback phải bỏ qua, KHÔNG được ghi đè nội dung tab hiện tại.
      var requestedTab = name;
      Promise.all([fetchMyRoadmap(), fetchEnrolled()]).then(function (results) {
        if (getActive() !== requestedTab) return; // tab đã đổi, không ghi đè
        var data = results[0];
        if (data) {
          renderGeneratedRoadmap(data);
        } else {
          hideMyHeader();
          // QUAN TRỌNG: ghi vào #rm-flow-wrap, KHÔNG PHẢI .rm-flow-scroll —
          // flowScroll là container cha chứa cả #rm-my-header lẫn #rm-flow-wrap,
          // ghi đè innerHTML của nó sẽ XÓA VĨNH VIỄN 2 element con này khỏi DOM,
          // khiến các tab khác không tìm thấy #rm-flow-wrap để render nữa
          // (getElementById trả null) — nội dung "trống" bị dính lại mọi tab.
          var emptyWrap = document.getElementById('rm-flow-wrap');
          if (emptyWrap) emptyWrap.innerHTML = '<div class="rm-flow-empty">Bạn chưa có lộ trình gợi ý nào. Hãy hoàn thành bộ khảo sát để nhận lộ trình phù hợp.</div>';
        }
      });
    } else if (name === 'personal') {
      hideMyHeader();
      if (flowScroll) flowScroll.style.display = 'none';
      if (statsPill) statsPill.style.display = 'none';
      if (personalView) personalView.style.display = 'flex';
      if (window._rmPersonalLoaded && typeof _rmVInitCanvas === 'function') {
        _rmVInitCanvas();
        _rmVRender();
      } else if (typeof loadPersonalRoadmap === 'function') {
        loadPersonalRoadmap();
      }
    } else {
      if (flowScroll) flowScroll.style.display = '';
      if (statsPill) statsPill.style.display = '';
      if (personalView) personalView.style.display = 'none';
      renderFlow(name);
    }
  };

  function courseButtonHtml(courseId, label) {
    return '<button type="button" class="rm-course-btn" onclick="window.location.href=\'/courses/' + escHtmlR(courseId) + '\'">' +
      '<span data-icon="graduation-cap" data-size="15"></span> ' + (label || 'Xem khóa học') + '</button>';
  }

  /* Khối tiến độ khóa học trong drawer (node gắn course) */
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

  /* ── Detail Drawer ── */
  window.roadmapOpenDrawer = function (name, nodeId, label, courseArg) {
    var drawer = document.getElementById('rm-drawer');
    var backdrop = document.getElementById('rm-drawer-backdrop');
    if (!drawer) return;
    drawer.dataset.roadmap = name;
    drawer.dataset.nodeId = nodeId;
    drawer.dataset.label = label;
    document.getElementById('rm-drawer-title').textContent = label;

    // Key tra ROADMAP_DETAILS: bỏ số thứ tự "1. " ở đầu label
    var key = String(label).toLowerCase().trim().replace(/^\d+[.)]\s*/, '');
    var detail = (typeof ROADMAP_DETAILS !== 'undefined') ? ROADMAP_DETAILS[key] : null;
    var descEl = document.getElementById('rm-drawer-desc');
    var resWrap = document.getElementById('rm-drawer-resources');

    // course_id: node tĩnh (section.course) > node generated (nodes_json) > detail
    var courseId = courseArg || null;
    var genDesc = null;
    if (name === MY_ROADMAP_TAB && window._generatedRoadmapData) {
      var nodeData = window._generatedRoadmapData.nodes && window._generatedRoadmapData.nodes[nodeId];
      if (nodeData) {
        courseId = courseId || nodeData.course_id;
        genDesc = nodeData.desc;
      }
    }
    if (!courseId && detail) courseId = detail.course_id;

    var status = getStatus(name, { id: nodeId, course: courseId });
    renderDrawerStatus(status, !!courseId);

    // Ưu tiên desc từ nodes_json (roadmap generated) — desc là HTML phong phú
    if (genDesc) {
      descEl.innerHTML = genDesc;
      resWrap.innerHTML = courseId ? courseProgressHtml(courseId) : '';
    } else if (detail) {
      descEl.textContent = detail.desc;
      resWrap.innerHTML = (detail.resources || []).map(function (r, i) {
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
          '<span class="rm-res-icon" style="background:' + rc.color + '1A"><span data-icon="' + rc.icon + '" data-size="15" data-color="' + rc.color + '"></span></span>' +
          '<span class="rm-res-body"><span class="rm-res-title">' + escHtmlR(r.title) + '</span>' +
          '<span class="rm-res-meta"><span style="color:' + rc.color + ';font-weight:600">' + rc.label + '</span> · ' + escHtmlR(r.source) + '</span></span>' +
          '<span data-icon="external-link" data-size="14" data-color="#64748B"></span>' +
          '</a>';
      }).join('');
      // Node gắn khóa học → thêm khối tiến độ + nút học
      if (courseId) resWrap.innerHTML += courseProgressHtml(courseId);
    } else if (courseId) {
      descEl.textContent = 'Chặng này gắn với một khóa học trên nền tảng — hoàn thành khóa học để hoàn thành chặng.';
      resWrap.innerHTML = courseProgressHtml(courseId);
    } else {
      descEl.textContent = 'Chưa có mô tả chi tiết cho mục này. Hãy tự tìm hiểu thêm về "' + label + '" qua tài liệu chính thức hoặc khóa học liên quan.';
      resWrap.innerHTML = '';
    }
    if (window.mountIcons) mountIcons(resWrap);
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  };

  /* Node gắn khóa học: trạng thái tự đồng bộ, không cho toggle tay.
     Node kỹ năng bổ trợ: toggle 3 trạng thái như cũ. */
  function renderDrawerStatus(status, isCourseNode) {
    var wrap = document.getElementById('rm-drawer-status');
    if (!wrap) return;
    var items = [
      { key: 'locked', label: 'Chưa học', color: '#64748B' },
      { key: 'active', label: 'Đang học', color: '#3B82F6' },
      { key: 'done', label: 'Đã học', color: '#10B981' }
    ];
    if (isCourseNode) {
      var it = items.filter(function (x) { return x.key === status; })[0] || items[0];
      wrap.innerHTML =
        '<div class="rm-drawer-autonote">' +
        '<span class="rm-status-chip" style="background:' + it.color + '22;border-color:' + it.color + ';color:' + it.color + '">' + it.label + '</span>' +
        '<span>Tự đồng bộ từ tiến độ khóa học</span>' +
        '</div>';
      return;
    }
    wrap.innerHTML = items.map(function (it) {
      var isActive = status === it.key;
      return '<button type="button" class="rm-status-btn' + (isActive ? ' active' : '') + '" style="' +
        (isActive ? 'background:' + it.color + '22;border-color:' + it.color + ';color:' + it.color + ';' : '') +
        '" onclick="window.roadmapSetStatus(\'' + it.key + '\')">' + it.label + '</button>';
    }).join('');
  }

  window.roadmapSetStatus = function (status) {
    var drawer = document.getElementById('rm-drawer');
    if (!drawer) return;
    var name = drawer.dataset.roadmap, nodeId = drawer.dataset.nodeId;
    setOverride(name + ':' + nodeId, status);
    // Đồng bộ done lên server để giữ tiến độ qua thiết bị khác
    var slug = roadmapSlug(name);
    if (slug) pushServerDone(slug, nodeId, status === 'done');
    renderDrawerStatus(status, false);
    if (name === MY_ROADMAP_TAB) {
      if (window._generatedRoadmapData) renderGeneratedRoadmap(window._generatedRoadmapData);
    } else {
      renderFlow(name);
    }
  };

  window.roadmapCloseDrawer = function () {
    var drawer = document.getElementById('rm-drawer');
    var backdrop = document.getElementById('rm-drawer-backdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  };

  /* ── Browse grid ── */
  window.roadmapOpenBrowse = function () {
    var grid = document.getElementById('rm-browse');
    var backdrop = document.getElementById('rm-browse-backdrop');
    renderBrowseList('');
    if (grid) grid.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  };
  window.roadmapCloseBrowse = function () {
    var grid = document.getElementById('rm-browse');
    var backdrop = document.getElementById('rm-browse-backdrop');
    if (grid) grid.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  };
  window.roadmapBrowseSearch = function (q) { renderBrowseList(q); };

  /* Số khóa học trên nền tảng mà lộ trình đi qua (đếm course_id duy nhất) */
  function countCourses(name) {
    var sections = (typeof ROADMAP_DATA !== 'undefined' && ROADMAP_DATA[name]) || [];
    var seen = {};
    sections.forEach(function (sec) { if (sec.course) seen[sec.course] = 1; });
    return Object.keys(seen).length;
  }

  function renderBrowseList(query) {
    var list = document.getElementById('rm-browse-list');
    if (!list || typeof ROADMAP_LIST === 'undefined') return;
    var q = (query || '').toLowerCase().trim();
    var pinned = getPinned();
    var groups = {}, order = [];
    ROADMAP_LIST.forEach(function (r) {
      if (q && r.name.toLowerCase().indexOf(q) < 0 && r.desc.toLowerCase().indexOf(q) < 0) return;
      if (!groups[r.group]) { groups[r.group] = []; order.push(r.group); }
      groups[r.group].push(r);
    });
    var html = order.map(function (g) {
      var cards = groups[g].map(function (r) {
        var isPinned = pinned.indexOf(r.name) !== -1;
        var nCourses = countCourses(r.name);
        var badge = r.comingSoon
          ? ' <span class="rm-browse-soon">SẮP CÓ KHÓA HỌC</span>'
          : (r.isNew ? ' <span class="rm-browse-new">MỚI</span>' : '');
        var metaHtml = nCourses
          ? '<div class="rm-browse-meta">📚 ' + nCourses + ' khóa học trên nền tảng</div>'
          : (r.comingSoon ? '<div class="rm-browse-meta rm-browse-meta--soon">Lộ trình tham khảo — tự đánh dấu tiến độ</div>' : '');
        return '<div class="rm-browse-card">' +
          '<div class="rm-browse-card-hd"><span class="rm-browse-emoji">' + r.emoji + '</span>' +
          '<span class="rm-browse-name">' + escHtmlR(r.name) + badge + '</span>' +
          '<button type="button" class="rm-browse-pin' + (isPinned ? ' active' : '') + '" onclick="window.roadmapTogglePin(\'' + esc(r.name) + '\')">' + (isPinned ? '✓' : '+') + '</button>' +
          '</div>' +
          '<p class="rm-browse-desc">' + escHtmlR(r.desc) + '</p>' +
          metaHtml +
          '</div>';
      }).join('');
      return '<div class="rm-browse-group-label">' + escHtmlR(g) + '</div><div class="rm-browse-grid">' + cards + '</div>';
    }).join('');
    list.innerHTML = html || '<div class="rm-flow-empty">Không tìm thấy lộ trình phù hợp.</div>';
  }

  window.roadmapTogglePin = function (name) {
    var pinned = getPinned();
    var idx = pinned.indexOf(name);
    var wasUnpinned = idx === -1;
    if (wasUnpinned) pinned.push(name); else pinned.splice(idx, 1);
    setPinned(pinned);
    renderTabs();
    var searchInput = document.getElementById('rm-browse-search');
    renderBrowseList(searchInput ? searchInput.value : '');
    if (wasUnpinned) {
      window.roadmapSelectTab(name);
      window.roadmapCloseBrowse();
    }
  };

  /* ── Entry point — gọi từ navigate('roadmap') ── */
  window.initRoadmapPage = function () {
    // Render ngay tab hiện có — không chờ fetch, tránh màn hình trống khi
    // Neon DB cold-start (có thể mất vài giây để phản hồi).
    renderTabs();
    window.roadmapSelectTab(getActive());

    // Nạp trước tiến độ khóa học — render lại tab khi có dữ liệu (ensureAsyncData
    // trong renderFlow đã lo phần này cho tab tĩnh).
    fetchEnrolled();

    // Kiểm tra xem user đã có roadmap gợi ý từ khảo sát chưa. Nếu có VÀ đây
    // là lần đầu phát hiện (chưa từng "seen"), tự động ghim + chuyển vào tab
    // đó đúng 1 lần duy nhất — các lần load trang sau tôn trọng tab user
    // đang chọn, không tự ý nhảy tab.
    fetchMyRoadmap().then(function (data) {
      if (!data) return;

      var pinned = getPinned();
      if (pinned.indexOf(MY_ROADMAP_TAB) === -1) {
        pinned.unshift(MY_ROADMAP_TAB);
        setPinned(pinned);
      }

      var alreadySeen = localStorage.getItem(LS_SEEN_GENERATED) === '1';
      if (!alreadySeen) {
        localStorage.setItem(LS_SEEN_GENERATED, '1');
        setActive(MY_ROADMAP_TAB);
        renderTabs();
        window.roadmapSelectTab(MY_ROADMAP_TAB);
      } else {
        renderTabs();
        // Nếu tab đang mở đúng là "Lộ trình của tôi" (vd. lần load đầu đã
        // render placeholder rỗng vì fetch chưa xong), render lại với data thật.
        if (getActive() === MY_ROADMAP_TAB) renderGeneratedRoadmap(data);
      }
    });
  };
})();
