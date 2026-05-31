import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, Copy as CopyIcon, Plus, Zap } from 'lucide-react';
import { type Prompt, type Tag, type SearchFilters, type PromptStatus } from '../types';
import { promptService, isPublishedStatus } from '../services/promptService';
import { tagService } from '../services/tagService';
import { useAuth } from '../auth/AuthContext';
import LoginModal from '../components/LoginModal';
import ReactMarkdown from 'react-markdown';
import './PromptList.css';

export default function PromptList() {
  const { isAdmin, userEmail } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAdminStatus, setSelectedAdminStatus] = useState<PromptStatus | 'all'>('all');
  const [searchParams] = useSearchParams();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Pre-select category from URL ?category= param (e.g. from Dashboard cards)
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);
  }, [searchParams]);

  // Click outside popover to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsTagPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = promptService.subscribeToPrompts((updatedPrompts) => {
      console.log(`[Update] Received ${updatedPrompts.length} prompts`);
      setPrompts(updatedPrompts);
    });

    // Subscribe to tags
    const unsubscribeTags = tagService.subscribeToTags((tags) => {
      setAllTags(tags.filter((t) => t.isActive));
    });

    // Cleanup subscriptions on unmount
    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeTags) unsubscribeTags();
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [prompts, searchQuery, filters, activeTagIds, selectedCategory, selectedAdminStatus, isAdmin]);

  // 确保 applyFilters 在 prompts 更新后正确执行
  // 注意：不要在依赖数组中包含 applyFilters，避免无限循环

  function applyFilters() {
    let result = [...prompts];

    // Status filter: non-admin visitors only see published (or legacy 'active') prompts
    if (!isAdmin) {
      result = result.filter((p) => isPublishedStatus(p.status));
    } else if (selectedAdminStatus !== 'all') {
      // Admin specific status filter
      if (selectedAdminStatus === 'draft') {
        result = result.filter((p) => !p.status || p.status === 'draft');
      } else {
        // Handle published and legacy active tags as 'published'
        if (selectedAdminStatus === 'published') {
          result = result.filter((p) => p.status === 'published' || p.status === 'active');
        } else {
           result = result.filter((p) => p.status === selectedAdminStatus);
        }
      }
    }

    // Category filter
    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Text search (now also searches tagNames)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          (p.tagNames ?? []).some((tag) => tag.toLowerCase().includes(q)) ||
          (p.category ?? '').toLowerCase().includes(q)
      );
    }

    // Tag filter
    if (activeTagIds.length > 0) {
      result = result.filter((p) =>
        activeTagIds.some((tagId) => (p.tagIds ?? []).includes(tagId))
      );
    }

    // Sort: favorites first, then by creation time (newest first)
    result.sort((a, b) => {
      // Sort by favorite status first (favorites first)
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      // If both are favorites or both are not, sort by creation time (newest first)
      return b.createdAt - a.createdAt;
    });

    setFilteredPrompts(result);
  }



  async function deletePrompt(id: string) {
    if (!isAdmin) {
      alert('Permission denied: admin login required');
      return;
    }
    if (confirm('Are you sure you want to delete this prompt?')) {
      await promptService.deletePrompt(id);
      // loadPrompts(); // Removed as subscription handles updates
    }
  }

  async function copyPrompt(prompt: Prompt, buttonElement: HTMLButtonElement) {
    try {
      await navigator.clipboard.writeText(prompt.content);
      const originalText = buttonElement.textContent;
      buttonElement.textContent = 'Copied!';
      buttonElement.style.color = '#4a9eff';
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.style.color = '';
      }, 2000);
    } catch (error) {
      alert('Copy failed');
    }
  }

  async function toggleFavorite(prompt: Prompt) {
    const promptId = prompt.id;

    try {
      console.log(`[Favorite] Toggle favorite: ${promptId}, current state=${prompt.favorite}`);
      const updatedPrompt = await promptService.toggleFavorite(promptId);
      console.log(`[Favorite] Success: ${promptId}, new state=${updatedPrompt.favorite}`);

      // No need to reload, subscription will pick up changes
      console.log(`[Favorite] Success: ${promptId}, new state=${updatedPrompt.favorite}`);
      console.log(`[Favorite] List reloaded`);
    } catch (error) {
      console.error(`[Favorite] Operation failed:`, error);
      alert(`Operation failed: ${error}`);
    }
  }


  // Calculate dynamic data
  const uniqueCategories = Array.from(
    new Set(prompts.map(p => p.category).filter(Boolean))
  ) as string[];
  
  const promptsForTags = prompts.filter(p => {
    if (!isAdmin && !isPublishedStatus(p.status)) return false;
    
    if (isAdmin && selectedAdminStatus !== 'all') {
      if (selectedAdminStatus === 'draft' && p.status && p.status !== 'draft') return false;
      if (selectedAdminStatus === 'published' && p.status !== 'published' && p.status !== 'active') return false;
      if (selectedAdminStatus === 'private' && p.status !== 'private') return false;
    }

    if (selectedCategory && p.category !== selectedCategory) return false;
    return true;
  });
  
  const availableTagIds = new Set(promptsForTags.flatMap(p => p.tagIds || []));
  const dynamicallyAvailableTags = allTags.filter(tag => availableTagIds.has(tag.id));
  const filteredPopoverTags = [...dynamicallyAvailableTags]
    .filter((tag) => tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase()))
    .sort((a, b) => (b.promptCount || 0) - (a.promptCount || 0));

  return (
    <div className="prompt-list-page">
      {/* ── Row 1: Title + action buttons ──────────────────────── */}
      <div className="page-header">
        <h1>Prompt Library</h1>
        <div className="header-actions">
          {isAdmin && (
            <Link to="/prompts/new" className="btn-primary">
              <Plus size={14} /> New
            </Link>
          )}
        </div>
      </div>

      {/* ── Row 2: Search bar ────────────────────────────────────── */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search prompts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {isAdmin && (
          <select
            className="admin-status-select"
            value={selectedAdminStatus}
            onChange={(e) => setSelectedAdminStatus(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="published">🌐 Published</option>
            <option value="draft">📝 Drafts</option>
            <option value="private">🔒 Private</option>
          </select>
        )}
      </div>

      {(uniqueCategories.length > 0 || dynamicallyAvailableTags.length > 0) && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {uniqueCategories.length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Filter by Category</p>
              <div className="category-tabs" style={{ marginBottom: 0, paddingBottom: 0 }}>
                <button
                  className={`category-tab ${!selectedCategory ? 'active' : ''}`}
                  onClick={() => { setSelectedCategory(null); setActiveTagIds([]); }}
                >
                  All
                </button>
                {uniqueCategories.sort().map(cat => (
                  <button
                    key={cat}
                    className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => { setSelectedCategory(cat); setActiveTagIds([]); }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {dynamicallyAvailableTags.length > 0 && (
            <div>
              <p style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Filter by Tag</p>
              <div className="tag-filters-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div className="tag-popover-container" ref={popoverRef}>
                  <button
                    type="button"
                    className="btn-secondary tag-popover-trigger"
                    onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
                    style={{ padding: '6px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    🏷️ Select Tags {activeTagIds.length > 0 && `(${activeTagIds.length})`}
                  </button>
                  {isTagPopoverOpen && (
                    <div className="tag-popover-dropdown">
                      <div className="tag-popover-search">
                        <input
                          type="text"
                          placeholder="Search tags..."
                          value={tagSearchQuery}
                          onChange={(e) => setTagSearchQuery(e.target.value)}
                          className="tag-popover-search-input"
                        />
                      </div>
                      <div className="tag-popover-list">
                        {filteredPopoverTags.map((tag) => {
                          const isSelected = activeTagIds.includes(tag.id);
                          return (
                            <label key={tag.id} className="tag-popover-item">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setActiveTagIds((prev) =>
                                    prev.includes(tag.id)
                                      ? prev.filter((id) => id !== tag.id)
                                      : [...prev, tag.id]
                                  );
                                }}
                              />
                              <span className="tag-popover-item-name" style={tag.color ? { color: tag.color } : undefined}>
                                {tag.name}
                              </span>
                              {tag.promptCount && tag.promptCount > 0 ? (
                                <span className="tag-popover-item-count">({tag.promptCount})</span>
                              ) : null}
                            </label>
                          );
                        })}
                        {filteredPopoverTags.length === 0 && (
                          <div className="tag-popover-empty">No tags found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {activeTagIds.length > 0 && (
                  <div className="selected-tags-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {activeTagIds.map((tagId) => {
                      const tag = allTags.find((t) => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <span
                          key={tag.id}
                          className="selected-tag-pill"
                          style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                        >
                          {tag.name}
                          <button
                            type="button"
                            className="selected-tag-remove"
                            onClick={() => setActiveTagIds((prev) => prev.filter((id) => id !== tag.id))}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                    <button
                      className="tag-filter-clear"
                      onClick={() => setActiveTagIds([])}
                      style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px' }}
                    >
                      ✕ Clear All
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="prompts-grid">
        {filteredPrompts.length > 0 ? (
          filteredPrompts.map((prompt) => (
            <div key={prompt.id} className="prompt-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ flex: 1 }}>
                <div className="prompt-card-header">
                  <Link to={isAdmin ? `/prompts/${prompt.id}` : `/p/${prompt.id}`} className="prompt-title">
                    {prompt.title}
                    {isAdmin && (!prompt.status || prompt.status === 'draft') && (
                      <span className="status-badge status-draft">📝 Draft</span>
                    )}
                    {isAdmin && prompt.status === 'private' && (
                      <span className="status-badge status-private">🔒 Private</span>
                    )}
                  </Link>
                </div>
                {(prompt.summary || prompt.content) && (
                  <div className="prompt-description">
                    <ReactMarkdown>
                      {prompt.summary || 
                       (prompt.content.length > 150
                         ? `${prompt.content.substring(0, 150)}...`
                         : prompt.content)}
                    </ReactMarkdown>
                  </div>
                )}
                {/* Tag pills on card */}
                {prompt.tagNames && prompt.tagNames.length > 0 && (
                  <div className="prompt-tag-list">
                    {prompt.tagNames.map((tagName, idx) => {
                      const tagObj = allTags.find((t) => t.id === prompt.tagIds?.[idx]);
                      return (
                        <span
                          key={`${prompt.id}-tag-${idx}`}
                          className="prompt-tag-pill"
                          style={tagObj?.color ? { borderColor: tagObj.color, color: tagObj.color } : undefined}
                        >
                          {tagName}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="prompt-meta">
                  <span className="meta-item">
                    Created {new Date(prompt.createdAt).toLocaleDateString()}
                  </span>
                  {prompt.category && (
                    <span className="meta-item category-badge">{prompt.category}</span>
                  )}
                  {prompt.usageCount !== undefined && prompt.usageCount > 0 && (
                    <span className="meta-item usage-count">
                      Used {prompt.usageCount} times
                    </span>
                  )}
                </div>
              </div>
              <div className="prompt-card-actions">
                {!isAdmin && (
                  <Link
                    to={`/p/${prompt.id}`}
                    className="btn-secondary view-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    style={{ padding: '8px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Eye size={14} /> View
                  </Link>
                )}
                <Link
                  to={`/prompts/${prompt.id}/run`}
                  className="btn-primary test-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!userEmail) {
                      e.preventDefault();
                      setIsLoginModalOpen(true);
                    }
                  }}
                  style={{ padding: '8px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Zap size={14} /> Test
                </Link>
                <button
                  className="btn-secondary copy-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copyPrompt(prompt, e.currentTarget);
                  }}
                  style={{ padding: '8px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <CopyIcon size={14} /> Copy
                </button>
                <button
                  className={`icon-btn favorite-btn ${prompt.favorite ? 'favorited' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!userEmail) {
                      setIsLoginModalOpen(true);
                    } else {
                      toggleFavorite(prompt);
                    }
                  }}
                  title={prompt.favorite ? 'Unfavorite' : 'Favorite'}
                >
                  {prompt.favorite ? '⭐' : '☆'}
                </button>
                {isAdmin && (
                  <button
                    className="icon-btn delete-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deletePrompt(prompt.id);
                    }}
                    title="Delete"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            {(searchQuery || activeTagIds.length > 0) ? (
              <div>
                <p>No matching prompts found</p>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setFilters({});
                    setActiveTagIds([]);
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : !isAdmin && prompts.length > 0 ? (
              <div>
                <p>No published prompts available yet.</p>
              </div>
            ) : (
              <div>
                <p>No prompts yet.</p>
                {isAdmin && (
                  <Link to="/prompts/new" className="btn-primary">
                    New Prompt
                  </Link>
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
        description="Please sign in to test or favorite prompts."
      />
    </div>
  );
}

