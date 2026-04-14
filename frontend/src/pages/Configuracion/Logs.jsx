import { useState, useEffect, useCallback } from 'react'
import { formatDate } from '../../utils/formatters.js'
import api from '../../services/api.js'
import toast from 'react-hot-toast'

const ACCION_STYLE = {
  LOGIN:   { color: 'var(--green)',  bg: 'rgba(63,185,80,.12)',   emoji: '🔑' },
  LOGOUT:  { color: 'var(--text3)', bg: 'rgba(110,118,129,.12)', emoji: '🚪' },
  CREATE:  { color: 'var(--blue)',   bg: 'rgba(88,166,255,.12)',  emoji: '➕' },
  UPDATE:  { color: 'var(--gold)',   bg: 'rgba(229,188,85,.12)',  emoji: '✏️' },
  DELETE:  { color: 'var(--red)',    bg: 'rgba(248,81,73,.12)',   emoji: '🗑️' },
  VIEW:    { color: 'var(--text3)', bg: 'rgba(110,118,129,.08)', emoji: '👁️' },
  ERROR:   { color: 'var(--red)',    bg: 'rgba(248,81,73,.12)',   emoji: '⚠️' },
}

const ROL_STYLE = {
  superadmin:   { color: 'var(--purple)', label: 'Superadmin' },
  central:      { color: 'var(--blue)',   label: 'Central' },
  empresa:      { color: 'var(--gold)',   label: 'Empresa' },
  franquiciado: { color: 'var(--green)',  label: 'Franquiciado' },
}

const fmtDateTime = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

const Logs = () => {
  const [tab, setTab]         = useState('admins') // 'admins' | 'franquiciados'
  const [logs, setLogs]       = useState([])
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [filters, setFilters] = useState({
    search: '', accion: '', fecha_desde: '', fecha_hasta: ''
  })

  const LIMIT = 50

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        tipo:        tab,
        page,
        limit:       LIMIT,
        accion:      filters.accion      || undefined,
        search:      filters.search      || undefined,
        fecha_desde: filters.fecha_desde || undefined,
        fecha_hasta: filters.fecha_hasta || undefined,
      }
      const [logsRes, statsRes] = await Promise.all([
        api.get('/logs', { params }).then(r => r.data),
        api.get('/logs/stats').then(r => r.data),
      ])
      setLogs(logsRes.logs)
      setTotal(logsRes.total)
      setStats(statsRes)
    } catch {
      toast.error('Error al cargar logs')
    } finally {
      setLoading(false)
    }
  }, [tab, page, filters])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [tab, filters])

  const setF = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  const pages = Math.ceil(total / LIMIT)

  return (
    <div className="page-content">
      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card stat-card--blue">
            <div className="stat-icon">📋</div>
            <div className="stat-label">Total registros</div>
            <div className="stat-value">{stats.total.toLocaleString()}</div>
          </div>
          <div className="stat-card stat-card--green">
            <div className="stat-icon">🔑</div>
            <div className="stat-label">Logins hoy</div>
            <div className="stat-value">{stats.logins_hoy}</div>
          </div>
          <div className="stat-card stat-card--gold">
            <div className="stat-icon">📅</div>
            <div className="stat-label">Acciones hoy</div>
            <div className="stat-value">{stats.hoy}</div>
          </div>
          <div className="stat-card stat-card--red">
            <div className="stat-icon">⚠️</div>
            <div className="stat-label">Errores hoy</div>
            <div className="stat-value">{stats.errores_hoy}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 8, padding: 4, border: '1px solid var(--border)' }}>
          {[
            { key: 'admins',        label: '🛡️ Admins' },
            { key: 'franquiciados', label: '🏪 Franquiciados' },
          ].map(t => (
            <button key={t.key}
              className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none' }}
              onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="search-box" style={{ maxWidth: 240 }}>
          <span>🔍</span>
          <input placeholder="Usuario, IP, acción..."
            value={filters.search}
            onChange={e => setF('search', e.target.value)} />
        </div>
        <select className="input-select" value={filters.accion}
          onChange={e => setF('accion', e.target.value)}>
          <option value="">Todas las acciones</option>
          {['LOGIN','LOGOUT','CREATE','UPDATE','DELETE','ERROR'].map(a =>
            <option key={a} value={a}>{a}</option>)}
        </select>
        <input type="date" className="input-select" value={filters.fecha_desde}
          onChange={e => setF('fecha_desde', e.target.value)} />
        <input type="date" className="input-select" value={filters.fecha_hasta}
          onChange={e => setF('fecha_hasta', e.target.value)} />
        <button className="btn btn-secondary btn-sm"
          onClick={() => setFilters({ search:'', accion:'', fecha_desde:'', fecha_hasta:'' })}>
          🗑️ Limpiar
        </button>
        <button className="btn btn-secondary btn-sm" onClick={load}>🔄 Actualizar</button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>
          {total.toLocaleString()} registros
        </span>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {tab === 'admins' ? '🛡️ Logs de Administradores' : '🏪 Logs de Franquiciados'}
          </span>
        </div>
        {loading ? <div className="loading">Cargando logs...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Acción</th>
                  <th>Módulo</th>
                  <th>Descripción</th>
                  <th>IP</th>
                  <th>Estado</th>
                  <th>Duración</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>
                    No hay registros de actividad
                  </td></tr>
                ) : logs.map(log => {
                  const accionStyle = ACCION_STYLE[log.accion] || ACCION_STYLE.VIEW
                  const rolStyle    = ROL_STYLE[log.rol] || { color: 'var(--text3)', label: log.rol }
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: 11, whiteSpace: 'nowrap', color: 'var(--text2)' }}>
                        {fmtDateTime(log.createdAt)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{log.usuario_nombre}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{log.usuario_email}</div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: rolStyle.color,
                          background: `${rolStyle.color}20`, padding: '2px 8px', borderRadius: 10,
                        }}>{rolStyle.label}</span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 11, fontWeight: 600, color: accionStyle.color,
                          background: accionStyle.bg, padding: '3px 10px', borderRadius: 20,
                        }}>
                          {accionStyle.emoji} {log.accion}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                        {log.modulo || '—'}
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={log.descripcion}>
                        {log.descripcion}
                      </td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text3)' }}>
                        {log.ip || '—'}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: log.status_code >= 400 ? 'var(--red)' : 'var(--green)',
                        }}>
                          {log.status_code || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {log.duracion_ms ? `${log.duracion_ms}ms` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '16px 0', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}>← Anterior</button>
            <span style={{ padding: '5px 12px', fontSize: 13, color: 'var(--text2)' }}>
              {page} / {pages}
            </span>
            <button className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page === pages}>Siguiente →</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Logs
