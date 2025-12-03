// IndexedDB 数据存储层

import { type Prompt, type Collection, type Run, type SmartView, type ShareLink } from '../types';

const DB_NAME = 'PromptKitDB';
const DB_VERSION = 1;

const STORES = {
  prompts: 'prompts',
  collections: 'collections',
  runs: 'runs',
  smartViews: 'smartViews',
  shareLinks: 'shareLinks',
  settings: 'settings',
};

class Database {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建对象存储
        if (!db.objectStoreNames.contains(STORES.prompts)) {
          const promptStore = db.createObjectStore(STORES.prompts, { keyPath: 'id' });
          promptStore.createIndex('title', 'title', { unique: false });
          promptStore.createIndex('createdAt', 'createdAt', { unique: false });
          promptStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.collections)) {
          const collectionStore = db.createObjectStore(STORES.collections, { keyPath: 'id' });
          collectionStore.createIndex('name', 'name', { unique: false });
          collectionStore.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.runs)) {
          const runStore = db.createObjectStore(STORES.runs, { keyPath: 'id' });
          runStore.createIndex('promptId', 'promptId', { unique: false });
          runStore.createIndex('createdAt', 'createdAt', { unique: false });
          runStore.createIndex('model', 'model', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.smartViews)) {
          db.createObjectStore(STORES.smartViews, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.shareLinks)) {
          const shareLinkStore = db.createObjectStore(STORES.shareLinks, { keyPath: 'id' });
          shareLinkStore.createIndex('token', 'token', { unique: true });
          shareLinkStore.createIndex('promptId', 'promptId', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'key' });
        }
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Prompt CRUD
  async savePrompt(prompt: Prompt): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.prompts, 'readwrite');
      const request = store.put(prompt);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPrompt(id: string): Promise<Prompt | null> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.prompts);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllPrompts(): Promise<Prompt[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.prompts);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePrompt(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.prompts, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async searchPrompts(query: string): Promise<Prompt[]> {
    const allPrompts = await this.getAllPrompts();
    const lowerQuery = query.toLowerCase();
    return allPrompts.filter(
      (p) =>
        p.title.toLowerCase().includes(lowerQuery) ||
        p.content.toLowerCase().includes(lowerQuery)
    );
  }

  // Collection CRUD
  async saveCollection(collection: Collection): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.collections, 'readwrite');
      const request = store.put(collection);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCollection(id: string): Promise<Collection | null> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.collections);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCollections(): Promise<Collection[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.collections);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Run CRUD
  async saveRun(run: Run): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.runs, 'readwrite');
      const request = store.put(run);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getRun(id: string): Promise<Run | null> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.runs);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getRunsByPromptId(promptId: string): Promise<Run[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.runs);
      const index = store.index('promptId');
      const request = index.getAll(promptId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllRuns(): Promise<Run[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.runs);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // SmartView CRUD
  async saveSmartView(view: SmartView): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.smartViews, 'readwrite');
      const request = store.put(view);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSmartViews(): Promise<SmartView[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.smartViews);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSmartView(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.smartViews, 'readwrite');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ShareLink CRUD
  async saveShareLink(link: ShareLink): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.shareLinks, 'readwrite');
      const request = store.put(link);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getShareLinkByToken(token: string): Promise<ShareLink | null> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.shareLinks);
      const index = store.index('token');
      const request = index.get(token);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Settings
  async getSetting(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.settings);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSetting(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(STORES.settings, 'readwrite');
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new Database();

