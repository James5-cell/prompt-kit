import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type Prompt } from '../types';
import { promptService } from '../services/promptService';
import { generateId } from '../utils/id';
import './PromptEditor.css';

export default function PromptEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (id && id !== 'new') {
      loadPrompt();
    } else {
      setIsLoading(false);
    }
  }, [id]);

  async function loadPrompt() {
    if (!id) return;
    setIsLoading(true);
    const loaded = await promptService.getPrompt(id);
    if (loaded) {
      setPrompt(loaded);
      setTitle(loaded.title);
      setContent(loaded.content);
    }
    setIsLoading(false);
  }

  async function handleSave() {
    if (!title.trim()) {
      alert('请输入标题');
      return;
    }

    setIsSaving(true);
    try {
      const promptData: Partial<Prompt> = {
        title: title.trim(),
        content: content,
      };

      if (id === 'new' || !id) {
        const newPrompt = await promptService.createPrompt(promptData);
        navigate(`/prompts/${newPrompt.id}`);
      } else {
        await promptService.updatePrompt(id, promptData);
        alert('保存成功！');
      }
    } catch (error) {
      alert(`保存失败: ${error}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="prompt-editor">
      <div className="editor-header">
        <h1>{id === 'new' ? '新建 Prompt' : '编辑 Prompt'}</h1>
        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={() => navigate('/prompts')}
          >
            取消
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="editor-section">
          <div className="form-group">
            <label>标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Prompt 标题"
              className="title-input"
            />
          </div>
          <div className="form-group">
            <label>内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="粘贴或输入 Prompt 内容（支持 Ctrl+V 粘贴长文本）"
              className="content-textarea"
              rows={20}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
