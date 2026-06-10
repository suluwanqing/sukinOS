import React, { useState } from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';

/* 导入图标 */
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import HelpIcon from '@mui/icons-material/Help';
import ColorLensIcon from "@mui/icons-material/ColorLens";
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';

/* 导入提取后的独立组件 */
import Sidebar from './sidebar/layout';
import UserSettings from './user/layout';
import System from "./system/layout";
import PersonalizationSettings from "./personalization/layout";
import Shortcuts from './shortcuts/layout'; // 快捷键组件
import Privacy from './privacy/layout';     // 隐私组件
import SystemInfo from './about/layout';   // 系统信息组件

const bem = createNamespace('setting');

function Setting() {
  const [activeRouteId, setActiveRouteId] = useState('personalization');

  /* SETTINGS_ROUTES 现在全部指向组件化的 render */
  const SETTINGS_ROUTES = [
    {
      id: 'user',
      label: '用户',
      icon: <PersonIcon />,
      render: <UserSettings />
    },
    {
      id: 'system',
      label: '系统设置',
      icon: <SettingsIcon />,
      render: <System />
    },
    {
      id: 'personalization',
      label: '个性化',
      icon: <ColorLensIcon />,
      render: <PersonalizationSettings />
    },
    {
      id: 'shortcuts',
      label: '快捷键',
      icon: <HelpIcon />,
      render: <Shortcuts />
    },
    {
      id: 'privacy',
      label: '隐私与安全',
      icon: <SecurityIcon />,
      render: <Privacy />
    },
    {
      id: 'about',
      label: '系统信息',
      icon: <InfoIcon />,
      render: <SystemInfo />
    }
  ];

  const activeRoute = SETTINGS_ROUTES.find(r => r.id === activeRouteId) || SETTINGS_ROUTES[0];

  return (
    <div className={style[bem.b()]}>
      <Sidebar
        items={SETTINGS_ROUTES}
        activeId={activeRouteId}
        onSelect={setActiveRouteId}
      />

      <div className={style[bem.e('content')]}>
        <div className={style[bem.e('breadcrumbs')]}>
            <span className={style[bem.e('breadcrumb-item')]}>SYSTEM</span>
            <span className={style[bem.e('breadcrumb-sep')]}>/</span>
            <span className={style[bem.e('breadcrumb-item')]}>{activeRoute.label.toUpperCase()}</span>
        </div>

        <div className={style[bem.e('content-scroll')]}>
          <div className={style[bem.e('content-inner')]}>
             {activeRoute.render}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Setting;
