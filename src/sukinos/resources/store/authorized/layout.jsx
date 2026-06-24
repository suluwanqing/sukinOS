import { useMemo } from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import Button from "@/component/button/layout";
const bem = createNamespace('authorized');

function Authorized({ appList = [], installedApps = [], startApp, installApp }) {
  const processedList = useMemo(() => {
    return (appList || []).map(app => ({
      ...app,
      isInstalled: (installedApps || []).some(i => String(i.resourceId) === String(app.resourceId)),
    }));
  }, [appList, installedApps]);

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <h2>已授权的应用</h2>
        <span className={style[bem.e('count')]}>共 {appList.length} 个</span>
      </div>
      <div className={style[bem.e('list')]}>
        {processedList.map(app => (
          <div key={app.resourceId} className={style[bem.e('item')]}>
            <img
              src={app.metaInfo?.icon || '/logo.jpg'}
              className={style[bem.e('icon')]}
              alt=""
            />
            <div className={style[bem.e('info')]}>
              <div className={style[bem.e('name')]}>{app.appName}</div>
              <div className={style[bem.e('meta')]}>
                {app.metaInfo?.description || '暂无描述'}
              </div>
            </div>
            <div className={style[bem.e('actions')]}>
              {app.isInstalled ? (
                <Button type="primary" onClick={() => startApp({ resourceId: app.resourceId })}>
                  打开
                </Button>
              ) : (
                <Button type="success" onClick={() => installApp(app)}>
                  安装
                </Button>
              )}
            </div>
          </div>
        ))}
        {appList.length === 0 && (
          <div className={style[bem.e('empty')]}>
            暂无已授权的应用，请联系管理员分配权限
          </div>
        )}
      </div>
    </div>
  );
}

export default Authorized;