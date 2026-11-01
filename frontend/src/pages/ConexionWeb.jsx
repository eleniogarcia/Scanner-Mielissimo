import React, { useState } from 'react';
import { webAPI } from '../services/api';

// Modal para conectar el POS con la web del negocio y ver qué falta mandar.
function ConexionWeb({ estado, onCerrar, onActualizado }) {
  const [url, setUrl] = useState(estado?.url || '');
  const [clave, setClave] = useState('');
  const [probando, setProbando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState(null); // { ok, texto }

  const errorDe = (e, porDefecto) => e.response?.data?.message || porDefecto;

  const probar = async () => {
    setProbando(true);
    setResultado(null);
    try {
      await webAPI.probar({ url: url.trim(), clave: clave.trim() || undefined });
      setResultado({ ok: true, texto: '¡Conexión OK! La web respondió y la clave es correcta.' });
    } catch (e) {
      setResultado({ ok: false, texto: errorDe(e, 'No se pudo conectar con la web') });
    } finally {
      setProbando(false);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      setResultado({ ok: false, texto: 'Poné la dirección de la web' });
      return;
    }
    if (!clave.trim() && !estado?.tiene_clave) {
      setResultado({ ok: false, texto: 'Poné la clave de conexión' });
      return;
    }
    setGuardando(true);
    try {
      await webAPI.guardarConfig({ url: url.trim(), clave: clave.trim() || undefined });
      setClave('');
      await onActualizado();
      setResultado({ ok: true, texto: 'Guardado' });
    } catch (e) {
      setResultado({ ok: false, texto: errorDe(e, 'No se pudo guardar') });
    } finally {
      setGuardando(false);
    }
  };

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      await webAPI.sincronizar();
      await onActualizado();
    } catch (e) {
      setResultado({ ok: false, texto: errorDe(e, 'No se pudo sincronizar') });
    } finally {
      setSincronizando(false);
    }
  };

  const pendientes = estado?.pendientes || [];

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Conexión con la web</h2>
          <button className="modal-close" onClick={onCerrar}>✕</button>
        </div>

        <form onSubmit={guardar} style={{ padding: '1.25rem 1.5rem' }}>
          <p className="text-sm text-secondary" style={{ marginBottom: '1rem' }}>
            Con esto podés publicar productos en la tienda online. Cuando un producto publicado se queda sin stock se pausa en la web,
            y vuelve a aparecer cuando cargás stock. Los cambios de precio también se pasan solos.
          </p>

          <div className="form-group">
            <label className="label">Dirección de la web</label>
            <input
              className="input"
              type="url"
              placeholder="https://tu-tienda.onrender.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="label">Clave de conexión</label>
            <input
              className="input"
              type="password"
              autoComplete="off"
              placeholder={estado?.tiene_clave ? '•••••••• (guardada — dejá vacío para no cambiarla)' : 'La misma que POS_API_KEY en la web'}
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {resultado && (
            <div className={`alert alert-${resultado.ok ? 'success' : 'error'}`} style={{ marginTop: '0.75rem' }}>
              {resultado.texto}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-outline" onClick={probar} disabled={probando || !url.trim()}>
              {probando ? 'Probando...' : 'Probar conexión'}
            </button>
            <button type="submit" className="btn btn-primary" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          {estado?.configurada && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div className="text-sm">
                <strong>{estado.publicados}</strong> {estado.publicados === 1 ? 'producto publicado' : 'productos publicados'} desde el POS.
              </div>

              {pendientes.length === 0 ? (
                <div className="text-sm text-success" style={{ marginTop: '0.4rem' }}>✓ Todo al día con la web</div>
              ) : (
                <>
                  <div className="text-sm" style={{ marginTop: '0.4rem', color: 'var(--warning)' }}>
                    {pendientes.length} {pendientes.length === 1 ? 'cambio pendiente' : 'cambios pendientes'} de mandar
                    (se reintenta solo cada minuto):
                  </div>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.8rem', maxHeight: '140px', overflowY: 'auto' }}>
                    {pendientes.map(p => (
                      <li key={p.producto_id} style={{ marginBottom: '0.2rem' }}>
                        <strong>{p.nombre || `Producto #${p.producto_id}`}</strong> — {p.accion === 'crear' ? 'publicar' : 'actualizar'}
                        {p.ultimo_error && <span className="text-danger"> · {p.ultimo_error}</span>}
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: '0.6rem' }} onClick={sincronizar} disabled={sincronizando}>
                    {sincronizando ? 'Enviando...' : 'Enviar ahora'}
                  </button>
                </>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default ConexionWeb;
