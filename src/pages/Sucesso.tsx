import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogoArea } from '../components/layout/LogoArea';
import { APP_CONFIG } from '../config/app.config';

interface SuccessState {
  protocolo: string;
  nomeContratante: string;
  dataEvento: string;
  tipoPessoa: string;
}

export function Sucesso() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as SuccessState | null;

  const protocolo = state?.protocolo || 'CSA-????-??????';
  const nome = state?.nomeContratante || '';
  const firstName = nome.split(' ')[0];
  const dataEvento = state?.dataEvento || '';

  // dataEvento comes as DD/MM/AAAA from form state
  const formattedDate = (() => {
    if (!dataEvento) return '';
    // Already in DD/MM/AAAA format — just display as-is, but also try to show month name
    const m = dataEvento.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const dt = new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00`);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      }
    }
    // Fallback: just show as typed
    return dataEvento;
  })();

  const whatsappMsg = encodeURIComponent(
    `Olá! Acabei de enviar as informações do meu evento. Meu protocolo é ${protocolo}.`
  );

  return (
    <div className="app-bg" style={{ minHeight: '100dvh' }}>
      <div className="form-container">
        <LogoArea />

        <div className="step-card" style={{ textAlign: 'center' }}>
          <div className="success-icon">✔</div>

          <h1 className="step-title" style={{ textAlign: 'center', marginBottom: 8 }}>
            {firstName ? `Perfeito, ${firstName}!` : 'Tudo certo!'}
          </h1>
          <p className="step-subtitle" style={{ textAlign: 'center' }}>
            Suas informações foram enviadas com sucesso.
            Nossa equipe já recebeu tudo, vamos reservar a sua data e enviaremos o contrato em breve.
          </p>

          <div style={{ margin: '20px 0' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: 8 }}>
              Seu protocolo de atendimento
            </p>
            <div className="protocol-badge">{protocolo}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: 8 }}>
              Guarde este número para referência.
            </p>
          </div>

          {formattedDate && (
            <div className="admin-card" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                📅 <strong>Data do evento:</strong> {formattedDate}
              </p>
            </div>
          )}

          <a
            href={`https://wa.me/${APP_CONFIG.whatsapp}?text=${whatsappMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-full"
            style={{
              background: '#25D366',
              color: '#fff',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              textDecoration: 'none',
            }}
          >
            💬 Falar pelo WhatsApp
          </a>

          <button
            className="btn btn-secondary btn-full"
            onClick={() => navigate('/')}
          >
            Voltar ao início
          </button>
        </div>

        <div style={{ textAlign: 'center', padding: '16px 0 24px', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
          {APP_CONFIG.companyName} &mdash; {APP_CONFIG.tagline}
        </div>
      </div>
    </div>
  );
}
