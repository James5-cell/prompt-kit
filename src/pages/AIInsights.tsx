import { Sparkles, ExternalLink, Terminal, ArrowRight } from 'lucide-react';
import { useNoIndex } from '../hooks/useNoIndex';
import SEOHead from '../components/SEOHead';
import './Settings.css';

export default function AIInsights() {
  useNoIndex();

  return (
    <div className="settings-page animate-fade-in">
      <SEOHead
        title="AI Insights — 提示詞洞察與趨勢分析"
        description="AI Research, Essays & Library: 深度探討人工智慧、Agent 架構設計與精選研究筆記。"
        canonical="https://www.205011.xyz/ai-insights"
      />
      <h1>AI Insights</h1>
      
      <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid rgba(0, 255, 135, 0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'var(--color-finance-bg)',
            border: '1px solid rgba(0, 255, 135, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--color-finance)',
            boxShadow: '0 0 15px var(--color-finance-glow)'
          }}>
            <Sparkles size={32} />
          </div>
          <div>
            <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0, color: 'var(--text)' }}>AI Research, Essays & Library</h2>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '13px' }}>Deep essays on artificial intelligence, agentic design, and curated research notes.</p>
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
              <Terminal size={10} /> ai-insights --info
            </span>
          </div>

          <div style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: '16px', color: 'var(--text)' }}>
              <span style={{ color: 'var(--color-finance)' }}>$</span> cat overview.md
              <br />
              AI Insights is a curated collection of essays, research summaries, and engineering logs exploring the evolution of LLMs, agentic workflows, and future technology trends.
            </p>
            
            <p style={{ marginBottom: '8px', color: 'var(--color-finance)' }}>$ list --essays</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '12px', borderLeft: '2px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ArrowRight size={12} style={{ color: 'var(--color-finance)', marginTop: '4px' }} />
                <span>In-depth analysis of prompt-to-agent architectures.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ArrowRight size={12} style={{ color: 'var(--color-finance)', marginTop: '4px' }} />
                <span>Evaluations of specialized small models vs. generalist LLMs.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ArrowRight size={12} style={{ color: 'var(--color-finance)', marginTop: '4px' }} />
                <span>Philosophical essays and predictions on multi-agent collaboration.</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '10px' }}>
          <a
            href="https://www.postsoma-2050.com/ai-insights"
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
              background: 'rgba(0, 255, 135, 0.08)',
              color: 'var(--color-finance)',
              border: '1px solid rgba(0, 255, 135, 0.2)',
              boxShadow: '0 0 15px var(--color-finance-glow)'
            }}
          >
            Visit AI Insights <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
