import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { aiModelRegistry } from '../services/aiModelRegistry';
import { aiConfigService } from '../services/aiConfigService';
import { useNoIndex } from '../hooks/useNoIndex';
import { SUPPORTED_MODELS } from '../config/aiModels';
import { exportAndDownload } from '../utils/export';
import { importFromJSON, importFromCSV, readFileAsText } from '../utils/import';
import { promptService } from '../services/promptService';
import './Admin.css';

const PROVIDERS = [
  { id: 'gemini', name: 'Gemini (Google)' },
  { id: 'openai', name: 'OpenAI (GPT)' },
  { id: 'nvidia', name: 'NVIDIA Build' },
  { id: 'anthropic', name: 'Anthropic (Claude)' },
  { id: 'groq', name: 'Groq' },
  { id: 'deepseek', name: 'DeepSeek' },
];

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs))
  ]);
}

export default function Admin() {
  useNoIndex();
  const { isAuthReady, isAdmin, user } = useAuth();
  const navigate = useNavigate();

  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Data Management states & refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'markdown'>('json');
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (isAuthReady && !isAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthReady, isAdmin, navigate]);

  useEffect(() => {
    async function loadConfig() {
      try {
        // Wrap Firebase loading in 1.5s timeout to prevent network hang
        await withTimeout(aiConfigService.loadConfig(), 1500, null).catch(() => {});
        
        const res = await fetch('/api/admin/platform-config');
        if (res.ok) {
          const data = await res.json();
          if (data.defaultProvider) {
            setProvider(data.defaultProvider);
            const providerModels = await withTimeout(
              aiModelRegistry.getModelsForProvider(data.defaultProvider),
              1500,
              SUPPORTED_MODELS.filter(m => m.provider === data.defaultProvider)
            );
            setModels(providerModels);
            if (data.defaultModel) {
              setModel(data.defaultModel);
            } else if (providerModels.length > 0) {
              setModel(providerModels[0].id);
            }
          } else {
            const providerModels = await withTimeout(
              aiModelRegistry.getModelsForProvider('gemini'),
              1500,
              SUPPORTED_MODELS.filter(m => m.provider === 'gemini')
            );
            setModels(providerModels);
            if (providerModels.length > 0) {
              setModel(providerModels[0].id);
            }
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP 錯誤：${res.status}`);
        }
      } catch (err: any) {
        console.error('Failed to load platform configuration:', err);
        setError(`載入失敗：${err.message || '請檢查後端服务是否正在运行'}`);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthReady && isAdmin) {
      loadConfig();
    }
  }, [isAuthReady, isAdmin]);

  const handleProviderChange = async (newProvider: string) => {
    setProvider(newProvider);
    const providerModels = await withTimeout(
      aiModelRegistry.getModelsForProvider(newProvider),
      1500,
      SUPPORTED_MODELS.filter(m => m.provider === newProvider)
    );
    setModels(providerModels);
    if (providerModels.length > 0) {
      setModel(providerModels[0].id);
    } else {
      setModel('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setStatusMessage(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/platform-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          defaultProvider: provider,
          defaultModel: model
        })
      });

      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Configuration saved successfully!' });
      } else {
        const errData = await res.json();
        setStatusMessage({ type: 'error', text: errData.error || 'Failed to save configuration.' });
      }
    } catch (err) {
      console.error('Error saving platform configuration:', err);
      setStatusMessage({ type: 'error', text: 'An unexpected error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportAll = async () => {
    try {
      const allPrompts = await promptService.getAllPrompts();
      exportAndDownload(allPrompts, exportFormat);
    } catch (err: any) {
      alert(`Export failed: ${err.message || err}`);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setStatusMessage(null);
    try {
      const text = await readFileAsText(file);
      let prompts: any[] = [];
      if (file.name.endsWith('.json')) {
        prompts = importFromJSON(text);
      } else if (file.name.endsWith('.csv')) {
        prompts = importFromCSV(text);
      } else {
        throw new Error('Unsupported file format. Please upload a .json or .csv file.');
      }

      if (prompts.length === 0) {
        throw new Error('No prompts found in the imported file.');
      }

      // Create each prompt
      let successCount = 0;
      for (const p of prompts) {
        try {
          await promptService.createPrompt(p);
          successCount++;
        } catch (itemErr) {
          console.error('Failed to import individual prompt:', p, itemErr);
        }
      }

      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${successCount} out of ${prompts.length} prompts.`
      });
    } catch (err: any) {
      console.error('Import failed:', err);
      setStatusMessage({
        type: 'error',
        text: `Import failed: ${err.message || err}`
      });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleResetDatabase = async () => {
    if (confirmText !== 'RESET') return;
    setResetting(true);
    setStatusMessage(null);
    try {
      const prompts = await promptService.getAllPrompts();
      await Promise.all(prompts.map((p) => promptService.deletePrompt(p.id)));
      setStatusMessage({ type: 'success', text: 'Database reset successfully. All prompts deleted.' });
      setShowResetModal(false);
      setConfirmText('');
    } catch (err: any) {
      console.error('Reset database failed:', err);
      setStatusMessage({ type: 'error', text: `Reset failed: ${err.message || err}` });
    } finally {
      setResetting(false);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="admin-page loading">
        <div className="loading-spinner">🔍 Waiting for Firebase Auth state to resolve...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-page loading">
        <div className="loading-spinner">⚠️ Access Denied: You are not an admin. Redirecting to dashboard...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-page loading">
        <div className="loading-spinner">⚙️ Fetching platform defaults from API...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <h1>Admin Panel</h1>
        <div className="status-message error">❌ {error}</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1>Admin Panel</h1>
      
      {statusMessage && (
        <div className={`status-message ${statusMessage.type}`}>
          {statusMessage.type === 'success' ? '✅' : '❌'} {statusMessage.text}
        </div>
      )}

      <section className="admin-section">
        <h2>Platform Defaults Configuration</h2>
        <p className="admin-description">
          Set the platform-wide fallback AI Provider and Model. When regular users execute prompts
          without configuring their own BYOK API Keys in Settings, the platform will fall back to using
          these defaults along with the server-side environment keys.
        </p>

        <form onSubmit={handleSave} className="admin-form">
          <div className="admin-form-group">
            <label htmlFor="platform-default-provider">Platform Default Provider</label>
            <select
              id="platform-default-provider"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="admin-select"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-form-group">
            <label htmlFor="platform-default-model">Platform Default Model</label>
            <select
              id="platform-default-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="admin-select"
              disabled={models.length === 0}
            >
              {models.length === 0 ? (
                <option value="">No models available</option>
              ) : (
                models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="admin-form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || !model}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-section">
        <h2>Data Management</h2>
        <p className="admin-description">
          Import and export backups of the prompt library. Backups include all templates, metadata tags, categories, and summary records.
        </p>

        <div className="admin-data-actions">
          {/* Export Controls */}
          <div className="admin-form-group data-control-group">
            <label htmlFor="admin-export-format">Export Format</label>
            <div className="data-control-row">
              <select
                id="admin-export-format"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'markdown')}
                className="admin-select"
              >
                <option value="json">JSON Backup</option>
                <option value="csv">CSV Sheet</option>
                <option value="markdown">Markdown Document</option>
              </select>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleExportAll}
              >
                📤 Export Library
              </button>
            </div>
          </div>

          {/* Import Controls */}
          <div className="admin-form-group data-control-group">
            <label>Import Prompts</label>
            <div className="data-control-row">
              <input
                type="file"
                id="admin-import-file"
                accept=".json,.csv"
                onChange={handleImportFile}
                ref={fileInputRef}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? '⏳ Importing...' : '📥 Upload Backup (.json, .csv)'}
              </button>
            </div>
            <p className="field-hint">
              Select a JSON or CSV format backup file to import. Duplicate records will be added as new items.
            </p>
          </div>
        </div>
      </section>

      <section className="admin-section danger-zone-section">
        <h2 className="danger-zone-title">System Danger Zone</h2>
        <p className="admin-description">
          Destructive maintenance actions. Proceed with caution. These actions will affect all users immediately.
        </p>

        <div className="danger-action-row">
          <div className="danger-action-info">
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>Clear Database</h4>
            <p className="field-hint" style={{ marginTop: '4px' }}>Permanently deletes all prompt assets from the database and cache.</p>
          </div>
          <button
            type="button"
            className="btn-danger"
            onClick={() => setShowResetModal(true)}
          >
            Reset Database
          </button>
        </div>
      </section>

      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h3>⚠️ Critical Action Required</h3>
            <p>
              You are about to permanently delete all prompt records in the database.
              This action will clear all records from both Firebase Firestore and IndexedDB local cache.
              <strong> This cannot be undone.</strong>
            </p>
            <p className="confirm-instruction">
              Please type <code className="reset-code">RESET</code> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type RESET here"
              className="admin-select confirm-input"
              style={{ width: '100%', maxWidth: 'none', marginTop: '8px' }}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowResetModal(false);
                  setConfirmText('');
                }}
                disabled={resetting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleResetDatabase}
                disabled={confirmText !== 'RESET' || resetting}
              >
                {resetting ? 'Resetting...' : 'Delete All Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
