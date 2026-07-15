import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogoArea } from '../components/layout/LogoArea';
import { APP_CONFIG } from '../config/app.config';

type Mode = 'login' | 'recovery' | 'recovery_sent';

export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/admin');
    } catch (err: any) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : 'Erro ao fazer login. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (error) throw error;
      setMode('recovery_sent');
    } catch (err: any) {
      setError('Erro ao enviar e-mail. Verifique o endereço e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center' }}>
      <div className="form-container">
        <LogoArea />
        <div className="step-card">

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <>
              <h1 className="step-title">Acesso administrativo</h1>
              <p className="step-subtitle">Entre com suas credenciais para acessar o painel.</p>

              <form onSubmit={handleLogin} className="field-group">
                <div className="field-wrapper">
                  <label className="field-label" htmlFor="login-email">E-mail</label>
                  <input
                    id="login-email"
                    type="email"
                    className="field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={APP_CONFIG.adminEmail}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="field-wrapper">
                  <label className="field-label" htmlFor="login-password">Senha</label>
                  <input
                    id="login-password"
                    type="password"
                    className="field-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha"
                    required
                    autoComplete="current-password"
                  />
                </div>

                {error && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-error)',
                    fontSize: '0.875rem',
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  id="btn-login"
                  className="btn btn-primary btn-full"
                  disabled={loading}
                >
                  {loading ? <div className="spinner" /> : 'Entrar'}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('recovery'); setError(''); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-secondary)',
                    cursor: 'pointer', fontSize: '0.875rem', padding: '4px 0',
                    textDecoration: 'underline', textAlign: 'center', width: '100%',
                  }}
                >
                  Esqueci minha senha
                </button>
              </form>
            </>
          )}

          {/* ── RECUPERAÇÃO ── */}
          {mode === 'recovery' && (
            <>
              <h1 className="step-title">Recuperar senha</h1>
              <p className="step-subtitle">
                Digite seu e-mail e enviaremos um link para criar uma nova senha.
              </p>

              <form onSubmit={handleRecovery} className="field-group">
                <div className="field-wrapper">
                  <label className="field-label" htmlFor="recovery-email">E-mail</label>
                  <input
                    id="recovery-email"
                    type="email"
                    className="field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={APP_CONFIG.adminEmail}
                    required
                    autoComplete="email"
                  />
                </div>

                {error && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-error)',
                    fontSize: '0.875rem',
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={loading}
                >
                  {loading ? <div className="spinner" /> : '📧 Enviar link de recuperação'}
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--color-text-secondary)',
                    cursor: 'pointer', fontSize: '0.875rem', padding: '4px 0',
                    textDecoration: 'underline', textAlign: 'center', width: '100%',
                  }}
                >
                  ← Voltar ao login
                </button>
              </form>
            </>
          )}

          {/* ── E-MAIL ENVIADO ── */}
          {mode === 'recovery_sent' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16 }}>📧</div>
              <h1 className="step-title">E-mail enviado!</h1>
              <p className="step-subtitle" style={{ marginBottom: 24 }}>
                Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link
                para criar uma nova senha.
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: 24 }}>
                Não recebeu? Verifique a pasta de spam ou tente novamente.
              </p>
              <button
                onClick={() => { setMode('login'); setError(''); }}
                className="btn btn-secondary"
              >
                ← Voltar ao login
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
