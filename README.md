<p align="center">
  <strong>React + Web Worker + IndexedDB + [FastApi] 的视窗交互SAAS环境</strong>
</p>

<p align="center">
  <a href="http://sukin.top/sukinos"><strong>在线体验 Demo »</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.x-blue.svg" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-009688.svg?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Web_Worker-Supported-orange.svg" alt="Web Worker">
  <img src="https://img.shields.io/badge/IndexedDB-Persistent-green.svg" alt="IndexedDB">
</p>

---

## 简介

**SukinOS** 是一个运行于浏览器内的轻量级虚拟桌面环境。

项目采用 **“代码分片注入 + Worker 状态隔离”** 的架构：将动态注入的应用代码隔离在 Web Worker 线程中运行，在 Worker 内部管理完整的应用生命周期与状态。主线程仅负责视窗 UI 的渲染与交互呈现，计算与业务逻辑全线下沉，并支持外部组件直接注入实现。通过端云协同，实现多应用动态加载、数据本地缓存。


---

## 架构亮点与核心技术

| 维度               | 技术实现与优势                                                                                       |
| :----------------- | :--------------------------------------------------------------------------------------------------- |
| **代码注入与隔离** | 支持将代码分片动态注入到沙盒中，在独立的 Web Worker 线程中初始化应用，实现运行时的安全物理隔离。     |
| **状态与生命周期** | 在 Worker 内部维护应用的加载、挂载、运行、销毁等完整生命周期，状态更新通过消息总线异步同步至主线程。 |
| **计算与行为下沉** | 将高负载的业务逻辑、数据处理及长连接操作完全下沉至后台 Worker 线程，确保主线程多APP UI 帧率稳定在 90fps
| **端云协同与拓展** | 采用 IndexedDB 进行本地沙盒状态的即时存储，支持外部JSX/JS组件完整注入,[可选] FastAPI 后端实现无感知的云端增量同步APP。             |

---
