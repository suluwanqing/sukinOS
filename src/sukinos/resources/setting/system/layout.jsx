import { useSelector, useDispatch } from 'react-redux';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import { sukinOsActions, selectGenerateApp ,selectFileSystemConfig} from '@/sukinos/store';
import Check from '@/component/check/layout';
import SettingsSystemDaydreamIcon from '@mui/icons-material/SettingsSystemDaydream';
import SecurityIcon from '@mui/icons-material/Security';
import MemoryIcon from '@mui/icons-material/Memory';
import LayersIcon from '@mui/icons-material/Layers';
import { confirm} from "@/component/confirm/layout"
import kernel from "@/sukinos/utils/process/kernel"

const bem = createNamespace('setting-system');

function System() {
  const dispatch = useDispatch();
  const generateAppConfig = useSelector(selectGenerateApp);
  const fileSystemConfig = useSelector(selectFileSystemConfig)
  const handleToggleAppConfig = (key, value) => {
    dispatch(sukinOsActions.setGenerateApp({ key, value }));
  };
  const handleToggleFileSystemConfig = (key, value) => {
    dispatch(sukinOsActions.setFileSystemConfig({ key, value }));
  };

  /**
   * 安全关闭序列并执行硬刷新
   * 保证彻底消除所有残留的后台进程与 Worker 线程，清除缓存，避免状态越界污染
   */
  const performSafeHardReload = () => {
    // 遍历并强制杀死所有正在运行的应用进程，物理断开所有 Worker 线程
    try {
      if (kernel && kernel.processes) {
        for (const pid of kernel.processes.keys()) {
          kernel.kill(pid); // 强制 terminate 掉底层运行线程并释放 Blob URL
        }
      }
    } catch (err) {
      console.error('[System] 强制清除残留线程失败:', err);
    }
    //强行注销 Service Worker 防止后台离线机制拦截
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      }).catch(() => {});
    }

    setTimeout(() => {
      // 注入缓存破坏随机戳，执行 location.replace 强制浏览器刷新全部静态资源 (Ctrl + F5 效果)
      const url = new URL(window.location.href);
      url.searchParams.set('_hard_reload', Date.now().toString());
      window.location.replace(url.toString());
    }, 500);
  };

  const handleToggleSingleIframe = (val) => {
    confirm.show({
      title: '确认切换',
      content: '修改单实例运行环境配置需要强制重建所有运行中进程！确定要切换并硬刷新页面吗？',
      onConfirm: () => {
          handleToggleAppConfig('singleIframe', val)
          performSafeHardReload() // 执行安全硬刷新
      }
  });
  }

  const handleTogglePrivate = (val) => {
    confirm.show({
      title: '确认切换',
      content: '修改隐私模式需要清空所有运行中状态并硬重启服务！确定要切换并硬刷新页面吗？',
      onConfirm: () => {
          handleToggleFileSystemConfig('isPrivate', val)
          performSafeHardReload() // 执行安全硬刷新
      }
  });
  }

  const handleToggleVirtualWorker = (val) => {
    confirm.show({
      title: '确认切换沙箱模式',
      content: '修改沙箱运行环境将强制终止所有运行中的 Worker 进程并物理清除进程残留。确定要切换并硬刷新页面吗？',
      onConfirm: () => {
          handleToggleAppConfig('useVirtualWorker', val)
          performSafeHardReload() // 执行安全硬刷新
      },
    });
  }

  return (
    <div className={style[bem.b()]}>

      <div className={style[bem.e('section')]}>
        <div className={style[bem.e('section-title')]}>
          <SettingsSystemDaydreamIcon style={{ fontSize: 18, marginRight: 8 }} />
          应用生成与运行环境
        </div>

        <div className={style[bem.e('card')]}>
          <div className={style[bem.e('toggle-row')]}>
            <div className={style[bem.e('info-group')]}>
              <div className={style[bem.e('label-group')]}>
                <MemoryIcon style={{ fontSize: 16, color: 'var(--su-primary-500)' }} />
                <span className={style[bem.e('label-bold')]}>单实例运行环境</span>
              </div>
              <span className={style[bem.e('description')]}>
                开启后，所有的外部应用将共享同一个 Iframe 容器运行，这能极大减少内存占用，但同时只能前台运行一个隔离环境。
              </span>
            </div>
            <div className={style[bem.e('action-group')]}>
              <Check
                checked={generateAppConfig.singleIframe}
                onChange={(val) => handleToggleSingleIframe(val)}
                type="primary"
                size="medium"
                round
              />
            </div>
          </div>

          <div className={style[bem.e('divider')]}></div>
          <div className={style[bem.e('toggle-row')]}>
            <div className={style[bem.e('info-group')]}>
              <div className={style[bem.e('label-group')]}>
                <LayersIcon style={{ fontSize: 16, color: generateAppConfig.useVirtualWorker ? 'var(--su-success-500)' : 'var(--su-primary-500)' }} />
                <span className={style[bem.e('label-bold')]}>主线程轻量化运行沙箱</span>
              </div>
              <span className={style[bem.e('description')]}>
                开启后，系统在启动应用时不再创建 Web Worker 多线程环境，而改为使用 `with(sandbox) + 隐藏 Iframe` 在主线程内虚拟执行。这完全消除了跨线程的通信耗时和克隆开销，极度利好低端性能机器。
              </span>
            </div>
            <div className={style[bem.e('action-group')]}>
              <Check
                checked={generateAppConfig.useVirtualWorker}
                onChange={(val) => handleToggleVirtualWorker(val)}
                type="success"
                size="medium"
                round
              />
            </div>
          </div>

          <div className={style[bem.e('divider')]}></div>
          <div className={style[bem.e('toggle-row')]}>
            <div className={style[bem.e('info-group')]}>
              <div className={style[bem.e('label-group')]}>
                <SecurityIcon style={{ fontSize: 16, color: generateAppConfig.truthAllApp ? '#ff4d4f' : 'var(--su-gray-500)' }} />
                <span className={style[bem.e('label-bold')]}>信任所有第三方应用</span>
              </div>
              <span className={style[bem.e('description')]}>
                忽略系统级别的安全警告与签名验证，允许直接加载未签名的第三方本地应用源。请仅在开发模式或确信来源安全时开启此项！
              </span>
            </div>
            <div className={style[bem.e('action-group')]}>
              <Check
                checked={generateAppConfig.truthAllApp}
                onChange={(val) => handleToggleAppConfig('truthAllApp', val)}
                type="danger"
                size="medium"
                round
              />
            </div>
          </div>

          <div className={style[bem.e('divider')]}></div>
          <div className={style[bem.e('toggle-row')]}>
            <div className={style[bem.e('info-group')]}>
              <div className={style[bem.e('label-group')]}>
                <SecurityIcon style={{ fontSize: 16, color: fileSystemConfig?.isPrivate ? '#ff4d4f' : 'var(--su-gray-500)' }} />
                <span className={style[bem.e('label-bold')]}>隐私模式</span>
              </div>
              <span className={style[bem.e('description')]}>
                "隐私模式",将不会产生"本地内存",将会寄生于浏览器磁盘中
              </span>
            </div>
            <div className={style[bem.e('action-group')]}>
              <Check
                checked={fileSystemConfig?.isPrivate}
                onChange={(val) => handleTogglePrivate(val)}
                type="danger"
                size="medium"
                round
              />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default System;
