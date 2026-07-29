# 剩余工作说明

last_updated: 2026-07-29

## 已完成的基础架构

| 模块 | 说明 |
|------|------|
| 认证系统 | 登录/注册/忘记密码/修改密码，三种角色，路由守卫中间件 |
| 布局骨架 | 用户端顶部导航，商家/管理端侧边栏布局 |
| 数据库 | Prisma schema 11 张表，Neon PostgreSQL |
| API 契约 | 30 个接口规范 + TypeScript 类型定义 |

## Git 分支

| 分支 | 角色 | 负责人 |
|------|------|--------|
| `feature/user` | 普通用户端 | 待定 |
| `feature/merchant` | 商家后台 | 待定 |
| `feature/admin` | 管理后台 | 待定 |
| `master` | 主分支（基础架构） | 你 |

---

## 用户端需求（feature/user）

工作目录：`src/app/(user)/` + 对应 API

### 必须实现

| 页面 | 路由 | 功能 |
|------|------|------|
| 首页 | `/` | 商品搜索 + 分类筛选 + 商品列表 |
| 商品详情 | `/products/[id]` | 图片/价格/描述 + 加入购物车 |
| 购物车 | `/cart` | 列表/改数量/删除/结算 |
| 我的订单 | `/orders` | 订单列表（按状态筛选）+ 详情 |
| 地址管理 | `/profile/addresses` | 新增/编辑/删除/设默认 |

### 订单操作（在订单详情中）

- 待支付：去支付（模拟）+ 取消订单
- 待发货：申请退款
- 已发货：确认收货 + 申请退款
- 已完成：评价商品

### 需要实现的 API

参考 [api-spec.md](reference/api-spec.md) 第二节：
- `GET/POST /api/products` — 商品列表/创建
- `GET /api/products/[id]` — 商品详情
- `GET/POST /api/cart`, `PUT/DELETE /api/cart/[id]` — 购物车 CRUD
- `GET/POST /api/orders`, `GET /api/orders/[id]` — 订单
- `PUT /api/orders/[id]/confirm`, `PUT /api/orders/[id]/cancel`
- `POST /api/refunds` — 申请退款
- `GET/POST /api/addresses` — 收货地址
- `POST /api/reviews` — 评价

---

## 商家端需求（feature/merchant）

工作目录：`src/app/merchant/` + `src/app/api/merchant/`

### 必须实现

| 页面 | 路由 | 功能 |
|------|------|------|
| 仪表盘 | `/merchant/dashboard` | 今日订单数/销售额/待处理退款 |
| 商品管理 | `/merchant/products` | 列表 + 新增/编辑/上下架 |
| 订单管理 | `/merchant/orders` | 本店订单列表 + 确认发货 |
| 退款处理 | `/merchant/refunds` | 退款列表 + 同意/拒绝 |

### 需要实现的 API

参考 [api-spec.md](reference/api-spec.md) 第三节：
- `GET/POST /api/merchant/products`, `PUT /api/merchant/products/[id]`
- `GET /api/merchant/orders`, `PUT /api/merchant/orders/[id]/ship`
- `GET /api/merchant/refunds`
- `PUT /api/merchant/refunds/[id]/approve`
- `PUT /api/merchant/refunds/[id]/reject`

---

## 管理端需求（feature/admin）

工作目录：`src/app/admin/` + `src/app/api/admin/`

### 必须实现

| 页面 | 路由 | 功能 |
|------|------|------|
| 仪表盘 | `/admin/dashboard` | 平台核心数据概览 |
| 用户管理 | `/admin/users` | 列表 + 封禁/解封 |
| 商家管理 | `/admin/merchants` | 列表 + 审核通过/封禁 |
| 订单管理 | `/admin/orders` | 全平台订单 + 强制取消 |
| 纠纷处理 | `/admin/disputes` | 退款纠纷列表 + 强制裁决 |

### 需要实现的 API

参考 [api-spec.md](reference/api-spec.md) 第四节：
- `GET /api/admin/users`, `PUT /api/admin/users/[id]`
- `GET /api/admin/merchants`, `PUT /api/admin/merchants/[id]`
- `GET /api/admin/orders`, `PUT /api/admin/orders/[id]/force-cancel`
- `GET /api/admin/refunds`, `PUT /api/admin/refunds/[id]/force-resolve`

---

## 开发注意事项

1. **所有 API 返回统一格式**：`{ code: number, message: string, data: T | null }`
2. **类型用已定义的**：`import { xxx } from "@/types/api"`，需要新类型先在 `src/types/api.ts` 加
3. **越权检查**：API 中校验当前用户只能操作自己的数据
4. **状态机**：订单和退款状态流转参考 api-spec.md 末尾的状态图
5. **提交规范**：`feat:` 开头，一个功能一个 commit
6. **完成后提 PR 到 master**，由你 review 合并

## 重要：已踩过的坑

### 样式丢失

如页面样式全部丢失，运行：
```bash
npm run dev:clean
```
不要直接 `npm run dev`。原因是 `.next` 缓存可能过期导致 Ant Design CSS 未正确注入。

### Prisma Decimal 类型

price、amount 等字段在 API 返回的 JSON 中是**字符串**（不是数字），前端必须用 `Number()` 转换：
```typescript
const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;
```

### @ant-design/nextjs-registry 版本

**禁止**升级 `@ant-design/nextjs-registry` 到 1.3.0+。1.3.0 依赖 `@ant-design/cssinjs@2.x`，而 antd 5.x 依赖 `@ant-design/cssinjs@1.x`，版本不匹配会导致所有 Ant Design 样式永久失效。
