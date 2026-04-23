import { useSelector, useDispatch } from 'react-redux';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import { sukinOsActions, selectGenerateApp ,selectFileSystemConfig} from '@/sukinos/store';
import Check from '@/component/check/layout';
import SettingsSystemDaydreamIcon from '@mui/icons-material/SettingsSystemDaydream';
import SecurityIcon from '@mui/icons-material/Security';
import MemoryIcon from '@mui/icons-material/Memory';
import { confirm} from "@/component/confirm/layout"
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
  const handleToggleSingleIframe = (val) => {
    confirm.show({
      title: '确认切换',
      content: '修改单实例运行环境配置可能会影响应用运行状态!确定要切换吗？',
      onConfirm: () => {
          handleToggleAppConfig('singleIframe', val)
          // 执行删除逻辑
          location.reload()
      },
      // onCancel: () => {
      //       // console.log('用户点击了取消');
      // }
  });
  }
  const handleTogglePrivate = (val) => {
    confirm.show({
      title: '确认切换',
      content: '修改该模式将会重启服务!确定要切换吗？',
      onConfirm: () => {
          handleToggleFileSystemConfig('isPrivate', val)
          // 执行删除逻辑
          location.reload()
      },
      // onCancel: () => {
      //       // console.log('用户点击了取消');
      // }
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
