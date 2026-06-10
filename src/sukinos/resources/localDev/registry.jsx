import { getLogoBase64Url } from "@/component/logo/layout";
const logo  = () => {
  return getLogoBase64Url({
    primaryColor: "#dc143c",   // 深红
    secondaryColor: "#ff4500", // 橙红
    glowColor: "#ffcccb",     // 淡红光晕
    shadowColor: "#8b0000"    // 深红阴影
  });
};

export default {
  "ENV_KEY_RESOURCE_ID": 'sys-loacl-dev',
  "ENV_KEY_NAME": '本地开发',
  "ENV_KEY_IS_BUNDLE": false,
  "ENV_KEY_CONTENT": `
        //  关键：这里只写 PageComponent，不用管 Props 透传，内核已注入 ,注意整个pageComponet就是渲染区/切换区域。所以是不允许嵌套的。
        export default ({ PageComponent, navigate, state }) =>{
            const {Components} = AppSDK
            const { LocalDev } = Components;
            return (
                <div style={{height:'100%',width:'100%', display:'flex', flexDirection:'column'}}>
                      <LocalDev/>
                </div>
             );
      }
      `,
  "ENV_KEY_LOGIC": ``,
  "ENV_KEY_META_INFO": {
    version: 'v1',
    icon: logo(),
    worker:true,
    appType: 'system',
    exposeState: false,
    saveState: false,
    custom: {
      hasShortcut: true,
      blockEd: false
    }
  }
}
