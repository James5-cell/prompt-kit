import { GraduationCap, ExternalLink, Terminal, ArrowRight } from 'lucide-react';
import { useNoIndex } from '../hooks/useNoIndex';
import './Settings.css';

export default function SkillLab() {
  useNoIndex();

  return (
    <div className="settings-page animate-fade-in">
      <h1>Skill Lab</h1>
      
      <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid rgba(0, 229, 255, 0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'var(--color-dev-bg)',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            color: 'var(--color-dev)',
            boxShadow: '0 0 15px var(--color-dev-glow)'
          }}>
            <GraduationCap size={32} />
          </div>
          <div>
            <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0, color: 'var(--text)' }}>Master AI Workflow Engineering</h2>
            <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '13px' }}>Hands-on guides, templates, and frameworks for advanced prompt design.</p>
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
              <Terminal size={10} /> skill-lab --info
            </span>
          </div>

          <div style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: '16px', color: 'var(--text)' }}>
              <span style={{ color: 'var(--primary)' }}>$</span> cat overview.md
              <br />
              Skill Lab is our dedicated learning resource platform designed to take you from basic AI chatting to professional prompt engineering and automated agent workflow creation.
            </p>
            
            <p style={{ marginBottom: '8px', color: 'var(--primary)' }}>$ list --modules</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '12px', borderLeft: '2px solid rgba(255,255,255,0.05)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ArrowRight size={12} style={{ color: 'var(--primary)', marginTop: '4px' }} />
                <span>Step-by-step guides on Structured Prompt frameworks (CO-STAR, XML tagging).</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ArrowRight size={12} style={{ color: 'var(--primary)', marginTop: '4px' }} />
                <span>Advanced workflow templates for logic parsing and validation.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <ArrowRight size={12} style={{ color: 'var(--primary)', marginTop: '4px' }} />
                <span>Real-world case studies in code translation, system prompt architectures, and context control.</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '10px' }}>
          <a
            href="https://205055.xyz/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-glow"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            Visit Skill Lab <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
