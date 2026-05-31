import { GraduationCap, ExternalLink } from 'lucide-react';
import { useNoIndex } from '../hooks/useNoIndex';
import './Settings.css'; // Reuse settings section layout styling for visual harmony

export default function SkillLab() {
  useNoIndex();

  return (
    <div className="settings-page">
      <h1>Skill Lab</h1>
      
      <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            color: '#3b82f6'
          }}>
            <GraduationCap size={32} />
          </div>
          <div>
            <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>Master AI Workflow Engineering</h2>
            <p style={{ color: '#a0a0b0', margin: '4px 0 0 0', fontSize: '14px' }}>Hands-on guides, templates, and frameworks for advanced prompt design.</p>
          </div>
        </div>

        <div className="about-content" style={{ marginTop: '10px' }}>
          <p>
            Skill Lab is our dedicated learning resource platform designed to take you from basic AI chatting to professional prompt engineering and automated agent workflow creation.
          </p>
          <p>Here is what you will find inside:</p>
          <ul>
            <li>Step-by-step guides on Structured Prompt frameworks (CO-STAR, XML tagging).</li>
            <li>Advanced workflow templates for logic parsing and validation.</li>
            <li>Real-world case studies in code translation, system prompt architectures, and context control.</li>
          </ul>
        </div>

        <div style={{ marginTop: '10px' }}>
          <a
            href="https://205055.xyz/"
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
            Visit Skill Lab <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
