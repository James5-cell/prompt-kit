import { promptSearchScore } from '../utils/promptSearch';
import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import { type Prompt } from '../types';
import { promptService, isPublishedStatus } from '../services/promptService';
import { useAuth } from '../auth/AuthContext';
import LoginModal from '../components/LoginModal';
import SEOHead from '../components/SEOHead';
import PromptCard from '../components/PromptCard';
import { buildReturnTo } from '../utils/returnTo';
import {
  getPromptCategoryMeta,
  PROMPT_CATEGORY_OPTIONS,
} from '../config/categoryMeta';
import DashboardHero, { type CategoryOption } from '../components/DashboardHero';
import { canTryPrompt, selectFeatured } from '../utils/promptUsage';
import './Dashboard.css';

// 首页主题分类
const CATEGORIES: CategoryOption[] = [
  { id: 'all', label: '全部', icon: 'ri:apps-line' },
  ...PROMPT_CATEGORY_OPTIONS.map(category => ({
    id: category.key,
    label: category.label,
    icon: category.icon,
    color: category.color,
  })),
];

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, userEmail } = useAuth();
  // Safe local return path preserved by detail-page "back" links.
  const returnTo = buildReturnTo(location.pathname, location.search);

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  // 默认展示所有分类的管理员精选
  const [selectedCategory, setSelectedCategory] = useState('all');

  // ── Auth Modal 状态 (测试权限硬卡点) ──
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingTrialId, setPendingTrialId] = useState<string | null>(null);
  const [loginModalDesc, setLoginModalDesc] = useState('登录后即可使用轻量文本试用。');

  async function loadData() {
    try {
      let allPrompts = await promptService.getAllPrompts();
      allPrompts = allPrompts.filter((p: Prompt) => !p.isDeleted && isPublishedStatus(p.status) && p.visibility !== 'private');
      setPrompts(allPrompts);
      setLoadError('');
    } catch (error) {
      console.error('[Dashboard] Failed to load prompts:', error);
      setLoadError('暂时无法读取指令库，请重试。');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    // 实时监听 Firestore 数据
    const unsubscribe = promptService.subscribeToPrompts((updated) => {
      setPrompts(updated.filter((p: Prompt) => !p.isDeleted && isPublishedStatus(p.status) && p.visibility !== 'private'));
      setIsLoading(false);
      setLoadError('');
    }, () => { setIsLoading(false); setLoadError('实时连接暂时不可用，当前可能显示缓存内容。请刷新重试。'); });

    const handleStorageChange = () => { loadData(); };
    window.addEventListener('storage', handleStorageChange);


    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('storage', handleStorageChange);

    };
  }, [isAdmin]);

  // 管理员加星推荐，最多三条
  const FEATURED_LIMIT = 3;
  const SEARCH_PREVIEW_LIMIT = 6;

  // 分类浏览范围（严格对齐 5 大实战分类与 dev/development 别名兼容）
  const categoryPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const pCat = (p.category ?? '').toLowerCase();
      return selectedCategory === 'all' ? true : selectedCategory === 'dev'
        ? (pCat === 'dev' || pCat === 'development')
        : pCat === selectedCategory.toLowerCase();
    });
  }, [prompts, selectedCategory]);

  // 搜索与分类共同作用，与指令库筛选行为保持一致。
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return categoryPrompts
      .filter((p) => promptSearchScore(p, searchQuery) > 0)
      .sort((a, b) => promptSearchScore(b, searchQuery) - promptSearchScore(a, searchQuery));
  }, [categoryPrompts, searchQuery]);

  // 搜索展示当前范围的匹配预览；无搜索时仅包含管理员加星项
  const featuredPrompts = useMemo(() => {
    return searchQuery.trim()
      ? searchMatches.slice(0, SEARCH_PREVIEW_LIMIT)
      : selectFeatured(categoryPrompts, FEATURED_LIMIT);
  }, [categoryPrompts, searchMatches, searchQuery]);

  const isSearching = !!searchQuery.trim();

  const libraryMatchCount = searchMatches.length;

  // 进入指令库时保留关键词和分类。
  const resultsHref = useMemo(() => {
    const q = searchQuery.trim();
    if (q) {
      const params = new URLSearchParams({ q });
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      return `/prompts?${params.toString()}`;
    }
    return selectedCategory === 'all' ? '/prompts' : `/prompts?category=${selectedCategory}`;
  }, [searchQuery, selectedCategory]);

  const currentCategoryLabel = selectedCategory === 'all'
    ? '全部分类'
    : getPromptCategoryMeta(selectedCategory).label;
  const libraryScopeCount = categoryPrompts.length;

  // 空状态区分全库搜索无结果与当前分类暂无精选。
  const emptyState = useMemo(() => {
    if (!isSearching) {
      const scope = selectedCategory === 'all' ? '全部' : currentCategoryLabel;
      return {
        title: `${scope}指令暂无精选`,
        desc: '可浏览该范围的全部指令，或切换分类查看其他精选。',
        actionLabel: `浏览${scope}全部指令`,
        href: resultsHref,
        showLibraryLink: false,
      };
    }
    const query = searchQuery.trim();
    return {
      title: `没有找到匹配「${query}」的指令`,
      desc: selectedCategory === 'all' ? '试试更短或更通用的关键词。' : '试试其他关键词，或选择「全部」扩大搜索范围。',
      actionLabel: '清空搜索',
      href: null,
      showLibraryLink: true,
    };
  }, [isSearching, searchQuery, selectedCategory, currentCategoryLabel, resultsHref]);

  // 回车进入指令库的全量结果列表。
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') navigate(resultsHref);
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  // 一键复制 Prompt 全文
  const handleCopy = (_id: string, content: string) => {
    return navigator.clipboard.writeText(content);
  };

  // 点击「⚡ 在线测试」硬卡点逻辑
  const handleTestClick = (prompt: Prompt) => {
    const linkState = returnTo ? { returnTo } : undefined;
    if (!canTryPrompt(prompt)) { navigate(`/p/${prompt.id}`, { state: linkState }); return; }
    if (!userEmail) {
      setLoginModalDesc(`登录后即可免费解锁「${prompt.title}」轻量文本试用，输入内容即可体验效果。`);
      setPendingTrialId(prompt.id);
      setIsLoginModalOpen(true);
    } else {
      navigate(`/prompts/${prompt.id}/run`, { state: linkState });
    }
  };

  const handleFavorite = async (prompt: Prompt) => {
    const updated = await promptService.toggleFavorite(prompt.id);
    setPrompts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  return (
    <div className="dashboard animate-fade-in">
      {/* ── SEO Head 规范注入 (开放爬虫索引) ────────────────────────── */}
      <SEOHead
        title="Prompt Kit — 个人深度实战打磨的高效 AI 提示词库"
        description="收集翻译、写作、学习、思考与研发指令，支持轻量文本试用，并标明所需资料和使用环境。"
        canonical="https://www.205011.xyz/dashboard"
        ogType="website"
      />

      {/* ── 首屏 Hero：高信噪比极简工件命令舱 ────────────────────────── */}
      <DashboardHero
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchKeyDown={handleSearchKeyDown}
        onSearchClear={() => setSearchQuery('')}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        categories={CATEGORIES}
        isSearching={isSearching}
        matchCount={libraryMatchCount}
        shownCount={featuredPrompts.length}
        resultsHref={resultsHref}
      />

      {/* ── 主体区域：严格对齐的精选推荐指令卡片网格 (Featured Prompts Grid) ── */}
      <section className="dashboard-prompt-section">
        <div className="dashboard-section-head">
          <h2 className="dashboard-section-title">{isSearching ? '搜索结果' : '精选推荐'}</h2>
          {isSearching ? (
            <p className="dashboard-section-subtitle">按匹配度排序</p>
          ) : (
            <Link to={resultsHref} className="dashboard-library-link">
              浏览全部 {libraryScopeCount} 条{selectedCategory === 'all' ? '' : currentCategoryLabel}指令
              <ArrowRight size={15} />
            </Link>
          )}
        </div>
        {isLoading ? <p role="status" className="py-8 text-center text-zinc-300">正在读取指令库…</p> : loadError ? <div role="alert" className="py-8 text-center"><p>{loadError}</p><button onClick={loadData} className="btn-secondary mt-3">重新加载</button></div> : featuredPrompts.length > 0 ? (
          <div className="dashboard-prompts-grid">
            {featuredPrompts.map((prompt) => {
              const categoryMeta = getPromptCategoryMeta(prompt.category);

              return (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  isAdmin={isAdmin}
                  returnTo={returnTo}
                  categoryLabel={categoryMeta.label}
                  categoryIcon={categoryMeta.icon}
                  categoryColor={categoryMeta.color}
                  onCopy={handleCopy}
                  onTest={handleTestClick}
                  onFavorite={handleFavorite}
                />
              );
            })}
            {!isSearching && (
              <Link
                to={resultsHref}
                className="dashboard-library-card"
                aria-label={`探索完整指令库，共 ${libraryScopeCount} 条${selectedCategory === 'all' ? '' : currentCategoryLabel}指令`}
              >
                <span className="dashboard-library-card-icon"><BookOpen size={22} /></span>
                <span className="dashboard-library-card-content">
                  <span className="dashboard-library-card-kicker">继续探索</span>
                  <strong>探索完整指令库</strong>
                  <small>共 {libraryScopeCount} 条{selectedCategory === 'all' ? '' : currentCategoryLabel}指令，按分类和使用条件快速筛选。</small>
                  <span className="dashboard-library-card-action">
                    进入指令库 <ArrowRight size={16} />
                  </span>
                </span>
              </Link>
            )}
          </div>
        ) : (
          <div className="dashboard-empty-state">
            <BookOpen size={28} className="text-slate-500" />
            <h3>{emptyState.title}</h3>
            <p>{emptyState.desc}</p>
            <div className="dashboard-empty-actions">
              {emptyState.href ? (
                <Link to={emptyState.href} className="btn-primary">{emptyState.actionLabel}</Link>
              ) : (
                <button onClick={() => setSearchQuery('')} className="btn-primary">{emptyState.actionLabel}</button>
              )}
              {emptyState.showLibraryLink && <Link to="/prompts" className="btn-secondary">浏览完整指令库</Link>}
            </div>
          </div>
        )}
      </section>

      {/* ── 未登录拦截 Auth 弹窗 ──────────────────────────────────── */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => { if (pendingTrialId) navigate(`/prompts/${pendingTrialId}/run`); }}
        title="登录后开始试用"
        description={loginModalDesc}
      />
    </div>
  );
}
