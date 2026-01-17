import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics, useBox } from '@react-three/cannon';
import { OrbitControls, Environment, Text } from '@react-three/drei';
import { Platform } from './Platform';
import { Ball } from './Ball';
import HUD from '../UI/HUD';
import { InputController } from '../../services/inputController';
import { useStore } from '../../store/useStore';
import { AppScreen } from '../../types';

import { ParticleEffect } from './ParticleEffect';

// 退出确认对话框组件
const ExitConfirmationModal: React.FC<{
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  currentScore: number;
}> = ({ isOpen, onConfirm, onCancel, currentScore }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center max-w-md w-full mx-4">
        <div className="mb-6">
          <i className="fa-solid fa-triangle-exclamation text-4xl text-yellow-500 mb-4"></i>
          <h2 className="text-2xl font-bold text-white mb-2">Confirm Exit?</h2>
          <p className="text-slate-300 mb-2">
            Current game progress will not be saved!
          </p>
          <p className="text-slate-400 text-sm">
            Current Score: <span className="text-emerald-400 font-bold">{currentScore}</span> points
          </p>
        </div>
        
        <div className="flex gap-4 justify-center">
          <button 
            onClick={onCancel}
            className="px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold transition flex-1"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-semibold transition flex-1"
          >
            Confirm Exit
          </button>
        </div>
      </div>
    </div>
  );
};

// 修改Reward组件以使用动态平台大小
// 修改Reward组件以包含特效
const Reward: React.FC<{ 
  position: [number, number, number], 
  onCollect: () => void,
  platformSize: number 
}> = ({ position, onCollect, platformSize }) => {
  const [ref, api] = useBox(() => ({
    isTrigger: true,
    args: [1, 1, 1],
    position,
    name: 'reward',
    onCollide: (e) => {
      if (e.body.name === 'ball') {
        console.log('碰撞检测到球体，触发收集');
        handleCollect(); // 直接调用handleCollect
      }
    }
  }));

  const meshRef = useRef<any>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [scale, setScale] = useState(1);

  // 添加useEffect来监听position变化并更新物理引擎
  useEffect(() => {
    if (api) {
      api.position.set(position[0], position[1], position[2]);
    }
  }, [position, api]);

  // 收集时的动画效果
  useEffect(() => {
    if (isCollecting) {
      console.log('开始收集动画');
      // 缩放动画
      const scaleAnimation = () => {
        setScale(prev => {
          if (prev > 0.1) {
            return prev * 0.8;
          }
          return 0;
        });
      };

      const interval = setInterval(scaleAnimation, 50);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        setIsCollecting(false);
        setScale(1);
      }, 300);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [isCollecting]);

  // 收集处理函数
  const handleCollect = () => {
    console.log('触发收集效果');
    setIsCollecting(true);
    onCollect(); // 调用父组件的收集处理
  };

  return (
    <>
      <mesh 
        ref={(node) => {
          ref.current = node;
          meshRef.current = node;
        }} 
        position={position} 
        name="reward"
        scale={scale}
      >
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial 
          color="#10b981" 
          emissive="#10b981" 
          emissiveIntensity={isCollecting ? 2 : 0.5}
        />
        <Text position={[0, 0.6, 0]} fontSize={0.3} color="white">
          +10
        </Text>
      </mesh>
      
      {/* 收集时的粒子效果 */}
      {isCollecting && (
        <ParticleEffect 
          position={position}
          color="#10b981"
          duration={500}
          onComplete={() => {
            console.log('粒子效果完成');
            setIsCollecting(false);
          }}
        />
      )}
    </>
  );
};

const GameScene: React.FC = () => {
  const { 
    isPlaying, 
    isGameOver, 
    startGame, 
    endGame, 
    resetGame, 
    user, 
    incrementScore, 
    setCurrentScreen,
    gameDifficulty,
    score
  } = useStore();
  
  const inputController = InputController.getInstance();
  const [rewardPos, setRewardPos] = useState<[number, number, number]>([2, 0.5, 2]);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);

  useEffect(() => {
    // 游戏开始时开始记录数据
    if (isPlaying) {
      inputController.startDataRecording().then(success => {
        if (success) {
          console.log('Started recording training data for user:', user?.displayName);
        } else {
          console.error('Failed to start recording training data');
        }
      }).catch(error => {
        console.error('Error starting recording:', error);
      });
    }
    
    // 游戏结束时停止记录数据
    if (isGameOver) {
      inputController.stopDataRecording().then(success => {
        if (success) {
          console.log('Stopped recording training data');
        } else {
          console.error('Failed to stop recording training data');
        }
      }).catch(error => {
        console.error('Error stopping recording:', error);
      });
    }

    return () => {
      // 组件卸载时停止记录
      inputController.stopDataRecording().then(success => {
        if (success) {
          console.log('Recording stopped on component unmount');
        }
      }).catch(error => {
        console.error('Error stopping recording on unmount:', error);
      });
    };
  }, [isPlaying, isGameOver, user]);

  // Start game on mount
  useEffect(() => {
    startGame();
    return () => {
      endGame();
    }
  }, [startGame, endGame]);

  // Spawn new reward with platform size consideration
  const handleCollect = () => {
    console.log('奖励被收集！刷新新位置...');
    incrementScore(10);
    
    // 根据平台大小调整奖励生成范围
    const safeRange = gameDifficulty.platformSize * 0.4;
    const x = (Math.random() - 0.5) * safeRange;
    const z = (Math.random() - 0.5) * safeRange;
    const newPos: [number, number, number] = [x, 0.5, z];
    console.log('新奖励位置:', newPos);
    setRewardPos(newPos);
  };

  // 处理退出确认
  const handleExitConfirm = () => {
    endGame();
    setShowExitConfirmation(false);
    setCurrentScreen(AppScreen.DASHBOARD);
  };

  const handleExitCancel = () => {
    setShowExitConfirmation(false);
  };

  const handleExitClick = () => {
    setShowExitConfirmation(true);
  };

  return (
    <div className="w-full h-full relative">
      <HUD 
        onExitClick={handleExitClick}
        isPlaying={isPlaying}
        isGameOver={isGameOver}
      />
      
      {/* 移除独立的退出按钮 */}
      
      {/* 退出确认对话框 */}
      <ExitConfirmationModal
        isOpen={showExitConfirmation}
        onConfirm={handleExitConfirm}
        onCancel={handleExitCancel}
        currentScore={score}
      />
      
      {isGameOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center max-w-md w-full">
            <h2 className="text-3xl font-bold text-red-500 mb-4">Training Finished</h2>
            <p className="text-slate-300 mb-6">You have reached the failure limit. Great effort!</p>
            <div className="flex gap-4 justify-center">
              <button 
                onClick={resetGame}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold transition"
              >
                Try Again
              </button>
              <button 
                onClick={() => setCurrentScreen(AppScreen.DASHBOARD)}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold transition"
              >
                Exit to Menu
              </button>
            </div>
          </div>
        </div>
      )}

      <Canvas shadows camera={{ position: [0, 8, 12], fov: 50 }}>
        <color attach="background" args={['#0f172a']} />
        
        <ambientLight intensity={0.5} />
        <spotLight 
          position={[10, 15, 10]} 
          angle={0.3} 
          penumbra={1} 
          intensity={1} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        <Physics gravity={[0, -9.81, 0]}>
          <Platform platformSize={gameDifficulty.platformSize} />
          {isPlaying && !isGameOver && (
            <>
              <Ball ballRadius={gameDifficulty.ballRadius} />
              <Reward 
                position={rewardPos} 
                onCollect={handleCollect}
                platformSize={gameDifficulty.platformSize}
              />
            </>
          )}
        </Physics>
        
        <Environment preset="city" />
        <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2.5} />
      </Canvas>
    </div>
  );
};

export default GameScene;