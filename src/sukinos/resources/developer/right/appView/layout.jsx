import React, { memo, useMemo } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';

// 抽离出来、专门负责隔离沙箱与编译视图的核心渲染引擎
import RenderProcess from '@/sukinos/utils/process/renderProcess';

const bem = createNamespace('appview');

/**
 * 预览窗口容器组件
 *
 * 职责：
 * 接收宿主传递的 app 配置对象（可能为单页，默认多为多页 bundle）
 * 转换数据结构，将单页和多页抹平为标准的 localFiles 集合
 * 挂载 RenderProcess 核心渲染进程引擎
 * 原本在此处声明的 getGhostSandbox (幽灵沙箱)、PreviewErrorBoundary (错误边界)、
 * compileSourceAsync (动态编译) 以及 createSdkForInstance (特权通行 SDK)，
 * 现已全部封装并下沉至 RenderProcess 组件中进行统一收口管理。
 */
const AppView = ({ app }) => {
  // 弃用 useRef，改用 useMemo。
  // 只要 app 对象的引用发生变化（例如切换了文件夹重新生成了预览对象），
  // 就会强制生成一个全新的 PID，确保沙箱、存储和 CSS 作用域彻底隔离。
  const previewId = useMemo(() => {
    return `preview-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }, [app]);

  // 根据 app.isBundle 区分，统一抹平为 RenderProcess 支持的多文件集合结构
  // 默认应该是多页页面才对
  const localFiles = useMemo(() => {
    if (!app) return {};

    if (app.isBundle && app.files) {
      // 多页结构：直接透传 files 对象字典（如 { "layout.jsx": "...", "home.jsx": "..." }）
      return app.files;
    } else if (app.viewCode) {
      // 单页结构：将孤立的 viewCode 包装成 main.jsx，
      // 这样 RenderProcess 会自动将其识别为 Layout 主组件入口并执行渲染。
      return { 'main.jsx': app.viewCode };
    }

    return {};
  }, [app]);

  // 提取逻辑代码，如果不存在则赋予空字符串防止引擎 Worker 解析崩溃
  const localLogicCode = useMemo(() => {
    return app?.logicCode || '';
  }, [app]);

  // 拦截应用未挂载或数据缺失的情况
  if (!app) return <div>加载预览中...</div>;

  return (
    // 注意这里去掉了 .current，直接使用 previewId
    <div className={style[bem.b()]} id={`proc-${previewId}`}>
      <div className={style[bem.e('content')]}>
        {/*
          增加 key={previewId}
          利用 React 机制，当 PID 改变时，强制卸载旧的 RenderProcess 并挂载全新的实例。
          这不仅解决了 CSS 更新问题，还能确保 Worker 和内部状态完全重置，杜绝内存泄漏！
        */}
        <RenderProcess
          key={previewId}
          localFiles={localFiles}
          localLogicCode={localLogicCode}
          previewId={previewId}
        />
      </div>
    </div>
  );
};

export default memo(AppView);
