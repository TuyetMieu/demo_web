// ══════════════════════════════════════════════════════════════
// ROADMAP DATA — Lộ trình xây quanh các khóa học THẬT trên nền tảng
// (python, cpp, java, htmlcss, db_design, db_design_tc, db_design_nc).
// Mỗi chặng (section) có thể gắn `course: "<course_id>"` — trạng thái
// chặng đó tự đồng bộ từ tiến độ khóa học thật (roadmap.js).
// Ngoài danh mục tĩnh này, mỗi user còn có "Lộ trình của tôi" — sinh
// riêng từ câu trả lời khảo sát (backend accounts/views.py).
// ══════════════════════════════════════════════════════════════

// ── Danh mục lộ trình (hiện trong browse grid) ─────────────────
// id: slug ổn định dùng làm roadmap_id khi lưu tiến độ lên server.
var ROADMAP_LIST = [
  { id: "frontend-web",    name: "Frontend Web",       emoji: "💻", group: "Lộ trình trên nền tảng", desc: "Bắt đầu với khóa HTML/CSS trên nền tảng, tiến tới JavaScript và framework hiện đại" },
  { id: "backend-java",    name: "Backend & Java",     emoji: "⚙️", group: "Lộ trình trên nền tảng", desc: "Khóa Java kết hợp chuỗi khóa CSDL — nền tảng vững chắc cho backend developer" },
  { id: "python-ai",       name: "Python & AI",        emoji: "🐍", group: "Lộ trình trên nền tảng", desc: "Từ khóa Python 120 bài đến phân tích dữ liệu và Machine Learning" },
  { id: "cpp-systems",     name: "C/C++ & Hệ thống",   emoji: "🖥️", group: "Lộ trình trên nền tảng", desc: "Khóa C/C++ làm nền — cấu trúc dữ liệu, giải thuật và lập trình hệ thống" },
  { id: "database-expert", name: "Chuyên gia CSDL",    emoji: "🗄️", group: "Lộ trình trên nền tảng", desc: "Trọn bộ 3 khóa GameHub: thiết kế CSDL → SQL nâng cao → Database Engine" },
  { id: "fullstack",       name: "Full-stack",         emoji: "🧩", group: "Lộ trình trên nền tảng", desc: "Kết hợp HTML/CSS, Python và CSDL thành sản phẩm web hoàn chỉnh" },
];

// ── Dữ liệu section từng lộ trình ──────────────────────────────
// section.course: chặng gắn với khóa học trên nền tảng (tự đồng bộ tiến độ).
var ROADMAP_DATA = {

  "Frontend Web": [
    { main: "1. Internet & Web", right: ["Internet hoạt động thế nào?", "HTTP / HTTPS", "DNS & Hosting", "Trình duyệt render trang"] },
    { main: "2. HTML", course: "htmlcss", left: ["Semantic HTML", "Forms & Validation", "Accessibility", "SEO cơ bản"] },
    { main: "3. CSS", course: "htmlcss", right: ["Box Model", "Flexbox", "CSS Grid", "Responsive Design"] },
    { main: "4. JavaScript", left: ["Cú pháp & DOM", "ES6+ & Modules", "Fetch / Ajax", "Async / Await"] },
    { main: "5. Git & Deploy", right: ["Git cơ bản", "GitHub", "Deploy tĩnh (Vercel / Netlify)"] },
    { main: "6. Framework", left: ["React", "Vue", "Next.js"] },
    { main: "7. Dự án tổng hợp", right: ["Landing page", "Portfolio cá nhân", "SPA nhỏ có API"] },
  ],

  "Backend & Java": [
    { main: "1. Nền tảng", right: ["Terminal & Linux cơ bản", "HTTP & Client-Server", "JSON & API là gì?"] },
    { main: "2. Java Core", course: "java", left: ["Cú pháp & OOP", "Collections", "Exception & IO", "Multithreading"] },
    { main: "3. Thiết kế CSDL", course: "db_design", right: ["ERD & mô hình hóa", "Chuẩn hóa 1NF–3NF", "Khóa chính / khóa ngoại"] },
    { main: "4. SQL nâng cao", course: "db_design_tc", left: ["JOIN & Subquery", "Window Functions", "Index & hiệu năng"] },
    { main: "5. REST API", right: ["Spring Boot", "Validation & Error handling", "Authentication (JWT)"] },
    { main: "6. Database Engine", course: "db_design_nc", left: ["Transaction & ACID", "Tối ưu truy vấn", "Backup & phục hồi"] },
    { main: "7. Triển khai", right: ["Docker cơ bản", "CI / CD", "Cloud hosting"] },
  ],

  "Python & AI": [
    { main: "1. Python Cơ Bản", course: "python", right: ["Biến & kiểu dữ liệu", "Điều kiện & vòng lặp", "List, Dict, Set", "Hàm & Module"] },
    { main: "2. Python Nâng Cao", course: "python", left: ["OOP", "Decorator & Generator", "Xử lý file & lỗi"] },
    { main: "3. Làm việc với CSDL", course: "db_design", right: ["SQL cơ bản", "Thiết kế schema", "Kết nối Python ↔ DB"] },
    { main: "4. Phân Tích Dữ Liệu", left: ["NumPy", "Pandas", "Trực quan hóa (Matplotlib)"] },
    { main: "5. Toán Cho AI", right: ["Đại số tuyến tính", "Xác suất & thống kê"] },
    { main: "6. Machine Learning", left: ["Scikit-learn", "Regression & Classification", "Đánh giá mô hình"] },
    { main: "7. Deep Learning & LLM", right: ["Neural Networks", "PyTorch", "Ứng dụng LLM"] },
  ],

  "C/C++ & Hệ thống": [
    { main: "1. Ngôn Ngữ C", course: "cpp", right: ["Kiểu dữ liệu & hàm", "Mảng & chuỗi", "Quy trình biên dịch"] },
    { main: "2. Con Trỏ & Bộ Nhớ", course: "cpp", left: ["Con trỏ", "malloc / free", "Stack vs Heap"] },
    { main: "3. Cấu Trúc Dữ Liệu", course: "cpp", right: ["Linked List", "Stack & Queue", "Cây & đồ thị"] },
    { main: "4. C++ & OOP", course: "cpp", left: ["Class & Object", "Kế thừa & đa hình", "Template"] },
    { main: "5. Thư Viện STL", course: "cpp", right: ["Vector, Map, Set", "Iterator", "Algorithms"] },
    { main: "6. Giải Thuật", left: ["Sắp xếp & tìm kiếm", "Đệ quy & quay lui", "Độ phức tạp Big-O"] },
    { main: "7. Hướng Chuyên Sâu", right: ["Lập trình nhúng", "Game engine", "Hệ điều hành"] },
  ],

  "Chuyên gia CSDL": [
    { main: "1. Nhập Môn CSDL", right: ["CSDL là gì?", "Mô hình quan hệ", "Cài đặt PostgreSQL / MySQL"] },
    { main: "2. Thiết Kế CSDL", course: "db_design", left: ["ERD", "Chuẩn hóa 1NF–3NF", "Khóa & ràng buộc", "Dự án GameHub"] },
    { main: "3. SQL Nâng Cao", course: "db_design_tc", right: ["JOIN & Subquery", "Window Functions", "CTE", "Dữ liệu lớn"] },
    { main: "4. Hiệu Năng", course: "db_design_tc", left: ["Index", "EXPLAIN", "Tối ưu truy vấn"] },
    { main: "5. Database Engine", course: "db_design_nc", right: ["Transaction & ACID", "Locking & MVCC", "Backup & phục hồi"] },
    { main: "6. Thực Chiến", left: ["Thiết kế hệ thống thật", "Migration", "Giám sát & bảo trì"] },
  ],

  "Full-stack": [
    { main: "1. HTML & CSS", course: "htmlcss", right: ["Semantic HTML", "Flexbox & Grid", "Responsive"] },
    { main: "2. JavaScript", left: ["DOM", "ES6+", "Async / Await"] },
    { main: "3. Backend với Python", course: "python", right: ["Python cơ bản", "Django / Flask", "REST API"] },
    { main: "4. Cơ Sở Dữ Liệu", course: "db_design", left: ["Thiết kế schema", "SQL", "Kết nối app ↔ DB"] },
    { main: "5. Ghép Nối FE ↔ BE", right: ["Fetch API", "Auth (JWT / Session)", "CORS"] },
    { main: "6. Triển Khai", left: ["Git & GitHub", "Docker", "Cloud hosting"] },
  ],

};

// ── Chi tiết node (drawer) — key: label lowercase, bỏ số thứ tự "N. " ──
// course_id: gắn khóa học trên nền tảng → drawer hiện nút "Học ngay".
// resources[].url: link ngoài mở tab mới; type "course" + course_id: link nội bộ.
var ROADMAP_DETAILS = {
  "internet & web": { desc: "Hiểu cách Internet hoạt động là nền tảng cho mọi lập trình viên web: HTTP/HTTPS, DNS, hosting và cách trình duyệt render trang.",
    resources: [
      { type: "article", title: "How does the Internet work?", source: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/How_does_the_Internet_work" },
      { type: "docs", title: "HTTP Overview", source: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview" }] },

  "html": { course_id: "htmlcss", desc: "HTML là xương sống của mọi trang web. Khóa HTML/CSS trên nền tảng (70 bài) dạy từ thẻ semantic, forms đến accessibility — chặng này tự hoàn thành khi bạn học xong khóa.",
    resources: [
      { type: "course", title: "Khóa HTML / CSS — Nền tảng Web", source: "Trên nền tảng này", course_id: "htmlcss" },
      { type: "docs", title: "HTML elements reference", source: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Web/HTML/Element" }] },

  "css": { course_id: "htmlcss", desc: "CSS tạo giao diện đẹp và responsive: box model, Flexbox, Grid. Nội dung nằm trong khóa HTML/CSS của nền tảng.",
    resources: [
      { type: "course", title: "Khóa HTML / CSS — Nền tảng Web", source: "Trên nền tảng này", course_id: "htmlcss" },
      { type: "article", title: "A Complete Guide to Flexbox", source: "CSS-Tricks", url: "https://css-tricks.com/snippets/css/a-guide-to-flexbox/" }] },

  "html & css": { course_id: "htmlcss", desc: "Nền móng của mọi website: cấu trúc trang với HTML semantic và dàn trang responsive với CSS. Học trọn trong khóa HTML/CSS (70 bài) trên nền tảng.",
    resources: [{ type: "course", title: "Khóa HTML / CSS — Nền tảng Web", source: "Trên nền tảng này", course_id: "htmlcss" }] },

  "javascript": { desc: "JavaScript mang lại tương tác cho web: DOM, ES6+, async/await và gọi API. Khóa học JavaScript trên nền tảng đang được xây dựng — trong lúc chờ, bạn có thể học qua tài nguyên miễn phí dưới đây.",
    resources: [
      { type: "docs", title: "JavaScript Guide", source: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" },
      { type: "article", title: "Eloquent JavaScript (sách miễn phí)", source: "eloquentjavascript.net", url: "https://eloquentjavascript.net/" },
      { type: "course", title: "JavaScript Algorithms and Data Structures", source: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures-v8/" }] },

  "git & deploy": { desc: "Git là kỹ năng bắt buộc: commit, branch, merge và cộng tác qua GitHub. Deploy trang tĩnh miễn phí với Vercel/Netlify để có sản phẩm thật trong portfolio.",
    resources: [
      { type: "docs", title: "Pro Git Book (miễn phí)", source: "git-scm.com", url: "https://git-scm.com/book/en/v2" },
      { type: "docs", title: "GitHub Skills", source: "skills.github.com", url: "https://skills.github.com/" }] },

  "framework": { desc: "Sau khi vững HTML/CSS/JS, chọn một framework để build ứng dụng lớn: React phổ biến nhất, Vue dễ tiếp cận, Next.js cho SSR.",
    resources: [
      { type: "docs", title: "Learn React (tutorial chính thức)", source: "react.dev", url: "https://react.dev/learn" },
      { type: "docs", title: "Vue.js Tutorial", source: "vuejs.org", url: "https://vuejs.org/tutorial/" }] },

  "java core": { course_id: "java", desc: "Java là ngôn ngữ chủ lực của backend doanh nghiệp. Khóa Java trên nền tảng (110 bài) đi từ cú pháp, OOP đến Collections và Multithreading.",
    resources: [
      { type: "course", title: "Khóa Java — Backend & Enterprise", source: "Trên nền tảng này", course_id: "java" },
      { type: "docs", title: "Java Documentation", source: "dev.java", url: "https://dev.java/learn/" }] },

  "thiết kế csdl": { course_id: "db_design", desc: "Thiết kế CSDL đúng ngay từ đầu quyết định chất lượng cả hệ thống. Khóa \"Thiết kế CSDL — dự án GameHub\" (20 bài) dạy ERD, chuẩn hóa và ràng buộc qua dự án thật.",
    resources: [{ type: "course", title: "Thiết kế CSDL: Từ ý tưởng đến hệ dữ liệu hoàn chỉnh", source: "Trên nền tảng này", course_id: "db_design" }] },

  "sql nâng cao": { course_id: "db_design_tc", desc: "JOIN phức tạp, Window Functions, CTE và xử lý dữ liệu lớn. Khóa trung cấp \"GameHub Community\" (21 bài) trên nền tảng dạy trọn phần này.",
    resources: [{ type: "course", title: "SQL nâng cao, Dữ liệu lớn & Hiệu năng", source: "Trên nền tảng này", course_id: "db_design_tc" }] },

  "hiệu năng": { course_id: "db_design_tc", desc: "Index, EXPLAIN và tối ưu truy vấn — kỹ năng phân biệt người viết SQL và người làm chủ CSDL. Nội dung thuộc khóa SQL nâng cao trên nền tảng.",
    resources: [{ type: "course", title: "SQL nâng cao, Dữ liệu lớn & Hiệu năng", source: "Trên nền tảng này", course_id: "db_design_tc" }] },

  "database engine": { course_id: "db_design_nc", desc: "Hiểu bên trong database engine: transaction, ACID, locking, MVCC và phục hồi dữ liệu. Khóa nâng cao \"GameHub Marketplace\" (25 bài) trên nền tảng.",
    resources: [{ type: "course", title: "Bên trong Database Engine: Tối ưu, Giao dịch & Phục hồi", source: "Trên nền tảng này", course_id: "db_design_nc" }] },

  "nhập môn csdl": { desc: "Làm quen khái niệm cơ sở dữ liệu, mô hình quan hệ và cài đặt PostgreSQL/MySQL trước khi vào chuỗi 3 khóa CSDL của nền tảng.",
    resources: [
      { type: "docs", title: "PostgreSQL Tutorial", source: "postgresqltutorial.com", url: "https://www.postgresqltutorial.com/" },
      { type: "article", title: "SQLBolt — học SQL tương tác", source: "sqlbolt.com", url: "https://sqlbolt.com/" }] },

  "python cơ bản": { course_id: "python", desc: "Python dễ học, mạnh trong web, automation, data và AI. Khóa Python trên nền tảng (120 bài) bắt đầu từ số 0: biến, vòng lặp, hàm, cấu trúc dữ liệu.",
    resources: [
      { type: "course", title: "Khóa Python — Đa năng & AI", source: "Trên nền tảng này", course_id: "python" },
      { type: "docs", title: "Python Documentation", source: "docs.python.org", url: "https://docs.python.org/3/tutorial/" }] },

  "python nâng cao": { course_id: "python", desc: "OOP, decorator, generator, xử lý file và lỗi — phần nâng cao của khóa Python trên nền tảng, chuẩn bị cho hướng dữ liệu & AI.",
    resources: [{ type: "course", title: "Khóa Python — Đa năng & AI", source: "Trên nền tảng này", course_id: "python" }] },

  "backend với python": { course_id: "python", desc: "Dùng Python xây backend: học vững ngôn ngữ qua khóa Python trên nền tảng rồi tiếp cận Django/Flask để viết REST API.",
    resources: [
      { type: "course", title: "Khóa Python — Đa năng & AI", source: "Trên nền tảng này", course_id: "python" },
      { type: "docs", title: "Django Tutorial", source: "docs.djangoproject.com", url: "https://docs.djangoproject.com/en/stable/intro/tutorial01/" }] },

  "làm việc với csdl": { course_id: "db_design", desc: "Mọi ứng dụng Python thật đều cần lưu dữ liệu. Học thiết kế CSDL qua khóa trên nền tảng rồi kết nối Python với database.",
    resources: [{ type: "course", title: "Thiết kế CSDL: Từ ý tưởng đến hệ dữ liệu hoàn chỉnh", source: "Trên nền tảng này", course_id: "db_design" }] },

  "cơ sở dữ liệu": { course_id: "db_design", desc: "Thiết kế schema, viết SQL và kết nối ứng dụng với database — học qua khóa Thiết kế CSDL trên nền tảng.",
    resources: [{ type: "course", title: "Thiết kế CSDL: Từ ý tưởng đến hệ dữ liệu hoàn chỉnh", source: "Trên nền tảng này", course_id: "db_design" }] },

  "phân tích dữ liệu": { desc: "NumPy, Pandas và trực quan hóa — bước chuyển từ lập trình Python sang làm việc với dữ liệu thật.",
    resources: [
      { type: "docs", title: "10 minutes to pandas", source: "pandas.pydata.org", url: "https://pandas.pydata.org/docs/user_guide/10min.html" },
      { type: "course", title: "Data Analysis with Python", source: "freeCodeCamp", url: "https://www.freecodecamp.org/learn/data-analysis-with-python/" }] },

  "machine learning": { desc: "Học máy truyền thống với Scikit-learn: regression, classification và cách đánh giá mô hình đúng cách.",
    resources: [
      { type: "docs", title: "Scikit-learn Getting Started", source: "scikit-learn.org", url: "https://scikit-learn.org/stable/getting_started.html" },
      { type: "course", title: "Machine Learning Crash Course", source: "Google Developers", url: "https://developers.google.com/machine-learning/crash-course" }] },

  "ngôn ngữ c": { course_id: "cpp", desc: "C là cửa ngõ vào lập trình hệ thống: kiểu dữ liệu, hàm, mảng và quy trình biên dịch. Khóa C/C++ trên nền tảng (85 bài) dạy từ đầu.",
    resources: [{ type: "course", title: "Khóa C / C++ — Lập trình hệ thống", source: "Trên nền tảng này", course_id: "cpp" }] },

  "con trỏ & bộ nhớ": { course_id: "cpp", desc: "Con trỏ, malloc/free, stack vs heap — phần khó nhất nhưng đáng giá nhất của C, nằm trong khóa C/C++ trên nền tảng.",
    resources: [{ type: "course", title: "Khóa C / C++ — Lập trình hệ thống", source: "Trên nền tảng này", course_id: "cpp" }] },

  "cấu trúc dữ liệu": { course_id: "cpp", desc: "Linked list, stack, queue, cây và đồ thị — xây bằng tay với C/C++ để hiểu tận gốc, theo khóa C/C++ trên nền tảng.",
    resources: [{ type: "course", title: "Khóa C / C++ — Lập trình hệ thống", source: "Trên nền tảng này", course_id: "cpp" }] },

  "c++ & oop": { course_id: "cpp", desc: "Class, kế thừa, đa hình và template — bước từ C sang C++ hiện đại trong khóa C/C++ trên nền tảng.",
    resources: [{ type: "course", title: "Khóa C / C++ — Lập trình hệ thống", source: "Trên nền tảng này", course_id: "cpp" }] },

  "thư viện stl": { course_id: "cpp", desc: "Vector, map, set, iterator và algorithms — bộ công cụ chuẩn giúp viết C++ nhanh và an toàn, trong khóa C/C++ trên nền tảng.",
    resources: [{ type: "course", title: "Khóa C / C++ — Lập trình hệ thống", source: "Trên nền tảng này", course_id: "cpp" }] },

  "giải thuật": { desc: "Sắp xếp, tìm kiếm, đệ quy và độ phức tạp Big-O — nền tảng cho phỏng vấn và competitive programming.",
    resources: [
      { type: "article", title: "VisuAlgo — trực quan hóa giải thuật", source: "visualgo.net", url: "https://visualgo.net/en" },
      { type: "article", title: "LeetCode — luyện tập", source: "leetcode.com", url: "https://leetcode.com/" }] },

  "rest api": { desc: "Thiết kế REST API chuyên nghiệp: convention, validation, error handling và xác thực bằng JWT.",
    resources: [
      { type: "docs", title: "Spring Boot Guides", source: "spring.io", url: "https://spring.io/guides" },
      { type: "article", title: "REST API Design Best Practices", source: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Glossary/REST" }] },

  "triển khai": { desc: "Đưa sản phẩm lên môi trường thật: đóng gói với Docker, tự động hóa với CI/CD và deploy lên cloud.",
    resources: [
      { type: "docs", title: "Docker Get Started", source: "docs.docker.com", url: "https://docs.docker.com/get-started/" },
      { type: "docs", title: "GitHub Actions Quickstart", source: "docs.github.com", url: "https://docs.github.com/en/actions/quickstart" }] },

  "ghép nối fe ↔ be": { desc: "Kết nối frontend với backend: gọi API bằng fetch, xử lý xác thực JWT/Session và hiểu CORS.",
    resources: [
      { type: "docs", title: "Using the Fetch API", source: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch" },
      { type: "docs", title: "CORS", source: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS" }] },

  "thực chiến": { desc: "Áp dụng trọn bộ kiến thức CSDL vào hệ thống thật: thiết kế từ yêu cầu, quản lý migration và giám sát vận hành.",
    resources: [
      { type: "docs", title: "PostgreSQL Documentation", source: "postgresql.org", url: "https://www.postgresql.org/docs/" }] },

  "dự án tổng hợp": { desc: "Tổng hợp kiến thức thành sản phẩm thật cho portfolio: landing page, portfolio cá nhân và một SPA nhỏ có gọi API.",
    resources: [
      { type: "article", title: "Frontend Mentor — thử thách dự án", source: "frontendmentor.io", url: "https://www.frontendmentor.io/challenges" }] },
};
