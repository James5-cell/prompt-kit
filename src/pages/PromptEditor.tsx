import { buildTrialSystem, trialBudgetError, getTrialInputLimit } from '../utils/trialBudget';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type Prompt, type PromptStatus, type Tag } from '../types';
import { promptService } from '../services/promptService';
import { tagService } from '../services/tagService';
import { useAuth } from '../auth/AuthContext';
import { useNoIndex } from '../hooks/useNoIndex';
import SEOHead from '../components/SEOHead';
import { USAGE_LABELS } from '../utils/promptUsage';
import './PromptEditor.css';

export default function PromptEditor() {
  useNoIndex();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [summary, setSummary] = useState('');
  const [status, setStatus] = useState<PromptStatus>('draft');
  const [usageMode, setUsageMode] = useState<NonNullable<Prompt['usageMode']>>('external');
  const [inputHint, setInputHint] = useState('');
  const [outputHint, setOutputHint] = useState('');
  const [usageNotes, setUsageNotes] = useState('');
  const [sampleInput, setSampleInput] = useState('');
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
    setUsageMode(loaded.usageMode ?? 'external');
    setInputHint(loaded.inputHint || '');
    setOutputHint(loaded.outputHint || '');
    setUsageNotes(loaded.usageNotes || '');
    setSampleInput(loaded.sampleInput || '');
  }

  async function loadPrompt() {
    if (!id) return;
    setIsLoading(true);
    try {
      const loaded = await promptService.getPrompt(id);
      if (loaded) applyLoadedPrompt(loaded);
      else setLoadError('找不到这条指令，可能已被删除。');
    } catch {
      setLoadError('无法读取这条指令，请返回指令库后重试。');
    } finally {
      setIsLoading(false);
    }
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
      setSaveError(`创建标签失败：${error.message}`);
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
      trialInputMaxChars: usageMode === 'external' ? 0 : getTrialInputLimit(content),
      usageMode, inputHint: inputHint.trim(), outputHint: outputHint.trim(),
      usageNotes: usageNotes.trim(), sampleInput: sampleInput.trim(),
    };
  }

  async function handleSave() {
    if (!isAdmin) {
      setSaveError('需要管理员权限才能保存指令。');
      return;
    }
    if (!title.trim()) {
      setSaveError('请输入指令名称。');
      return;
    }

    if (!content.trim()) { setSaveError('请输入完整指令内容。'); return; }
    if (status === 'published' && (!inputHint.trim() || !outputHint.trim() || !usageNotes.trim())) {
      setSaveError('发布前请补齐输入要求、输出说明和使用条件。'); return;
    }
    if (usageMode !== 'external') {
      const limit = getTrialInputLimit(content);
      if (limit === 0) { setSaveError('指令本身超出轻量试用预算，请精简指令或改为需要外部环境。'); return; }
      if (status === 'published' && !sampleInput.trim()) { setSaveError('可试用指令发布前需要一个示例输入。'); return; }
      if (sampleInput.trim()) {
        const error = trialBudgetError(buildTrialSystem(content, sampleInput.trim()), [{ role: 'user', content: sampleInput.trim() }], limit);
        if (error) { setSaveError(`示例输入无法试用：${error}`); return; }
      }
    }
    setSaveError('');
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
      setSaveError(`保存失败：${errorMessage}。请重试。`);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="loading" role="status">正在读取指令…</div>;
  }

  if (loadError) {
    return <div className="prompt-editor"><p role="alert">{loadError}</p><button className="btn-secondary" onClick={() => navigate('/prompts')}>返回指令库</button></div>;
  }

  return (
    <div className="prompt-editor">
      <SEOHead
        title={isNew ? '新建指令 — Prompt Kit' : '编辑指令 — Prompt Kit'}
        description="编辑指令内容、使用条件和示例。"
        canonical={isNew ? 'https://www.205011.xyz/prompts/new' : `https://www.205011.xyz/prompts/${id}`}
      />
      {saveError && <p role="alert" className="rounded-lg border border-red-700 p-3 text-red-300">{saveError}</p>}
      <div className="editor-header">
        <h1>{isNew ? '新建指令' : '编辑指令'}</h1>
        <div className="header-actions">
          {isAdmin && (
            <div className="editor-status-toggle">
              <button 
                className={`status-toggle-btn ${status === 'draft' ? 'active' : ''}`}
                aria-pressed={status === 'draft'}
                onClick={() => setStatus('draft')}
              >
                草稿
              </button>
              <button 
                className={`status-toggle-btn ${status === 'published' ? 'active' : ''}`}
                aria-pressed={status === 'published'}
                onClick={() => setStatus('published')}
              >
                已发布
              </button>
              <button 
                className={`status-toggle-btn ${status === 'private' ? 'active' : ''}`}
                aria-pressed={status === 'private'}
                onClick={() => setStatus('private')}
              >
                私有
              </button>
            </div>
          )}
          <div className="actions-divider"></div>
          <button
            className="btn-secondary"
            onClick={() => navigate('/prompts')}
          >
            取消
          </button>
          <button
            className="btn-primary editor-save-btn"
            onClick={handleSave}
            disabled={isSaving || !isAdmin}
          >
            {isSaving ? '保存中…' : '保存'}
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
          当前为只读模式，登录管理员账号后可创建或修改指令。
        </div>
      )}

      <div className="editor-content">
        <div className="editor-section">
          <div className="form-group">
            <label htmlFor="prompt-title">指令名称 *</label>
            <input
              id="prompt-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入指令名称"
              className="title-input input-base"
              required
              disabled={!isAdmin}
            />
            <p className="field-hint">用简短的名称说明这条指令的用途。</p>
          </div>
          
          <div className="form-group">
            <label htmlFor="prompt-content">完整指令 *</label>
            <textarea
              id="prompt-content"
              name="content"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder="输入完整的指令内容"
              className="content-textarea auto-grow input-base"
              rows={10}
              disabled={!isAdmin}
            />
            <p className="field-hint">需要用户填写的内容可以用 <code>{"{{input}}"}</code> 作为占位符。</p>
          </div>

          {/* ── Tags / Metadata Tokens ─────────────────────────── */}
          <div className="form-group tag-metadata-editor">
            <label>标签</label>
            <div className="tag-input-container">
              {selectedTagIds.length === 0 ? (
                <span className="no-tags-placeholder">尚未选择标签。</span>
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
                          aria-label={`移除标签 ${tag.name}`}
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
                <span className="available-tags-label">可选标签</span>
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
                      placeholder="输入新标签后按回车"
                      aria-label="创建新标签，输入后按回车"
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
              <label htmlFor="prompt-category">分类</label>
              <input
                id="prompt-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="例如：写作、研发"
                disabled={!isAdmin}
                className="input-base"
              />
              <p className="field-hint">用于分类查找指令。</p>
            </div>
            <div className="form-group form-group-half">
              <label htmlFor="prompt-language">语言</label>
              <input
                id="prompt-language"
                type="text"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="例如：中文、English"
                disabled={!isAdmin}
                className="input-base"
              />
              <p className="field-hint">指令输出使用的语言。</p>
            </div>
          </div>

          {/* ── Summary ──────────────────────────────────────── */}
          <div className="form-group">
            <label htmlFor="prompt-summary">简介</label>
            <textarea
              id="prompt-summary"
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder="简要说明这条指令能做什么"
              className="auto-grow input-base"
              rows={2}
              disabled={!isAdmin}
            />
            <p className="field-hint">显示在指令库的卡片上。</p>
          </div>

          <div className="form-group">
            <label htmlFor="usage-mode">使用条件</label>
            <select id="usage-mode" className="input-base" value={usageMode} onChange={e => setUsageMode(e.target.value as NonNullable<Prompt['usageMode']>)} disabled={!isAdmin}>
              {Object.entries(USAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <p className="field-hint">外部环境类仅保留复制与详情入口。新指令需确认条件后再开放试用。</p>
          </div>
          <div className="form-group"><label htmlFor="input-hint">输入／准备资料</label><input id="input-hint" className="input-base" value={inputHint} onChange={e => setInputHint(e.target.value)} disabled={!isAdmin} /></div>
          <div className="form-group"><label htmlFor="output-hint">预期产出</label><input id="output-hint" className="input-base" value={outputHint} onChange={e => setOutputHint(e.target.value)} disabled={!isAdmin} /></div>
          <div className="form-group"><label htmlFor="usage-notes">使用说明／外部 Agent 指引</label><textarea id="usage-notes" className="input-base" rows={3} value={usageNotes} onChange={e => setUsageNotes(e.target.value)} disabled={!isAdmin} /></div>
          <div className="form-group"><label htmlFor="sample-input">示例输入</label><textarea id="sample-input" className="input-base" rows={3} value={sampleInput} onChange={e => setSampleInput(e.target.value)} disabled={!isAdmin} /></div>

          {/* ── Sample Output ──────────────────────────────────── */}
          <div className="form-group">
            <label htmlFor="prompt-sample-output">示例输出</label>
            <textarea
              id="prompt-sample-output"
              value={sampleOutput}
              onChange={(e) => {
                setSampleOutput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              placeholder="粘贴一段示例输出"
              className="auto-grow input-base"
              rows={4}
              disabled={!isAdmin}
            />
            <p className="field-hint">
              显示在公开详情页，帮助读者了解可能的结果。
            </p>
          </div>

          <div className="form-group" style={{ marginTop: '32px' }}>
            <button
              type="button"
              className={`favorite-toggle-btn ${favorite ? 'active' : ''}`}
              aria-pressed={favorite}
              onClick={() => setFavorite(!favorite)}
              disabled={!isAdmin}
            >
              {favorite ? '★ 已加入首页推荐' : '☆ 加星并加入首页推荐'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
