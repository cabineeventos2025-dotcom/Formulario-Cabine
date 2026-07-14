import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search } from 'lucide-react';
import { maskCEP, onlyDigits } from '../../lib/masks';
import { useViaCep } from '../../hooks/useViaCep';

interface AddressFieldsProps {
  values: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  onChange: (field: string, value: string) => void;
  errors?: Record<string, string>;
  showCopyOption?: boolean;
  previousAddress?: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
  } | null;
  onCopyPrevious?: () => void;
  extraFields?: React.ReactNode;
}

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA',
  'MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN',
  'RO','RR','RS','SC','SE','SP','TO',
];

export function AddressFields({
  values,
  onChange,
  errors = {},
  showCopyOption = false,
  previousAddress,
  onCopyPrevious,
  extraFields,
}: AddressFieldsProps) {
  const { lookup, loading: cepLoading, notFound } = useViaCep();
  const cepRef = useRef<string>('');

  const handleCEP = async (raw: string) => {
    const masked = maskCEP(raw);
    onChange('cep', masked);
    const digits = onlyDigits(raw);
    if (digits.length === 8 && digits !== cepRef.current) {
      cepRef.current = digits;
      const result = await lookup(digits);
      if (result) {
        onChange('logradouro', result.logradouro);
        onChange('bairro', result.bairro);
        onChange('cidade', result.cidade);
        onChange('estado', result.estado);
      }
    }
  };

  return (
    <div className="field-group">
      {showCopyOption && previousAddress && onCopyPrevious && (
        <button type="button" className="copy-address-btn" onClick={onCopyPrevious}>
          <MapPin size={14} />
          Usar o mesmo endereço informado anteriormente
        </button>
      )}

      {/* CEP */}
      <div className="field-row row-cep">
        <div className="field-wrapper">
          <label className="field-label">
            CEP <span style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 400 }}>(opcional)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="field-cep"
              type="text"
              inputMode="numeric"
              className={`field-input ${errors.cep ? 'error' : ''}`}
              value={values.cep}
              onChange={(e) => handleCEP(e.target.value)}
              placeholder="00000-000"
              maxLength={9}
              autoComplete="postal-code"
            />
            {cepLoading && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              </div>
            )}
          </div>
          {errors.cep && <span className="field-error">{errors.cep}</span>}
          {notFound && !errors.cep && (
            <span className="field-helper" style={{ color: 'var(--color-warning)' }}>
              CEP não encontrado. Preencha o endereço manualmente.
            </span>
          )}
        </div>
        <div className="field-wrapper" style={{ gridColumn: 'span 1' }}>
          {/* spacer — number is separate */}
        </div>
      </div>

      {/* Logradouro + Número */}
      <div className="field-row" style={{ gridTemplateColumns: '1fr 120px' }}>
        <div className="field-wrapper">
          <label className="field-label">
            Logradouro <span className="required-mark">*</span>
          </label>
          <input
            id="field-logradouro"
            type="text"
            className={`field-input ${errors.logradouro ? 'error' : ''}`}
            value={values.logradouro}
            onChange={(e) => onChange('logradouro', e.target.value)}
            placeholder="Rua, Avenida..."
            autoComplete="street-address"
          />
          {errors.logradouro && <span className="field-error">{errors.logradouro}</span>}
        </div>
        <div className="field-wrapper">
          <label className="field-label">
            Número <span className="required-mark">*</span>
          </label>
          <input
            id="field-numero"
            type="text"
            className={`field-input ${errors.numero ? 'error' : ''}`}
            value={values.numero}
            onChange={(e) => onChange('numero', e.target.value)}
            placeholder="123"
            autoComplete="address-line2"
          />
          {errors.numero && <span className="field-error">{errors.numero}</span>}
        </div>
      </div>

      {/* Complemento */}
      <div className="field-wrapper">
        <label className="field-label">Complemento</label>
        <input
          id="field-complemento"
          type="text"
          className="field-input"
          value={values.complemento}
          onChange={(e) => onChange('complemento', e.target.value)}
          placeholder="Apto, Bloco, Sala... (opcional)"
          autoComplete="address-line3"
        />
      </div>

      {/* Bairro + Estado */}
      <div className="field-row">
        <div className="field-wrapper">
          <label className="field-label">
            Bairro <span className="required-mark">*</span>
          </label>
          <input
            id="field-bairro"
            type="text"
            className={`field-input ${errors.bairro ? 'error' : ''}`}
            value={values.bairro}
            onChange={(e) => onChange('bairro', e.target.value)}
            placeholder="Bairro"
          />
          {errors.bairro && <span className="field-error">{errors.bairro}</span>}
        </div>
        <div className="field-wrapper">
          <label className="field-label">
            Estado
          </label>
          {/* UF sempre MG — exibido como campo readonly */}
          <div
            style={{
              padding: '0 14px',
              height: 44,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--color-surface-hover)',
              border: '1px solid var(--color-surface-border)',
              borderRadius: 8,
              color: 'var(--color-text)',
              fontWeight: 700,
              fontSize: '0.95rem',
              letterSpacing: 1,
            }}
          >
            MG
          </div>
        </div>
      </div>

      {/* Cidade */}
      <div className="field-wrapper">
        <label className="field-label">
          Cidade <span className="required-mark">*</span>
        </label>
        <input
          id="field-cidade"
          type="text"
          className={`field-input ${errors.cidade ? 'error' : ''}`}
          value={values.cidade}
          onChange={(e) => onChange('cidade', e.target.value)}
          placeholder="Cidade"
          autoComplete="address-level2"
        />
        {errors.cidade && <span className="field-error">{errors.cidade}</span>}
      </div>

      {extraFields}
    </div>
  );
}
