import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, LogOut, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../auth/AuthContext';
import { ICON_SIZE } from '../config/iconSizes';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { path: '/dashboard', label: '首页' },
  { path: '/prompts', label: '指令库' },
  { path: '/settings', label: '模型设置' },
  { path: '/about', label: '关于' },
] as const;

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isAuthReady, userEmail, isAdmin, loginWithGoogle, logout } = useAuth();

  const isItemActive = (path: string) =>
    location.pathname === path ||
    (path !== '/dashboard' && location.pathname.startsWith(`${path}/`));

  return (
    <div className="layout">
      <header className="top-navbar">
        <div className="top-navbar-inner">
          <Link to="/dashboard" className="brand-link" aria-label="Prompt Kit 首页">
            <img
              className="brand-mark"
              src="/favicon.svg"
              alt=""
              width="30"
              height="30"
              aria-hidden="true"
            />
            <span className="brand-name">Prompt Kit</span>
          </Link>

          <nav className="primary-nav" aria-label="主导航">
            {NAV_ITEMS.map((item) => {
              const isActive = isItemActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`top-nav-item${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <motion.span
                      layoutId="top-nav-active"
                      className="top-nav-active-bg"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span>{item.label}</span>
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                className={`top-nav-item${isItemActive('/admin') ? ' is-active' : ''}`}
                aria-current={isItemActive('/admin') ? 'page' : undefined}
              >
                管理后台
              </Link>
            )}
          </nav>

          <div className="account-area">
            {!isAuthReady ? (
              <span className="auth-loading" aria-label="正在检查登录状态">•••</span>
            ) : userEmail ? (
              <>
                <span className="account-chip" title={userEmail}>
                  <span className="account-email">{userEmail}</span>
                  {isAdmin && <span className="admin-badge">Admin</span>}
                </span>
                {isAdmin && (
                  <Link to="/prompts/new" className="new-prompt-shortcut" aria-label="新建指令" title="新建指令">
                    <Plus size={ICON_SIZE.sm} />
                  </Link>
                )}
                <button className="icon-action" type="button" onClick={logout} aria-label="退出登录" title="退出登录">
                  <LogOut size={ICON_SIZE.sm} />
                </button>
              </>
            ) : (
              <button className="login-button" type="button" onClick={loginWithGoogle}>
                <LogIn size={ICON_SIZE.sm} />
                <span>登录</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className="main-content-inner"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
