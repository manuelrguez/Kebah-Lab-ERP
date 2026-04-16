import { useState, useEffect } from 'react'
import api from '../../services/api.js'
import toast from 'react-hot-toast'

const PROVIDERS = {
  imap:    { label: 'IMAP genérico (Gmail, Yahoo, etc.)', host: 'imap.gmail.com', port: 993 },
  outlook: { label: 'Outlook / Microsoft 365',           host: 'outlook.office365.com', port: 993 },
}

const ConfiguracionEmail = () => {
  const [config, setConfig]     = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [testing, setTesting]   = useState(false)
  const [editando, setEditando] = useState(false)
  const [form, setForm]         = useState({
    provider: 'imap',
    host:     'imap.gmail.com',
    port:     993,
    tls:      true,
    usuario:  '',
    password: '',
    carpeta:  'INBOX',
  })

  useEffect(() => {
    api.get('/email-config')
      .then(r => { setConfig(r.data); if (!r.data) setEditando(true) })
      .catch(() => setEditando(true))
      .finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.usuario || !form.password) {
      toast.error('Email y contraseña son obligatorios')
      return
    }
    setSaving(true)
    try {
      await api.post('/email-config', form)
      toast.success('Configuración guardada correctamente')
      const r = await api.get('/email-config')
      setConfig(r.data)
      setEditando(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      await api.post('/email-config/test')
      toast.success('✅ Conexión exitosa')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error de conexión')
    } finally {
      setTesting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Eliminar la configuración de correo?')) return
    try {
      await api.delete('/email-config')
      setConfig(null)
      setEditando(true)
      setForm({ provider:'imap', host:'imap.gmail.com', port:993, tls:true, usuario:'', password:'', carpeta:'INBOX' })
      toast.success('Configuración eliminada')
    } catch {
      toast.error('Error al eliminar')
    }
  }

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Syne', fontSize: 18, marginBottom: 6 }}>📬 Configuración de Correo</h2>
        <p style={{ fontSize: 13, color: 'var(--text2)' }}>
          Configura tu cuenta de correo una sola vez para poder importar facturas automáticamente desde el buzón.
        </p>
      </div>

      {config && !editando ? (
        // Vista — configuración guardada
        <div className="card">
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: 16,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, flexShrink: 0,
              background: 'rgba(63,185,80,.15)', border: '1px solid rgba(63,185,80,.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>✅</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Correo configurado</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                Contraseña almacenada de forma segura con cifrado AES-256
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Email',    value: config.usuario },
              { label: 'Servidor', value: `${config.host}:${config.port}` },
              { label: 'Provider', value: config.provider.toUpperCase() },
              { label: 'Carpeta',  value: config.carpeta },
            ].map(item => (
              <div key={item.label} style={{
                background: 'var(--bg3)', borderRadius: 8, padding: '10px 14px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4, textTransform: 'uppercase' }}>
                  {item.label}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={handleTest} disabled={testing}>
              {testing ? '⏳ Probando...' : '🔌 Probar conexión'}
            </button>
            <button className="btn btn-secondary" onClick={() => setEditando(true)}>
              ✏️ Editar
            </button>
            <button className="btn btn-secondary" style={{ color: 'var(--red)', marginLeft: 'auto' }}
              onClick={handleDelete}>
              🗑️ Eliminar
            </button>
          </div>
        </div>
      ) : (
        // Formulario de configuración
        <div className="card">
          {config && (
            <div style={{
              background: 'rgba(229,188,85,.08)', border: '1px solid rgba(229,188,85,.2)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12,
            }}>
              ✏️ Editando configuración — la contraseña actual se reemplazará al guardar.
            </div>
          )}

          <div className="form-grid-2">
            <div className="form-group">
              <label>Tipo de servidor</label>
              <select value={form.provider} onChange={e => {
                const p = PROVIDERS[e.target.value]
                setForm(f => ({ ...f, provider: e.target.value, host: p.host, port: p.port }))
              }}>
                {Object.entries(PROVIDERS).map(([k, v]) =>
                  <option key={k} value={k}>{v.label}</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label>Carpeta</label>
              <input value={form.carpeta} onChange={e => set('carpeta', e.target.value)} placeholder="INBOX" />
            </div>
            <div className="form-group">
              <label>Servidor IMAP</label>
              <input value={form.host} onChange={e => set('host', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Puerto</label>
              <input type="number" value={form.port} onChange={e => set('port', parseInt(e.target.value))} />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={form.usuario}
                onChange={e => set('usuario', e.target.value)}
                placeholder="tu@gmail.com" />
            </div>
            <div className="form-group">
              <label>Contraseña de aplicación *</label>
              <input type="password" value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder={config ? '(dejar vacío para mantener la actual)' : 'xxxx xxxx xxxx xxxx'}
                autoComplete="new-password" />
            </div>
          </div>

          {form.provider === 'imap' && (
            <div style={{
              background: 'rgba(88,166,255,.08)', border: '1px solid rgba(88,166,255,.2)',
              borderRadius: 8, padding: '10px 14px', fontSize: 12, margin: '8px 0 16px',
            }}>
              💡 <strong>Gmail:</strong> Necesitas una <strong>Contraseña de aplicación</strong> (no tu contraseña normal).
              Ve a <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer"
                style={{ color: 'var(--blue)' }}>myaccount.google.com/apppasswords</a>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            {config && (
              <button className="btn btn-secondary" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            )}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : '💾 Guardar configuración'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConfiguracionEmail
