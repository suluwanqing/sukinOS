import { useMemo } from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import { confirm } from '@/component/Confirm/layout';
import useKernel from "@/sukinos/hooks/useKernel";
import Button from "@/component/button/layout";
const bem = createNamespace('upload');

function MyUpLoad({ onInstall, myUploadList, installedApps, onDeleteUpload }) {
  const { startApp } = useKernel();

  // 删除已上传的应用
  const handleDeleteUpload = (app) => {
    confirm.show({
      title: '确认删除',
      content: `您确定要从云端删除应用「${app.appName}」吗？此操作不可撤销。`,
      onConfirm: async () => {
        await onDeleteUpload(app);
      }
    });
  };

  // 这里的依赖项改为从父组件传进来的 installedApps
  const processedList = useMemo(() => {
    const localInstalled = installedApps || [];

    return (myUploadList || []).map(remoteApp => {
      // 查找本地是否有对应资源ID的应用
      const localApp = localInstalled.find(i => String(i.resourceId) === String(remoteApp.resourceId));
      const localVersion = localApp?.metaInfo?.version;

      // 版本比对逻辑：云端版本 > 本地版本
      let hasUpdate = false;
      if (localApp && remoteApp.version && localVersion) {
        try {
          hasUpdate = parseFloat(remoteApp.version) > parseFloat(localVersion);
        } catch (e) {
          hasUpdate = remoteApp.version !== localVersion;
        }
      }

      return {
        ...remoteApp,
        isInstalled: !!localApp,
        hasUpdate: hasUpdate,
        localVersion: localVersion || null,
        status: remoteApp.status || 'active', // 补全状态判定字段
        auditOpinion: remoteApp.auditOpinion || null // 补全审核/禁用反馈意见
      };
    });
  }, [myUploadList, installedApps]);

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <h2>我的上传</h2>
      </div>

      <div className={style[bem.e('list')]}>
        {processedList.length === 0 ? (
          <div className={style[bem.e('empty')]}>云端暂无上传的应用</div>
        ) : processedList.map(app => (
          <div key={app.resourceId || app.id} className={style[bem.e('item')]}>
            <img
              src={app.icon || app.metaInfo?.icon || '/logo.jpg'}
              className={style[bem.e('icon')]}
              alt=""
            />
            <div className={style[bem.e('info')]}>
              <div className={style[bem.e('name')]}>
                {app.appName}
                {/* 状态展示标签 */}
                {app.status === 'under_review' && (
                  <span className={`${style[bem.e('status-tag')]} ${style[bem.em('status-tag', 'review')]}`}>
                    审核中
                  </span>
                )}
                {app.status === 'disabled' && (
                  <span className={`${style[bem.e('status-tag')]} ${style[bem.em('status-tag', 'disabled')]}`}>
                    已下架
                  </span>
                )}
              </div>
              <div className={style[bem.e('meta')]}>
                云端版本: {app.version}
                {app.isInstalled && (
                  <span className={style[bem.e('local-tag')]}>
                    (本地已安装: {app.localVersion})
                  </span>
                )}
                {/* 如果存在下架或驳回原因则进行提示 */}
                {app.status === 'disabled' && app.auditOpinion && (
                  <div className={style[bem.e('opinion-text')]}>
                    说明: {app.auditOpinion}
                  </div>
                )}
              </div>
            </div>
            <div className={style[bem.e('actions')]}>
              {app.isInstalled ? (
                <>
                  {app.hasUpdate ? (
                    <Button
                      type="primary"
                      disabled={app.status !== 'active'}
                      onClick={app.status === 'active' ? () => onInstall(app) : undefined}
                    >
                      {app.status === 'active' ? '更新' : '暂不可更新'}
                    </Button>
                  ) : (
                    <Button type="primary" onClick={() => startApp({ resourceId: app.resourceId })}>
                      打开
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  type="primary"
                  disabled={app.status !== 'active'}
                  onClick={app.status === 'active' ? () => onInstall(app) : undefined}
                >
                  {app.status === 'under_review' ? '审核中' : app.status === 'disabled' ? '已下架' : '获取'}
                </Button>
              )}

              <Button type="warning" onClick={() => handleDeleteUpload(app)}>
                删除
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MyUpLoad;
