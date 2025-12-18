import React, { useState, useEffect } from 'react';
import { compileSourceAsync, scopeCss } from '@/utils/process/renderWindow';
// 导入两个不同权限等级的基础SDK
import  { devAppSdk, adminAppSdk } from "@/main/resources/sdk";

//创建我们内置的全局AppSDK,直接就是变量可以直接使用
// 此函数现在接收 isSystemApp 标志，以决定注入哪个基础SDK。
// 函数逻辑已：它现在只负责：1. 选择基础SDK；2. 注入私有API；3. 冻结。
const createSdkForInstance = (dispatch, pid, isSystemApp) => {
  // 使用立即执行函数表达式创建一个闭包，用于隐藏私有变量。
  // 'processId' 存在于这个闭包中，沙箱内的代码无法访问它。
  const privateScope = (() => {
    const processId = pid;
    const KERNEL_HEADER_KEY = 'x-kernel-process-id'; // 定义一个常量来存储我们控制的header名，避免魔法字符串
    // 定义一个安全的fetch函数。
    // 此函数在闭包内，因此可以访问私有的 processId。
    const secureFetch = async (url, options = {}) => {
      const headers = new Headers(options.headers);
      // 唯一要做的就是附加我们的身份标识头。
      headers.set(KERNEL_HEADER_KEY, processId);
      const modifiedOptions = {
        ...options,
        headers: headers,
      };
      // 直接使用用户提供的原始 URL 调用全局 fetch。
      //这里的话可以做一个检测对吧
      // 浏览器将负责处理 DNS 查询、CORS 策略等所有标准网络流程。
      return window.fetch(url, modifiedOptions);
    };

    // 返回将要暴露给应用的、经过安全封装的API
    return {
      fetch: secureFetch,
      navigate: (path) => dispatch({ type: 'NAVIGATE', payload: path }),
    };
  })();

  // 根据 isSystemApp 标志，选择要使用的基础SDK对象。
  // 这实现了基于应用类型的权限分级。
  const baseSdk = isSystemApp ? adminAppSdk : devAppSdk;

  // 基础SDK结构，合并了选择的基础SDK和我们运行时生成的安全API - [原有注释已简化]
  const sdk = {
    ...baseSdk,
    API: {
      ...baseSdk.API,
      ...privateScope,
    }
  };

  //定义一个深度冻结函数，递归地使对象及其所有属性只读。
  const deepFreeze = (obj) => {
    if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
      Object.keys(obj).forEach(prop => {
        if (obj[prop] !== null && typeof obj[prop] === 'object') {
          deepFreeze(obj[prop]);
        }
      });
      Object.freeze(obj);
    }
    return obj;
  };

  // 我们不再对整个 sdk 对象进行深度冻结。
  // 我们只精确地冻结我们自己创建的、需要保护的命名空间：API 和 Components。
  // React 和它的 Hooks 保持原样，允许 React 内部进行必要的修改。
  // 只冻结我们自己的命名空间
  deepFreeze(sdk.API);
  deepFreeze(sdk.Components);

  // 同时，对顶层 sdk 对象进行浅冻结，可以防止应用代码添加/删除顶层属性（如 sdk.React = null）。
  return Object.freeze(sdk);
};


//动态渲染器,负责注入和渲染UI。
// 组件现在接收 isSystemApp prop 来判断应用类型。
const DynamicRenderer = ({ resource, state, dispatch, pid, isSystemApp }) => {
  // resource:{css,jsx代码}
  const [modules, setModules] = useState(null);

  useEffect(() => {
    if (!resource) return;
    // 在 effect 内部为当前渲染的进程实例创建一个专属的SDK。
    // 这样能确保SDK中的API（如API.navigate）使用的是正确的dispatch函数。
    // 现在将 pid 也传递进去，以创建带有身份标识的安全SDK。
    // 同时传递 isSystemApp 标志，以创建正确权限等级的SDK。
    const instanceSDK = createSdkForInstance(dispatch, pid, isSystemApp);
    const loadAll = async () => {
      const resultMap = {};
      //content是组件代码
      if (!resource.isBundle) { //单页
        const res = await compileSourceAsync(resource.content);
        if (!res.error) {
          const exports = {};
          // 调用 factory 时，将整个 instanceSDK 对象作为第三个参数注入。
          // 这对应了 renderWindow.js 中 new Function('module', 'exports', 'AppSDK', ...) 的签名。
          res.factory({ exports }, exports, instanceSDK);
          resultMap['main'] = { Component: exports.default || exports, style: exports.style || '' };
        }
      } else {
        const files = Object.entries(resource.content);
        for (const [key, code] of files) {
          if (typeof code === 'string') {
            const res = await compileSourceAsync(code);
            if (!res.error) {
              const exports = {};
              // 对于bundle中的每个文件，都使用相同的 instanceSDK 进行注入。
              res.factory({ exports }, exports, instanceSDK);
              resultMap[key] = { Component: exports.default || exports, style: exports.style || '' };
            }
          }
        }
      }
      setModules(resultMap);
    };
    loadAll();
  }, [resource, dispatch, pid, isSystemApp]); // 将 isSystemApp 加入依赖数组

  useEffect(() => {
    if (!modules) return;
    const css = Object.values(modules).map(m => m.style).join('\n');
    const id = `css-${pid}`;
    if (css && !document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id; tag.innerHTML = scopeCss(css, pid);
      document.head.appendChild(tag);
    }
    return () => document.getElementById(id)?.remove();
  }, [modules, pid]);

  if (!modules) return <div>加载中?资源损坏?</div>;

  // 写好的,全局Props注入
  // commonProps 仍然非常有用。虽然应用代码可以通过 AppSDK 访问核心API，
  // 但将这些常用属性直接通过 props 传递给顶层组件（Layout, PageComponent）可以简化顶层组件的编写，
  // 使其不必每次都从 AppSDK[也是全局注入的主要是为了限制App]中解构。这是一种便利性的保留。
  const commonProps = {
    state,
    dispatch,
    pid,
    navigate: (path) => dispatch({ type: 'NAVIGATE', payload: path })
  };

  if (!resource.isBundle) {    //单页
    const Main = modules['main']?.Component;
    return Main ? <div id={`proc-${pid}`} style={{height:'100%'}}><Main {...commonProps} /></div> : null;
  }

  const Layout = modules['layout']?.Component;
  if (!Layout) return <div>资源layout.jsx 丢失!</div>;

  //这里就是内部路由的处理
  //目前只支持顶层路由,没有缓存处理
  const currentPath = state.router?.path || 'home';
  const RawPage = modules[currentPath]?.Component || (() => <div>404: {currentPath}</div>);


  //注入dispatch和navigate等
  const ConnectedPage = (props) => <RawPage {...commonProps} {...props} />;

  return (
    <div id={`proc-${pid}`} style={{height:'100%'}}>
      <Layout {...commonProps} PageComponent={ConnectedPage} />
    </div>
  );
};

export default React.memo(DynamicRenderer);
