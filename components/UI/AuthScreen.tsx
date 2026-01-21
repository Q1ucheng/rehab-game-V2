/**
 * AuthScreen.tsx
 * 康复游戏系统用户认证界面组件
 * 
 * 功能概述：
 * - 提供用户登录和注册功能
 * - 集成Firebase认证服务
 * - 支持登录/注册模式切换
 * - 包含表单验证和错误处理
 * - 提供响应式UI设计
 * 
 * 技术栈：
 * - React + TypeScript
 * - Firebase Authentication
 * - Tailwind CSS
 * 
 * author: Qiucheng Zhao
 */


import React, { useState } from 'react';
import { authService } from '../../services/firebase';

// ==================== 组件定义 ====================
/**
 * AuthScreen组件 - 用户认证界面
 * 
 * 主要功能：
 * - 管理登录/注册状态切换
 * - 处理用户输入的表单数据
 * - 调用Firebase认证服务
 * - 显示认证结果和错误信息
 */
const AuthScreen: React.FC = () => {
  // ==================== 状态管理 ====================
  /**
   * 状态变量定义
   * 
   * @state isLogin - 控制登录/注册模式切换（true: 登录模式，false: 注册模式）
   * @state email - 用户输入的邮箱地址
   * @state password - 用户输入的密码
   * @state name - 用户输入的姓名（仅在注册模式下使用）
   * @state error - 认证过程中出现的错误信息
   * @state loading - 认证请求的加载状态
   */
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ==================== 认证处理函数 ====================
  /**
   * handleSubmit - 表单提交处理函数
   * 
   * 功能流程：
   * 1. 阻止表单默认提交行为
   * 2. 重置错误状态，设置加载状态
   * 3. 根据当前模式调用相应的认证服务
   * 4. 处理认证结果和异常情况
   * 5. 最终重置加载状态
   * 
   * @param e - React表单事件对象
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await authService.login(email, password);
      } else {
        await authService.register(email, password, name);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-sky-500 to-emerald-500 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
             <i className="fa-solid fa-heart-pulse text-2xl text-white"></i>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">RehabBalance 3D</h1>
          <p className="text-slate-400">Interactive Therapeutic Training</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-sky-500 outline-none transition"
                placeholder="John Doe"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.currentTarget.value)}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-sky-500 outline-none transition"
              placeholder="patient@example.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.currentTarget.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-sky-500 outline-none transition"
              placeholder="••••••••"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.currentTarget.value)}
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded border border-red-900/50">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-sky-900/50 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-slate-400 hover:text-white text-sm transition"
          >
            {isLogin ? "New patient? Create account" : "Already registered? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;