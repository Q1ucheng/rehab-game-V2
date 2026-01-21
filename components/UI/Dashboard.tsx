/**
 * Dashboard.tsx
 * 康复游戏系统主控制面板组件
 * 
 * 功能概述：
 * - 用户个人资料管理和显示
 * - 训练历史记录查看
 * - 训练会话启动和难度设置
 * - 医疗笔记编辑和保存
 * - 训练数据上传管理
 * - 用户认证状态管理
 * 
 * 技术栈：
 * - React + TypeScript + Tailwind CSS
 * - Firebase Authentication & Firestore
 * - Zustand状态管理
 * - 响应式网格布局
 * 
 * author: Qiucheng Zhao
 */


import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { authService, userService } from '../../services/firebase';
import { AppScreen, GameDifficulty } from '../../types';
import TrainingResults from './TrainingResults';
import TrainingDetailsModal from './TrainingDetailsModal';
import DifficultySettingsModal from './DifficultySettingsModal';
import TrainingDataUpload from './TrainingDataUpload';


// ==================== 接口定义 ====================
/**
 * TrainingSession接口 - 训练会话数据结构
 * 
 * 包含训练会话的完整信息：
 * - 会话标识和用户信息
 * - 时间戳和持续时间
 * - 训练数据和成绩统计
 * - 文件路径信息
 */
interface TrainingSession {
  session_id: string;
  user: {
    uid: string;
    displayName: string;
    email: string;
  };
  session_start_time: string;
  session_end_time: string;
  session_duration_ms: number;
  total_data_points: number;
  final_score: number;
  final_fails: number;
  file_path: string;
}


// ==================== 模块3：组件定义 ====================
/**
 * Dashboard组件 - 康复训练主控制面板
 * 
 * 主要功能：
 * - 用户个人资料同步和编辑
 * - 训练历史记录展示和筛选
 * - 训练会话启动流程控制
 * - 难度设置和游戏启动
 * - 数据刷新和状态管理
 */
const Dashboard: React.FC = () => {
  // ==================== 状态管理 ====================
  /**
   * 状态变量定义
   * 
   * @state description - 用户医疗笔记/状态描述
   * @state isEditing - 编辑模式状态
   * @state saving - 保存操作加载状态
   * @state selectedSession - 选中的训练会话
   * @state isModalOpen - 训练详情模态框状态
   * @state isDifficultyModalOpen - 难度设置模态框状态
   * @state refreshTrigger - 数据刷新触发器
   */
  const { user, setCurrentScreen, score, setGameDifficulty } = useStore();
  const [description, setDescription] = useState(user?.description || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDifficultyModalOpen, setIsDifficultyModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ==================== 副作用处理 ====================
  /**
   * useEffect - 用户数据同步副作用
   * 
   * 功能：
   * - 用户登录时同步个人资料数据
   * - 更新最高分记录到Firebase
   * - 依赖user和score状态变化
   */
  useEffect(() => {
    if (user) {
      setDescription(user.description || '');
      if (score > user.highScore) {
         userService.updateStats(user.uid, score);
      }
    }
  }, [user, score]);

  // ==================== 事件处理函数 ====================
  /**
   * handleSaveProfile - 保存用户资料
   * 
   * 流程：
   * 1. 验证用户存在性
   * 2. 设置保存状态
   * 3. 调用Firebase更新服务
   * 4. 重置状态和退出编辑模式
   */
  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await userService.updateStats(user.uid, user.highScore, description);
    setSaving(false);
    setIsEditing(false);
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  const handleSessionSelect = (session: TrainingSession) => {
    setSelectedSession(session);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSession(null);
  };

  const handleRefreshTrainingData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleStartSession = () => {
    setIsDifficultyModalOpen(true);
  };

  const handleDifficultyConfirm = (difficulty: GameDifficulty) => {
    setGameDifficulty(difficulty);
    setIsDifficultyModalOpen(false);
    setCurrentScreen(AppScreen.GAME);
  };

  const handleDifficultyCancel = () => {
    setIsDifficultyModalOpen(false);
  };

  if (!user) return null;

  return (
    // 优化全局滚动容器
    <div className="min-h-screen bg-slate-900 p-6 md:p-12 overflow-y-auto" style={{
      scrollbarWidth: 'thin',
      scrollbarColor: '#334155 #0f172a',
      height: '100vh',
      boxSizing: 'border-box'
    }}>
      {/* 自定义滚动条样式 */}
      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0f172a;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 4px;
          border: 2px solid #0f172a;
        }
        ::-webkit-scrollbar-thumb:hover {
          background-color: #475569;
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome, {user.displayName}</h1>
            <p className="text-slate-400">Rehabilitation Dashboard</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleRefreshTrainingData}
              className="px-4 py-2 border border-slate-600 rounded-lg text-sky-400 hover:bg-slate-800 transition flex items-center gap-2"
            >
              <i className="fa-solid fa-rotate"></i> Refresh Data
            </button>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800 transition"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* 修复后的网格布局 */}
        <div className="grid grid-cols-1 gap-6">
          {/* 第一行：主操作区域和右侧边栏 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Action */}
            <div className="md:col-span-2 bg-gradient-to-r from-sky-600 to-emerald-600 rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              <h2 className="text-6xl font-bold text-white mb-4 relative z-10 mt-8 ml-0">Ready for training?</h2>
              <ul className="text-2xl text-white/80 mb-20 relative z-10 space-y-2">
                <li className="flex items-start">
                  <span className="mr-3 mt-3">•</span>
                  <span className="mt-3">Connect your Xbox controller or use the custom grip device.</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 mt-1">•</span>
                  <span>Keep the ball on the platform to improve stability and motor control.</span>
                </li>
              </ul>
              <button
                onClick={handleStartSession}
                className="text-3xl relative z-10 bg-white text-sky-700 px-12 py-10 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 block mx-auto"
              >
                <i className="fa-solid fa-play"></i> Start Session
              </button>
            </div>

            {/* Right Sidebar - Personal Best and Training Sessions */}
            <div className="space-y-4">
              {/* Personal Best */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 flex flex-col justify-center items-center">
                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">Personal Best</p>
                <div className="text-6xl font-mono font-bold text-emerald-400 mb-2">
                  {Math.max(user.highScore, score)}
                </div>
                <p className="text-slate-500 text-sm">Points</p>
              </div>

              {/* Training Results */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                  <h3 className="text-lg font-bold text-white">Training History</h3>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                  <TrainingResults 
                    onSessionSelect={handleSessionSelect} 
                    refreshTrigger={refreshTrigger}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 第二行：功能区域 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 训练数据上传组件 */}
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <TrainingDataUpload />
            </div>

            {/* Medical Notes / Status 和 Instructions - 垂直堆叠，占据2列 */}
            <div className="md:col-span-2 space-y-6">
              {/* Profile / Notes */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Medical Notes / Status</h3>
                  <button 
                    onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                    className="text-sky-400 hover:text-sky-300 text-sm font-medium"
                  >
                    {isEditing ? (saving ? 'Saving...' : 'Save') : 'Edit'}
                  </button>
                </div>
                
                {isEditing ? (
                  // 将Medical Notes / Status设为固定高度
                  <textarea
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-slate-300 focus:ring-2 focus:ring-sky-500 outline-none h-[400px] overflow-y-auto"
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.currentTarget.value)}
                    placeholder="Enter rehabilitation notes, current pain levels, or doctor's instructions..."
                  />
                ) : (
                  <div className="bg-slate-900/50 rounded-lg p-4 min-h-[100px] max-h-[300px] overflow-y-auto">
                    <p className="text-slate-300 whitespace-pre-wrap">
                      {description || "No notes recorded yet."}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Instructions */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Instructions</h3>
                <div className="grid md:grid-cols-2 gap-4 text-slate-400 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0">1</div>
                    <p>Connect a Gamepad (Xbox/PlayStation) to your computer. Press any button to activate.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0">2</div>
                    <p>Use the <strong>Left Stick</strong> to tilt the platform (Pitch & Roll).</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0">3</div>
                    <p>Use <strong>Triggers</strong> (L2/R2) to rotate the platform (Yaw).</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white shrink-0">4</div>
                    <p>Collect green cubes for points. Avoid letting the red ball fall off the edge!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Training Details Modal */}
      <TrainingDetailsModal 
        session={selectedSession}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {/* Difficulty Settings Modal */}
      <DifficultySettingsModal
        isOpen={isDifficultyModalOpen}
        onClose={handleDifficultyCancel}
        onStartGame={handleDifficultyConfirm}
      />
    </div>
  );
};

export default Dashboard;