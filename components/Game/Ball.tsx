/**
 * Ball.tsx - 康复游戏中的球体组件
 * 
 * 功能描述：
 * 1. 创建并管理游戏中的物理球体
 * 2. 处理球体的物理特性（质量、摩擦、弹性等）
 * 3. 实现球体的位置追踪和速度监控
 * 4. 处理游戏逻辑（重置、掉落检测等）
 * 5. 渲染球体的3D模型
 * 
 * 技术栈：
 * - React Three Fiber: 3D渲染
 * - React Three Cannon: 物理引擎
 * - Three.js: 3D图形库
 * 
 * 作者：Qiucheng Zhao
 */


import React, { useEffect, useRef } from 'react';
import { useSphere } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store/useStore';
import { Vector3 } from 'three';
import { InputController } from '../../services/inputController';


// ==================== 接口定义 ====================
/**
 * Ball组件的属性接口
 * 球体的半径
 */
interface BallProps {
  ballRadius: number;
}


// ==================== 球体组件主函数 ====================
/**
 * Ball组件 - 游戏中的主要交互对象
 * @param {BallProps} props - 组件属性
 * @returns {JSX.Element} 球体的3D模型
 */
export const Ball: React.FC<BallProps> = ({ ballRadius }) => {
  const { recordFail, isPlaying, isGameOver } = useStore();  // 从全局状态管理器中获取游戏状态和操作方法
  const position = useRef(new Vector3(0, 0, 0));             // 球体的当前位置引用
  const velocity = useRef(new Vector3(0, 0, 0));             // 球体的当前速度引用
  const inputController = InputController.getInstance();     // 输入控制器实例，处理用户输入

  const RESET_POSITION: [number, number, number] = [0, 5, 0];    // 球体重置位置常量，初始位置在(0, 5, 0)

  // 物理引擎配置
  const [ref, api] = useSphere(() => ({
    mass: 1, 
    position: RESET_POSITION,
    args: [ballRadius], // 使用动态半径
    material: {
      friction: 0.8,   // 球体的摩擦系数
      restitution: 0.0 // 球体的弹性系数
    },
    linearDamping: 0.1,  // 球体的线性阻尼系数，用于模拟空气阻力
    angularDamping: 0.1, // 球体的角速度阻尼系数，用于模拟旋转阻力
  }));

  // 位置和速度订阅
  useEffect(() => {
    const unsubscribePosition = api.position.subscribe((v) => {  // 订阅位置变化，更新当前位置
      position.current.set(v[0], v[1], v[2]);
    });
    
    const unsubscribeVelocity = api.velocity.subscribe((v) => {  // 订阅速度变化，更新当前速度
      velocity.current.set(v[0], v[1], v[2]);
    });
    
    return () => {
      unsubscribePosition();
      unsubscribeVelocity();
    };
  }, [api.position, api.velocity]);

  // 游戏状态重置逻辑，当游戏开始或重新开始时重置球体，将球体放回初始位置并清除所有速度和旋转
  useEffect(() => {
    if (isPlaying && !isGameOver) {
      api.position.set(...RESET_POSITION);  // 将球体位置设置为初始位置
      api.velocity.set(0, 0, 0);            // 清除速度
      api.angularVelocity.set(0, 0, 0);     // 清除旋转速度
    }
  }, [isPlaying, isGameOver, api]);

  //  游戏循环逻辑，处理球体的掉落检测和重置
  useFrame(() => {
    if (!isPlaying) return;

    // 掉落检测，当球体Y坐标低于-5时，判定为掉落
    if (position.current.y < -5) {
      recordFail();  // 记录失败
      
      // 立即重置球体位置和状态
      api.position.set(...RESET_POSITION);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    }
  });

  // ==================== 3D模型渲染 ====================
  /**
   * 渲染球体的3D模型
   * 几何体、材质和物理属性
   */
  return (
    <mesh ref={ref as any} castShadow receiveShadow name="ball"> 
      <sphereGeometry args={[ballRadius, 32, 32]} />
      <meshStandardMaterial color="#f43f5e" metalness={0.4} roughness={0.7} />
    </mesh>
  );
};