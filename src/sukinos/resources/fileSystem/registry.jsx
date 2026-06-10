import { getLogoBase64Url } from "@/component/logo/layout";
const logo  = () => {
  return getLogoBase64Url({
    primaryColor: "#191970",   // 午夜蓝
    secondaryColor: "#9370db", // 中紫
    glowColor: "#e6e6fa",     // 淡紫光晕
    shadowColor: "#0d0221"    // 接近黑色的深蓝紫
  });
};
export default {
  "ENV_KEY_RESOURCE_ID": 'sys-fileSystem',
  "ENV_KEY_NAME": '文件管理',
  "ENV_KEY_IS_BUNDLE": false,
  "ENV_KEY_CONTENT": `
        //  关键：这里只写 PageComponent，不用管 Props 透传，内核已注入 ,注意整个pageComponet就是渲染区/切换区域。所以是不允许嵌套的。
        export default ({ PageComponent, navigate, state }) =>{
            const {Components} = AppSDK
            const { FileSystem } = Components;
            return (
                <div style={{height:'100%',width:'100%', display:'flex', flexDirection:'column'}}>
                      <FileSystem/>
                </div>
             );
      }
      `,
  "ENV_KEY_LOGIC": ``,
  "ENV_KEY_META_INFO": {
    version: 'v1',
    icon:logo(),
    appType: 'system',
    worker:false,
    exposeState: false,
    isParasitism: true,
    saveState: false,
    custom: {
      hasShortcut: true
    }
  }
}
