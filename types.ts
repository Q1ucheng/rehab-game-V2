/**
 * 康复游戏系统 - 类型定义文件
 * 
 * 功能描述：定义康复游戏系统的核心数据类型和接口
 * 技术栈：TypeScript
 * 主要功能模块：用户配置、游戏状态、输入状态、应用界面、游戏难度、训练数据
 * 核心特性：类型安全、接口扩展、全局类型声明
 * 作者：Qiucheng Zhao
 * 
 * 文件说明：
 * - 定义用户配置接口，包含用户认证信息和游戏统计数据
 * - 定义游戏状态接口，管理游戏运行时的各种状态变量
 * - 定义输入状态接口，处理手柄摇杆的三轴角度数据
 * - 定义手腕旋转状态接口，支持双手腕部旋转控制
 * - 定义应用界面枚举，管理应用的不同屏幕状态
 * - 定义三维向量接口，用于3D空间坐标表示
 * - 定义游戏难度配置接口，支持不同难度级别的参数调整
 * - 扩展React Three Fiber的JSX元素类型声明
 * - 定义训练数据接口，用于数据采集和存储
 */

/**
 * 用户配置接口
 * 包含用户的基本信息和游戏统计数据
 */
export interface UserProfile {
  uid: string;                    // 用户唯一标识符
  email: string | null;           // 用户邮箱地址
  displayName: string | null;     // 用户显示名称
  description: string;            // 用户描述信息
  highScore: number;             // 用户最高得分记录
}

/**
 * 游戏状态接口
 * 管理游戏运行时的各种状态变量和统计数据
 */
export interface GameState {
  isPlaying: boolean;             // 游戏是否正在进行中
  score: number;                  // 当前得分
  fails: number;                  // 失败次数
  maxFails: number;               // 最大允许失败次数
  isGameOver: boolean;            // 游戏是否结束
  sessionDuration: number;        // 游戏会话持续时间（秒）
  totalDataPoints: number;        // 总数据点数量
}

/**
 * 输入状态接口
 * 处理手柄摇杆的三轴角度数据
 * 用于控制游戏中的物体运动
 */
export interface InputState {
  pitch: number;                  // 俯仰角（前后倾斜）
  roll: number;                   // 滚转角（左右倾斜）
  yaw: number;                    // 偏航角（左右旋转）
}

/**
 * 手腕旋转状态接口
 * 支持双手腕部旋转控制，用于精细的运动控制
 */
export interface WristRotationState {
  leftWrist: number;              // 左手腕旋转值（LT触发器，范围0-1）
  rightWrist: number;             // 右手腕旋转值（RT触发器，范围0-1）
  speedMultiplier: number;        // 当前速度乘数（0.5倍到2.0倍）
}

/**
 * 应用界面枚举
 * 定义应用的不同屏幕状态，用于界面路由管理
 */
export enum AppScreen {
  AUTH = 'AUTH',                  // 认证界面
  DASHBOARD = 'DASHBOARD',        // 仪表盘界面
  GAME = 'GAME'                   // 游戏界面
}

/**
 * 三维向量接口
 * 用于表示3D空间中的坐标和方向
 */
export interface Vec3 {
  x: number;                      // X轴坐标
  y: number;                      // Y轴坐标
  z: number;                      // Z轴坐标
}

/**
 * 游戏难度配置接口
 * 支持不同难度级别的参数调整，影响游戏体验
 */
export interface GameDifficulty {
  platformSize: number;           // 平板尺寸（10, 15, 20, 8）
  ballRadius: number;             // 小球半径（0.5, 0.8, 1.0, 0.3）
  enableDirectionalCollision?: boolean; // 是否开启特定方向碰撞检测
}

/**
 * 扩展JSX.IntrinsicElements以支持React Three Fiber
 * 为Three.js组件提供TypeScript类型支持
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;                  // 网格对象
      sphereGeometry: any;        // 球体几何体
      meshStandardMaterial: any;  // 标准材质
      boxGeometry: any;           // 盒子几何体
      gridHelper: any;            // 网格辅助线
      ambientLight: any;          // 环境光
      spotLight: any;             // 聚光灯
      pointLight: any;            // 点光源
      color: any;                 // 颜色对象
    }
  }
}

/**
 * 训练数据接口
 * 用于数据采集和存储，包含时间戳、输入状态和游戏状态
 */
export interface TrainingData {
  timestamp: number;              // 时间戳（毫秒）
  localtime: string;              // 本地时间字符串
  inputState: InputState;         // 输入状态数据
  gameState: {                    // 游戏状态数据
    score: number;                // 当前得分
    fails: number;                // 失败次数
    isGameOver: boolean;          // 游戏是否结束
  };
}