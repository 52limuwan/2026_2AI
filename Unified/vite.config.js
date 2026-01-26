import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [
    vue()
    // 禁用自动导入，改为手动全量导入以提升性能
    // AutoImport({
    //   resolvers: [ElementPlusResolver()],
    //   imports: ['vue', 'vue-router', 'pinia'],
    //   dts: 'src/auto-imports.d.ts'
    // }),
    // Components({
    //   resolvers: [ElementPlusResolver()],
    //   dts: 'src/components.d.ts'
    // })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@client': path.resolve(__dirname, './src/modules/client'),
      '@guardian': path.resolve(__dirname, './src/modules/guardian'),
      '@merchant': path.resolve(__dirname, './src/modules/merchant'),
      '@gov': path.resolve(__dirname, './src/modules/gov')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 8888,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia', 'element-plus', 'axios']
  }
})
