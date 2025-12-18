# SukinOS

基于 React +Web Worker +indexDb 的桌面操作系统界面框架

## 项目简介
SukinOS 是一个使用 React 构建的桌面操作系统界面框架，提供现代化的 UI 组件和完整的系统交互体验。项目包含完整的登录系统、桌面环境、资源管理器、开发者工具,App间交互等模块。

## 主要功能
- 完整的桌面环境界面
- 可视化组件库（Alert、Check、Confirm 等）
- 文件系统管理
- 应用程序管理
- 开发者工具（代码编辑、资源上传等）
- 状态管理与路由系统

## 技术栈
- React 18
- CSS Modules
- Vite 构建工具
- IndexedDB 本地存储
- Service Worker 离线支持
- babel 动态编译

## 目录结构
```
src/
├── component/        # UI 组件库
├── main/             # 主界面模块
├── resources/        # 资源管理模块
├── utils/            # 工具函数
├── hooks/            # React Hooks
├── store.jsx         # 状态管理
├── router/main.jsx   # 路由配置
```

## 安装运行
1. 克隆仓库：
```bash
git clone https://gitee.com/suluwan/sukinOs.git
```

2. 启动开发服务器：
```bash
npm run dev
```

## 使用文档
详细组件文档和 API 说明请查看各组件目录下的 `.md` 文件

## 本项目不再进行更新,更多请自行根据代码注释,探索。
## 可能处理方向:动态后台管理。  