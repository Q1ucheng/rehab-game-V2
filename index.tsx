/**
 * 康复游戏系统 - 应用入口文件
 * 
 * 功能描述：React应用的入口点，负责应用的初始化和根组件的渲染
 * 技术栈：React 18 + TypeScript + ReactDOM
 * 主要功能模块：应用挂载点检测、React根节点创建、严格模式渲染
 * 核心特性：错误边界处理、严格模式检查、根元素验证
 * 
 * 文件说明：
 * - 检测并获取DOM根元素，确保应用有正确的挂载点
 * - 使用React 18的createRoot API创建并发模式的根节点
 * - 在严格模式下渲染主应用组件，启用开发环境检查
 * - 提供错误处理机制，确保应用启动时的稳定性
 *
 * 作者：Qiucheng Zhao
 */


import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = (window as any).document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);