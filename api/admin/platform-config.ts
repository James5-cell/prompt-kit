import { getPlatformConfig, savePlatformConfig, initDb } from '../_lib/db.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface VercelRequest {
  method?: string;
  headers: Record<string, string>;
  body?: {
    defaultProvider?: string;
    defaultModel?: string;
  };
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
}

// Dynamically verify ID Token and check if the user is an admin
async function verifyAdminToken(req: VercelRequest): Promise<{ uid: string } | null> {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('[API Admin] Missing or invalid Authorization header');
    return null;
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    // Ensure Firebase Admin App is initialized
    await initDb();
    
    const { getAuth } = await import('firebase-admin/auth');
    const decodedToken = await getAuth().verifyIdToken(idToken);
    
    console.log('[API Admin] Token verified successfully. UID:', decodedToken.uid, 'Claims:', JSON.stringify(decodedToken));
    
    // Check custom claims for admin attribute
    if (decodedToken.admin === true) {
      return { uid: decodedToken.uid };
    } else {
      console.warn('[API Admin] User does not have admin claim. claims.admin:', decodedToken.admin);
    }
  } catch (error) {
    console.error('[API Admin] Token verification failed with error:', error);
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  try {
    // 1. GET Request: Fetch current configuration (publicly accessible or auth restricted - public GET is fine for setting drop-downs/fallbacks)
    if (req.method === 'GET') {
      const config = await getPlatformConfig();
      if (!config) {
        return res.status(200).json({ defaultProvider: '', defaultModel: '' });
      }
      return res.status(200).json({
        defaultProvider: config.defaultProvider || '',
        defaultModel: config.defaultModel || '',
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy,
      });
    }

    // 2. POST Request: Save configuration (requires Admin authentication)
    if (req.method === 'POST') {
      const adminUser = await verifyAdminToken(req);
      if (!adminUser) {
        return res.status(403).json({ error: 'Access forbidden: Admin permissions required' });
      }

      const { defaultProvider, defaultModel } = req.body || {};
      if (!defaultProvider || !defaultModel) {
        return res.status(400).json({ error: 'Both defaultProvider and defaultModel are required' });
      }

      await savePlatformConfig({
        defaultProvider,
        defaultModel,
        updatedBy: adminUser.uid,
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[API Admin] Error in platform-config handler:', error);
    return res.status(500).json({ error: `Server error: ${error.message || error}` });
  }
}
