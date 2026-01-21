/**
 * TrainingDetailsModal.tsx
 * 康复游戏系统 - 训练会话详情模态框组件
 * 
 * 功能描述：
 * - 显示单个训练会话的详细信息（用户信息、会话信息、性能统计）
 * - 提供多种数据分析模式（浏览器分析、服务器分析、本地分析）
 * - 3D可达空间可视化展示
 * - 分析结果导出和查看功能
 * 
 * 技术栈：
 * - React + TypeScript
 * - Tailwind CSS (UI样式)
 * - trainingDataService (训练数据服务)
 * - reachableSpaceAnalyzer (可达空间分析服务)
 * 
 * author: Qiucheng Zhao
 */


import React, { useState, useEffect } from 'react';
import { TrainingSessionSummary, trainingDataService } from '../../services/trainingDataService';
import { reachableSpaceAnalyzer, AnalysisResult } from '../../services/reachableSpaceAnalyzer';

interface TrainingDetailsModalProps {
  session: TrainingSessionSummary | null;
  isOpen: boolean;
  onClose: () => void;
}

const TrainingDetailsModal: React.FC<TrainingDetailsModalProps> = ({ 
  session, 
  isOpen, 
  onClose 
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [analysisMethod, setAnalysisMethod] = useState<'server' | 'browser'>('browser');
  const [analysisOutputFile, setAnalysisOutputFile] = useState<string>('');
  const [show3DVisualization, setShow3DVisualization] = useState(false);
  const [visualizationHtml, setVisualizationHtml] = useState<string>('');

  if (!isOpen || !session) return null;

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const successRate = trainingDataService.calculateSuccessRate(session.final_score, session.final_fails);

  const handleAnalyzeData = async () => {
    if (!session) return;
    
    setIsAnalyzing(true);
    setAnalysisResult('');
    setAnalysisOutputFile('');
    setShow3DVisualization(false);
    setVisualizationHtml('');
    
    try {
      // 构建训练数据文件的完整路径
      const filePath = `/rehab-game/traindata/yyFl2x0Q5OfnUTDlYo5pN32Mk1r1/${session.file_path}`;
      
      if (analysisMethod === 'server') {
        // 服务器端分析（原有功能）
        const response = await fetch('/api/analyze-training-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filePath: filePath,
            sessionId: session.session_id
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          setAnalysisResult(`分析完成！结果已保存为: ${result.outputFile}`);
          setAnalysisOutputFile(result.outputFile);
        } else {
          setAnalysisResult('分析失败：无法连接到分析服务');
        }
      } else {
        // 浏览器端分析（新功能）- 在模态框中显示3D可视化
        const result = await reachableSpaceAnalyzer.analyzeReachableSpace(filePath);
        const report = reachableSpaceAnalyzer.generateAnalysisReport(result);
        setAnalysisResult(report);
        
        // 生成3D可视化HTML
        const htmlContent = reachableSpaceAnalyzer.generate3DVisualization(result, session.user.displayName);
        setVisualizationHtml(htmlContent);
        setShow3DVisualization(true);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisResult(`分析失败：${error instanceof Error ? error.message : '发生未知错误'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 新增手动打开分析结果的函数
  const handleOpenAnalysisResult = () => {
    if (analysisOutputFile) {
      window.open(analysisOutputFile, '_blank');
    }
  };

  const handleLocalAnalyze = () => {
    if (!session) return;
    
    // 显示本地分析说明
    setAnalysisResult(`
分析功能说明：
1. 确保已安装Python和以下依赖：
   - pip install plotly numpy scipy
2. 运行以下命令进行分析：
   python demo.py "public/traindata/yyFl2x0Q5OfnUTDlYo5pN32Mk1r1/${session.file_path}"
3. 分析结果将保存为HTML文件，可在浏览器中查看
    `);
    setShow3DVisualization(false);
  };

  // 新增导出HTML功能
  const handleExportHtml = () => {
    if (!visualizationHtml) return;
    
    // 创建Blob对象
    const blob = new Blob([visualizationHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // 创建下载链接
    const a = document.createElement('a');
    a.href = url;
    a.download = `可达空间分析_${session?.user.displayName || '用户'}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // 释放URL对象
    URL.revokeObjectURL(url);
  };

  // 渲染3D可视化iframe
  const render3DVisualization = () => {
    if (!show3DVisualization || !visualizationHtml) return null;

    // 创建Blob URL用于iframe
    const blob = new Blob([visualizationHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    return (
      <div className="mt-4">
        <h4 className="text-slate-300 text-sm font-bold mb-3">3D可达空间可视化</h4>
        <div className="bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
          {/* 可视化控制面板 */}
          <div className="bg-slate-800 p-3 border-b border-slate-700">
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-slate-300 text-sm font-medium">可视化控制</span>
                <div className="flex gap-1">
                  <button 
                    onClick={handleExportHtml}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition flex items-center gap-1"
                  >
                    <i className="fa-solid fa-download"></i>
                    导出图像
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">数据点: {session?.total_data_points.toLocaleString()}</span>
                <span className="text-slate-400 text-xs">|</span>
                <span className="text-slate-400 text-xs">渲染质量: 高</span>
              </div>
            </div>
          </div>
          
          {/* 主要可视化区域 */}
          <div className="relative">
            <iframe 
              src={url}
              className="w-full h-80 border-0"
              title="可达空间3D可视化"
              sandbox="allow-scripts allow-same-origin"
            />
            
            {/* 悬浮统计信息 */}
            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-lg p-3 min-w-[200px]">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-xs">数据点总数</span>
                  <span className="text-white font-medium text-sm">{session?.total_data_points.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-xs">分析时间</span>
                  <span className="text-white font-medium text-sm">{new Date().toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-xs">可视化版本</span>
                  <span className="text-blue-400 font-medium text-sm">v2.0</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 底部工具栏 */}
          <div className="bg-slate-800 p-3 border-t border-slate-700">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-slate-300 text-xs">边界线</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span className="text-slate-300 text-xs">数据点</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-red-500 rounded"></div>
                  <span className="text-slate-300 text-xs">可达空间</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 扩展统计信息 */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-blue-400 text-lg font-bold">{session?.total_data_points.toLocaleString()}</div>
            <div className="text-slate-400 text-xs">总数据点</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-green-400 text-lg font-bold">{(session?.total_data_points || 0) > 0 ? Math.floor((session?.total_data_points || 0) / 100) : 0}</div>
            <div className="text-slate-400 text-xs">边界点数量</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-yellow-400 text-lg font-bold">{(session?.session_duration_ms || 0) / 1000}s</div>
            <div className="text-slate-400 text-xs">训练时长</div>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3 text-center">
            <div className="text-red-400 text-lg font-bold">{successRate.toFixed(1)}%</div>
            <div className="text-slate-400 text-xs">成功率</div>
          </div>
        </div>
        
        {/* 分析说明 */}
        <div className="mt-3 bg-slate-900/30 rounded-lg p-3">
          <h5 className="text-slate-300 text-sm font-medium mb-2">分析说明</h5>
          <div className="text-slate-400 text-xs space-y-1">
            <p>• 3D可视化展示了用户在训练过程中的最大可达空间范围</p>
            <p>• 紫色到红色的渐变表示从低到高的运动高度</p>
            <p>• 蓝色线条标记了可达空间的边界轮廓</p>
            <p>• 可以通过鼠标拖拽旋转视角，滚轮缩放</p>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-slate-400 flex justify-between items-center">
          <span>提示：如果3D模型无法显示，请确保浏览器允许运行JavaScript</span>
          <span className="text-slate-500">更新时间: {new Date().toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">训练会话详情</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div>
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
              用户信息
            </h3>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">用户名:</span>
                <span className="text-white font-medium">{session.user.displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">邮箱:</span>
                <span className="text-slate-400 text-sm">{session.user.email}</span>
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div>
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
              会话信息
            </h3>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-300 text-sm">开始时间:</span>
                  <div className="text-white font-medium">{formatDate(session.session_start_time)}</div>
                </div>
                <div>
                  <span className="text-slate-300 text-sm">结束时间:</span>
                  <div className="text-white font-medium">{formatDate(session.session_end_time)}</div>
                </div>
                <div>
                  <span className="text-slate-300 text-sm">持续时间:</span>
                  <div className="text-white font-medium">{formatDuration(session.session_duration_ms)}</div>
                </div>
                <div>
                  <span className="text-slate-300 text-sm">数据点数:</span>
                  <div className="text-white font-medium">{session.total_data_points.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div>
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
              性能统计
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{session.final_score}</div>
                <div className="text-emerald-100 text-sm">分数</div>
              </div>
              <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">{session.final_fails}</div>
                <div className="text-red-100 text-sm">失败次数</div>
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {successRate.toFixed(1)}%
                </div>
                <div className="text-blue-100 text-sm">成功率</div>
              </div>
            </div>
          </div>

          {/* Data Analysis Section */}
          <div>
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
              数据分析
            </h3>
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-4">
              {/* 分析模式选择 */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setAnalysisMethod('browser')}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
                    analysisMethod === 'browser' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <i className="fa-solid fa-globe mr-2"></i>
                  浏览器分析
                </button>
                <button
                  onClick={() => setAnalysisMethod('server')}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium transition ${
                    analysisMethod === 'server' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <i className="fa-solid fa-server mr-2"></i>
                  服务器分析
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAnalyzeData}
                  disabled={isAnalyzing}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-2 px-4 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                      {analysisMethod === 'browser' ? '浏览器分析中...' : '服务器分析中...'}
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-chart-line"></i>
                      {analysisMethod === 'browser' ? '浏览器分析' : '服务器分析'}
                    </>
                  )}
                </button>
                <button
                  onClick={handleLocalAnalyze}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-terminal"></i>
                  本地分析
                </button>
              </div>
              
              {analysisResult && (
                <div className="bg-slate-800 rounded p-3">
                  <p className="text-slate-300 text-sm whitespace-pre-wrap">{analysisResult}</p>
                  
                  {/* 3D可视化显示区域 */}
                  {render3DVisualization()}
                  
                  {/* 服务器分析结果查看按钮 */}
                  {analysisOutputFile && (
                    <div className="mt-3">
                      <button
                        onClick={handleOpenAnalysisResult}
                        className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white py-2 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 w-full"
                      >
                        <i className="fa-solid fa-external-link-alt"></i>
                        在新标签页中查看分析结果
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Session ID */}
          <div>
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-2">
              会话ID
            </h3>
            <div className="bg-slate-900/50 rounded-lg p-3">
              <code className="text-slate-300 text-xs break-all">{session.session_id}</code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-3 rounded-lg font-medium transition"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingDetailsModal;