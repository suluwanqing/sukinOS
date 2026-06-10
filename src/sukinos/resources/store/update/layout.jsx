import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import Button from "@/component/button/layout";

const bem = createNamespace('update');

function Update({ updateList = [], onRefresh, onUpdate }) {
  const isAllUpdated = updateList.length === 0;

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <h2>可用更新</h2>
      </div>

      {isAllUpdated ? (
        <div className={style[bem.e('empty')]}>
           <div className={style[bem.e('check-circle')]}>✓</div>
           <h3>所有应用已是最新</h3>
           <Button type="primary" className={style[bem.e('btn-refresh')]} onClick={onRefresh}>检查更新</Button>
        </div>
      ) : (
        <div className={style[bem.e('list')]}>
           {updateList.map(app => (
            <div key={app.resourceId} className={style[bem.e('item')]}>
              <img src={app.metaInfo?.icon || '/logo.jpg'} className={style[bem.e('icon')]} alt="" />
              <div className={style[bem.e('info')]}>
                <div className={style[bem.e('name')]}>{app.appName}</div>
                <div className={style[bem.e('ver')]}>
                  发现新版本: V {app.version}
                </div>
              </div>
              <Button
                type="primary"
                className={style[bem.e('btn-update')]}
                onClick={() => onUpdate(app)}
              >
                更新
              </Button>
            </div>
           ))}
        </div>
      )}
    </div>
  );
}

export default Update;
