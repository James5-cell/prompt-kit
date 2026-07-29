import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon as RiIcon } from '@iconify/react';
import { ICON_SIZE } from '../config/iconSizes';
import SEOHead from '../components/SEOHead';
import './About.css';

export default function About() {
  const [copiedBibtex, setCopiedBibtex] = useState(false);

  const bibtexText = `@misc{promptkit2026,
  author = {postsoma-2050},
  title = {Prompt Kit: AI Prompt Knowledge Base \\& Workflow Studio},
  year = {2026},
  publisher = {GitHub},
  howpublished = {\\url{https://www.205011.xyz}},
  note = {Canonical domain for production AI prompt templates}
}`;

  const handleCopyBibtex = async () => {
    try {
      await navigator.clipboard.writeText(bibtexText);
      setCopiedBibtex(true);
      setTimeout(() => setCopiedBibtex(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="about-page animate-fade-in">
      <SEOHead
        title="About & E-E-A-T Standards — Prompt Kit"
        description="Prompt Kit platform mission, creator credentials (postsoma-2050), data privacy compliance, machine knowledge feeds (llms.txt), and academic citation guidelines."
        canonical="https://www.205011.xyz/about"
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'AboutPage',
              '@id': 'https://www.205011.xyz/about#aboutpage',
              'url': 'https://www.205011.xyz/about',
              'name': 'About Prompt Kit — Platform Mission & E-E-A-T Standards',
              'description': 'Platform mission, creator background, security standards, and machine feed index.',
              'isPartOf': { '@id': 'https://www.205011.xyz/#website' }
            },
            {
              '@type': 'Organization',
              '@id': 'https://www.205011.xyz/#organization',
              'name': 'Prompt Kit',
              'url': 'https://www.205011.xyz/',
              'logo': 'https://www.205011.xyz/logo.png',
              'founder': {
                '@type': 'Person',
                'name': 'postsoma-2050',
                'alternateName': 'James5-cell'
              }
            },
            {
              '@type': 'BreadcrumbList',
              '@id': 'https://www.205011.xyz/about#breadcrumb',
              'itemListElement': [
                {
                  '@type': 'ListItem',
                  'position': 1,
                  'name': 'Home',
                  'item': 'https://www.205011.xyz/'
                },
                {
                  '@type': 'ListItem',
                  'position': 2,
                  'name': 'About & E-E-A-T',
                  'item': 'https://www.205011.xyz/about'
                }
              ]
            }
          ]
        }}
      />

      {/* Hero Header Area */}
      <header className="about-header">
        <div className="eyebrow-label">
          <RiIcon icon="ri:shield-check-line" width={14} height={14} />
          <span>E-E-A-T & Transparency Standards</span>
        </div>
        <h1 className="about-title">About Prompt Kit</h1>
        <p className="about-subtitle">
          A professional prompt engineering repository, local-first workflow studio, and multi-model execution workbench designed for AI creators, researchers, and developers.
        </p>
      </header>

      {/* Main Grid: Platform Mission & Creator Credentials */}
      <div className="about-sections-grid">
        {/* Section 1: Platform Mission */}
        <section className="about-card">
          <div className="section-header">
            <span className="section-icon theme-tools">
              <RiIcon icon="ri:compass-3-line" width={ICON_SIZE.md} height={ICON_SIZE.md} />
            </span>
            <h2>Platform Mission</h2>
          </div>
          <p className="card-description">
            Prompt Kit replaces ad-hoc prompt notes with a structured, versioned, and testable prompt engineering system. We empower users to transform raw instructions into reliable AI assets.
          </p>
          <ul className="mission-bullets">
            <li>
              <RiIcon icon="ri:checkbox-circle-fill" width={16} height={16} className="bullet-icon" />
              <span><strong>Curated Knowledge Base:</strong> High-quality prompt templates categorized by function, language, and use case.</span>
            </li>
            <li>
              <RiIcon icon="ri:checkbox-circle-fill" width={16} height={16} className="bullet-icon" />
              <span><strong>Multi-Model Workbench:</strong> Test prompts live against OpenAI, Anthropic, Gemini, and NVIDIA NIM APIs.</span>
            </li>
            <li>
              <RiIcon icon="ri:checkbox-circle-fill" width={16} height={16} className="bullet-icon" />
              <span><strong>Local-First Performance:</strong> High-speed client persistence via IndexedDB backed by optional cloud sync.</span>
            </li>
          </ul>
        </section>

        {/* Section 2: Creator Credentials & Background */}
        <section className="about-card">
          <div className="section-header">
            <span className="section-icon theme-dev">
              <RiIcon icon="ri:user-star-line" width={ICON_SIZE.md} height={ICON_SIZE.md} />
            </span>
            <h2>Creator Credentials & Background</h2>
          </div>
          <div className="creator-profile-block">
            <div className="creator-info">
              <div className="creator-names">
                <span className="creator-primary">postsoma-2050</span>
                <span className="creator-handle">(James5-cell)</span>
              </div>
              <p className="creator-bio">
                Lead architect and engineer focusing on multi-model prompt optimization, local-first web applications, and autonomous agent workflows.
              </p>
            </div>

            <div className="creator-tags">
              <span className="capability-tag"><RiIcon icon="ri:code-s-slash-line" width={13} height={13} /> Full-Stack AI Engineer</span>
              <span className="capability-tag"><RiIcon icon="ri:brain-line" width={13} height={13} /> Multi-Model Prompt Specialist</span>
              <span className="capability-tag"><RiIcon icon="ri:lock-password-line" width={13} height={13} /> Privacy-First Architecture</span>
            </div>

            <div className="creator-meta">
              <a href="https://github.com/James5-cell/prompt-kit" target="_blank" rel="noopener noreferrer" className="github-link">
                <RiIcon icon="ri:github-fill" width={16} height={16} />
                <span>GitHub Repository</span>
                <RiIcon icon="ri:arrow-right-up-line" width={14} height={14} className="external-arrow" />
              </a>
              <span className="last-updated-badge">Last updated: July 2026</span>
            </div>
          </div>
        </section>
      </div>

      {/* Section 3: Privacy, Security & Data Governance */}
      <section className="about-card privacy-section">
        <div className="section-header">
          <span className="section-icon theme-finance">
            <RiIcon icon="ri:shield-keyhole-line" width={ICON_SIZE.md} height={ICON_SIZE.md} />
          </span>
          <h2>Privacy, Security & Data Governance</h2>
        </div>
        <p className="card-description">
          We prioritize data sovereignty and minimal remote transmission across all workbench operations.
        </p>

        <div className="privacy-cards-grid">
          <div className="privacy-feature-card">
            <div className="feature-card-header">
              <RiIcon icon="ri:key-2-line" width={20} height={20} className="feature-icon" />
              <h3>Client API Key Isolation</h3>
            </div>
            <p>API keys entered in Settings are stored strictly in client local storage and are never sent to Prompt Kit servers.</p>
          </div>

          <div className="privacy-feature-card">
            <div className="feature-card-header">
              <RiIcon icon="ri:database-2-line" width={20} height={20} className="feature-icon" />
              <h3>IndexedDB & Firestore Sync</h3>
            </div>
            <p>Local state operates via IndexedDB. Public and authenticated cloud data use secure Firebase Firestore security rules.</p>
          </div>

          <div className="privacy-feature-card">
            <div className="feature-card-header">
              <RiIcon icon="ri:git-repository-private-line" width={20} height={20} className="feature-icon" />
              <h3>Zero Model Training</h3>
            </div>
            <p>Your workspace prompts and runs are never sold, harvested, or used for AI model training.</p>
          </div>
        </div>
      </section>

      {/* Section 4: Machine Knowledge Feeds (GEO / RAG Index) */}
      <section className="about-card machine-feeds-section">
        <div className="section-header">
          <span className="section-icon theme-learning">
            <RiIcon icon="ri:cpu-line" width={ICON_SIZE.md} height={ICON_SIZE.md} />
          </span>
          <h2>Machine Knowledge Feeds (GEO / RAG Index)</h2>
        </div>
        <p className="card-description">
          Structured Markdown feeds optimized for RAG retrieval agents, LLM search engines (ChatGPT, Claude, Perplexity), and web indexers.
        </p>

        <div className="resource-cards-grid">
          <a href="/llms.txt" target="_blank" rel="noopener noreferrer" className="resource-card">
            <div className="resource-card-top">
              <span className="resource-icon"><RiIcon icon="ri:file-text-line" width={20} height={20} /></span>
              <RiIcon icon="ri:arrow-right-up-line" width={16} height={16} className="resource-arrow" />
            </div>
            <code className="resource-filename">llms.txt</code>
            <p className="resource-desc">Concise Markdown index directory outlining platform structure, schemas, and AEO policy.</p>
          </a>

          <a href="/llms-full.txt" target="_blank" rel="noopener noreferrer" className="resource-card highlight">
            <div className="resource-card-top">
              <span className="resource-icon"><RiIcon icon="ri:file-code-line" width={20} height={20} /></span>
              <RiIcon icon="ri:arrow-right-up-line" width={16} height={16} className="resource-arrow" />
            </div>
            <code className="resource-filename">llms-full.txt</code>
            <p className="resource-desc">Full-text knowledge graph detailing functional domains, multi-model execution, and playbooks.</p>
          </a>

          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="resource-card">
            <div className="resource-card-top">
              <span className="resource-icon"><RiIcon icon="ri:global-line" width={20} height={20} /></span>
              <RiIcon icon="ri:arrow-right-up-line" width={16} height={16} className="resource-arrow" />
            </div>
            <code className="resource-filename">sitemap.xml</code>
            <p className="resource-desc">Standardized XML sitemap for traditional search engines and crawlers.</p>
          </a>
        </div>
      </section>

      {/* Section 5: Citation & Academic Standards */}
      <section className="about-card citation-section">
        <div className="section-header">
          <span className="section-icon theme-writing">
            <RiIcon icon="ri:draft-line" width={ICON_SIZE.md} height={ICON_SIZE.md} />
          </span>
          <h2>Citation & Academic Standards</h2>
        </div>
        <p className="card-description">
          When referencing Prompt Kit research or prompt templates, please cite using the standard formats below:
        </p>

        <div className="code-block-container">
          <div className="code-block-header">
            <span className="code-block-title">BibTeX Standard</span>
            <button className="copy-code-btn" onClick={handleCopyBibtex}>
              <RiIcon icon={copiedBibtex ? "ri:checkbox-circle-fill" : "ri:file-copy-line"} width={14} height={14} />
              {copiedBibtex ? "Copied!" : "Copy BibTeX"}
            </button>
          </div>
          <pre className="code-content"><code>{bibtexText}</code></pre>
        </div>

        <div className="plain-citation-box">
          <span className="plain-citation-label">Plain Text Citation:</span>
          <p className="plain-citation-text">
            postsoma-2050. (2026). <em>Prompt Kit: AI Prompt Knowledge Base & Multi-Model Execution Studio</em>. Available at: <a href="https://www.205011.xyz">https://www.205011.xyz</a>.
          </p>
        </div>
      </section>

      {/* Action Footer */}
      <footer className="about-actions-footer">
        <Link to="/prompts" className="action-btn btn-primary-cta">
          <RiIcon icon="ri:book-shelf-line" width={16} height={16} />
          <span>Explore Prompt Library</span>
        </Link>
        <a href="https://github.com/James5-cell/prompt-kit" target="_blank" rel="noopener noreferrer" className="action-btn btn-secondary-cta">
          <RiIcon icon="ri:github-line" width={16} height={16} />
          <span>GitHub Repository</span>
          <RiIcon icon="ri:arrow-right-up-line" width={14} height={14} />
        </a>
      </footer>
    </div>
  );
}
