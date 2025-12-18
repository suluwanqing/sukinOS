export const PRESET_RESOURCES = [
  {
    id: 'sys-developer-demo',
    name: '开发者中心',
    isBundle: false,
    content: `
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
    logic: ``,
    metaInfo: {
      version: 'v1',
      icon: '/logo.jpg',
      appType: 'system',
      exposeState:false,
      custom: {
        hasShortcut:true
        }
      },

  },
    {
    id: 'sys-fileSystem-demo',
    name: '文件管理',
    isBundle: false,
    content: `
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
    logic: ``,
    metaInfo: {
      version: 'v1',
      icon: '/logo.jpg',
      appType: 'system',
      exposeState:false,
      custom: {
         hasShortcut:true
         }
      },

  },
    {
    id: 'sys-notebook-demo',
    name: '记事本',
    isBundle: false,
    content: `
        //  关键：这里只写 PageComponent，不用管 Props 透传，内核已注入 ,注意整个pageComponet就是渲染区/切换区域。所以是不允许嵌套的。
        export default ({ PageComponent, navigate, state }) =>{
            const {Components} = AppSDK
            const { NoteBook } = Components;
            return (
                <div style={{height:'100%',width:'100%', display:'flex', flexDirection:'column'}}>
                      <NoteBook state={state}/>
                </div>
             );
      }
      `,
    logic: `
        const initialState = {
          fileId: null,      // 当前打开的文件 ID
          openType: 'r',     // 默认只读
          router: { path: 'home' } // 路由状态
        };

        /**
         * Notebook 的核心 Reducer
         * 处理来自 System 的 dispatch(interactInfo)
         */
        function reducer(state = initialState, action) {
          // 1. 处理标准的路由导航 (如果存在)
          if (action?.type === 'NAVIGATE') {
            return {
              ...state,
              router: { ...state.router, path: action.payload }
            };
          }

          // 2. 处理应用交互信息 (APP_INTERACT Payload)
          // 根据 prompt 要求，使用 switch case 判断 openType
          if (action?.openType) {
            switch (action.openType) {
              // 'wr' 代表 Write/Read (读写模式)
              case 'wr':
                return {
                  ...state,
                  fileId: action.fileId,
                  openType: 'wr',
                  // 收到打开文件指令后，通常需要确保路由在编辑器页面
                  router: { ...state.router, path: 'home' }
                };

              // 可以扩展其他 case，例如只读 'r'
              case 'r':
                return {
                  ...state,
                  fileId: action.fileId,
                  openType: 'r',
                  router: { ...state.router, path: 'home' }
                };

              default:
                return state;
            }
          }

          return state;
        }`,
    metaInfo: {
      version: 'v1',
      icon: '/logo.jpg',
      appType: 'editor',
      exposeState:true,
      custom: {
          hasShortcut:true
     }
      },

  },
      {
    id: 'sys-start-demo',
    name: '开始',
    isBundle: false,
    content: `
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
    logic:``,
    metaInfo: {
      version: 'v1',
      icon: '/logo.jpg',
      appType: 'system',
      exposeState:false,
      custom: {
          hasShortcut: false,
          blockEd:true
         }
     },

  },

];
