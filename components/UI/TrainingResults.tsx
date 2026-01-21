/**
 * 训练结果展示组件
 * 
 * 功能：显示用户的训练会话列表，支持会话选择和刷新功能
 * 技术栈：React + TypeScript + Tailwind CSS + Font Awesome
 * 
 * 
 * 主要功能模块：
 * 1. 训练会话数据加载和状态管理
 * 2. 时间格式化辅助函数
 * 3. 响应式UI渲染（加载状态、空状态、数据列表）
 * 4. 会话选择和刷新交互
 * 
 * 作者：Qiucheng Zhao
 */


import React, { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { trainingDataService, TrainingSessionSummary } from '../../services/trainingDataService';

interface TrainingResultsProps {
  onSessionSelect: (session: TrainingSessionSummary) => void;
  refreshTrigger?: number; // 添加刷新触发器
}

const TrainingResults: React.FC<TrainingResultsProps> = ({ onSessionSelect, refreshTrigger = 0 }) => {
  const { user } = useStore();
  const [sessions, setSessions] = useState<TrainingSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrainingSessions = async () => {
    setLoading(true);
    try {
      // 在Mock Mode下，即使没有用户登录，也使用固定的用户ID加载训练数据
      const effectiveUserId = user?.uid || 'yyFl2x0Q5OfnUTDlYo5pN32Mk1r1';
      const userSessions = await trainingDataService.getUserTrainingSessions(effectiveUserId);
      setSessions(userSessions);
    } catch (error) {
      console.error('Error loading training sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrainingSessions();
  }, [user, refreshTrigger]); // 添加refreshTrigger作为依赖

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4"> {/* 减少内边距 */}
        <h3 className="text-lg font-bold text-white mb-3">Recent Training Sessions</h3> {/* 减小字体 */}
        <div className="text-slate-400 text-center py-6"> {/* 减少垂直内边距 */}
          <i className="fa-solid fa-spinner fa-spin text-xl mb-2"></i> {/* 减小图标 */}
          <p className="text-sm">Loading training sessions...</p> {/* 减小字体 */}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4"> {/* 减少内边距 */}
        <h3 className="text-lg font-bold text-white mb-3">Recent Training Sessions</h3> {/* 减小字体 */}
        <div className="text-slate-400 text-center py-6"> {/* 减少垂直内边距 */}
          <i className="fa-solid fa-chart-line text-2xl mb-2 opacity-50"></i> {/* 减小图标 */}
          <p className="text-sm">No training sessions recorded yet.</p> {/* 减小字体 */}
          <p className="text-xs mt-1">Complete a training session to see results here.</p> {/* 减小字体 */}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4"> {/* 减少内边距 */}
      <div className="flex justify-between items-center mb-3"> {/* 减少底部边距 */}
        <h3 className="text-lg font-bold text-white">Recent Training Sessions</h3> {/* 减小字体 */}
        <button
          onClick={loadTrainingSessions}
          className="text-sky-400 hover:text-sky-300 text-xs font-medium flex items-center gap-1" /* 减小字体和间距 */
        >
          <i className="fa-solid fa-rotate text-xs"></i> {/* 减小图标 */}
          Refresh
        </button>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto"> {/* 减少间距和最大高度 */}
        {sessions.map((session, index) => (
          <div
            key={session.session_id}
            className="bg-slate-900/50 rounded-lg p-3 hover:bg-slate-900/70 transition cursor-pointer border border-slate-700/50" /* 减少内边距 */
            onClick={() => onSessionSelect(session)}
          >
            <div className="flex justify-between items-center mb-1"> {/* 减少底部边距 */}
              <span className="text-slate-300 font-medium text-sm"> {/* 减小字体 */}
                Session {sessions.length - index}
              </span>
              <span className="text-emerald-400 font-bold text-base"> {/* 减小字体 */}
                {session.final_score} pts
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400"> {/* 减小字体 */}
              <span>{formatDate(session.session_start_time)}</span>
              <span>{formatDuration(session.session_duration_ms)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>Fails: {session.final_fails}</span>
              <span>Data Points: {session.total_data_points.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrainingResults;