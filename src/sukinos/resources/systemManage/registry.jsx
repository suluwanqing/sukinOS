import {getLogoBase64Url} from "@/component/logo/layout";
const logo = () => {
  return getLogoBase64Url({
    primaryColor: "#0066cc",   // 主蓝
    secondaryColor: "#00e6ff", // 霓虹蓝
    glowColor: "#a3e4ff",     // 淡蓝光晕
    shadowColor: "#001f4d"    // 深蓝阴影
  });
};
export default {
  "ENV_KEY_RESOURCE_ID": 'sys-systemManage',
  "ENV_KEY_NAME": '系统管理',
  "ENV_KEY_IS_BUNDLE": false,
  "ENV_KEY_CONTENT": `
        //  关键：这里只写 PageComponent，不用管 Props 透传，内核已注入 ,注意整个pageComponet就是渲染区/切换区域。所以是不允许嵌套的。
        export default ({ PageComponent, navigate, state }) =>{
            const {Components} = AppSDK
            const { SystemDashboard } = Components;
            return (
                <div style={{height:'100%',width:'100%', display:'flex', flexDirection:'column'}}>
                      <SystemDashboard/>
                </div>
             );
      }
      `,
  "ENV_KEY_LOGIC": ``,
  "ENV_KEY_META_INFO": {
    version: 'v1',
    icon: logo(),
    appType: 'system',
    worker:false,
    exposeState: false,
    saveState: false,
    custom: {
      hasShortcut: true,
      blockEd: false
    }
  }
}
