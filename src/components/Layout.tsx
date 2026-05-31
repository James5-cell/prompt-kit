import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isAuthReady, userEmail, isAdmin, loginWithGoogle, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(true);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/prompts', label: 'Prompt Library', icon: '📝' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', label: 'Admin Panel', icon: '🛡️' });
  }

  return (
    <div className="layout">
      <div className="mobile-topbar" style={{ display: 'none' }}>
        <h1>Prompt Kit</h1>
        <button 
          className="menu-toggle" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="desktop-title">Prompt Kit</h1>
          <p className="desktop-subtitle">Professional Prompt Management</p>
          <div className="signature desktop-subtitle">by postsoma-2050</div>
          <div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.9 }}>
            {isAuthReady ? (
              <>
                <div style={{ marginBottom: '6px' }}>
                  {userEmail ? (
                    <>
                      <span style={{ fontWeight: 600 }}>{userEmail}</span>
                      {isAdmin ? (
                        <span style={{ marginLeft: '8px', color: 'var(--primary)' }}>Admin</span>
                      ) : (
                        <span style={{ marginLeft: '8px', color: 'var(--text-faint)' }}>Viewer</span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-faint)' }}>Not signed in</span>
                  )}
                </div>
                {userEmail ? (
                  <button className="btn-secondary" onClick={logout} style={{ width: '100%' }}>
                    Logout
                  </button>
                ) : (
                  <button className="btn-secondary" onClick={loginWithGoogle} style={{ width: '100%' }}>
                    Login with Google
                  </button>
                )}
              </>
            ) : (
              <span style={{ color: 'var(--text-faint)' }}>Checking login…</span>
            )}
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}

          <div className="nav-group">
            <button 
              className="nav-group-header" 
              onClick={() => setIsExploreOpen(!isExploreOpen)}
              type="button"
            >
              <span className="nav-group-title">Explore</span>
              <span className="nav-group-arrow">{isExploreOpen ? '▼' : '▶'}</span>
            </button>
            {isExploreOpen && (
              <div className="nav-group-items">
                <Link
                  to="/skill-lab"
                  className={`nav-item sub-item ${location.pathname === '/skill-lab' ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="nav-icon">🎓</span>
                  <span className="nav-label">Skill Lab</span>
                </Link>
                <Link
                  to="/dev-library"
                  className={`nav-item sub-item ${location.pathname === '/dev-library' ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="nav-icon">💻</span>
                  <span className="nav-label">DevLibrary</span>
                </Link>
                <Link
                  to="/ai-insights"
                  className={`nav-item sub-item ${location.pathname === '/ai-insights' ? 'active' : ''}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="nav-icon">✨</span>
                  <span className="nav-label">AI Insights</span>
                </Link>
              </div>
            )}
          </div>
        </nav>
        <div className="sidebar-footer">
          {isAdmin && (
            <Link 
              to="/prompts/new" 
              className="new-prompt-btn"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              ➕ New Prompt
            </Link>
          )}
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

