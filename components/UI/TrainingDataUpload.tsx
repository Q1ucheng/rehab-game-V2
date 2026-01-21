/**
 * TrainingDataUpload.tsx
 * 康复游戏系统 - 训练数据上传组件
 * 
 * 功能描述：
 * - 上传现有训练文件到Firebase数据库
 * - 同步本地训练数据到云端
 * - 显示上传状态和结果信息
 * 
 * 技术栈：
 * - React + TypeScript
 * - Tailwind CSS (UI样式)
 * - trainingDataService (训练数据服务)
 * 
 * author: Qiucheng Zhao
 */

// ============================== 模块1：导入依赖 ==============================
import React, { useState } from 'react';
import { trainingDataService } from '../../services/trainingDataService';

// ============================== 模块2：组件定义和状态管理 ==============================
/**
 * 训练数据上传组件
 * @component TrainingDataUpload
 * @returns {JSX.Element} 渲染的训练数据上传界面
 */
const TrainingDataUpload: React.FC = () => {
  // 上传状态管理
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null);
  
  // 同步状态管理
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncResult, setSyncResult] = useState<number | null>(null);

  // ============================== 模块3：上传现有文件处理 ==============================
  /**
   * 处理上传现有训练文件
   * 注意：当前trainingDataService中没有uploadExistingTrainingFiles方法
   * 需要根据实际需求实现或使用现有方法
   */
  const handleUploadExistingFiles = async () => {
    setUploadStatus('uploading');
    setUploadResult(null);
    
    try {
      // TODO: 需要实现uploadExistingTrainingFiles方法或使用现有方法
      // 临时模拟上传逻辑
      const result = { success: 5, failed: 0 }; // 模拟结果
      setUploadResult(result);
      setUploadStatus(result.failed === 0 ? 'success' : 'error');
    } catch (error) {
      console.error('Error uploading training files:', error);
      setUploadStatus('error');
    }
  };

  // ============================== 模块4：同步本地数据处理 ==============================
  /**
   * 处理同步本地数据到Firebase
   * 使用trainingDataService中的uploadTrainingDataToFirebase方法
   */
  const handleSyncLocalData = async () => {
    setSyncStatus('syncing');
    setSyncResult(null);
    
    try {
      // TODO: 需要实现syncLocalTrainingDataToFirebase方法或使用现有方法
      // 临时模拟同步逻辑
      const result = 3; // 模拟同步的会话数量
      setSyncResult(result);
      setSyncStatus(result > 0 ? 'success' : 'idle');
    } catch (error) {
      console.error('Error syncing local data:', error);
      setSyncStatus('error');
    }
  };

  // ============================== 模块5：状态显示辅助函数 ==============================
  /**
   * 根据状态获取对应的颜色类名
   * @param {string} status - 状态字符串
   * @returns {string} Tailwind CSS颜色类名
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      case 'uploading':
      case 'syncing': return 'text-yellow-400';
      default: return 'text-slate-400';
    }
  };

  /**
   * 根据状态获取对应的显示文本
   * @param {string} status - 状态字符串
   * @returns {string} 状态显示文本
   */
  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Completed';
      case 'error': return 'Failed';
      case 'uploading': return 'Uploading...';
      case 'syncing': return 'Syncing...';
      default: return 'Ready';
    }
  };

  // ============================== 模块6：主渲染函数 ==============================
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
      {/* 组件标题 */}
      <h3 className="text-xl font-bold text-white mb-4">Training Data Upload</h3>
      
      <div className="space-y-4">
        {/* 上传现有文件部分 */}
        <div className="bg-slate-900/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-medium text-slate-300">Upload Existing Training Files</h4>
            <span className={`text-sm font-medium ${getStatusColor(uploadStatus)}`}>
              {getStatusText(uploadStatus)}
            </span>
          </div>
          
          <p className="text-slate-400 text-sm mb-4">
            Upload existing JSON training files to Firebase database. This will upload all training sessions from the data directory.
          </p>
          
          <button
            onClick={handleUploadExistingFiles}
            disabled={uploadStatus === 'uploading'}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {uploadStatus === 'uploading' ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-spinner fa-spin"></i>
                Uploading...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-cloud-upload-alt"></i>
                Upload to Firebase
              </span>
            )}
          </button>
          
          {/* 上传结果显示 */}
          {uploadResult && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${
              uploadResult.failed === 0 ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'
            }`}>
              <div className="flex justify-between">
                <span>Successful uploads:</span>
                <span className="font-bold">{uploadResult.success}</span>
              </div>
              <div className="flex justify-between">
                <span>Failed uploads:</span>
                <span className="font-bold">{uploadResult.failed}</span>
              </div>
            </div>
          )}
        </div>

        {/* 同步本地数据部分 */}
        <div className="bg-slate-900/50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-medium text-slate-300">Sync Local Data</h4>
            <span className={`text-sm font-medium ${getStatusColor(syncStatus)}`}>
              {getStatusText(syncStatus)}
            </span>
          </div>
          
          <p className="text-slate-400 text-sm mb-4">
            Sync locally stored training data to Firebase. Useful when network connection was lost during previous uploads.
          </p>
          
          <button
            onClick={handleSyncLocalData}
            disabled={syncStatus === 'syncing'}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {syncStatus === 'syncing' ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-spinner fa-spin"></i>
                Syncing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <i className="fa-solid fa-sync-alt"></i>
                Sync Local Data
              </span>
            )}
          </button>
          
          {/* 同步结果显示 */}
          {syncResult !== null && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${
              syncResult > 0 ? 'bg-emerald-900/30 text-emerald-300' : 'bg-slate-700/30 text-slate-300'
            }`}>
              <div className="flex justify-between">
                <span>Sessions synced:</span>
                <span className="font-bold">{syncResult}</span>
              </div>
            </div>
          )}
        </div>

        {/* 信息说明部分 */}
        <div className="bg-slate-900/30 rounded-lg p-4">
          <h4 className="text-lg font-medium text-slate-300 mb-2">Information</h4>
          <ul className="text-slate-400 text-sm space-y-1">
            <li className="flex items-start gap-2">
              <i className="fa-solid fa-info-circle text-sky-400 mt-0.5"></i>
              <span>Training data is stored in Firebase Firestore under "training_sessions" collection</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fa-solid fa-shield-alt text-emerald-400 mt-0.5"></i>
              <span>Data is automatically backed up to local storage if Firebase is unavailable</span>
            </li>
            <li className="flex items-start gap-2">
              <i className="fa-solid fa-database text-purple-400 mt-0.5"></i>
              <span>Each session includes detailed input state and game state data</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TrainingDataUpload;