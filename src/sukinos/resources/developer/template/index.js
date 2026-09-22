/**
 * 内置示例应用（预制文件）
 *
 * 正文是 developer/template/sukinOS 下的真实源码文件，构建期用 ?raw 读成字符串，
 * 挂载时由 fileIndexDb 写成文件系统根目录下的一个文件夹（根层即 layout.jsx / logic.jsx），
 * 开发者中心选它一次就能解析入口、预览、创建。
 * 清单（id + path）登记在 utils/config.js 的 preSystemSampleFiles，这里只负责把 path 对上正文。
 */
import { preSystemSampleFiles } from '@/sukinos/utils/config';

const rawModules = import.meta.glob('./sukinOS/**/*', {
  query: '?raw',
  import: 'default',
  eager: true
});

const PREFIX = './sukinOS/';

const contents = Object.fromEntries(
  Object.entries(rawModules)
    .filter(([modulePath]) => modulePath.startsWith(PREFIX))
    .map(([modulePath, content]) => [modulePath.slice(PREFIX.length), String(content)])
);

export const SAMPLE_APP_FILES = preSystemSampleFiles
  .filter((file) => {
    if (contents[file.path] !== undefined) return true;
    console.error(`[VFS] 示例应用清单与正文不匹配，已跳过: ${file.path}`);
    return false;
  })
  .map((file) => {
    const segments = file.path.split('/');
    return {
      id: file.id,
      name: segments.pop(),
      dirs: segments,
      content: contents[file.path]
    };
  });
