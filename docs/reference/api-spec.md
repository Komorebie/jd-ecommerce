# API 接口规范

last_updated: 2026-07-29
status: active

## 通用约定

- 统一响应格式：`{ code: number, message: string, data: T | null }`
- 分页请求：`?page=1&pageSize=10`，响应 `data: { list: T[], total: number, page: number, pageSize: number }`
- 需认证的接口自动附带 session cookie
- 错误码定义见 [error-codes.md](error-codes.md)
- 所有请求/响应的 TypeScript 类型在 [src/types/api.ts](../../src/types/api.ts)

---

## 一、认证（已实现）

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册 | 否 |
| POST | `/api/auth/forgot-password` | 获取重置验证码 | 否 |
| POST | `/api/auth/reset-password` | 重置密码 | 否 |
| POST | `/api/auth/change-password` | 修改密码 | 是 |

<details><summary>POST /api/auth/register</summary>

```
Request:  { email: string, password: string, name: string, role: "USER"|"MERCHANT" }
Response: { code: 0, data: { id, email, name, role } }
Errors:   1001(参数错误), 2002(邮箱已注册)
```
</details>

<details><summary>POST /api/auth/change-password</summary>

```
Request:  { currentPassword: string, newPassword: string }
Response: { code: 0, message: "密码修改成功" }
Errors:   1001(参数/密码错误), 1002(未登录)
```
</details>

---

## 二、用户端 API（USER 角色）

### 商品

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/products` | 商品列表（支持搜索/筛选/排序/分页） |
| GET | `/api/products/[id]` | 商品详情 |

<details><summary>GET /api/products</summary>

```
Query:    ?keyword=&categoryId=&minPrice=&maxPrice=&sortBy=createdAt&sortOrder=desc&page=1&pageSize=20
Response: { code: 0, data: { list: Product[], total, page, pageSize } }
```
</details>

<details><summary>GET /api/products/[id]</summary>

```
Response: { code: 0, data: Product & { merchant: { shopName } } }
Errors:   1004(商品不存在)
```
</details>

### 购物车

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/cart` | 我的购物车列表 |
| POST | `/api/cart` | 加入购物车 |
| PUT | `/api/cart/[id]` | 修改数量 |
| DELETE | `/api/cart/[id]` | 移出购物车 |

<details><summary>POST /api/cart</summary>

```
Request:  { productId: number, quantity: number }
Response: { code: 0, data: CartItemResponse }
Errors:   1002(未登录), 1004(商品不存在), 2001(库存不足)
```
</details>

### 订单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/orders` | 我的订单列表 |
| POST | `/api/orders` | 创建订单 |
| GET | `/api/orders/[id]` | 订单详情 |
| PUT | `/api/orders/[id]/confirm` | 确认收货 |
| PUT | `/api/orders/[id]/cancel` | 取消订单（仅待支付状态） |

<details><summary>POST /api/orders</summary>

```
Request:  { addressId: number, items: [{productId, quantity}], remark?: string }
Response: { code: 0, data: Order }
Errors:   1001(参数错误), 2001(库存不足)
Logic:    扣减库存，清空购物车对应项，生成订单号
```
</details>

<details><summary>PUT /api/orders/[id]/cancel</summary>

```
Response: { code: 0, message: "订单已取消" }
Errors:   1003(无权操作), 2002(当前状态不允许取消)
Logic:    仅 PENDING_PAYMENT 状态可取消，恢复库存
```
</details>

### 退款

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/refunds` | 申请退款 |

<details><summary>POST /api/refunds</summary>

```
Request:  { orderId: number, reason: string, amount: number }
Response: { code: 0, data: RefundResponse }
Errors:   1003(无权操作), 2002(订单状态不允许), 2003(退款金额超限)
Logic:    订单状态 PENDING_SHIPMENT→自动退款, SHIPPED/COMPLETED→转商家审核
```
</details>

### 收货地址

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/addresses` | 地址列表 |
| POST | `/api/addresses` | 添加地址 |

### 评价

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/reviews` | 评价商品（仅已完成状态订单） |

---

## 三、商家端 API（MERCHANT 角色）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/merchant/products` | 我的商品列表 |
| POST | `/api/merchant/products` | 上架新商品 |
| PUT | `/api/merchant/products/[id]` | 编辑/下架商品 |
| GET | `/api/merchant/orders` | 本店订单列表 |
| PUT | `/api/merchant/orders/[id]/ship` | 确认发货 |
| GET | `/api/merchant/refunds` | 退款申请列表 |
| PUT | `/api/merchant/refunds/[id]/approve` | 同意退款 |
| PUT | `/api/merchant/refunds/[id]/reject` | 拒绝退款（需填写理由） |

<details><summary>POST /api/merchant/products</summary>

```
Request:  { name, description, price, stock, categoryId, images }
Response: { code: 0, data: Product }
```
</details>

<details><summary>PUT /api/merchant/orders/[id]/ship</summary>

```
Response: { code: 0, message: "发货成功" }
Logic:    仅 PENDING_SHIPMENT 状态可发货，状态变更为 SHIPPED
```
</details>

<details><summary>PUT /api/merchant/refunds/[id]/approve</summary>

```
Logic: 状态变为 APPROVED，通知用户寄回（SHIPPED/COMPLETED 状态订单），
       或直接退款（PENDING_SHIPMENT 状态订单），恢复库存
```
</details>

<details><summary>PUT /api/merchant/refunds/[id]/reject</summary>

```
Request:  { rejectReason: string }
Logic:    状态变为 REJECTED，用户可申诉
```
</details>

---

## 四、管理端 API（ADMIN 角色）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/users` | 用户列表（支持搜索/分页） |
| PUT | `/api/admin/users/[id]` | 修改用户状态/角色 |
| GET | `/api/admin/merchants` | 商家列表 |
| PUT | `/api/admin/merchants/[id]` | 审核商家（通过/封禁） |
| GET | `/api/admin/orders` | 全平台订单列表 |
| PUT | `/api/admin/orders/[id]/force-cancel` | 强制取消订单 |
| GET | `/api/admin/refunds` | 全平台退款列表 |
| PUT | `/api/admin/refunds/[id]/force-resolve` | 强制裁决退款 |

<details><summary>PUT /api/admin/users/[id]</summary>

```
Request:  { status?: "ACTIVE"|"BANNED", role?: "USER"|"MERCHANT"|"ADMIN" }
Response: { code: 0, data: User }
```
</details>

<details><summary>PUT /api/admin/refunds/[id]/force-resolve</summary>

```
Request:  { action: "APPROVE"|"REJECT", reason: string }
Logic:    管理员最终裁决，不可再申诉
```
</details>

---

## 五、状态流转速查

```
PENDING_PAYMENT → (支付) → PENDING_SHIPMENT → (发货) → SHIPPED → (收货) → COMPLETED
       ↓                        ↓                            ↓
   取消(CANCELLED)       申请退款(REFUNDING)          申请退款(REFUNDING)
       ↓                   ↓ 商家同意                       ↓
   恢复库存              REFUNDED                       REFUNDED
                           ↓ 商家拒绝
                           ↓ 用户申诉 → 管理员裁决
```

## 六、实现优先级

| 优先级 | 模块 | 谁做 | 依赖 |
|--------|------|------|------|
| P0 | 商品 CRUD（商家+列表） | 商家端负责人 | 无 |
| P0 | 商品浏览（列表+详情） | 用户端负责人 | 商品数据 |
| P1 | 购物车 | 用户端负责人 | 商品数据 |
| P1 | 订单创建 | 用户端负责人 | 购物车+地址 |
| P1 | 订单管理（商家） | 商家端负责人 | 订单数据 |
| P2 | 退款流程 | 用户+商家+管理端 | 订单数据 |
| P2 | 评价 | 用户端负责人 | 已完成订单 |
| P2 | 管理端审核 | 管理端负责人 | 用户+商家+订单数据 |
