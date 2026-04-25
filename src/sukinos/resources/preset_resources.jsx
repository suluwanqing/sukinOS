import { FileType} from "@/sukinos/utils/config"
import {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_IS_BUNDLE,
  ENV_KEY_LOGIC,
  ENV_KEY_CONTENT,
  ENV_KEY_META_INFO
} from "@/sukinos/utils/config"
// 这里appType是确认是系统上是标记,实际全权是内部处理的不会再外部,暴露system
export const PRESET_RESOURCES = [
  {
    [ENV_KEY_RESOURCE_ID]: 'sys-developer-demo',
    [ENV_KEY_NAME]: '开发者中心',
    [ENV_KEY_IS_BUNDLE]: false,
    [ENV_KEY_CONTENT]: `
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
    [ENV_KEY_LOGIC]: ``,
    [ENV_KEY_META_INFO]: {
      version: 'v1',
      icon: '/img/2.jpg',
      appType: 'system',
      exposeState: false,
      saveState:false,
      isParasitism:true,
      custom: {
        hasShortcut:true
        }
      },

  },
    {
    [ENV_KEY_RESOURCE_ID]: 'sys-fileSystem-demo',
    [ENV_KEY_NAME]: '文件管理',
    [ENV_KEY_IS_BUNDLE]: false,
    [ENV_KEY_CONTENT]: `
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
    [ENV_KEY_LOGIC]: ``,
    [ENV_KEY_META_INFO]: {
      version: 'v1',
      icon: '/img/1.jpg',
      appType: 'system',
      exposeState: false,
        isParasitism:true,
        saveState:false,
      custom: {
         hasShortcut:true
         }
      },

  },
    {
    [ENV_KEY_RESOURCE_ID]: 'sys-notebook-demo',
    [ENV_KEY_NAME]: '记事本',
    [ENV_KEY_IS_BUNDLE]: false,
    [ENV_KEY_CONTENT]: `
        //  关键：这里只写 PageComponent，不用管 Props 透传，内核已注入 ,注意整个pageComponet就是渲染区/切换区域。所以是不允许嵌套的。
        export default ({ PageComponent, navigate, state,handleFocus,pid }) =>{
            const {Components} = AppSDK
            const { NoteBook } = Components;
            return (
                <div style={{height:'100%',width:'100%', display:'flex', flexDirection:'column'}}>
                      <NoteBook state={state} handleFocus={handleFocus}/>
                </div>
             );
      }
      `,
    [ENV_KEY_LOGIC]: `
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
                  type:${FileType.FILE},
                  openType: 'wr',
                  ...action
                  // 收到打开文件指令后，通常需要确保路由在编辑器页面
                };

              // 可以扩展其他 case，例如只读 'r'
              case 'r':
                return {
                  ...state,
                  type:${FileType.FILE},
                  openType: 'r',
                  ...action
                };

              default:
                return state;
            }
          }

          return state;
        }`,
    [ENV_KEY_META_INFO]: {
      version: 'v1',
      icon: '/logo.jpg',
      appType: 'editor',
      exposeState: true,
        saveState:false,
      custom: {
          hasShortcut:true
     }
      },

  },
      {
    [ENV_KEY_RESOURCE_ID]: 'sys-setting-demo',
    [ENV_KEY_NAME]: '设置',
    [ENV_KEY_IS_BUNDLE]: false,
    [ENV_KEY_CONTENT]: `
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
    [ENV_KEY_LOGIC]:``,
    [ENV_KEY_META_INFO]: {
      version: 'v1',
      icon: '/logo.jpg',
      appType: 'system',
      exposeState: false,
      isParasitism: true,
        saveState:false,
      custom: {
          hasShortcut: false,
          blockEd:true
         }
     },

  },
  {
    [ENV_KEY_RESOURCE_ID]: 'sys-start-demo',
    [ENV_KEY_NAME]: '开始',
    [ENV_KEY_IS_BUNDLE]: false,
    [ENV_KEY_CONTENT]: `
        //  关键：这里只写 PageComponent，不用管 Props 透传，内核已注入 ,注意整个pageComponet就是渲染区/切换区域。所以是不允许嵌套的。
        export default ({ PageComponent, navigate, state }) =>{
            const {Components} = AppSDK
            const { Start } = Components;
            return (
                <div style={{height:'100%',width:'100%', display:'flex', flexDirection:'column'}}>
                      <Start/>
                </div>
             );
      }
      `,
    [ENV_KEY_LOGIC]:``,
    [ENV_KEY_META_INFO]: {
      version: 'v1',
      icon: '/logo.jpg',
      appType: 'system',
      exposeState: false,
        saveState:false,
      custom: {
          hasShortcut: false,
          blockEd:true
         }
     },

  },
  {
    [ENV_KEY_RESOURCE_ID]: 'sys-store-demo',
    [ENV_KEY_NAME]: 'APP商店',
    [ENV_KEY_IS_BUNDLE]: false,
    [ENV_KEY_CONTENT]: `
        //  关键：这里只写 PageComponent，不用管 Props 透传，内核已注入 ,注意整个pageComponet就是渲染区/切换区域。所以是不允许嵌套的。
        export default ({ PageComponent, navigate, state }) =>{
            const {Components} = AppSDK
            const { Store } = Components;
            return (
                <div style={{height:'100%',width:'100%', display:'flex', flexDirection:'column'}}>
                      <Store/>
                </div>
             );
      }
      `,
    [ENV_KEY_LOGIC]:``,
    [ENV_KEY_META_INFO]: {
      version: 'v1',
      icon: '/logo.jpg',
      appType: 'system',
      exposeState: false,
        saveState:false,
      custom: {
          hasShortcut: true,
          blockEd:false
         }
     },

  },

  {
    [ENV_KEY_RESOURCE_ID]: 'sys-loacl-dev-demo',
    [ENV_KEY_NAME]: '本地开发',
    [ENV_KEY_IS_BUNDLE]: false,
    [ENV_KEY_CONTENT]: `
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
    [ENV_KEY_LOGIC]:``,
    [ENV_KEY_META_INFO]: {
      version: 'v1',
      icon: '/logo.jpg',
      appType: 'system',
      exposeState: false,
        saveState:false,
      custom: {
          hasShortcut: true,
          blockEd:false
         }
     },

  },
];
