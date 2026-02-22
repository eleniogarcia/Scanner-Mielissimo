import React from 'react';
import './FacturaA.css';

const FacturaA = React.forwardRef(({ datosEmpresa, datosCliente, ventas, totales }, ref) => {
  const calcularIVA21 = () => {
    const neto = totales.neto_gravado;
    return (neto * 0.21).toFixed(2);
  };

  const formatearFecha = (fecha) => {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const numeroFactura = `${String(datosEmpresa.puntoVenta || '0000').padStart(4, '0')}-${String(datosEmpresa.numeroFactura || '00000001').padStart(8, '0')}`;

  return (
    <div ref={ref} className="factura-a-container">
      {/* Encabezado */}
      <div className="factura-header">
        <div className="empresa-info">
          <div className="empresa-nombre">{datosEmpresa.razonSocial}</div>
          <div>{datosEmpresa.domicilio}</div>
          <div>{datosEmpresa.localidad} - {datosEmpresa.provincia}</div>
          <div>({datosEmpresa.codigoArea}) {datosEmpresa.telefono}</div>
          <div><strong>Responsable Inscripto</strong></div>
        </div>

        <div className="factura-tipo">
          <div className="letra-factura">A</div>
          <div className="cod-factura">CÓD. 01</div>
          <div className="original">ORIGINAL</div>
        </div>

        <div className="factura-datos">
          <div className="factura-titulo">FACTURA</div>
          <div className="factura-numero">{numeroFactura}</div>
          <div className="factura-fecha">Fecha de Emisión: {formatearFecha(new Date())}</div>
        </div>
      </div>

      {/* Datos fiscales empresa */}
      <div className="factura-section">
        <div className="datos-grid">
          <div><strong>CUIT:</strong> {datosEmpresa.cuit}</div>
          <div><strong>Ingresos Brutos:</strong> {datosEmpresa.ingresosBrutos}</div>
          <div><strong>Inicio de Actividades:</strong> {datosEmpresa.inicioActividades}</div>
        </div>
      </div>

      {/* Datos del cliente */}
      <div className="factura-section cliente-section">
        <div className="datos-grid">
          <div className="dato-row">
            <strong>Razón Social:</strong> {datosCliente.razonSocial}
          </div>
          <div className="dato-row">
            <strong>CUIT:</strong> {datosCliente.cuit}
          </div>
          <div className="dato-row">
            <strong>Domicilio:</strong> {datosCliente.domicilio}
          </div>
          <div className="dato-row">
            <strong>Localidad:</strong> {datosCliente.localidad}
          </div>
          <div className="dato-row">
            <strong>Cond. IVA:</strong> {datosCliente.condicionIVA}
          </div>
          <div className="dato-row">
            <strong>Provincia:</strong> {datosCliente.provincia}
          </div>
          <div className="dato-row">
            <strong>Cond. Venta:</strong> {datosCliente.condicionVenta}
          </div>
          <div className="dato-row">
            <strong>Teléfono:</strong> {datosCliente.telefono}
          </div>
        </div>
      </div>

      {/* Tabla de productos */}
      <table className="factura-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descripción</th>
            <th>Cantidad</th>
            <th>P. Unitario</th>
            <th>Alic. IVA</th>
            <th>Importe</th>
          </tr>
        </thead>
        <tbody>
          {ventas.map((item, index) => (
            <tr key={index}>
              <td>{item.codigo}</td>
              <td>{item.nombre}</td>
              <td>{item.cantidad}</td>
              <td>${parseFloat(item.precio).toFixed(2)}</td>
              <td>21%</td>
              <td>${(item.cantidad * item.precio).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div className="factura-totales">
        <div className="totales-right">
          <div className="total-row">
            <span>Importe Neto Gravado: $</span>
            <span className="total-valor">{parseFloat(totales.neto_gravado).toFixed(2)}</span>
          </div>
          <div className="total-row">
            <span>IVA 21%: $</span>
            <span className="total-valor">{calcularIVA21()}</span>
          </div>
          <div className="total-row">
            <span>IVA 10,5%: $</span>
            <span className="total-valor">0.00</span>
          </div>
          <div className="total-row">
            <span>Importe Otros Tributos: $</span>
            <span className="total-valor">0.00</span>
          </div>
          <div className="total-row total-final">
            <span><strong>Total: $</strong></span>
            <span className="total-valor"><strong>{parseFloat(totales.total).toFixed(2)}</strong></span>
          </div>
        </div>
      </div>

      {/* Footer con CAE */}
      <div className="factura-footer">
        <div className="cae-section">
          <div className="cae-qr">
            <div style={{ width: '80px', height: '80px', border: '1px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
              QR CODE
            </div>
          </div>
          <div className="cae-info">
            <div className="arca-logo">
              <strong>ARCA</strong>
              <div style={{ fontSize: '8px' }}>AGENCIA DE RECAUDACIÓN<br/>Y CONTROL ADUANERO</div>
            </div>
            <div style={{ marginTop: '10px' }}>
              <strong>Comprobante Autorizado</strong>
              <div style={{ fontSize: '10px', marginTop: '5px' }}>
                Esta Administración Federal no se responsabiliza por los datos ingresados en el detalle de la operación
              </div>
            </div>
          </div>
          <div className="cae-datos">
            <div><strong>CAE Nº:</strong> {datosEmpresa.cae || '1234567890'}</div>
            <div><strong>Fecha de Vto. de CAE:</strong> {datosEmpresa.vencimientoCAE || formatearFecha(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000))}</div>
          </div>
        </div>
      </div>
    </div>
  );
});

FacturaA.displayName = 'FacturaA';

export default FacturaA;
