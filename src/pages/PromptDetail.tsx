import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Zap, Copy as CopyIcon, Check, MoreHorizontal } from 'lucide-react';
import { type Prompt } from '../types';
import { promptService } from '../services/promptService';
import { useAuth } from '../auth/AuthContext';
import LoginModal from '../components/LoginModal';
import ReactMarkdown from 'react-markdown';
import './PromptDetail.css';

/**
 * Public-facing prompt detail page.
 * Renders at /p/:id — no sidebar, no author controls.
 * Only shows published (or legacy 'active') prompts.
 */
export default function PromptDetail() {
  const { id } = useParams<{ id: string }>();
  const { userEmail } = useAuth();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadPublishedPrompt(id);
    }
  }, [id]);

  async function loadPublishedPrompt(promptId: string) {
    setIsLoading(true);
    setNotFound(false);
    try {
      const loaded = await promptService.getPublishedPrompt(promptId);
      if (loaded) {
        setPrompt(loaded);
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error('Failed to load prompt:', error);
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCopy() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = prompt.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ── Loading state ──────────────────────────────────────────
  if (isLoading) {
    return <div className="detail-loading">Loading...</div>;
  }

  // ── Not found or not published ─────────────────────────────
  if (notFound || !prompt) {
    return (
      <div className="detail-not-found">
        <div className="detail-not-found-icon">🔍</div>
        <h2>Prompt Not Available</h2>
        <p>This prompt doesn't exist or hasn't been published yet.</p>
        <Link to="/prompts" className="detail-not-found-link">
          ← Browse All Prompts
        </Link>
      </div>
    );
  }

  // ── Render published prompt ────────────────────────────────
  return (
    <div className="prompt-detail">
      {/* ── Topbar ─────────────────────────────────────────── */}
      <div className="detail-topbar">
        <Link to="/prompts" className="detail-back-btn">
          <ArrowLeft size={14} />
          <span className="back-btn-desktop">Back to Library</span>
          <span className="back-btn-mobile">Back</span>
        </Link>
        <Link to="/prompts" className="detail-topbar-brand">
          Prompt Kit
        </Link>
        
        {/* Desktop Topbar Actions */}
        <div className="detail-topbar-actions desktop-only">
          <Link
            to={`/prompts/${prompt.id}`}
            className="detail-action-btn detail-action-edit"
            onClick={(e) => {
              if (!userEmail) {
                e.preventDefault();
                setIsLoginModalOpen(true);
              }
            }}
          >
            <Pencil size={13} /> Edit
          </Link>
          <Link
            to={`/prompts/${prompt.id}/run`}
            className="detail-action-btn detail-action-test"
            onClick={(e) => {
              if (!userEmail) {
                e.preventDefault();
                setIsLoginModalOpen(true);
              }
            }}
          >
            <Zap size={13} /> Test
          </Link>
          <button
            className={`detail-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? <><Check size={13} /> Copied</> : <><CopyIcon size={13} /> Copy Prompt</>}
          </button>
        </div>

        {/* Mobile Topbar Actions */}
        <div className="detail-topbar-actions mobile-only">
          <button
            className={`detail-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? <Check size={13} /> : <CopyIcon size={13} />}
            <span className="mobile-btn-label">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          
          <div className="mobile-dropdown-wrapper">
            <button
              className="detail-action-btn detail-action-more"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
            >
              <MoreHorizontal size={14} />
            </button>
            {isMenuOpen && (
              <>
                <div className="mobile-dropdown-backdrop" onClick={() => setIsMenuOpen(false)} />
                <div className="mobile-dropdown-menu animate-in fade-in slide-in-from-top-2 duration-150">
                  <Link
                    to={`/prompts/${prompt.id}`}
                    className="mobile-dropdown-item"
                    onClick={(e) => {
                      setIsMenuOpen(false);
                      if (!userEmail) {
                        e.preventDefault();
                        setIsLoginModalOpen(true);
                      }
                    }}
                  >
                    <Pencil size={13} /> Edit Template
                  </Link>
                  <Link
                    to={`/prompts/${prompt.id}/run`}
                    className="mobile-dropdown-item"
                    onClick={(e) => {
                      setIsMenuOpen(false);
                      if (!userEmail) {
                        e.preventDefault();
                        setIsLoginModalOpen(true);
                      }
                    }}
                  >
                    <Zap size={13} /> Test Prompt
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────── */}
      <div className="detail-container">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="detail-header">
          <h1 className="detail-title">{prompt.title}</h1>

          {prompt.summary && (
            <div className="detail-summary">
              <ReactMarkdown>{prompt.summary}</ReactMarkdown>
            </div>
          )}

          {/* ── Tags ───────────────────────────────────────── */}
          {prompt.tagNames && prompt.tagNames.length > 0 && (
            <div className="detail-tags">
              {prompt.tagNames.map((tag, idx) => (
                <span key={`tag-${idx}`} className="detail-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* ── Meta row ───────────────────────────────────── */}
          <div className="detail-meta">
            {prompt.category && (
              <span className="detail-meta-item">
                <span className="meta-icon">📂</span>
                {prompt.category}
              </span>
            )}
            {prompt.language && (
              <span className="detail-meta-item">
                <span className="meta-icon">🌐</span>
                {prompt.language}
              </span>
            )}
            {prompt.updatedAt && (
              <span className="detail-meta-item">
                <span className="meta-icon">📅</span>
                Updated {new Date(prompt.updatedAt).toLocaleDateString()}
              </span>
            )}
            {prompt.usageCount !== undefined && prompt.usageCount > 0 && (
              <span className="detail-meta-item">
                <span className="meta-icon">📊</span>
                Used {prompt.usageCount} times
              </span>
            )}
          </div>
        </div>

        {/* ── Prompt Content ───────────────────────────────── */}
        <div className="detail-section">
          <div className="detail-section-header">
            <h2 className="detail-section-title">Prompt</h2>
            <button
              className={`detail-copy-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? <><Check size={13} /> Copied</> : <><CopyIcon size={13} /> Copy</>}
            </button>
          </div>
          <div className="detail-content-block">
            <pre className="detail-content-text">{prompt.content}</pre>
          </div>
        </div>

        {/* ── Sample Output ────────────────────────────────── */}
        <div className="detail-section">
          <div className="detail-section-header">
            <h2 className="detail-section-title">Sample Output</h2>
          </div>
          {prompt.sampleOutput ? (
            <div className="detail-sample-output">
              <div className="detail-sample-label">
                <span>✨</span> Example AI Response
              </div>
              <div className="detail-sample-text">
                <ReactMarkdown>{prompt.sampleOutput}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="detail-sample-placeholder">
              <div className="detail-sample-placeholder-icon">💡</div>
              <p className="detail-sample-placeholder-text">
                No sample output yet. Copy the prompt above and try it with your preferred AI assistant.
              </p>
            </div>
          )}
        </div>
      </div>
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title="Sign in to continue"
        description="Please sign in to edit or test prompts."
      />
    </div>
  );
}
