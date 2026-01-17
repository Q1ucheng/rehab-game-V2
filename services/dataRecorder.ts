import { InputState } from '../types';
import { useStore } from '../store/useStore';

export interface TrainingData {
  timestamp: number;
  inputState: InputState;
  gameState: {
    score: number;
    fails: number;
    isGameOver: boolean;
  };
}

export class DataRecorder {
  private static instance: DataRecorder;
  private ws: WebSocket | null = null;
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private dataBuffer: TrainingData[] = [];
  private readonly BUFFER_SIZE = 100;
  private readonly WS_RECONNECT_DELAY = 3000;
  private currentSessionId: string | null = null;

  private constructor() {
    this.connectWebSocket();
  }

  public static getInstance(): DataRecorder {
    if (!DataRecorder.instance) {
      DataRecorder.instance = new DataRecorder();
    }
    return DataRecorder.instance;
  }

  private connectWebSocket(): void {
    try {
      this.ws = new WebSocket('ws://localhost:8765');
      
      this.ws.onopen = () => {
        console.log('Connected to data recording server');
        // 发送连接确认
        this.ws?.send(JSON.stringify({ type: 'connection', status: 'connected' }));
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed, attempting to reconnect...');
        this.currentSessionId = null;
        this.isRecording = false;
        setTimeout(() => this.connectWebSocket(), this.WS_RECONNECT_DELAY);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      // 处理服务器响应
      this.ws.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          this.handleServerResponse(response);
        } catch (error) {
          console.error('Failed to parse server response:', error);
        }
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket server:', error);
    }
  }

  private handleServerResponse(response: any): void {
    switch (response.type) {
      case 'session_started':
        console.log('Training session started:', response.session_id);
        break;
      case 'data_received':
        console.log('Data received by server:', response.data_points, 'points');
        break;
      case 'session_ended':
        console.log('Training session ended, data saved to:', response.filename);
        break;
      case 'error':
        console.error('Server error:', response.message);
        break;
    }
  }

  public async startRecording(): Promise<boolean> {
    if (this.isRecording || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    const user = useStore.getState().user;
    if (!user) {
      console.error('Cannot start recording: No user logged in');
      return false;
    }

    // 发送开始会话请求
    const userInfo = {
      uid: user.uid,
      displayName: user.displayName || 'Unknown',
      email: user.email || 'unknown@example.com'
    };

    return new Promise((resolve) => {
      if (!this.ws) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        console.error('Session start timeout');
        resolve(false);
      }, 5000);

      const messageHandler = (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data);
          if (response.type === 'session_started') {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', messageHandler);
            
            this.isRecording = true;
            this.recordingStartTime = Date.now();
            this.dataBuffer = [];
            this.currentSessionId = response.session_id;
            console.log('Started recording training data for session:', response.session_id);
            resolve(true);
          }
        } catch (error) {
          console.error('Failed to handle session start response:', error);
          resolve(false);
        }
      };

      this.ws.addEventListener('message', messageHandler);
      this.ws.send(JSON.stringify({
        type: 'start_session',
        user: userInfo
      }));
    });
  }

  public async stopRecording(): Promise<boolean> {
    if (!this.isRecording || !this.currentSessionId || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    // 发送缓冲区中剩余的数据
    this.flushBuffer();

    return new Promise((resolve) => {
      if (!this.ws || !this.currentSessionId) {
        resolve(false);
        return;
      }

      const timeout = setTimeout(() => {
        console.error('Session end timeout');
        resolve(false);
      }, 5000);

      const messageHandler = async (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data);
          if (response.type === 'session_ended') {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', messageHandler);
            
            // 训练会话结束后，自动上传数据到Firebase
            await this.uploadSessionDataToFirebase(response);
            
            this.isRecording = false;
            this.currentSessionId = null;
            console.log('Stopped recording training data');
            resolve(true);
          }
        } catch (error) {
          console.error('Failed to handle session end response:', error);
          resolve(false);
        }
      };

      this.ws.addEventListener('message', messageHandler);
      this.ws.send(JSON.stringify({
        type: 'end_session',
        session_id: this.currentSessionId
      }));
    });
  }

  /**
   * 上传训练会话数据到Firebase
   */
  private async uploadSessionDataToFirebase(sessionResponse: any): Promise<void> {
    try {
      // 导入训练数据服务
      const { trainingDataService } = await import('./trainingDataService');
      
      // 构建训练数据对象
      const sessionData = await this.buildTrainingSessionData(sessionResponse);
      
      if (sessionData) {
        // 上传到Firebase
        const success = await trainingDataService.uploadTrainingDataToFirebase(sessionData);
        
        if (success) {
          console.log(`Training session ${sessionData.session_id} successfully uploaded to Firebase`);
        } else {
          console.warn(`Failed to upload training session ${sessionData.session_id} to Firebase`);
        }
      } else {
        console.error('Failed to build session data for Firebase upload');
      }
    } catch (error) {
      console.error('Error uploading session data to Firebase:', error);
    }
  }

  /**
   * 构建训练会话数据对象
   */
  private async buildTrainingSessionData(sessionResponse: any): Promise<any> {
    try {
      const user = useStore.getState().user;
      if (!user) {
        throw new Error('No user logged in');
      }

      // 获取游戏结束时的最终状态
      const store = useStore.getState();
      
      // 构建训练数据对象
      const sessionData = {
        session_id: sessionResponse.session_id,
        user: {
          uid: user.uid,
          displayName: user.displayName || 'Unknown',
          email: user.email || 'unknown@example.com'
        },
        session_start_time: new Date(Date.now() - (store.sessionDuration || 0)).toISOString(),
        session_end_time: new Date().toISOString(),
        session_duration_ms: store.sessionDuration || 0,
        total_data_points: store.totalDataPoints || 0,
        training_data: [] // 实际数据需要从服务器获取
      };

      return sessionData;
    } catch (error) {
      console.error('Error building training session data:', error);
      return null;
    }
  }

  public recordInput(inputState: InputState): void {
    if (!this.isRecording || !this.currentSessionId || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const store = useStore.getState();
    const trainingData: TrainingData = {
      timestamp: Date.now() - this.recordingStartTime,
      inputState: { ...inputState },
      gameState: {
        score: store.score,
        fails: store.fails,
        isGameOver: store.isGameOver
      }
    };

    this.dataBuffer.push(trainingData);

    // 当缓冲区达到一定大小时发送数据
    if (this.dataBuffer.length >= this.BUFFER_SIZE) {
      this.flushBuffer();
    }
  }

  private flushBuffer(): void {
    if (this.dataBuffer.length === 0 || !this.currentSessionId || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'training_data',
        session_id: this.currentSessionId,
        data: [...this.dataBuffer]
      }));
      this.dataBuffer = [];
    } catch (error) {
      console.error('Failed to send training data:', error);
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public isRecordingActive(): boolean {
    return this.isRecording;
  }

  public getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }
}