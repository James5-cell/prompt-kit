import { promptSearchScore } from '../utils/promptSearch';
import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Code2, 
  ExternalLink,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { type Prompt } from '../types';
import { promptService, isPublishedStatus } from '../services/promptService';
import { useAuth } from '../auth/AuthContext';
import LoginModal from '../components/LoginModal';
import SEOHead from '../components/SEOHead';
import PromptCard from '../components/PromptCard';
import DashboardHero, { type CategoryOption } from '../components/DashboardHero';
import { canTryPrompt, selectFeatured } from '../utils/promptUsage';
import './Dashboard.css';

// ── 分类元数据 ──────────────────────────────────────────────────────────
const CATEGORY_MAP: Record<string, { label: string; icon: string; color: string; class: string }> = {
  dev:         { label: '研发工程', icon: 'ri:terminal-box-line', color: 'var(--color-dev)',         class: 'theme-dev' },
  development: { label: '研发工程', icon: 'ri:terminal-box-line', color: 'var(--color-dev)',         class: 'theme-dev' },
  translation: { label: '双语精译', icon: 'ri:translate-2',       color: 'var(--color-translation)', class: 'theme-translation' },
  thinking:    { label: '深度思考', icon: 'ri:brain-line',        color: 'var(--color-thinking)',    class: 'theme-thinking' },
  finance:     { label: '商业金融', icon: 'ri:line-chart-line',   color: 'var(--color-finance)',     class: 'theme-finance' },
  tools:       { label: '效率工具', icon: 'ri:tools-line',        color: 'var(--color-tools)',       class: 'theme-tools' },
  learning:    { label: '学习研究', icon: 'ri:book-read-line',    color: 'var(--color-learning)',    class: 'theme-learning' },
  writing:     { label: '内容创作', icon: 'ri:quill-pen-line',    color: 'var(--color-writing)',     class: 'theme-writing' },
};

// 首页主题分类
const CATEGORIES: CategoryOption[] = [
  { id: 'all', label: '全部', icon: 'ri:apps-line' },
  { id: 'learning', label: '学习研究', icon: 'ri:book-read-line' },
  { id: 'writing', label: '内容创作', icon: 'ri:quill-pen-line' },
  { id: 'dev', label: '研发工程', icon: 'ri:terminal-box-line', color: '#00f2fe' },
  { id: 'translation', label: '双语精译', icon: 'ri:translate-2', color: '#ff2a85' },
  { id: 'thinking', label: '深度思考', icon: 'ri:brain-line', color: '#bf5af2' },
  { id: 'finance', label: '商业金融', icon: 'ri:line-chart-line', color: '#00ff87' },
  { id: 'tools', label: '效率工具', icon: 'ri:tools-line', color: '#06b6d4' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin, userEmail } = useAuth();

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

  // 过滤提示词列表（严格对齐 5 大实战分类与 dev/development 别名兼容）
  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const pCat = (p.category ?? '').toLowerCase();
      const matchCat =
        selectedCategory === 'all' ? true : selectedCategory === 'dev'
          ? (pCat === 'dev' || pCat === 'development')
          : pCat === selectedCategory.toLowerCase();

      const matchSearch = promptSearchScore(p, searchQuery) > 0;

      return matchCat && matchSearch;
    }).sort((a, b) => promptSearchScore(b, searchQuery) - promptSearchScore(a, searchQuery));
  }, [prompts, selectedCategory, searchQuery]);

  // 搜索展示匹配项；推荐仅包含管理员加星项
  const featuredPrompts = useMemo(() => {
    return searchQuery.trim() ? filteredPrompts.slice(0, FEATURED_LIMIT) : selectFeatured(filteredPrompts, FEATURED_LIMIT);
  }, [filteredPrompts, searchQuery]);

  // 回车直接前往 Prompt Library 检索对应分类或关键词
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = searchQuery.trim();
      if (q) {
        navigate(`/prompts?q=${encodeURIComponent(q)}${selectedCategory === 'all' ? '' : `&category=${selectedCategory}`}`);
      } else {
        navigate(selectedCategory === 'all' ? '/prompts' : `/prompts?category=${selectedCategory}`);
      }
    }
  };

  // 一键复制 Prompt 全文
  const handleCopy = (_id: string, content: string) => {
    return navigator.clipboard.writeText(content);
  };

  // 点击「⚡ 在线测试」硬卡点逻辑
  const handleTestClick = (prompt: Prompt) => {
    if (!canTryPrompt(prompt)) { navigate(`/p/${prompt.id}#usage-guide`); return; }
    if (!userEmail) {
      setLoginModalDesc(`登录后即可免费解锁「${prompt.title}」轻量文本试用，输入内容即可体验效果。`);
      setPendingTrialId(prompt.id);
      setIsLoginModalOpen(true);
    } else {
      navigate(`/prompts/${prompt.id}/run`);
    }
  };

  const handleFavorite = async (prompt: Prompt) => {
    const updated = await promptService.toggleFavorite(prompt.id);
    setPrompts(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const currentCategoryLabel = CATEGORY_MAP[selectedCategory]?.label || '全部分类';

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
        onSelectCategory={setSelectedCategory}
        categories={CATEGORIES}
        featuredCount={featuredPrompts.length}
        isSearching={!!searchQuery.trim()}
        totalFilteredCount={filteredPrompts.length}
        totalVaultCount={prompts.length}
        onNavigateToLibrary={() => {
          const q = searchQuery.trim();
          if (q) {
            navigate(`/prompts?q=${encodeURIComponent(q)}${selectedCategory === 'all' ? '' : `&category=${selectedCategory}`}`);
          } else {
            navigate(selectedCategory === 'all' ? '/prompts' : `/prompts?category=${selectedCategory}`);
          }
        }}
      />

      {/* ── 主体区域：严格对齐的精选推荐指令卡片网格 (Featured Prompts Grid) ── */}
      <section className="dashboard-prompt-section">
        {isLoading ? <p role="status" className="py-8 text-center text-zinc-300">正在读取指令库…</p> : loadError ? <div role="alert" className="py-8 text-center"><p>{loadError}</p><button onClick={loadData} className="btn-secondary mt-3">重新加载</button></div> : featuredPrompts.length > 0 ? (
          <>
            <div className="dashboard-prompts-grid">
              {featuredPrompts.map((prompt) => {
                const categoryMeta = prompt.category ? CATEGORY_MAP[prompt.category.toLowerCase()] : null;

                return (
                  <PromptCard
                    key={prompt.id}
                    prompt={prompt}
                    isAdmin={isAdmin}
                    categoryLabel={categoryMeta?.label}
                    categoryIcon={categoryMeta?.icon}
                    categoryColor={categoryMeta?.color}
                    onCopy={handleCopy}
                    onTest={handleTestClick}
                    onFavorite={handleFavorite}
                  />
                );
              })}
            </div>

            {/* ── 底部全量引导大按钮模块 (Lead to Library 动态联动当前分类) ── */}
            <div className="lead-to-library-banner">
              <div className="lead-library-badge">
                <BookOpen size={13} className="text-primary" />
                <span>FULL ASSET REPOSITORY</span>
              </div>

              <h3 className="lead-library-title">
                探索完整指令库
                <span className="lead-library-count">（当前全库已收录 {prompts.length} 项）</span>
              </h3>

              <p className="lead-library-desc">
                管理员加星的指令会进入精选。完整指令库包含「{currentCategoryLabel}」的全部收录，并标明哪些可以试用、哪些适合在其他 Agent 中使用。
              </p>

              <div className="lead-library-actions">
                <Link
                  to={
                    searchQuery.trim()
                      ? `/prompts?q=${encodeURIComponent(searchQuery.trim())}${selectedCategory === 'all' ? '' : `&category=${selectedCategory}`}`
                      : selectedCategory === 'all' ? '/prompts' : `/prompts?category=${selectedCategory}`
                  }
                  className="btn-lead-library"
                >
                  <span>探索「{currentCategoryLabel}」及全库所有指令 (Prompt Library) →</span>
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="dashboard-empty-state">
            <BookOpen size={28} className="text-slate-500" />
            <h3>{searchQuery.trim() ? '未找到匹配的指令' : '这个分类暂未设置精选'}</h3>
            <p>{searchQuery.trim() ? '试试更短的关键词，或清空搜索。' : '管理员可在指令库点击星星。加星后，按创建时间从新到旧展示前三条。'}</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="btn-secondary"
              style={{ marginTop: '12px' }}
            >
              重置所有筛选项
            </button>
            <Link to="/prompts" className="btn-secondary ml-2">浏览完整指令库</Link>
          </div>
        )}
      </section>

      {/* ── 底部：Explore More Services 生态联动 ─────────────────────── */}
      <div className="dashboard-quick-actions">
        <h3 className="quick-actions-title">Explore Ecosystem Services</h3>
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
