// 集成测试公共 helper：构建/清理带 TEST_ 前缀的测试数据
import { prisma } from "@/lib/prisma";

/** 测试数据统一前缀，便于清理和区分真实数据 */
export const TEST_PREFIX = "TEST_";

export interface TestData {
  userId: number;
  userEmail: string;
  merchantUserId: number;
  merchantEmail: string;
  merchantId: number;
  addressId: number;
  categoryId: number;
  productId: number;
  productStock: number;
}

/** 构建一套完整的测试数据：用户、商家、地址、分类、商品 */
export async function buildTestData(): Promise<TestData> {
  const suffix = Date.now();

  const user = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}user_${suffix}@test.com`,
      passwordHash: "$2a$10$FgWVwxTDRB70KzN0Ssqy7um/L4.Fzr4Oh1bHjnWk61sO26I0oLl.C", // 123456
      name: `${TEST_PREFIX}用户`,
      role: "USER",
    },
  });

  const merchantUser = await prisma.user.create({
    data: {
      email: `${TEST_PREFIX}merchant_${suffix}@test.com`,
      passwordHash: "$2a$10$FgWVwxTDRB70KzN0Ssqy7um/L4.Fzr4Oh1bHjnWk61sO26I0oLl.C",
      name: `${TEST_PREFIX}商家`,
      role: "MERCHANT",
    },
  });

  const merchant = await prisma.merchant.create({
    data: {
      userId: merchantUser.id,
      shopName: `${TEST_PREFIX}店铺`,
      description: "测试用店铺",
      status: "ACTIVE",
    },
  });

  const address = await prisma.address.create({
    data: {
      userId: user.id,
      receiver: `${TEST_PREFIX}收件人`,
      phone: "13800000000",
      province: "广东省",
      city: "深圳市",
      district: "南山区",
      detail: "科技园测试地址",
    },
  });

  const category = await prisma.category.create({
    data: { name: `${TEST_PREFIX}分类`, sortOrder: 999 },
  });

  const productStock = 100;
  const product = await prisma.product.create({
    data: {
      merchantId: merchant.id,
      categoryId: category.id,
      name: `${TEST_PREFIX}商品`,
      description: "测试用商品",
      price: 100,
      stock: productStock,
      images: [],
      status: "ON_SALE",
    },
  });

  return {
    userId: user.id,
    userEmail: user.email,
    merchantUserId: merchantUser.id,
    merchantEmail: merchantUser.email,
    merchantId: merchant.id,
    addressId: address.id,
    categoryId: category.id,
    productId: product.id,
    productStock,
  };
}

/** 按外键依赖顺序清理所有 TEST_ 前缀数据 */
export async function cleanupTestData(): Promise<void> {
  // 退款（依赖订单/用户）
  await prisma.refund.deleteMany({ where: { user: { email: { startsWith: TEST_PREFIX } } } });
  // 订单明细（依赖订单）
  await prisma.orderItem.deleteMany({ where: { order: { user: { email: { startsWith: TEST_PREFIX } } } } });
  // 订单
  await prisma.order.deleteMany({ where: { user: { email: { startsWith: TEST_PREFIX } } } });
  // 购物车
  await prisma.cartItem.deleteMany({ where: { user: { email: { startsWith: TEST_PREFIX } } } });
  // 评价
  await prisma.review.deleteMany({ where: { user: { email: { startsWith: TEST_PREFIX } } } });
  // 地址
  await prisma.address.deleteMany({ where: { user: { email: { startsWith: TEST_PREFIX } } } });
  // 商品（依赖分类/商家）
  await prisma.product.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
  // 分类
  await prisma.category.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
  // 商家（依赖用户）
  await prisma.merchant.deleteMany({ where: { user: { email: { startsWith: TEST_PREFIX } } } });
  // 用户
  await prisma.user.deleteMany({ where: { email: { startsWith: TEST_PREFIX } } });
}

/** 构造一个已支付/发货的测试订单（含商品明细），返回订单 id 和数量 */
export async function buildTestOrder(
  data: TestData,
  opts: { status: "PENDING_SHIPMENT" | "SHIPPED" | "COMPLETED"; quantity?: number },
): Promise<{ orderId: number; quantity: number }> {
  const quantity = opts.quantity ?? 1;
  const now = new Date();
  const order = await prisma.order.create({
    data: {
      orderNo: `${TEST_PREFIX}${Date.now()}${Math.floor(Math.random() * 1000)}`,
      userId: data.userId,
      merchantId: data.merchantId,
      addressId: data.addressId,
      totalAmount: 100 * quantity,
      status: opts.status,
      paidAt: now,
      shippedAt: opts.status !== "PENDING_SHIPMENT" ? now : null,
      completedAt: opts.status === "COMPLETED" ? now : null,
      items: {
        create: [
          {
            productId: data.productId,
            productName: `${TEST_PREFIX}商品`,
            productImage: "",
            price: 100,
            quantity,
          },
        ],
      },
    },
  });
  return { orderId: order.id, quantity };
}

/** 查询商品当前库存 */
export async function getProductStock(productId: number): Promise<number> {
  const p = await prisma.product.findUnique({ where: { id: productId }, select: { stock: true } });
  return p?.stock ?? -1;
}

/** 查询订单当前状态 */
export async function getOrderStatus(orderId: number): Promise<string | null> {
  const o = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
  return o?.status ?? null;
}

/** 查询订单最新退款状态 */
export async function getRefundStatus(orderId: number): Promise<string | null> {
  const r = await prisma.refund.findFirst({
    where: { orderId },
    orderBy: { id: "desc" },
    select: { status: true },
  });
  return r?.status ?? null;
}
