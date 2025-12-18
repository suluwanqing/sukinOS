//编译器
export const BabelLoader = {
  loaded: false,
  CDN_URL: 'https://cdn.bootcdn.net/ajax/libs/babel-standalone/7.23.5/babel.min.js',

  async load() {
    if (this.loaded || window.Babel) { this.loaded = true; return; }
    try {
      const localModule = await import('@babel/standalone');
      window.Babel = localModule.default || localModule;
      this.loaded = true;
      return;
    } catch (e) {
      // 如果本地加载失败，则继续尝试从 CDN 加载
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.CDN_URL;
      // 这个 data-plugins 属性是针对旧版 babel-standalone 的，对于v7可能不是必需的
      script.setAttribute('data-plugins', 'transform-modules-umd');
      script.onload = () => {
        if (window.Babel) {
          this.loaded = true;
          resolve();
        } else {
          reject(new Error("Babel丢失!"));
        }
      };
      script.onerror = () => reject(new Error("babel加载失败"));
      document.head.appendChild(script);
    });
  },

  transform(code) {
    if (!window.Babel) throw new Error("WAIT_FOR_BABEL");
    try {
      // 原始配置 presets: ['react', 'env'] 会导致编译后的代码直接调用 `React.createElement`。
      // 在我们的沙箱环境中，没有顶级的 `React` 变量，只有 `AppSDK.React`。
      // 因此，我们必须修改 Babel 配置，告诉它如何正确地转换 JSX。
      return window.Babel.transform(code, {
        presets: [
          'env', // env preset 保持不变，用于转换ES6+语法
          // 我们将 'react' 字符串替换为一个详细的配置数组
          ['react', {
            // pragma 指示 Babel 在遇到 JSX 标签 (如 <div>) 时应该使用哪个函数。
            // 我们将其设置为 'AppSDK.React.createElement'，
            // 这样 `<div>` 就会被编译成 `AppSDK.React.createElement('div', ...)`。
            pragma: 'AppSDK.React.createElement',
            // pragmaFrag 指示 Babel 在遇到 JSX Fragment (如 <>) 时应该使用哪个组件。
            // 其设置为 'AppSDK.React.Fragment'。
            pragmaFrag: 'AppSDK.React.Fragment',
            // 必须使用 'classic' runtime 来启用 pragma 和 pragmaFrag 的自定义配置。
            // 'automatic' runtime 使用不同的机制，需要注入 '@babel/runtime/jsx-runtime'，
            // 这会使我们的注入逻辑复杂化。
            runtime: 'classic',
          }]
        ],
        filename: 'component.jsx',
        sourceType: 'module'
      }).code;
    } catch (e) {
      // 包装原始错误以提供更清晰的上下文
      throw new Error(`babel加载失败: ${e.message}`);
    }
  }
};
