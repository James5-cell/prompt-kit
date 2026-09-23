import { Code2, ExternalLink, Terminal, ArrowRight } from 'lucide-react';
import { useNoIndex } from '../hooks/useNoIndex';
import SEOHead from '../components/SEOHead';
import './Settings.css';

export default function DevLibrary() {
  useNoIndex();

  return (
    <div className="settings-page animate-fade-in">
      <SEOHead
        title="Dev Library — 開發者代碼與工具庫"
        description="Bilingual Dev Resources: 雙語編程文檔、技術深度解析與架構模式。"
        canonical="https://www.205011.xyz/dev-library"
      />
      <h1>DevLibrary</h1>
      
      <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid rgba(191, 90, 242, 0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'var(--color-thinking-bg)',
            border: '1px solid rgba(191, 90, 242, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--color-thinking)',
            boxShadow: '0 0 15px var(--color-thinking-glow)'
          }}>
            <Code2 size={32} />
          </div>
          <div>
            <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0, color: 'var(--text)' }}>Bilingual Dev Resources</h2>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '13px' }}>Bilingual programming documents, technical deep dives, and patterns.</p>
          </div>
        </div>

        <div style={{
          background: '#050508',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          fontFamily: 'var(--font-mono)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          marginTop: '10px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '14px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            paddingBottom: '8px'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--danger)' }}></span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)' }}></span>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
            <span style={{ marginLeft: '10px', fontSize: '11px', color: 'var(--text-faint)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Terminal size={10} /> dev-library --info
            </span>
          </div>

          <div style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: '16px', color: 'var(--text)' }}>
              <span style={{ color: 'var(--color-thinking)' }}>$</span> cat overview.md
              <br />
              DevLibrary hosts high-quality coding references and deep technical articles for software engineers looking to bridge concepts across languages and build robust systems.
            </p>
            
            <p style={{ marginBottom: '8px', color: 'var(--color-thinking)' }}>$ list --topics</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '12px', borderLeft: '2px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ArrowRight size={12} style={{ color: 'var(--color-thinking)', marginTop: '4px' }} />
                <span>Design patterns in Modern TypeScript and React 19.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ArrowRight size={12} style={{ color: 'var(--color-thinking)', marginTop: '4px' }} />
                <span>System design checklists and performance optimization techniques.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ArrowRight size={12} style={{ color: 'var(--color-thinking)', marginTop: '4px' }} />
                <span>API integration best practices and secure local data strategies.</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '10px' }}>
          <a
            href="https://205022.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'rgba(191, 90, 242, 0.08)',
              color: 'var(--color-thinking)',
              border: '1px solid rgba(191, 90, 242, 0.2)',
              boxShadow: '0 0 15px var(--color-thinking-glow)'
            }}
          >
            Visit DevLibrary <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
