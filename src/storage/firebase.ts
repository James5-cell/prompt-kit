// Firebase Firestore 数据存储层
// 保留 IndexedDB 作为离线 fallback

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  type Auth,
  GoogleAuthProvider,
  getIdTokenResult,
  signInWithPopup,
  signOut,
  type User,
  type UserCredential,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  setDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { type Prompt, type Tag } from '../types';
import { db as indexedDB } from './db';

// Firebase 配置
const firebaseConfig = {
  apiKey: 'AIzaSyBH2m8ygeTm74ziq5sZhkoXyGkGeXU4ik0',
  authDomain: 'prompt-kit-7a67e.firebaseapp.com',
  projectId: 'prompt-kit-7a67e',
  storageBucket: 'prompt-kit-7a67e.firebasestorage.app',
  messagingSenderId: '922333705782',
  appId: '1:922333705782:web:9cccb79fc85613403a0a97',
  measurementId: 'G-ZN6GNLLSQH',
};

// 初始化 Firebase
let app: ReturnType<typeof initializeApp> | null = null;
let firestore: ReturnType<typeof getFirestore> | null = null;
let auth: Auth | null = null;

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
      auth = getAuth(app);
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

export function getFirebaseAuth(): Auth | null {
  return auth;
}

export function getFirebaseUser(): User | null {
  return auth?.currentUser ?? null;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = auth?.currentUser ?? null;
  if (!user) return false;
  try {
    const tokenResult = await getIdTokenResult(user, false);
    return tokenResult?.claims?.admin === true;
  } catch {
    return false;
  }
}

export async function signInWithGoogle(): Promise<UserCredential> {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }
  const provider = new GoogleAuthProvider();
  return await signInWithPopup(auth, provider);
}

export async function signOutFirebase(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

// 将 Firestore 文档转换为 Prompt
// Handles both old documents (minimal fields) and new ones (full schema)
function docToPrompt(docData: any): Prompt {
  const data = docData.data();
  return {
    id: docData.id,
    title: data.title || '',
    content: data.content || '',
    createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
    updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
    favorite: data.favorite ?? false,
    usageCount: data.usageCount ?? 0,
    lastUsedAt: data.lastUsedAt?.toMillis?.() || data.lastUsedAt,
    // New schema fields — read if present, undefined otherwise
    slug: data.slug,
    summary: data.summary,
    category: data.category,
    language: data.language,
    status: data.status,
    visibility: data.visibility,
    tagIds: data.tagIds ?? [],
    tagNames: data.tagNames ?? [],
    searchTokens: data.searchTokens ?? [],
    runCount: data.runCount ?? 0,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
    isDeleted: data.isDeleted ?? false,
    sampleOutput: data.sampleOutput,
    sampleInput: data.sampleInput,
  };
}

// 将 Firestore 文档转换为 Tag
function docToTag(docData: any): Tag {
  const data = docData.data();
  return {
    id: docData.id,
    slug: data.slug || '',
    name: data.name || '',
    description: data.description,
    color: data.color,
    aliases: data.aliases ?? [],
    parentId: data.parentId,
    path: data.path,
    promptCount: data.promptCount ?? 0,
    usageCount: data.usageCount ?? 0,
    isActive: data.isActive ?? true,
    isSystem: data.isSystem ?? false,
    createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
    updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
  };
}


class FirebaseService {
  // Listeners for non-Firebase mode: notified after local mutations
  // so we don't need to poll IndexedDB every second.
  private localListeners = new Set<(prompts: Prompt[]) => void>();

  /**
   * Notify all local listeners by reading current IndexedDB state.
   * Only used when Firebase is disabled (no Firestore onSnapshot).
   */
  private async notifyLocalListeners(): Promise<void> {
    if (this.localListeners.size === 0) return;
    try {
      const prompts = await indexedDB.getAllPrompts();
      this.localListeners.forEach((cb) => cb(prompts));
    } catch (error) {
      console.error('Failed to notify local listeners:', error);
    }
  }

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
        // Build document data — includes new schema fields when present
        const docData: Record<string, any> = {
          title: prompt.title,
          content: prompt.content,
          createdAt: Timestamp.fromMillis(prompt.createdAt),
          updatedAt: serverTimestamp(),
          favorite: prompt.favorite ?? false,
          usageCount: prompt.usageCount ?? 0,
          lastUsedAt: prompt.lastUsedAt
            ? Timestamp.fromMillis(prompt.lastUsedAt)
            : null,
        };
        // Write new fields only when they are explicitly set
        if (prompt.slug !== undefined) docData.slug = prompt.slug;
        if (prompt.summary !== undefined) docData.summary = prompt.summary;
        if (prompt.category !== undefined) docData.category = prompt.category;
        if (prompt.language !== undefined) docData.language = prompt.language;
        if (prompt.status !== undefined) docData.status = prompt.status;
        if (prompt.visibility !== undefined) docData.visibility = prompt.visibility;
        if (prompt.tagIds !== undefined) docData.tagIds = prompt.tagIds;
        if (prompt.tagNames !== undefined) docData.tagNames = prompt.tagNames;
        if (prompt.searchTokens !== undefined) docData.searchTokens = prompt.searchTokens;
        if (prompt.runCount !== undefined) docData.runCount = prompt.runCount;
        if (prompt.createdBy !== undefined) docData.createdBy = prompt.createdBy;
        if (prompt.updatedBy !== undefined) docData.updatedBy = prompt.updatedBy;
        if (prompt.isDeleted !== undefined) docData.isDeleted = prompt.isDeleted;
        if (prompt.sampleOutput !== undefined) docData.sampleOutput = prompt.sampleOutput;
        if (prompt.sampleInput !== undefined) docData.sampleInput = prompt.sampleInput;

        await setDoc(promptRef, docData, { merge: true });
        console.log(`[Firebase] Saved prompt ${prompt.id} to Firestore`);
      } catch (error: any) {
        console.error('Failed to save to Firestore:', error);
        // 显示详细错误信息
        if (error?.code === 'permission-denied') {
          console.error('Firestore 权限错误：请检查 Firestore 安全规则是否允许写入');
          console.error('请访问 Firebase Console 设置 Firestore 规则，或查看 FIRESTORE_SETUP.md');
        } else if (error?.code === 'unavailable') {
          console.error('Firestore 不可用：请检查网络连接和 Firebase 配置');
        }
        // Continue using IndexedDB (already saved above)
      }
    } else {
      console.warn('[Firebase] Firebase not enabled or initialized. Saving to local IndexedDB only.');
    }

    // Notify local listeners (non-Firebase mode) so UI updates without polling
    if (!isFirebaseEnabled) {
      await this.notifyLocalListeners();
    }
  }

  /**
   * 部分更新 Prompt（仅将修改的字段合并，不重新写入整个对象以防意外删除）
   */
  async updatePromptDoc(id: string, updates: Partial<Prompt>): Promise<void> {
    // 总是保存到 IndexedDB（离线支持）
    const existingLocal = await indexedDB.getPrompt(id);
    if (existingLocal) {
      await indexedDB.savePrompt({ ...existingLocal, ...updates });
    }

    if (isFirebaseEnabled && firestore) {
      try {
        const promptRef = doc(firestore, 'prompts', id);
        // Remove undefined values to not trigger Firebase errors
        const docData: Record<string, any> = {};
        for (const [key, value] of Object.entries(updates)) {
          if (value !== undefined) {
            docData[key] = value;
          }
        }
        docData.updatedAt = serverTimestamp();

        await updateDoc(promptRef, docData);
        console.log(`[Firebase] Patched prompt ${id} in Firestore`);
      } catch (error: any) {
        console.error('Failed to patch in Firestore:', error);
      }
    } else {
      console.warn('[Firebase] Firebase not enabled. Applied patch to IndexedDB only.');
    }

    if (!isFirebaseEnabled) {
      await this.notifyLocalListeners();
    }
  }

  /**
   * 从 Firestore 或 IndexedDB 获取 Prompt
   */
  async getPrompt(id: string): Promise<Prompt | null> {
    // If Firebase is enabled, prioritize fetching from Firestore to get fresh data
    if (isFirebaseEnabled && firestore) {
      try {
        const promptRef = doc(firestore, 'prompts', id);
        const promptSnap = await getDoc(promptRef);
        if (promptSnap.exists()) {
          const prompt = docToPrompt(promptSnap);
          // Update IndexedDB cache
          await indexedDB.savePrompt(prompt);
          return prompt;
        }
      } catch (error) {
        console.error('Failed to get from Firestore:', error);
      }
    }

    // Fallback to IndexedDB (if offline, Firebase disabled, or Firebase fetch failed)
    return await indexedDB.getPrompt(id);
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

    // Notify local listeners (non-Firebase mode) so UI updates without polling
    if (!isFirebaseEnabled) {
      await this.notifyLocalListeners();
    }
  }

  /**
   * 搜索 Prompts
   */
  async searchPrompts(searchQuery: string): Promise<Prompt[]> {
    // 使用 IndexedDB 搜索（更快）
    return indexedDB.searchPrompts(searchQuery);
  }

  /**
   * 监听 Firestore 实时更新
   */
  subscribeToPrompts(
    callback: (prompts: Prompt[]) => void
  ): (() => void) | null {
    if (!isFirebaseEnabled || !firestore) {
      // Non-Firebase mode: register listener + do one initial load.
      // Subsequent updates are pushed via notifyLocalListeners()
      // when savePrompt / deletePrompt are called.
      this.localListeners.add(callback);

      // Initial load so the UI gets data immediately
      indexedDB.getAllPrompts().then(callback).catch(console.error);

      // Return cleanup function that removes this listener
      return () => {
        this.localListeners.delete(callback);
      };
    }

    try {
      const q = query(collection(firestore, 'prompts'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const prompts = snapshot.docs.map((d) => docToPrompt(d));
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

  // ─── Tag CRUD ────────────────────────────────────────────────

  /**
   * Save a tag to Firestore
   */
  async saveTag(tag: Tag): Promise<void> {
    if (!isFirebaseEnabled || !firestore) {
      console.warn('[Firebase] Tags require Firebase. Skipping saveTag.');
      return;
    }
    try {
      const tagRef = doc(firestore, 'tags', tag.id);
      await setDoc(tagRef, {
        slug: tag.slug,
        name: tag.name,
        description: tag.description ?? null,
        color: tag.color ?? null,
        aliases: tag.aliases ?? [],
        parentId: tag.parentId ?? null,
        path: tag.path ?? null,
        promptCount: tag.promptCount ?? 0,
        usageCount: tag.usageCount ?? 0,
        isActive: tag.isActive ?? true,
        isSystem: tag.isSystem ?? false,
        createdAt: Timestamp.fromMillis(tag.createdAt),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error('Failed to save tag to Firestore:', error);
    }
  }

  /**
   * Get a single tag by ID
   */
  async getTag(id: string): Promise<Tag | null> {
    if (!isFirebaseEnabled || !firestore) return null;
    try {
      const tagRef = doc(firestore, 'tags', id);
      const tagSnap = await getDoc(tagRef);
      if (tagSnap.exists()) {
        return docToTag(tagSnap);
      }
    } catch (error) {
      console.error('Failed to get tag from Firestore:', error);
    }
    return null;
  }

  /**
   * Get all tags
   */
  async getAllTags(): Promise<Tag[]> {
    if (!isFirebaseEnabled || !firestore) return [];
    try {
      const q = query(collection(firestore, 'tags'), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => docToTag(d));
    } catch (error) {
      console.error('Failed to get tags from Firestore:', error);
      return [];
    }
  }

  /**
   * Delete a tag from Firestore
   */
  async deleteTag(id: string): Promise<void> {
    if (!isFirebaseEnabled || !firestore) return;
    try {
      const tagRef = doc(firestore, 'tags', id);
      await deleteDoc(tagRef);
    } catch (error) {
      console.error('Failed to delete tag from Firestore:', error);
    }
  }

  /**
   * Subscribe to real-time tag updates
   */
  subscribeToTags(
    callback: (tags: Tag[]) => void
  ): (() => void) | null {
    if (!isFirebaseEnabled || !firestore) {
      // No tags in offline mode
      callback([]);
      return () => {};
    }
    try {
      const q = query(collection(firestore, 'tags'), orderBy('name', 'asc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const tags = snapshot.docs.map((d) => docToTag(d));
          callback(tags);
        },
        (error) => {
          console.error('Firestore tags subscription error:', error);
          callback([]);
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error('Failed to subscribe to tags:', error);
      return null;
    }
  }

  // ─── Settings CRUD ───────────────────────────────────────────

  /**
   * Get dynamic AI models configuration from Firestore
   */
  async getAiModelsConfig(): Promise<any[] | null> {
    if (isFirebaseEnabled && firestore) {
      try {
        const docRef = doc(firestore, 'settings', 'ai_models');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.providers && Array.isArray(data.providers)) {
            return data.providers;
          }
        }
      } catch (error) {
        console.error('Failed to load AI models from Firestore:', error);
      }
    }
    return null;
  }
}

export const firebaseService = new FirebaseService();

// 导出初始化函数

