import { useState } from "react";
import style from "./style.module.css";
import { createNamespace } from "/utils/js/classcreate";
import LogConfig from "./logConfig/layout";
import ConfigItemsManager from "./configItemsManager/layout";
import SystemAppsAccess from "./systemAppsAccess/layout";
import UploadQuota from "./uploadQuota/layout";
import TuneIcon from "@mui/icons-material/Tune";
import SettingsIcon from "@mui/icons-material/Settings";
import SecurityIcon from "@mui/icons-material/Security";
import UploadFileIcon from "@mui/icons-material/UploadFile";

const bem = createNamespace("system-config-layout");

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
            <TuneIcon fontSize="small" />
            <span>日志审计配置</span>
          </div>

          <div
            className={[
              style[bem.e("menu-item")],
              style[bem.is("active", activeTab === "items")]
            ].filter(Boolean).join(" ")}
            onClick={() => setActiveTab("items")}
          >
            <SettingsIcon fontSize="small" />
            <span>通用配置管理</span>
          </div>

          <div
            className={[
              style[bem.e("menu-item")],
              style[bem.is("active", activeTab === "systemApps")]
            ].filter(Boolean).join(" ")}
            onClick={() => setActiveTab("systemApps")}
          >
            <SecurityIcon fontSize="small" />
            <span>系统APP放权</span>
          </div>

          <div
            className={[
              style[bem.e("menu-item")],
              style[bem.is("active", activeTab === "uploadQuota")]
            ].filter(Boolean).join(" ")}
            onClick={() => setActiveTab("uploadQuota")}
          >
            <UploadFileIcon fontSize="small" />
            <span>上传配额</span>
          </div>
        </div>
      </div>

      <div className={style[bem.e("content")]}>
        {activeTab === "log" && <LogConfig />}
        {activeTab === "items" && <ConfigItemsManager />}
        {activeTab === "systemApps" && <SystemAppsAccess />}
        {activeTab === "uploadQuota" && <UploadQuota />}
      </div>
    </div>
  );
}

export default SystemConfig;
