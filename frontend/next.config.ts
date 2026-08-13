import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Ghim gốc dự án vào chính thư mục frontend/.
    // Turbopack tự dò gốc bằng cách đi ngược lên tìm lockfile; ở repo này thư
    // mục cha (backend NestJS) có package-lock.json nên nó có thể chọn nhầm
    // D:\EDU\PE_nest_next_js làm gốc. Khi đó id module thành
    // "[project]/frontend/src/app/..." lệch với React Client Manifest →
    // /dashboard trả 500 "Could not find the module ... in the React Client
    // Manifest". Ghim cứng ở đây thì id luôn là "[project]/src/app/...".
    root: __dirname,
  },
};

export default nextConfig;
