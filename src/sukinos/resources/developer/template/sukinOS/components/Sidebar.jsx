export const style = `
  .sidebar { width: 120px; background: #1e293b; color: white; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
  .nav-item { cursor: pointer; padding: 8px 10px; border-radius: 6px; font-size: 13px; }
  .nav-item:hover { background: #334155; }
  .nav-item.active { background: #3b82f6; }
  .nav-title { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
`;

// 共享组件：位于 components/ 文件夹，被 layout 通过相对路径导入
// 使用命名导出，配合 `import { Sidebar }` 语法
export const Sidebar = ({ state, navigate }) => {
  const current = state.router?.path || 'pages/home';
  const items = [
    { key: 'pages/home', label: '🏠 首页' },
    { key: 'pages/about', label: 'ℹ️ 关于' },
    { key: 'pages/contact', label: '📮 联系' },
    { key: 'pages/windowDemo', label: '🪟 窗口控制' },
  ];
  return (
    <div className="sidebar">
      <div className="sidebar-title">多文件夹示例</div>
      {items.map(item => (
        <div
          key={item.key}
          className={`nav-item ${current === item.key ? 'active' : ''}`}
          onClick={() => navigate(item.key)}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
};