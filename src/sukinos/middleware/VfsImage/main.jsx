import React, { useState, useEffect, useRef } from 'react';
import fs from '@/sukinos/utils/file/fileKernel';
import { ENV_KEY_META_INFO ,DEFAULT_LOGO} from '@/sukinos/utils/config';
// 模块级缓存：同一图标的 VFS 读取只做一次
const vfsImageCache = new Map();

export const VfsImage = ({ app, className, style }) => {
  //初始状态直接设为 DEFAULT_LOGO，确保第一时间有静态图渲染
  const [src, setSrc] = useState(DEFAULT_LOGO);
  const resolveCount = useRef(0);

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


    const resolveIcon = async () => {
      if (!target) {
        if (isMounted) setSrc(DEFAULT_LOGO);
        return;
      }

      if (vfsImageCache.has(target)) {
        if (isMounted) setSrc(vfsImageCache.get(target));
        return;
      }

      if (isDirectResource(target)) {
        vfsImageCache.set(target, target);
        if (isMounted) setSrc(target);
        return;
      }

      // 剩下的取值视为 VFS ID：耗时的读取前先拿静态图顶上（defaultIcon 本身是可直用的图就用它），读成功再替换
      const placeholderImg = isDirectResource(defaultIcon) ? defaultIcon : DEFAULT_LOGO;
      if (isMounted) setSrc(placeholderImg);

      try {
        if (!fs.ready) {
          await fs.boot();
        }

        const data = await fs.readFile(target);

        if (isMounted && data) {
          const finalData = (typeof data === 'string' && data.startsWith('data:'))
            ? data
            : `data:image/png;base64,${data}`;

          vfsImageCache.set(target, finalData);

          setSrc(finalData);
        } else {
          if (isMounted) setSrc(DEFAULT_LOGO);
        }
      } catch (e) {
        if (isMounted) setSrc(DEFAULT_LOGO);
      }
    };

    resolveIcon();
    return () => { isMounted = false; };
  }, [customIcon, defaultIcon, app?.pid]);

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
