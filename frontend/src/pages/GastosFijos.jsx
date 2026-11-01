import React, { useState, useEffect } from 'react';
import { gastosAPI, CATEGORIAS_GASTO, nombreCategoria, formatearPesos } from '../services/api';

const FORM_VACIO = { descripcion: '', categoria: 'alquiler', monto: '', dia: '1', empezar: 'este_mes' };

// Gastos que se repiten todos los meses (alquiler, sueldos, internet...).
// Se cargan una vez y el sistema los agrega solo a los gastos de cada mes.
function GastosFijos({ onCambio, onMensaje }) {
  const [fijos, setFijos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({ monto: '', dia: '' });
  const [borrandoId, setBorrandoId] = useState(null);

  const cargar = async () => {
    try {
      const r = await gastosAPI.getFijos();
      setFijos(r.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { cargar(); }, []);

  const error = (err, porDefecto) => onMensaje('error', err.response?.data?.message || porDefecto);

  const crear = async (e) => {
    e.preventDefault();
    const monto = parseFloat(String(form.monto).replace(',', '.'));
    if (!form.descripcion.trim()) return onMensaje('error', 'Poné una descripción (ej: Alquiler)');
    if (isNaN(monto) || monto <= 0) return onMensaje('error', 'El monto debe ser mayor a 0');
    setGuardando(true);
    try {
      await gastosAPI.createFijo({ ...form, monto, dia: parseInt(form.dia) });
      setForm(FORM_VACIO);
      setMostrarForm(false);
      onMensaje('success', form.empezar === 'este_mes'
        ? 'Gasto fijo guardado. Ya se sumó a los gastos de este mes.'
        : 'Gasto fijo guardado. Se va a sumar desde el mes que viene.');
      await cargar();
      onCambio();
    } catch (err) {
      error(err, 'No se pudo guardar el gasto fijo');
    } finally {
      setGuardando(false);
    }
  };

  const empezarEdicion = (f) => {
    setBorrandoId(null);
    setEditandoId(f.id);
    setEditForm({ monto: String(parseFloat(f.monto)), dia: String(f.dia) });
  };

  const guardarEdicion = async (id) => {
    const monto = parseFloat(String(editForm.monto).replace(',', '.'));
    const dia = parseInt(editForm.dia);
    if (isNaN(monto) || monto <= 0) return onMensaje('error', 'El monto debe ser mayor a 0');
    if (isNaN(dia) || dia < 1 || dia > 31) return onMensaje('error', 'El día debe ser entre 1 y 31');
    try {
      await gastosAPI.updateFijo(id, { monto, dia });
      setEditandoId(null);
      onMensaje('success', 'Gasto fijo actualizado. El cambio vale para los próximos meses.');
      cargar();
    } catch (err) {
      error(err, 'No se pudo editar el gasto fijo');
    }
  };

  const cambiarActivo = async (f) => {
    try {
      await gastosAPI.updateFijo(f.id, { activo: !f.activo });
      onMensaje('success', f.activo ? 'Gasto fijo pausado' : 'Gasto fijo reactivado');
      await cargar();
      onCambio();
    } catch (err) {
      error(err, 'No se pudo cambiar el gasto fijo');
    }
  };

  const borrar = async (id) => {
    try {
      await gastosAPI.deleteFijo(id);
      setBorrandoId(null);
      onMensaje('success', 'Gasto fijo borrado. Los gastos de meses anteriores se mantienen.');
      cargar();
    } catch (err) {
      error(err, 'No se pudo borrar el gasto fijo');
    }
  };

  const totalMensual = fijos.filter(f => f.activo).reduce((s, f) => s + (parseFloat(f.monto) || 0), 0);

  return (
    <div className="card bal-fijos">
      <div className="bal-fijos-header">
        <div>
          <h3>Gastos fijos</h3>
          <p className="bal-fijos-sub">
            Se cargan una vez y se suman solos a los gastos de cada mes.
            {fijos.some(f => f.activo) && <> Total por mes: <strong>{formatearPesos(totalMensual)}</strong></>}
          </p>
        </div>
        {!mostrarForm && (
          <button className="btn btn-primary btn-sm" onClick={() => setMostrarForm(true)}>+ Nuevo gasto fijo</button>
        )}
      </div>

      {mostrarForm && (
        <form className="bal-fijos-form" onSubmit={crear}>
          <input
            autoFocus
            className="input bal-fijos-desc"
            type="text"
            maxLength={255}
            placeholder="Descripción (ej: Alquiler del local)"
            value={form.descripcion}
            onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))}
          />
          <select
            className="input"
            value={form.categoria}
            onChange={(e) => setForm(f => ({ ...f, categoria: e.target.value }))}
          >
            {CATEGORIAS_GASTO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <div className="bal-form-monto">
            <span>$</span>
            <input
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              placeholder="Monto por mes"
              value={form.monto}
              onChange={(e) => setForm(f => ({ ...f, monto: e.target.value }))}
            />
          </div>
          <label className="bal-fijos-campo">
            Día del mes
            <input
              className="input"
              type="number"
              min="1"
              max="31"
              value={form.dia}
              onChange={(e) => setForm(f => ({ ...f, dia: e.target.value }))}
            />
          </label>
          <label className="bal-fijos-campo">
            Empezar
            <select
              className="input"
              value={form.empezar}
              onChange={(e) => setForm(f => ({ ...f, empezar: e.target.value }))}
            >
              <option value="este_mes">Este mes</option>
              <option value="mes_que_viene">El mes que viene (ya lo cargué este mes)</option>
            </select>
          </label>
          <div className="bal-fijos-acciones">
            <button type="button" className="btn btn-secondary" onClick={() => { setMostrarForm(false); setForm(FORM_VACIO); }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {fijos.length === 0 && !mostrarForm ? (
        <p className="bal-vacio">No tenés gastos fijos. Agregá el alquiler, sueldos, internet, etc.</p>
      ) : (
        <ul className="bal-lista">
          {fijos.map(f => (
            <li key={f.id} className={`bal-fijo${f.activo ? '' : ' bal-fijo-pausado'}`}>
              <span className="bal-gasto-info">
                <span className="bal-gasto-cat">{f.descripcion}</span>
                <span className="bal-gasto-desc">
                  {nombreCategoria(f.categoria)} · {editandoId === f.id ? 'día' : `todos los días ${f.dia}`}
                  {!f.activo && ' · En pausa'}
                </span>
              </span>

              {editandoId === f.id ? (
                <span className="bal-fijo-edit">
                  <input
                    className="input bal-fijo-edit-dia"
                    type="number"
                    min="1"
                    max="31"
                    value={editForm.dia}
                    onChange={(e) => setEditForm(x => ({ ...x, dia: e.target.value }))}
                    title="Día del mes"
                  />
                  <input
                    autoFocus
                    className="input bal-fijo-edit-monto"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editForm.monto}
                    onChange={(e) => setEditForm(x => ({ ...x, monto: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') guardarEdicion(f.id); if (e.key === 'Escape') setEditandoId(null); }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => guardarEdicion(f.id)}>Guardar</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditandoId(null)}>✕</button>
                </span>
              ) : (
                <span className="bal-gasto-monto">{formatearPesos(f.monto)}</span>
              )}

              {editandoId !== f.id && (
                borrandoId === f.id ? (
                  <span className="bal-gasto-confirmar">
                    <button className="btn btn-danger btn-sm" onClick={() => borrar(f.id)}>Borrar</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setBorrandoId(null)}>No</button>
                  </span>
                ) : (
                  <span className="bal-fijo-botones">
                    <button className="bal-link" onClick={() => empezarEdicion(f)}>Editar</button>
                    <button className="bal-link" onClick={() => cambiarActivo(f)}>{f.activo ? 'Pausar' : 'Reactivar'}</button>
                    <button className="bal-gasto-borrar" title="Borrar gasto fijo" onClick={() => setBorrandoId(f.id)}>✕</button>
                  </span>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default GastosFijos;
