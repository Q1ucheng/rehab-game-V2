export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  description: string;
  highScore: number;
}

export interface GameState {
  isPlaying: boolean;
  score: number;
  fails: number;
  maxFails: number;
  isGameOver: boolean;
  sessionDuration: number;
  totalDataPoints: number;
}

export interface InputState {
  pitch: number;
  roll: number;
  yaw: number;
}

// ADDED: Wrist rotation state interface
export interface WristRotationState {
  leftWrist: number;      // LT trigger value (0-1)
  rightWrist: number;     // RT trigger value (0-1)
  speedMultiplier: number; // Current speed multiplier (0.5x to 2.0x)
}

export enum AppScreen {
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  GAME = 'GAME'
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface GameDifficulty {
  platformSize: number; // 平板尺寸 (10, 15, 20, 8)
  ballRadius: number;   // 小球半径 (0.5, 0.8, 1.0, 0.3)
  enableDirectionalCollision?: boolean; // 开启特定方向碰撞
}

// Extend JSX.IntrinsicElements for React Three Fiber
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
      boxGeometry: any;
      gridHelper: any;
      ambientLight: any;
      spotLight: any;
      pointLight: any;
      color: any;
    }
  }
}