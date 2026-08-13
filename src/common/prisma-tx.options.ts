/**
 * Cấu hình cho interactive transaction.
 *
 * Mặc định của Prisma là timeout 5000ms — KHÔNG đủ cho DB đặt xa (Neon serverless):
 * completeLesson/completeMission có hơn 10 round-trip tuần tự, mỗi lần vài trăm ms,
 * dễ vượt 5s và ném P2028 "transaction expired" -> user nhận 500 dù logic đúng.
 */
export const TX_OPTIONS = {
  maxWait: 10_000, // thời gian chờ lấy được connection từ pool
  timeout: 20_000, // thời gian tối đa transaction được phép chạy
} as const;
