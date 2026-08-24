import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

// 载入 .env 的 DATABASE_URL，供集成测试连接真实数据库
const env = loadEnv("test", process.cwd(), "");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    env,
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // 集成测试连真实 Neon 远程库，首次连接冷启动较慢
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
