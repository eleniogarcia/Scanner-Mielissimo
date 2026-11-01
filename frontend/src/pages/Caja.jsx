import React, { useState, useEffect, useRef } from 'react';
import { cajaAPI, CATEGORIAS_GASTO, nombreCategoria, formatearPesos } from '../services/api';
import './Ventas.css'; // título de página y estilos de modales compartidos
import './Caja.css';

// 'YYYY-MM-DD HH:MM:SS' → '01/11 14:30' (sin pasar por Date para no correr la zona horaria)
const formatearFechaHora = (s) => {
  if (!s) return '—';
  const str = String(s).replace('T', ' ');
  const [fecha, hora = ''] = str.split(' ');
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio?.slice(2)} ${hora.slice(0, 5)}`;
};

const formatearHora = (s) => (s ? String(s).replace('T', ' ').split(' ')[1]?.slice(0, 5) : '');

const parsearMonto = (v) => {
  if (v === '' || v === null || v === undefined) return NaN;
  return parseFloat(String(v).replace(',', '.'));
};

function Diferencia({ valor }) {
  const v = parseFloat(valor) || 0;
  if (Math.abs(v) < 0.005) return <span className="caja-dif caja-dif-ok">Justo</span>;
  return v > 0
    ? <span className="caja-dif caja-dif-sobra">Sobran {formatearPesos(v)}</span>
    : <span className="caja-dif caja-dif-falta">Faltan {formatearPesos(-v)}</span>;
}

function Caja({ cajaEstado, refreshCaja }) {
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [guardando, setGuardando] = useState(false);

  // Abrir caja
  const [montoInicial, setMontoInicial] = useState('');
  const [obsApertura, setObsApertura] = useState('');
  const montoInicialRef = useRef(null);

  // Movimientos
  const [modalMov, setModalMov] = useState(null); // null | 'ingreso' | 'retiro'
  const [movForm, setMovForm] = useState({ monto: '', motivo: '', esGasto: false, categoria: 'otros' });
  const [borrandoMovId, setBorrandoMovId] = useState(null);

  // Cierre
  const [modalCierre, setModalCierre] = useState(false);
  const [montoContado, setMontoContado] = useState('');
  const [obsCierre, setObsCierre] = useState('');
  const [resultadoCierre, setResultadoCierre] = useState(null);

  // Historial
  const [historial, setHistorial] = useState([]);
  const [detalle, setDetalle] = useState(null);

  const cargarHistorial = async () => {
    try {
      const r = await cajaAPI.getHistorial(30);
      setHistorial(r.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { cargarHistorial(); }, []);

  useEffect(() => {
    if (cajaEstado !== null) return;
    // Varios intentos: al venir desde Vender, esa pantalla suelta el foco un instante después
    const timers = [50, 250, 500].map(ms => setTimeout(() => {
      // No robar el foco si ya se está escribiendo en otro campo de esta pantalla
      const activo = document.activeElement;
      const escribiendoAca = activo?.closest?.('.caja-page') && ['INPUT', 'SELECT', 'TEXTAREA'].includes(activo.tagName);
      if (!escribiendoAca) montoInicialRef.current?.focus();
    }, ms));
    return () => timers.forEach(clearTimeout);
  }, [cajaEstado]);

  useEffect(() => {
    if (mensaje.texto) {
      const t = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3500);
      return () => clearTimeout(t);
    }
  }, [mensaje]);

  const errorDe = (e, porDefecto) => e.response?.data?.message || porDefecto;

  const abrirCaja = async (e) => {
    e?.preventDefault();
    const monto = parsearMonto(montoInicial);
    if (isNaN(monto) || monto < 0) {
      setMensaje({ tipo: 'error', texto: 'Ingresá el monto con el que arranca la caja (puede ser 0)' });
      return;
    }
    setGuardando(true);
    try {
      await cajaAPI.abrir(monto, obsApertura.trim());
      setMontoInicial('');
      setObsApertura('');
      await refreshCaja();
      setMensaje({ tipo: 'success', texto: 'Caja abierta. ¡Buenas ventas!' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: errorDe(err, 'No se pudo abrir la caja') });
      refreshCaja();
    } finally {
      setGuardando(false);
    }
  };

  const abrirModalMov = (tipo) => {
    setMovForm({ monto: '', motivo: '', esGasto: false, categoria: 'otros' });
    setModalMov(tipo);
  };

  const guardarMovimiento = async (e) => {
    e?.preventDefault();
    const monto = parsearMonto(movForm.monto);
    if (isNaN(monto) || monto <= 0) {
      setMensaje({ tipo: 'error', texto: 'El monto debe ser mayor a 0' });
      return;
    }
    setGuardando(true);
    try {
      await cajaAPI.agregarMovimiento({
        tipo: modalMov,
        monto,
        motivo: movForm.motivo.trim(),
        es_gasto: modalMov === 'retiro' && movForm.esGasto,
        categoria: movForm.categoria
      });
      setModalMov(null);
      await refreshCaja();
      setMensaje({
        tipo: 'success',
        texto: modalMov === 'ingreso'
          ? 'Ingreso registrado'
          : movForm.esGasto ? 'Retiro registrado y cargado como gasto del mes' : 'Retiro registrado'
      });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: errorDe(err, 'No se pudo registrar el movimiento') });
    } finally {
      setGuardando(false);
    }
  };

  const borrarMovimiento = async (id) => {
    try {
      await cajaAPI.eliminarMovimiento(id);
      setBorrandoMovId(null);
      await refreshCaja();
      setMensaje({ tipo: 'success', texto: 'Movimiento borrado' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: errorDe(err, 'No se pudo borrar el movimiento') });
    }
  };

  const abrirModalCierre = async () => {
    await refreshCaja(); // números al día antes de contar
    setMontoContado('');
    setObsCierre('');
    setModalCierre(true);
  };

  const cerrarCaja = async (e) => {
    e?.preventDefault();
    const monto = parsearMonto(montoContado);
    if (isNaN(monto) || monto < 0) {
      setMensaje({ tipo: 'error', texto: 'Ingresá cuánto efectivo contaste' });
      return;
    }
    setGuardando(true);
    try {
      const r = await cajaAPI.cerrar(monto, obsCierre.trim());
      setModalCierre(false);
      setResultadoCierre(r.data.data.caja);
      await refreshCaja();
      cargarHistorial();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: errorDe(err, 'No se pudo cerrar la caja') });
    } finally {
      setGuardando(false);
    }
  };

  const verDetalle = async (id) => {
    try {
      const r = await cajaAPI.getDetalle(id);
      setDetalle(r.data.data);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: errorDe(err, 'No se pudo cargar la caja') });
    }
  };

  const resumen = cajaEstado?.resumen;
  const esperado = resumen?.efectivo_esperado ?? 0;
  const contadoNum = parsearMonto(montoContado);

  return (
    <div className="container caja-page">
      <h1 className="page-title">Caja</h1>

      {mensaje.texto && (
        <div className={`alert alert-${mensaje.tipo === 'success' ? 'success' : 'error'} fade-in`}>
          {mensaje.texto}
        </div>
      )}

      {cajaEstado === undefined && <div className="card caja-cargando">Cargando caja...</div>}

      {/* ── Caja cerrada: abrir ── */}
      {cajaEstado === null && (
        <form className="card caja-abrir" onSubmit={abrirCaja}>
          <div className="caja-abrir-icono">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
          </div>
          <h2>La caja está cerrada</h2>
          <p className="caja-texto-sec">Contá el efectivo con el que arrancás (el cambio) y abrí la caja para empezar a vender.</p>
          <label className="label">Efectivo inicial</label>
          <div className="caja-input-pesos">
            <span>$</span>
            <input
              ref={montoInicialRef}
              className="input"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0"
              value={montoInicial}
              onChange={(e) => setMontoInicial(e.target.value)}
            />
          </div>
          <label className="label" style={{ marginTop: '0.75rem' }}>Nota <span className="caja-opcional">(opcional)</span></label>
          <input
            className="input"
            type="text"
            maxLength={255}
            placeholder="Ej: turno mañana"
            value={obsApertura}
            onChange={(e) => setObsApertura(e.target.value)}
          />
          <button type="submit" className="btn btn-success btn-lg caja-btn-abrir" disabled={guardando}>
            {guardando ? 'Abriendo...' : 'Abrir caja'}
          </button>
        </form>
      )}

      {/* ── Caja abierta ── */}
      {cajaEstado && (
        <>
          <div className="caja-header card">
            <div>
              <div className="caja-estado-pill">● Caja abierta</div>
              <div className="caja-texto-sec">
                Desde {formatearFechaHora(cajaEstado.caja.abierta_at)} · {resumen.cantidad_ventas} {resumen.cantidad_ventas === 1 ? 'venta' : 'ventas'}
                {cajaEstado.caja.observaciones ? ` · ${cajaEstado.caja.observaciones}` : ''}
              </div>
            </div>
            <div className="caja-acciones">
              <button className="btn btn-outline" onClick={() => abrirModalMov('ingreso')}>+ Ingreso</button>
              <button className="btn btn-outline" onClick={() => abrirModalMov('retiro')}>− Retiro</button>
              <button className="btn btn-danger" onClick={abrirModalCierre}>Cerrar caja</button>
            </div>
          </div>

          <div className="caja-grid">
            <div className="caja-esperado card">
              <div className="caja-esperado-label">Efectivo que debería haber en la caja</div>
              <div className="caja-esperado-valor">{formatearPesos(esperado)}</div>
              <div className="caja-cuenta">
                <span>Inicial {formatearPesos(resumen.monto_inicial)}</span>
                <span>+ Ventas efectivo {formatearPesos(resumen.ventas_por_metodo.efectivo.total)}</span>
                <span>+ Ingresos {formatearPesos(resumen.ingresos)}</span>
                <span>− Retiros {formatearPesos(resumen.retiros)}</span>
              </div>
            </div>

            <div className="caja-stats">
              <div className="caja-stat">
                <span className="caja-stat-label">Efectivo</span>
                <span className="caja-stat-valor">{formatearPesos(resumen.ventas_por_metodo.efectivo.total)}</span>
                <span className="caja-stat-sub">{resumen.ventas_por_metodo.efectivo.cantidad} ventas</span>
              </div>
              <div className="caja-stat">
                <span className="caja-stat-label">Tarjeta</span>
                <span className="caja-stat-valor">{formatearPesos(resumen.ventas_por_metodo.tarjeta.total)}</span>
                <span className="caja-stat-sub">{resumen.ventas_por_metodo.tarjeta.cantidad} ventas</span>
              </div>
              <div className="caja-stat">
                <span className="caja-stat-label">Transferencia / QR</span>
                <span className="caja-stat-valor">{formatearPesos(resumen.ventas_por_metodo.transferencia.total)}</span>
                <span className="caja-stat-sub">{resumen.ventas_por_metodo.transferencia.cantidad} ventas</span>
              </div>
              <div className="caja-stat caja-stat-total">
                <span className="caja-stat-label">Total vendido</span>
                <span className="caja-stat-valor">{formatearPesos(resumen.total_ventas)}</span>
                <span className="caja-stat-sub">todos los medios</span>
              </div>
            </div>
          </div>

          <div className="card caja-movs">
            <h3>Movimientos de efectivo</h3>
            {cajaEstado.movimientos.length === 0 ? (
              <p className="caja-texto-sec">Todavía no hay ingresos ni retiros en esta caja.</p>
            ) : (
              <ul className="caja-movs-lista">
                {cajaEstado.movimientos.map(m => (
                  <li key={m.id} className="caja-mov">
                    <span className={`caja-mov-tipo caja-mov-${m.tipo}`}>{m.tipo === 'ingreso' ? 'Ingreso' : 'Retiro'}</span>
                    <span className="caja-mov-motivo">
                      {m.motivo || <em className="caja-texto-sec">Sin motivo</em>}
                      {m.gasto_id && <span className="caja-mov-gasto">Gasto · {nombreCategoria(m.gasto_categoria)}</span>}
                    </span>
                    <span className="caja-mov-hora">{formatearHora(m.created_at)}</span>
                    <span className={`caja-mov-monto caja-mov-monto-${m.tipo}`}>
                      {m.tipo === 'ingreso' ? '+' : '−'}{formatearPesos(m.monto)}
                    </span>
                    {borrandoMovId === m.id ? (
                      <span className="caja-mov-confirmar">
                        <button className="btn btn-danger btn-sm" onClick={() => borrarMovimiento(m.id)}>Borrar</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setBorrandoMovId(null)}>No</button>
                      </span>
                    ) : (
                      <button className="caja-mov-borrar" title="Borrar movimiento" onClick={() => setBorrandoMovId(m.id)}>✕</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* ── Historial de cierres ── */}
      <div className="card caja-historial">
        <h3>Cierres anteriores</h3>
        {historial.length === 0 ? (
          <p className="caja-texto-sec">Todavía no se cerró ninguna caja.</p>
        ) : (
          <div className="table-wrapper">
            <table className="caja-tabla">
              <thead>
                <tr>
                  <th>Apertura</th>
                  <th>Cierre</th>
                  <th className="num">Inicial</th>
                  <th className="num">Vendido</th>
                  <th className="num">Esperado</th>
                  <th className="num">Contado</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {historial.map(c => (
                  <tr key={c.id} onClick={() => verDetalle(c.id)} title="Ver detalle">
                    <td>{formatearFechaHora(c.abierta_at)}</td>
                    <td>{formatearFechaHora(c.cerrada_at)}</td>
                    <td className="num">{formatearPesos(c.monto_inicial)}</td>
                    <td className="num">{formatearPesos(c.total_ventas)}</td>
                    <td className="num">{formatearPesos(c.efectivo_esperado)}</td>
                    <td className="num">{formatearPesos(c.monto_contado)}</td>
                    <td><Diferencia valor={c.diferencia} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ingreso / retiro ── */}
      {modalMov && (
        <div className="modal-overlay" onClick={() => setModalMov(null)}>
          <form className="modal-content caja-modal" onClick={(e) => e.stopPropagation()} onSubmit={guardarMovimiento}>
            <div className="modal-header">
              <h2>{modalMov === 'ingreso' ? 'Ingreso de efectivo' : 'Retiro de efectivo'}</h2>
              <button type="button" className="modal-close" onClick={() => setModalMov(null)}>✕</button>
            </div>
            <div className="caja-modal-body">
              <p className="caja-texto-sec">
                {modalMov === 'ingreso'
                  ? 'Plata que metés en la caja y no viene de una venta (ej: más cambio).'
                  : 'Plata que sacás de la caja (ej: pagar a un proveedor, la luz, o retirar ganancias).'}
              </p>
              <label className="label">Monto</label>
              <div className="caja-input-pesos">
                <span>$</span>
                <input
                  autoFocus
                  className="input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={movForm.monto}
                  onChange={(e) => setMovForm(f => ({ ...f, monto: e.target.value }))}
                />
              </div>
              <label className="label" style={{ marginTop: '0.75rem' }}>Motivo</label>
              <input
                className="input"
                type="text"
                maxLength={255}
                placeholder={modalMov === 'ingreso' ? 'Ej: cambio extra' : 'Ej: pago de luz'}
                value={movForm.motivo}
                onChange={(e) => setMovForm(f => ({ ...f, motivo: e.target.value }))}
              />

              {modalMov === 'retiro' && (
                <div className="caja-gasto-box">
                  <label className="caja-check">
                    <input
                      type="checkbox"
                      checked={movForm.esGasto}
                      onChange={(e) => setMovForm(f => ({ ...f, esGasto: e.target.checked }))}
                    />
                    Es un gasto del negocio (se suma a los gastos del mes)
                  </label>
                  {movForm.esGasto && (
                    <select
                      className="input"
                      value={movForm.categoria}
                      onChange={(e) => setMovForm(f => ({ ...f, categoria: e.target.value }))}
                    >
                      {CATEGORIAS_GASTO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  )}
                  <p className="caja-hint">
                    Si es una compra de mercadería a un proveedor, dejalo sin marcar: el costo de los productos ya se descuenta solo de la ganancia.
                  </p>
                </div>
              )}
            </div>
            <div className="caja-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalMov(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal cierre ── */}
      {modalCierre && resumen && (
        <div className="modal-overlay" onClick={() => setModalCierre(false)}>
          <form className="modal-content caja-modal" onClick={(e) => e.stopPropagation()} onSubmit={cerrarCaja}>
            <div className="modal-header">
              <h2>Cerrar caja</h2>
              <button type="button" className="modal-close" onClick={() => setModalCierre(false)}>✕</button>
            </div>
            <div className="caja-modal-body">
              <div className="caja-cierre-esperado">
                <span>Debería haber en efectivo</span>
                <strong>{formatearPesos(esperado)}</strong>
              </div>
              <label className="label">¿Cuánto efectivo contaste?</label>
              <div className="caja-input-pesos">
                <span>$</span>
                <input
                  autoFocus
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={montoContado}
                  onChange={(e) => setMontoContado(e.target.value)}
                />
              </div>
              {!isNaN(contadoNum) && (
                <div className="caja-cierre-dif">
                  <Diferencia valor={contadoNum - esperado} />
                </div>
              )}
              <label className="label" style={{ marginTop: '0.75rem' }}>Observaciones <span className="caja-opcional">(opcional)</span></label>
              <input
                className="input"
                type="text"
                maxLength={255}
                placeholder="Ej: faltante por error de vuelto"
                value={obsCierre}
                onChange={(e) => setObsCierre(e.target.value)}
              />
              <div className="caja-cierre-resumen">
                <div><span>Ventas en efectivo</span><span>{formatearPesos(resumen.ventas_por_metodo.efectivo.total)}</span></div>
                <div><span>Ventas con tarjeta</span><span>{formatearPesos(resumen.ventas_por_metodo.tarjeta.total)}</span></div>
                <div><span>Ventas por transferencia / QR</span><span>{formatearPesos(resumen.ventas_por_metodo.transferencia.total)}</span></div>
                <div className="caja-cierre-total"><span>Total vendido</span><span>{formatearPesos(resumen.total_ventas)}</span></div>
              </div>
            </div>
            <div className="caja-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setModalCierre(false)}>Cancelar</button>
              <button type="submit" className="btn btn-danger" disabled={guardando || isNaN(contadoNum)}>
                {guardando ? 'Cerrando...' : 'Confirmar cierre'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Resultado del cierre / detalle de una caja vieja ── */}
      {(resultadoCierre || detalle) && (() => {
        const c = resultadoCierre || detalle.caja;
        const cerrar = () => { setResultadoCierre(null); setDetalle(null); };
        return (
          <div className="modal-overlay" onClick={cerrar}>
            <div className="modal-content caja-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{resultadoCierre ? 'Caja cerrada' : `Caja del ${formatearFechaHora(c.abierta_at).split(' ')[0]}`}</h2>
                <button className="modal-close" onClick={cerrar}>✕</button>
              </div>
              <div className="caja-modal-body">
                <div className="caja-resultado-dif"><Diferencia valor={c.diferencia} /></div>
                <div className="caja-cierre-resumen">
                  <div><span>Apertura</span><span>{formatearFechaHora(c.abierta_at)}</span></div>
                  <div><span>Cierre</span><span>{formatearFechaHora(c.cerrada_at)}</span></div>
                  <div><span>Efectivo inicial</span><span>{formatearPesos(c.monto_inicial)}</span></div>
                  <div><span>Ventas en efectivo</span><span>{formatearPesos(c.ventas_efectivo)}</span></div>
                  <div><span>Ingresos</span><span>+{formatearPesos(c.ingresos)}</span></div>
                  <div><span>Retiros</span><span>−{formatearPesos(c.retiros)}</span></div>
                  <div className="caja-cierre-total"><span>Efectivo esperado</span><span>{formatearPesos(c.efectivo_esperado)}</span></div>
                  <div className="caja-cierre-total"><span>Efectivo contado</span><span>{formatearPesos(c.monto_contado)}</span></div>
                  <div><span>Tarjeta</span><span>{formatearPesos(c.ventas_tarjeta)}</span></div>
                  <div><span>Transferencia / QR</span><span>{formatearPesos(c.ventas_transferencia)}</span></div>
                  <div className="caja-cierre-total"><span>Total vendido ({c.cantidad_ventas} ventas)</span><span>{formatearPesos(c.total_ventas)}</span></div>
                </div>
                {(c.observaciones || c.observaciones_cierre) && (
                  <p className="caja-texto-sec" style={{ marginTop: '0.75rem' }}>
                    {c.observaciones && <>Apertura: {c.observaciones}<br /></>}
                    {c.observaciones_cierre && <>Cierre: {c.observaciones_cierre}</>}
                  </p>
                )}
                {detalle && detalle.movimientos.length > 0 && (
                  <>
                    <h4 style={{ margin: '1rem 0 0.5rem' }}>Movimientos</h4>
                    <ul className="caja-movs-lista">
                      {detalle.movimientos.map(m => (
                        <li key={m.id} className="caja-mov">
                          <span className={`caja-mov-tipo caja-mov-${m.tipo}`}>{m.tipo === 'ingreso' ? 'Ingreso' : 'Retiro'}</span>
                          <span className="caja-mov-motivo">{m.motivo || '—'}</span>
                          <span className="caja-mov-hora">{formatearHora(m.created_at)}</span>
                          <span className={`caja-mov-monto caja-mov-monto-${m.tipo}`}>
                            {m.tipo === 'ingreso' ? '+' : '−'}{formatearPesos(m.monto)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className="caja-modal-footer">
                <button className="btn btn-primary" onClick={cerrar}>Listo</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export default Caja;
