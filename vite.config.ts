/**
 * 康复游戏系统 - Vite构建配置
 * 
 * 功能描述：配置Vite构建工具，管理开发服务器和构建输出
 * 技术栈：Vite + React + TypeScript
 * 主要功能模块：插件配置、基础路径设置、构建输出配置
 * 核心特性：快速热重载、优化的构建输出、GitHub Pages部署支持
 * 
 * 文件说明：
 * - 配置React插件，支持JSX转换和热模块替换
 * - 设置基础路径，支持GitHub Pages部署
 * - 配置构建输出目录和资源文件路径
 * - 提供开发环境的快速启动和热重载功能
 * 
 * 作者：Qiucheng Zhao
 */


import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/rehab-game/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});