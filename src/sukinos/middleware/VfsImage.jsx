import React, { useState, useEffect, useRef } from 'react';
import fs from '@/sukinos/utils/file/fileKernel';
import { ENV_KEY_META_INFO } from '@/sukinos/utils/config';

const DEFAULT_LOGO = "/logo.jpg";

const VfsImage = ({ app, className, style }) => {
  const [src, setSrc] = useState(null);
  const resolveCount = useRef(0); // 追踪解析次数

  const metaInfo = app?.[ENV_KEY_META_INFO] || {};
  const customIcon = metaInfo?.custom?.icon;
  const defaultIcon = metaInfo?.icon;

  const isDirectResource = (str) => {
    if (!str || typeof str !== 'string') return false;
    return str.startsWith('http') || str.startsWith('/') || str.startsWith('./') || str.startsWith('data:');
  };

  useEffect(() => {
    let isMounted = true;
    resolveCount.current++;
    const target = customIcon || defaultIcon;
    const traceId = `[VfsImage-${app?.pid || 'sys'}-${resolveCount.current}]`;

    // console.groupCollapsed(`${traceId} 开始解析图标`);
    // console.log("CustomIcon:", customIcon);
    // console.log("DefaultIcon:", defaultIcon);
    // console.log("Final Target:", target);

    const resolveIcon = async () => {
      if (!target) {
        // console.log("无目标资源，回退默认图");
        if (isMounted) setSrc(DEFAULT_LOGO);
        console.groupEnd();
        return;
      }

      if (isDirectResource(target)) {
        // console.log("判定为直接路径/URL:", target);
        if (isMounted) setSrc(target);
        console.groupEnd();
        return;
      }

      // 视为 VFS ID
      // console.log("判定为 VFS ID，准备从虚拟盘读取...");
      // console.time(`${traceId} 读取耗时`);
      try {
        if (!fs.ready) {
          // console.log("FS 未就绪，正在 Boot...");
          await fs.boot();
        }

        const data = await fs.readFile(target);
        // console.timeEnd(`${traceId} 读取耗时`);

        if (isMounted && data) {
          // console.log("读取成功，数据长度:", data.length);
          const finalData = (typeof data === 'string' && data.startsWith('data:'))
            ? data
            : `data:image/png;base64,${data}`;
          setSrc(finalData);
        } else {
          // console.warn("读取结果为空，回退默认图");
          if (isMounted) setSrc(DEFAULT_LOGO);
        }
      } catch (e) {
        // console.error("读取过程发生崩溃:", e);
        if (isMounted) setSrc(DEFAULT_LOGO);
      }
      console.groupEnd();
    };

    resolveIcon();
    return () => { isMounted = false; };
  }, [customIcon, defaultIcon, app?.pid]); // 明确依赖项

  return (
    <img
      src={src || DEFAULT_LOGO}
      alt="icon"
      className={className}
      style={style}
      draggable={false}
      onError={(e) => {
        console.error("图片渲染错误(裂图):", src?.substring(0, 50));
        e.target.src = DEFAULT_LOGO;
      }}
    />
  );
};

export default React.memo(VfsImage);
