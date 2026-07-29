# 编码规范

last_updated: 2026-07-29
status: active

## 规范索引

| 规范 | 文档 |
|------|------|
| 命名规范 | docs/conventions/naming.md |
| 测试规范 | docs/conventions/testing.md |
| API 规范 | docs/reference/error-codes.md |

## 通用规则

- 单文件 ≤ 300 行，单函数 ≤ 50 行
- 类型定义优先使用 `interface`，联合类型用 `type`
- 组件默认服务端渲染，需要交互时加 `'use client'`
- 使用 ESLint + Prettier 保持代码风格一致
- API 返回统一格式：`{ code: number, message: string, data: T | null }`

## 关键注意事项

### Prisma Decimal 类型

Prisma 的 `Decimal` 字段（price、amount 等）序列化为 JSON 时为 **字符串**，不是数字。前端接收时必须用 `Number()` 转换：

```typescript
// 前端接口类型中 price 定义为 string，不是 number
interface Product { price: string; ... }

// 显示时用 Number() 转换
const formatPrice = (p: string | number) => `¥${Number(p).toFixed(2)}`;
```

### 样式缓存问题

如页面样式丢失，运行 `npm run dev:clean` 清除缓存并重启。**不可**升级 `@ant-design/nextjs-registry` 到 1.3+，会导致 `@ant-design/cssinjs` 版本冲突。
