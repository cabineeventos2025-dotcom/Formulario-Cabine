import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogoArea } from '../components/layout/LogoArea';
import { APP_CONFIG } from '../config/app.config';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="app-bg" style={{ minHeight: '100dvh' }}>
      <div className="form-container">
        <LogoArea />

        <div className="step-card">
          <div className="home-hero">
            <span className="home-hero-eyebrow">Evento confirmado ✔</span>
            <h1 className="home-hero-title">
              Vamos preparar todos os detalhes do seu evento
            </h1>
            <p className="home-hero-subtitle">
              Preencha as informações abaixo para prepararmos seu contrato e
              organizarmos todos os detalhes do serviço contratado.
            </p>
            <p className="home-hero-complement">
              ⏱ Leva apenas alguns minutos.
            </p>
          </div>

          <div className="home-benefits">
            <div className="benefit-item">
              <div className="benefit-icon">📋</div>
              <div className="benefit-text">Dados para o contrato</div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">📅</div>
              <div className="benefit-text">Informações do evento</div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon">📸</div>
              <div className="benefit-text">Confirmação dos serviços</div>
            </div>
          </div>

          <button
            id="btn-start"
            className="btn btn-primary btn-full btn-lg"
            onClick={() => navigate('/formulario')}
          >
            Começar preenchimento →
          </button>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            Seus dados estão seguros. Usamos criptografia e não compartilhamos com terceiros.
          </p>
        </div>

        <div style={{ textAlign: 'center', padding: '16px 0 24px', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
          {APP_CONFIG.companyName} &mdash; {APP_CONFIG.tagline}
        </div>
      </div>
    </div>
  );
}
