import { Timestamp } from 'firebase-admin/firestore';

let db: any = null;

export async function initDb() {
  if (db) return db;

  try {
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');

    if (getApps().length === 0) {
      const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (serviceAccountEnv) {
        const serviceAccount = JSON.parse(serviceAccountEnv);
        initializeApp({ credential: cert(serviceAccount) });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
      } else {
        // Fallback for local development when credentials envs aren't configured
        initializeApp({ projectId: 'prompt-kit-7a67e' });
      }
    }

    db = getFirestore();
    return db;
  } catch (error) {
    console.warn('[Backend DB] Failed to initialize firebase-admin:', error);
    return null;
  }
}

export async function getPlatformConfig() {
  try {
    const firestore = await initDb();
    if (!firestore) return null;
    const docRef = firestore.collection('platform_config').doc('default');
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return docSnap.data();
    }
  } catch (error) {
    console.error('[Backend DB] Failed to fetch platform config:', error);
  }
  return null;
}

export async function savePlatformConfig(config: {
  defaultProvider: string;
  defaultModel: string;
  updatedBy: string;
}) {
  try {
    const firestore = await initDb();
    if (!firestore) throw new Error('Database is not initialized');
    const docRef = firestore.collection('platform_config').doc('default');
    await docRef.set({
      defaultProvider: config.defaultProvider,
      defaultModel: config.defaultModel,
      updatedAt: Timestamp.now(),
      updatedBy: config.updatedBy,
    }, { merge: true });
    console.log('[Backend DB] Saved platform config:', config);
  } catch (error) {
    console.error('[Backend DB] Failed to save platform config:', error);
    throw error;
  }
}
