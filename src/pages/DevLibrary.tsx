import { Code2, ExternalLink } from 'lucide-react';
import { useNoIndex } from '../hooks/useNoIndex';
import './Settings.css'; // Reuse settings section layout styling for visual harmony

export default function DevLibrary() {
  useNoIndex();

  return (
    <div className="settings-page">
      <h1>DevLibrary</h1>
      
      <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            color: '#8b5cf6'
          }}>
            <Code2 size={32} />
          </div>
          <div>
            <h2 style={{ margin: 0, borderBottom: 'none', paddingBottom: 0 }}>Bilingual Dev Resources</h2>
            <p style={{ color: '#a0a0b0', margin: '4px 0 0 0', fontSize: '14px' }}>Bilingual programming documents, technical deep dives, and patterns.</p>
          </div>
        </div>

        <div className="about-content" style={{ marginTop: '10px' }}>
          <p>
            DevLibrary hosts high-quality coding references and deep technical articles for software engineers looking to bridge concepts across languages and build robust systems.
          </p>
          <p>Key topics covered in DevLibrary:</p>
          <ul>
            <li>Design patterns in Modern TypeScript and React 19.</li>
            <li>System design checklists and performance optimization techniques.</li>
            <li>API integration best practices and secure local data strategies.</li>
          </ul>
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
              textDecoration: 'none'
            }}
          >
            Visit DevLibrary <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
