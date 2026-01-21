/**
 * ParticleEffect.tsx - 粒子效果组件
 * 
 * 功能描述：
 * 1. 创建和管理3D粒子系统
 * 2. 实现粒子的动态运动和消失效果
 * 3. 支持自定义颜色、持续时间和位置
 * 4. 提供粒子效果完成回调
 * 5. 优化性能的粒子更新机制
 * 
 * 技术栈：
 * - React Three Fiber: 3D渲染引擎
 * - React Three Drei: 3D工具库（Points, PointMaterial）
 * - Three.js: 3D图形库（BufferGeometry, Float32BufferAttribute）
 * 
 * 作者：Qiucheng Zhao
 */


import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { BufferGeometry, Points as ThreePoints, Float32BufferAttribute } from 'three';

// ==================== 接口定义 ====================
/**
 * ParticleEffect组件的属性接口
 * 
 * @property {[number, number, number]} position - 粒子效果的3D位置坐标
 * @property {string} [color] - 粒子颜色（默认：#10b981）
 * @property {number} [duration] - 粒子效果持续时间（毫秒，默认：1000）
 * @property {Function} [onComplete] - 粒子效果完成时的回调函数
 */
interface ParticleEffectProps {
  position: [number, number, number];
  color?: string;
  duration?: number;
  onComplete?: () => void;
}

// ==================== 粒子效果组件主函数 ====================
/**
 * ParticleEffect - 可重用的粒子效果组件
 * 
 * 功能：
 * 1. 创建指定数量的粒子并初始化位置和速度
 * 2. 每帧更新粒子位置实现动画效果
 * 3. 处理粒子效果的持续时间和完成回调
 * 4. 优化性能的几何体更新机制
 * 
 * @param {ParticleEffectProps} props - 组件属性
 * @returns {JSX.Element} 粒子系统的3D渲染
 */
export const ParticleEffect: React.FC<ParticleEffectProps> = ({
  position,
  color = '#10b981',
  duration = 1000,
  onComplete
}) => {
  const pointsRef = useRef<ThreePoints>(null);
  const [particles, setParticles] = useState<{ positions: Float32Array; velocities: Float32Array } | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!pointsRef.current) return;

    // 创建粒子系统
    const particleCount = 50;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // 随机位置
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 2;
      positions[i3 + 1] = (Math.random() - 0.5) * 2;
      positions[i3 + 2] = (Math.random() - 0.5) * 2;

      // 随机速度
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = Math.random() * 0.03 + 0.01; // 向上飞
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    setParticles({ positions, velocities });

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    
    if (pointsRef.current) {
      pointsRef.current.geometry = geometry;
    }
  }, []);

  // ==================== 粒子动画更新 ====================
  /**
   * 使用useFrame钩子每帧更新粒子位置
   * 实现粒子动画效果和持续时间控制
   */
  useFrame(() => {
    if (!pointsRef.current || !particles) return;

    const elapsed = Date.now() - startTimeRef.current;
    const progress = elapsed / duration;

    if (progress >= 1) {
      onComplete?.();
      return;
    }

    const { positions, velocities } = particles;
    const geometry = pointsRef.current.geometry as BufferGeometry;

    // 创建新的位置数组来更新
    const newPositions = new Float32Array(positions.length);
    
    for (let i = 0; i < positions.length / 3; i++) {
      const i3 = i * 3;
      newPositions[i3] = positions[i3] + velocities[i3];
      newPositions[i3 + 1] = positions[i3 + 1] + velocities[i3 + 1];
      newPositions[i3 + 2] = positions[i3 + 2] + velocities[i3 + 2];

      // 更新原始位置数组用于下一帧
      positions[i3] = newPositions[i3];
      positions[i3 + 1] = newPositions[i3 + 1];
      positions[i3 + 2] = newPositions[i3 + 2];

      // 逐渐消失
      velocities[i3 + 1] *= 0.98;
    }

    // 使用新的位置数组更新几何体
    geometry.setAttribute('position', new Float32BufferAttribute(newPositions, 3));
    geometry.attributes.position.needsUpdate = true;
  });

  // ==================== 3D渲染部分 ====================
  /**
   * 渲染粒子系统的3D模型
   * 使用Points组件和PointMaterial材质
   */
  return (
    <points ref={pointsRef} position={position}>
      <PointMaterial
        size={0.1}
        color={color}
        transparent
        opacity={1}
        sizeAttenuation
      />
    </points>
  );
};