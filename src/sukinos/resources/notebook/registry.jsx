import { getLogoBase64Url } from "@/component/logo/layout";
const logo  = () => {
  return getLogoBase64Url({
    primaryColor: "#708090",   // 石板灰
    secondaryColor: "#c0c0c0", // 银色
    glowColor: "#f5f5f5",     // 淡灰光晕
    shadowColor: "#2f4f4f"    // 深石板灰
  });
};
export default {
  "ENV_KEY_RESOURCE_ID": 'sys-notebook',
  "ENV_KEY_NAME": '记事本',
  "ENV_KEY_IS_BUNDLE": false,
  "ENV_KEY_CONTENT": `
        //  关键：这里只写 PageComponent，不用管 Props 透传，内核已注入 ,注意整个pageComponet就是渲染区/切换区域。所以是不允许嵌套的。
        export default ({ PageComponent, navigate, state, handleFocus, pid }) =>{
            const {Components} = AppSDK
            const { NoteBook } = Components;
            return (
                <div style={{height:'100%',width:'100%', display:'flex', flexDirection:'column'}}>
                      <NoteBook state={state} handleFocus={handleFocus}/>
                </div>
             );
      }
      `,
  "ENV_KEY_LOGIC": `
        const initialState = {
          id: null,      // 当前打开的文件 ID
          openType: 'r',     // 默认只读
          mode:'virtual',
          parentId:null
        };

        /**
         * Notebook 的核心 Reducer
         * 处理来自 System 的 dispatch(interactInfo)
         */
        function reducer(state = initialState, action) {
          // 判断 openType
          console.log(action)
          if (action?.openType) {
            switch (action.openType) {
              // 'wr' 代表 Write/Read (读写模式)
              case 'wr':
                // console.log('打开文件!',action)
                return {
                  ...state,
                  type: 1,
                  openType: 'wr',
                  ...action
                  // 收到打开文件指令后，通常需要确保路由在编辑器页面
                };

              // 可以扩展其他 case，例如只读 'r'
              case 'r':
                return {
                  ...state,
                  type: 1,
                  openType: 'r',
                  ...action
                };

              default:
                return state;
            }
          }

          return state;
        }`,
  "ENV_KEY_META_INFO": {
    version: 'v1',
    icon:logo(),
    appType: 'editor',
    worker:true,
    exposeState: true,
    saveState: false,
    custom: {
      hasShortcut: true
    }
  }
}
