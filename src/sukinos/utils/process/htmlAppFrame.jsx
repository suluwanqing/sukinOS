import React, { memo, useLayoutEffect, useMemo } from 'react';
import { buildAppDocument, APP_SDK_REGISTRY } from './htmlDocument';

/**
 * 文档档应用外壳：内容包里的 HTML 入口合成成自包含子文档，用 srcdoc 渲染。
 *
 * 这里刻意不加 sandbox 属性 —— 子文档必须与宿主同源，引导脚本才读得到宿主登记表。
 * 注册用 useLayoutEffect：srcdoc 的解析排在下一个任务，本 effect 与 srcDoc 属性落在同一次
 * 提交里，子文档脚本求值时一定能取到 SDK。
 */
const HtmlAppFrame = ({ pid, htmlKey, files, sdk }) => {
  useLayoutEffect(() => {
    const registry = globalThis[APP_SDK_REGISTRY] || (globalThis[APP_SDK_REGISTRY] = {});
    registry[pid] = sdk;
    return () => { delete registry[pid]; };
  }, [pid, sdk]);

  const doc = useMemo(() => buildAppDocument(htmlKey, files, pid), [htmlKey, files, pid]);

  if (!doc) {
    return (
      <div style={{ padding: '16px', color: '#cf1322', background: '#fff2f0' }}>
        视图入口 {htmlKey} 不在内容包里
      </div>
    );
  }
  return (
    <iframe
      title={`app-doc-${pid}`}
      srcDoc={doc}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#fff' }}
    />
  );
};

export default memo(HtmlAppFrame, (prev, next) => {
  return prev.pid === next.pid
    && prev.htmlKey === next.htmlKey
    && prev.files === next.files
    && prev.sdk === next.sdk;
});
