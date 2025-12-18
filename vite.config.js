import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd())
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // 可以在这里为配置创建别名
        '@config': path.resolve(__dirname, './src/config'),
      },
    },
    define: {
      // 注入数据
    },
    server: {
      port: 12345,
      proxy: {
        '/api': {
          target: 'http://localhost:8001',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, ''),
          bypass: (req, res, proxyOptions) => {
            //拦击沙盒,直接转发出去避免撞服务器,导致问题
            const kernelHeader = req.headers['x-kernel-process-id']
            if (kernelHeader) {
              return req.url
            }
            return false
          },
        },
      },
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    preview: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
  }
})
