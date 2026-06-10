import { getLogoBase64Url } from "@/component/logo/layout";
const logo = () => {
  return getLogoBase64Url({
    primaryColor: "#2e8b57",   // 海绿色
    secondaryColor: "#7fff00", // 亮绿色
    glowColor: "#98fb98",     // 淡绿光晕
    shadowColor: "#006400"    // 深绿阴影
  });
};
export default {
  "ENV_KEY_RESOURCE_ID": 'sys-setting',
  "ENV_KEY_NAME": '设置',
  "ENV_KEY_IS_BUNDLE": false,
  "ENV_KEY_CONTENT": `
        //  关键：这里只写 PageComponent，不用管 Props 透传，内核已注入 ,注意整个pageComponet就是渲染区/切换区域。所以是不允许嵌套的。
        export default ({ PageComponent, navigate, state }) =>{
            const {Components} = AppSDK
            const { Setting } = Components;
            return (
                <div style={{height:'100%',width:'100%', display:'flex', flexDirection:'column'}}>
                      <Setting/>
                </div>
             );
      }
      `,
  "ENV_KEY_LOGIC": ``,
  "ENV_KEY_META_INFO": {
    version: 'v1',
    icon:logo(),
    appType: 'system',
    worker:true,
    exposeState: false,
    isParasitism: true,
    saveState: false,
    custom: {
      hasShortcut: true,
      blockEd: true
    }
  }
}
