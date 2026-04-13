import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import { formatCurrency, formatDate } from '../../utils/formatters.js'
import api from '../../services/api.js'
import toast from 'react-hot-toast'

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <div style={{ color: 'var(--text3)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 3 }}>
          {p.name}: <strong>{typeof p.value === 'number' && p.name !== 'Tickets'
            ? formatCurrency(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  )
}

// ── Modal nueva venta ─────────────────────────────────────────────────────────
const ModalVenta = ({ venta, franquicias, onClose, onSaved }) => {
  const isEdit = !!venta?.id
  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    franquicia_id: venta?.franquicia_id ? String(venta.franquicia_id) : (franquicias[0]?.id ? String(franquicias[0].id) : ''),
    fecha:         venta?.fecha         || hoy,
    total:         venta?.total         || '',
    num_tickets:   venta?.num_tickets   || '',
    efectivo:      venta?.efectivo      || '',
    tarjeta:       venta?.tarjeta       || '',
    hora_inicio:   venta?.hora_inicio   || '',
    hora_fin:      venta?.hora_fin      || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Auto-calc total from efectivo + tarjeta
  useEffect(() => {
    const ef = parseFloat(form.efectivo || 0)
    const tj = parseFloat(form.tarjeta  || 0)
    if (ef + tj > 0) set('total', (ef + tj).toFixed(2))
  }, [form.efectivo, form.tarjeta])

  const handleSubmit = async () => {
    if (!form.franquicia_id || !form.fecha || !form.total) {
      toast.error('Franquicia, fecha y total son obligatorios')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/ventas/${venta.id}`, form)
        toast.success('Venta actualizada')
      } else {
        await api.post('/ventas', form)
        toast.success('Venta registrada')
      }
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const total    = parseFloat(form.total || 0)
  const efectivo = parseFloat(form.efectivo || 0)
  const tarjeta  = parseFloat(form.tarjeta  || 0)
  const tickets  = parseInt(form.num_tickets || 0)
  const ticketMedio = tickets > 0 ? (total / tickets).toFixed(2) : 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Editar Venta' : 'Registrar Venta TPV'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group">
              <label>Franquicia *</label>
              <select value={form.franquicia_id} onChange={e => set('franquicia_id', e.target.value)}>
                <option value="">Seleccionar</option>
                {franquicias.map(f => <option key={f.id} value={String(f.id)}>{f.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha *</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Hora inicio</label>
              <input type="time" value={form.hora_inicio} onChange={e => set('hora_inicio', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Hora fin</label>
              <input type="time" value={form.hora_fin} onChange={e => set('hora_fin', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Efectivo (€)</label>
              <input type="number" step="0.01" value={form.efectivo}
                onChange={e => set('efectivo', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Tarjeta (€)</label>
              <input type="number" step="0.01" value={form.tarjeta}
                onChange={e => set('tarjeta', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Total (€) *</label>
              <input type="number" step="0.01" value={form.total}
                onChange={e => set('total', e.target.value)} placeholder="0.00" />
            </div>
            <div className="form-group">
              <label>Nº Tickets</label>
              <input type="number" value={form.num_tickets}
                onChange={e => set('num_tickets', e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Live preview */}
          {total > 0 && (
            <div style={{
              background: 'var(--bg3)', borderRadius: 8, padding: '12px 16px',
              border: '1px solid var(--border)', display: 'flex', gap: 24,
              fontSize: 13, marginTop: 8, flexWrap: 'wrap',
            }}>
              <span>💳 Efectivo: <strong>{formatCurrency(efectivo)}</strong></span>
              <span>💳 Tarjeta: <strong>{formatCurrency(tarjeta)}</strong></span>
              <span style={{ marginLeft: 'auto' }}>
                Total: <strong style={{ color: 'var(--gold)', fontFamily: 'Syne', fontSize: 16 }}>
                  {formatCurrency(total)}
                </strong>
              </span>
              {ticketMedio > 0 && (
                <span style={{ width: '100%', color: 'var(--text3)' }}>
                  Ticket medio: {formatCurrency(parseFloat(ticketMedio))}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar venta'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
const ResumenVentas = () => {
  const [stats, setStats]           = useState(null)
  const [ventasDia, setVentasDia]   = useState([])
  const [porFranq, setPorFranq]     = useState([])
  const [ventas, setVentas]         = useState([])
  const [franquicias, setFranquicias] = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(null)
  const [periodo, setPeriodo]       = useState(30)
  const [filtroFranq, setFiltroFranq] = useState('')
  const [tab, setTab]               = useState('dashboard')

  const load = async () => {
    setLoading(true)
    try {
      const [sData, dData, fData, vData, franqData] = await Promise.all([
        api.get('/ventas/dashboard-stats').then(r => r.data),
        api.get('/ventas/por-dia', { params: { dias: periodo, franquicia_id: filtroFranq || undefined } }).then(r => r.data),
        api.get('/ventas/por-franquicia').then(r => r.data),
        api.get('/ventas', { params: { franquicia_id: filtroFranq || undefined } }).then(r => r.data),
        api.get('/franquicias').then(r => r.data),
      ])
      setStats(sData)
      setVentasDia(dData)
      setPorFranq(fData)
      setVentas(vData)
      setFranquicias(franqData)
    } catch {
      toast.error('Error al cargar ventas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [periodo, filtroFranq])

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta venta?')) return
    try {
      await api.delete(`/ventas/${id}`)
      toast.success('Venta eliminada')
      load()
    } catch { toast.error('Error al eliminar') }
  }

  // Format chart date labels
  const fmtDia = (d) => {
    if (!d) return ''
    const parts = d.split('-')
    return `${parts[2]}/${parts[1]}`
  }

  const maxVenta = Math.max(...ventasDia.map(v => v.total), 1)

  return (
    <div className="page-content">
      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card stat-card--green">
            <div className="stat-icon">💳</div>
            <div className="stat-label">Ventas Hoy</div>
            <div className="stat-value">{formatCurrency(stats.ventas_hoy)}</div>
            <div className="stat-trend">{stats.tickets_hoy} tickets</div>
          </div>
          <div className="stat-card stat-card--blue">
            <div className="stat-icon">📅</div>
            <div className="stat-label">Ventas del Mes</div>
            <div className="stat-value">{formatCurrency(stats.ventas_mes)}</div>
            <div className={`stat-trend ${stats.pct_vs_mes_ant < 0 ? 'stat-trend--down' : ''}`}>
              {stats.pct_vs_mes_ant >= 0 ? '↑' : '↓'} {Math.abs(stats.pct_vs_mes_ant)}% vs mes anterior
            </div>
          </div>
          <div className="stat-card stat-card--gold">
            <div className="stat-icon">🎯</div>
            <div className="stat-label">Ticket Medio Hoy</div>
            <div className="stat-value">{formatCurrency(stats.ticket_medio)}</div>
          </div>
          <div className="stat-card stat-card--red">
            <div className="stat-icon">🏪</div>
            <div className="stat-label">Franquicias Activas</div>
            <div className="stat-value">{stats.franquicias_activas}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { key: 'dashboard', label: '📊 Dashboard' },
          { key: 'listado',   label: '📋 Listado' },
        ].map(t => (
          <button key={t.key}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
        <select className="input-select" value={filtroFranq}
          onChange={e => setFiltroFranq(e.target.value)}>
          <option value="">Todas las franquicias</option>
          {franquicias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
        {tab === 'dashboard' && (
          <select className="input-select" value={periodo}
            onChange={e => setPeriodo(e.target.value)}>
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
        )}
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }}
          onClick={() => setModal('new')}>
          + Registrar Venta
        </button>
      </div>

      {/* DASHBOARD TAB */}
      {tab === 'dashboard' && (
        <>
          {/* Area chart — ventas por día */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <span className="card-title">📈 Ventas diarias — últimos {periodo} días</span>
            </div>
            {loading ? <div className="loading">Cargando...</div> :
              ventasDia.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>
                  No hay datos de ventas. <button className="link-sm" onClick={() => setModal('new')}>Registrar primera venta →</button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={ventasDia} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#E5BC55" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#E5BC55" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradEfectivo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#58a6ff" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#58a6ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                    <XAxis dataKey="fecha" tickFormatter={fmtDia}
                      tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                    <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k€`}
                      tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text2)' }} />
                    <Area type="monotone" dataKey="total"    name="Total"    stroke="#E5BC55" fill="url(#gradTotal)"    strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="efectivo" name="Efectivo" stroke="#58a6ff" fill="url(#gradEfectivo)" strokeWidth={1.5} dot={false} />
                    <Area type="monotone" dataKey="tarjeta"  name="Tarjeta"  stroke="#3fb950" fill="none"               strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                  </AreaChart>
                </ResponsiveContainer>
              )
            }
          </div>

          {/* Bar chart — por franquicia */}
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <span className="card-title">🏪 Ventas por franquicia (mes actual)</span>
              </div>
              {porFranq.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 30, fontSize: 13 }}>Sin datos</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={porFranq} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 10, fill: 'var(--text3)' }}
                      angle={-30} textAnchor="end" interval={0} />
                    <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}k`}
                      tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total" name="Ventas" fill="#E5BC55" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Ranking table */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">🏆 Ranking franquicias</span>
              </div>
              {porFranq.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 30, fontSize: 13 }}>Sin datos</div>
              ) : porFranq.map((f, i) => (
                <div key={f.franquicia_id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0', borderBottom: i < porFranq.length - 1 ? '1px solid rgba(48,54,61,.4)' : 'none',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: i === 0 ? '#E5BC55' : i === 1 ? '#8b949e' : i === 2 ? '#e3762a' : 'var(--bg4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                    color: i < 3 ? '#000' : 'var(--text2)',
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{f.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.tickets} tickets · {f.ciudad}</div>
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ width: 80 }}>
                    <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        width: `${(f.total / (porFranq[0]?.total || 1)) * 100}%`,
                        height: '100%', background: 'var(--gold)', borderRadius: 2,
                      }} />
                    </div>
                  </div>
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, color: 'var(--gold)', fontSize: 13, minWidth: 90, textAlign: 'right' }}>
                    {formatCurrency(f.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* LISTADO TAB */}
      {tab === 'listado' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📋 Registro de ventas ({ventas.length})</span>
          </div>
          {loading ? <div className="loading">Cargando...</div> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Franquicia</th><th>Horario</th>
                    <th>Tickets</th><th>Efectivo</th><th>Tarjeta</th>
                    <th>Total</th><th>Ticket medio</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>
                      No hay ventas registradas. <button className="link-sm" onClick={() => setModal('new')}>Registrar →</button>
                    </td></tr>
                  ) : ventas.map(v => (
                    <tr key={v.id}>
                      <td>{formatDate(v.fecha)}</td>
                      <td style={{ fontWeight: 500 }}>{v.franquicia?.nombre || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text3)' }}>
                        {v.hora_inicio && v.hora_fin ? `${v.hora_inicio} – ${v.hora_fin}` : '—'}
                      </td>
                      <td>{v.num_tickets || 0}</td>
                      <td>{formatCurrency(parseFloat(v.efectivo || 0))}</td>
                      <td>{formatCurrency(parseFloat(v.tarjeta  || 0))}</td>
                      <td className="amount-gold">{formatCurrency(parseFloat(v.total || 0))}</td>
                      <td style={{ fontSize: 12 }}>
                        {v.num_tickets > 0
                          ? formatCurrency(parseFloat(v.total || 0) / parseInt(v.num_tickets))
                          : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setModal(v)}>✏️</button>
                          <button className="btn btn-secondary btn-sm"
                            style={{ color: 'var(--red)' }}
                            onClick={() => handleDelete(v.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal && (
        <ModalVenta
          venta={modal === 'new' ? null : modal}
          franquicias={franquicias}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}

export default ResumenVentas
