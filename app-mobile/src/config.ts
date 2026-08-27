// 全局配置：后端 API 地址自动适配 Expo 开发环境
import Constants from "expo-constants";

// 从 Expo 开发服务器地址推导后端主机：
// 在真机（Expo Go）调试时自动指向电脑的局域网 IP，模拟器/Web 则用 localhost
const hostUri = Constants.expoConfig?.hostUri;
const host = hostUri ? hostUri.split(":")[0] : "localhost";

/** 后端服务地址（Next.js 运行在 3000 端口） */
export const API_BASE_URL = `http://${host}:3000`;

// 京东主题色
export const THEME_COLOR = "#c62828";
