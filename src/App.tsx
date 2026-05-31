import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { db } from './storage/db';
import { initFirebase } from './storage/firebase';
import { AuthProvider } from './auth/AuthContext';
import Layout from './components/Layout';
import PromptList from './pages/PromptList';
import PromptEditor from './pages/PromptEditor';
import PromptRunner from './pages/PromptRunner';
import PromptDetail from './pages/PromptDetail';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import SkillLab from './pages/SkillLab';
import DevLibrary from './pages/DevLibrary';
import AIInsights from './pages/AIInsights';
import Admin from './pages/Admin';
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
        setIsInitialized(true); // Continue even if failed, to show error
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
      <AuthProvider>
        <ConditionalLayout>
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
          </Routes>
        </ConditionalLayout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
