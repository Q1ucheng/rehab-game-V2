interface TrainingSessionData {
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

interface TrainingSessionSummary {
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

class TrainingDataService {
  private basePath = '/rehab-game/traindata';
  private mockUserId = 'yyFl2x0Q5OfnUTDlYo5pN32Mk1r1'; // 训练数据文件对应的用户ID

  /**
   * 获取用户的所有训练会话摘要
   */
  async getUserTrainingSessions(userId: string): Promise<TrainingSessionSummary[]> {
    try {
      // 扫描训练数据目录，获取所有JSON文件
      const sessions: TrainingSessionSummary[] = [];
      
      // 在Mock Mode下使用固定的用户ID来访问训练数据
      // 这样无论用户使用什么邮箱登录，都能看到训练数据
      const effectiveUserId = this.isMockMode() ? this.mockUserId : userId;
      
      // 获取用户目录下的所有训练文件
      const userDirPath = `${this.basePath}/${effectiveUserId}`;
      
      // 更新训练文件列表，包含所有文件
      const trainingFiles = [
        'Wayne_20251214_01.json',
        'Wayne_20251214_03.json',
        'Wayne_20251214_97.json',
        'Wayne_20251214_98.json',
        'Wayne_20251228_02.json'
      ];
      
      // 读取每个训练文件并提取摘要信息
      for (const fileName of trainingFiles) {
        try {
          const filePath = `${userDirPath}/${fileName}`;
          const sessionData = await this.readTrainingFile(filePath);
          if (sessionData) {
            const summary = this.formatSessionForDisplay(sessionData, fileName);
            sessions.push(summary);
          }
        } catch (error) {
          console.warn(`Failed to load training file ${fileName}:`, error);
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
   * 检查是否运行在Mock Mode
   */
  private isMockMode(): boolean {
    // 检查是否有mock_auth_session存在，或者Firebase配置是否有效
    const mockSession = localStorage.getItem('mock_auth_session');
    return mockSession !== null || !this.hasValidFirebaseConfig();
  }

  /**
   * 检查是否有有效的Firebase配置
   */
  private hasValidFirebaseConfig(): boolean {
    // 检查环境变量中是否有有效的Firebase配置
    const env = (import.meta as any).env;
    const apiKey = env?.VITE_FIREBASE_API_KEY;
    return apiKey && apiKey !== "YOUR_API_KEY" && !apiKey.includes("YOUR_API_KEY");
  }

  /**
   * 获取特定训练会话的详细数据
   */
  async getTrainingSessionDetails(filePath: string): Promise<TrainingSessionData | null> {
    try {
      const effectiveUserId = this.isMockMode() ? this.mockUserId : 'yyFl2x0Q5OfnUTDlYo5pN32Mk1r1';
      const fullPath = `${this.basePath}/${effectiveUserId}/${filePath}`;
      return await this.readTrainingFile(fullPath);
    } catch (error) {
      console.error('Error loading training session details:', error);
      return null;
    }
  }

  // 删除重复的函数定义，保留上面的版本

  /**
   * 扫描训练文件目录，获取所有JSON文件
   */
  private async scanTrainingFiles(userDirPath: string): Promise<string[]> {
    try {
      // 创建一个简单的索引文件来列出所有可用的训练文件
      // 由于浏览器安全限制，我们无法直接扫描目录，所以需要手动维护文件列表
      // 这里我们硬编码已知的文件，但实际应用中应该通过后端API动态获取
      const knownFiles = [
        'Wayne_20251214_01.json',
        'Wayne_20251214_03.json',
        'Wayne_20251214_97.json',
        'Wayne_20251214_98.json'
      ];
      
      // 验证文件是否存在
      const availableFiles: string[] = [];
      
      for (const fileName of knownFiles) {
        try {
          const filePath = `${userDirPath}/${fileName}`;
          const response = await fetch(filePath, { method: 'HEAD' });
          if (response.ok) {
            availableFiles.push(fileName);
          }
        } catch (error) {
          console.warn(`File ${fileName} not found:`, error);
        }
      }
      
      return availableFiles;
    } catch (error) {
      console.error('Error scanning training files:', error);
      // 如果扫描失败，返回默认的文件列表
      return [
        'Wayne_20251214_01.json',
        'Wayne_20251214_03.json',
        'Wayne_20251214_97.json',
        'Wayne_20251214_98.json'
      ];
    }
  }

  // /**
  //  * 获取特定训练会话的详细数据
  //  */
  // async getTrainingSessionDetails(filePath: string): Promise<TrainingSessionData | null> {
  //   try {
  //     const fullPath = `${this.basePath}/yyFl2x0Q5OfnUTDlYo5pN32Mk1r1/${filePath}`;
  //     return await this.readTrainingFile(fullPath);
  //   } catch (error) {
  //     console.error('Error loading training session details:', error);
  //     return null;
  //   }
  // }

  /**
   * 读取训练文件
   */
  private async readTrainingFile(filePath: string): Promise<TrainingSessionData | null> {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${response.status}`);
      }
      const data = await response.json();
      return data as TrainingSessionData;
    } catch (error) {
      console.error(`Error reading training file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 从训练数据中提取最终得分和失败次数
   */
  extractFinalStats(trainingData: TrainingSessionData['training_data']): { final_score: number; final_fails: number } {
    if (trainingData.length === 0) {
      return { final_score: 0, final_fails: 0 };
    }

    const lastDataPoint = trainingData[trainingData.length - 1];
    return {
      final_score: lastDataPoint.gameState.score,
      final_fails: lastDataPoint.gameState.fails
    };
  }

  /**
   * 格式化训练会话数据用于显示
   */
  formatSessionForDisplay(session: TrainingSessionData, filePath: string): TrainingSessionSummary {
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
      file_path: filePath
    };
  }

  /**
   * 计算训练会话的成功率
   */
  calculateSuccessRate(score: number, fails: number): number {
    const totalAttempts = score + fails;
    return totalAttempts > 0 ? (score / totalAttempts) * 100 : 0;
  }

  /**
   * 获取训练会话的性能指标
   */
  getPerformanceMetrics(session: TrainingSessionData) {
    const finalStats = this.extractFinalStats(session.training_data);
    const successRate = this.calculateSuccessRate(finalStats.final_score, finalStats.final_fails);
    
    return {
      score: finalStats.final_score,
      fails: finalStats.final_fails,
      successRate,
      duration: session.session_duration_ms,
      dataPoints: session.total_data_points,
      averageScorePerMinute: finalStats.final_score / (session.session_duration_ms / 60000)
    };
  }

  /**
   * 上传训练数据到Firebase数据库
   */
  async uploadTrainingDataToFirebase(sessionData: TrainingSessionData): Promise<boolean> {
    try {
      // 检查是否在Mock模式
      if (this.isMockMode()) {
        console.warn('Running in Mock Mode. Training data will be saved locally instead of Firebase.');
        return this.saveTrainingDataToLocalStorage(sessionData);
      }

      // 检查是否有有效的Firebase配置
      if (!this.hasValidFirebaseConfig()) {
        console.warn('No valid Firebase configuration found. Saving training data locally.');
        return this.saveTrainingDataToLocalStorage(sessionData);
      }

      // 导入Firebase服务
      const { getFirestore, doc, setDoc } = await import('firebase/firestore');
      const { getApp } = await import('firebase/app');
      
      try {
        const app = getApp();
        const db = getFirestore(app);
        
        // 创建训练数据文档
        const trainingDataRef = doc(
          db,
          "training_sessions",
          sessionData.session_id
        );
        
        // 上传数据到Firestore
        await setDoc(trainingDataRef, {
          ...sessionData,
          uploaded_at: new Date().toISOString(),
          firebase_user_id: sessionData.user.uid
        });
        
        console.log(`Training session ${sessionData.session_id} uploaded successfully to Firebase`);
        return true;
      } catch (firebaseError) {
        console.error('Firebase upload error:', firebaseError);
        // Firebase上传失败时尝试保存到本地存储
        return this.saveTrainingDataToLocalStorage(sessionData);
      }
    } catch (error) {
      console.error('Error uploading training data to Firebase:', error);
      // 上传失败时尝试保存到本地存储
      return this.saveTrainingDataToLocalStorage(sessionData);
    }
  }

  /**
   * 将训练数据保存到本地存储（Mock模式或上传失败时使用）
   */
  private async saveTrainingDataToLocalStorage(sessionData: TrainingSessionData): Promise<boolean> {
    try {
      const key = `training_session_${sessionData.session_id}`;
      localStorage.setItem(key, JSON.stringify(sessionData));
      
      // 更新本地训练会话索引
      this.updateLocalTrainingIndex(sessionData);
      
      console.log(`Training session ${sessionData.session_id} saved to local storage`);
      return true;
    } catch (error) {
      console.error('Error saving training data to local storage:', error);
      return false;
    }
  }

  /**
   * 更新本地训练会话索引
   */
  private updateLocalTrainingIndex(sessionData: TrainingSessionData): void {
    try {
      const indexKey = 'local_training_sessions_index';
      const existingIndex = localStorage.getItem(indexKey);
      const index = existingIndex ? JSON.parse(existingIndex) : [];
      
      // 添加新的会话ID到索引
      if (!index.includes(sessionData.session_id)) {
        index.push(sessionData.session_id);
        localStorage.setItem(indexKey, JSON.stringify(index));
      }
    } catch (error) {
      console.error('Error updating local training index:', error);
    }
  }

  /**
   * 从本地存储获取所有训练会话
   */
  async getLocalTrainingSessions(): Promise<TrainingSessionData[]> {
    try {
      const indexKey = 'local_training_sessions_index';
      const index = localStorage.getItem(indexKey);
      
      if (!index) {
        return [];
      }
      
      const sessionIds = JSON.parse(index);
      const sessions: TrainingSessionData[] = [];
      
      for (const sessionId of sessionIds) {
        const key = `training_session_${sessionId}`;
        const sessionData = localStorage.getItem(key);
        
        if (sessionData) {
          sessions.push(JSON.parse(sessionData));
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('Error getting local training sessions:', error);
      return [];
    }
  }

  /**
   * 同步本地训练数据到Firebase（当网络恢复时）
   */
  async syncLocalTrainingDataToFirebase(): Promise<number> {
    try {
      const localSessions = await this.getLocalTrainingSessions();
      let successCount = 0;
      
      for (const session of localSessions) {
        const success = await this.uploadTrainingDataToFirebase(session);
        if (success) {
          successCount++;
          // 上传成功后从本地存储中删除
          this.removeTrainingDataFromLocalStorage(session.session_id);
        }
      }
      
      console.log(`Synced ${successCount} training sessions to Firebase`);
      return successCount;
    } catch (error) {
      console.error('Error syncing local training data to Firebase:', error);
      return 0;
    }
  }

  /**
   * 从本地存储中删除训练数据
   */
  private removeTrainingDataFromLocalStorage(sessionId: string): void {
    try {
      // 删除会话数据
      const key = `training_session_${sessionId}`;
      localStorage.removeItem(key);
      
      // 更新索引
      const indexKey = 'local_training_sessions_index';
      const existingIndex = localStorage.getItem(indexKey);
      
      if (existingIndex) {
        const index = JSON.parse(existingIndex);
        const updatedIndex = index.filter((id: string) => id !== sessionId);
        localStorage.setItem(indexKey, JSON.stringify(updatedIndex));
      }
    } catch (error) {
      console.error('Error removing training data from local storage:', error);
    }
  }

  /**
   * 从现有JSON文件上传训练数据到Firebase
   */
  async uploadExistingTrainingFiles(): Promise<{ success: number; failed: number }> {
    // 获取现有的训练文件列表
    const trainingFiles = [
      'Wayne_20251214_03.json',
      'Wayne_20251214_97.json',
      'Wayne_20251214_98.json'
    ];
    
    try {
      let successCount = 0;
      let failedCount = 0;
      
      for (const fileName of trainingFiles) {
        try {
          const filePath = `${this.basePath}/${this.mockUserId}/${fileName}`;
          const sessionData = await this.readTrainingFile(filePath);
          
          if (sessionData) {
            const success = await this.uploadTrainingDataToFirebase(sessionData);
            if (success) {
              successCount++;
              console.log(`Uploaded training file: ${fileName}`);
            } else {
              failedCount++;
              console.error(`Failed to upload training file: ${fileName}`);
            }
          }
        } catch (error) {
          console.error(`Error processing training file ${fileName}:`, error);
          failedCount++;
        }
      }
      
      return { success: successCount, failed: failedCount };
    } catch (error) {
      console.error('Error uploading existing training files:', error);
      return { success: 0, failed: trainingFiles.length };
    }
  }

}

export const trainingDataService = new TrainingDataService();
export type { TrainingSessionSummary, TrainingSessionData };