// Nhóm (standalone): các template gốc KHÔNG extends base.html — không có CSS
// chung nào ở đây; từng page tự import đúng tổ hợp CSS của nó (MIGRATION_PLAN §4).
export default function StandaloneLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
