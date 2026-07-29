# AGENTS.md

## 项目简介

仿京东电商平台 — 多角色电商系统，支持用户端、商家端、管理端。基于 Next.js 14 + TypeScript + Prisma + PostgreSQL + Ant Design。

## 技术栈基线（不可擅自升级）

| 技术 | 版本 | 约束 |
|------|------|------|
| Next.js | 14.x | 不可升 15+，使用 Pages Router 外的 App Router |
| React | 18.x | 不可升 19+ |
| TypeScript | 5.5+ | strict: true |
| Ant Design | 5.x | 组件库，不引入其他 UI 库 |
| Tailwind CSS | 3.x | 仅用于补充样式，不替代 Ant Design |
| Prisma | 5.x | ORM，不引入其他数据库工具 |
| NextAuth | 4.x | 认证，不可换用其他方案 |
| PostgreSQL | 15+ | 通过 Supabase/Neon 托管 |

## 快速导航

| 你想做什么 | 去哪里看 |
|------------|----------|
| 了解系统架构 | docs/architecture/overview.md |
| 了解模块边界和依赖规则 | docs/architecture/boundaries.md |
| 了解编码规范 | docs/conventions/README.md |
| 了解命名规范 | docs/conventions/naming.md |
| 了解测试规范 | docs/conventions/testing.md |
| 了解 API 错误码 | docs/reference/error-codes.md |
| 了解数据库表结构 | prisma/schema.prisma |
| 了解角色权限矩阵 | docs/architecture/overview.md |

## 硬性规则

1. **路由组隔离** — (user)/(merchant)/(admin) 代码互不引用，共享代码放 src/components/shared/
2. **依赖方向** — component → lib → types，lib 不引用 component，types 不引用任何业务包
3. **API 放 api/** — 所有后端接口在 src/app/api/ 目录内，按资源分子目录
4. **禁止 any** — 类型必须明确定义，未知类型用 unknown + 类型守卫
5. **服务端优先** — 数据获取在服务端组件完成，客户端组件仅负责交互；数据变更通过 API Routes
6. **构造注入** — 不依赖 DI 容器，函数接收依赖作为参数或从模块导入
7. **错误码体系** — API 返回统一格式 `{ code, message, data }`，错误码定义见 docs/reference/error-codes.md

## 提交规范

- `feat:` 新功能
- `fix:` 修复
- `refactor:` 重构
- `docs:` 文档
- `test:` 测试
- `chore:` 构建/工具
