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
