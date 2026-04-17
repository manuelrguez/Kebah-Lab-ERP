import { useState, useEffect } from 'react'
import api from '../../services/api.js'
import toast from 'react-hot-toast'

const FILTROS_PRESET = ['factura', 'invoice', 'recibo', 'albarán', 'receipt', 'nota de cargo']

const EmailFacturas = ({ onFacturasImportadas }) => {
  const [configs, setConfigs]         = useState([])
  const [configId, setConfigId]       = useState(null) // id seleccionado
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [syncing, setSyncing]         = useState(false)
  const [historial, setHistorial]     = useState([])
  const [maxEmails, setMaxEmails]     = useState(20)
  const [filtrosAsunto, setFiltrosAsunto] = useState(['factura', 'invoice', 'recibo'])
  const [filtroCustom, setFiltroCustom]   = useState('')

  useEffect(() => {
    api.get('/email-config')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data ? [r.data] : [])
        setConfigs(list)
        if (list.length > 0) {
          setConfigId(list[0].id)
          if (list[0].filtros_asunto) setFiltrosAsunto(list[0].filtros_asunto)
        }
      })
      .catch(() => setConfigs([]))
      .finally(() => setLoadingConfig(false))
  }, [])

  const configSeleccionada = configs.find(c => c.id === configId)

  // Al cambiar selección, actualizar filtros al de esa cuenta
  const handleSelectConfig = (id) => {
    setConfigId(id)
    const c = configs.find(x => x.id === id)
    if (c?.filtros_asunto) setFiltrosAsunto(c.filtros_asunto)
  }

  const toggleFiltro = (f) => {
    setFiltrosAsunto(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    )
  }

  const addFiltroCustom = () => {
    if (!filtroCustom.trim()) return
    if (!filtrosAsunto.includes(filtroCustom.trim())) {
      setFiltrosAsunto(prev => [...prev, filtroCustom.trim()])
    }
    setFiltroCustom('')
  }

  const handleSync = async () => {
    if (configs.length === 0) {
      toast.error('Configura primero el correo en Configuración → Correo')
      return
    }

    setSyncing(true)
    try {
      await api.post('/email-invoice/sync-guardado', {
        config_id:      configId,
        max_emails:     parseInt(maxEmails),
        filtros_asunto: filtrosAsunto,
      })

      toast.success('✅ Sync iniciado — las facturas aparecerán en 1-2 minutos')
      if (onFacturasImportadas) setTimeout(onFacturasImportadas, 3000)
      setHistorial(prev => [{
        ts: new Date(), cuenta: configSeleccionada?.nombre || '—'
      }, ...prev.slice(0, 9)])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  if (loadingConfig) return <div className="loading">Cargando...</div>

  return (
    <div>
      {/* Estado */}
      {configs.length === 0 ? (
        <div style={{
          background: 'rgba(248,81,73,.08)', border: '1px solid rgba(248,81,73,.3)',
          borderRadius: 10, padding: '20px 24px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Correo no configurado</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              Ve a <strong>Configuración → Correo</strong> para añadir tu cuenta de email.
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'rgba(63,185,80,.08)', border: '1px solid rgba(63,185,80,.3)',
          borderRadius: 10, padding: '14px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: 22 }}>✅</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
              {configs.length === 1 ? 'Cuenta configurada' : `${configs.length} cuentas configuradas`}
            </div>
            {/* Selector de cuenta si hay más de una */}
            {configs.length > 1 ? (
              <select
                value={configId || ''}
                onChange={e => handleSelectConfig(parseInt(e.target.value))}
                style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6 }}>
                {configs.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre} — {c.usuario}</option>
                ))}
              </select>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                {configSeleccionada?.usuario} · {configSeleccionada?.host}
              </div>
            )}
          </div>
          <a href="/email-config" style={{ fontSize: 12, color: 'var(--blue)' }}>
            Gestionar cuentas →
          </a>
        </div>
      )}

      {/* Opciones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header"><span className="card-title">⚙️ Opciones</span></div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Máximo de emails a revisar</label>
            <input type="number" value={maxEmails}
              onChange={e => setMaxEmails(e.target.value)} min={1} max={100} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header"><span className="card-title">🔍 Filtros de asunto</span></div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>
            Solo se procesarán emails cuyo asunto contenga:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {FILTROS_PRESET.map(f => (
              <button key={f} onClick={() => toggleFiltro(f)} style={{
                background:   filtrosAsunto.includes(f) ? 'rgba(229,188,85,.2)' : 'var(--bg4)',
                border:       `1px solid ${filtrosAsunto.includes(f) ? 'rgba(229,188,85,.5)' : 'var(--border)'}`,
                color:        filtrosAsunto.includes(f) ? 'var(--gold)' : 'var(--text2)',
                borderRadius: 20, padding: '4px 12px', fontSize: 12, cursor: 'pointer',
              }}>{f}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={filtroCustom}
              onChange={e => setFiltroCustom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addFiltroCustom()}
              placeholder="Añadir filtro..." style={{ flex: 1, fontSize: 12 }} />
            <button className="btn btn-secondary btn-sm" onClick={addFiltroCustom}>+</button>
          </div>
        </div>
      </div>

      <button className="btn btn-primary"
        onClick={handleSync}
        disabled={syncing || configs.length === 0}
        style={{ fontSize: 14, padding: '12px 28px', marginBottom: 20 }}>
        {syncing ? '⏳ Conectando...' : '📬 Obtener últimas facturas del correo'}
      </button>

      {historial.length > 0 && (
        <div className="card">
          <div className="card-header"><span className="card-title">📋 Historial</span></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Fecha</th><th>Cuenta</th></tr>
              </thead>
              <tbody>
                {historial.map((h, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12 }}>{h.ts.toLocaleString('es-ES')}</td>
                    <td style={{ fontSize: 12 }}>{h.cuenta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailFacturas
