# 模块边界与依赖规则

last_updated: 2026-07-29
status: active

## 依赖方向

```
component → lib → types
   ↓
  api/ (通过 HTTP 调用，不直接 import)
```

## 各层职责

| 层 | 目录 | 可依赖 | 不可做的事 |
|----|------|--------|------------|
| 视图 | src/app/(user\|merchant\|admin)/ | lib, types, components | 不直接调 Prisma，不走 API 之外的数据库操作 |
| API | src/app/api/ | lib, types | 不引用 component，不引用路由组代码 |
| 组件 | src/components/ | lib, types | ui/ 不引用业务类型，shared/ 不引用特定路由组代码 |
| 工具 | src/lib/ | types | 不引用 component，不引用 app 层 |
| 类型 | src/types/ | 无 | 不引用任何业务包 |

## 禁止事项

1. 禁止 `src/app/(user)/` 引用 `src/app/(merchant)/` 或 `src/app/(admin)/` 的代码
2. 禁止 API Route 直接返回 Prisma 实体，必须通过 DTO 转换
3. 禁止在客户端组件中直接调用 Prisma 或读取数据库
4. 禁止手写 SQL，统一通过 Prisma Client
5. 禁止硬编码角色判断字符串，使用 `types/user.ts` 中的 Role 枚举
