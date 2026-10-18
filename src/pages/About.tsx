import { Link } from 'react-router-dom';
import { Icon as RiIcon } from '@iconify/react';
import { ICON_SIZE } from '../config/iconSizes';
import SEOHead from '../components/SEOHead';
import './About.css';

const usageModes = [
  { icon: 'ri:play-circle-line', title: '直接试用', description: '指令已内置必要背景，可直接打开试用区运行。' },
  { icon: 'ri:file-text-line', title: '需要文本', description: '先填写文章、需求或数据，再合成并复制完整指令。' },
  { icon: 'ri:external-link-line', title: '外部环境', description: '需要浏览器、代码仓库或特定 Agent 等外部工具配合。' },
];

const standards = [
  '用途明确：说明适合解决什么问题，以及不适合什么场景。',
  '输入清楚：列出必需文本、变量或外部环境，减少反复试错。',
  '结构可复用：保留角色、任务、约束与输出格式，方便按需替换。',
  '来源透明：记录收录日期，持续维护重复、失效或表达不清的指令。',
];

const steps = [
  ['找到', '在首页搜索，或按分类与标签浏览指令库。'],
  ['看懂', '查看用途摘要、使用条件与所需输入。'],
  ['使用', '填写变量后复制，或进入试用区直接运行。'],
  ['调整', '结合模型输出，补充上下文并迭代提示词。'],
];

export default function About() {
  return (
    <div className="about-page animate-fade-in">
      <SEOHead
        title="关于 Prompt Kit — 收录标准与使用指南"
        description="了解 Prompt Kit 的指令收录标准、三种使用方式，以及从搜索到试用、复制和调整的完整流程。"
        canonical="https://www.205011.xyz/about"
        ogImage="https://www.205011.xyz/og-image.png"
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'AboutPage',
              '@id': 'https://www.205011.xyz/about#aboutpage',
              'url': 'https://www.205011.xyz/about',
              'name': '关于 Prompt Kit — 收录标准与使用指南',
              'description': 'Prompt Kit 的指令收录标准、使用方式与工作流程。',
              'isPartOf': { '@id': 'https://www.205011.xyz/#website' },
            },
            {
              '@type': 'Organization',
              '@id': 'https://www.205011.xyz/#organization',
              'name': 'Prompt Kit',
              'url': 'https://www.205011.xyz/',
              'logo': 'https://www.205011.xyz/logo.png',
              'founder': { '@type': 'Person', 'name': 'postsoma-2050', 'alternateName': 'James5-cell' },
            },
            {
              '@type': 'BreadcrumbList',
              '@id': 'https://www.205011.xyz/about#breadcrumb',
              'itemListElement': [
                { '@type': 'ListItem', 'position': 1, 'name': '首页', 'item': 'https://www.205011.xyz/' },
                { '@type': 'ListItem', 'position': 2, 'name': '关于与收录标准', 'item': 'https://www.205011.xyz/about' },
              ],
            },
          ],
        }}
      />

      <header className="about-header">
        <div className="eyebrow-label">
          <RiIcon icon="ri:shield-check-line" width={14} height={14} />
          <span>收录标准 · 使用说明</span>
        </div>
        <h1 className="about-title">关于 Prompt Kit</h1>
        <p className="about-subtitle">
          一个面向真实工作场景的 AI 指令库。每条指令都尽量讲清楚用途、使用条件和所需输入，让你先看懂，再直接使用。
        </p>
        <div className="about-primary-actions">
          <Link to="/prompts" className="action-btn btn-primary-cta">
            <RiIcon icon="ri:book-shelf-line" width={16} height={16} />
            <span>浏览指令库</span>
          </Link>
          <Link to="/dashboard" className="action-btn btn-secondary-cta">
            <RiIcon icon="ri:search-line" width={16} height={16} />
            <span>首页搜索</span>
          </Link>
        </div>
      </header>

      <section className="about-card standards-card">
        <div className="section-header">
          <span className="section-icon"><RiIcon icon="ri:checkbox-multiple-line" width={ICON_SIZE.md} height={ICON_SIZE.md} /></span>
          <div><h2>指令收录标准</h2><p>少一点黑盒模板，多一点可判断、可复用的上下文。</p></div>
        </div>
        <ul className="standards-list">
          {standards.map((standard, index) => (
            <li key={standard}><span className="standard-number">{String(index + 1).padStart(2, '0')}</span><span>{standard}</span></li>
          ))}
        </ul>
      </section>

      <section className="about-card">
        <div className="section-header">
          <span className="section-icon"><RiIcon icon="ri:route-line" width={ICON_SIZE.md} height={ICON_SIZE.md} /></span>
          <div><h2>三种使用方式</h2><p>先看使用条件，再选择最省事的入口。</p></div>
        </div>
        <div className="usage-mode-grid">
          {usageModes.map(mode => (
            <article className="usage-mode-card" key={mode.title}>
              <span className="usage-mode-icon"><RiIcon icon={mode.icon} width={20} height={20} /></span>
              <h3>{mode.title}</h3><p>{mode.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-card">
        <div className="section-header">
          <span className="section-icon"><RiIcon icon="ri:flow-chart" width={ICON_SIZE.md} height={ICON_SIZE.md} /></span>
          <div><h2>如何使用</h2><p>从找到指令到得到可用结果，只保留四步。</p></div>
        </div>
        <ol className="usage-steps">
          {steps.map(([title, description], index) => (
            <li key={title}><span className="step-number">{index + 1}</span><div><h3>{title}</h3><p>{description}</p></div></li>
          ))}
        </ol>
      </section>

      <section className="about-card secondary-card">
        <div className="section-header">
          <span className="section-icon"><RiIcon icon="ri:shield-keyhole-line" width={ICON_SIZE.md} height={ICON_SIZE.md} /></span>
          <div><h2>来源、隐私与开放索引</h2><p>保持来源可追溯，密钥与本地数据默认留在浏览器。</p></div>
        </div>
        <div className="secondary-links">
          <a href="https://github.com/James5-cell/prompt-kit" target="_blank" rel="noopener noreferrer">
            <RiIcon icon="ri:github-line" width={18} height={18} />
            <span><strong>GitHub 源码</strong><small>查看实现与更新记录</small></span>
            <RiIcon icon="ri:arrow-right-up-line" width={14} height={14} />
          </a>
          <a href="/llms.txt" target="_blank" rel="noopener noreferrer">
            <RiIcon icon="ri:file-text-line" width={18} height={18} />
            <span><strong>机器可读索引</strong><small>llms.txt · 面向 AI 搜索与检索</small></span>
            <RiIcon icon="ri:arrow-right-up-line" width={14} height={14} />
          </a>
        </div>
        <p className="privacy-note">API Key 保存在浏览器本地；除非主动运行指令，否则不会发送到外部模型服务。</p>
      </section>
    </div>
  );
}
