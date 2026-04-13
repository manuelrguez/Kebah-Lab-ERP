require('dotenv').config({ path: './.env' })
const { Factura, Empresa, sequelize } = require('./src/models/index.js')

async function seed() {
  await sequelize.authenticate()

  const empresas = await Empresa.findAll()
  if (!empresas.length) { console.log('❌ No hay empresas'); process.exit(1) }

  const e1 = empresas[0] // KL Madrid SL
  const e2 = empresas[1] // KL Sur SL

  const facturas = [
    // Emitidas
    { empresa_id: e1.id, numero: `FAC-2026-001`, tipo: 'emitida', cliente_proveedor_nombre: 'KL Sur SL',      cliente_proveedor_cif: 'B12345002', concepto: 'Canon mensual franquicia Q1 2026',   base_imponible: 3000, porcentaje_iva: 21, cuota_iva: 630,   total: 3630,  fecha: '2026-01-15', fecha_vencimiento: '2026-02-15', estado: 'pagada' },
    { empresa_id: e1.id, numero: `FAC-2026-002`, tipo: 'emitida', cliente_proveedor_nombre: 'KL Este SL',     cliente_proveedor_cif: 'B12345003', concepto: 'Canon mensual franquicia Q1 2026',   base_imponible: 2000, porcentaje_iva: 21, cuota_iva: 420,   total: 2420,  fecha: '2026-01-15', fecha_vencimiento: '2026-02-15', estado: 'pagada' },
    { empresa_id: e1.id, numero: `FAC-2026-003`, tipo: 'emitida', cliente_proveedor_nombre: 'KL Cataluña SL', cliente_proveedor_cif: 'B12345004', concepto: 'Royalty marketing Q1 2026',           base_imponible: 1500, porcentaje_iva: 21, cuota_iva: 315,   total: 1815,  fecha: '2026-02-01', fecha_vencimiento: '2026-03-01', estado: 'pagada' },
    { empresa_id: e1.id, numero: `FAC-2026-004`, tipo: 'emitida', cliente_proveedor_nombre: 'KL Sur SL',      cliente_proveedor_cif: 'B12345002', concepto: 'Canon mensual franquicia Q2 2026',   base_imponible: 3000, porcentaje_iva: 21, cuota_iva: 630,   total: 3630,  fecha: '2026-04-01', fecha_vencimiento: '2026-05-01', estado: 'pendiente' },
    { empresa_id: e1.id, numero: `FAC-2026-005`, tipo: 'emitida', cliente_proveedor_nombre: 'KL Este SL',     cliente_proveedor_cif: 'B12345003', concepto: 'Formación y soporte técnico Q1',     base_imponible: 800,  porcentaje_iva: 21, cuota_iva: 168,   total: 968,   fecha: '2026-03-10', fecha_vencimiento: '2026-03-31', estado: 'vencida' },
    // Recibidas
    { empresa_id: e1.id, numero: `FAC-2026-006`, tipo: 'recibida', cliente_proveedor_nombre: 'Proveedor Packaging SL', cliente_proveedor_cif: 'B99001122', concepto: 'Material packaging Q1 2026', base_imponible: 1200, porcentaje_iva: 21, cuota_iva: 252, total: 1452, fecha: '2026-01-20', fecha_vencimiento: '2026-02-20', estado: 'pagada' },
    { empresa_id: e1.id, numero: `FAC-2026-007`, tipo: 'recibida', cliente_proveedor_nombre: 'CloudHost SA',           cliente_proveedor_cif: 'A55667788', concepto: 'Hosting y servicios cloud Q1', base_imponible: 400,  porcentaje_iva: 21, cuota_iva: 84,  total: 484,  fecha: '2026-02-01', fecha_vencimiento: '2026-03-01', estado: 'pagada' },
    { empresa_id: e1.id, numero: `FAC-2026-008`, tipo: 'recibida', cliente_proveedor_nombre: 'Gestoría Fiscal 360',   cliente_proveedor_cif: 'B33445566', concepto: 'Servicios de gestoría Q1 2026', base_imponible: 600,  porcentaje_iva: 21, cuota_iva: 126, total: 726,  fecha: '2026-03-01', fecha_vencimiento: '2026-04-01', estado: 'pendiente' },
  ]

  for (const f of facturas) {
    await Factura.findOrCreate({ where: { numero: f.numero }, defaults: f })
  }

  console.log(`✅ ${facturas.length} facturas de prueba creadas`)
  process.exit(0)
}

seed().catch(e => { console.error(e.message); process.exit(1) })
