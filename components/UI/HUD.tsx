import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { AppScreen } from '../../types';
import { InputController } from '../../services/inputController';

interface HUDProps {
  onExitClick: () => void;
  isPlaying: boolean;
  isGameOver: boolean;
}

const HUD: React.FC<HUDProps> = ({ onExitClick, isPlaying, isGameOver }) => {
  const { score, fails, maxFails, gameDifficulty } = useStore();
  const lives = Math.max(0, maxFails - fails);
  
  const [deviceInfo, setDeviceInfo] = useState({ type: 'None', id: null, index: null });
  const [availableDevices, setAvailableDevices] = useState<Array<{index: number, id: string, type: string}>>([]);

  useEffect(() => {
    const updateDeviceInfo = () => {
      const info = InputController.getInstance().getDeviceInfo();
      setDeviceInfo(info);
      
      const devices = InputController.getInstance().listAvailableDevices();
      setAvailableDevices(devices);
    };

    updateDeviceInfo();
    const interval = setInterval(updateDeviceInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDeviceSwitch = (index: number) => {
    InputController.getInstance().switchToDevice(index);
  };

  // 计算难度星级
  const calculateDifficultyStars = (platformSize: number, ballRadius: number): number => {
    if (platformSize === 20) return 1;
    if (platformSize === 15) return 2;
    if (platformSize === 10) {
      if (ballRadius === 0.5 || ballRadius === 0.3) return 3;
      if (ballRadius === 0.8 || ballRadius === 1.0) return 3;
      return 3;
    }
    if (platformSize === 8) {
      if (ballRadius === 0.3 || ballRadius === 0.5) return 4;
      if (ballRadius === 0.8 || ballRadius === 1.0) return 5;
    }
    return 3;
  };

  // 渲染星级显示
  const renderStars = (stars: number) => {
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <span 
            key={i} 
            className={`text-xs ${i < stars ? 'text-yellow-400' : 'text-slate-600'}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // 格式化平台大小显示
  const formatPlatformSize = (size: number) => {
    return `${size}×${size}`;
  };

  // 格式化小球半径显示
  const formatBallRadius = (radius: number) => {
    return radius.toFixed(1);
  };

  const currentStars = calculateDifficultyStars(gameDifficulty.platformSize, gameDifficulty.ballRadius);

  return (
    <div className="absolute top-0 left-0 w-full p-3 z-10 pointer-events-auto">
      {/* 左侧卡片组：Score、Difficulty、Exit */}
      <div className="flex gap-2.5 items-start">
        {/* Score */}
        <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-xl min-w-[140px] h-28 flex flex-col justify-between">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Score</p>
          <p className="text-4xl font-mono font-bold text-emerald-400">{score}</p>
        </div>

        {/* Difficulty Settings - 只在游戏进行中显示 */}
        {isPlaying && !isGameOver && (
          <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-xl min-w-[160px] h-28 flex flex-col justify-between">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Difficulty</p>
              {renderStars(currentStars)}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm">Platform:</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {formatPlatformSize(gameDifficulty.platformSize)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300 text-sm">Ball Radius:</span>
                <span className="text-emerald-400 font-mono font-bold">
                  {formatBallRadius(gameDifficulty.ballRadius)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Exit Button - 只在游戏进行中显示 */}
        {isPlaying && !isGameOver && (
          <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-xl min-w-[140px] h-28 flex flex-col justify-between">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Exit</p>
            <button
              onClick={onExitClick}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 shadow-lg w-full justify-center"
            >
              <i className="fa-solid fa-door-open"></i>
              Exit
            </button>
          </div>
        )}
      </div>

      {/* 右侧内容：Device Status 和 Stability */}
      <div className="absolute top-3 right-3 flex items-start gap-3">
        {/* Device Status Indicator */}
        <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-xl min-w-[180px]">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Device Status</p>
          <div className="flex items-center gap-2 mt-2">
            <div className={`w-3 h-3 rounded-full ${deviceInfo.type !== 'None' ? 
              (deviceInfo.type === 'vJoy' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]') 
              : 'bg-red-500'}`} />
            <div className="text-sm text-white">
              <div>Type: {deviceInfo.type}</div>
              <div className="text-xs text-slate-400">
                ID: {deviceInfo.id ? deviceInfo.id.replace('Unknown Gamepad', 'vJoy Device') : 'Not connected'}
              </div>
              {deviceInfo.index !== null && (
                <div className="text-xs text-slate-500">Index: {deviceInfo.index}</div>
              )}
            </div>
          </div>
          
          {/* Device Selection (only show if multiple devices available) */}
          {availableDevices.length > 1 && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Switch Device</p>
              <div className="flex flex-col gap-1 max-h-20 overflow-y-auto">
                {availableDevices.map(device => (
                  <button
                    key={device.index}
                    className={`text-xs px-2 py-1 rounded pointer-events-auto ${
                      deviceInfo.index === device.index
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    onClick={() => handleDeviceSwitch(device.index)}
                  >
                    {device.type}: {device.id.substring(0, 20)}...
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lives / Fails */}
        <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-xl text-right min-w-[140px]">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Stability</p>
          <div className="flex gap-2 mt-2 justify-end">
            {Array.from({ length: maxFails }).map((_, i) => (
              <div 
                key={i} 
                className={`w-3 h-3 rounded-full ${i < lives ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.6)]' : 'bg-slate-700'}`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1">{lives} attempts remaining</p>
        </div>
      </div>
    </div>
  );
};

export default HUD;