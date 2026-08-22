import { autoApproveExpiredRefunds, REFUND_TIMEOUT_HOURS } from "../src/lib/refund";
import { prisma } from "../src/lib/prisma";

// 定时任务：商家超时未处理退款自动同意。可由系统 cron / 任务计划程序调用：
//   npx tsx scripts/auto-refund.ts
async function main() {
  const count = await autoApproveExpiredRefunds();
  console.log(`[auto-refund] 扫描完成：${count} 笔超过 ${REFUND_TIMEOUT_HOURS} 小时的退款申请已自动同意`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
