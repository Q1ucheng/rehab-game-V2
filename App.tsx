/**
 * 康复游戏系统 - 主应用组件
 * 
 * 功能描述：康复游戏系统的根组件，负责应用的整体布局、界面路由和功能集成
 * 技术栈：React + TypeScript + Tailwind CSS + Zustand状态管理
 * 主要功能模块：应用路由管理、用户认证监听、可达空间分析测试、界面渲染
 * 核心特性：多界面切换、Firebase认证集成、开发模式测试功能、响应式布局
 * 
 * 组件功能说明：
 * - 应用路由：根据当前状态在认证界面、仪表盘界面和游戏界面之间切换
 * - 认证监听：集成Firebase认证监听器，自动处理用户登录状态变化
 * - 测试功能：开发模式下提供可达空间分析功能的测试按钮
 * - 界面渲染：使用Tailwind CSS实现响应式布局和美观的UI界面
 * 
 * 作者：Qiucheng Zhao
 */


import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { AppScreen } from './types';
import AuthScreen from './components/UI/AuthScreen';
import Dashboard from './components/UI/Dashboard';
import GameScene from './components/Game/GameScene';
import { initializeAuthListener } from './services/firebase';
import { reachableSpaceAnalyzer } from './services/reachableSpaceAnalyzer';

const App: React.FC = () => {
  const { currentScreen, setCurrentScreen, setUser } = useStore();
  const [analysisStatus, setAnalysisStatus] = useState<string>('');

  useEffect(() => {
    // Initialize Firebase Auth Listener
    const unsubscribe = initializeAuthListener((user) => {
      if (user) {
        setUser(user);
        if (currentScreen === AppScreen.AUTH) {
          setCurrentScreen(AppScreen.DASHBOARD);
        }
      } else {
        setUser(null);
        setCurrentScreen(AppScreen.AUTH);
      }
    });
    return () => unsubscribe();
  }, [setCurrentScreen, setUser, currentScreen]);

  // 测试可达空间分析功能
  const testReachableSpaceAnalysis = async () => {
    try {
      setAnalysisStatus('正在加载训练数据...');
      
      // 使用一个具体的训练数据文件路径
      const filePath = '/traindata/yyFl2x0Q5OfnUTDlYo5pN32Mk1r1/Wayne_20251214_98.json';
      
      // 加载训练数据
      const trainingData = await reachableSpaceAnalyzer.loadTrainingData(filePath);
      
      if (!trainingData) {
        setAnalysisStatus('加载失败: 无法加载训练数据文件');
        return;
      }
  
      setAnalysisStatus('正在分析可达空间...');
      
      // 分析可达空间
      const analysisResult = await reachableSpaceAnalyzer.analyzeReachableSpace(filePath);
      
      if (!analysisResult.success) {
        setAnalysisStatus(`分析失败: ${analysisResult.message}`);
        return;
      }
  
      setAnalysisStatus('正在生成3D可视化...');
      
      // 在新标签页中打开3D可视化
      reachableSpaceAnalyzer.open3DVisualizationInNewTab(
        analysisResult, 
        '测试会话'
      );
      
      // 由于open3DVisualizationInNewTab返回void，直接显示成功消息
      setAnalysisStatus('3D可视化已在新标签页中打开！');
      
      // 生成分析报告
      const report = reachableSpaceAnalyzer.generateAnalysisReport(analysisResult);
      console.log('分析报告:', report);
      
    } catch (error) {
      console.error('测试过程中出错:', error);
      setAnalysisStatus(`错误: ${error.message}`);
    }
  };

  return (
    <div className="w-full h-screen relative bg-slate-900 text-white overflow-hidden">
      {/* 测试按钮 - 只在开发模式下显示 */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={testReachableSpaceAnalysis}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            title="测试可达空间分析功能"
          >
            测试分析功能
          </button>
          {analysisStatus && (
            <div className="mt-2 bg-gray-800 text-white px-3 py-2 rounded text-xs max-w-xs">
              {analysisStatus}
            </div>
          )}
        </div>
      )}
      
      {currentScreen === AppScreen.AUTH && <AuthScreen />}
      {currentScreen === AppScreen.DASHBOARD && <Dashboard />}
      {currentScreen === AppScreen.GAME && <GameScene />}
    </div>
  );
};

export default App;