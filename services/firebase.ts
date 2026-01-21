/**
 * Firebase服务模块
 * 
 * 功能：康复游戏系统的Firebase后端服务和Mock模式支持
 * 技术栈：TypeScript + Firebase SDK + LocalStorage Mock
 * 
 * 主要功能模块：
 * 1. Firebase配置和初始化（支持环境变量配置）
 * 2. 认证服务（登录、注册、登出）
 * 3. 用户资料管理服务（创建、获取、更新用户信息）
 * 4. Mock模式支持（本地存储回退机制）
 * 5. 认证状态监听器
 * 
 * 核心特性：
 * - 双模式运行：支持真实Firebase后端和本地Mock模式
 * - 智能配置检测：自动检测Firebase配置有效性
 * - 无缝切换：配置缺失时自动回退到Mock模式
 * - 数据持久化：Mock模式下使用LocalStorage保存数据
 * - 错误处理：完善的异常处理和日志记录
 * 
 * 运行模式：
 * - 真实模式：当提供有效的Firebase配置时，连接真实Firebase服务
 * - Mock模式：当配置缺失或初始化失败时，使用本地存储模拟后端
 * 
 * 服务接口：
 * - authService: 用户认证相关操作
 * - userService: 用户资料管理操作
 * - initializeAuthListener: 认证状态监听器初始化
 * 
 * 数据模型：
 * - UserProfile: 用户资料数据结构（uid, email, displayName, description, highScore）
 * - MockDB: Mock模式下的内存数据库，持久化到LocalStorage
 * 
 * 作者：Qiucheng Zhao
 */


import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  Firestore
} from 'firebase/firestore';
import { UserProfile } from '../types';

// Destructure auth functions from namespace import to avoid "no exported member" errors
const { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile 
} = firebaseAuth;

// Configuration
// 1. Try to read from Vite Environment Variables (Best Practice)
// 2. Fallback to placeholder strings
const firebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "your-app.firebaseapp.com",
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "your-app",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "your-app.appspot.com",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

let app: FirebaseApp;
let auth: firebaseAuth.Auth;
let db: Firestore;
let isMockMode = true;

try {
  // Check if we have a valid key (not the default placeholder)
  const apiKey = firebaseConfig.apiKey;
  const isValidConfig = apiKey && apiKey !== "YOUR_API_KEY" && !apiKey.includes("YOUR_API_KEY");

  if (!isValidConfig) {
    console.warn("Firebase config missing (using 'YOUR_API_KEY'). Running in Mock Mode (Local Storage Only).");
    isMockMode = true;
  } else {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    isMockMode = false;
    console.log("Connected to real Firebase backend.");
  }
} catch (e) {
  console.error("Firebase init error:", e);
  console.warn("Falling back to Mock Mode due to init error.");
  isMockMode = true;
}

// ==========================================
// MOCK DATA STORE (Local Storage Fallback)
// ==========================================
const mockDb: Record<string, UserProfile> = {};
// Set of observers to notify when auth state changes in mock mode
const mockAuthObservers = new Set<(user: UserProfile | null) => void>();

// Load mock DB from local storage on init
if (isMockMode) {
    try {
        const storedDb = localStorage.getItem('rehab_mock_db');
        if (storedDb) {
            Object.assign(mockDb, JSON.parse(storedDb));
        }
    } catch (e) {
        console.error("Failed to load mock DB", e);
    }
}

const saveMockDb = () => {
    if (isMockMode) {
        localStorage.setItem('rehab_mock_db', JSON.stringify(mockDb));
    }
}

const notifyMockObservers = (user: UserProfile | null) => {
  mockAuthObservers.forEach(cb => {
    try {
      cb(user);
    } catch (e) {
      console.error("Error in auth observer", e);
    }
  });
};

export const authService = {
  login: async (email: string, pass: string) => {
    if (isMockMode) {
      // Mock login - deterministic ID
      const uid = 'mock-user-' + email.replace(/[^a-zA-Z0-9]/g, '');
      let profile = mockDb[uid];
      
      if (!profile) {
          throw new Error("User not found in Mock DB. Please register first.");
      }

      // Persist session
      localStorage.setItem('mock_auth_session', JSON.stringify(profile));
      notifyMockObservers(profile);

      return { user: { uid, email, displayName: profile.displayName } };
    }
    return signInWithEmailAndPassword(auth, email, pass);
  },

  register: async (email: string, pass: string, name: string) => {
    if (isMockMode) {
      const uid = 'mock-user-' + email.replace(/[^a-zA-Z0-9]/g, '');
      
      if (mockDb[uid]) {
          throw new Error("User already exists in Mock DB.");
      }

      const profile: UserProfile = {
        uid,
        email,
        displayName: name,
        description: 'New patient.',
        highScore: 0
      };
      
      // Update DB and Save
      mockDb[uid] = profile;
      saveMockDb();
      
      // Persist session
      localStorage.setItem('mock_auth_session', JSON.stringify(profile));
      notifyMockObservers(profile);

      return { user: { uid, email, displayName: name } };
    }
    
    // Real Firebase
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      await updateProfile(result.user, { displayName: name });
      // Create the profile in Firestore
      await userService.createUserProfile({
        uid: result.user.uid,
        email: result.user.email,
        displayName: name,
        description: '',
        highScore: 0
      });
    }
    return result;
  },

  logout: async () => {
    if (isMockMode) {
      localStorage.removeItem('mock_auth_session');
      notifyMockObservers(null);
      return;
    }
    return signOut(auth);
  }
};

export const userService = {
  createUserProfile: async (profile: UserProfile) => {
    if (isMockMode) {
      mockDb[profile.uid] = profile;
      saveMockDb();
      return;
    }
    await setDoc(doc(db, "users", profile.uid), profile);
  },

  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    if (isMockMode) {
      return mockDb[uid] || null;
    }
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  },

  updateStats: async (uid: string, newScore: number, description?: string) => {
    if (isMockMode) {
      if (mockDb[uid]) {
        if (newScore > mockDb[uid].highScore) mockDb[uid].highScore = newScore;
        if (description !== undefined) mockDb[uid].description = description;
        saveMockDb();
        
        // Update session if it's the current user
        const storedSession = localStorage.getItem('mock_auth_session');
        if (storedSession) {
            const current = JSON.parse(storedSession);
            if (current.uid === uid) {
                 localStorage.setItem('mock_auth_session', JSON.stringify(mockDb[uid]));
            }
        }
      }
      return;
    }
    
    const userRef = doc(db, "users", uid);
    const updates: any = {};
    if (description !== undefined) updates.description = description;
    
    // Simple check-and-update
    // In a real app, use transactions for scores, but this is fine for now
    try {
        const current = await getDoc(userRef);
        if (current.exists()) {
            const data = current.data() as UserProfile;
            if (newScore > data.highScore) {
                updates.highScore = newScore;
            }
        } else {
            // Document might be missing if registration failed partially
             updates.highScore = newScore;
        }
        
        if (Object.keys(updates).length > 0) {
            await updateDoc(userRef, updates);
        }
    } catch (e) {
        console.error("Error updating stats", e);
    }
  }
};

export const initializeAuthListener = (cb: (user: UserProfile | null) => void) => {
  if (isMockMode) {
    mockAuthObservers.add(cb);
    
    // Check initial state from local storage session
    const stored = localStorage.getItem('mock_auth_session');
    if (stored) {
        try {
            const user = JSON.parse(stored);
            if (user && user.uid) {
              // Ensure DB has it (in case of clear cache partial)
              if (!mockDb[user.uid]) {
                  mockDb[user.uid] = user;
              }
              cb(user);
            } else {
              cb(null);
            }
        } catch (e) {
            console.error("Failed to parse mock auth", e);
            cb(null);
        }
    } else {
        cb(null);
    }
    
    return () => { mockAuthObservers.delete(cb); };
  }
  
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        let profile = await userService.getUserProfile(firebaseUser.uid);
        if (!profile) {
           // Create default profile if missing from Firestore
           profile = {
             uid: firebaseUser.uid,
             email: firebaseUser.email,
             displayName: firebaseUser.displayName,
             description: '',
             highScore: 0
           };
           // Attempt to save it
           await userService.createUserProfile(profile);
        }
        cb(profile);
      } catch (e) {
        console.error("Error fetching user profile", e);
        // Still log them in even if profile fetch fails, but with basic data
        cb({
             uid: firebaseUser.uid,
             email: firebaseUser.email,
             displayName: firebaseUser.displayName,
             description: '',
             highScore: 0
        });
      }
    } else {
      cb(null);
    }
  });
};