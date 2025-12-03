// Firebase Firestore 数据存储层
// 保留 IndexedDB 作为离线 fallback

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { type Prompt } from '../types';
import { db as indexedDB } from './db';

// Firebase 配置
// TODO: 替换为你的 Firebase 项目配置
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

// 初始化 Firebase
let app: ReturnType<typeof initializeApp> | null = null;
let firestore: ReturnType<typeof getFirestore> | null = null;

let isFirebaseEnabled = false;

export function initFirebase(config?: typeof firebaseConfig): void {
  try {
    const configToUse = config || firebaseConfig;
    // 检查配置是否完整
    if (
      configToUse.apiKey &&
      configToUse.projectId &&
      configToUse.apiKey !== 'YOUR_API_KEY'
    ) {
      app = initializeApp(configToUse);
      firestore = getFirestore(app);
      isFirebaseEnabled = true;
      console.log('Firebase initialized successfully');
    } else {
      console.warn('Firebase config not provided, using IndexedDB only');
      isFirebaseEnabled = false;
    }
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    isFirebaseEnabled = false;
  }
}

// 将 Firestore 文档转换为 Prompt
function docToPrompt(docData: any): Prompt {
  const data = docData.data();
  return {
    id: docData.id,
    title: data.title || '',
    content: data.content || '',
    createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
    updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
  };
}

// 将 Prompt 转换为 Firestore 文档
function promptToDoc(prompt: Prompt): any {
  return {
    title: prompt.title,
    content: prompt.content,
    createdAt: Timestamp.fromMillis(prompt.createdAt),
    updatedAt: serverTimestamp(),
  };
}

class FirebaseService {
  /**
   * 保存 Prompt 到 Firestore（如果启用）和 IndexedDB
   */
  async savePrompt(prompt: Prompt): Promise<void> {
    // 总是保存到 IndexedDB（离线支持）
    await indexedDB.savePrompt(prompt);

    // 如果 Firebase 启用，也保存到 Firestore
    if (isFirebaseEnabled && firestore) {
      try {
        const promptRef = doc(firestore, 'prompts', prompt.id);
        // 使用 setDoc 创建或更新文档（保持 ID 一致）
        await setDoc(promptRef, {
          title: prompt.title,
          content: prompt.content,
          createdAt: Timestamp.fromMillis(prompt.createdAt),
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.error('Failed to save to Firestore:', error);
        // 继续使用 IndexedDB
      }
    }
  }

  /**
   * 从 Firestore 或 IndexedDB 获取 Prompt
   */
  async getPrompt(id: string): Promise<Prompt | null> {
    // 优先从 IndexedDB 获取（更快）
    const localPrompt = await indexedDB.getPrompt(id);
    if (localPrompt) {
      return localPrompt;
    }

    // 如果 Firebase 启用，从 Firestore 获取
    if (isFirebaseEnabled && firestore) {
      try {
        const promptRef = doc(firestore, 'prompts', id);
        const promptSnap = await getDoc(promptRef);
        if (promptSnap.exists()) {
          const prompt = docToPrompt(promptSnap);
          // 保存到 IndexedDB 以便离线访问
          await indexedDB.savePrompt(prompt);
          return prompt;
        }
      } catch (error) {
        console.error('Failed to get from Firestore:', error);
      }
    }

    return null;
  }

  /**
   * 获取所有 Prompts
   */
  async getAllPrompts(): Promise<Prompt[]> {
    // 优先从 IndexedDB 获取
    const localPrompts = await indexedDB.getAllPrompts();

    // 如果 Firebase 启用，同步 Firestore 数据
    if (isFirebaseEnabled && firestore) {
      try {
        const q = query(collection(firestore, 'prompts'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const firestorePrompts = querySnapshot.docs.map((doc) => docToPrompt(doc));

        // 合并本地和云端数据
        const merged = new Map<string, Prompt>();
        localPrompts.forEach((p) => merged.set(p.id, p));
        firestorePrompts.forEach((p) => merged.set(p.id, p));

        // 保存所有云端数据到 IndexedDB
        for (const prompt of firestorePrompts) {
          await indexedDB.savePrompt(prompt);
        }

        return Array.from(merged.values());
      } catch (error) {
        console.error('Failed to get from Firestore:', error);
        return localPrompts;
      }
    }

    return localPrompts;
  }

  /**
   * 删除 Prompt
   */
  async deletePrompt(id: string): Promise<void> {
    // 从 IndexedDB 删除
    await indexedDB.deletePrompt(id);

    // 如果 Firebase 启用，从 Firestore 删除
    if (isFirebaseEnabled && firestore) {
      try {
        const promptRef = doc(firestore, 'prompts', id);
        await deleteDoc(promptRef);
      } catch (error) {
        console.error('Failed to delete from Firestore:', error);
      }
    }
  }

  /**
   * 搜索 Prompts
   */
  async searchPrompts(query: string): Promise<Prompt[]> {
    // 使用 IndexedDB 搜索（更快）
    return indexedDB.searchPrompts(query);
  }

  /**
   * 监听 Firestore 实时更新
   */
  subscribeToPrompts(
    callback: (prompts: Prompt[]) => void
  ): (() => void) | null {
    if (!isFirebaseEnabled || !firestore) {
      // 如果不使用 Firebase，定期从 IndexedDB 获取
      const interval = setInterval(async () => {
        const prompts = await indexedDB.getAllPrompts();
        callback(prompts);
      }, 1000);
      return () => clearInterval(interval);
    }

    try {
      const q = query(collection(firestore, 'prompts'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const prompts = snapshot.docs.map((doc) => docToPrompt(doc));
          // 同步到 IndexedDB
          prompts.forEach((prompt) => {
            indexedDB.savePrompt(prompt).catch(console.error);
          });
          callback(prompts);
        },
        (error) => {
          console.error('Firestore subscription error:', error);
          // 失败时从 IndexedDB 获取
          indexedDB.getAllPrompts().then(callback).catch(console.error);
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error('Failed to subscribe to Firestore:', error);
      return null;
    }
  }
}

export const firebaseService = new FirebaseService();

// 导出初始化函数

