import { canTryPrompt } from '../utils/promptUsage';
import {
  extractPromptVariableTokens,
  fillPromptVariables,
  getPromptUsagePlan,
} from '../utils/promptDisplay';
import { getPromptCategoryMeta } from '../config/categoryMeta';
import { resolveReturnTo } from '../utils/returnTo';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
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
  const location = useLocation();
  const { userEmail, isAdmin } = useAuth();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLongPromptExpanded, setIsLongPromptExpanded] = useState(false);
  const [isVariableGuideExpanded, setIsVariableGuideExpanded] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  // Back destination: validated local list path from the navigating link,
  // falling back to the public catalog for direct loads.
  const returnTo = resolveReturnTo(location.state);

  useEffect(() => {
    setVariableValues({});
    setIsLongPromptExpanded(false);
    setIsVariableGuideExpanded(false);
    if (id) {
      loadPublishedPrompt(id);
    }
  }, [id]);

  // Mobile "More" menu closes on Escape and hands focus back to its trigger.
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        moreButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

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
    const copyText = fillPromptVariables(prompt.content, variableValues);
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = copyText;
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
    return <div className="detail-loading" role="status">正在读取指令…</div>;
  }

  // ── Not found or not published ─────────────────────────────
  if (notFound || !prompt) {
    return (
      <div className="detail-not-found">
        <div className="detail-not-found-icon">
          <RiIcon icon="ri:search-eye-line" width={ICON_SIZE.xxl} height={ICON_SIZE.xxl} style={{ opacity: 0.5 }} />
        </div>
        <h2>指令暂不可用</h2>
        <p>这条指令不存在，或尚未公开发布。</p>
        <Link to={returnTo} className="detail-not-found-link">
          ← 返回指令库
        </Link>
      </div>
    );
  }

  const usagePlan = getPromptUsagePlan(prompt);
  const categoryMeta = getPromptCategoryMeta(prompt.category);
  const promptVariables = extractPromptVariableTokens(prompt.content);
  const filledContent = fillPromptVariables(prompt.content, variableValues);
  const filledVariableCount = promptVariables.filter(variable => variableValues[variable.token]?.trim()).length;
  const hasAnyVariableValue = filledVariableCount > 0;
  const trialState = { returnTo, prefillText: filledContent };
  const isLongPrompt = prompt.content.length > 1800 || prompt.content.split('\n').length > 32;
  const summaryParts = splitPromptSummary(prompt.summary ?? '');

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
              'articleSection': categoryMeta.label
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
        <Link to={returnTo} className="detail-back-btn" aria-label="返回指令库">
          <span className="back-icon">
            <RiIcon icon="ri:arrow-left-s-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
          </span>
          <span className="back-btn-desktop">返回指令库</span>
          <span className="back-btn-mobile">返回</span>
        </Link>
        <Link to="/prompts" className="detail-topbar-brand">
          Prompt Kit
        </Link>
        
        {/* Desktop Topbar Actions */}
        <div className="detail-topbar-actions desktop-only">
          {isAdmin && (
            <Link
              to={`/prompts/${prompt.id}`}
              className="detail-action-btn detail-action-edit"
            >
              <span className="btn-dual-icon">
                <RiIcon icon="ri:edit-line" className="icon-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                <RiIcon icon="ri:edit-fill" className="icon-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
              </span> 编辑
            </Link>
          )}
          {canTryPrompt(prompt) && (
            <Link
              to={`/prompts/${prompt.id}/run`}
              className="detail-action-btn detail-action-test"
              state={trialState}
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
              </span> 在线试用
            </Link>
          )}
          <button
            className={`detail-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            aria-label={copied ? '已复制成品指令' : hasAnyVariableValue ? '复制成品指令' : '复制指令'}
          >
            {copied
              ? <><RiIcon icon="ri:checkbox-circle-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} /> 已复制</>
              : <><span className="btn-dual-icon">
                  <RiIcon icon="ri:clipboard-line" className="icon-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                  <RiIcon icon="ri:clipboard-fill" className="icon-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                </span> {hasAnyVariableValue ? '复制成品指令' : '复制指令'}</>}
          </button>
        </div>

        {/* Mobile Topbar Actions */}
        <div className="detail-topbar-actions mobile-only">
          <button
            className={`detail-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            aria-label={copied ? '已复制成品指令' : hasAnyVariableValue ? '复制成品指令' : '复制指令'}
          >
            {copied
              ? <RiIcon icon="ri:checkbox-circle-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
              : <span className="btn-dual-icon">
                  <RiIcon icon="ri:clipboard-line" className="icon-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                  <RiIcon icon="ri:clipboard-fill" className="icon-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                </span>}
            <span className="mobile-btn-label">
              {copied ? '已复制' : hasAnyVariableValue ? '复制成品' : '复制指令'}
            </span>
          </button>
          
          {(isAdmin || canTryPrompt(prompt)) && <div className="mobile-dropdown-wrapper">
            <button
              ref={moreButtonRef}
              className={`detail-action-btn detail-action-more ${isMenuOpen ? 'is-open' : ''}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-haspopup="true"
              aria-expanded={isMenuOpen}
              aria-controls="detail-mobile-actions-menu"
              aria-label={isMenuOpen ? '收起更多操作' : '更多操作'}
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
                <div
                  id="detail-mobile-actions-menu"
                  className="mobile-dropdown-menu animate-in fade-in slide-in-from-top-2 duration-150"
                  aria-label="更多操作"
                >
                  {isAdmin && (
                    <Link
                      to={`/prompts/${prompt.id}`}
                      className="mobile-dropdown-item"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="btn-dual-icon">
                        <RiIcon icon="ri:edit-line" className="icon-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                        <RiIcon icon="ri:edit-fill" className="icon-fill" width={ICON_SIZE.sm} height={ICON_SIZE.sm} />
                      </span> 编辑指令
                    </Link>
                  )}
                  {canTryPrompt(prompt) && (
                    <Link
                      to={`/prompts/${prompt.id}/run`}
                      className="mobile-dropdown-item"
                      state={trialState}
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
                      </span> 在线试用
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>}
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────── */}
      <div className="detail-container">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="detail-header">
          <h1 className="detail-title">{prompt.title}</h1>

          {summaryParts.core && (
            <div className="detail-summary detail-summary-core">
              <ReactMarkdown>{summaryParts.core}</ReactMarkdown>
            </div>
          )}
          {summaryParts.variableGuide && (
            <div className="detail-variable-guide">
              <button
                type="button"
                className="detail-variable-toggle"
                aria-expanded={isVariableGuideExpanded}
                aria-controls="detail-variable-guide-content"
                onClick={() => setIsVariableGuideExpanded(expanded => !expanded)}
              >
                <span>
                  <strong>变量替换与填写示例</strong>
                  <small>英文原文与占位符示例</small>
                </span>
                <RiIcon
                  icon={isVariableGuideExpanded ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'}
                  width={ICON_SIZE.md}
                  height={ICON_SIZE.md}
                />
              </button>
              {isVariableGuideExpanded && (
                <div id="detail-variable-guide-content" className="detail-variable-content">
                  <ReactMarkdown>{summaryParts.variableGuide}</ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* Trial-aware usage panel. External-only prompts keep the page focused on copy + details. */}
          {canTryPrompt(prompt) && (
            <div className="detail-use-guide">
              <div className="detail-use-copy">
                <span className="detail-use-kicker">使用方式</span>
                <h2>{usagePlan.title}</h2>
                <p>{usagePlan.summary}</p>
              </div>
              <div className="detail-primary-cta">
                <Link
                  to={`/prompts/${prompt.id}/run`}
                  state={trialState}
                  className="detail-secondary-cta"
                  onClick={(e) => {
                    if (!userEmail) {
                      e.preventDefault();
                      setIsLoginModalOpen(true);
                    }
                  }}
                >
                  {hasAnyVariableValue ? '用已填内容试用' : '填写文本并试用'}
                </Link>
              </div>
              {usagePlan.needsPreparation && (
                <div className="detail-use-requirements">
                  {usagePlan.hasVariables && (
                    <p>
                      <strong>先替换变量：</strong>
                      {usagePlan.variables.slice(0, 6).map(variable => <code key={variable}>{variable}</code>)}
                      {usagePlan.variables.length > 6 && <span>等 {usagePlan.variables.length} 项</span>}
                    </p>
                  )}
                  {(usagePlan.needsText || prompt.inputHint) && (
                    <p><strong>{usagePlan.needsText ? '需要文本：' : '输入要求：'}</strong>{prompt.inputHint || '补充要处理的正文。'}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {promptVariables.length > 0 && (
            <section className="detail-variable-filler" aria-labelledby="variable-filler-title">
              <div className="detail-variable-filler-head">
                <div>
                  <span className="detail-use-kicker">快速填写变量</span>
                  <h2 id="variable-filler-title">填完即可复制成品</h2>
                </div>
                <span className="detail-variable-progress">
                  已填写 {filledVariableCount}/{promptVariables.length}
                </span>
              </div>
              <p className="detail-variable-filler-desc">
                填写后会实时替换下方预览和复制内容；留空时仍复制原模板。
              </p>
              <div className="detail-variable-fields">
                {promptVariables.map((variable, index) => (
                  <label key={variable.token} className="detail-variable-field">
                    <span>
                      <strong>{variable.name}</strong>
                      <code>{variable.token}</code>
                    </span>
                    <input
                      type="text"
                      value={variableValues[variable.token] ?? ''}
                      placeholder={`填写${variable.name}`}
                      aria-label={`填写变量 ${variable.name}`}
                      autoComplete="off"
                      onChange={(event) => {
                        const value = event.target.value;
                        setVariableValues(current => ({ ...current, [variable.token]: value }));
                      }}
                    />
                    <span className="detail-variable-index" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </label>
                ))}
              </div>
              <div className="detail-variable-preview">
                <div className="detail-variable-preview-head">
                  <span>实时预览</span>
                  {hasAnyVariableValue && (
                    <button
                      type="button"
                      onClick={() => setVariableValues({})}
                    >
                      清空填写
                    </button>
                  )}
                </div>
                <pre>{filledContent}</pre>
              </div>
              <div className="detail-variable-actions">
                {canTryPrompt(prompt) && (
                  <Link
                    to={`/prompts/${prompt.id}/run`}
                    state={trialState}
                    className="detail-secondary-cta"
                    onClick={(event) => {
                      if (!userEmail) {
                        event.preventDefault();
                        setIsLoginModalOpen(true);
                      }
                    }}
                  >
                    将填写内容带入试用
                  </Link>
                )}
              </div>
            </section>
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
                {categoryMeta.label}
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
                更新于 {new Date(prompt.updatedAt).toLocaleDateString()}
              </span>
            )}
            {prompt.usageCount !== undefined && prompt.usageCount > 0 && (
              <span className="detail-meta-item">
                <span className="meta-icon"><RiIcon icon="ri:bar-chart-box-line" width={ICON_SIZE.sm} height={ICON_SIZE.sm} /></span>
                使用 {prompt.usageCount} 次
              </span>
            )}
          </div>
        </div>

        {/* ── Prompt Content ───────────────────────────────── */}
        <div className="detail-section">
          <div className="detail-section-header">
            <h2 className="detail-section-title">指令正文</h2>
          </div>
          <div className={`detail-content-block ${isLongPrompt && !isLongPromptExpanded ? 'is-collapsed' : ''}`}>
            <pre className="detail-content-text">{filledContent}</pre>
          </div>
          {isLongPrompt && (
            <button
              type="button"
              className="detail-expand-btn"
              aria-expanded={isLongPromptExpanded}
              onClick={() => setIsLongPromptExpanded(open => !open)}
            >
              {isLongPromptExpanded ? '收起指令正文' : '展开完整指令正文'}
            </button>
          )}
          <div className="detail-content-actions">
            {canTryPrompt(prompt) && (
              <Link to={`/prompts/${prompt.id}/run`} state={trialState} className="detail-secondary-cta">
                {hasAnyVariableValue ? '用已填内容试用' : '填写文本并试用'}
              </Link>
            )}
          </div>
        </div>

        {/* ── Sample Output ────────────────────────────────── */}
        <div className="detail-section">
          <div className="detail-section-header">
            <h2 className="detail-section-title">示例输出</h2>
          </div>
          {prompt.sampleOutput ? (
            <div className="detail-sample-output">
              <div className="detail-sample-label">
                以下是一次示例回复
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
                暂无示例输出。可以复制上方指令，到你常用的 AI 助手中试用。
              </p>
            </div>
          )}
        </div>
      </div>
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title="登录后开始试用"
        description="登录后即可试用这条指令。"
      />
      {canTryPrompt(prompt) && (
        <div className="detail-sticky-actions" aria-label="指令快捷操作">
          <Link
            to={`/prompts/${prompt.id}/run`}
            state={trialState}
            className="detail-sticky-trial"
            onClick={(e) => {
              if (!userEmail) {
                e.preventDefault();
                setIsLoginModalOpen(true);
              }
            }}
          >
            {hasAnyVariableValue ? '用已填内容试用' : '填写文本并试用'}
          </Link>
        </div>
      )}
    </div>
  );
}

function splitPromptSummary(summary: string): { core: string; variableGuide: string } {
  const boundary = summary.search(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?Before you start\b/i);
  if (boundary < 0) return { core: summary.trim(), variableGuide: '' };

  const before = summary.slice(0, boundary).trim();
  const guide = summary.slice(boundary).replace(/^\s*\n/, '').trim();
  return { core: before, variableGuide: guide };
}
