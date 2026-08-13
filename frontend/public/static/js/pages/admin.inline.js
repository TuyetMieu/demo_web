    let editCourseId = null;   // null = đang tạo mới
    let editLessonId = null;
    let activeCourse = null;   // course_id đang xem bài giảng

    function toast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg; t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    }

    async function api(url, opts) {
      const res = await fetch(url, opts);
      let data = {};
      try { data = await res.json(); } catch (e) {}
      if (!res.ok) throw new Error(data.error || 'Lỗi không xác định');
      return data;
    }

    // ───── Khóa học ─────
    async function loadCourses() {
      const { courses } = await api('/api/admin/courses');
      const tb = document.getElementById('courseRows');
      tb.innerHTML = '';
      courses.forEach(c => {
        const tr = document.createElement('tr');
        tr.dataset.course = c.id;
        if (c.id === activeCourse) tr.classList.add('sel');
        tr.innerHTML = `
          <td>${esc(c.id)}</td>
          <td>${esc(c.title || '')}</td>
          <td>${c.lessons ?? 0}</td>
          <td style="white-space:nowrap">
            <button class="btn-ghost" onclick="editCourse(event, '${esc(c.id)}')">Sửa</button>
            <button class="btn-danger" onclick="delCourse(event, '${esc(c.id)}')">Xóa</button>
          </td>`;
        tr.onclick = () => selectCourse(c.id, c.title);
        tr.dataset.json = JSON.stringify(c);
        tb.appendChild(tr);
      });
    }

    async function saveCourse() {
      const body = {
        id: val('cId'), title: val('cTitle'), subtitle: val('cSubtitle'),
        description: val('cDescription'), level: val('cLevel'),
        duration: val('cDuration'), tag: val('cTag'), image: val('cImage'),
        color: val('cColor'), accent_color: val('cAccentColor'),
      };
      try {
        if (editCourseId) {
          await api('/api/admin/courses/' + encodeURIComponent(editCourseId), {
            method: 'PUT', headers: json(), body: JSON.stringify(body)
          });
          toast('Đã cập nhật khóa học');
        } else {
          await api('/api/admin/courses', {
            method: 'POST', headers: json(), body: JSON.stringify(body)
          });
          toast('Đã thêm khóa học');
        }
        resetCourseForm();
        loadCourses();
      } catch (e) { toast(e.message); }
    }

    function editCourse(ev, id) {
      ev.stopPropagation();
      const tr = document.querySelector(`tr[data-course="${id}"]`);
      const c = JSON.parse(tr.dataset.json);
      editCourseId = id;
      document.getElementById('courseFormTitle').textContent = 'Sửa khóa học: ' + id;
      set('cId', c.id); document.getElementById('cId').disabled = true;
      set('cTitle', c.title); set('cSubtitle', c.subtitle); set('cDescription', c.description);
      set('cLevel', c.level); set('cDuration', c.duration); set('cTag', c.tag);
      set('cImage', c.image); set('cColor', c.color); set('cAccentColor', c.accent_color);
    }

    async function delCourse(ev, id) {
      ev.stopPropagation();
      if (!confirm('Xóa khóa học "' + id + '"? Toàn bộ bài giảng của khóa cũng bị xóa.')) return;
      try {
        await api('/api/admin/courses/' + encodeURIComponent(id), { method: 'DELETE' });
        toast('Đã xóa khóa học');
        if (activeCourse === id) clearLessons();
        loadCourses();
      } catch (e) { toast(e.message); }
    }

    function resetCourseForm() {
      editCourseId = null;
      document.getElementById('courseFormTitle').textContent = 'Thêm khóa học';
      document.getElementById('cId').disabled = false;
      ['cId','cTitle','cSubtitle','cDescription','cLevel','cDuration','cTag','cImage','cColor','cAccentColor']
        .forEach(id => set(id, ''));
    }

    // ───── Bài giảng ─────
    function selectCourse(id, title) {
      activeCourse = id;
      document.querySelectorAll('tr[data-course]').forEach(tr =>
        tr.classList.toggle('sel', tr.dataset.course === id));
      document.getElementById('lessonTitle').textContent = 'Bài giảng — ' + (title || id);
      document.getElementById('lessonHint').style.display = 'none';
      document.getElementById('lessonFormBox').style.display = 'block';
      resetLessonForm();
      loadLessons();
    }

    function clearLessons() {
      activeCourse = null;
      document.getElementById('lessonRows').innerHTML = '';
      document.getElementById('lessonTitle').textContent = 'Bài giảng';
      document.getElementById('lessonHint').style.display = 'block';
      document.getElementById('lessonFormBox').style.display = 'none';
    }

    async function loadLessons() {
      const { lessons } = await api('/api/admin/courses/' + encodeURIComponent(activeCourse) + '/lessons');
      const tb = document.getElementById('lessonRows');
      tb.innerHTML = '';
      lessons.forEach(l => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${l.sort_order ?? 0}</td>
          <td>${esc(l.module || '')}</td>
          <td>${esc(l.title || '')}</td>
          <td style="white-space:nowrap">
            <button class="btn-ghost" onclick="editLesson(${l.id})">Sửa</button>
            <button class="btn-danger" onclick="delLesson(${l.id})">Xóa</button>
          </td>`;
        tr.dataset.json = JSON.stringify(l);
        tb.appendChild(tr);
      });
    }

    async function saveLesson() {
      const body = {
        course_id: activeCourse, module: val('lModule'),
        title: val('lLessonTitle'), content: val('lContent'),
        sort_order: parseInt(val('lSort') || '0', 10),
      };
      try {
        if (editLessonId) {
          await api('/api/admin/lessons/' + editLessonId, {
            method: 'PUT', headers: json(), body: JSON.stringify(body)
          });
          toast('Đã cập nhật bài giảng');
        } else {
          await api('/api/admin/lessons', {
            method: 'POST', headers: json(), body: JSON.stringify(body)
          });
          toast('Đã thêm bài giảng');
        }
        resetLessonForm();
        loadLessons();
        loadCourses();
      } catch (e) { toast(e.message); }
    }

    function editLesson(id) {
      const tr = [...document.querySelectorAll('#lessonRows tr')]
        .find(t => JSON.parse(t.dataset.json).id === id);
      const l = JSON.parse(tr.dataset.json);
      editLessonId = id;
      document.getElementById('lessonFormTitle').textContent = 'Sửa bài giảng';
      set('lModule', l.module); set('lLessonTitle', l.title);
      set('lContent', l.content); set('lSort', l.sort_order ?? 0);
    }

    async function delLesson(id) {
      if (!confirm('Xóa bài giảng này?')) return;
      try {
        await api('/api/admin/lessons/' + id, { method: 'DELETE' });
        toast('Đã xóa bài giảng');
        loadLessons();
        loadCourses();
      } catch (e) { toast(e.message); }
    }

    function resetLessonForm() {
      editLessonId = null;
      document.getElementById('lessonFormTitle').textContent = 'Thêm bài giảng';
      ['lModule','lLessonTitle','lContent'].forEach(id => set(id, ''));
      set('lSort', '0');
    }

    // ───── Helpers ─────
    function val(id) { return document.getElementById(id).value.trim(); }
    function set(id, v) { document.getElementById(id).value = v == null ? '' : v; }
    function json() { return { 'Content-Type': 'application/json' }; }
    function esc(s) {
      return String(s).replace(/[&<>"']/g, m =>
        ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
    }

    loadCourses();
