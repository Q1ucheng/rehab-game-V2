import React, { useEffect, useRef } from 'react';
import { useSphere } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../../store/useStore';
import { Vector3 } from 'three';
import { InputController } from '../../services/inputController';

interface BallProps {
  ballRadius: number;
}

export const Ball: React.FC<BallProps> = ({ ballRadius }) => {
  const { recordFail, isPlaying, isGameOver } = useStore();
  const position = useRef(new Vector3(0, 0, 0));
  const velocity = useRef(new Vector3(0, 0, 0));
  const inputController = InputController.getInstance();

  const RESET_POSITION: [number, number, number] = [0, 5, 0];

  const [ref, api] = useSphere(() => ({
    mass: 1,
    position: RESET_POSITION,
    args: [ballRadius], // 使用动态半径
    material: {
      friction: 0.8,
      restitution: 0.0
    },
    linearDamping: 0.1,
    angularDamping: 0.1,
  }));

  // Subscription to track position and velocity for logic
  useEffect(() => {
    const unsubscribePosition = api.position.subscribe((v) => {
      position.current.set(v[0], v[1], v[2]);
    });
    
    const unsubscribeVelocity = api.velocity.subscribe((v) => {
      velocity.current.set(v[0], v[1], v[2]);
    });
    
    return () => {
      unsubscribePosition();
      unsubscribeVelocity();
    };
  }, [api.position, api.velocity]);

  // Reset ball when game starts or restarts
  useEffect(() => {
    if (isPlaying && !isGameOver) {
      api.position.set(...RESET_POSITION);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    }
  }, [isPlaying, isGameOver, api]);

  // Game Loop Logic for the Ball
  useFrame(() => {
    if (!isPlaying) return;

    // Fall detection logic
    // If ball drops below -5 in Y, it fell off the platform
    if (position.current.y < -5) {
      recordFail();
      // Reset position immediately to continue or stop if game over
      api.position.set(...RESET_POSITION);
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
    }

    // ADDED: Wrist rotation speed control
    const wristRotation = inputController.getWristRotation();
    if (wristRotation.speedMultiplier !== 1.0) {
      // Apply speed multiplier to ball velocity
      const currentVelocity = velocity.current;
      const targetVelocity = currentVelocity.clone().multiplyScalar(wristRotation.speedMultiplier);
      
      // Smoothly transition to target velocity
      const smoothingFactor = 0.1;
      const newVelocity = currentVelocity.lerp(targetVelocity, smoothingFactor);
      
      api.velocity.set(newVelocity.x, newVelocity.y, newVelocity.z);
    }

    // "Attachment" force (Optional)
    // If we really wanted to glue it, we could apply force towards platform center,
    // but the prompt implies falling is possible, so gravity is sufficient.
  });

  return (
    <mesh ref={ref as any} castShadow receiveShadow name="ball">
      <sphereGeometry args={[ballRadius, 32, 32]} />
      <meshStandardMaterial color="#f43f5e" metalness={0.4} roughness={0.7} />
    </mesh>
  );
};