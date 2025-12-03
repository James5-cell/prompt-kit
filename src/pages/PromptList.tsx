import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { type Prompt, type SearchFilters } from '../types';
import { promptService } from '../services/promptService';
import { exportAndDownload } from '../utils/export';
import { importFromJSON, importFromCSV, readFileAsText } from '../utils/import';
import './PromptList.css';

export default function PromptList() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});

  useEffect(() => {
    loadPrompts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [prompts, searchQuery, filters]);

  async function loadPrompts() {
    const allPrompts = await promptService.getAllPrompts();
    setPrompts(allPrompts);
    setFilteredPrompts(allPrompts);
  }

  function applyFilters() {
    let result = [...prompts];

    // 文本搜索
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.content.toLowerCase().includes(query)
      );
    }

    setFilteredPrompts(result);
  }

  async function handleExport(format: 'json' | 'csv' | 'markdown') {
    exportAndDownload(filteredPrompts, format);
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      let importedPrompts: Prompt[] = [];

      if (file.name.endsWith('.json')) {
        importedPrompts = importFromJSON(content);
      } else if (file.name.endsWith('.csv')) {
        importedPrompts = importFromCSV(content);
      } else {
        alert('不支持的文件格式');
        return;
      }

      // 保存导入的 Prompt
      for (const prompt of importedPrompts) {
        await promptService.createPrompt(prompt);
      }

      alert(`成功导入 ${importedPrompts.length} 个 Prompt`);
      loadPrompts();
    } catch (error) {
      alert(`导入失败: ${error}`);
    }

    // 重置文件输入
    event.target.value = '';
  }


  async function deletePrompt(id: string) {
    if (confirm('确定要删除这个 Prompt 吗？')) {
      await promptService.deletePrompt(id);
      loadPrompts();
    }
  }

  async function copyPrompt(prompt: Prompt, buttonElement: HTMLButtonElement) {
    try {
      await navigator.clipboard.writeText(prompt.content);
      const originalText = buttonElement.textContent;
      buttonElement.textContent = '已複製!';
      buttonElement.style.color = '#4a9eff';
      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.style.color = '';
      }, 2000);
    } catch (error) {
      alert('複製失敗');
    }
  }


  return (
    <div className="prompt-list-page">
      <div className="page-header">
        <h1>Prompt 库</h1>
        <div className="header-actions">
          <label className="btn-secondary">
            📥 导入
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
          <div className="export-dropdown">
            <button className="btn-secondary">📤 导出</button>
            <div className="export-menu">
              <button onClick={() => handleExport('json')}>导出为 JSON</button>
              <button onClick={() => handleExport('csv')}>导出为 CSV</button>
              <button onClick={() => handleExport('markdown')}>
                导出为 Markdown
              </button>
            </div>
          </div>
          <Link to="/prompts/new" className="btn-primary">
            ➕ 新建
          </Link>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索 Prompt..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="prompts-grid">
        {filteredPrompts.length > 0 ? (
          filteredPrompts.map((prompt) => (
            <div key={prompt.id} className="prompt-card">
              <div className="prompt-card-header">
                <Link to={`/prompts/${prompt.id}`} className="prompt-title">
                  {prompt.title}
                </Link>
                <div className="prompt-actions">
                  <button
                    className="icon-btn copy-btn"
                    onClick={(e) => copyPrompt(prompt, e.currentTarget)}
                    title="複製"
                  >
                    📋 複製
                  </button>
                  <Link
                    to={`/prompts/${prompt.id}/run`}
                    className="icon-btn"
                    title="查看"
                  >
                    👁️
                  </Link>
                  <button
                    className="icon-btn"
                    onClick={() => deletePrompt(prompt.id)}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              {prompt.content && (
                <p className="prompt-description">
                  {prompt.content.length > 150
                    ? `${prompt.content.substring(0, 150)}...`
                    : prompt.content}
                </p>
              )}
              <div className="prompt-meta">
                <span className="meta-item">
                  创建于 {new Date(prompt.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            {searchQuery ? (
              <div>
                <p>没有找到匹配的 Prompt</p>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setFilters({});
                  }}
                >
                  清除筛选
                </button>
              </div>
            ) : (
              <div>
                <p>还没有 Prompt，创建一个吧！</p>
                <Link to="/prompts/new" className="btn-primary">
                  新建 Prompt
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

