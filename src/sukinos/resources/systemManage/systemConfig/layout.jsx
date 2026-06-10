import { useState } from "react";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import LogConfig from "./logConfig/layout";
import ConfigItemsManager from "./configItemsManager/layout";

const bem = createNamespace("system-config-layout");

const TuneIcon = () => (
  <svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <line x1="4" y1="21" x2="4" y2="14"></line>
    <line x1="4" y1="10" x2="4" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12" y2="3"></line>
    <line x1="20" y1="21" x2="20" y2="16"></line>
    <line x1="20" y1="12" x2="20" y2="3"></line>
    <line x1="1" y1="14" x2="7" y2="14"></line>
    <line x1="9" y1="8" x2="15" y2="8"></line>
    <line x1="17" y1="16" x2="23" y2="16"></line>
  </svg>
);

const SettingsIcon = () => (
  <svg width="1.2em" height="1.2em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

function SystemConfig() {
  const [activeTab, setActiveTab] = useState("log");

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e("sidebar")]}>
        <div className={style[bem.e("title")]}>全局系统配置</div>
        <div className={style[bem.e("menu")]}>
          <div
            className={[
              style[bem.e("menu-item")],
              style[bem.is("active", activeTab === "log")]
            ].filter(Boolean).join(" ")}
            onClick={() => setActiveTab("log")}
          >
            <TuneIcon />
            <span>日志审计配置</span>
          </div>

          <div
            className={[
              style[bem.e("menu-item")],
              style[bem.is("active", activeTab === "items")]
            ].filter(Boolean).join(" ")}
            onClick={() => setActiveTab("items")}
          >
            <SettingsIcon />
            <span>通用配置管理</span>
          </div>
        </div>
      </div>

      <div className={style[bem.e("content")]}>
        {activeTab === "log" && <LogConfig />}
        {activeTab === "items" && <ConfigItemsManager />}
      </div>
    </div>
  );
}

export default SystemConfig;
