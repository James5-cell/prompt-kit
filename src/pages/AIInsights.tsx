import { Sparkles, ExternalLink } from 'lucide-react';
import { useNoIndex } from '../hooks/useNoIndex';
import './Settings.css'; // Reuse settings section layout styling for visual harmony

export default function AIInsights() {
  useNoIndex();

  return (
    <div className="settings-page">
      <h1>AI Insights</h1>
      
      <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            color: '#10b981'
          }}>
            <Sparkles size={32} />
          </div>
          <div>
            <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>AI Research, Essays & Library</h2>
            <p style={{ color: '#a0a0b0', margin: '4px 0 0 0', fontSize: '14px' }}>Deep essays on artificial intelligence, agentic design, and curated research notes.</p>
          </div>
        </div>

        <div className="about-content" style={{ marginTop: '10px' }}>
          <p>
            AI Insights is a curated collection of essays, research summaries, and engineering logs exploring the evolution of LLMs, agentic workflows, and future technology trends.
          </p>
          <p>Explore our research collection:</p>
          <ul>
            <li>In-depth analysis of prompt-to-agent architectures.</li>
            <li>Evaluations of specialized small models vs. generalist LLMs.</li>
            <li>Philosophical essays and predictions on multi-agent collaboration.</li>
          </ul>
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
              textDecoration: 'none'
            }}
          >
            Visit AI Insights <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
