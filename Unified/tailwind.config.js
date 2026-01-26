/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./src/modules/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // 启用 class 模式的深色模式
  theme: {
    extend: {
      colors: {
        // 柔和护眼配色方案
        primary: '#5b8db8',      // 柔和蓝色
        secondary: '#7ba591',    // 柔和绿色
        success: '#82b892',      // 温和绿色
        warning: '#d4a574',      // 柔和橙色
        danger: '#d88888',       // 柔和红色
        info: '#9da5ae',         // 柔和灰蓝
        // 渐变色定义
        soft: {
          blue: '#8fabc7',
          purple: '#a89bc7',
          pink: '#c7a2b8',
          green: '#95b8a3',
          teal: '#89b8b0',
        }
      }
    },
  },
  plugins: [],
}
