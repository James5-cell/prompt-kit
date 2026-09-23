import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon as RiIcon } from '@iconify/react';
import { 
  BookOpen, 
  Star, 
  Zap, 
  GraduationCap, 
  Code2, 
  Sparkles, 
  ExternalLink,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { ICON_SIZE } from '../config/iconSizes';
import { type Prompt } from '../types';
import { promptService, isPublishedStatus } from '../services/promptService';
import { runService } from '../services/runService';
import { useAuth } from '../auth/AuthContext';
import { useNoIndex } from '../hooks/useNoIndex';
import SEOHead from '../components/SEOHead';

import './Dashboard.css';

// ── Category metadata: iconName (Iconify RI) + label + accent color ────────────
const CATEGORY_META: Record<string, { label: string; iconName: string; color: string; class: string }> = {
  dev:         { label: 'Development',  iconName: 'ri:terminal-box-line',  color: 'var(--color-dev)',         class: 'theme-dev' },
  writing:     { label: 'Writing',      iconName: 'ri:quill-pen-line',      color: 'var(--color-writing)',     class: 'theme-writing' },
  finance:     { label: 'Finance',      iconName: 'ri:line-chart-line',     color: 'var(--color-finance)',     class: 'theme-finance' },
  learning:    { label: 'Learning',     iconName: 'ri:book-read-line',      color: 'var(--color-learning)',    class: 'theme-learning' },
  thinking:    { label: 'Thinking',     iconName: 'ri:brain-line',          color: 'var(--color-thinking)',    class: 'theme-thinking' },
  tools:       { label: 'Tools',        iconName: 'ri:tools-line',          color: 'var(--color-tools)',       class: 'theme-tools' },
  translation: { label: 'Translation',  iconName: 'ri:translate-2',         color: 'var(--color-translation)', class: 'theme-translation' },
};

interface CategoryStat {
  name: string;
  label: string;
  iconName: string;
  color: string;
  class: string;
  count: number;
}

// ── Dependency-Free Count-Up Animation Component ──────────────────────
function CountUp({ end, duration = 800 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <>{count}</>;
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
  const [sparklinePoints, setSparklinePoints] = useState<string>('0,40 120,40');
  const [sparklineFillPoints, setSparklineFillPoints] = useState<string>('0,40 120,40');

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
          label:    CATEGORY_META[name].label,
          iconName: CATEGORY_META[name].iconName,
          color:    CATEGORY_META[name].color,
          class:    CATEGORY_META[name].class,
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

      // Compute SVG Sparkline based on Last 7 Days prompt growth history
      const oneDayMs = 24 * 60 * 60 * 1000;
      const countsList = Array.from({ length: 7 }, (_, i) => {
        const targetDay = now - (6 - i) * oneDayMs;
        // Count prompts created before or on that day
        return allPrompts.filter(p => p.createdAt <= targetDay).length;
      });

      const minVal = Math.min(...countsList);
      const maxVal = Math.max(...countsList);
      const range = maxVal - minVal || 1;
      const width = 160;
      const height = 45;

      const pts = countsList.map((val, idx) => {
        const x = (idx / 6) * width;
        const y = height - ((val - minVal) / range) * (height - 12) - 6;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      setSparklinePoints(pts.join(' '));
      setSparklineFillPoints(`0,${height} ${pts.join(' ')} ${width},${height}`);

    } catch (error) {
      console.error('[Dashboard] Failed to load data:', error);
      alert(`Failed to load data: ${error}`);
    }
  }

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

  const firstName = userEmail ? userEmail.split('@')[0] : null;

  return (
    <div className="dashboard animate-fade-in">
      <SEOHead
        title="Dashboard — 工作台"
        description="Prompt Kit 總覽儀表板：提示詞資產統計、分類概況與快速工作流。"
        canonical="https://www.205011.xyz/dashboard"
      />

      {/* ── Hero Banner ──────────────────────────────────────── */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-text">
          <div className="terminal-header-tag">
            <span className="dot animate-pulse"></span>
            <span>SYSTEM CONSOLE SECURE</span>
          </div>
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
        {/* Main Indicator: Total Prompts (Double Width) */}
        <div className="stat-card stat-card-main">
          <div className="stat-card-glow-bg"></div>
          <div className="stat-card-main-header">
            <div className="stat-card-icon-container">
              <BookOpen size={20} className="text-primary" />
            </div>
            <div>
              <div className="stat-card-label">Total Indexed Assets</div>
              <div className="stat-card-number font-display">
                <CountUp end={stats.total} />
              </div>
            </div>
          </div>
          <div className="stat-card-sparkline-area">
            <div className="sparkline-title">
              <TrendingUp size={12} className="text-success" style={{ marginRight: '4px' }} />
              <span>Asset Index Trend (7D)</span>
            </div>
            <svg width="100%" height="45" viewBox="0 0 160 45" preserveAspectRatio="none" className="sparkline-svg">
              <defs>
                <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <polygon points={sparklineFillPoints} fill="url(#sparkline-grad)" />
              <polyline fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={sparklinePoints} />
            </svg>
          </div>
        </div>

        {/* Card 2: Favorites */}
        <div className="stat-card">
          <div className="stat-card-icon" style={{ color: 'var(--warning)' }}>
            <Star size={20} fill="var(--warning)" style={{ filter: 'drop-shadow(0 0 4px rgba(255, 179, 0, 0.4))' }} />
          </div>
          <div className="stat-card-body">
            <div className="stat-card-number font-display">
              <CountUp end={stats.favorites} />
            </div>
            <div className="stat-card-label">Starred Prompts</div>
            <p className="stat-card-desc">Quick-access favorite scripts</p>
          </div>
        </div>

        {/* Card 3: Recently Added or Active Status */}
        {stats.totalRuns === 0 ? (
          <div className="stat-card stat-card--inactive">
            <div className="stat-card-icon" style={{ color: 'var(--text-faint)' }}>
              <Zap size={20} />
            </div>
            <div className="stat-card-body" style={{ width: '100%' }}>
              <div className="stat-card-number font-display" style={{ fontSize: '18px', color: 'var(--text-muted)' }}>Inactive</div>
              <div className="stat-card-label">API Configuration</div>
              <p className="stat-card-desc" style={{ marginBottom: '8px' }}>Setup keys to run prompt test sandbox.</p>
              <Link to="/settings" className="stat-card-action-link">Configure Keys →</Link>
            </div>
          </div>
        ) : (
          <div className="stat-card">
            <div className="stat-card-icon" style={{ color: 'var(--success)' }}>
              <Sparkles size={20} style={{ filter: 'drop-shadow(0 0 4px rgba(0, 255, 135, 0.4))' }} />
            </div>
            <div className="stat-card-body" style={{ width: '100%' }}>
              <div className="stat-card-number font-display">
                <CountUp end={stats.recentlyAdded} />
              </div>
              <div className="stat-card-label">Weekly Releases</div>
              <p className="stat-card-desc" style={{ marginBottom: '8px' }}>Created in last 7 days</p>
              <Link to="/prompts" className="stat-card-action-link">View Library →</Link>
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
            {categories.map(cat => {
              return (
                <Link
                  key={cat.name}
                  to={`/prompts?category=${cat.name}`}
                  className={`dashboard-category-card ${cat.class}`}
                >
                  <div className="cat-icon-wrapper" style={{ color: cat.color }}>
                    <RiIcon icon={cat.iconName} width={ICON_SIZE.lg} height={ICON_SIZE.lg} />
                  </div>
                  <span className="category-name">{cat.label}</span>
                  <span className="category-count">{cat.count} prompt{cat.count !== 1 ? 's' : ''}</span>
                  <ArrowUpRight size={14} className="cat-hover-arrow" />
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state-container">
            <p>No prompt categories defined yet.</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Create prompts with categories in the{' '}
              <Link to="/prompts" style={{ color: 'var(--primary)' }}>Prompt Library</Link>
            </p>
          </div>
        )}
      </section>

      {/* ── Explore More ─────────────────────────────────── */}
      <div className="dashboard-quick-actions">
        <h3 className="quick-actions-title">Explore More Services</h3>
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
