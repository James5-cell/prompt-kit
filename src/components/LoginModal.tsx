import { useEffect, useRef } from 'react';
import { X, LogIn } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import './LoginModal.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export default function LoginModal({
  isOpen,
  onClose,
  title = "Sign in to continue",
  description = "You need to log in to access this feature."
}: LoginModalProps) {
  const { loginWithGoogle } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      onClose();
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  return (
    <div className="login-modal-overlay" onClick={handleBackdropClick}>
      <div className="login-modal-card" ref={modalRef}>
        <button className="login-modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>
        <div className="login-modal-icon">🔒</div>
        <h2 className="login-modal-title">{title}</h2>
        <p className="login-modal-desc">{description}</p>
        <button className="login-modal-btn" onClick={handleLogin}>
          <LogIn size={16} /> Login with Google
        </button>
      </div>
    </div>
  );
}
