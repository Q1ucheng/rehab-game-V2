import React from 'react';
import { GameDifficulty } from '../../types';

interface DifficultySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (difficulty: GameDifficulty) => void;
  initialDifficulty?: GameDifficulty;
}

const DifficultySettingsModal: React.FC<DifficultySettingsModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  initialDifficulty = { platformSize: 10, ballRadius: 0.5 }
}) => {
  const [difficulty, setDifficulty] = React.useState<GameDifficulty>(initialDifficulty);

  // 计算难度星级
  const calculateDifficultyStars = (platformSize: number, ballRadius: number): number => {
    // 🌟 1星（最容易）：平板 20×20，球半径 1.0/0.8/0.5/0.3
    if (platformSize === 20) return 1;
    
    // 🌟🌟 2星（较容易）：平板 15×15，球半径 1.0/0.8/0.5/0.3
    if (platformSize === 15) return 2;
    
    // 🌟🌟🌟 3星（中等难度）：平板 10×10，球半径 0.5/0.3/0.8/1.0
    if (platformSize === 10) {
      if (ballRadius === 0.5 || ballRadius === 0.3) return 3;
      if (ballRadius === 0.8 || ballRadius === 1.0) return 3;
      return 3; // 默认中等难度
    }
    
    // 🌟🌟🌟🌟 4星（困难）：平板 8×8，球半径 0.3/0.5
    if (platformSize === 8) {
      if (ballRadius === 0.3 || ballRadius === 0.5) return 4;
      // 🌟🌟🌟🌟🌟 5星（极难）：平板 8×8，球半径 0.8/1.0
      if (ballRadius === 0.8 || ballRadius === 1.0) return 5;
    }
    
    return 3; // 默认中等难度
  };

  // 获取难度描述
  const getDifficultyDescription = (stars: number): string => {
    switch (stars) {
      case 1: return '最容易';
      case 2: return '较容易';
      case 3: return '中等难度';
      case 4: return '困难';
      case 5: return '极难';
      default: return '中等难度';
    }
  };

  // 渲染星级显示
  const renderStars = (stars: number) => {
    return (
      <div className="flex items-center">
        {Array.from({ length: 5 }).map((_, i) => (
          <span 
            key={i} 
            className={`text-lg ${i < stars ? 'text-yellow-400' : 'text-slate-600'}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // 平板尺寸选项
  const platformSizes = [
    { value: 20, label: '20×20', description: '超大平板' },
    { value: 15, label: '15×15', description: '大平板' },
    { value: 10, label: '10×10', description: '标准平板' },
    { value: 8, label: '8×8', description: '小平板' }
  ];

  // 小球半径选项
  const ballRadii = [
    { value: 1.0, label: '1.0', description: '大球' },
    { value: 0.8, label: '0.8', description: '较大球' },
    { value: 0.5, label: '0.5', description: '标准球' },
    { value: 0.3, label: '0.3', description: '小球' }
  ];

  const handlePlatformSizeChange = (size: number) => {
    setDifficulty(prev => ({ ...prev, platformSize: size }));
  };

  const handleBallRadiusChange = (radius: number) => {
    setDifficulty(prev => ({ ...prev, ballRadius: radius }));
  };

  const handleStartGame = () => {
    onStartGame(difficulty);
  };

  if (!isOpen) return null;

  const currentStars = calculateDifficultyStars(difficulty.platformSize, difficulty.ballRadius);
  const difficultyDescription = getDifficultyDescription(currentStars);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Game Difficulty Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* 难度星级显示 */}
        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-white font-semibold">Current Difficulty Level</h4>
              <p className="text-slate-300 text-sm">{difficultyDescription}</p>
            </div>
            <div className="text-right">
              {renderStars(currentStars)}
              <p className="text-yellow-400 font-bold text-lg mt-1">
                {currentStars}星难度
              </p>
            </div>
          </div>
        </div>

        {/* 平板尺寸设置卡片 */}
        <div className="bg-slate-900/50 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Platform Size</h3>
            <span className="text-sky-400 font-mono text-lg">
              {difficulty.platformSize}×{difficulty.platformSize}
            </span>
          </div>
          
          <div className="space-y-4">
            {platformSizes.map((size, index) => (
              <div key={size.value} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition">
                <div>
                  <div className="text-white font-medium">{size.label}</div>
                  <div className="text-slate-400 text-sm">{size.description}</div>
                </div>
                <button
                  onClick={() => handlePlatformSizeChange(size.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    difficulty.platformSize === size.value
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {difficulty.platformSize === size.value ? 'Selected' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 小球半径设置卡片 */}
        <div className="bg-slate-900/50 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Ball Radius</h3>
            <span className="text-sky-400 font-mono text-lg">
              {difficulty.ballRadius}
            </span>
          </div>
          
          <div className="space-y-4">
            {ballRadii.map((radius, index) => (
              <div key={radius.value} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-700/50 transition">
                <div>
                  <div className="text-white font-medium">Radius: {radius.label}</div>
                  <div className="text-slate-400 text-sm">{radius.description}</div>
                </div>
                <button
                  onClick={() => handleBallRadiusChange(radius.value)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    difficulty.ballRadius === radius.value
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {difficulty.ballRadius === radius.value ? 'Selected' : 'Select'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 预览信息 */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl p-4 mb-6">
          <h4 className="text-white font-semibold mb-2">Preview Settings</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Platform:</span>
              <span className="text-white ml-2">{difficulty.platformSize}×{difficulty.platformSize}</span>
            </div>
            <div>
              <span className="text-slate-400">Ball Radius:</span>
              <span className="text-white ml-2">{difficulty.ballRadius}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400">Difficulty Level:</span>
              <span className="text-white ml-2">
                {difficultyDescription} ({currentStars}星)
              </span>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleStartGame}
            className="flex-1 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-play"></i> Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default DifficultySettingsModal;