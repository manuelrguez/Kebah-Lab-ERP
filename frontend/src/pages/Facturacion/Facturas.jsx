import EmailFacturas from './EmailFacturas.jsx'
import { useState, useEffect, useRef } from 'react'
import { formatCurrency, formatDate } from '../../utils/formatters.js'
import api from '../../services/api.js'
import toast from 'react-hot-toast'

const ESTADOS = ['pendiente', 'pagada', 'vencida', 'anulada']
const TIPOS   = ['emitida', 'recibida']
const IVA_OPTS = [0, 4, 10, 21]

const ESTADO_STYLE = {
  pagada:   'status--green',
  pendiente:'status--orange',
  vencida:  'status--red',
  anulada:  'status--blue',
}

// ── Modal Nueva/Editar Factura ────────────────────────────────────────────────
const ModalFactura = ({ factura, empresas, onClose, onSaved }) => {
  const isEdit = !!factura?.id
  const [form, setForm] = useState({
    tipo:                     factura?.tipo                     || 'emitida',
    empresa_id:               factura?.empresa_id               ? String(factura.empresa_id) : (empresas[0]?.id ? String(empresas[0].id) : ''),
    cliente_proveedor_nombre: factura?.cliente_proveedor_nombre || '',
    cliente_proveedor_cif:    factura?.cliente_proveedor_cif    || '',
    concepto:                 factura?.concepto                 || '',
    base_imponible:           factura?.base_imponible           || '',
    porcentaje_iva:           factura?.porcentaje_iva           || 21,
    fecha:                    factura?.fecha                    || new Date().toISOString().split('T')[0],
    fecha_vencimiento:        factura?.fecha_vencimiento        || '',
    estado:                   factura?.estado                   || 'pendiente',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const base   = parseFloat(form.base_imponible || 0)
  const ivaPct = parseFloat(form.porcentaje_iva || 21)
  const iva    = parseFloat((base * ivaPct / 100).toFixed(2))
  const total  = parseFloat((base + iva).toFixed(2))

  const handleSubmit = async () => {
    if (!form.cliente_proveedor_nombre || !form.base_imponible || !form.fecha) {
      toast.error('Cliente/proveedor, base imponible y fecha son obligatorios')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/facturacion/${factura.id}`, form)
        toast.success('Factura actualizada')
      } else {
        await api.post('/facturacion', form)
        toast.success('Factura creada')
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? `Editar ${factura.numero}` : 'Nueva Factura'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group">
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t} value={t}>{t === 'emitida' ? '↑ Emitida' : '↓ Recibida'}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Empresa</label>
              <select value={form.empresa_id} onChange={e => set('empresa_id', e.target.value)}>
                {empresas.map(e => <option key={e.id} value={String(e.id)}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>{form.tipo === 'emitida' ? 'Cliente' : 'Proveedor'} *</label>
              <input value={form.cliente_proveedor_nombre}
                onChange={e => set('cliente_proveedor_nombre', e.target.value)}
                placeholder="Nombre empresa o persona" />
            </div>
            <div className="form-group">
              <label>CIF / NIF</label>
              <input value={form.cliente_proveedor_cif}
                onChange={e => set('cliente_proveedor_cif', e.target.value)}
                placeholder="B12345678" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Concepto *</label>
              <input value={form.concepto}
                onChange={e => set('concepto', e.target.value)}
                placeholder="Canon mensual, servicios de consultoría..." />
            </div>
            <div className="form-group">
              <label>Base imponible (€) *</label>
              <input type="number" step="0.01" value={form.base_imponible}
                onChange={e => set('base_imponible', e.target.value)}
                placeholder="1000.00" />
            </div>
            <div className="form-group">
              <label>IVA</label>
              <select value={form.porcentaje_iva}
                onChange={e => set('porcentaje_iva', e.target.value)}>
                {IVA_OPTS.map(v => <option key={v} value={v}>{v}%</option>)}
              </select>
            </div>

            {/* Live total preview */}
            <div style={{
              gridColumn: '1/-1', background: 'var(--bg3)', borderRadius: 8,
              padding: '12px 16px', display: 'flex', gap: 24, fontSize: 13,
              border: '1px solid var(--border)',
            }}>
              <span>Base: <strong>{formatCurrency(base)}</strong></span>
              <span>IVA ({ivaPct}%): <strong>{formatCurrency(iva)}</strong></span>
              <span style={{ marginLeft: 'auto', fontSize: 16 }}>
                Total: <strong style={{ color: 'var(--gold)', fontFamily: 'Syne' }}>{formatCurrency(total)}</strong>
              </span>
            </div>

            <div className="form-group">
              <label>Fecha *</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Fecha vencimiento</label>
              <input type="date" value={form.fecha_vencimiento}
                onChange={e => set('fecha_vencimiento', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={form.estado} onChange={e => set('estado', e.target.value)}>
                {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear factura'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal OCR ─────────────────────────────────────────────────────────────────
const ModalOCR = ({ empresas, onClose, onSaved }) => {
  const [file, setFile]       = useState(null)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState(null)

  const scan = async () => {
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/facturacion/ocr', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const d = res.data.data || res.data
      setResult(d)
      setForm({
        tipo:                     'recibida',
        empresa_id:               empresas[0]?.id ? String(empresas[0].id) : '',
        cliente_proveedor_nombre: d.proveedor_nombre || '',
        cliente_proveedor_cif:    d.proveedor_cif    || '',
        concepto:                 d.concepto         || '',
        base_imponible:           d.base_imponible   || '',
        porcentaje_iva:           d.porcentaje_iva   || 21,
        fecha:                    d.fecha            || new Date().toISOString().split('T')[0],
        fecha_vencimiento:        d.fecha_vencimiento || '',
        estado:                   'pendiente',
      })
      toast.success('Factura escaneada correctamente')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al escanear')
    } finally {
      setLoading(false)
    }
  }

  const importar = async () => {
    if (!form) return
    setSaving(true)
    try {
      await api.post('/facturacion', form)
      toast.success('Factura importada correctamente')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al importar')
    } finally {
      setSaving(false)
    }
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📷 Escáner OCR — Importar Factura</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {!result ? (
            <div>
              <div className="drop-zone" onClick={() => document.getElementById('ocr-input').click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]) }}>
                {file ? (
                  <div><div style={{ fontSize: 28 }}>📄</div>
                    <div style={{ fontWeight: 600, marginTop: 8 }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{(file.size/1024).toFixed(0)} KB</div>
                  </div>
                ) : (
                  <div><div style={{ fontSize: 36 }}>📷</div>
                    <div style={{ marginTop: 8 }}>Arrastra la factura aquí o haz clic</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>JPG, PNG o PDF</div>
                  </div>
                )}
              </div>
              <input id="ocr-input" type="file" accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
              <button className="btn btn-primary w-full" style={{ marginTop: 14 }}
                onClick={scan} disabled={loading || !file}>
                {loading ? '⏳ Escaneando con IA...' : '🤖 Escanear con Claude IA'}
              </button>
            </div>
          ) : (
            <div>
              <div style={{
                background: 'var(--bg3)', borderRadius: 8, padding: 12,
                borderLeft: '3px solid var(--green)', marginBottom: 16, fontSize: 13
              }}>
                ✅ La IA ha extraído los datos. Revisa y corrige si es necesario antes de importar.
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Empresa destino</label>
                  <select value={form.empresa_id} onChange={e => setF('empresa_id', e.target.value)}>
                    {empresas.map(e => <option key={e.id} value={String(e.id)}>{e.nombre}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Proveedor</label>
                  <input value={form.cliente_proveedor_nombre}
                    onChange={e => setF('cliente_proveedor_nombre', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>CIF Proveedor</label>
                  <input value={form.cliente_proveedor_cif}
                    onChange={e => setF('cliente_proveedor_cif', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Concepto</label>
                  <input value={form.concepto}
                    onChange={e => setF('concepto', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Base imponible</label>
                  <input type="number" value={form.base_imponible}
                    onChange={e => setF('base_imponible', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>IVA %</label>
                  <select value={form.porcentaje_iva}
                    onChange={e => setF('porcentaje_iva', e.target.value)}>
                    {IVA_OPTS.map(v => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" value={form.fecha}
                    onChange={e => setF('fecha', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Vencimiento</label>
                  <input type="date" value={form.fecha_vencimiento}
                    onChange={e => setF('fecha_vencimiento', e.target.value)} />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          {result && (
            <button className="btn btn-primary" onClick={importar} disabled={saving}>
              {saving ? 'Importando...' : '📥 Importar factura'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal Export ZIP ──────────────────────────────────────────────────────────
const ModalZip = ({ facturas, onClose }) => {
  const [selected, setSelected] = useState(new Set(
    facturas.filter(f => f.estado !== 'anulada').map(f => f.id)
  ))
  const [exporting, setExporting] = useState(false)

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const exportZip = async () => {
    if (!selected.size) { toast.error('Selecciona al menos una factura'); return }
    setExporting(true)
    try {
      const res = await api.post('/facturacion/export/zip',
        { ids: [...selected] },
        { responseType: 'blob' }
      )
      const url  = URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }))
      const link = document.createElement('a')
      link.href  = url
      link.download = `facturas-gestoria-${new Date().toISOString().split('T')[0]}.zip`
      link.click()
      URL.revokeObjectURL(url)
      toast.success(`ZIP generado con ${selected.size} facturas`)
      onClose()
    } catch {
      toast.error('Error al generar ZIP')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📦 Exportar ZIP para Gestoría</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text2)' }}>
            Selecciona las facturas a incluir en el ZIP:
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary btn-sm"
              onClick={() => setSelected(new Set(facturas.map(f => f.id)))}>
              Seleccionar todas
            </button>
            <button className="btn btn-secondary btn-sm"
              onClick={() => setSelected(new Set())}>
              Limpiar
            </button>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', alignSelf: 'center' }}>
              {selected.size} seleccionadas
            </span>
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {facturas.map(f => (
              <label key={f.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', background: selected.has(f.id) ? 'rgba(229,188,85,.08)' : 'var(--bg3)',
                border: `1px solid ${selected.has(f.id) ? 'rgba(229,188,85,.3)' : 'var(--border)'}`,
                borderRadius: 6, cursor: 'pointer', transition: 'all .15s',
              }}>
                <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)}
                  style={{ width: 'auto', padding: 0 }} />
                <span style={{ flex: 1, fontSize: 13 }}>
                  <strong>{f.numero}</strong> · {f.cliente_proveedor_nombre}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{formatCurrency(parseFloat(f.total || 0))}</span>
                <span className={`status ${ESTADO_STYLE[f.estado]}`} style={{ fontSize: 10 }}>{f.estado}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={exportZip} disabled={exporting || !selected.size}>
            {exporting ? '⏳ Generando...' : `📦 Generar ZIP (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
const Facturas = () => {
  const [facturas, setFacturas]   = useState([])
  const [empresas, setEmpresas]   = useState([])
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null) // null|'new'|'ocr'|'zip'|facturaObj
  const [filters, setFilters]     = useState({ tipo: '', estado: '', search: '' })
  const [tabFiltro, setTabFiltro] = useState('todas')

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.tipo)   params.tipo   = filters.tipo
      if (filters.estado) params.estado = filters.estado
      if (filters.search) params.search = filters.search
      if (tabFiltro === 'emitidas')   params.tipo = 'emitida'
      if (tabFiltro === 'recibidas')  params.tipo = 'recibida'
      if (tabFiltro === 'pendientes') params.estado = 'pendiente'
      if (tabFiltro === 'vencidas')   params.estado = 'vencida'

      const [fData, eData, sData] = await Promise.all([
        api.get('/facturacion', { params }).then(r => r.data),
        api.get('/franquicias/meta/empresas').then(r => r.data),
        api.get('/facturacion/stats').then(r => r.data),
      ])
      setFacturas(fData)
      setEmpresas(eData)
      setStats(sData)
    } catch {
      toast.error('Error al cargar facturas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filters, tabFiltro])

  const handleAnular = async (id, numero) => {
    if (!confirm(`¿Anular la factura ${numero}?`)) return
    try {
      await api.delete(`/facturacion/${id}`)
      toast.success('Factura anulada')
      load()
    } catch { toast.error('Error al anular') }
  }

  const cambiarEstado = async (id, estado) => {
    try {
      await api.put(`/facturacion/${id}`, { estado })
      toast.success(`Estado actualizado a ${estado}`)
      load()
    } catch { toast.error('Error al cambiar estado') }
  }

  const TABS = [
    { key: 'todas',      label: 'Todas' },
    { key: 'email',      label: '📬 Email' },
    { key: 'emitidas',   label: '↑ Emitidas' },
    { key: 'recibidas',  label: '↓ Recibidas' },
    { key: 'pendientes', label: '⏳ Pendientes' },
    { key: 'vencidas',   label: '⚠️ Vencidas' },
  ]

  return (
    <div className="page-content">
      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card stat-card--blue">
            <div className="stat-icon">📤</div>
            <div className="stat-label">Facturado (emitidas)</div>
            <div className="stat-value">{formatCurrency(stats.total_emitido)}</div>
            <div className="stat-trend">{stats.count_emitidas} facturas</div>
          </div>
          <div className="stat-card stat-card--red">
            <div className="stat-icon">📥</div>
            <div className="stat-label">Gastos (recibidas)</div>
            <div className="stat-value">{formatCurrency(stats.total_recibido)}</div>
            <div className="stat-trend">{stats.count_recibidas} facturas</div>
          </div>
          <div className="stat-card stat-card--orange">
            <div className="stat-icon">⏳</div>
            <div className="stat-label">Pendientes de cobro</div>
            <div className="stat-value">{stats.pendientes}</div>
            {stats.vencidas > 0 && <div className="stat-trend" style={{ color: 'var(--red)' }}>⚠️ {stats.vencidas} vencidas</div>}
          </div>
          <div className="stat-card stat-card--green">
            <div className="stat-icon">✅</div>
            <div className="stat-label">Cobrado este año</div>
            <div className="stat-value">{formatCurrency(stats.cobrado_mes)}</div>
          </div>
        </div>
      )}

      {/* Tabs + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 8, padding: 4, border: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button key={t.key}
              className={`btn btn-sm ${tabFiltro === t.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
              onClick={() => setTabFiltro(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="search-box" style={{ flex: 1, maxWidth: 260 }}>
          <span>🔍</span>
          <input placeholder="Buscar factura, cliente..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setModal('ocr')}>📷 Importar OCR</button>
          <button className="btn btn-secondary" onClick={() => setModal('zip')}>📦 Export ZIP</button>
          <button className="btn btn-primary" onClick={() => setModal('new')}>+ Nueva Factura</button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">🧾 Facturas ({facturas.length})</span>
        </div>
        {loading ? <div className="loading">Cargando...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nº Factura</th><th>Tipo</th><th>Cliente/Proveedor</th>
                  <th>Concepto</th><th>Base</th><th>IVA</th><th>Total</th>
                  <th>Fecha</th><th>Vencimiento</th><th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturas.length === 0 ? (
                  <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>
                    No hay facturas. <button className="link-sm" onClick={() => setModal('new')}>Crear la primera →</button>
                  </td></tr>
                ) : facturas.map(f => (
                  <tr key={f.id}>
                    <td><strong>{f.numero}</strong></td>
                    <td>
                      <span className={`status ${f.tipo === 'emitida' ? 'status--green' : 'status--blue'}`}
                        style={{ fontSize: 11 }}>
                        {f.tipo === 'emitida' ? '↑ Emitida' : '↓ Recibida'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{f.cliente_proveedor_nombre}</div>
                      {f.cliente_proveedor_cif && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.cliente_proveedor_cif}</div>}
                    </td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.concepto}
                    </td>
                    <td>{formatCurrency(parseFloat(f.base_imponible || 0))}</td>
                    <td style={{ color: 'var(--text3)', fontSize: 12 }}>{f.porcentaje_iva}%</td>
                    <td className="amount-gold">{formatCurrency(parseFloat(f.total || 0))}</td>
                    <td style={{ fontSize: 12 }}>{f.fecha ? formatDate(f.fecha) : '—'}</td>
                    <td style={{ fontSize: 12, color: f.estado === 'vencida' ? 'var(--red)' : 'inherit' }}>
                      {f.fecha_vencimiento ? formatDate(f.fecha_vencimiento) : '—'}
                    </td>
                    <td>
                      <select
                        value={f.estado}
                        onChange={e => cambiarEstado(f.id, e.target.value)}
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          fontSize: 11, fontWeight: 600, padding: '3px 6px', borderRadius: 20,
                          color: f.estado === 'pagada' ? 'var(--green)' : f.estado === 'vencida' ? 'var(--red)' : f.estado === 'pendiente' ? 'var(--orange)' : 'var(--text3)',
                        }}>
                        {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
                      </select>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setModal(f)}>✏️</button>
                        <button className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--red)' }}
                          onClick={() => handleAnular(f.id, f.numero)}
                          disabled={f.estado === 'anulada'}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email tab */}
      {tabFiltro === 'email' && (
        <EmailFacturas />
      )}

      {/* Modals */}
      {(modal === 'new' || (modal && modal.id)) && (
        <ModalFactura
          factura={modal === 'new' ? null : modal}
          empresas={empresas}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
      {modal === 'ocr' && (
        <ModalOCR
          empresas={empresas}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
      {modal === 'zip' && (
        <ModalZip
          facturas={facturas}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

export default Facturas
