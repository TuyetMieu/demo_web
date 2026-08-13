/* review_quiz.js — FE-06: Quiz ôn tập cấp khóa học (khối #review-quiz-block
   trong trang chi tiết khóa học). Backend: src/quizzes/quizzes.service.ts.

   HỢP ĐỒNG VỚI BACKEND (đọc thẳng từ quizzes.service.ts, bản trước sai cả ba):

   1. POST /courses/:id/quiz/generate  ->  { ok, quiz_id, questions }
      questions[i] = { index, question, options }
        · `index` là số THỨ TỰ TỪ 0, không phải `question_no`.
        · `options` là MẢNG CHUỖI, không phải [{id, text}].
      Bản trước đọc `q.question_no` (undefined) nên mọi radio cùng
      name="qundefined" — chọn câu này thì bỏ chọn câu kia, cả bài chỉ trả lời
      được ĐÚNG MỘT câu; và mỗi option hiện nhãn rỗng vì đọc `o.text`.
      Response cũng KHÔNG có `total` — phải lấy questions.length.

   2. POST /quizzes/:id/submit  <-  { answers }
      Backend chấm bằng `answers?.[i]` — tức MẢNG THEO VỊ TRÍ, phần tử là giá
      trị đáp án, so sánh chuỗi với `q.correct`. Bản trước gửi mảng object
      [{question_no, selected}] nên `answers[i]` là object, không khớp bao giờ
      → điểm luôn 0.

   3. Response chấm điểm: { ok, score, total, detail }
      detail[i] = { question, given, correct, is_correct, explanation }
      Bản trước đọc `result.review` (undefined) → .map() ném lỗi, màn hình kết
      quả KHÔNG BAO GIỜ hiện sau khi nộp. Cũng không có `percentage`,
      `question_no`, `your_answer`, `correct_answer`. */

let currentQuiz = null;

function _csrfHeader() {
  const meta = document.querySelector('meta[name=csrf-token]');
  return meta ? { 'X-CSRFToken': meta.content } : {};
}

/* Dữ liệu câu hỏi/option đến từ content_json — escape trước khi đưa vào innerHTML */
function _esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

async function startReviewQuiz(courseId) {
  const btn = document.querySelector('#quiz-idle .quiz-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang tạo quiz…'; }
  try {
    const res = await fetch(`/api/courses/${courseId}/quiz/generate`, {
      method: 'POST',
      headers: _csrfHeader()
    });
    const data = await res.json();
    if (!res.ok) {
      alert((window.__PE_errMsg ? window.__PE_errMsg(data.error) : data.error) || 'Không thể tạo quiz');
      return;
    }
    const questions = data.questions || [];
    currentQuiz = { id: data.quiz_id, total: questions.length, answers: {} };
    renderQuizRunner(questions);
  } catch (e) {
    alert('Lỗi mạng, thử lại sau.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Bắt đầu ôn tập'; }
  }
}

function renderQuizRunner(questions) {
  document.getElementById('quiz-idle').style.display = 'none';
  const runner = document.getElementById('quiz-runner');
  runner.style.display = 'block';
  runner.innerHTML = questions.map((q, i) => {
    // `index` từ backend là chuẩn; nếu thiếu thì lấy vị trí trong mảng
    const no = q.index != null ? q.index : i;
    return `
    <div class="quiz-q" data-no="${no}">
      <p class="quiz-q-text">${no + 1}. ${_esc(q.question)}</p>
      ${(q.options || []).map(opt => `
        <label class="quiz-opt">
          <input type="radio" name="q${no}" value="${_esc(opt)}"
                 onchange="setAnswer(${no}, this.value)"> ${_esc(opt)}
        </label>`).join('')}
    </div>`;
  }).join('') +
    `<button type="button" class="quiz-btn primary" id="quiz-submit-btn" onclick="submitReviewQuiz()">Nộp bài</button>`;
  runner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setAnswer(qno, selected) { currentQuiz.answers[qno] = selected; }

async function submitReviewQuiz() {
  const answered = Object.keys(currentQuiz.answers).length;
  if (answered < currentQuiz.total &&
      !confirm(`Bạn mới trả lời ${answered}/${currentQuiz.total} câu. Nộp luôn?`)) {
    return;
  }
  const btn = document.getElementById('quiz-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang chấm…'; }
  // Mảng THEO VỊ TRÍ: answers[i] là đáp án của câu thứ i (backend: answers?.[i]).
  // Câu bỏ trống để null — backend coi null là sai, không tính điểm.
  const answers = [];
  for (let i = 0; i < currentQuiz.total; i++) {
    answers.push(currentQuiz.answers[i] != null ? currentQuiz.answers[i] : null);
  }
  try {
    const res = await fetch(`/api/quizzes/${currentQuiz.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ..._csrfHeader() },
      body: JSON.stringify({ answers })
    });
    const data = await res.json();
    if (!res.ok) {
      alert((window.__PE_errMsg ? window.__PE_errMsg(data.error) : data.error) || 'Nộp bài thất bại');
      if (btn) { btn.disabled = false; btn.textContent = 'Nộp bài'; }
      return;
    }
    renderQuizResult(data);
  } catch (e) {
    alert('Lỗi mạng, thử lại sau.');
    if (btn) { btn.disabled = false; btn.textContent = 'Nộp bài'; }
  }
}

function renderQuizResult(result) {
  const runner = document.getElementById('quiz-runner');
  const detail = result.detail || result.review || [];
  const total = result.total || detail.length || 0;
  const pct = total ? Math.round((result.score / total) * 100) : 0;
  runner.innerHTML = `
    <p class="quiz-score">Điểm: ${result.score}/${total} (${pct}%)</p>
    ${detail.map((r, i) => `
      <div class="quiz-review-item ${r.is_correct ? 'correct' : 'wrong'}">
        <p class="quiz-q-text">${i + 1}. ${_esc(r.question)}</p>
        <p>Bạn chọn: <b>${r.given != null ? _esc(r.given) : '(bỏ trống)'}</b>
           — Đáp án đúng: <b>${_esc(r.correct)}</b></p>
        ${r.explanation ? `<p class="quiz-explain">${_esc(r.explanation)}</p>` : ''}
      </div>`).join('')}
    <button type="button" class="quiz-btn secondary" onclick="location.reload()">Làm lại từ đầu</button>`;
}
