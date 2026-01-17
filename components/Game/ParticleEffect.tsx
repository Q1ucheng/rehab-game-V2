import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { BufferGeometry, Points as ThreePoints, Float32BufferAttribute } from 'three';

interface ParticleEffectProps {
  position: [number, number, number];
  color?: string;
  duration?: number;
  onComplete?: () => void;
}

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