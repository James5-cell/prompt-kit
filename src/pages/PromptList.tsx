import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  ChevronUp, 
  BookOpen,
  Code2,
  LineChart,
  PenTool,
  Brain,
  Wrench,
  Globe,
  CornerDownRight,
  Shuffle,
  ArrowRight,
} from 'lucide-react';
import { type Prompt, type Tag, type PromptStatus } from '../types';
import { promptService, isPublishedStatus } from '../services/promptService';
import { tagService } from '../services/tagService';
import { useAuth } from '../auth/AuthContext';
import LoginModal from '../components/LoginModal';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import './PromptList.css';

// ── Category metadata: icon + label + accent color ────────────
const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string; class: string }> = {
  dev:         { label: 'Development',  icon: Code2,     color: 'var(--color-dev)',         class: 'theme-dev' },
  writing:     { label: 'Writing',      icon: PenTool,   color: 'var(--color-writing)',      class: 'theme-writing' },
  finance:     { label: 'Finance',      icon: LineChart, color: 'var(--color-finance)',      class: 'theme-finance' },
  learning:    { label: 'Learning',     icon: BookOpen,  color: 'var(--color-learning)',     class: 'theme-learning' },
  thinking:    { label: 'Thinking',     icon: Brain,     color: 'var(--color-thinking)',     class: 'theme-thinking' },
  tools:       { label: 'Tools',        icon: Wrench,    color: 'var(--color-tools)',        class: 'theme-tools' },
  translation: { label: 'Translation',  icon: Globe,     color: 'var(--color-translation)',  class: 'theme-translation' },
};

const getCategoryMeta = (cat: string) => {
  const key = cat.toLowerCase();
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  return { label: cat, icon: BookOpen, color: 'var(--primary)', class: 'theme-default' };
};

const TAG_SHOW_LIMIT = 10;

export default function PromptList() {
  const { isAdmin, userEmail } = useAuth();

  const [prompts, setPrompts]               = useState<Prompt[]>([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [allTags, setAllTags]               = useState<Tag[]>([]);       // for color metadata only
  const [selectedAdminStatus, setSelectedAdminStatus] = useState<PromptStatus | 'all'>('all');
  const [searchParams, setSearchParams]     = useSearchParams();

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

  // UI micro-state
  const [copiedId, setCopiedId]     = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Random pick state
  const RANDOM_QUEUE_SIZE = 5;
  const RANDOM_MIN_POOL   = 5;
  const [randomPick, setRandomPick]   = useState<Prompt | null>(null);
  const [randomQueue, setRandomQueue] = useState<string[]>([]); // FIFO of recently-seen IDs

  // ── Real-time subscriptions ───────────────────────────────
  useEffect(() => {
    const unsubscribe = promptService.subscribeToPrompts((updated) => {
      console.log(`[Update] Received ${updated.length} prompts`);
      setPrompts(updated);
    });
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
      result = result.filter(p => isPublishedStatus(p.status));
    } else if (selectedAdminStatus !== 'all') {
      if (selectedAdminStatus === 'draft') {
        result = result.filter(p => !p.status || p.status === 'draft');
      } else if (selectedAdminStatus === 'published') {
        result = result.filter(p => p.status === 'published' || p.status === 'active');
      } else {
        result = result.filter(p => p.status === selectedAdminStatus);
      }
    }

    // Category filter — case-insensitive
    if (selectedCategory) {
      const catLower = selectedCategory.toLowerCase();
      result = result.filter(p => (p.category ?? '').toLowerCase() === catLower);
    }

    // Text search (title, content, tags, category)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        (p.tagNames ?? []).some(tag => tag.toLowerCase().includes(q)) ||
        (p.category ?? '').toLowerCase().includes(q)
      );
    }

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
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return b.createdAt - a.createdAt;
    });

    return result;
  }, [prompts, searchQuery, activeTagNames, selectedCategory, selectedAdminStatus, isAdmin, allTags]);

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

  const toggleExpand = (id: string) =>
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));

  /**
   * Random Prompt — opens a preview modal.
   * Maintains a FIFO queue of the last RANDOM_QUEUE_SIZE IDs to avoid
   * showing the same prompt twice in a row. Falls back to full pool
   * if the candidate pool shrinks below RANDOM_MIN_POOL.
   */
  const handleRandomPrompt = () => {
    const fullPool = prompts.filter(p =>
      !isAdmin ? isPublishedStatus(p.status) : true
    );
    if (!fullPool.length) return;

    // Exclude recently-seen IDs (unless pool would be too small)
    const candidate = fullPool.length > RANDOM_MIN_POOL
      ? fullPool.filter(p => !randomQueue.includes(p.id))
      : fullPool;

    const pool = candidate.length > 0 ? candidate : fullPool;
    const pick = pool[Math.floor(Math.random() * pool.length)];

    // Update FIFO queue
    setRandomQueue(prev => {
      const next = [...prev.filter(id => id !== pick.id), pick.id];
      return next.slice(-RANDOM_QUEUE_SIZE);
    });

    setRandomPick(pick);
  };

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
    if (selectedCategory && (p.category ?? '').toLowerCase() !== selectedCategory.toLowerCase()) return false;
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

  const isFilterActive = !!(searchQuery || activeTagNames.length > 0 || selectedCategory);

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="prompt-list-page animate-fade-in">

      {/* ── Row 1: Title + Action Buttons ──────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Prompt Library</h1>
          <p className="page-subheader">Search, filter, test, and extract pre-engineered templates</p>
        </div>
        <div className="header-actions">
          {/* Random Prompt — ghost/outline style, lightweight */}
          <button
            className="btn-random"
            onClick={handleRandomPrompt}
            title="Discover a random prompt"
            disabled={prompts.length === 0}
          >
            <Shuffle size={13} style={{ marginRight: '6px' }} />
            Random
          </button>
          {isAdmin && (
            <Link to="/prompts/new" className="btn-primary">
              <Plus size={14} style={{ marginRight: '4px' }} /> New Prompt
            </Link>
          )}
        </div>
      </div>

      {/* ── Row 2: Search Bar ─────────────────────────────────── */}
      <div className="search-bar-container">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search prompt titles, tags, summaries..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        {isAdmin && (
          <select
            className="admin-status-select"
            value={selectedAdminStatus}
            onChange={e => setSelectedAdminStatus(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="published">🌐 Published</option>
            <option value="draft">📝 Drafts</option>
            <option value="private">🔒 Private</option>
          </select>
        )}
      </div>

      {/* ── Row 3: Filter Panel ────────────────────────────────── */}
      {(uniqueCategories.length > 0 || allAggregatedTags.length > 0) && (
        <div className="filter-panel card-base">

          {/* Category Filter */}
          {uniqueCategories.length > 0 && (
            <div className="filter-group">
              <p className="filter-title">Filter by Category</p>
              <div className="category-cards-grid">
                <button
                  className={`category-card-btn ${!selectedCategory ? 'active' : ''}`}
                  onClick={() => updateFilters(null, [])}
                >
                  <span className="cat-btn-icon"><BookOpen size={14} /></span>
                  <span className="cat-btn-label">All Prompts</span>
                </button>
                {uniqueCategories.sort().map(cat => {
                  const meta    = getCategoryMeta(cat);
                  const CatIcon = meta.icon;
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      className={`category-card-btn ${meta.class} ${isActive ? 'active' : ''}`}
                      onClick={() => updateFilters(cat, [])}
                      style={isActive ? { borderColor: meta.color, boxShadow: `0 0 10px ${meta.color}20` } : undefined}
                    >
                      <span className="cat-btn-icon" style={{ color: meta.color }}>
                        <CatIcon size={14} />
                      </span>
                      <span className="cat-btn-label">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tag Filter — inline chips, always visible */}
          {allAggregatedTags.length > 0 && (
            <div className="filter-group-tag">
              <div className="filter-title-row">
                <p className="filter-title">Filter by Tag</p>
                {activeTagNames.length > 0 && (
                  <button
                    className="tag-clear-inline"
                    onClick={() => updateFilters(selectedCategory, [])}
                  >
                    ✕ Clear
                  </button>
                )}
              </div>
              <div className="tag-chips-inline">
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
                      {isSelected && <Check size={10} style={{ marginRight: '3px', flexShrink: 0 }} />}
                      {tag.name}
                      <span className="tag-chip-count">{tag.count}</span>
                    </button>
                  );
                })}
                {!showAllTags && hiddenTagCount > 0 && (
                  <button
                    type="button"
                    className="tag-show-more"
                    onClick={() => setShowAllTags(true)}
                  >
                    +{hiddenTagCount} more
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Result count (shown only when a filter is active) ─── */}
      {isFilterActive && (
        <div className="results-count-row">
          <span className="results-count-text">
            {filteredPrompts.length} result{filteredPrompts.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── Row 4: Grid of Collapsible Cards ──────────────────── */}
      <div className="prompts-grid">
        {filteredPrompts.length > 0 ? (
          filteredPrompts.map(prompt => {
            const isExpanded   = !!expandedIds[prompt.id];
            const categoryMeta = prompt.category ? getCategoryMeta(prompt.category) : null;
            const CatIcon      = categoryMeta?.icon ?? null;

            return (
              <motion.div
                key={prompt.id}
                layout="position"
                className={`prompt-card-v2 ${isExpanded ? 'is-expanded' : ''}`}
                style={isExpanded && categoryMeta ? { borderColor: categoryMeta.color } : undefined}
              >
                {/* Header */}
                <div className="prompt-card-header">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      {categoryMeta && (
                        <span
                          className={`card-cat-badge ${categoryMeta.class}`}
                          style={{ color: categoryMeta.color, borderColor: categoryMeta.color }}
                        >
                          {CatIcon && <CatIcon size={10} style={{ marginRight: '4px' }} />}
                          {categoryMeta.label}
                        </span>
                      )}
                      {isAdmin && (!prompt.status || prompt.status === 'draft') && (
                        <span className="status-badge status-draft">Draft</span>
                      )}
                      {isAdmin && prompt.status === 'private' && (
                        <span className="status-badge status-private">Private</span>
                      )}
                    </div>
                    <Link
                      to={isAdmin ? `/prompts/${prompt.id}` : `/p/${prompt.id}`}
                      className="prompt-title"
                    >
                      {prompt.title}
                    </Link>
                  </div>
                </div>

                {/* Summary */}
                <div className="prompt-card-summary">
                  {prompt.summary || (prompt.content.length > 100 ? `${prompt.content.substring(0, 100)}...` : prompt.content)}
                </div>

                {/* Tags */}
                {prompt.tagNames && prompt.tagNames.length > 0 && (
                  <div className="prompt-tag-list">
                    {prompt.tagNames.map((tagName, idx) => {
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
                  </div>
                )}

                {/* Collapsible content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      className="prompt-card-collapsible"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="expanded-details-container">
                        <div className="expanded-header">
                          <CornerDownRight size={14} className="text-primary" />
                          <span>🎯 這個 PROMPT 會：</span>
                        </div>
                        <div className="expanded-body">
                          <ReactMarkdown>{prompt.content}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Footer metadata */}
                <div className="prompt-meta">
                  <span>Indexed: {new Date(prompt.createdAt).toLocaleDateString()}</span>
                  {prompt.usageCount !== undefined && prompt.usageCount > 0 && (
                    <span className="usage-count">Used {prompt.usageCount} times</span>
                  )}
                </div>

                {/* Action row */}
                <div className="prompt-card-actions">
                  <button
                    className={`btn-secondary action-btn-glow toggle-expand-btn ${isExpanded ? 'active' : ''}`}
                    onClick={() => toggleExpand(prompt.id)}
                    title={isExpanded ? 'Collapse Prompt' : 'Expand Details'}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span style={{ marginLeft: '4px' }}>{isExpanded ? 'Collapse' : 'Expand'}</span>
                  </button>

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    {!isAdmin && (
                      <Link to={`/p/${prompt.id}`} className="btn-secondary icon-action-btn" title="View details">
                        <Eye size={14} />
                      </Link>
                    )}
                    <Link
                      to={`/prompts/${prompt.id}/run`}
                      className="btn-primary btn-glow icon-action-btn"
                      onClick={e => {
                        if (!userEmail) { e.preventDefault(); setIsLoginModalOpen(true); }
                      }}
                      title="Test in Sandbox"
                    >
                      <Zap size={14} />
                    </Link>
                    <button
                      className={`btn-secondary icon-action-btn copy-action-btn ${copiedId === prompt.id ? 'copied' : ''}`}
                      onClick={() => copyPrompt(prompt)}
                      title="Copy to clipboard"
                    >
                      {copiedId === prompt.id
                        ? <Check size={14} className="text-success animate-bounce" />
                        : <CopyIcon size={14} />}
                    </button>
                    <button
                      className={`btn-secondary icon-action-btn fav-action-btn ${prompt.favorite ? 'favorited' : ''}`}
                      onClick={() => {
                        if (!userEmail) setIsLoginModalOpen(true);
                        else toggleFavorite(prompt);
                      }}
                      title={prompt.favorite ? 'Remove Favourite' : 'Save Favourite'}
                    >
                      <Star
                        size={14}
                        fill={prompt.favorite ? 'var(--warning)' : 'none'}
                        style={prompt.favorite ? { color: 'var(--warning)' } : undefined}
                      />
                    </button>
                    {isAdmin && (
                      <button
                        className="btn-secondary icon-action-btn delete-action-btn"
                        onClick={() => deletePrompt(prompt.id)}
                        title="Delete Asset"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="empty-state card-base" style={{ padding: '60px 20px', borderStyle: 'dashed' }}>
            {(searchQuery || activeTagNames.length > 0) ? (
              <div>
                <p>No matching prompts found</p>
                <button
                  className="btn-secondary"
                  onClick={() => { setSearchQuery(''); updateFilters(selectedCategory, []); }}
                >
                  Clear Filters
                </button>
              </div>
            ) : !isAdmin && prompts.length > 0 ? (
              <div><p>No published prompts available yet.</p></div>
            ) : (
              <div>
                <p>No prompts in database vault yet.</p>
                {isAdmin && (
                  <Link to="/prompts/new" className="btn-primary">Create a Prompt</Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        title="Sign in to continue"
        description="Please sign in to test or favourite prompts."
      />

      {/* Random Prompt Preview Modal */}
      {randomPick && (
        <RandomPreviewModal
          prompt={randomPick}
          isAdmin={isAdmin}
          onShuffle={handleRandomPrompt}
          onClose={() => setRandomPick(null)}
        />
      )}
    </div>
  );
}

// ── RandomPreviewModal ─────────────────────────────────────────
function RandomPreviewModal({
  prompt,
  isAdmin,
  onShuffle,
  onClose,
}: {
  prompt: Prompt;
  isAdmin: boolean;
  onShuffle: () => void;
  onClose: () => void;
}) {

  // Extract first 1-2 bullet points from content as teaser
  const lines = prompt.content
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  const bulletLines = lines.filter(l => /^[-•*]|^\d+\./.test(l)).slice(0, 2);
  const teaser = bulletLines.length > 0 ? bulletLines : lines.slice(0, 2);

  const CATEGORY_MAP_LOCAL: Record<string, { label: string; color: string }> = {
    dev:         { label: 'Development',  color: 'var(--color-dev)' },
    writing:     { label: 'Writing',      color: 'var(--color-writing)' },
    finance:     { label: 'Finance',      color: 'var(--color-finance)' },
    learning:    { label: 'Learning',     color: 'var(--color-learning)' },
    thinking:    { label: 'Thinking',     color: 'var(--color-thinking)' },
    tools:       { label: 'Tools',        color: 'var(--color-tools)' },
    translation: { label: 'Translation',  color: 'var(--color-translation)' },
  };
  const catMeta = prompt.category
    ? (CATEGORY_MAP_LOCAL[prompt.category.toLowerCase()] ?? { label: prompt.category, color: 'var(--primary)' })
    : null;

  const detailUrl = isAdmin ? `/prompts/${prompt.id}` : `/p/${prompt.id}`;

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="random-modal-backdrop" onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-label="Random Prompt Preview">
      <div className="random-modal-card">
        {/* Dismiss */}
        <button className="random-modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {/* Label */}
        <p className="random-modal-eyebrow">
          <Shuffle size={11} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
          Random Pick
        </p>

        {/* Category badge */}
        {catMeta && (
          <span
            className="random-modal-category"
            style={{ color: catMeta.color, borderColor: catMeta.color, backgroundColor: `${catMeta.color}12` }}
          >
            {catMeta.label}
          </span>
        )}

        {/* Title */}
        <h2 className="random-modal-title">{prompt.title}</h2>

        {/* Teaser bullets */}
        {teaser.length > 0 && (
          <ul className="random-modal-teaser">
            {teaser.map((line, i) => (
              <li key={i}>{line.replace(/^[-•*]\s*|^\d+\.\s*/, '')}</li>
            ))}
          </ul>
        )}

        {/* Actions */}
        <div className="random-modal-actions">
          <button
            className="random-modal-btn-shuffle"
            onClick={onShuffle}
          >
            <Shuffle size={13} style={{ marginRight: '6px' }} />
            Try Another
          </button>
          <Link
            to={detailUrl}
            className="random-modal-btn-detail"
            onClick={onClose}
          >
            View Details
            <ArrowRight size={13} style={{ marginLeft: '6px' }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
