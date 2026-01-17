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