import { getLogoBase64Url } from "@/component/logo/layout";
const logo  = () => {
  return getLogoBase64Url({
    primaryColor: "#db7093",   // 中粉红
    secondaryColor: "#da70d6", // 兰花紫
    glowColor: "#ffb6c1",     // 浅红光晕
    shadowColor: "#8b008b"    // 深紫阴影
  });
};
export default {
  "ENV_KEY_RESOURCE_ID": 'sys-drawBoard',
  "ENV_KEY_NAME": '画板',
  "ENV_KEY_IS_BUNDLE": false,
  "ENV_KEY_CONTENT": `
        export default ({ PageComponent, navigate, state, dispatch, pid }) =>{
            const {Components} = AppSDK
            const { DrawBoard } = Components;
            return (
                <div style={{height:'100%',width:'100%', display:'flex', flexDirection:'column'}}>
                      <DrawBoard state={state} dispatch={dispatch} navigate={navigate} pid={pid}/>
                </div>
             );
      }
      `,
  "ENV_KEY_LOGIC": `
        const HISTORY_LIMIT = 80;
        const initialState = {
          router: {path: 'gallery'},
          boards: [],
          activeBoardId: null,
          scene: {elements: [], selectedIds: []},
          tool: 'select',
          style: {stroke: '#212529',fill: 'transparent',fillStyle: 'hachure',strokeWidth: 2,roughness: 1,opacity: 1,dasharray: 'solid',fontSize: 20,fontFamily: 'Caveat',penType: 'normal'},
          view: {zoom: 1, offsetX: 0, offsetY: 0},
          history: {past: [], future: []},
          ui: {editingTextId: null},
          mindmaps: [],
          activeMindmapId: null,
          mmNodes: [],
          mmSelectedIds: [],
          mmView: {zoom: 1, offsetX: 0, offsetY: 0},
          mmConns: [],
          mmSelConnId: null,
          mmHistory: {past: [], future: []},
        };
        function pushHistory(state) {const past = [...state.history.past, JSON.stringify(state.scene.elements)]; if (past.length > HISTORY_LIMIT) past.shift(); return {past, future: []};}
        function reducer(state = initialState, action) {
          if (action?.openType) return state;
          switch (action.type) {
            case 'NAV': return {...state, router: {path: action.payload}};
            case 'SET_TOOL': return {...state, tool: action.payload, scene: {...state.scene, selectedIds: []}};
            case 'SET_STYLE': return {...state, style: {...state.style, ...action.payload}};
            case 'SET_VIEW': return {...state, view: {...state.view, ...action.payload}};
            case 'SET_SELECTED': return {...state, scene: {...state.scene, selectedIds: action.payload}};
            case 'BEGIN_HISTORY': return {...state, history: pushHistory(state)};
            case 'ADD_ELEMENT': return {...state, scene: {...state.scene, elements: [...state.scene.elements, action.payload]}};
            case 'REPLACE_ELEMENTS': return {...state, scene: {...state.scene, elements: action.payload}};
            case 'UPDATE_ELEMENT': {const {id, patch} = action.payload; return {...state, scene: {...state.scene, elements: state.scene.elements.map(e => (e.id === id ? {...e, ...patch} : e))}};}
            case 'UPDATE_ELEMENTS': {const map = action.payload; return {...state, scene: {...state.scene, elements: state.scene.elements.map(e => (map[e.id] ? {...e, ...map[e.id]} : e))}};}
            case 'DELETE_ELEMENTS': {const ids = new Set(action.payload); return {...state, scene: {...state.scene, elements: state.scene.elements.filter(e => !ids.has(e.id)), selectedIds: []}};}
            case 'UNDO': {if (!state.history.past.length) return state; const past = [...state.history.past]; const prev = past.pop(); const future = [JSON.stringify(state.scene.elements), ...state.history.future].slice(0, HISTORY_LIMIT); return {...state, scene: {...state.scene, elements: JSON.parse(prev), selectedIds: []}, history: {past, future}};}
            case 'REDO': {if (!state.history.future.length) return state; const [next, ...rest] = state.history.future; const past = [...state.history.past, JSON.stringify(state.scene.elements)].slice(-HISTORY_LIMIT); return {...state, scene: {...state.scene, elements: JSON.parse(next), selectedIds: []}, history: {past, future: rest}};}
            case 'LOAD_BOARDS': return {...state, boards: action.payload};
            case 'SET_ACTIVE_BOARD': return {...state, activeBoardId: action.payload};
            case 'LOAD_SCENE': return {...state, scene: {elements: action.payload || [], selectedIds: []}, history: {past: [], future: []}, view: {zoom: 1, offsetX: 0, offsetY: 0}};
            case 'SET_EDITING_TEXT': return {...state, ui: {...state.ui, editingTextId: action.payload}};
            case 'LOAD_MINDMAPS': return {...state, mindmaps: action.payload};
            case 'SET_ACTIVE_MINDMAP': return {...state, activeMindmapId: action.payload, mmSelectedIds: [], mmView: {zoom: 1, offsetX: 0, offsetY: 0}, mmConns: [], mmSelConnId: null};
            case 'LOAD_MM_NODES': return {...state, mmNodes: action.payload || [], mmSelectedIds: [], mmView: {zoom: 1, offsetX: 0, offsetY: 0}, mmConns: [], mmSelConnId: null};
            case 'SET_MM_SELECTED': return {...state, mmSelectedIds: Array.isArray(action.payload) ? action.payload : (action.payload ? [action.payload] : [])};
            case 'SET_MM_VIEW': return {...state, mmView: {...state.mmView, ...action.payload}};
            case 'ADD_MM_NODE': return {...state, mmNodes: [...state.mmNodes, action.payload]};
            case 'UPDATE_MM_NODE': {const {id, patch} = action.payload; return {...state, mmNodes: state.mmNodes.map(n => n.id === id ? {...n, ...patch} : n)};}
            case 'UPDATE_MM_NODES': {const map = action.payload; return {...state, mmNodes: state.mmNodes.map(n => map[n.id] ? {...n, ...map[n.id]} : n)};}
            case 'DELETE_MM_NODES': {const ids = new Set(action.payload); return {...state, mmNodes: state.mmNodes.filter(n => !ids.has(n.id)), mmSelectedIds: state.mmSelectedIds.filter(id => !ids.has(id))};}
            case 'REPLACE_MM_NODES': return {...state, mmNodes: action.payload};
            case 'LOCK_MM_NODES': {const ids = new Set(action.payload.ids); const locked = action.payload.locked; return {...state, mmNodes: state.mmNodes.map(n => ids.has(n.id) ? {...n, locked} : n)};}
            case 'AUTO_LAYOUT': return {...state, mmNodes: state.mmNodes.map(n => {const p = action.payload.get(n.id); if (!p || n.locked) return n; return {...n, x: p.x, y: p.y, w: p.w, h: p.h}})};
            case 'LOAD_MM_CONNS': return {...state, mmConns: action.payload || [], mmSelConnId: null};
            case 'ADD_MM_CONN': {const conn = action.payload; const nodes = state.mmNodes.map(n => {if (n.id === conn.to && !n.parentId) return {...n, parentId: conn.from}; return n}); return {...state, mmConns: [...state.mmConns, conn], mmNodes: nodes};}
            case 'UPDATE_MM_CONN': {const {id, patch} = action.payload; return {...state, mmConns: state.mmConns.map(c => c.id === id ? {...c, ...patch} : c)};}
            case 'DELETE_MM_CONN': {const id = action.payload; const conn = state.mmConns.find(c => c.id === id); let nodes = state.mmNodes; if (conn) {const toNode = nodes.find(n => n.id === conn.to); if (toNode && toNode.parentId === conn.from) {nodes = nodes.map(n => n.id === conn.to ? {...n, parentId: null} : n)}} return {...state, mmConns: state.mmConns.filter(c => c.id !== id), mmSelConnId: state.mmSelConnId === id ? null : state.mmSelConnId, mmNodes: nodes};}
            case 'SET_MM_SEL_CONN': return {...state, mmSelConnId: action.payload};
            case 'MM_PUSH_HIST': {const snap = JSON.stringify({nodes: state.mmNodes, conns: state.mmConns}); const past = [...state.mmHistory.past, snap]; if (past.length > 60) past.shift(); return {...state, mmHistory: {past, future: []}};}
            case 'MM_UNDO': {if (!state.mmHistory.past.length) return state; const past = [...state.mmHistory.past]; const prev = JSON.parse(past.pop()); const cur = JSON.stringify({nodes: state.mmNodes, conns: state.mmConns}); return {...state, mmNodes: prev.nodes, mmConns: prev.conns, mmSelectedIds: [], mmSelConnId: null, mmHistory: {past, future: [cur, ...state.mmHistory.future]}};}
            case 'MM_REDO': {if (!state.mmHistory.future.length) return state; const [next, ...rest] = state.mmHistory.future; const cur = JSON.stringify({nodes: state.mmNodes, conns: state.mmConns}); const past = [...state.mmHistory.past, cur]; const snap = JSON.parse(next); return {...state, mmNodes: snap.nodes, mmConns: snap.conns, mmSelectedIds: [], mmSelConnId: null, mmHistory: {past, future: rest}};}
            case 'MM_SELECT_ALL': return {...state, mmSelectedIds: state.mmNodes.map(n => n.id), mmSelConnId: null};
            default: return state;
          }
        }`,
  "ENV_KEY_META_INFO": {
    version: 'v1',
    icon:logo(),
    appType: 'system',
    worker:true,
    exposeState: false,
    saveState: false,
    isParasitism: true,
    custom: {
      hasShortcut: true,
      blockEd: false
    }
  }
}
// 注意这里为什么不直接用navigate？因为navigate强调的是内部实现的路由,这里我们是单组件,所以还是需要手动处理
