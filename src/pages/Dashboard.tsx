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

// 首页核心聚焦的 5 大实战领域 (彻底移除 All 标签)
const CATEGORIES: CategoryOption[] = [
  { id: 'dev', label: 'Dev 研发工程', icon: 'ri:terminal-box-line', color: '#00f2fe' },
  { id: 'translation', label: 'Translation 双语精译', icon: 'ri:translate-2', color: '#ff2a85' },
  { id: 'thinking', label: 'Thinking 深度思考', icon: 'ri:brain-line', color: '#bf5af2' },
  { id: 'finance', label: 'Finance 商业金融', icon: 'ri:line-chart-line', color: '#00ff87' },
  { id: 'tools', label: 'Tools 效率工具', icon: 'ri:tools-line', color: '#06b6d4' },
];

// ── 预置保底实战 Prompts (覆盖 5 大场景，确保秒开体验) ───────────────
const FALLBACK_DASHBOARD_PROMPTS: Prompt[] = [
  // 1. Dev 研发工程
  {
    id: 'python-code-optimizer',
    title: 'Python 代码优化与安全审计专家 (Python Code Optimizer)',
    summary: '审查 Python 程式码的效能瓶颈、内存泄露、并发竞态，并严格符合 PEP 8 与安全加固规范。',
    content: `你是一位资深 Python 架构师。请深度审查用户提供的代码：
1. [安全漏洞]：识别潜在注入、反序列化、未校验外部输入等漏洞。
2. [性能瓶颈]：指出复杂度过高的循环、内存泄露及并发热点。
3. [重构修复]：输出完全符合 PEP-8 标准的重构补丁，并附带类型标注与单元测试建议。`,
    category: 'dev',
    tagNames: ['Python', 'Code Quality', 'Optimization', 'Security'],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    status: 'published',
  },
  {
    id: 'system-architecture-reviewer',
    title: '分布式系统高可用架构评审专家 (System Architecture Reviewer)',
    summary: '剖析微服务链路、缓存击穿、分布式事务容错与限流熔断策略，打造 99.99% 可用性系统。',
    content: `你是一位大厂资深分布式系统首席架构师。请针对提供的系统架构图或技术方案进行评审：
1. [高可用审查]：评估单点故障 (SPOF)、降级策略与超时传播。
2. [数据一致性]：分析分布式事务（Saga / TCC）与缓存-数据库双写一致性保障。
3. [容量压测规划]：预估 QPS 峰值水线与弹性扩缩容阈值。`,
    category: 'dev',
    tagNames: ['Architecture', 'Distributed Systems', 'Cloud'],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    status: 'published',
  },
  {
    id: 'api-design-specifier',
    title: 'RESTful 与 GraphQL 工业级 API 契约设计专家',
    summary: '规范化设计高兼容 API 接口规范，自动生成 OpenAPI 3.1 规格定义与严苛入参校验方案。',
    content: `你是一位资深 API 架构师。请针对业务需求制定工业级接口契约：
1. [语义对齐]：遵循 RESTful 规范定义 HTTP Method、URI 命名与状态码映射。
2. [容错校验]：严格约束字段类型边界、幂等性 Token 机制与分页规范。
3. [契约输出]：生成标准 OpenAPI (Swagger) 格式定义。`,
    category: 'dev',
    tagNames: ['API', 'REST', 'OpenAPI', 'Backend'],
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
    status: 'published',
  },

  // 2. Translation 双语精译
  {
    id: 'bilingual-translation-polisher',
    title: '技术与商业中英双语「信达雅」精译润色专家',
    summary: '针对技术白皮书、软件工程文档与商业提案，超越字面直译，输出符合原生语境的专业表达。',
    content: `你是一位顶级中英双语科技译者与语言学家。请遵循「信、达、雅」准则翻译输入文本：
1. [语境对齐]：保留技术术语准确性与语法架构。
2. [意译升华]：符合英文原生工程/商业表达习惯，消弭中式英语生硬感。
3. [术语对照表]：附关键术语的上下文对应关系与业界标准用词解释。`,
    category: 'translation',
    tagNames: ['Translation', 'English', 'Localization', 'Writing'],
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
    status: 'published',
  },
  {
    id: 'academic-paper-translator',
    title: '计算机与人工智能顶会论文中英学术精译器',
    summary: '针对 CVPR/ICLR/ACL 学术论文，精确转换被动句态、消歧术语概念，生成符合发表标准的学术英语。',
    content: `你是一位顶级学术论文审稿人兼专业翻译。请将学术段落精译为顶级顶会标准英文：
1. [学术严谨]：精准对齐 SOTA、Ablation Study 等顶会通用语汇。
2. [句式升华]：重构复杂定语从句，增强论证逻辑链条的连贯性。
3. [修改备注文档]：注明关键动词替换理由与语体升级对照。`,
    category: 'translation',
    tagNames: ['Academic', 'Translation', 'Paper', 'AI'],
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 6,
    status: 'published',
  },

  // 3. Thinking 深度思考
  {
    id: 'deep-thinking-synthesizer',
    title: '第一性原理深度推演与决策引擎 (First-Principles Thinking Engine)',
    summary: '基于第一性原理与二阶思维，解构复杂问题本质，剖析隐性假设并推导高确定性执行方案。',
    content: `你是一位精通第一性原理的战略科学家。请针对用户提出的复杂命题执行深度解构：
1. [假设剥离]：列出当前行业或常识中存在的所有潜意识假设，并评估其真伪。
2. [底层公理]：拆解到物理、经济或数学层面上不可再分的核心约束条件。
3. [二阶效应]：推演决策在 6 个月、2 年后的次生衍生连锁反应与风险对冲。`,
    category: 'thinking',
    tagNames: ['First Principles', 'Decision Making', 'Mental Models'],
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
    status: 'published',
  },
  {
    id: 'critical-thinking-news-deconstructor',
    title: '新闻解构者：批判性思维阅读与立场漏洞透视助手',
    summary: '透过专业的新闻分析架构，协助使用者识别报道的事实核心、逻辑漏洞与潜在立场。',
    content: `你是一位严谨的深度新闻调查记者与批判性思维导师。请深度解构输入文本：
1. [事实核验]：还原 5W1H 核心事实链条，过滤情绪化修饰词。
2. [逻辑审计]：识别非黑即白、偷换概念等常见逻辑谬误。
3. [立场透视]：评估信息源权威性与潜在利益相关性。`,
    category: 'thinking',
    tagNames: ['Critical Thinking', 'News', 'Fact Check'],
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 8,
    status: 'published',
  },

  // 4. Finance 商业金融
  {
    id: 'financial-ratio-analyzer',
    title: '商业财报多维财务杜邦分析与风险预警助手',
    summary: '自动化计算杜邦分析拆解指标、自由现金流健康度，敏锐识别财务造假与隐性负债风险。',
    content: `你是一位注册金融分析师 (CFA)。请根据提供的公司财报关键数据：
1. [杜邦拆解]：计算净资产收益率 (ROE)、资产周转率与权益乘数。
2. [现金流诊断]：对比经营现金流与净利润匹配度，评估利润含金量。
3. [风险雷达]：指出应收账款周转天数异常、存货滞销或短债长投潜在暴雷点。`,
    category: 'finance',
    tagNames: ['Finance', 'DuPont Analysis', 'Valuation'],
    createdAt: Date.now() - 86400000 * 9,
    updatedAt: Date.now() - 86400000 * 9,
    status: 'published',
  },
  {
    id: 'market-macro-summarizer',
    title: '全球宏观流动性与资产配置研判专家',
    summary: '综合美联储利率决议、非农就业数据与国债收益率曲线，推导大类资产轮动趋势。',
    content: `你是一位宏观对冲基金首席策略师。请根据最新的宏观经济数据：
1. [流动性指标]：解读隔夜逆回购 (ON RRP)、贴现窗口与财政部现金余额 (TGA)。
2. [期限利差]：分析 10Y-2Y 美债收益率倒挂程度与衰退概率。
3. [配置策略]：输出股票、债券、大宗商品与现金的配置权重建议。`,
    category: 'finance',
    tagNames: ['Macro', 'Finance', 'Asset Allocation'],
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 10,
    status: 'published',
  },

  // 5. Tools 效率工具
  {
    id: 'seo-article-outline-builder',
    title: '高转化 SEO 架构化长文大纲规划器',
    summary: '根据搜索意图与竞品 SERP 差异化缺口，智能规划高权重、高完读率的结构化内容骨架。',
    content: `你是一位资深 SEO 增长总监。请针对目标搜索关键词制定深度长文大纲：
1. [意图图谱]：剖析用户痛点问题与高频关联长尾词。
2. [H2/H3 骨架]：以滑梯理论构建引人入胜的阅读节奏，每节提供核心观点与金句提示。
3. [Featured Snippet 优化]：针对 Google/Bing 摘要位编写定义性问答模块。`,
    category: 'tools',
    tagNames: ['SEO', 'Content Marketing', 'Copywriting'],
    createdAt: Date.now() - 86400000 * 11,
    updatedAt: Date.now() - 86400000 * 11,
    status: 'published',
  },
  {
    id: 'web-content-scanner',
    title: '网页速读王：30 秒核心洞察扫描器',
    summary: '專為側邊欄閱讀優化的內容提煉工具，協助使用者在 30 秒內快速掌握任何長文或網頁的核心精華。',
    content: `你是一位高效知识管理专家。请深度提炼目标网页文本：
1. [核心洞察]：提炼 3 条不可错过的本质观点。
2. [数据事实]：提取文中引用的关键数据与事实依据。
3. [行动指南]：输出 2 条可直接落地的行动建议。`,
    category: 'tools',
    tagNames: ['Productivity', 'Reading', 'Summary'],
    createdAt: Date.now() - 86400000 * 12,
    updatedAt: Date.now() - 86400000 * 12,
    status: 'published',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin, userEmail } = useAuth();

  const [prompts, setPrompts] = useState<Prompt[]>(FALLBACK_DASHBOARD_PROMPTS);
  const [searchQuery, setSearchQuery] = useState('');
  // 默认定位聚焦首个核心领域：Dev 研发工程（无 All 杂烩）
  const [selectedCategory, setSelectedCategory] = useState('dev');

  // ── Auth Modal 状态 (测试权限硬卡点) ──
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginModalDesc, setLoginModalDesc] = useState('登录后解锁免费在线测试沙盒，直连大模型运行该 Prompt 与参数微调。');

  async function loadData() {
    try {
      let allPrompts = await promptService.getAllPrompts();
      if (!isAdmin) {
        allPrompts = allPrompts.filter((p: Prompt) => isPublishedStatus(p.status));
      }
      if (allPrompts.length > 0) {
        setPrompts(allPrompts);
      }
    } catch (error) {
      console.error('[Dashboard] Failed to load prompts:', error);
    }
  }

  useEffect(() => {
    loadData();

    // 实时监听 Firestore 数据
    const unsubscribe = promptService.subscribeToPrompts((updated) => {
      const visible = !isAdmin
        ? updated.filter((p: Prompt) => isPublishedStatus(p.status))
        : updated;
      if (visible.length > 0) {
        setPrompts(visible);
      }
    });

    const handleStorageChange = () => { loadData(); };
    window.addEventListener('storage', handleStorageChange);
    const refreshInterval = setInterval(() => { loadData(); }, 30000);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(refreshInterval);
    };
  }, [isAdmin]);

  // 标杆级重点展示：每个分类仅精选 3 条最核心指令，杜绝冗长堆叠
  const FEATURED_LIMIT = 3;

  // 过滤提示词列表（严格对齐 5 大实战分类与 dev/development 别名兼容）
  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      const pCat = (p.category ?? '').toLowerCase();
      const matchCat =
        selectedCategory === 'dev'
          ? (pCat === 'dev' || pCat === 'development')
          : pCat === selectedCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        (p.summary ?? '').toLowerCase().includes(q) ||
        (p.tagNames ?? []).some((t) => t.toLowerCase().includes(q));

      return matchCat && matchSearch;
    });
  }, [prompts, selectedCategory, searchQuery]);

  // 首页精选截断：仅展示当前分类的 2~3 个标杆级重点指令
  const featuredPrompts = useMemo(() => {
    return filteredPrompts.slice(0, FEATURED_LIMIT);
  }, [filteredPrompts]);

  // 回车直接前往 Prompt Library 检索对应分类或关键词
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = searchQuery.trim();
      if (q) {
        navigate(`/prompts?q=${encodeURIComponent(q)}`);
      } else {
        navigate(`/prompts?category=${selectedCategory}`);
      }
    }
  };

  // 一键复制 Prompt 全文
  const handleCopy = (_id: string, content: string) => {
    navigator.clipboard.writeText(content);
  };

  // 点击「⚡ 在线测试」硬卡点逻辑
  const handleTestClick = (prompt: Prompt) => {
    if (!userEmail) {
      setLoginModalDesc(`登录后即可免费解锁「${prompt.title}」在线测试沙盒，直连真实大模型并发推演与调试。`);
      setIsLoginModalOpen(true);
    } else {
      navigate(`/prompts/${prompt.id}/run`);
    }
  };

  const currentCategoryLabel = CATEGORY_MAP[selectedCategory]?.label || '研发工程';

  return (
    <div className="dashboard animate-fade-in">
      {/* ── SEO Head 规范注入 (开放爬虫索引) ────────────────────────── */}
      <SEOHead
        title="Prompt Kit — 个人深度实战打磨的高效 AI 提示词库"
        description="不拼垃圾数量，只收录真实工程验证过的指令。重点覆盖「研发工程」、「双语精译」、「深度思考」、「商业金融」、「效率工具」五大方向，支持免客户端在线沙盒实测。"
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
        totalFilteredCount={filteredPrompts.length}
        totalVaultCount={prompts.length}
        onNavigateToLibrary={() => {
          const q = searchQuery.trim();
          if (q) {
            navigate(`/prompts?q=${encodeURIComponent(q)}`);
          } else {
            navigate(`/prompts?category=${selectedCategory}`);
          }
        }}
      />

      {/* ── 主体区域：严格对齐的精选推荐指令卡片网格 (Featured Prompts Grid) ── */}
      <section className="dashboard-prompt-section">
        {featuredPrompts.length > 0 ? (
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
                探索更多工业级实战指令
                <span className="lead-library-count">（当前全库已收录 {prompts.length}+ 项）</span>
              </h3>

              <p className="lead-library-desc">
                首页仅呈现「{currentCategoryLabel}」最具代表性的标杆指令。前往完整指令库，可按全量分类、标签多选、关键词检索、排序及状态进行密集管理与沙盒运行。
              </p>

              <div className="lead-library-actions">
                <Link
                  to={
                    searchQuery.trim()
                      ? `/prompts?q=${encodeURIComponent(searchQuery.trim())}`
                      : `/prompts?category=${selectedCategory}`
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
            <h3>未找到符合条件的提示词</h3>
            <p>可尝试切换上方分类或清空当前搜索关键词。</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('dev');
              }}
              className="btn-secondary"
              style={{ marginTop: '12px' }}
            >
              重置所有筛选项
            </button>
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
        title="解锁免费在线测试沙盒"
        description={loginModalDesc}
      />
    </div>
  );
}
