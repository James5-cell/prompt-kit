import { promptSearchScore } from '../utils/promptSearch';
import { canTryPrompt, getUsageMode, USAGE_LABELS } from '../utils/promptUsage';
import { getPromptSummary } from '../utils/promptDisplay';
import { buildReturnTo } from '../utils/returnTo';
import {
  getPromptCategoryMeta,
  isSamePromptCategory,
} from '../config/categoryMeta';
import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon as RiIcon } from '@iconify/react';
import { 
  Eye, 
  Copy as CopyIcon, 
  Plus, 
  Zap, 
  Check, 
  Star, 
  Trash2, 
  Search, 
  ChevronDown, 
  X,
  BookOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { type Prompt, type Tag, type PromptStatus } from '../types';
import { promptService, isPublishedStatus } from '../services/promptService';
import { tagService } from '../services/tagService';
import { useAuth } from '../auth/AuthContext';
import LoginModal from '../components/LoginModal';
import { motion } from 'framer-motion';
import SEOHead from '../components/SEOHead';
import './PromptList.css';

const TAG_SHOW_LIMIT = 7;

export default function PromptList() {
  const navigate = useNavigate();
  const location = useLocation();
  // Preserve q / category / tags / usage so detail-page "back" restores filters.
  const returnTo = buildReturnTo(location.pathname, location.search);
  const [pendingTrialId, setPendingTrialId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { isAdmin, userEmail } = useAuth();

  const [prompts, setPrompts]               = useState<Prompt[]>([]);
  const [allTags, setAllTags]               = useState<Tag[]>([]);       // for color metadata only
  const [selectedAdminStatus, setSelectedAdminStatus] = useState<PromptStatus | 'all'>('all');
  const [searchParams, setSearchParams]     = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const selectedUsage = searchParams.get('usage') || 'all';
  const setSearchQuery = (query: string) => {
    const next = new URLSearchParams(searchParams);
    if (query) next.set('q', query); else next.delete('q');
    setSearchParams(next, { replace: true });
  };
  const setSelectedUsage = (mode: string) => {
    const next = new URLSearchParams(searchParams);
    if (mode === 'all') next.delete('usage'); else next.set('usage', mode);
    setSearchParams(next, { replace: true });
  };

  const selectedCategory = searchParams.get('category');
  const activeTagNames = useMemo(() => {
    const param = searchParams.get('tags');
    return param ? param.split(',').map(t => t.trim()).filter(Boolean) : [];
  }, [searchParams]);

  const updateFilters = (newCat: string | null, newTags: string[]) => {
    const next = new URLSearchParams(searchParams);
    if (newCat) {
      next.set('category', newCat);
    } else {
      next.delete('category');
    }
    if (newTags.length > 0) {
      next.set('tags', newTags.join(','));
    } else {
      next.delete('tags');
    }
    setSearchParams(next, { replace: true });
  };

  const toggleTagName = (tagName: string) => {
    const nextTags = activeTagNames.includes(tagName)
      ? activeTagNames.filter(n => n !== tagName)
      : [...activeTagNames, tagName];
    updateFilters(selectedCategory, nextTags);
  };

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [showAllTags, setShowAllTags]       = useState(false);

  // Filter panel is collapsible on mobile (collapsed by default) and always
  // expanded on desktop. Track the breakpoint so ARIA state stays accurate.
  const [filtersOpen, setFiltersOpen]         = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const applyViewport = () => setIsMobileViewport(mq.matches);
    applyViewport();
    mq.addEventListener('change', applyViewport);
    return () => mq.removeEventListener('change', applyViewport);
  }, []);

  // UI micro-state
  const [copiedId, setCopiedId]     = useState<string | null>(null);

  // ── Real-time subscriptions ───────────────────────────────
  useEffect(() => {
    const unsubscribe = promptService.subscribeToPrompts((updated) => {
      console.log(`[Update] Received ${updated.length} prompts`);
      setPrompts(updated);
      setIsLoading(false);
      setLoadError('');
    }, () => { setIsLoading(false); setLoadError('实时连接不可用，当前可能显示缓存内容。请刷新重试。'); });
    const unsubscribeTags = tagService.subscribeToTags((tags) => {
      setAllTags(tags.filter(t => t.isActive));
    });
    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeTags) unsubscribeTags();
    };
  }, []);

  // ── Filtered prompts (derived via useMemo — always up-to-date) ─
  const filteredPrompts = useMemo(() => {
    let result = [...(prompts ?? [])];

    // Visibility: non-admins only see published prompts
    if (!isAdmin) {
      result = result.filter(p => !p.isDeleted && isPublishedStatus(p.status) && p.visibility !== 'private');
    } else if (selectedAdminStatus !== 'all') {
      if (selectedAdminStatus === 'draft') {
        result = result.filter(p => !p.status || p.status === 'draft');
      } else if (selectedAdminStatus === 'published') {
        result = result.filter(p => p.status === 'published' || p.status === 'active');
      } else {
        result = result.filter(p => p.status === selectedAdminStatus);
      }
    }

    if (selectedUsage !== 'all') result = result.filter(p => getUsageMode(p) === selectedUsage);

    // URL values stay unchanged; shared metadata handles case and aliases.
    if (selectedCategory) {
      result = result.filter(p => isSamePromptCategory(p.category, selectedCategory));
    }

    result = result.filter(p => promptSearchScore(p, searchQuery) > 0);

    // Tag filter — OR logic, case-insensitive
    if (activeTagNames.length > 0) {
      result = result.filter(p => {
        const promptTagNorm = (p.tagNames || []).map(t => t.trim().toLowerCase());
        const nameMatch = activeTagNames.some(tn => promptTagNorm.includes(tn.toLowerCase()));
        if (nameMatch) return true;
        const idMatch = activeTagNames.some(tn => {
          const tagObj = allTags.find(t => t.name.trim().toLowerCase() === tn.toLowerCase());
          return tagObj && (p.tagIds || []).includes(tagObj.id);
        });
        return idMatch;
      });
    }

    // Sort: favourites first → newest first
    result.sort((a, b) => {
      if (searchQuery.trim()) {
        const relevance = promptSearchScore(b, searchQuery) - promptSearchScore(a, searchQuery);
        if (relevance) return relevance;
      }
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return b.createdAt - a.createdAt;
    });

    return result;
  }, [prompts, searchQuery, activeTagNames, selectedCategory, selectedAdminStatus, selectedUsage, isAdmin, allTags]);

  // ── Actions ────────────────────────────────────────────────
  async function deletePrompt(id: string) {
    if (!isAdmin) { alert('Permission denied: admin login required'); return; }
    if (confirm('Are you sure you want to delete this prompt?')) {
      await promptService.deletePrompt(id);
    }
  }

  async function copyPrompt(prompt: Prompt) {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedId(prompt.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { alert('Copy failed'); }
  }

  async function toggleFavorite(prompt: Prompt) {
    try {
      await promptService.toggleFavorite(prompt.id);
    } catch (error) {
      console.error('[Favorite] Operation failed:', error);
      alert(`Operation failed: ${error}`);
    }
  }

  // ── Derived / computed values ──────────────────────────────
  const uniqueCategories = Array.from(
    new Set(prompts.map(p => p.category).filter(Boolean))
  ) as string[];

  // Prompts eligible for tag aggregation (respects category + status filter)
  const promptsForTags = prompts.filter(p => {
    if (!isAdmin && !isPublishedStatus(p.status)) return false;
    if (isAdmin && selectedAdminStatus !== 'all') {
      if (selectedAdminStatus === 'draft'     && p.status && p.status !== 'draft')   return false;
      if (selectedAdminStatus === 'published' && p.status !== 'published' && p.status !== 'active') return false;
      if (selectedAdminStatus === 'private'   && p.status !== 'private')   return false;
    }
    if (selectedCategory) {
      if (!isSamePromptCategory(p.category, selectedCategory)) return false;
    }
    return true;
  });

  // ── Dual-source tag aggregation ────────────────────────────
  // Primary: tagService objects cross-referenced with prompt tagIds
  const availableTagIdSet = new Set(promptsForTags.flatMap(p => p.tagIds || []));
  const tagServiceOptions = allTags
    .filter(tag => availableTagIdSet.has(tag.id))
    .map(tag => ({
      name:  tag.name,
      count: promptsForTags.filter(p => (p.tagIds || []).includes(tag.id)).length,
      color: tag.color,
    }))
    .sort((a, b) => b.count - a.count);

  // Fallback: aggregate directly from tagNames strings on prompts
  const tagNameFreqMap: Record<string, number> = {};
  promptsForTags.forEach(p => {
    (p.tagNames || []).forEach(name => {
      const key = name.trim();
      if (key) tagNameFreqMap[key] = (tagNameFreqMap[key] || 0) + 1;
    });
  });
  const tagNameOptions = Object.entries(tagNameFreqMap)
    .map(([name, count]) => ({ name, count, color: undefined as string | undefined }))
    .sort((a, b) => b.count - a.count);

  // Use tagService data when available; else fall back to tagName aggregation
  const allAggregatedTags = tagServiceOptions.length > 0 ? tagServiceOptions : tagNameOptions;

  const visibleTagOptions = showAllTags
    ? allAggregatedTags
    : allAggregatedTags.slice(0, TAG_SHOW_LIMIT);
  const hiddenTagCount = allAggregatedTags.length - TAG_SHOW_LIMIT;

  const isFilterActive = !!(searchQuery || activeTagNames.length > 0 || selectedCategory || selectedUsage !== 'all');

  // Number of active filter conditions (search / category / each tag / usage).
  const activeFilterCount =
    (searchQuery ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    activeTagNames.length +
    (selectedUsage !== 'all' ? 1 : 0);

  // Compact human-readable summary of the selected conditions.
  const filtersExpanded = !isMobileViewport || filtersOpen;

  // Clears every URL-backed condition (q / category / tags / usage).
  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  const removeSearch = () => setSearchQuery('');
  const removeCategory = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('category');
    setSearchParams(next, { replace: true });
  };
  const removeUsage = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('usage');
    setSearchParams(next, { replace: true });
  };
  const removeTag = (tagName: string) => {
    updateFilters(selectedCategory, activeTagNames.filter(name => name !== tagName));
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="prompt-list-page animate-fade-in">
      <SEOHead
        title="Public Prompt Library — Prompt Kit"
        description="Explore, search, filter, and execute high-quality, production-tested AI prompt templates for ChatGPT, Claude, Gemini, and LLM workflows."
        canonical="https://www.205011.xyz/prompts"
        ogImage="https://www.205011.xyz/og-image.png"
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'CollectionPage',
              '@id': 'https://www.205011.xyz/prompts#collectionpage',
              'url': 'https://www.205011.xyz/prompts',
              'name': 'Public Prompt Library — Prompt Kit',
              'description': 'Browsable catalog of production-tested AI prompts for ChatGPT, Claude, Gemini, and LLM workflows.',
              'isPartOf': { '@id': 'https://www.205011.xyz/#website' }
            },
            {
              '@type': 'BreadcrumbList',
              '@id': 'https://www.205011.xyz/prompts#breadcrumb',
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
                }
              ]
            }
          ]
        }}
      />

      {/* ── Row 1: Title + admin-only Action Buttons ───────────── */}
      <div className="page-header">
        <div>
          <h1>全部指令</h1>
          <p className="page-subheader">找到适合的指令，直接试用或复制使用。</p>
        </div>
        {isAdmin ? (
          <div className="header-actions">
            <Link to="/prompts/new" className="btn-primary">
              <Plus size={14} style={{ marginRight: '4px' }} /> 新建指令
            </Link>
          </div>
        ) : null}
      </div>

      {/* ── Row 2: Compact search + result count ───────────────── */}
      <div className="library-toolbar">
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              aria-label="搜索指令"
              placeholder="搜索名称、标签或用途…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          {isAdmin ? (
            <select
              aria-label="按发布状态筛选"
              className="admin-status-select"
              value={selectedAdminStatus}
              onChange={e => setSelectedAdminStatus(e.target.value as PromptStatus | 'all')}
            >
              <option value="all">全部状态</option>
              <option value="published">已发布</option>
              <option value="draft">草稿</option>
              <option value="private">私密</option>
            </select>
          ) : null}
        </div>
        <span className="library-result-count" aria-live="polite">
          {isLoading ? '正在读取…' : `${filteredPrompts.length} 条指令`}
        </span>
      </div>

      {/* ── Row 3: Filter Panel ────────────────────────────────── */}
      {(uniqueCategories.length > 0 || allAggregatedTags.length > 0) && (
        <div className="filter-panel card-base">

          {/* Mobile-only collapse toggle (always-expanded header on desktop) */}
          <div className="filter-panel-header">
            <button
              type="button"
              className="filter-toggle"
              aria-expanded={filtersExpanded}
              aria-controls="prompt-filter-panel"
              aria-label={
                isFilterActive
                  ? `筛选条件，已选 ${activeFilterCount} 项，${filtersExpanded ? '点击收起' : '点击展开'}`
                  : `筛选条件，${filtersExpanded ? '点击收起' : '点击展开'}`
              }
              onClick={() => setFiltersOpen(open => !open)}
            >
              <SlidersHorizontal size={15} className="filter-toggle-icon" aria-hidden="true" />
              <span className="filter-toggle-label">筛选条件</span>
              <span className={`filter-toggle-summary ${isFilterActive ? 'is-active' : ''}`}>
                {isFilterActive ? `已选 ${activeFilterCount} 项` : '分类、使用条件与标签'}
              </span>
              <ChevronDown
                size={16}
                className={`filter-toggle-chevron ${filtersExpanded ? 'is-open' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>

          <div id="prompt-filter-panel" className="filter-panel-body" hidden={!filtersExpanded}>

          <div className="filter-toolbar-row">
            <span className="filter-toolbar-label">使用条件</span>
            <div className="filter-choice-row">
              {[['all', '全部'], ...Object.entries(USAGE_LABELS)].map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  className={`filter-choice ${selectedUsage === mode ? 'active' : ''}`}
                  aria-pressed={selectedUsage === mode}
                  onClick={() => setSelectedUsage(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* Category Filter */}
          {uniqueCategories.length > 0 && (
            <div className="filter-toolbar-row">
              <span className="filter-toolbar-label">分类</span>
              <div className="filter-choice-row">
                <button
                  type="button"
                  className={`filter-choice ${!selectedCategory ? 'active' : ''}`}
                  aria-pressed={!selectedCategory}
                  onClick={() => updateFilters(null, [])}
                >
                  <BookOpen size={13} /> 全部
                </button>
                {uniqueCategories.sort().map(cat => {
                  const meta = getPromptCategoryMeta(cat);
                  const isActive = !!selectedCategory && isSamePromptCategory(cat, selectedCategory);
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`filter-choice ${isActive ? 'active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => updateFilters(cat, [])}
                    >
                      <RiIcon icon={meta.icon} width={13} height={13} style={{ color: meta.color }} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags: one compact row, highest-frequency seven by default. */}
          {allAggregatedTags.length > 0 && (
            <div className="filter-tag-row">
              <div className="filter-title-row">
                <span className="filter-toolbar-label">标签</span>
                <button
                  type="button"
                  className="tag-show-more"
                  aria-expanded={showAllTags}
                  onClick={() => setShowAllTags(open => !open)}
                >
                  {showAllTags ? '收起标签' : `更多标签 (${Math.max(0, hiddenTagCount)})`}
                  <ChevronDown className={showAllTags ? 'is-open' : ''} size={13} />
                </button>
              </div>
              <div className={`tag-chips-inline ${showAllTags ? 'is-expanded' : ''}`}>
                {visibleTagOptions.map(tag => {
                  const isSelected = activeTagNames.includes(tag.name);
                  return (
                    <button
                      key={tag.name}
                      type="button"
                      className={`tag-chip-option ${isSelected ? 'selected' : ''}`}
                      style={isSelected && tag.color
                        ? { borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}15` }
                        : undefined
                      }
                      onClick={() => toggleTagName(tag.name)}
                    >
                      {isSelected && <Check size={10} aria-hidden="true" />}
                      {tag.name}
                      <span className="tag-chip-count">{tag.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      {/* ── Active-filter summary: each condition is individually removable ── */}
      {isFilterActive && (
        <div className="active-filter-bar" aria-label="当前筛选摘要">
          <div className="active-filter-items">
            <span className="active-filter-label">当前筛选</span>
            {searchQuery && (
              <button type="button" className="active-filter-chip" onClick={removeSearch}>
                搜索：{searchQuery}
                <X size={12} aria-hidden="true" />
                <span className="sr-only">移除搜索条件</span>
              </button>
            )}
            {selectedCategory && (
              <button type="button" className="active-filter-chip" onClick={removeCategory}>
                {getPromptCategoryMeta(selectedCategory).label}
                <X size={12} aria-hidden="true" />
                <span className="sr-only">移除分类条件</span>
              </button>
            )}
            {selectedUsage !== 'all' && (
              <button type="button" className="active-filter-chip" onClick={removeUsage}>
                {USAGE_LABELS[selectedUsage as keyof typeof USAGE_LABELS] ?? selectedUsage}
                <X size={12} aria-hidden="true" />
                <span className="sr-only">移除使用条件</span>
              </button>
            )}
            {activeTagNames.map(tagName => (
              <button key={tagName} type="button" className="active-filter-chip" onClick={() => removeTag(tagName)}>
                #{tagName}
                <X size={12} aria-hidden="true" />
                <span className="sr-only">移除标签 {tagName}</span>
              </button>
            ))}
          </div>
          <button type="button" className="active-filter-clear" onClick={clearFilters}>
            清除全部
          </button>
        </div>
      )}

      {loadError && <p role="alert" className="mb-4 rounded-lg border border-amber-700 p-3 text-amber-200">{loadError}</p>}
      {isLoading && <p role="status" className="p-4 text-zinc-400">正在读取指令库…</p>}
      {/* ── Row 4: Grid of Collapsible Cards ───────────────────── */}
      <div className="prompts-grid" key={selectedCategory ?? 'all'}>
        {isLoading ? null : filteredPrompts.length > 0 ? (
          filteredPrompts.map(prompt => {
            const categoryMeta = getPromptCategoryMeta(prompt.category);

            return (
              <motion.div
                key={prompt.id}
                className="prompt-card-v2"
              >
                {/* Header */}
                <div className="prompt-card-header">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <span
                        className={`card-cat-badge ${categoryMeta.themeClass}`}
                        style={{ color: categoryMeta.color, borderColor: categoryMeta.color }}
                      >
                        <RiIcon
                          icon={categoryMeta.icon}
                          width={10}
                          height={10}
                          style={{ marginRight: '4px', verticalAlign: 'middle' }}
                        />
                        {categoryMeta.label}
                      </span>
                      {isAdmin && (!prompt.status || prompt.status === 'draft') && (
                        <span className="status-badge status-draft">草稿</span>
                      )}
                      {isAdmin && prompt.status === 'private' && (
                        <span className="status-badge status-private">私密</span>
                      )}
                      <span className="prompt-usage-pill">{USAGE_LABELS[getUsageMode(prompt)]}</span>
                    </div>
                    <Link
                      to={isAdmin ? `/prompts/${prompt.id}` : `/p/${prompt.id}`}
                      state={returnTo ? { returnTo } : undefined}
                      className="prompt-title"
                    >
                      {prompt.title}
                    </Link>
                  </div>
                </div>

                {/* Summary */}
                <div className="prompt-card-summary">
                  {getPromptSummary(prompt)}
                </div>

                {/* Tags */}
                {prompt.tagNames && prompt.tagNames.length > 0 && (
                  <div className="prompt-tag-list">
                    {prompt.tagNames.slice(0, 3).map((tagName, idx) => {
                      const tagObj = allTags.find(t => t.id === prompt.tagIds?.[idx]);
                      return (
                        <span
                          key={`${prompt.id}-tag-${idx}`}
                          className="prompt-tag-pill"
                          style={tagObj?.color ? { borderColor: tagObj.color, color: tagObj.color, backgroundColor: `${tagObj.color}08` } : undefined}
                        >
                          {tagName}
                        </span>
                      );
                    })}
                    {prompt.tagNames.length > 3 && (
                      <span className="prompt-tag-pill">+{prompt.tagNames.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Footer metadata */}
                <div className="prompt-meta">
                  <span>收录于 {new Date(prompt.createdAt).toLocaleDateString()}</span>
                  {prompt.usageCount !== undefined && prompt.usageCount > 0 && (
                    <span className="usage-count">使用 {prompt.usageCount} 次</span>
                  )}
                </div>

                {/* Action row */}
                <div className="prompt-card-actions">
                  <button
                    className="btn-secondary action-btn-glow toggle-expand-btn"
                    onClick={() => navigate(
                      isAdmin ? `/prompts/${prompt.id}` : `/p/${prompt.id}`,
                      { state: returnTo ? { returnTo } : undefined },
                    )}
                    aria-label="查看指令详情"
                    title="查看指令详情"
                  >
                    <Eye size={15} aria-hidden="true" />
                    <span style={{ marginLeft: '4px' }}>查看详情</span>
                  </button>

                  <div className="prompt-actions-group">
                    <Link
                      to={canTryPrompt(prompt) ? `/prompts/${prompt.id}/run` : `/p/${prompt.id}`}
                      state={returnTo ? { returnTo } : undefined}
                      className="btn-primary btn-glow icon-action-btn"
                      onClick={e => {
                        if (canTryPrompt(prompt) && !userEmail) { e.preventDefault(); setPendingTrialId(prompt.id); setIsLoginModalOpen(true); }
                      }}
                      title={canTryPrompt(prompt) ? '在线试用' : '查看指令详情'}
                      aria-label={canTryPrompt(prompt) ? '在线试用此指令' : '查看此指令详情'}
                    >
                      <Zap size={15} aria-hidden="true" />
                    </Link>
                    <button
                      className={`btn-secondary icon-action-btn copy-action-btn ${copiedId === prompt.id ? 'copied' : ''}`}
                      onClick={() => copyPrompt(prompt)}
                      title={copiedId === prompt.id ? '已复制指令内容' : '复制指令内容'}
                      aria-label={copiedId === prompt.id ? '已复制指令内容' : '复制指令内容'}
                    >
                      {copiedId === prompt.id
                        ? <Check size={15} className="text-success animate-bounce" aria-hidden="true" />
                        : <CopyIcon size={15} aria-hidden="true" />}
                    </button>
                    {isAdmin && (
                    <button
                      className={`btn-secondary icon-action-btn fav-action-btn ${prompt.favorite ? 'favorited' : ''}`}
                      onClick={() => {
                        toggleFavorite(prompt);
                      }}
                      title={prompt.favorite ? '取消首页推荐' : '加星并加入首页推荐'}
                      aria-label={prompt.favorite ? '取消首页推荐' : '加星并加入首页推荐'}
                      aria-pressed={!!prompt.favorite}
                    >
                      <Star
                        size={15}
                        fill={prompt.favorite ? 'var(--warning)' : 'none'}
                        style={prompt.favorite ? { color: 'var(--warning)' } : undefined}
                        aria-hidden="true"
                      />
                    </button>
                    )}
                    {isAdmin && (
                      <button
                        className="btn-secondary icon-action-btn delete-action-btn"
                        onClick={() => deletePrompt(prompt.id)}
                        title="删除指令"
                        aria-label="删除指令"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="empty-state card-base" style={{ padding: '60px 20px', borderStyle: 'dashed' }}>
            {isFilterActive ? (
              <div>
                <p>当前筛选条件下没有匹配的指令</p>
                <button
                  className="btn-secondary"
                  onClick={clearFilters}
                >
                  清除全部筛选
                </button>
              </div>
            ) : !isAdmin && prompts.length > 0 ? (
              <div><p>暂时还没有公开可用的指令。</p></div>
            ) : (
              <div>
                <p>指令库暂时为空。</p>
                {isAdmin && (
                  <Link to="/prompts/new" className="btn-primary">新建指令</Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => { if (pendingTrialId) navigate(`/prompts/${pendingTrialId}/run`); }}
        title="登录后开始试用"
        description="使用免费模型测试短文本，登录后将继续打开当前指令。"
      />
    </div>
  );
}
