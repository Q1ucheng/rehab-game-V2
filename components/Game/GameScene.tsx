/**
 * GameScene.tsx - 康复游戏主场景组件
 * 
 * 功能描述：
 * 1. 游戏主场景容器，集成所有游戏元素
 * 2. 管理游戏状态和生命周期
 * 3. 处理用户输入和平台旋转
 * 4. 实现奖励收集系统和方向碰撞检测
 * 5. 提供游戏结束和退出确认界面
 * 6. 集成3D物理引擎和渲染环境
 * 
 * 技术栈：
 * - React Three Fiber: 3D渲染引擎
 * - React Three Cannon: 物理引擎
 * - React Three Drei: 3D工具库
 * - Three.js: 3D图形库
 * - Zustand: 状态管理
 * 
 * 作者：Qiucheng Zhao
*/


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
import { useFrame } from '@react-three/fiber';
import { Euler, Vector3 } from 'three';

import { ParticleEffect } from './ParticleEffect';

// ==================== 退出确认对话框组件 ====================
/**
 * ExitConfirmationModal - 退出游戏确认对话框
 * 
 * 功能：当用户尝试退出游戏时显示确认对话框，防止误操作
 * 
 * @param {Object} props - 组件属性
 * @param {boolean} props.isOpen - 对话框是否显示
 * @param {Function} props.onConfirm - 确认退出回调
 * @param {Function} props.onCancel - 取消退出回调
 * @param {number} props.currentScore - 当前游戏分数
 */
const ExitConfirmationModal: React.FC<{
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  currentScore: number;
}> = ({ isOpen, onConfirm, onCancel, currentScore }) => {
  // 如果对话框未打开，不渲染任何内容
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

// ==================== 奖励组件 ====================
/**
 * Reward - 游戏中的可收集奖励物体
 * 
 * 功能：
 * 1. 显示可收集的奖励方块
 * 2. 实现方向性碰撞检测（可选）
 * 3. 收集时的动画效果和粒子特效
 * 4. 与平台同步旋转保持相对位置
 * 
 * @param {Object} props - 组件属性
 * @param {[number, number, number]} props.position - 奖励位置坐标
 * @param {Function} props.onCollect - 收集回调函数
 * @param {number} props.platformSize - 平台大小（用于生成范围计算）
 * @param {Object} props.rotation - 平台旋转角度
 * @param {boolean} props.enableDirectionalCollision - 是否启用方向碰撞检测
 */
const Reward: React.FC<{ 
  position: [number, number, number], 
  onCollect: () => void,
  platformSize: number,
  rotation: { pitch: number, roll: number, yaw: number },
  enableDirectionalCollision?: boolean // 添加方向碰撞参数
}> = ({ position, onCollect, platformSize, rotation, enableDirectionalCollision = false }) => {
  // ==================== 物理引擎配置 ====================
  /**
   * 使用物理引擎创建奖励物体的碰撞体
   * 设置为触发器（isTrigger: true），不参与物理碰撞但检测碰撞事件
   */
  const [ref, api] = useBox(() => ({
    isTrigger: true,  // 设置为触发器
    args: [1, 1, 1],  // 奖励物体尺寸
    position,
    name: 'reward',
    onCollide: (e) => {
      if (e.body.name === 'ball') {
        console.log('碰撞检测到球体');
        
        // 使用奖励物体当前的实际位置，而不是固定的position参数
        const ballPosition = new Vector3(e.body.position.x, e.body.position.y, e.body.position.z);
        
        // 获取奖励物体当前的实际位置（考虑旋转后的位置）
        const rewardCurrentPosition = new Vector3();
        if (meshRef.current) {
          rewardCurrentPosition.copy(meshRef.current.position);
        } else {
          // 如果meshRef还未初始化，使用物理引擎的位置
          rewardCurrentPosition.set(position[0], position[1], position[2]);
        }
        
        console.log('球体位置:', ballPosition);
        console.log('奖励当前位置:', rewardCurrentPosition);
        
        // 计算从奖励中心到球体中心的方向
        const direction = ballPosition.clone().sub(rewardCurrentPosition).normalize();
        
        // 碰撞点近似为奖励表面（距离奖励中心0.5个单位）
        const collisionPoint = rewardCurrentPosition.clone().add(direction.multiplyScalar(0.5));
        
        // 检查碰撞方向是否有效
        if (isValidCollisionDirection(collisionPoint, rewardCurrentPosition)) {
          console.log('有效碰撞方向，触发收集');
          handleCollect();
        } else {
          console.log('无效碰撞方向，不触发收集');
        }
      }
    }
  }));

  // ==================== 状态和引用管理 ====================
  const meshRef = useRef<any>(null);
  const arrowRef = useRef<any>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [scale, setScale] = useState(1);
  
  // 特定方向碰撞相关状态
  const [targetFace, setTargetFace] = useState<number>(2); // 2: 左, 3: 右 (确保z为0)
  const [arrowDirection, setArrowDirection] = useState<Vector3>(new Vector3(-1, 0, 0)); // 左方向，z为0
  
  // ==================== 方向碰撞检测初始化 ====================
  /**
   * 初始化方向碰撞检测的目标面
   * 只在启用方向碰撞检测时执行
   */
  useEffect(() => {
    if (enableDirectionalCollision) {
      // 只选择左右方向：2或3，确保z为0
      const randomFace = Math.random() > 0.5 ? 2 : 3; // 2: 左, 3: 右
      setTargetFace(randomFace);
      
      // 设置箭头方向（目标面法线方向）- 确保z为0
      let direction: Vector3;
      switch (randomFace) {
        case 2: // 左 (X-方向)
          direction = new Vector3(-1, 0, 0);
          break;
        case 3: // 右 (X+方向)
          direction = new Vector3(1, 0, 0);
          break;
        default:
          direction = new Vector3(1, 0, 0); // 默认右方向
      }
      setArrowDirection(direction);
      console.log(`目标面设置为: ${randomFace} (2:左, 3:右), 箭头方向:`, direction);
      console.log('目标面法线向量z值:', direction.z); // 应该为0
    }
  }, [enableDirectionalCollision]);
  
  // ==================== 实时同步更新 ====================
  /**
   * 每帧更新奖励物体的位置和旋转
   * 确保奖励物体与平台保持同步旋转
   */
  useFrame(() => {
    if (meshRef.current && api) {
      // 应用与平板相同的旋转
      const euler = new Euler(rotation.pitch, rotation.yaw, rotation.roll, 'XYZ');
      meshRef.current.rotation.set(euler.x, euler.y, euler.z);
      
      // 更新箭头位置和方向 - 箭头需要跟随奖励物体一起旋转
      if (arrowRef.current && enableDirectionalCollision) {
        // 计算奖励物体旋转后的位置
        const rotatedPosition = new Vector3(position[0], position[1], position[2]);
        rotatedPosition.applyEuler(euler);
        
        // 箭头位置：在目标面方向偏移0.75个单位（相对于旋转后的奖励物体）
        const worldTargetNormal = arrowDirection.clone().applyEuler(euler).normalize();
        const arrowOffset = worldTargetNormal.clone().multiplyScalar(0.75);
        const arrowPosition = rotatedPosition.clone().add(arrowOffset);
        arrowRef.current.position.set(arrowPosition.x, arrowPosition.y, arrowPosition.z);
        
        // 箭头方向：指向目标面（应用平台旋转）
        arrowRef.current.lookAt(arrowRef.current.position.clone().add(worldTargetNormal));
      }
      
      // 计算旋转后的位置，使奖励与平板保持相对静止
      const rotatedPosition = new Vector3(position[0], position[1], position[2]);
      rotatedPosition.applyEuler(euler);
      
      // 更新mesh的位置
      meshRef.current.position.set(rotatedPosition.x, rotatedPosition.y, rotatedPosition.z);
      
      // 同时更新物理引擎的位置
      api.position.set(rotatedPosition.x, rotatedPosition.y, rotatedPosition.z);
      
      // 更新物理引擎的旋转
      api.rotation.set(euler.x, euler.y, euler.z);
    }
  });
  
  // ==================== 碰撞方向验证函数 ====================
  /**
   * 验证碰撞方向是否有效
   * 计算碰撞点与目标面的角度，判断是否在有效范围内
   * 
   * @param {Vector3} collisionPoint - 碰撞点坐标
   * @param {Vector3} rewardCurrentPosition - 奖励物体当前位置
   * @returns {boolean} 碰撞方向是否有效
   */
  const isValidCollisionDirection = (collisionPoint: Vector3, rewardCurrentPosition: Vector3): boolean => {
    if (!enableDirectionalCollision) {
      console.log('方向碰撞已关闭，所有方向有效');
      return true; // 关闭方向碰撞时，所有方向都有效
    }
    
    // 计算从奖励中心到碰撞点的方向向量
    const collisionDirection = collisionPoint.clone().sub(rewardCurrentPosition).normalize();
    
    // 应用奖励的旋转到目标面法线方向
    const euler = new Euler(rotation.pitch, rotation.yaw, rotation.roll, 'XYZ');
    const worldTargetNormal = arrowDirection.clone().applyEuler(euler).normalize();
    
    // 计算两个方向向量的夹角（余弦值）
    const dotProduct = collisionDirection.dot(worldTargetNormal);
    const angle = Math.acos(Math.min(Math.max(dotProduct, -1), 1)) * (180 / Math.PI);
    
    console.log(`碰撞角度: ${angle.toFixed(1)}度, 目标面: ${targetFace}, 点积: ${dotProduct.toFixed(3)}`);
    console.log('碰撞方向向量:', collisionDirection);
    console.log('目标面法线向量:', worldTargetNormal);
    console.log('目标面法线向量z值:', worldTargetNormal.z); // 检查z值
    
    // 正负45度范围内都算有效碰撞
    const isValid = angle <= 45;
    console.log(`碰撞方向${isValid ? '有效' : '无效'}`);
    return isValid;
  };
  
  // 删除重复的useEffect初始化目标面，只保留一个
  useEffect(() => {
    if (enableDirectionalCollision) {
      const randomFace = Math.floor(Math.random() * 4); // 0-3: 前后左右
      setTargetFace(randomFace);
      
      // 设置箭头方向（目标面法线方向）
      let direction: Vector3;
      switch (randomFace) {
        case 0: // 前 (Z+方向)
          direction = new Vector3(0, 0, 1);
          break;
        case 1: // 后 (Z-方向)
          direction = new Vector3(0, 0, -1);
          break;
        case 2: // 左 (X-方向)
          direction = new Vector3(-1, 0, 0);
          break;
        case 3: // 右 (X+方向)
          direction = new Vector3(1, 0, 0);
          break;
        default:
          direction = new Vector3(0, 0, 1);
      }
      setArrowDirection(direction);
      console.log(`目标面设置为: ${randomFace} (0:前, 1:后, 2:左, 3:右), 箭头方向:`, direction);
    }
  }, [enableDirectionalCollision]);
  
  // ==================== 收集动画效果 ====================
  /**
   * 收集时的缩放动画效果
   * 当isCollecting为true时触发缩放动画
   */
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

  // ==================== 收集处理函数 ====================
  /**
   * 处理奖励收集逻辑
   * 触发收集状态和调用父组件回调
   */
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
          color={isCollecting ? "#ff6b6b" : "#10b981"}
          emissive={isCollecting ? "#ff6b6b" : "#10b981"}
          emissiveIntensity={isCollecting ? 2 : 0.5}
        />
        <Text position={[0, 0.6, 0]} fontSize={0.3} color="white">
          +10
        </Text>
      </mesh>
      
      {/* 方向指示箭头 */}
      {enableDirectionalCollision && (
        <mesh ref={arrowRef} position={position}>
          <coneGeometry args={[0.1, 0.3, 8]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1} />
        </mesh>
      )}
      
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

// ==================== 游戏主场景组件 ====================
/**
 * GameScene - 游戏主场景容器组件
 * 
 * 功能：
 * 1. 集成所有游戏元素和UI组件
 * 2. 管理游戏状态和生命周期
 * 3. 处理用户输入和设备方向
 * 4. 控制数据记录和游戏流程
 */
const GameScene: React.FC = () => {
  // 从全局状态管理器获取游戏状态和操作方法
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
  
  // 本地状态和引用 
  const inputController = InputController.getInstance();  // 输入控制器实例
  const [rewardPos, setRewardPos] = useState<[number, number, number]>([2, 0.5, 2]);  // 奖励位置
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);  // 退出确认弹窗状态
  const [platformRotation, setPlatformRotation] = useState({ pitch: 0, roll: 0, yaw: 0 });  // 平台旋转角度
  const animationRef = useRef<number | undefined>(undefined);  // 动画帧引用

  // 将输入控制器挂载到window对象，便于调试和外部访问
  useEffect(() => {
    (window as any).inputController = inputController;
    return () => {
      delete (window as any).inputController;
    };
  }, [inputController]);

  // 使用requestAnimationFrame监听平台旋转变化
  useEffect(() => {
    const updateRotation = () => {
      const orientation = inputController.getOrientation();
      setPlatformRotation(orientation);
      animationRef.current = requestAnimationFrame(updateRotation);
    };

    animationRef.current = requestAnimationFrame(updateRotation);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // ==================== 数据记录管理 ====================
  /**
   * 游戏状态变化时控制数据记录的开始和停止
   * 游戏开始时开始记录，游戏结束时停止记录
   */
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

  // ==================== 游戏生命周期管理 ====================
  /**
   * 组件挂载时自动开始游戏
   * 组件卸载时自动结束游戏
   */
  useEffect(() => {
    startGame();
    return () => {
      endGame();
    }
  }, [startGame, endGame]);

  // ==================== 奖励收集处理 ====================
  /**
   * 处理奖励收集事件
   * 增加分数并生成新的奖励位置
   */
  const handleCollect = () => {
    console.log('奖励被收集！刷新新位置...');
    incrementScore(10);
    
    // 根据平台大小调整奖励生成范围，安全区域为平台大小的40%
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
    setCurrentScreen(AppScreen.DASHBOARD);  // 返回主菜单
  };

  const handleExitCancel = () => {
    setShowExitConfirmation(false);
  };

  const handleExitClick = () => {
    setShowExitConfirmation(true);
  };

  // ==================== 主渲染函数 ====================
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
                rotation={platformRotation}
                enableDirectionalCollision={gameDifficulty.enableDirectionalCollision} // 传递参数
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