import React, { useState, useEffect } from 'react';
import { gastosAPI, CATEGORIAS_GASTO, nombreCategoria, formatearPesos } from '../services/api';
import GastosFijos from './GastosFijos';
import './BalanceMensual.css';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const pad = (n) => String(n).padStart(2, '0');
const hoyLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const mesActual = () => hoyLocal().slice(0, 7);
const nombreMes = (mes) => {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[m - 1]} ${a}`;
};
const moverMes = (mes, delta) => {
  let [a, m] = mes.split('-').map(Number);
  m += delta;
  while (m < 1) { m += 12; a -= 1; }
  while (m > 12) { m -= 12; a += 1; }
  return `${a}-${pad(m)}`;
};
// Fecha por defecto para un gasto nuevo: hoy si estamos viendo el mes actual, si no el día 1 del mes
const fechaDefault = (mes) => (mes === mesActual() ? hoyLocal() : `${mes}-01`);
const formatearDia = (fecha) => {
  const [, m, d] = String(fecha).split('-');
  return `${d}/${m}`;
};

function BalanceMensual() {
  const [mes, setMes] = useState(mesActual());
  const [balance, setBalance] = useState(null);
  const [gastos, setGastos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [form, setForm] = useState({ fecha: fechaDefault(mesActual()), monto: '', categoria: 'alquiler', descripcion: '' });
  const [guardando, setGuardando] = useState(false);
  const [borrandoId, setBorrandoId] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [editMonto, setEditMonto] = useState('');

  const cargar = async (mesACargar = mes) => {
    setCargando(true);
    try {
      const [b, g, h] = await Promise.all([
        gastosAPI.getBalance(mesACargar),
        gastosAPI.getByMes(mesACargar),
        gastosAPI.getBalanceMeses(6)
      ]);
      setBalance(b.data.data);
      setGastos(g.data.data);
      setHistorico(h.data.data);
    } catch (e) {
      console.error(e);
      setMensaje({ tipo: 'error', texto: 'No se pudo cargar el balance' });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar(mes);
    setForm(f => ({ ...f, fecha: fechaDefault(mes) }));
    setBorrandoId(null);
    setEditandoId(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  useEffect(() => {
    if (mensaje.texto) {
      const t = setTimeout(() => setMensaje({ tipo: '', texto: '' }), 3000);
      return () => clearTimeout(t);
    }
  }, [mensaje]);

  const agregarGasto = async (e) => {
    e.preventDefault();
    const monto = parseFloat(String(form.monto).replace(',', '.'));
    if (isNaN(monto) || monto <= 0) {
      setMensaje({ tipo: 'error', texto: 'El monto debe ser mayor a 0' });
      return;
    }
    if (!form.fecha) {
      setMensaje({ tipo: 'error', texto: 'Elegí la fecha del gasto' });
      return;
    }
    setGuardando(true);
    try {
      await gastosAPI.create({ ...form, monto });
      setForm(f => ({ ...f, monto: '', descripcion: '' }));
      setMensaje({ tipo: 'success', texto: 'Gasto agregado' });
      const mesDelGasto = form.fecha.slice(0, 7);
      if (mesDelGasto !== mes) setMes(mesDelGasto);
      else cargar(mes);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo guardar el gasto' });
    } finally {
      setGuardando(false);
    }
  };

  const borrarGasto = async (id) => {
    try {
      await gastosAPI.delete(id);
      setBorrandoId(null);
      setMensaje({ tipo: 'success', texto: 'Gasto borrado' });
      cargar(mes);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo borrar el gasto' });
    }
  };

  const guardarMonto = async (id) => {
    const monto = parseFloat(String(editMonto).replace(',', '.'));
    if (isNaN(monto) || monto <= 0) {
      setMensaje({ tipo: 'error', texto: 'El monto debe ser mayor a 0' });
      return;
    }
    try {
      await gastosAPI.update(id, { monto });
      setEditandoId(null);
      setMensaje({ tipo: 'success', texto: 'Monto actualizado' });
      cargar(mes);
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.response?.data?.message || 'No se pudo editar el gasto' });
    }
  };

  const esMesFuturo = mes >= mesActual();
  const positivo = (balance?.ganancia_real ?? 0) >= 0;
  const categoriasOrdenadas = balance
    ? Object.entries(balance.gastos_por_categoria).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="bal">
      {mensaje.texto && (
        <div className={`alert alert-${mensaje.tipo === 'success' ? 'success' : 'error'} fade-in`} style={{ marginTop: '1rem' }}>
          {mensaje.texto}
        </div>
      )}

      {/* Selector de mes */}
      <div className="card bal-selector">
        <button className="btn btn-secondary btn-sm" onClick={() => setMes(moverMes(mes, -1))} aria-label="Mes anterior">‹</button>
        <div className="bal-mes">
          <span className="bal-mes-nombre">{nombreMes(mes)}</span>
          <input
            type="month"
            className="input bal-mes-input"
            value={mes}
            max={mesActual()}
            onChange={(e) => e.target.value && setMes(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setMes(moverMes(mes, 1))} disabled={esMesFuturo} aria-label="Mes siguiente">›</button>
      </div>

      {cargando && !balance && <div className="card bal-cargando">Cargando...</div>}

      {balance && (
        <>
          {/* Cuenta: ventas − costo − gastos = ganancia */}
          <div className="bal-cuenta">
            <div className="bal-paso">
              <span className="bal-paso-label">Ventas</span>
              <span className="bal-paso-valor">{formatearPesos(balance.ventas)}</span>
              <span className="bal-paso-sub">{balance.cantidad_ventas} ventas</span>
            </div>
            <span className="bal-op">−</span>
            <div className="bal-paso">
              <span className="bal-paso-label">Costo de mercadería</span>
              <span className="bal-paso-valor bal-rojo">{formatearPesos(balance.costo_mercaderia)}</span>
              <span className="bal-paso-sub">de lo que vendiste</span>
            </div>
            <span className="bal-op">−</span>
            <div className="bal-paso">
              <span className="bal-paso-label">Gastos</span>
              <span className="bal-paso-valor bal-rojo">{formatearPesos(balance.gastos)}</span>
              <span className="bal-paso-sub">{gastos.length} cargados</span>
            </div>
            <span className="bal-op">=</span>
            <div className={`bal-paso bal-resultado ${positivo ? 'bal-resultado-pos' : 'bal-resultado-neg'}`}>
              <span className="bal-paso-label">{positivo ? 'Ganancia real' : 'Pérdida'}</span>
              <span className="bal-paso-valor">{formatearPesos(balance.ganancia_real)}</span>
              <span className="bal-paso-sub">margen {balance.margen_real.toFixed(1)}%</span>
            </div>
          </div>

          <div className="bal-detalle-linea">
            Ganancia antes de gastos: <strong>{formatearPesos(balance.ganancia_bruta)}</strong>
            <span className="bal-sep">·</span>
            Efectivo {formatearPesos(balance.ventas_por_metodo.efectivo)}
            <span className="bal-sep">·</span>
            Tarjeta {formatearPesos(balance.ventas_por_metodo.tarjeta)}
            <span className="bal-sep">·</span>
            Transferencia / QR {formatearPesos(balance.ventas_por_metodo.transferencia)}
          </div>

          {balance.ventas_sin_costo > 0 && (
            <div className="alert alert-warning bal-aviso">
              Hay {formatearPesos(balance.ventas_sin_costo)} vendidos en productos <strong>sin costo cargado</strong> (incluye los "Varios").
              Esa parte se cuenta como ganancia completa, así que la ganancia real puede ser menor. Cargá el costo en Productos para que el número sea exacto.
            </div>
          )}

          <div className="bal-columnas">
            {/* Gastos del mes */}
            <div className="card bal-gastos">
              <h3>Gastos de {nombreMes(mes)}</h3>

              <form className="bal-form" onSubmit={agregarGasto}>
                <input
                  type="date"
                  className="input"
                  value={form.fecha}
                  max={hoyLocal()}
                  onChange={(e) => setForm(f => ({ ...f, fecha: e.target.value }))}
                />
                <select
                  className="input"
                  value={form.categoria}
                  onChange={(e) => setForm(f => ({ ...f, categoria: e.target.value }))}
                >
                  {CATEGORIAS_GASTO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input
                  type="text"
                  className="input bal-form-desc"
                  placeholder="Descripción (ej: alquiler noviembre)"
                  maxLength={255}
                  value={form.descripcion}
                  onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))}
                />
                <div className="bal-form-monto">
                  <span>$</span>
                  <input
                    type="number"
                    className="input"
                    placeholder="Monto"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={form.monto}
                    onChange={(e) => setForm(f => ({ ...f, monto: e.target.value }))}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Agregar gasto'}
                </button>
              </form>
              <p className="bal-hint">
                Las compras de mercadería no se cargan acá: ya se descuentan como "costo de mercadería" según lo que vendés.
              </p>

              {gastos.length === 0 ? (
                <p className="bal-vacio">No hay gastos cargados este mes.</p>
              ) : (
                <ul className="bal-lista">
                  {gastos.map(g => (
                    <li key={g.id} className="bal-gasto">
                      <span className="bal-gasto-fecha">{formatearDia(g.fecha)}</span>
                      <span className="bal-gasto-info">
                        <span className="bal-gasto-cat">{nombreCategoria(g.categoria)}</span>
                        {g.descripcion && <span className="bal-gasto-desc">{g.descripcion}</span>}
                        {g.caja_id && <span className="bal-gasto-caja">Pagado con plata de la caja</span>}
                        {g.gasto_fijo_id && <span className="bal-gasto-fijo">Gasto fijo</span>}
                      </span>
                      {editandoId === g.id ? (
                        <span className="bal-fijo-edit">
                          <input
                            autoFocus
                            className="input bal-fijo-edit-monto"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={editMonto}
                            onChange={(e) => setEditMonto(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') guardarMonto(g.id); if (e.key === 'Escape') setEditandoId(null); }}
                          />
                          <button className="btn btn-primary btn-sm" onClick={() => guardarMonto(g.id)}>OK</button>
                        </span>
                      ) : (
                        <button
                          className="bal-gasto-monto bal-monto-editable"
                          title="Tocá para cambiar el monto"
                          onClick={() => { setBorrandoId(null); setEditandoId(g.id); setEditMonto(String(parseFloat(g.monto))); }}
                        >
                          {formatearPesos(g.monto)}
                        </button>
                      )}
                      {editandoId === g.id ? (
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditandoId(null)}>✕</button>
                      ) : borrandoId === g.id ? (
                        <span className="bal-gasto-confirmar">
                          <button className="btn btn-danger btn-sm" onClick={() => borrarGasto(g.id)}>Borrar</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setBorrandoId(null)}>No</button>
                        </span>
                      ) : (
                        <button className="bal-gasto-borrar" title="Borrar gasto" onClick={() => setBorrandoId(g.id)}>✕</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Por categoría */}
            <div className="card bal-categorias">
              <h3>Gastos por categoría</h3>
              {categoriasOrdenadas.length === 0 ? (
                <p className="bal-vacio">Sin gastos.</p>
              ) : (
                <ul className="bal-cat-lista">
                  {categoriasOrdenadas.map(([cat, total]) => (
                    <li key={cat}>
                      <div className="bal-cat-fila">
                        <span>{nombreCategoria(cat)}</span>
                        <strong>{formatearPesos(total)}</strong>
                      </div>
                      <div className="bal-cat-barra">
                        <div style={{ width: `${balance.gastos > 0 ? (total / balance.gastos) * 100 : 0}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <GastosFijos
            onCambio={() => cargar(mes)}
            onMensaje={(tipo, texto) => setMensaje({ tipo, texto })}
          />

          {/* Comparativa últimos meses */}
          <div className="card bal-historico">
            <h3>Últimos 6 meses</h3>
            <div className="table-wrapper">
              <table className="bal-tabla">
                <thead>
                  <tr>
                    <th>Mes</th>
                    <th className="num">Ventas</th>
                    <th className="num">Costo mercadería</th>
                    <th className="num">Gastos</th>
                    <th className="num">Ganancia real</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map(h => (
                    <tr key={h.mes} className={h.mes === mes ? 'bal-fila-activa' : ''} onClick={() => setMes(h.mes)} title="Ver este mes">
                      <td>{nombreMes(h.mes)}</td>
                      <td className="num">{formatearPesos(h.ventas)}</td>
                      <td className="num">{formatearPesos(h.costo_mercaderia)}</td>
                      <td className="num">{formatearPesos(h.gastos)}</td>
                      <td className={`num ${h.ganancia_real >= 0 ? 'bal-verde' : 'bal-rojo'}`}><strong>{formatearPesos(h.ganancia_real)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default BalanceMensual;
