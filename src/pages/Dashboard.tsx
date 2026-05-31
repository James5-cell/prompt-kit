import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Star, Zap, GraduationCap, Code2, Sparkles, ExternalLink } from 'lucide-react';
import { type Prompt } from '../types';
import { promptService, isPublishedStatus } from '../services/promptService';
import { runService } from '../services/runService';
import { useAuth } from '../auth/AuthContext';
import { useNoIndex } from '../hooks/useNoIndex';
import './Dashboard.css';

// ── Category metadata: icon + label + accent color ────────────
const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  dev:         { label: 'Development',  icon: '💻', color: '#3b82f6' },
  writing:     { label: 'Writing',      icon: '✍️', color: '#8b5cf6' },
  finance:     { label: 'Finance',      icon: '📈', color: '#10b981' },
  learning:    { label: 'Learning',     icon: '📚', color: '#6366f1' },
  thinking:    { label: 'Thinking',     icon: '🧠', color: '#f59e0b' },
  tools:       { label: 'Tools',        icon: '🔧', color: '#06b6d4' },
  translation: { label: 'Translation',  icon: '🌐', color: '#ec4899' },
};

interface CategoryStat {
  name: string;
  label: string;
  icon: string;
  color: string;
  count: number;
}

export default function Dashboard() {
  useNoIndex();
  const { isAdmin, userEmail } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    favorites: 0,
    totalRuns: 0,
    avgRating: 0,
    recentlyAdded: 0,
  });
  const [categories, setCategories] = useState<CategoryStat[]>([]);

  useEffect(() => {
    loadData();

    const handleStorageChange = () => { loadData(); };
    window.addEventListener('storage', handleStorageChange);
    const refreshInterval = setInterval(() => { loadData(); }, 30000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(refreshInterval);
    };
  }, [isAdmin]);

  async function loadData() {
    try {
      let allPrompts = await promptService.getAllPrompts();

      if (!isAdmin) {
        allPrompts = allPrompts.filter((p: Prompt) => isPublishedStatus(p.status));
      }

      const favoritePrompts = allPrompts.filter((p: Prompt) => p.favorite === true);

      const countMap: Record<string, number> = {};
      for (const p of allPrompts) {
        if (p.category) {
          countMap[p.category] = (countMap[p.category] ?? 0) + 1;
        }
      }

      const derivedCategories: CategoryStat[] = Object.entries(countMap)
        .filter(([name]) => CATEGORY_META[name])
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({
          name,
          count,
          label: CATEGORY_META[name].label,
          icon:  CATEGORY_META[name].icon,
          color: CATEGORY_META[name].color,
        }));

      setCategories(derivedCategories);

      const allRuns = await runService.getAllRuns();
      const visiblePromptIds = new Set(allPrompts.map((p: Prompt) => p.id));
      const visibleRuns = isAdmin
        ? allRuns
        : allRuns.filter((r: { promptId: string }) => visiblePromptIds.has(r.promptId));

      const now = Date.now();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const recentlyAddedCount = allPrompts.filter(
        (p: Prompt) => now - p.createdAt <= sevenDaysMs
      ).length;

      setStats({
        total: allPrompts.length,
        favorites: favoritePrompts.length,
        totalRuns: visibleRuns.length,
        avgRating: 0,
        recentlyAdded: recentlyAddedCount,
      });
    } catch (error) {
      console.error('[Dashboard] Failed to load data:', error);
      alert(`Failed to load data: ${error}`);
    }
  }

  const firstName = userEmail ? userEmail.split('@')[0] : null;

  return (
    <div className="dashboard">

      {/* ── Hero Banner ──────────────────────────────────────── */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-text">
          <h1 className="dashboard-hero-title">
            {userEmail
              ? `Vault Archive: ${firstName ? firstName.toUpperCase() : 'PERSONAL'}`
              : 'Private Prompt Vault'}
          </h1>
          <p className="dashboard-hero-subtitle">
            {userEmail
              ? `Status: Online • ${stats.total} prompt${stats.total !== 1 ? 's' : ''} indexed & secured`
              : 'Private vault workspace for high-value prompt assets.'}
          </p>
        </div>
        <div className="dashboard-hero-actions">
          {isAdmin && (
            <Link to="/prompts/new" className="btn-primary">+ New Prompt</Link>
          )}
        </div>
      </div>

      {/* ── Stat Cards (lucide icons + accent border) ─────── */}
      <div className="stat-cards-row">
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--text-muted)' }}>
            <BookOpen size={18} />
          </div>
          <div className="stat-card-body">
            <div className="stat-card-number">{stats.total}</div>
            <div className="stat-card-label">Total Prompts</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--text-muted)' }}>
            <Star size={18} />
          </div>
          <div className="stat-card-body">
            <div className="stat-card-number">{stats.favorites}</div>
            <div className="stat-card-label">Favorites</div>
          </div>
        </div>

        {stats.totalRuns === 0 ? (
          <div className="stat-card stat-card--inactive">
            <div className="stat-card-icon" style={{ color: 'var(--text-faint)' }}>
              <Zap size={18} />
            </div>
            <div className="stat-card-body">
              <div className="stat-card-number" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-muted)', margin: '4px 0' }}>Inactive</div>
              <div className="stat-card-label">Run Configuration</div>
              <div style={{ fontSize: '11px', color: 'var(--text-faint)', margin: '2px 0 6px 0', lineHeight: 1.4 }}>
                Configure API Keys to run prompts.
              </div>
              <Link to="/settings" className="stat-card-cta" style={{ color: 'var(--primary)' }}>Configure Keys →</Link>
            </div>
          </div>
        ) : (
          <div className="stat-card">
            <div className="stat-card-icon" style={{ color: 'var(--text-muted)' }}>
              <Sparkles size={18} />
            </div>
            <div className="stat-card-body">
              <div className="stat-card-number">{stats.recentlyAdded}</div>
              <div className="stat-card-label">Recently Added (7D)</div>
              <Link to="/prompts" className="stat-card-cta" style={{ color: 'var(--primary)' }}>View All →</Link>
            </div>
          </div>
        )}
      </div>

      {/* ── Browse by Category ────────────────────────────── */}
      <section className="dashboard-category-section">
        <div className="dashboard-category-header">
          <h2>Browse by Category</h2>
          <Link to="/prompts" className="view-all-link">View all prompts →</Link>
        </div>

        {categories.length > 0 ? (
          <div className="dashboard-category-grid">
            {categories.map(cat => (
              <Link
                key={cat.name}
                to={`/prompts?category=${cat.name}`}
                className="dashboard-category-card"
              >
                <span className="category-icon">{cat.icon}</span>
                <span className="category-name">{cat.label}</span>
                <span className="category-count">{cat.count} prompt{cat.count !== 1 ? 's' : ''}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <p style={{ marginBottom: '12px' }}>No categories yet</p>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Add prompts with categories in the{' '}
              <Link to="/prompts" style={{ color: 'var(--primary)' }}>Prompt Library</Link>
            </p>
          </div>
        )}
      </section>

      {/* ── Explore More ─────────────────────────────────── */}
      <div className="dashboard-quick-actions">
        <h3 className="quick-actions-title">Explore More</h3>
        <div className="quick-actions-grid">

          <a
            href="https://205055.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="quick-action-card"
          >
            <span className="quick-action-icon">
              <GraduationCap size={16} />
            </span>
            <div>
              <div className="quick-action-name">Skill Lab</div>
              <div className="quick-action-desc">Hands-on guides for mastering AI tools</div>
            </div>
            <ExternalLink size={14} className="quick-action-external" />
          </a>

          <a
            href="https://205022.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="quick-action-card"
          >
            <span className="quick-action-icon">
              <Code2 size={16} />
            </span>
            <div>
              <div className="quick-action-name">DevLibrary</div>
              <div className="quick-action-desc">Bilingual resources for programming depth</div>
            </div>
            <ExternalLink size={14} className="quick-action-external" />
          </a>

          <a
            href="https://www.postsoma-2050.com/ai-insights"
            target="_blank"
            rel="noopener noreferrer"
            className="quick-action-card"
          >
            <span className="quick-action-icon">
              <Sparkles size={16} />
            </span>
            <div>
              <div className="quick-action-name">AI Insights</div>
              <div className="quick-action-desc">Essays, notes, and my personal AI library</div>
            </div>
            <ExternalLink size={14} className="quick-action-external" />
          </a>

        </div>
      </div>

    </div>
  );
}
