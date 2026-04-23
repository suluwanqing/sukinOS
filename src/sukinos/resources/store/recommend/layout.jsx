import { useEffect, useRef, useMemo } from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import Input from '@/component/input/layout';
import SearchIcon from '@mui/icons-material/Search';

const bem = createNamespace('recommend');

function Recommend({
  remoteApps,
  installedApps,
  updateApps,
  onLoadMore,
  hasMore,
  isLoading,
  startApp,
  installApp,
  searchResults,
  searchKeyword,
  onKeywordChange, 
  searchLoading
}) {
  const observerTarget = useRef(null);

  const displayList = useMemo(() => {
    const list = searchResults !== null ? searchResults : remoteApps;

    return list.map(app => {
      // 检查是否已安装：强制字符串比对，防止 ID 类型差异导致的匹配失败
      const installedInfo = installedApps.find(i => String(i.resourceId) === String(app.resourceId));
      // 检查是否有更新
      const updateInfo = updateApps.find(u => String(u.resourceId) === String(app.resourceId));

      return {
        ...app,
        isInstalled: !!installedInfo,
        hasUpdate: !!updateInfo,
        displayName: app.appName || app.name || '未知应用'
      };
    });
  }, [searchResults, remoteApps, installedApps, updateApps]);

  // 无限滚动逻辑
  useEffect(() => {
    const target = observerTarget.current;
    if (!target || searchResults !== null) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, isLoading, searchResults]);

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <div className={style[bem.e('hero')]}>
          <h2>探索</h2>
          <div className={style[bem.e('search-box')]}>
            <Input
              value={searchKeyword}
              onChange={(e) => onKeywordChange(e.target.value)}
              placeholder="搜索商店应用..."
              isRound
              clearable
              prefixIcon={<SearchIcon style={{ fontSize: 18, color: '#999' }} />}
            />
          </div>
        </div>
      </div>

      <div className={style[bem.e('grid')]}>
        {searchLoading ? (
          <div className={style[bem.e('empty-box')]}>
            正在搜索中...
          </div>
        ) : displayList.map((app) => (
          <div key={app.resourceId} className={style[bem.e('card')]}>
            <div className={style[bem.e('card-main')]}>
              <img
                src={app.metaInfo?.icon || app.icon || '/logo.jpg'}
                className={style[bem.e('icon')]}
                alt=""
              />
              <div className={style[bem.e('info')]}>
                <div className={style[bem.e('name')]}>{app.displayName}</div>
                <div className={style[bem.e('author')]}>
                  {app.metaInfo?.author || app.author || 'SukinOS'}
                </div>
              </div>
            </div>

            <div className={style[bem.e('desc')]}>
              {app.metaInfo?.description || app.description || '这个开发者很懒，没有写描述信息。'}
            </div>

            <div className={style[bem.e('footer')]}>
              <div className={style[bem.e('version')]}>
                {'V ' + (app.version || '1.0.0')}
              </div>

              <button
                className={[
                  style[bem.e('btn')],
                  style[bem.is('installed', app.isInstalled && !app.hasUpdate)]
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  if (app.isInstalled && !app.hasUpdate) {
                    startApp({ resourceId: app.resourceId });
                  } else {
                    installApp(app);
                  }
                }}
              >
                {app.isInstalled ? (app.hasUpdate ? '更新' : '打开') : '获取'}
              </button>
            </div>
          </div>
        ))}

        {displayList.length === 0 && !searchLoading && !isLoading && (
          <div className={style[bem.e('empty-box')]}>
            未找到相关应用
          </div>
        )}
      </div>

      {searchResults === null && (
        <div ref={observerTarget} className={style[bem.e('observer')]}>
          {isLoading ? (
            <div className={style[bem.e('loader')]}>
              <span>正在获取更多应用...</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default Recommend;
