import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon as RiIcon } from '@iconify/react';
import { ICON_SIZE } from '../config/iconSizes';
// All icons now use @iconify/react (RiIcon) — no Lucide imports needed
import { type Prompt } from '../types';
import { promptService } from '../services/promptService';
import { useAuth } from '../auth/AuthContext';
import LoginModal from '../components/LoginModal';
import ReactMarkdown from 'react-markdown';
import SEOHead from '../components/SEOHead';
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
        <div className="detail-not-found-icon">
          <RiIcon icon="ri:search-eye-line" width={ICON_SIZE.xxl} height={ICON_SIZE.xxl} style={{ opacity: 0.5 }} />
        </div>
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
      <SEOHead
        title={prompt.title}
        description={prompt.summary || prompt.content.slice(0, 160)}
        canonical={`https://www.205011.xyz/p/${prompt.id}`}
        ogType="article"
        ogImage="https://www.205011.xyz/og-image.png"
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Article',
              '@id': `https://www.205011.xyz/p/${prompt.id}#article`,
              'url': `https://www.205011.xyz/p/${prompt.id}`,
              'headline': prompt.title,
              'description': prompt.summary || prompt.content.slice(0, 160),
              'inLanguage': prompt.language === 'english' ? 'en' : 'zh-Hant',
              'author': {
                '@type': 'Person',
                'name': 'James5-cell'
              },
              'publisher': {
                '@id': 'https://www.205011.xyz/#organization'
              },
              'datePublished': prompt.createdAt ? new Date(prompt.createdAt).toISOString() : new Date().toISOString(),
              'dateModified': prompt.updatedAt ? new Date(prompt.updatedAt).toISOString() : new Date().toISOString(),
              'articleSection': prompt.category || 'Tools'
            },
            {
              '@type': 'HowTo',
              '@id': `https://www.205011.xyz/p/${prompt.id}#howto`,
              'name': `How to use ${prompt.title}`,
              'description': prompt.summary || 'Execute this prompt in ChatGPT, Claude, Gemini or Prompt Kit workbench.',
              'step': [
                {
                  '@type': 'HowToStep',
                  'name': 'Copy Prompt',
                  'text': 'Copy the structured prompt text from Prompt Kit.'
                },
                {
                  '@type': 'HowToStep',
                  'name': 'Execute in LLM Engine',
                  'text': 'Paste into target AI model or run directly using Prompt Kit multi-model executor.'
                }
              ]
            },
            {
              '@type': 'BreadcrumbList',
              '@id': `https://www.205011.xyz/p/${prompt.id}#breadcrumb`,
              'itemListElement': [
                {
                  '@type': 'ListItem',
                  'position': 1,
                  'name': 'Home',
                  'item': 'https://www.205011.xyz/'
                },
                {
                  '@type': 'ListItem',
                  'position': 2,
                  'name': 'Prompts Catalog',
                  'item': 'https://www.205011.xyz/prompts'
                },
                {
                  '@type': 'ListItem',
                  'position': 3,
                  'name': prompt.title,
                  'item': `https://www.205011.xyz/p/${prompt.id}`
                }
              ]
            }
          ]
        }}
      />
      {/* ── Topbar ─────────────────────────────────────────── */}
      <div className="detail-topbar">
        <Link to="/prompts" className="detail-back-btn">
          <span className="back-icon">
            <RiIcon icon="ri:arrow-left-s-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
          </span>
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
            <span className="btn-dual-icon">
              <RiIcon icon="ri:edit-line"  className="icon-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
              <RiIcon icon="ri:edit-fill"  className="icon-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
            </span> Edit
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
            <span className="btn-dual-icon">
              <RiIcon icon="ri:play-circle-line" className="icon-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
              <RiIcon icon="ri:play-circle-fill" className="icon-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
            </span> Test
          </Link>
          <button
            className={`detail-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied
              ? <><RiIcon icon="ri:checkbox-circle-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} /> Copied</>
              : <><span className="btn-dual-icon">
                  <RiIcon icon="ri:clipboard-line" className="icon-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                  <RiIcon icon="ri:clipboard-fill" className="icon-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                </span> Copy Prompt</>}
          </button>
        </div>

        {/* Mobile Topbar Actions */}
        <div className="detail-topbar-actions mobile-only">
          <button
            className={`detail-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied
              ? <RiIcon icon="ri:checkbox-circle-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
              : <span className="btn-dual-icon">
                  <RiIcon icon="ri:clipboard-line" className="icon-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                  <RiIcon icon="ri:clipboard-fill" className="icon-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                </span>}
            <span className="mobile-btn-label">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          
          <div className="mobile-dropdown-wrapper">
            <button
              className={`detail-action-btn detail-action-more ${isMenuOpen ? 'is-open' : ''}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
            >
              <RiIcon
                icon={isMenuOpen ? 'ri:close-circle-line' : 'ri:more-2-line'}
                width={ICON_SIZE.sm}
                height={ICON_SIZE.sm}
              />
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
                    <span className="btn-dual-icon">
                      <RiIcon icon="ri:edit-line" className="icon-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                      <RiIcon icon="ri:edit-fill" className="icon-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                    </span> Edit Template
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
                    <span className="btn-dual-icon">
                      <RiIcon icon="ri:play-circle-line" className="icon-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                      <RiIcon icon="ri:play-circle-fill" className="icon-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                    </span> Test Prompt
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
                <span className="meta-icon"><RiIcon icon="ri:folder-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} /></span>
                {prompt.category}
              </span>
            )}
            {prompt.language && (
              <span className="detail-meta-item">
                <span className="meta-icon"><RiIcon icon="ri:earth-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} /></span>
                {prompt.language}
              </span>
            )}
            {prompt.updatedAt && (
              <span className="detail-meta-item">
                <span className="meta-icon"><RiIcon icon="ri:calendar-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} /></span>
                Updated {new Date(prompt.updatedAt).toLocaleDateString()}
              </span>
            )}
            {prompt.usageCount !== undefined && prompt.usageCount > 0 && (
              <span className="detail-meta-item">
                <span className="meta-icon"><RiIcon icon="ri:bar-chart-box-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} /></span>
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
              {copied
                ? <><RiIcon icon="ri:checkbox-circle-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} /> Copied</>
                : <><span className="btn-dual-icon">
                    <RiIcon icon="ri:clipboard-line" className="icon-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                    <RiIcon icon="ri:clipboard-fill" className="icon-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                  </span> Copy</>}
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
                <span><RiIcon icon="ri:sparkling-2-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} /></span> Example AI Response
              </div>
              <div className="detail-sample-text">
                <ReactMarkdown>{prompt.sampleOutput}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="detail-sample-placeholder">
              <div className="detail-sample-placeholder-icon">
                <RiIcon icon="ri:lightbulb-line" width={ICON_SIZE.xxl} height={ICON_SIZE.xxl} />
              </div>
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
