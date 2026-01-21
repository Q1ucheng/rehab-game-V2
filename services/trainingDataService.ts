/**
 * 康复游戏系统 - 训练数据服务模块
 * 
 * 功能描述：负责训练会话数据的加载、处理、格式化和上传服务
 * 技术栈：TypeScript + Fetch API + Firebase Firestore
 * 主要功能模块：数据接口定义、训练会话管理、文件探测读取、数据格式化、Firebase上传
 * 核心特性：支持Mock模式、浏览器环境文件探测、用户数据过滤、成功率计算
 * 
 * 模块说明：
 * - TrainingSessionData: 训练会话详细数据接口
 * - TrainingSessionSummary: 训练会话摘要接口（列表显示用）
 * - TrainingDataService: 训练数据服务类，包含数据加载、处理、上传等核心功能
 * - 运行模式：支持Mock模式（本地存储）和真实Firebase后端连接
 * 
 * 作者：Qiucheng Zhao
 */


/**
 * 训练会话详细数据接口
 */
export interface TrainingSessionData {
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
  training_data: Array<{
    timestamp: number;
    inputState: {
      roll: number;
      pitch: number;
      yaw: number;
    };
    gameState: {
      score: number;
      fails: number;
      isGameOver: boolean;
    };
  }>;
}

/**
 * 训练会话摘要接口（用于列表显示）
 */
export interface TrainingSessionSummary {
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
  file_path: string; // 此时 file_path 存储的是文件名，如 training_data_001.json
}

class TrainingDataService {
  // 对应 Python 后端的 base_path，确保该路径下直接存储 .json 文件
  private basePath = '/rehab-game/traindata';

  /**
   * 计算成功率（百分比）
   * 默认口径：成功 = 得分次数，失败 = 失败次数
   */
  calculateSuccessRate(score: number, fails: number): number {
    const safeScore = Number.isFinite(score) ? Math.max(0, score) : 0;
    const safeFails = Number.isFinite(fails) ? Math.max(0, fails) : 0;
    const total = safeScore + safeFails;
    if (total <= 0) return 0;
    return (safeScore / total) * 100;
  }

  /**
   * 获取用户的所有训练会话摘要
   * 逻辑：扫描全局文件夹，读取文件内容，根据内部的 UID 过滤出当前用户的数据
   */
  async getUserTrainingSessions(userId: string): Promise<TrainingSessionSummary[]> {
    try {
      const sessions: TrainingSessionSummary[] = [];
      
      // Python 后端现在直接存放在 basePath 下，不再分 UID 文件夹
      const dirPath = this.basePath;
      
      // 获取可用的文件列表
      // 在浏览器环境下，我们通过探测法（Probe）查找 training_data_001.json 等文件
      const trainingFiles = await this.scanTrainingFiles(dirPath);
      
      // 读取每个训练文件并根据内容过滤 UID
      for (const fileName of trainingFiles) {
        try {
          const filePath = `${dirPath}/${fileName}`;
          const sessionData = await this.readTrainingFile(filePath);
          
          if (sessionData) {
            // 关键修改：由于文件混在一起，通过 JSON 内部的 user.uid 过滤
            // 如果是 Mock 模式，则显示所有数据
            if (this.isMockMode() || sessionData.user.uid === userId) {
              const summary = this.formatSessionForDisplay(sessionData, fileName);
              sessions.push(summary);
            }
          }
        } catch (error) {
          console.warn(`Failed to process ${fileName}:`, error);
        }
      }
      
      // 按时间倒序排列（最新的在前）
      return sessions.sort((a, b) => 
        new Date(b.session_start_time).getTime() - new Date(a.session_start_time).getTime()
      );
    } catch (error) {
      console.error('Error loading training sessions:', error);
      throw error;
    }
  }

  /**
   * 探测并列出目录下的训练文件
   * 由于浏览器限制，无法直接 list 目录，通过尝试序号 001 - 100 进行探测
   */
  private async scanTrainingFiles(dirPath: string): Promise<string[]> {
    const availableFiles: string[] = [];
    const maxProbe = 50; // 探测前50个文件，可根据实际训练次数调整
    
    const probePromises = [];
    for (let i = 1; i <= maxProbe; i++) {
      const fileName = `training_data_${String(i).padStart(3, '0')}.json`;
      const filePath = `${dirPath}/${fileName}`;
      
      // 并行探测文件是否存在
      probePromises.push(
        fetch(filePath, { method: 'HEAD' })
          .then(res => res.ok ? fileName : null)
          .catch(() => null)
      );
    }

    const results = await Promise.all(probePromises);
    results.forEach(name => {
      if (name) availableFiles.push(name);
    });

    // 如果探测不到，返回一些已知的固定文件作为保底（可选）
    if (availableFiles.length === 0) {
        return ['training_data_001.json', 'training_data_002.json'];
    }

    return availableFiles;
  }

  /**
   * 获取特定训练会话的详细数据
   */
  async getTrainingSessionDetails(fileName: string): Promise<TrainingSessionData | null> {
    try {
      // 直接从根目录读取文件名
      const fullPath = `${this.basePath}/${fileName}`;
      return await this.readTrainingFile(fullPath);
    } catch (error) {
      console.error('Error loading training session details:', error);
      return null;
    }
  }

  /**
   * 读取 JSON 文件内容
   */
  private async readTrainingFile(filePath: string): Promise<TrainingSessionData | null> {
    try {
      const response = await fetch(filePath);
      if (!response.ok) return null;
      return await response.json() as TrainingSessionData;
    } catch (error) {
      return null;
    }
  }

  /**
   * 提取最终成绩统计
   */
  extractFinalStats(trainingData: TrainingSessionData['training_data']): { final_score: number; final_fails: number } {
    if (trainingData.length === 0) return { final_score: 0, final_fails: 0 };
    const lastDataPoint = trainingData[trainingData.length - 1];
    return {
      final_score: lastDataPoint.gameState.score,
      final_fails: lastDataPoint.gameState.fails
    };
  }

  /**
   * 格式化数据用于前端展示
   */
  formatSessionForDisplay(session: TrainingSessionData, fileName: string): TrainingSessionSummary {
    const finalStats = this.extractFinalStats(session.training_data);
    return {
      session_id: session.session_id,
      user: session.user,
      session_start_time: session.session_start_time,
      session_end_time: session.session_end_time,
      session_duration_ms: session.session_duration_ms,
      total_data_points: session.total_data_points,
      final_score: finalStats.final_score,
      final_fails: finalStats.final_fails,
      file_path: fileName // 传递文件名以便后续详情查询
    };
  }

  /**
   * 检查是否为 Mock 模式
   */
  private isMockMode(): boolean {
    const mockSession = localStorage.getItem('mock_auth_session');
    return mockSession !== null || !this.hasValidFirebaseConfig();
  }

  /**
   * 检查 Firebase 配置是否有效
   */
  private hasValidFirebaseConfig(): boolean {
    const env = (import.meta as any).env;
    const apiKey = env?.VITE_FIREBASE_API_KEY;
    return apiKey && apiKey !== "YOUR_API_KEY" && !apiKey.includes("YOUR_API_KEY");
  }

  /**
   * 上传本地数据到 Firebase（逻辑保持不变）
   */
  async uploadTrainingDataToFirebase(sessionData: TrainingSessionData): Promise<boolean> {
    try {
      if (this.isMockMode()) return true;
      const { getFirestore, doc, setDoc } = await import('firebase/firestore');
      const { getApp } = await import('firebase/app');
      const db = getFirestore(getApp());
      const trainingDataRef = doc(db, "training_sessions", sessionData.session_id);
      await setDoc(trainingDataRef, {
        ...sessionData,
        uploaded_at: new Date().toISOString()
      });
      return true;
    } catch (error) {
      console.error('Firebase upload error:', error);
      return false;
    }
  }
}

export const trainingDataService = new TrainingDataService();
