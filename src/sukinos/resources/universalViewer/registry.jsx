import { getLogoBase64Url } from "@/component/logo/layout";

const logo = () => {
  return getLogoBase64Url({
    primaryColor: "#0284c7",
    secondaryColor: "#64748b",
    glowColor: "#f0f9ff",
    shadowColor: "#0f172a"
  });
};

export default {
  "ENV_KEY_RESOURCE_ID": 'sys-universal-viewer',
  "ENV_KEY_NAME": '万能文件查看器',
  "ENV_KEY_IS_BUNDLE": false,
  "ENV_KEY_CONTENT": `
    export default ({ PageComponent, navigate, state, handleFocus, pid }) => {
      const { Components } = AppSDK;
      const { UniversalViewer } = Components;
      return (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
          <UniversalViewer state={state} handleFocus={handleFocus} />
        </div>
      );
    }
  `,
  "ENV_KEY_LOGIC": `
    const initialState = {
      id: null,
      name: '',
      openType: 'wr',
      mode: 'virtual'
    };

    function reducer(state = initialState, action) {
      if (action?.type === 'OPEN_FILE' || action?.openType || action?.id) {
        return {
          ...state,
          openType: action.openType || 'wr',
          ...action
        };
      }
      return state;
    }
  `,
  "ENV_KEY_META_INFO": {
    version: 'v1.1.0',
    icon: logo(),
    appType: 'file',
    worker: true,
    exposeState: true,
    saveState: false,
    custom: {
      hasShortcut: true
    }
  }
};
