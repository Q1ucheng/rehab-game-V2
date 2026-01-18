import { InputState } from '../types';
import { useStore } from '../store/useStore';

export interface TrainingData {
  timestamp: number;
  localtime: string;
  inputState: InputState;
  gameState: {
    score: number;
    fails: number;
    isGameOver: boolean;
  };
  hasValidInput: boolean;
  actualInterval?: number;  // 新增：实际采样间隔（用于调试）
}

export class DataRecorder {
  private static instance: DataRecorder;
  private ws: WebSocket | null = null;
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;
  private sessionStartTime: Date | null = null;
  private dataBuffer: TrainingData[] = [];
  private readonly BUFFER_SIZE = 100;
  private readonly WS_RECONNECT_DELAY = 3000;
  private currentSessionId: string | null = null;
  
  // 采样频率 - 修正为100Hz (10ms)
  private samplingInterval: ReturnType<typeof setInterval> | null = null;
  private readonly SAMPLING_RATE = 10;  // 修正：100Hz对应的毫秒数
  private hasInputStarted: boolean = false;
  private lastSampleTime: number = 0;  // 新增：记录上次采样时间

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
            this.sessionStartTime = new Date();  // 记录会话开始时间
            this.dataBuffer = [];
            this.hasInputStarted = false;  // 重置输入开始标记
            this.currentSessionId = response.session_id;
            
            // 启动固定频率采样
            this.startFixedRateSampling();
            
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

  /**
   * 启动固定频率采样
   */
  private startFixedRateSampling(): void {
    if (this.samplingInterval !== null) {
      clearInterval(this.samplingInterval);
    }
    
    this.lastSampleTime = Date.now();  // 初始化上次采样时间
    
    this.samplingInterval = setInterval(() => {
      this.sampleData();
    }, this.SAMPLING_RATE);
    
    console.log(`Started fixed rate sampling at ${1000 / this.SAMPLING_RATE}Hz`);
  }

  /**
   * 采样数据
   */
  private sampleData(): void {
    if (!this.isRecording || !this.currentSessionId) {
      return;
    }

    // 获取当前时间
    const currentTime = Date.now();
    
    // 计算实际时间间隔，用于补偿定时器误差
    const actualInterval = currentTime - this.lastSampleTime;
    this.lastSampleTime = currentTime;

    // 获取当前输入状态
    const inputController = (window as any).inputController || null;
    if (!inputController) {
      return;
    }

    const currentState = inputController.getOrientation();
    
    // 检查是否有有效输入（非零值）
    const hasValidInput = currentState.pitch !== 0 || currentState.roll !== 0 || currentState.yaw !== 0;
    
    // 标记输入已开始（但不影响采样频率）
    if (!this.hasInputStarted && hasValidInput) {
      this.hasInputStarted = true;
      console.log('Input detected, starting data recording');
    }

    // 无论是否有输入，都记录数据以保持固定采样频率
    const store = useStore.getState();
    const relativeTime = currentTime - this.recordingStartTime;
    
    // 计算本地时间戳（北京时间 UTC+8）
    let localtime = '';
    if (this.sessionStartTime) {
      const currentLocalTime = new Date(this.sessionStartTime.getTime() + relativeTime);
      localtime = this.formatBeijingTime(currentLocalTime);
    }

    const trainingData: TrainingData = {
      timestamp: relativeTime,
      localtime: localtime,
      inputState: { ...currentState },
      gameState: {
        score: store.score,
        fails: store.fails,
        isGameOver: store.isGameOver
      },
      hasValidInput: hasValidInput,
      actualInterval: actualInterval  // 新增：记录实际时间间隔用于调试
    };

    this.dataBuffer.push(trainingData);

    // 当缓冲区达到一定大小时发送数据
    if (this.dataBuffer.length >= this.BUFFER_SIZE) {
      this.flushBuffer();
    }
  }

  /**
   * 格式化时间为北京时间（UTC+8）
   */
  private formatBeijingTime(date: Date): string {
    // 获取本地时间（假设系统时区为北京时间）
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}+08:00`;
  }

  public async stopRecording(): Promise<boolean> {
    if (!this.isRecording || !this.currentSessionId || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    
    // 停止采样
    if (this.samplingInterval !== null) {
      clearInterval(this.samplingInterval);
      this.samplingInterval = null;
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
            this.sessionStartTime = null;
            this.hasInputStarted = false;
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

  // 移除原有的recordInput方法，因为现在使用固定频率采样
  // public recordInput(inputState: InputState): void {
  //   // 这个方法不再使用，由固定频率采样替代
  // }

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
      
      // 构建训练数据对象（使用北京时间）
      const sessionData = {
        session_id: sessionResponse.session_id,
        user: {
          uid: user.uid,
          displayName: user.displayName || 'Unknown',
          email: user.email || 'unknown@example.com'
        },
        session_start_time: this.formatBeijingTime(new Date(Date.now() - (store.sessionDuration || 0))),
        session_end_time: this.formatBeijingTime(new Date()),
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