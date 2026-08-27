# 仿京东商城 APP（用户移动端）

基于 Expo（React Native）开发的用户移动端，复用主项目的 Next.js 后端 API。

## 技术要点

- Expo SDK 57 + React Native 0.86 + TypeScript
- 登录：适配 NextAuth 凭据登录流程（CSRF 校验 + 会话 Cookie 手动捕获与携带）
- 导航：极简页面栈 + 底部四标签（首页/购物车/订单/我的），零导航库依赖
- 功能：商品浏览/搜索/分类筛选、购物车、下单模拟支付、订单管理、退款全流程（申请/撤销/寄回/申诉）、收货地址管理

## 运行方式

前置条件：主项目已在 3000 端口启动（`npm run dev:clean`），数据库已 seed。

```bash
cd app-mobile
npm install
npx expo start
```

- **真机调试**：手机安装 Expo Go，与电脑连同一 WiFi，扫码打开。后端地址会根据 Expo 开发服务器自动推导（见 src/config.ts）。
- **模拟器**：`npx expo start --android`

## 测试账号

| 账号 | 密码 | 角色 |
|------|------|------|
| user1@test.com | 123456 | 普通用户（APP 端登录用） |
| user2@test.com | 123456 | 普通用户 |
| merchant@test.com | 123456 | 商家（请在网页端登录商家后台） |
| admin@test.com | 123456 | 管理员（请在网页端登录管理后台） |

## 目录结构

```
app-mobile/
├── App.tsx                   # 根组件 + 页面栈路由
├── src/
│   ├── config.ts             # 后端地址自动推导、主题色
│   ├── types.ts              # API 契约类型 + 状态映射
│   ├── api/
│   │   ├── client.ts         # 统一请求封装（Cookie 携带 + 未登录回调）
│   │   └── auth.ts           # NextAuth 登录三步流程
│   ├── context/AppContext.tsx # 会话状态 + 页面栈导航
│   └── screens/              # 8 个页面
```
