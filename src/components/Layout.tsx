import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ICON_SIZE } from '../config/iconSizes';
import { Icon as RiIcon } from '@iconify/react';
import {
  Plus,
  LogOut,
  LogIn,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Terminal
} from 'lucide-react';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isAuthReady, userEmail, isAdmin, loginWithGoogle, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(true);

  // ── Main nav: RI line = inactive, RI fill = active ─────────────────────
  const navItems = [
    { path: '/dashboard', label: 'Dashboard',      icon: 'ri:dashboard-3-line',  iconActive: 'ri:dashboard-3-fill'  },
    { path: '/prompts',   label: 'Prompt Library', icon: 'ri:book-shelf-line',   iconActive: 'ri:book-shelf-fill'   },
    { path: '/about',     label: 'About & E-E-A-T', icon: 'ri:information-line', iconActive: 'ri:information-fill' },
    { path: '/settings',  label: 'Settings',        icon: 'ri:settings-4-line',   iconActive: 'ri:settings-4-fill'   },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', label: 'Admin Panel', icon: 'ri:shield-keyhole-line', iconActive: 'ri:shield-keyhole-fill' });
  }

  return (
    <div className="layout">
      {/* Mobile Topbar */}
      <div className="mobile-topbar" style={{ display: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={ICON_SIZE.md} className="terminal-glow-icon" />
          <h1>Prompt Kit</h1>
        </div>
        <button 
          className="menu-toggle" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={ICON_SIZE.lg} /> : <Menu size={ICON_SIZE.lg} />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Terminal size={ICON_SIZE.lg} className="text-primary animate-pulse" />
            <h1 className="desktop-title">Prompt Kit</h1>
          </div>
          <p className="desktop-subtitle">Professional Prompt Management</p>
          <div className="signature desktop-subtitle">
            <span className="signature-glow"></span>
            by postsoma-2050
          </div>
          
          <div className="user-profile-card">
            {isAuthReady ? (
              <>
                <div className="user-info">
                  {userEmail ? (
                    <>
                      <span className="user-email">{userEmail}</span>
                      {isAdmin ? (
                        <span className="badge badge-admin">Admin</span>
                      ) : (
                        <span className="badge badge-viewer">Viewer</span>
                      )}
                    </>
                  ) : (
                    <span className="user-status-text">Not signed in</span>
                  )}
                </div>
                {userEmail ? (
                  <button className="btn-secondary btn-auth" onClick={logout}>
                    <LogOut size={ICON_SIZE.sm} style={{ marginRight: '6px' }} /> Logout
                  </button>
                ) : (
                  <button className="btn-primary btn-auth" onClick={loginWithGoogle}>
                    <LogIn size={ICON_SIZE.sm} style={{ marginRight: '6px' }} /> Login
                  </button>
                )}
              </>
            ) : (
              <span className="loading-dots">Checking login</span>
            )}
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="nav-icon">
                  <RiIcon
                    icon={isActive ? item.iconActive : item.icon}
                    width={ICON_SIZE.md}
                    height={ICON_SIZE.md}
                  />
                </span>
                <span className="nav-label">{item.label}</span>
                {isActive && (
                  <motion.span 
                    layoutId="active-nav-indicator" 
                    className="active-indicator-glow" 
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          <div className="nav-group">
            <button 
              className="nav-group-header" 
              onClick={() => setIsExploreOpen(!isExploreOpen)}
              type="button"
            >
              <span className="nav-group-title">Explore</span>
              <span className="nav-group-arrow">
                {isExploreOpen ? <ChevronDown size={ICON_SIZE.xs} /> : <ChevronRight size={ICON_SIZE.xs} />}
              </span>
            </button>
            
            <AnimatePresence initial={false}>
              {isExploreOpen && (
                <motion.div 
                  className="nav-group-items"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <Link
                    to="/skill-lab"
                    className={`nav-item sub-item ${location.pathname === '/skill-lab' ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="nav-icon">
                      <RiIcon
                        icon={location.pathname === '/skill-lab' ? 'ri:graduation-cap-fill' : 'ri:graduation-cap-line'}
                        width={ICON_SIZE.md}
                        height={ICON_SIZE.md}
                      />
                    </span>
                    <span className="nav-label">Skill Lab</span>
                  </Link>
                  <Link
                    to="/dev-library"
                    className={`nav-item sub-item ${location.pathname === '/dev-library' ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="nav-icon">
                      <RiIcon
                        icon={location.pathname === '/dev-library' ? 'ri:code-box-fill' : 'ri:code-box-line'}
                        width={ICON_SIZE.md}
                        height={ICON_SIZE.md}
                      />
                    </span>
                    <span className="nav-label">DevLibrary</span>
                  </Link>
                  <Link
                    to="/ai-insights"
                    className={`nav-item sub-item ${location.pathname === '/ai-insights' ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="nav-icon">
                      <RiIcon
                        icon={location.pathname === '/ai-insights' ? 'ri:sparkling-2-fill' : 'ri:sparkling-2-line'}
                        width={ICON_SIZE.md}
                        height={ICON_SIZE.md}
                      />
                    </span>
                    <span className="nav-label">AI Insights</span>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {isAdmin && (
            <Link 
              to="/prompts/new" 
              className="new-prompt-btn"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Plus size={ICON_SIZE.sm} style={{ marginRight: '6px' }} /> New Prompt
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content Area with Page transitions */}
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ width: '100%', height: '100%' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
