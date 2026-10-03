import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { db } from './storage/db';
import { initFirebase } from './storage/firebase';
import { AuthProvider } from './auth/AuthContext';
import PageErrorBoundary from './components/PageErrorBoundary';
import Layout from './components/Layout';
import PromptKitMascot from './mascot/Mascot';
const PromptList = lazy(() => import('./pages/PromptList'));
const PromptEditor = lazy(() => import('./pages/PromptEditor'));
const PromptRunner = lazy(() => import('./pages/PromptRunner'));
const PromptDetail = lazy(() => import('./pages/PromptDetail'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const SkillLab = lazy(() => import('./pages/SkillLab'));
const DevLibrary = lazy(() => import('./pages/DevLibrary'));
const AIInsights = lazy(() => import('./pages/AIInsights'));
const Admin = lazy(() => import('./pages/Admin'));
const About = lazy(() => import('./pages/About'));
import GoogleAnalytics from './components/GoogleAnalytics';
import './App.css';

/**
 * Conditionally wraps children in Layout sidebar.
 * Public routes (e.g. /p/:id) render without the sidebar.
 */
function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isPublicRoute = location.pathname.startsWith('/p/');

  if (isPublicRoute) {
    return <>{children}</>;
  }
  return <Layout>{children}</Layout>;
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize IndexedDB
    db.init()
      .then(() => {
        // Initialize Firebase - using default configuration (defined in firebase.ts)
        initFirebase();
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error('Failed to initialize database:', error);
        initFirebase();
        setIsInitialized(true);
      });
  }, []);

  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>Initializing...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <GoogleAnalytics />
      <AuthProvider>
        <ConditionalLayout>
          <PageErrorBoundary>
          <Suspense fallback={<div role="status" className="p-8 text-zinc-400">正在加载页面…</div>}>
          <Routes>
            {/* ── Public routes (no sidebar) ────────────────────── */}
            <Route path="/p/:id" element={<PromptDetail />} />

            {/* ── Studio routes (with sidebar) ──────────────────── */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/prompts" element={<PromptList />} />
            <Route path="/prompts/new" element={<PromptEditor />} />
            <Route path="/prompts/:id" element={<PromptEditor />} />
            <Route path="/prompts/:id/run" element={<PromptRunner />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/skill-lab" element={<SkillLab />} />
            <Route path="/dev-library" element={<DevLibrary />} />
            <Route path="/ai-insights" element={<AIInsights />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<div className="p-8"><h1 className="text-xl">页面不存在</h1><a href="/dashboard" className="btn-primary mt-4 inline-block">返回指令库首页</a></div>} />
          </Routes>
          </Suspense>
          </PageErrorBoundary>
        </ConditionalLayout>
        <PromptKitMascot />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
