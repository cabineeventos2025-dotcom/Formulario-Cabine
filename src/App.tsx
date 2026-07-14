import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Formulario } from './pages/Formulario';
import { Sucesso } from './pages/Sucesso';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { supabase } from './lib/supabase';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      </div>
    );
  }

  return authed ? <>{children}</> : <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/formulario" element={<Formulario />} />
        <Route path="/sucesso" element={<Sucesso />} />
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
