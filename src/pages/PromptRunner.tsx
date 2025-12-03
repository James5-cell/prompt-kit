import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type Prompt } from '../types';
import { promptService } from '../services/promptService';
import './PromptRunner.css';

export default function PromptRunner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  useEffect(() => {
    if (id) {
      loadPrompt();
    }
  }, [id]);

  async function loadPrompt() {
    if (!id) return;
    const loaded = await promptService.getPrompt(id);
    if (loaded) {
      setPrompt(loaded);
      // 简化版本：无需输入槽位
      setInputValues({});
    }
  }


  if (!prompt) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="prompt-runner">
      <div className="runner-header">
        <div>
          <h1>{prompt.title}</h1>
        </div>
        <button className="btn-secondary" onClick={() => navigate(`/prompts/${id}`)}>
          ← 返回编辑
        </button>
      </div>

      <div className="runner-content">
        <div className="input-panel">
          <h2>Prompt 内容</h2>
          <div className="prompt-content-display">
            <pre>{prompt.content}</pre>
          </div>
          <div className="run-controls">
            <button
              className="btn-primary run-btn"
              onClick={() => {
                navigator.clipboard.writeText(prompt.content).then(() => {
                  alert('已复制到剪贴板');
                });
              }}
            >
              📋 复制 Prompt
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

