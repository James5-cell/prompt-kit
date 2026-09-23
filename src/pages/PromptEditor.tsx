import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type Prompt, type PromptStatus, type Tag } from '../types';
import { promptService } from '../services/promptService';
import { tagService } from '../services/tagService';
import { useAuth } from '../auth/AuthContext';
import { useNoIndex } from '../hooks/useNoIndex';
import SEOHead from '../components/SEOHead';
import './PromptEditor.css';

export default function PromptEditor() {
  useNoIndex();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<PromptStatus>('draft');
  const [sampleOutput, setSampleOutput] = useState('');

  // Tag state
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    // Load available tags
    const unsubscribeTags = tagService.subscribeToTags((tags) => {
      setAllTags(tags.filter((t) => t.isActive));
    });

    if (id && id !== 'new') {
      loadPrompt();
    } else {
      setIsLoading(false);
    }

    return () => {
      if (unsubscribeTags) unsubscribeTags();
    };
  }, [id]);

  function applyLoadedPrompt(loaded: Prompt) {
    setTitle(loaded.title);
    setContent(loaded.content);
    setFavorite(loaded.favorite || false);
    setCategory(loaded.category || '');
    setLanguage(loaded.language || '');
    setSummary(loaded.summary || '');
    setSelectedTagIds(loaded.tagIds || []);
    const loadedStatus = loaded.status || 'draft';
    setStatus(loadedStatus === 'active' ? 'published' : loadedStatus);
    setSampleOutput(loaded.sampleOutput || '');
  }

  async function loadPrompt() {
    if (!id) return;
    setIsLoading(true);
    const loaded = await promptService.getPrompt(id);
    if (loaded) {
      applyLoadedPrompt(loaded);
    }
    setIsLoading(false);
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function handleCreateTag() {
    if (!newTagName.trim() || !isAdmin) return;
    try {
      const tag = await tagService.createTag({ name: newTagName.trim() });
      setSelectedTagIds((prev) => [...prev, tag.id]);
      setNewTagName('');
    } catch (error: any) {
      alert(`Failed to create tag: ${error.message}`);
    }
  }

  function buildPromptData(): Partial<Prompt> {
    const tagNames = selectedTagIds
      .map((tid) => allTags.find((t) => t.id === tid)?.name)
      .filter((name): name is string => !!name);

    return {
      title: title.trim(),
      content: content,
      favorite: favorite,
      category: category.trim() || '',
      language: language.trim() || '',
      summary: summary.trim() || '',
      tagIds: selectedTagIds,
      tagNames: tagNames,
      status: status,
      sampleOutput: sampleOutput.trim() || '',
    };
  }

  async function handleSave() {
    if (!isAdmin) {
      alert('Permission denied: admin login required');
      return;
    }
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsSaving(true);
    try {
      const promptData = buildPromptData();
      if (id === 'new' || !id) {
        await promptService.createPrompt(promptData);
      } else {
        await promptService.updatePrompt(id, promptData);
      }
      navigate('/prompts');
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error('Save failed:', error);
      alert(`Save failed: ${errorMessage}\n\nPlease check the browser console for more information.`);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="prompt-editor">
      <SEOHead
        title={id === 'new' ? 'New Prompt — Prompt Editor' : 'Edit Prompt — Prompt Editor'}
        description="專業 Prompt Engineering 編輯器，支援多變數模板、格式校驗與版本管理。"
        canonical={id === 'new' ? 'https://www.205011.xyz/prompts/new' : `https://www.205011.xyz/prompts/${id}`}
      />
      <div className="editor-header">
        <h1>{id === 'new' ? 'New Prompt' : 'Edit Prompt'}</h1>
        <div className="header-actions">
          {isAdmin && (
            <div className="editor-status-toggle">
              <button 
                className={`status-toggle-btn ${status === 'draft' ? 'active' : ''}`}
                onClick={() => setStatus('draft')}
              >
                Draft
              </button>
              <button 
                className={`status-toggle-btn ${status === 'published' ? 'active' : ''}`}
                onClick={() => setStatus('published')}
              >
                Published
              </button>
              <button 
                className={`status-toggle-btn ${status === 'private' ? 'active' : ''}`}
                onClick={() => setStatus('private')}
              >
                Private
              </button>
            </div>
          )}
          <div className="actions-divider"></div>
          <button
            className="btn-secondary"
            onClick={() => navigate('/prompts')}
          >
            Cancel
          </button>
          <button
            className="btn-primary editor-save-btn"
            onClick={handleSave}
            disabled={isSaving || !isAdmin}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {!isAdmin && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px 16px', 
          backgroundColor: 'rgba(239, 68, 68, 0.03)', 
          border: '1px solid rgba(239, 68, 68, 0.15)', 
          borderRadius: 'var(--radius-sm)', 
          color: 'var(--danger)', 
          fontSize: '12px' 
        }}>
          🔒 Read-Only Vault: Administrator credentials required to create or modify prompt assets.
        </div>
      )}

      <div className="editor-content">
        <div className="editor-section">
          <div className="form-group">
            <label htmlFor="prompt-title">Title *</label>
            <input
              id="prompt-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Prompt title"
              className="title-input input-base"
              required
              disabled={!isAdmin}
            />
            <p className="field-hint">A clear name for identifying this asset in the workspace.</p>
          </div>
          
          <div className="form-group">
            <label htmlFor="prompt-content">Content</label>
            <textarea
              id="prompt-content"
              name="content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder="Enter prompt content..."
              className="content-textarea auto-grow input-base"
              rows={10}
              disabled={!isAdmin}
            />
            <p className="field-hint">The actual system/user instructions. Use <code>{"{{input}}"}</code> as a parameter placeholder if needed.</p>
          </div>

          {/* ── Tags / Metadata Tokens ─────────────────────────── */}
          <div className="form-group tag-metadata-editor">
            <label>Tags & Metadata Tokens</label>
            <div className="tag-input-container">
              {selectedTagIds.length === 0 ? (
                <span className="no-tags-placeholder">No tags assigned. Select from available tags below.</span>
              ) : (
                <div className="active-tags-list">
                  {selectedTagIds.map((tid) => {
                    const tag = allTags.find((t) => t.id === tid);
                    if (!tag) return null;
                    return (
                      <span key={tag.id} className="active-tag-chip">
                        {tag.name}
                        <button
                          type="button"
                          className="remove-tag-btn"
                          onClick={() => toggleTag(tag.id)}
                          disabled={!isAdmin}
                          title="Remove Tag"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            
            {isAdmin && (
              <div className="available-tags-section">
                <span className="available-tags-label">Available tags:</span>
                <div className="available-tags-list">
                  {allTags
                    .filter((tag) => !selectedTagIds.includes(tag.id))
                    .map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className="available-tag-chip"
                        onClick={() => toggleTag(tag.id)}
                      >
                        + {tag.name}
                      </button>
                    ))}
                  
                  <span className="tag-create-inline">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                      placeholder="+ new tag"
                      className="tag-create-input"
                    />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Category & Language ───────────────────────────── */}
          <div className="form-row">
            <div className="form-group form-group-half">
              <label htmlFor="prompt-category">Category</label>
              <input
                id="prompt-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Writing, Coding, Marketing"
                disabled={!isAdmin}
                className="input-base"
              />
              <p className="field-hint">Classification category for asset lookup.</p>
            </div>
            <div className="form-group form-group-half">
              <label htmlFor="prompt-language">Language</label>
              <input
                id="prompt-language"
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g. English, 中文"
                disabled={!isAdmin}
                className="input-base"
              />
              <p className="field-hint">Target linguistic context of the output.</p>
            </div>
          </div>

          {/* ── Summary ──────────────────────────────────────── */}
          <div className="form-group">
            <label htmlFor="prompt-summary">Summary</label>
            <textarea
              id="prompt-summary"
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder="Short description of what this prompt does"
              className="auto-grow input-base"
              rows={2}
              disabled={!isAdmin}
            />
            <p className="field-hint">Brief executive summary displayed on cards in the prompt list.</p>
          </div>

          {/* ── Sample Output ──────────────────────────────────── */}
          <div className="form-group">
            <label htmlFor="prompt-sample-output">Sample Output</label>
            <textarea
              id="prompt-sample-output"
              value={sampleOutput}
              onChange={(e) => {
                setSampleOutput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder="Paste an example AI output to show visitors what this prompt produces"
              className="auto-grow input-base"
              rows={4}
              disabled={!isAdmin}
            />
            <p className="field-hint">
              This will be displayed on the public prompt page as a preview of what this prompt can do.
            </p>
          </div>

          <div className="form-group" style={{ marginTop: '32px' }}>
            <button
              type="button"
              className={`favorite-toggle-btn ${favorite ? 'active' : ''}`}
              onClick={() => setFavorite(!favorite)}
              disabled={!isAdmin}
            >
              {favorite ? '★ Favorited' : '☆ Mark as Favorite'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
