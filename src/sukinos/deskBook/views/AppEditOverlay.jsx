import CustomApp from "../customApp/layout"
import { ENV_KEY_META_INFO, ENV_KEY_NAME, ENV_KEY_RESOURCE_ID, SUKIN_EXT, SUKIN_PRE } from "@/sukinos/utils/config"
import { createNamespace } from '/utils/js/classcreate'
import style from "../style.module.css"

const bem = createNamespace('deskbook')

function AppEditOverlay({ app, kernel, onChange, onClose }) {
  const handleUpdate = async (newCustomConfig) => {
    try {
      const updatedApp = await kernel.updateResourceCustom({
        resourceId: app?.[ENV_KEY_RESOURCE_ID],
        custom: newCustomConfig
      });
      if (updatedApp) onChange(updatedApp);
    } catch (err) { }
  };

  return (
    <div className={style[bem.e('overlay')]} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}>
        <CustomApp
          // 缺键应用运行时是“允许占位、未保活”，面板按有效值回填，避免显示种子值误导
          initialCustom={{
            ...app?.[ENV_KEY_META_INFO]?.custom,
            adaptiveMount: app?.[ENV_KEY_META_INFO]?.custom?.adaptiveMount !== false,
            keepAlive: app?.[ENV_KEY_META_INFO]?.custom?.keepAlive === true,
          }}
          onUpdateConfig={handleUpdate}
          onClose={onClose}
          editingAppName={app?.[ENV_KEY_NAME]?.replace(SUKIN_EXT, '').replace(SUKIN_PRE, '')}
        />
      </div>
    </div>
  )
}

export default AppEditOverlay
