/**
 * 康复游戏系统 - 全局状态管理模块
 * 
 * 功能描述：使用Zustand状态管理库实现康复游戏系统的全局状态管理
 * 技术栈：TypeScript + Zustand状态管理库
 * 主要功能模块：状态接口定义、状态初始化、状态操作方法
 * 核心特性：用户认证状态、游戏状态、界面导航、游戏难度设置、数据统计
 * 
 * 
 * 状态管理说明：
 * - StoreState接口：扩展GameState接口，包含用户信息、当前界面、游戏难度等全局状态
 * - useStore钩子：创建全局状态管理器，包含状态初始值和操作方法
 * - 状态操作：用户设置、界面切换、游戏控制、分数管理、难度设置等
 * - 数据统计：会话持续时间、数据点数量等训练数据统计
 * 
 * 作者：Qiucheng Zhao
 */


import { create } from 'zustand';
import { UserProfile, GameState, GameDifficulty } from '../types';

interface StoreState extends GameState {
  user: UserProfile | null;
  currentScreen: string;
  gameDifficulty: GameDifficulty;
  setUser: (user: UserProfile | null) => void;
  setCurrentScreen: (screen: string) => void;
  startGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  incrementScore: (points: number) => void;
  recordFail: () => void;
  setGameDifficulty: (difficulty: GameDifficulty) => void;
  updateSessionDuration: (duration: number) => void;
  updateTotalDataPoints: (count: number) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  user: null,
  currentScreen: 'AUTH',
  isPlaying: false,
  score: 0,
  fails: 0,
  maxFails: 5,
  isGameOver: false,
  sessionDuration: 0,
  totalDataPoints: 0,
  gameDifficulty: { platformSize: 10, ballRadius: 0.5 }, // 默认难度

  setUser: (user) => set({ user }),
  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  
  startGame: () => set({ 
    isPlaying: true, 
    isGameOver: false, 
    score: 0, 
    fails: 0,
    sessionDuration: 0,
    totalDataPoints: 0
  }),
  
  endGame: () => set({ isPlaying: false }),
  
  resetGame: () => set({
    isPlaying: false,
    isGameOver: false,
    score: 0,
    fails: 0,
    sessionDuration: 0,
    totalDataPoints: 0
  }),
  
  incrementScore: (points) => set(state => ({ score: state.score + points })),
  
  recordFail: () => set(state => {
    const newFails = state.fails + 1;
    const isGameOver = newFails >= state.maxFails;
    return { 
      fails: newFails,
      isGameOver
    };
  }),

  setGameDifficulty: (difficulty) => set({ gameDifficulty: difficulty }),
  
  // 更新会话持续时间
  updateSessionDuration: (duration: number) => set({ sessionDuration: duration }),
  
  // 更新数据点数量
  updateTotalDataPoints: (count: number) => set({ totalDataPoints: count })
}));