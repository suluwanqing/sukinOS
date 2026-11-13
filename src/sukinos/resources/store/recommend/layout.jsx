import { useEffect, useRef, useMemo } from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import Input from '@/component/input/layout';
import { Button } from '@/component/button/layout';
import { Search as SearchIcon } from 'lucide-react';

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
  searchLoading,
  onUpdate,
  pinnedApp,
}) {
  const observerTarget = useRef(null);

  const displayList = useMemo(() => {
    const list = searchResults !== null ? searchResults : remoteApps;
    const pinnedId = pinnedApp ? String(pinnedApp.resourceId) : '';

    const enrich = (app) => {
      // 检查是否已安装：强制字符串比对，防止 ID 类型差异导致的匹配失败
      const installedInfo = installedApps.find(i => String(i.resourceId) === String(app.resourceId));
      // 检查是否有更新
      const updateInfo = updateApps.find(u => String(u.resourceId) === String(app.resourceId));

      return {
        ...app,
        //更新信息带的是当前线上包的权威哈希/签名，优先于列表投影
        ...(updateInfo
          ? {
            version: updateInfo.version,
            url: updateInfo.url,
            contentHash: updateInfo.contentHash,
            signature: updateInfo.signature,
            signKeyId: updateInfo.signKeyId
          }
          : {}),
        isInstalled: !!installedInfo,
        hasUpdate: !!updateInfo,
        forceUpdate: !!updateInfo?.forced,
        displayName: app.appName || app.name || '未知应用'
      };
    };

    const mapped = list
      .filter(app => {
        // 强制更新锁定项可能是私有/授权池应用，搜索接口不返回，需单独放行
        if (pinnedId && String(app.resourceId) === pinnedId) return true;
        // 只显示公有 APP（注册池过滤由后端处理）
        if (app.isPrivate) return false;
        return true;
      })
      .map(enrich);

    if (pinnedApp && !mapped.some(app => String(app.resourceId) === pinnedId)) {
      mapped.unshift(enrich(pinnedApp));
    }
    return mapped;
  }, [searchResults, remoteApps, installedApps, updateApps, pinnedApp]);

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
              prefixIcon={<SearchIcon size={18} style={{ color: '#999' }} />}
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

              <Button
                block
                round
                size="sm"
                variant={app.isInstalled && !app.hasUpdate ? 'secondary' : 'default'}
                onClick={() => {
                  if (app.isInstalled) {
                    if (app.hasUpdate) {
                      onUpdate(app);
                    } else {
                      startApp({ resourceId: app.resourceId });
                    }
                  } else {
                    installApp(app);
                  }
                }}
              >
                {app.isInstalled ? (app.hasUpdate ? (app.forceUpdate ? '强制更新' : '更新') : '打开') : '获取'}
              </Button>
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
