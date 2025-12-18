import React, { useState } from 'react';
import style from "./style.module.css";
import { createNamespace } from '@/utils/js/classcreate';
import PersonIcon from '@mui/icons-material/Person';
import SecurityIcon from '@mui/icons-material/Security';
import HelpIcon from '@mui/icons-material/Help';
import InfoIcon from '@mui/icons-material/Info';

const bem = createNamespace('start-settings');
const UserSettings = () => (
  <div className={style[bem.e('panel')]}>
    <h3>账户信息</h3>
    <div className={style[bem.e('card')]}>
      <div className={style[bem.e('avatar')]}>Admin</div>
      <div>
        <strong>Administrator</strong>
        <p>本地账户</p>
      </div>
    </div>
  </div>
);

const SETTINGS_ROUTES = [
  {
    id: 'personalization',
    label: '账户',
    icon: <PersonIcon />,
    type: 'component',
    render: <UserSettings />
  },
  {
    id: 'privacy',
    label: '隐私与安全',
    icon: <SecurityIcon />,
    type: 'manual',
    title: '隐私政策说明',
    content: [
      "SukinOS 致力于保护您的隐私安全。",
      "1. 我们不会收集您的个人生物识别信息。",
      "2. 系统日志仅存储在本地 IndexedDB 中，不会上传至服务器。",
      "3. 您可以随时在开发者工具中清除 Application 数据来重置系统。"
    ]
  },
  {
    id: 'help',
    label: '使用手册',
    icon: <HelpIcon />,
    type: 'manual',
    title: 'SukinOS 快速入门',
    content: [
      "欢迎使用 SukinOS，这是一个基于 WebWorker 技术构建的模拟操作系统。",
      "【文件管理】：支持右键菜单、拖拽（开发中）和重命名。",
      "【记事本】：支持打开 txt 文件，Ctrl+S 保存，支持多行文本编辑。",
      "【应用切换】：任务栏支持多窗口切换，点击最小化，再次点击恢复。",
      "【状态栏】：Ctrl + Alt + O 切换状态栏模式"
    ]
  },
  {
    id: 'about',
    label: '关于',
    icon: <InfoIcon />,
    type: 'manual',
    title: '关于 SukinOS',
    content: [
      "版本号: v1.0.0 Alpha",
      "内核: React + Redux + WebWorker",
      "文件系统: IndexedDB",
      "author: ©2025 Sukin"
    ]
  }
];


const ManualRenderer = ({ title, paragraphs }) => (
  <div className={style[bem.e('manual')]}>
    <h2 className={style[bem.e('manual-title')]}>{title}</h2>
    <div className={style[bem.e('manual-body')]}>
      {paragraphs.map((text, index) => (
        <p key={index} className={style[bem.e('manual-p')]}>
          {text}
        </p>
      ))}
    </div>
  </div>
);


function Start() {
  const [activeRouteId, setActiveRouteId] = useState('help');
  const activeRoute = SETTINGS_ROUTES.find(r => r.id === activeRouteId) || SETTINGS_ROUTES[0];
  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('sidebar')]}>
        <div className={style[bem.e('nav-list')]}>
          {SETTINGS_ROUTES.map((item) => (
            <div
              key={item.id}
              className={[style[bem.e('nav-item')],style[bem.is('active',activeRouteId === item.id)]].join(' ')}
              onClick={() => setActiveRouteId(item.id)}
            >
              <span className={style[bem.e('nav-icon')]}>{item.icon}</span>
              <span className={style[bem.e('nav-label')]}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={style[bem.e('content')]}>
        <div className={style[bem.e('content-header')]}>
          {activeRoute.label}
        </div>

        <div className={style[bem.e('content-body')]}>
          {activeRoute.type === 'component' ? (
            activeRoute.render
          ) : (
            // 渲染文本数组 [手册模式]
            <ManualRenderer
              title={activeRoute.title}
              paragraphs={activeRoute.content}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Start;
