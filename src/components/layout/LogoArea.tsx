import React, { useState } from 'react';
import { APP_CONFIG } from '../../config/app.config';

interface LogoAreaProps {
  /** Override the logo URL. Defaults to /logo.png from public/ */
  logoUrl?: string;
}

export function LogoArea({ logoUrl }: LogoAreaProps) {
  const [imgError, setImgError] = useState(false);
  const src = logoUrl || '/logo.png';

  return (
    <div className="logo-area">
      {!imgError ? (
        <img
          src={src}
          alt={APP_CONFIG.companyName}
          className="logo-img"
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div className="logo-text">{APP_CONFIG.companyName}</div>
          <div className="logo-tagline">{APP_CONFIG.tagline}</div>
        </div>
      )}
    </div>
  );
}
