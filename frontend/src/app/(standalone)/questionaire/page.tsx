'use client';

// Port questionaire.html — markup 1:1, CSS: chỉ questionaire.css.
// Toàn bộ logic step/validate/submit nằm nguyên trong questionaire.js (legacy).

import PageStyles from '@/components/PageStyles';
import LegacyScripts from '@/components/LegacyScripts';

const SCRIPTS = ['/static/js/main.js', '/static/js/questionaire.js'];

export default function QuestionairePage() {
  return (
    <>
      <PageStyles hrefs={["/static/css/theme.css", "/static/css/questionaire.css", "/static/css/edu-theme.css", "/static/css/edu-forms.css"]} />
      <title>Khảo Sát Học Viên - Programming Edu</title>

      <div className="survey-container">
        <div className="tech-logo">
          <span className="logo-text">Programming EDU</span>
        </div>

        <div className="progress-container">
          <div className="progress-bar" id="progressBar"></div>
        </div>

        <form id="surveyForm">
          {/* ══════ BLOCK 1: BẠN LÀ AI ══════ */}

          {/* Q1 – Nghề nghiệp */}
          <div className="step active">
            <div className="question-block">
              <span className="step-count">Câu 1/10</span>
              <p className="question">1. Nghề nghiệp hiện tại của bạn là gì?</p>
              <label className="option"><input type="radio" name="job" value="Học sinh" /> Học sinh</label>
              <label className="option"><input type="radio" name="job" value="Sinh viên" /> Sinh viên</label>
              <label className="option"><input type="radio" name="job" value="Người đi làm" /> Người đi làm</label>
              <label className="option">
                <input type="radio" name="job" value="other" id="job_other" />
                Khác:
                <input type="text" id="job_text" className="custom-text-input" placeholder="Nhập nghề nghiệp..." disabled />
              </label>
            </div>
            <div className="btn-group">
              <button type="button" className="next-btn">Tiếp tục</button>
            </div>
          </div>

          {/* Q2 – Mục đích học */}
          <div className="step">
            <div className="question-block">
              <span className="step-count">Câu 2/10</span>
              <p className="question">
                2. Bạn học lập trình để làm gì?
                <span className="note">(Chọn tối đa 2)</span>
              </p>
              <label className="option"><input type="checkbox" name="purpose" value="Đi làm IT" /> Đi làm IT</label>
              <label className="option"><input type="checkbox" name="purpose" value="Chuyển ngành" /> Chuyển ngành</label>
              <label className="option"><input type="checkbox" name="purpose" value="Làm dự án cá nhân" /> Làm dự án cá nhân</label>
              <label className="option"><input type="checkbox" name="purpose" value="Học cho biết" /> Học cho biết</label>
              <label className="option">
                <input type="checkbox" name="purpose" value="other" id="purpose_other" />
                Khác:
                <input type="text" id="purpose_text" className="custom-text-input" placeholder="Nhập mục đích..." disabled />
              </label>
            </div>
            <div className="btn-group">
              <button type="button" className="prev-btn">Quay lại</button>
              <button type="button" className="next-btn">Tiếp tục</button>
            </div>
          </div>

          {/* ══════ BLOCK 2: TRÌNH ĐỘ HIỆN TẠI ══════ */}

          {/* Q3 – Kinh nghiệm + ngôn ngữ */}
          <div className="step">
            <div className="question-block">
              <span className="step-count">Câu 3/10</span>
              <p className="question">3. Bạn đã từng học lập trình chưa?</p>
              <label className="option"><input type="radio" name="experience" value="Chưa từng" /> Chưa từng</label>
              <label className="option"><input type="radio" name="experience" value="Có (cơ bản)" /> Có (cơ bản)</label>
              <label className="option"><input type="radio" name="experience" value="Có (trung cấp trở lên)" /> Có (trung cấp trở lên)</label>
            </div>

            <div className="question-block sub-question" id="sub_language_section" style={{ display: 'none' }}>
              <p className="question">Nếu có, bạn đã học ngôn ngữ nào?</p>
              <label className="option"><input type="checkbox" name="language" value="Python" /> Python</label>
              <label className="option"><input type="checkbox" name="language" value="Java" /> Java</label>
              <label className="option"><input type="checkbox" name="language" value="C/C++" /> C/C++</label>
              <label className="option"><input type="checkbox" name="language" value="JavaScript" /> JavaScript</label>
              <label className="option">
                <input type="checkbox" name="language" value="other" id="lang_other" />
                Khác:
                <input type="text" id="lang_text" className="custom-text-input" placeholder="Nhập ngôn ngữ..." disabled />
              </label>
            </div>
            <div className="btn-group">
              <button type="button" className="prev-btn">Quay lại</button>
              <button type="button" className="next-btn">Tiếp tục</button>
            </div>
          </div>

          {/* Q4 – Tự đánh giá level */}
          <div className="step">
            <div className="question-block">
              <span className="step-count">Câu 4/10</span>
              <p className="question">4. Bạn tự đánh giá level của mình:</p>
              <label className="option"><input type="radio" name="level" value="Beginner" /> Beginner</label>
              <label className="option"><input type="radio" name="level" value="Intermediate" /> Intermediate</label>
              <label className="option"><input type="radio" name="level" value="Advanced" /> Advanced</label>
            </div>
            <div className="btn-group">
              <button type="button" className="prev-btn">Quay lại</button>
              <button type="button" className="next-btn">Tiếp tục</button>
            </div>
          </div>

          {/* Q5 – Kỹ năng chi tiết đã có */}
          <div className="step">
            <div className="question-block">
              <span className="step-count">Câu 5/10</span>
              <p className="question">5. Bạn tự tin với kỹ năng nào rồi?
                <span className="note">(Bỏ qua nếu chưa có)</span>
              </p>
              <label className="option"><input type="checkbox" name="skill_detail" value="HTML / CSS" /> HTML / CSS</label>
              <label className="option"><input type="checkbox" name="skill_detail" value="JavaScript / TypeScript" /> JavaScript / TypeScript</label>
              <label className="option"><input type="checkbox" name="skill_detail" value="Framework FE (React, Vue, Angular...)" /> Framework FE (React, Vue, Angular...)</label>
              <label className="option"><input type="checkbox" name="skill_detail" value="Backend / API (Node, Django, Spring...)" /> Backend / API (Node, Django, Spring...)</label>
              <label className="option"><input type="checkbox" name="skill_detail" value="Database (SQL, NoSQL)" /> Database (SQL, NoSQL)</label>
              <label className="option"><input type="checkbox" name="skill_detail" value="Git / CI-CD" /> Git / CI-CD</label>
              <label className="option"><input type="checkbox" name="skill_detail" value="Docker / Cloud" /> Docker / Cloud</label>
              <label className="option">
                <input type="checkbox" name="skill_detail" value="other" id="skill_other" />
                Khác:
                <input type="text" id="skill_text" className="custom-text-input" placeholder="Nhập kỹ năng..." disabled />
              </label>
            </div>
            <div className="btn-group">
              <button type="button" className="prev-btn">Quay lại</button>
              <button type="button" className="next-btn">Tiếp tục</button>
            </div>
          </div>

          {/* ══════ BLOCK 3: MỤC TIÊU ══════ */}

          {/* Q6 – Mong muốn sau khóa học */}
          <div className="step">
            <div className="question-block">
              <span className="step-count">Câu 6/10</span>
              <p className="question">6. Bạn mong muốn đạt được điều gì sau khóa học?</p>
              <label className="option"><input type="checkbox" name="goal" value="Có việc làm" /> Có việc làm</label>
              <label className="option"><input type="checkbox" name="goal" value="Làm được project" /> Làm được project</label>
              <label className="option"><input type="checkbox" name="goal" value="Hiểu kiến thức cơ bản" /> Hiểu kiến thức cơ bản</label>
              <label className="option">
                <input type="checkbox" name="goal" value="other" id="goal_other" />
                Khác:
                <input type="text" id="goal_text" className="custom-text-input" placeholder="Nhập mong muốn..." disabled />
              </label>
            </div>
            <div className="btn-group">
              <button type="button" className="prev-btn">Quay lại</button>
              <button type="button" className="next-btn">Tiếp tục</button>
            </div>
          </div>

          {/* Q7 – Lĩnh vực IT quan tâm */}
          <div className="step">
            <div className="question-block">
              <span className="step-count">Câu 7/10</span>
              <p className="question">7. Bạn quan tâm mảng IT nào?
                <span className="note">(Chọn tối đa 3)</span>
              </p>
              <label className="option"><input type="checkbox" name="domain" value="Web Development" /> Web Development</label>
              <label className="option"><input type="checkbox" name="domain" value="Mobile App" /> Mobile App</label>
              <label className="option"><input type="checkbox" name="domain" value="Cloud / DevOps" /> Cloud / DevOps</label>
              <label className="option"><input type="checkbox" name="domain" value="AI / Machine Learning" /> AI / Machine Learning</label>
              <label className="option"><input type="checkbox" name="domain" value="Data Science / Big Data" /> Data Science / Big Data</label>
              <label className="option"><input type="checkbox" name="domain" value="Cyber Security" /> Cyber Security</label>
              <label className="option"><input type="checkbox" name="domain" value="Embedded / IoT" /> Embedded / IoT</label>
              <label className="option"><input type="checkbox" name="domain" value="Game Development" /> Game Development</label>
              <label className="option">
                <input type="checkbox" name="domain" value="other" id="domain_other" />
                Khác:
                <input type="text" id="domain_text" className="custom-text-input" placeholder="Nhập lĩnh vực..." disabled />
              </label>
            </div>
            <div className="btn-group">
              <button type="button" className="prev-btn">Quay lại</button>
              <button type="button" className="next-btn">Tiếp tục</button>
            </div>
          </div>

          {/* Q8 – Vị trí nghề mục tiêu */}
          <div className="step">
            <div className="question-block">
              <span className="step-count">Câu 8/10</span>
              <p className="question">8. Bạn muốn trở thành vị trí gì?</p>
              <label className="option"><input type="radio" name="career_target" value="Frontend Developer" /> Frontend Developer</label>
              <label className="option"><input type="radio" name="career_target" value="Backend Developer" /> Backend Developer</label>
              <label className="option"><input type="radio" name="career_target" value="Fullstack Developer" /> Fullstack Developer</label>
              <label className="option"><input type="radio" name="career_target" value="Mobile Developer" /> Mobile Developer</label>
              <label className="option"><input type="radio" name="career_target" value="Data Engineer / Analyst" /> Data Engineer / Analyst</label>
              <label className="option"><input type="radio" name="career_target" value="AI / ML Engineer" /> AI / ML Engineer</label>
              <label className="option"><input type="radio" name="career_target" value="DevOps / SRE" /> DevOps / SRE</label>
              <label className="option">
                <input type="radio" name="career_target" value="other" id="career_other" />
                Khác:
                <input type="text" id="career_text" className="custom-text-input" placeholder="Nhập vị trí mong muốn..." disabled />
              </label>
            </div>
            <div className="btn-group">
              <button type="button" className="prev-btn">Quay lại</button>
              <button type="button" className="next-btn">Tiếp tục</button>
            </div>
          </div>

          {/* ══════ BLOCK 4: THỜI GIAN ══════ */}

          {/* Q9 – Thời gian học mỗi tuần */}
          <div className="step">
            <div className="question-block">
              <span className="step-count">Câu 9/10</span>
              <p className="question">9. Bạn có thể dành thời gian học:</p>
              <label className="option"><input type="radio" name="time" value="< 5h/tuần" /> &lt; 5h/tuần</label>
              <label className="option"><input type="radio" name="time" value="5–10h/tuần" /> 5–10h/tuần</label>
              <label className="option"><input type="radio" name="time" value="> 10h/tuần" /> &gt; 10h/tuần</label>
            </div>
            <div className="btn-group">
              <button type="button" className="prev-btn">Quay lại</button>
              <button type="button" className="next-btn">Tiếp tục</button>
            </div>
          </div>

          {/* Q10 – Quỹ thời gian đạt mục tiêu */}
          <div className="step">
            <div className="question-block">
              <span className="step-count">Câu 10/10</span>
              <p className="question">10. Bạn muốn đạt mục tiêu trong bao lâu?</p>
              <label className="option"><input type="radio" name="timeline" value="1–3 tháng" /> 1–3 tháng</label>
              <label className="option"><input type="radio" name="timeline" value="3–6 tháng" /> 3–6 tháng</label>
              <label className="option"><input type="radio" name="timeline" value="6–12 tháng" /> 6–12 tháng</label>
              <label className="option"><input type="radio" name="timeline" value="> 1 năm" /> &gt; 1 năm</label>
            </div>
            <div className="btn-group">
              <button type="button" className="prev-btn">Quay lại</button>
              <button type="submit" className="submit-btn">Hoàn thành Khảo sát</button>
            </div>
          </div>
        </form>
      </div>

      <div className="thanks-overlay" id="thanksOverlay" aria-hidden="true">
        <div className="thanks-modal" role="dialog" aria-modal="true" aria-labelledby="thanksTitle">
          <div className="thanks-badge">✓</div>
          <h3 id="thanksTitle" className="thanks-title">Cảm ơn bạn!</h3>
          <p className="thanks-sub">
            Phản hồi của bạn đã được ghi nhận. Chúng tôi sẽ cá nhân hóa lộ trình học phù hợp hơn.
          </p>
          <button className="thanks-btn" id="thanksOkBtn" type="button">OK</button>
        </div>
      </div>

      <LegacyScripts srcs={SCRIPTS} />
    </>
  );
}
