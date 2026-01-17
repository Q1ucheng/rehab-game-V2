import React from 'react';
import { useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { InputController } from '../../services/inputController';
import { Euler } from 'three';

interface PlatformProps {
  platformSize: number;
}

export const Platform: React.FC<PlatformProps> = ({ platformSize }) => {
  const inputController = InputController.getInstance();
  
  const [ref, api] = useBox(() => ({
    type: 'Kinematic',
    args: [platformSize, 0.5, platformSize], // 使用动态尺寸
    material: {
      friction: 0.8,
      restitution: 0
    }
  }));

  useFrame(() => {
    const { pitch, roll, yaw } = inputController.getOrientation();
    const euler = new Euler(pitch, yaw, roll, 'XYZ');
    api.rotation.set(euler.x, euler.y, euler.z);
  });

  return (
    <mesh ref={ref as any} receiveShadow castShadow>
      <boxGeometry args={[platformSize, 0.5, platformSize]} />
      <meshStandardMaterial color="#3b82f6" metalness={0.2} roughness={0.1} />
      
      {/* Visual Grid on top */}
      <gridHelper args={[platformSize, 10, 0xffffff, 0x1e3a8a]} position={[0, 0.26, 0]} />
    </mesh>
  );
};