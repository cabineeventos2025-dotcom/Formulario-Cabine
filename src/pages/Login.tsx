import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogoArea } from '../components/layout/LogoArea';
import { APP_CONFIG } from '../config/app.config';

export function Login() {
  const navigate = useNavigate();
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

  return (
    <div className="app-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center' }}>
      <div className="form-container">
        <LogoArea />
        <div className="step-card">
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
          </form>
        </div>
      </div>
    </div>
  );
}
