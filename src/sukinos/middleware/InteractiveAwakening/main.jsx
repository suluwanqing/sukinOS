import React, { useState, useMemo } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import processKernel from "@/sukinos/utils/process/kernel";

import styles from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';

const bem = createNamespace('interactive-awakening');

export const InteractiveAwakening = ({
  visible,
  type = 'editor',
  title = '选择交互应用',
  description = '请选择一个程序来执行此操作',
  interactInfo,
  from='system',
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');


  const apps = useMemo(() => {
    if (!visible || !type) return [];
    try {
      const rawApps = processKernel.getTypeApps(type) || [];
      return rawApps.map(app => ({
        id: app.pid,
        name: app.name || app.appName || '未名应用',
        icon: app.metaInfo?.icon || null,
        description: app.metaInfo?.description || '系统预设程序'
      }));
    } catch (error) {
      console.warn(`[InteractiveAwakening] 获取类型 [${type}] 列表失败:`, error);
      return [];
    }
  }, [visible, type]);

  const filteredApps = useMemo(() => {
    if (!visible) return [];
    return apps.filter(app =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [apps, searchQuery, visible]);

  if (!visible) return null;

  const handleAppSelect = (pid) => {
    try {
      processKernel.evokeApp({
        pid,
        from,
        interactInfo: {
          ...interactInfo
        }
      });
    } catch (error) {
      console.error("[InteractiveAwakening] 唤醒内核应用失败:", error);
    }
    if (onClose) onClose();
  };

  return (
    <div className={styles[bem.b()]}>

      <div className={styles[bem.e('backdrop')]} onClick={onClose} />


      <div className={styles[bem.e('card')]}>


        <div className={styles[bem.e('header')]}>
          <div className={styles[bem.e('header-info')]}>
            <h3 className={styles[bem.e('title')]}>
              {title}
            </h3>
            <p className={styles[bem.e('description')]}>
              {description}
            </p>
          </div>
          <button onClick={onClose} className={styles[bem.e('close-btn')]}>
            <CloseIcon style={{ fontSize: 18 }} />
          </button>
        </div>


        <div className={styles[bem.e('search-bar')]}>
          <div className={styles[bem.e('search-inner')]}>
            <SearchIcon className={styles[bem.e('search-icon')]} style={{ fontSize: 16 }} />
            <input
              type="text"
              placeholder="搜索可用应用..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles[bem.e('input')]}
            />
          </div>
        </div>


        <div className={styles[bem.e('content')]}>
          {filteredApps.length === 0 ? (
            <div className={styles[bem.e('empty')]}>
              <span>暂无相兼容的交互应用</span>
            </div>
          ) : (
            <div className={styles[bem.e('grid')]}>
              {filteredApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => handleAppSelect(app.id)}
                  className={styles[bem.e('item')]}
                >
                  <div className={styles[bem.e('icon-wrapper')]}>
                    {app.icon ? (
                      <img
                        src={app.icon}
                        alt={app.name}
                        className={styles[bem.e('app-icon')]}
                      />
                    ) : (
                      <div className={styles[bem.e('app-placeholder')]}>
                        {app.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className={styles[bem.e('info')]}>
                    <span className={styles[bem.e('app-name')]}>
                      {app.name}
                    </span>
                    <span className={styles[bem.e('app-desc')]}>
                      {app.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>


        <div className={styles[bem.e('footer')]}>
          <span>行为类别: {type}</span>
          <span>交互总线</span>
        </div>

      </div>
    </div>
  );
};

export default React.memo(InteractiveAwakening);
