import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing seed data
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // === Categories ===
  const categories = await Promise.all([
    prisma.category.create({ data: { name: "手机数码", sortOrder: 1 } }),
    prisma.category.create({ data: { name: "电脑办公", sortOrder: 2 } }),
    prisma.category.create({ data: { name: "家用电器", sortOrder: 3 } }),
  ]);

  const subCategories = await Promise.all([
    prisma.category.create({ data: { name: "智能手机", parentId: categories[0].id, sortOrder: 1 } }),
    prisma.category.create({ data: { name: "笔记本", parentId: categories[1].id, sortOrder: 1 } }),
    prisma.category.create({ data: { name: "空调", parentId: categories[2].id, sortOrder: 1 } }),
  ]);

  // === Admin ===
  // 平台管理员账号：admin@test.com / 123456（用于管理后台测试）
  await prisma.user.upsert({
    where: { email: "admin@test.com" },
    update: {},
    create: {
      email: "admin@test.com",
      // 测试账号密码：123456（bcrypt 哈希）
      passwordHash: "$2a$10$FgWVwxTDRB70KzN0Ssqy7um/L4.Fzr4Oh1bHjnWk61sO26I0oLl.C",
      name: "平台管理员",
      role: "ADMIN",
    },
  });

  // === Merchant ===
  const merchantUser = await prisma.user.upsert({
    where: { email: "merchant@test.com" },
    update: {},
    create: {
      email: "merchant@test.com",
      // 测试账号密码：123456（bcrypt 哈希）
      passwordHash: "$2a$10$FgWVwxTDRB70KzN0Ssqy7um/L4.Fzr4Oh1bHjnWk61sO26I0oLl.C",
      name: "测试商家",
      role: "MERCHANT",
    },
  });

  const merchant = await prisma.merchant.upsert({
    where: { userId: merchantUser.id },
    update: {},
    create: {
      userId: merchantUser.id,
      shopName: "京东自营旗舰店",
      description: "品质保证，正品低价",
      status: "ACTIVE",
    },
  });

  // === Products ===
  const products = [
    {
      merchantId: merchant.id,
      categoryId: subCategories[0].id,
      name: "iPhone 16 Pro Max 256GB",
      description:
        "A18 Pro 芯片 / 6.9 英寸超视网膜 XDR 显示屏 / 4800 万像素主摄 / 钛金属设计 / USB-C 接口",
      price: 9999.0,
      stock: 128,
      images: [
        "https://picsum.photos/seed/iphone1/400/400",
        "https://picsum.photos/seed/iphone2/400/400",
      ],
      status: "ON_SALE" as const,
    },
    {
      merchantId: merchant.id,
      categoryId: subCategories[0].id,
      name: "华为 Mate 70 Pro 512GB",
      description:
        "麒麟 9100 芯片 / 6.82 英寸 OLED 曲面屏 / XMAGE 影像系统 / 卫星通信 / 昆仑玻璃",
      price: 7999.0,
      stock: 256,
      images: [
        "https://picsum.photos/seed/huawei1/400/400",
        "https://picsum.photos/seed/huawei2/400/400",
      ],
      status: "ON_SALE" as const,
    },
    {
      merchantId: merchant.id,
      categoryId: subCategories[0].id,
      name: "小米 15 Ultra 512GB",
      description:
        "骁龙 8 Gen 4 / 6.73 英寸 AMOLED / 徕卡光学镜头 / 120W 超级快充 / 澎湃 OS",
      price: 6499.0,
      stock: 0,
      images: [
        "https://picsum.photos/seed/xiaomi1/400/400",
      ],
      status: "ON_SALE" as const,
    },
    {
      merchantId: merchant.id,
      categoryId: subCategories[1].id,
      name: "MacBook Pro 14英寸 M4 Pro",
      description:
        "Apple M4 Pro 芯片 / 18GB 统一内存 / 512GB SSD / Liquid Retina XDR 显示屏 / 17 小时续航",
      price: 14999.0,
      stock: 64,
      images: [
        "https://picsum.photos/seed/macbook1/400/400",
      ],
      status: "ON_SALE" as const,
    },
    {
      merchantId: merchant.id,
      categoryId: subCategories[1].id,
      name: "ThinkPad X1 Carbon Gen 12",
      description:
        "Intel Core Ultra 7 / 32GB DDR5 / 1TB SSD / 14英寸 2.8K OLED / 重量 1.09kg",
      price: 12999.0,
      stock: 32,
      images: [
        "https://picsum.photos/seed/thinkpad1/400/400",
      ],
      status: "ON_SALE" as const,
    },
    {
      merchantId: merchant.id,
      categoryId: subCategories[2].id,
      name: "格力 云佳 1.5匹 新一级能效",
      description:
        "变频冷暖 / 自清洁 / 低至 18 分贝 / 适用面积 16-20㎡ / 6 年质保",
      price: 3299.0,
      stock: 200,
      images: [
        "https://picsum.photos/seed/ac1/400/400",
      ],
      status: "ON_SALE" as const,
    },
    {
      merchantId: merchant.id,
      categoryId: subCategories[2].id,
      name: "美的 理想家III 3匹 中央空调",
      description:
        "全直流变频 / 一级能效 / 适用 40-60㎡ / WiFi 智控 / 10 年压缩机保修",
      price: 8999.0,
      stock: 80,
      images: [
        "https://picsum.photos/seed/ac2/400/400",
      ],
      status: "OFF_SHELF" as const,
    },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  console.log("Seed completed: 3 categories, 3 subcategories, 1 merchant, 7 products");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
