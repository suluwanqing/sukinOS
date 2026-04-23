export const style = `
  .app-container { display: flex; height: 100%; font-family: sans-serif; }
  .sidebar { width: 100px; background: #333; color: white; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
  .nav-item { cursor: pointer; padding: 5px; border-radius: 4px; }
  .nav-item:hover { background: #555; }
  .main { flex: 1; padding: 20px; background: #f0f0f0; }
`;

// navigate 和 PageComponent 是系统注入的
export default ({ state, dispatch, navigate, PageComponent }) => {
  return (
    <div className="app-container">
      <div className="sidebar">
        <div className="nav-item" onClick={() => navigate('home')}>🏠 首页</div>
        <div className="nav-item" onClick={() => navigate('about')}>ℹ️ 关于</div>
      </div>
      <div className="main">
        {/* 渲染当前子页面 */}
        <PageComponent state={state} dispatch={dispatch} />
      </div>
    </div>
  );
};
