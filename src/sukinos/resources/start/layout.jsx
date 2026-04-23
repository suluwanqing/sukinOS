import React, { useState, useMemo } from "react";
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import {
  ENV_KEY_META_INFO,
  ENV_KEY_NAME,
  ENV_KEY_RESOURCE_ID,
  SUKIN_EXT,
  SUKIN_PRE
} from '@/sukinos/utils/config';
import useKernel from "@/sukinos/hooks/useKernel";
import { confirm } from '@/component/confirm/layout';
import SearchIcon from '@mui/icons-material/Search';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import fs from '@/sukinos/utils/file/fileKernel';

const bem = createNamespace('start');

// 通用沙箱数据清理函数
export const clearAppSandboxData = async (app) => {
  const pid = app.pid;
  const resourceId = app?.[ENV_KEY_META_INFO]?.[ENV_KEY_RESOURCE_ID];
  const prefix = `pid-${pid}_`;

  // 清理 localStorage
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      window.localStorage.removeItem(key);
      i--; // 移除后索引回退
    }
  }
  // 清理 sessionStorage
  for (let i = 0; i < window.sessionStorage.length; i++) {
    const key = window.sessionStorage.key(i);
    if (key && key.startsWith(prefix)) {
      window.sessionStorage.removeItem(key);
      i--; // 移除后索引回退
    }
  }
  // 清理 indexedDB
  if (window.indexedDB && window.indexedDB.databases) {
    try {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name && db.name.startsWith(prefix)) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    } catch (e) {
      console.warn('Failed to clear indexedDB for pid:', pid, e);
    }
  }

  // 针对特定系统应用的独立宿主存储清理
  if (resourceId === 'sys-loacl-dev-demo') {
    window.localStorage.removeItem('sukin_local_dev_config');
  }

  // 若应用在虚拟文件系统中建立了专属目录/节点 [通常以 resourceId 命名]，尝试将其一并清空
  if (resourceId && fs.ready) {
    try {
      await fs.unlink(resourceId);
    } catch (e) {
      // 忽略未找到等错误
    }
  }
};

const SearchBar = ({ searchQuery, setSearchQuery }) => (
  <div className={style[bem.e('search-bar')]}>
    <SearchIcon sx={{ color: 'var(--su-text-color-secondary)', fontSize: 20 }} />
    <input
      type="text"
      placeholder="搜索应用..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className={style[bem.e('search-input')]}
      autoFocus
    />
  </div>
);

function Start(props) {
  const { handleFocus } = props;
  const { apps, runningApps, startApp, kernel } = useKernel();
  const [searchQuery, setSearchQuery] = useState('');

  const getAppName = (app) => {
    const metaName = app?.[ENV_KEY_META_INFO]?.name;
    const envName = app?.[ENV_KEY_NAME]?.replace(SUKIN_EXT, '')?.replace(SUKIN_PRE, '');
    return metaName || envName || app.pid;
  };

  const filteredApps = useMemo(() => {
    const safeApps = Array.isArray(apps) ? apps : Object.values(apps || {});
    if (!searchQuery.trim()) return safeApps;
    const lowerQuery = searchQuery.toLowerCase();
    return safeApps.filter(app => {
      const name = getAppName(app);
      return name.toLowerCase().includes(lowerQuery);
    });
  }, [apps, searchQuery]);

  const handleStart = (pid) => {
    if (handleFocus) handleFocus(pid);
    if (startApp) {
      startApp({ pid });
    }
  };

  const handleResetData = (app) => {
    const name = getAppName(app);
    confirm.show({
      title: '重置数据',
      content: `您确定要重置并清空 [${name}] 的所有本地缓存数据吗？此操作不可逆。`,
      onConfirm: async () => {
        // 强制杀死进程并完全清除内核中保存的状态,调用独立的强制重置函数
        if (kernel && kernel.forceResetApp) {
          await kernel.forceResetApp(app.pid);
        }
        // 清理浏览器侧沙箱的持久化存储 (localStorage/sessionStorage/IndexedDB)
        await clearAppSandboxData(app);
      }
    });
  };

  const handleDelete = (app) => {
    const name = getAppName(app);
    const metaInfo = app?.[ENV_KEY_META_INFO] || {};
    confirm.show({
      title: '确认删除',
      content: `您确定要删除 [${name}] 吗？将同步清除其产生的所有本地沙箱数据。`,
      onConfirm: async () => {
        // 先清理沙箱数据
        await clearAppSandboxData(app);
        // 调用内核删除进程与资源
        if (kernel && kernel.deleteApp) {
          await kernel.deleteApp({
            pid: app.pid,
            resourceId: metaInfo?.[ENV_KEY_RESOURCE_ID]
          });
        }
      }
    });
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('container')]}>
        <div className={style[bem.e('header')]}>
          <div className={style[bem.e('title-row')]}>
            <h2 className={style[bem.e('title')]}>应用列表</h2>
            <span className={style[bem.e('count')]}>共 {filteredApps.length} 个</span>
          </div>
          <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </div>

        <div className={style[bem.e('list-wrapper')]}>
          {filteredApps.length > 0 ? (
            <div className={style[bem.e('list')]}>
              {filteredApps.map((app) => {
                const metaInfo = app?.[ENV_KEY_META_INFO] || {};
                const isRunning = runningApps.some(r => r.pid === app.pid);

                return (
                  <div key={app.pid} className={style[bem.e('list-item')]}>
                    <div
                      className={style[bem.e('item-info')]}
                      onDoubleClick={() => handleStart(app.pid)}
                    >
                      <div className={style[bem.e('app-icon')]}>
                        <img
                          src={metaInfo.icon || '/default-app-icon.png'}
                          alt={getAppName(app)}
                          onError={(e) => { e.target.src = '/default-app-icon.png'; }}
                        />
                      </div>
                      <div className={style[bem.e('app-detail')]}>
                        <div className={style[bem.e('app-name-row')]}>
                          <span className={style[bem.e('app-name')]}>
                            {getAppName(app)}
                          </span>
                          {isRunning && (
                            <span className={style[bem.e('status-tag')]}>运行中</span>
                          )}
                        </div>
                        <div className={style[bem.e('app-meta')]}>
                          {metaInfo.version && <span className={style[bem.e('meta-text')]}>{`${metaInfo.version}`.startsWith('v') || `${metaInfo.version}`.startsWith('V') ? metaInfo.version : `v${metaInfo.version}`}</span>}
                          {metaInfo.author && <span className={style[bem.e('meta-text')]}>by {metaInfo.author}</span>}
                        </div>
                        {metaInfo.description && (
                          <div className={style[bem.e('app-desc')]}>{metaInfo.description}</div>
                        )}
                      </div>
                    </div>

                    <div className={style[bem.e('item-actions')]}>
                      <button
                        className={[style[bem.e('action-btn')], style[bem.em('action-btn', 'start')]].join(' ')}
                        onClick={() => handleStart(app.pid)}
                        title="启动"
                      >
                        <PlayArrowRoundedIcon sx={{ fontSize: 20 }} />
                      </button>

                      <button
                        className={[style[bem.e('action-btn')], style[bem.em('action-btn', 'reset')]].join(' ')}
                        onClick={() => handleResetData(app)}
                        title="重置数据"
                      >
                        <RestartAltRoundedIcon sx={{ fontSize: 18 }} />
                      </button>

                      <button
                        className={[style[bem.e('action-btn')], style[bem.em('action-btn', 'delete')]].join(' ')}
                        onClick={() => handleDelete(app)}
                        title="卸载"
                      >
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={style[bem.e('empty-state')]}>
              {searchQuery ? '未找到匹配的应用' : '暂无已安装的应用'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(Start);
