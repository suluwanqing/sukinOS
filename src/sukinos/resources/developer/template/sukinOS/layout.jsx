export const style = `
  .app-container { display: flex; height: 100%; font-family: sans-serif; }
  .sidebar { width: 120px; background: #1e293b; color: white; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
  .nav-item { cursor: pointer; padding: 8px 10px; border-radius: 6px; font-size: 13px; }
  .nav-item:hover { background: #334155; }
  .nav-item.active { background: #3b82f6; }
  .main { flex: 1; padding: 20px; background: #f8fafc; overflow: auto; }
`;

// navigate 和 PageComponent 是系统注入的
// 多文件夹示例：layout 通过相对路径导入共享组件
import { Sidebar } from './components/Sidebar';
// 副作用导入全局 CSS：样式被收集进全局样式池并作用域化
import './styles/global.css';

export default ({ state, dispatch, navigate, PageComponent }) => {
  return (
    <div className="app-container">
      <Sidebar state={state} navigate={navigate} />
      <div className="main">
        {/* 渲染当前子页面（由路由解析到 pages/ 下的模块） */}
        <PageComponent state={state} dispatch={dispatch} />
        <div className="global-footer">
          <span className="global-badge">CSS 导入</span>
          全局样式来自 styles/global.css（副作用导入）
        </div>
      </div>
    </div>
  );
};