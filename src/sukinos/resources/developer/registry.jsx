import { getLogoBase64Url } from "@/component/logo/layout";
const logo  = () => {
  return getLogoBase64Url({
    primaryColor: "#ff6b6b",   // 珊瑚红
    secondaryColor: "#ffd93d", // 亮黄
    glowColor: "#ffeaa7",     // 淡黄光晕
    shadowColor: "#6d214f"    // 紫红色阴影
  });
};
export default {
  "ENV_KEY_RESOURCE_ID": 'sys-developer',
  "ENV_KEY_NAME": '开发者中心',
  "ENV_KEY_IS_BUNDLE": false,
  "ENV_KEY_CONTENT": `
        //  关键：这里只写 PageComponent，不用管 Props 透传，内核已注入 ,注意整个pageComponet就是渲染区/切换区域。所以是不允许嵌套的。
        export default ({ PageComponent, navigate, state }) =>{
            const {Components} = AppSDK
            const { Developer } = Components;
            return (
                <div style={{height:'100%',width:'100%', display:'flex', flexDirection:'column'}}>
                      <Developer/>
                </div>
             );
      }
      `,
  "ENV_KEY_LOGIC": ``,
  "ENV_KEY_META_INFO": {
    version: 'v1',
    icon:logo(),
    appType: 'system',
    exposeState: false,
    saveState: false,
    isParasitism: true,
    custom: {
      hasShortcut: true
    }
  }
}
