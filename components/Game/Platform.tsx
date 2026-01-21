/**
 * Platform.tsx - 游戏平台组件
 * 
 * 功能描述：
 * 1. 创建游戏中的主要交互平台
 * 2. 实现平台与设备方向的实时同步
 * 3. 提供球体运动的物理表面
 * 4. 支持动态平台大小配置
 * 5. 集成视觉网格辅助线
 * 
 * 技术栈：
 * - React Three Fiber: 3D渲染引擎
 * - React Three Cannon: 物理引擎
 * - Three.js: 3D图形库（Euler旋转）
 * 
 * 作者：Qiucheng Zhao
 */


import React from 'react';
import { useBox } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { InputController } from '../../services/inputController';
import { Euler } from 'three';


// ==================== 接口定义 ====================
/**
 * Platform组件的属性接口
 * 
 * @property {number} platformSize - 平台的大小（边长）
 * 平台为正方形，X轴和Z轴尺寸相同，Y轴高度固定为0.5
 */
interface PlatformProps {
  platformSize: number;
}


// ==================== 平台组件主函数 ====================
/**
 * Platform - 游戏平台组件
 * 
 * 功能：
 * 1. 创建物理平台作为球体运动的基础
 * 2. 实时响应设备方向变化，同步平台旋转
 * 3. 提供视觉网格辅助线增强游戏体验
 * 4. 支持阴影投射和接收
 * 
 * @param {PlatformProps} props - 组件属性
 * @returns {JSX.Element} 平台的3D模型
 */
export const Platform: React.FC<PlatformProps> = ({ platformSize }) => {
  // 读取摇杆设备方向数据（俯仰角、横滚角、偏航角）
  const inputController = InputController.getInstance();
  // 物理引擎配置：使用React Three Cannon创建物理平台，平台设置为Kinematic类型，不受物理力影响但可以主动移动
  const [ref, api] = useBox(() => ({
    type: 'Kinematic',
    args: [platformSize, 0.5, platformSize], // 使用动态尺寸
    material: {
      friction: 0.8,
      restitution: 0
    }
  }));
  // 使用useFrame钩子每帧更新平台旋转，将设备方向数据转换为平台旋转角度
  useFrame(() => {
    const { pitch, roll, yaw } = inputController.getOrientation();
    const euler = new Euler(pitch, yaw, roll, 'XYZ');
    api.rotation.set(euler.x, euler.y, euler.z);
  });

  // ==================== 3D模型渲染 ====================
  /**
   * 渲染平台的3D模型
   * 包含几何体、材质和视觉辅助元素
   */
  return (
    <mesh ref={ref as any} receiveShadow castShadow>
      <boxGeometry args={[platformSize, 0.5, platformSize]} />
      <meshStandardMaterial color="#3b82f6" metalness={0.2} roughness={0.1} />
      
      {/* Visual Grid on top */}
      <gridHelper args={[platformSize, 10, 0xffffff, 0x1e3a8a]} position={[0, 0.26, 0]} />
    </mesh>
  );
};