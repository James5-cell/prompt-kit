import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { type Prompt } from '../types';
import { promptService } from '../services/promptService';
import { runService } from '../services/runService';
import './Dashboard.css';

export default function Dashboard() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    favorites: 0,
    totalRuns: 0,
    avgRating: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const allPrompts = await promptService.getAllPrompts();
    
    setPrompts(allPrompts);

    const allRuns = await runService.getAllRuns();

    setStats({
      total: allPrompts.length,
      favorites: 0,
      totalRuns: allRuns.length,
      avgRating: 0,
    });
  }

  const recentPrompts = [...prompts]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>看板</h1>
        <Link to="/prompts/new" className="btn-primary">
          ➕ 新建 Prompt
        </Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">总 Prompt 数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.totalRuns}</div>
          <div className="stat-label">总运行次数</div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2>最近创建的 Prompt</h2>
          <div className="prompt-list">
            {recentPrompts.length > 0 ? (
              recentPrompts.map((prompt) => (
                <Link
                  key={prompt.id}
                  to={`/prompts/${prompt.id}`}
                  className="prompt-card"
                >
                  <div className="prompt-card-header">
                    <h3>{prompt.title}</h3>
                    <span className="created-date">
                      {new Date(prompt.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {prompt.content && (
                    <p className="prompt-description">
                      {prompt.content.length > 100
                        ? `${prompt.content.substring(0, 100)}...`
                        : prompt.content}
                    </p>
                  )}
                </Link>
              ))
            ) : (
              <div className="empty-state">暂无数据</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}





