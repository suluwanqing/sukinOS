export const BabelLoader = {
  loaded: false,
  CDN_URL: 'https://cdn.bootcdn.net/ajax/libs/babel-standalone/7.23.5/babel.min.js',

  async load() {
    if (this.loaded || window.Babel) {
      this.loaded = true
      return
    }
    try {
      const localModule = await import('@babel/standalone')
      window.Babel = localModule.default || localModule
      this.loaded = true
      return
    } catch (e) {
      // 如果本地加载失败，则继续尝试从 CDN 加载
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = this.CDN_URL
      // 这个 data-plugins 属性是针对旧版 babel-standalone 的，对于v7可能不是必需的
      script.setAttribute('data-plugins', 'transform-modules-umd')
      script.onload = () => {
        if (window.Babel) {
          this.loaded = true
          resolve()
        } else {
          reject(new Error('Babel丢失!'))
        }
      }
      script.onerror = () => reject(new Error('babel加载失败'))
      document.head.appendChild(script)
    })
  },

  transform(code, options = {}) {
    const {type = 'jsx', module = 'component'} = options
    if (!window.Babel) throw new Error('WAIT_FOR_BABEL')
    try {
      // 沙箱里没有顶级的 React 变量，只有 AppSDK.React，故改写 JSX 的编译出口
      return window.Babel.transform(code, {
        presets: [
          'env',
          [
            'react',
            {
              // pragma/pragmaFrag 决定 JSX 标签与 Fragment 各编译成哪个函数，须配 classic runtime 才生效
              pragma: 'AppSDK.React.createElement',
              pragmaFrag: 'AppSDK.React.Fragment',
              runtime: 'classic',
            },
          ],
        ],
        filename: `${module}.${type}` || 'component.jsx',
        sourceType: 'module',
      }).code
    } catch (e) {
      throw new Error(`babel加载失败: ${e.message}`)
    }
  },
}
