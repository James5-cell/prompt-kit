import { useEffect, useRef, useState, useId } from 'react';
import { X, LogIn } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import './LoginModal.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Sign in to continue",
  description = "You need to log in to access this feature."
}: LoginModalProps) {
  const { loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const items = Array.from(modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input') ?? []);
      const first = items[0], last = items[items.length - 1];
      if (!first) { e.preventDefault(); return; }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const handleLogin = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await loginWithGoogle();
      onClose();
      onSuccess?.();
    } catch (err) {
      console.error('Login failed', err);
      setError('登录未完成，请重试。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-modal-overlay" onClick={handleBackdropClick}>
      <div className="login-modal-card" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <button className="login-modal-close" onClick={onClose} aria-label="Close modal">
          <X size={18} />
        </button>
        <div className="login-modal-icon">🔒</div>
        <h2 id={titleId} className="login-modal-title">{title}</h2>
        <p id={descriptionId} className="login-modal-desc">{description}</p>
        {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
        <button className="login-modal-btn" disabled={busy} onClick={handleLogin}>
          <LogIn size={16} /> {busy ? '正在登录…' : '使用 Google 登录'}
        </button>
      </div>
    </div>
  );
}
