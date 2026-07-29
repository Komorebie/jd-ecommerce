# 命名规范

last_updated: 2026-07-29
status: active

## 文件

| 类型 | 规范 | 示例 |
|------|------|------|
| 页面文件 | page.tsx | `src/app/(user)/cart/page.tsx` |
| 布局文件 | layout.tsx | `src/app/(user)/layout.tsx` |
| API 路由 | route.ts | `src/app/api/products/route.ts` |
| 组件文件 | PascalCase.tsx | `ProductCard.tsx` |
| 工具函数 | camelCase.ts | `formatPrice.ts` |
| 类型文件 | domain.ts | `product.ts`, `order.ts` |

## 代码

| 内容 | 规范 | 示例 |
|------|------|------|
| 组件名 | PascalCase | `ProductCard` |
| 函数/变量 | camelCase | `getProducts`, `orderList` |
| 常量 | UPPER_SNAKE_CASE | `MAX_CART_ITEMS` |
| 类型/接口 | PascalCase | `Product`, `OrderStatus` |
| 枚举值 | UPPER_SNAKE_CASE | `PENDING_PAYMENT` |
| 数据库表 | snake_case 复数 | `cart_items` |
| 数据库列 | snake_case | `created_at` |
| Prisma model | PascalCase 单数 | `model Product` |
