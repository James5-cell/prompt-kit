import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { db } from './storage/db';
import { initFirebase } from './storage/firebase';
import Layout from './components/Layout';
import PromptList from './pages/PromptList';
import PromptEditor from './pages/PromptEditor';
import PromptRunner from './pages/PromptRunner';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import './App.css';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // 初始化 IndexedDB
    db.init()
      .then(() => {
        // 初始化 Firebase（如果配置了）
        // 可以从环境变量或设置中读取配置
        const firebaseConfig = import.meta.env.VITE_FIREBASE_CONFIG
          ? JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG)
          : undefined;
        initFirebase(firebaseConfig);
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error('Failed to initialize database:', error);
        setIsInitialized(true); // 即使失败也继续，以便显示错误
      });
  }, []);

  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>正在初始化...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/prompts" element={<PromptList />} />
          <Route path="/prompts/new" element={<PromptEditor />} />
          <Route path="/prompts/:id" element={<PromptEditor />} />
          <Route path="/prompts/:id/run" element={<PromptRunner />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
