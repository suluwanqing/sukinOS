import {defineConfig, searchForWorkspaceRoot, loadEnv} from 'vite'
import viteCompression from 'vite-plugin-compression'
import react from '@vitejs/plugin-react'
import path from 'path'

// indexDb数据库配置文件
const fakeDataDbConfig = {
  dbName: 'fakeDataDb',
  cacheTableName: 'fakeDataDb_NOSQL',
  keyPath: 'dataId',
  autoTimestamp: true,
  indexs: [
    {name: 'dataName', unique: false},
    {name: 'dataType', unique: false},
    {name: 'data', unique: false},
    {
      name: 'id_type',
      path: ['dataId', 'dataType'],
      unique: true,
    },
  ],
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd())
  const isProduction = mode === 'production'

  return {
    esbuild: {
      // 生产环境移除 console 和 debugger
      // drop: isProduction ? ['console', 'debugger'] : [],
    },

    plugins: [
      react(),
      viteCompression({
        algorithm: 'brotliCompress', // 使用 Brotli 压缩，比 Gzip 更小
        ext: '.br',
      }),
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@config': path.resolve(__dirname, './src/config'),
      },
    },
    build: {
      assetsInlineLimit: 0,
      cssCodeSplit: true, //css拆分
      minify: 'esbuild',
      modulePreload: {
        polyfill: true,
      },
      rollupOptions: {
        output: {
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          // 静态资源分类打包
          assetFileNames: assetInfo => {
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name)) {
              return 'assets/media/[name]-[hash][extname]'
            }
            if (/\.(png|jpe?g|gif|svg|ico|webp)(\?.*)?$/i.test(assetInfo.name)) {
              return 'assets/images/[name]-[hash][extname]'
            }
            if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name)) {
              return 'assets/fonts/[name]-[hash][extname]'
            }
            // 注意：这里的 [ext] 是 Rollup 的占位符，会自动变成 css, xml 等
            return 'assets/[ext]/[name]-[hash][extname]'
          },
          manualChunks: {
            'vendor-base': [
              'react',
              'react-dom',
              'react-redux',
              '@reduxjs/toolkit',
              'redux-persist',
              'redux-persist-transform-filter',
              'axios',
              'crypto-js',
              'date-fns',
            ],
            //MUI让vite自己处理树晃
            'vendor-ui': ['@emotion/react', '@emotion/styled'],
            'feature-editor': ['@monaco-editor/react', '@monaco-editor/loader', 'monaco-editor'],
            'feature-terminal': ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-web-links'],
            'feature-engine': ['@webcontainer/api', '@babel/standalone', 'diff-match-patch'],
          },
        },
      },
    },
    define: {
      // 注入数据库配置
      'import.meta.env.FAKE_DATA_DB_CONFIG': JSON.stringify(fakeDataDbConfig),
      'import.meta.env.VITE_FAKEDATA_FILE_MAX': JSON.stringify(10 * 1024 * 1024),
      // 或者使用全局变量
      __FAKEDATA_DB_CONFIG__: JSON.stringify(fakeDataDbConfig),
    },
    server: {
      port: 8888,
      proxy: {
        // '/api': {
        //   target: 'http://127.0.0.1:8001',
        //   changeOrigin: true,
        //   rewrite: path => path.replace(/^\/api/, ''),
        //   bypass: (req, res, proxyOptions) => {
        //     const kernelHeader = req.headers['x-kernel-process-id']
        //     if (kernelHeader) {
        //       return req.url
        //     }
        //     return false  //这里会从项目文件查找[非后端]
        //   },
        // },
      },
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
      fs: {
        allow: [searchForWorkspaceRoot(process.cwd()), 'node_modules/@webcontainer/api/dist'],
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
