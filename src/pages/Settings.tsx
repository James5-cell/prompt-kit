import { useState } from 'react';
import { promptService } from '../services/promptService';
import { exportAndDownload } from '../utils/export';
import './Settings.css';

export default function Settings() {
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'markdown'>('json');

  async function handleExportAll() {
    try {
      const allPrompts = await promptService.getAllPrompts();
      exportAndDownload(allPrompts, exportFormat);
    } catch (error) {
      alert(`导出失败: ${error}`);
    }
  }

  async function handleClearData() {
    if (
      confirm(
        '警告：这将清除所有数据！此操作不可恢复。\n\n确定要继续吗？'
      )
    ) {
      try {
        // 清除 IndexedDB
        indexedDB.deleteDatabase('PromptKitDB');
        alert('数据已清除，页面将刷新...');
        window.location.reload();
      } catch (error) {
        alert(`清除失败: ${error}`);
      }
    }
  }

  return (
    <div className="settings-page">
      <h1>设置</h1>

      <div className="settings-section">
        <h2>数据管理</h2>
        <div className="setting-item">
          <label>导出格式</label>
          <select
            value={exportFormat}
            onChange={(e) =>
              setExportFormat(e.target.value as 'json' | 'csv' | 'markdown')
            }
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="markdown">Markdown</option>
          </select>
        </div>
        <div className="setting-item">
          <button className="btn-primary" onClick={handleExportAll}>
            📤 导出所有 Prompt
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h2>危险操作</h2>
        <div className="setting-item">
          <p className="warning-text">
            清除所有数据将永久删除所有 Prompt、运行记录和设置。此操作不可恢复。
          </p>
          <button className="btn-danger" onClick={handleClearData}>
            🗑️ 清除所有数据
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h2>关于</h2>
        <div className="about-content">
          <p>
            <strong>Prompt Kit</strong> - 专业的 Prompt 知识库和工作流工具
          </p>
          <p>版本: 1.0.0</p>
          <p>
            功能特性：
          </p>
          <ul>
            <li>✅ 一键收藏 Prompt</li>
            <li>✅ 结构化编辑与管理</li>
            <li>✅ 多模型运行与对比</li>
            <li>✅ 版本管理与协作</li>
            <li>✅ 导入导出与备份</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

