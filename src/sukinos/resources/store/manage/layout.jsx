import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import Button from "@/component/button/layout";
const bem = createNamespace('manage');
function Manage({ appList = [], startApp, deleteApp }) {
  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <h2>我的应用</h2>
      </div>
      <div className={style[bem.e('list')]}>
        {appList.map(app => (
          <div key={app.resourceId} className={style[bem.e('item')]}>
             <img src={app.metaInfo?.icon || '/logo.jpg'} className={style[bem.e('icon')]} alt="" />
             <div className={style[bem.e('info')]}>
              <div className={style[bem.e('name')]}>{app.name}</div>
                <div className={style[bem.e('meta')]}>
                当前版本: {app.metaInfo?.version || '1.0.0'}
                {app.hasUpdate && <span className={style[bem.e('update-tag')]}> (有可用更新)</span>}
                </div>
             </div>
             <div className={style[bem.e('actions')]}>
              <Button type='primary' onClick={() => startApp({ resourceId: app.resourceId })}>
                    打开
                </Button>
                <Button type="warning" onClick={() => deleteApp(app.resourceId)}>
                    卸载
                </Button>
             </div>
          </div>
        ))}
        {appList.length === 0 && (
          <div className={style[bem.e('empty')]}>尚未安装任何应用</div>
        )}
      </div>
    </div>
  );
}

export default Manage;
