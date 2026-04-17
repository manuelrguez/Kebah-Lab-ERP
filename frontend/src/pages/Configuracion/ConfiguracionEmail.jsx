import { useState, useEffect } from 'react'
import api from '../../services/api.js'
import toast from 'react-hot-toast'

const PROVIDERS = {
  imap:    { label: 'IMAP genérico (Gmail, Yahoo, etc.)', host: 'imap.gmail.com',          port: 993 },
  outlook: { label: 'Outlook / Microsoft 365',           host: 'outlook.office365.com',    port: 993 },
}

const FORM_VACIO = {
  nombre:   '',
  provider: 'imap',
  host:     'imap.gmail.com',
  port:     993,
  tls:      true,
  usuario:  '',
  password: '',
  carpeta:  'INBOX',
}

const ConfiguracionEmail = () => {
  const [configs, setConfigs]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [testing, setTesting]     = useState(null) // id que se está probando
  const [editando, setEditando]   = useState(null) // null | 'new' | config obj
  const [form, setForm]           = useState(FORM_VACIO)

  const load = () => {
    api.get('/email-config')
      .then(r => setConfigs(Array.isArray(r.data) ? r.data : (r.data ? [r.data] : [])))
      .catch(() => setConfigs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const abrirNuevo = () => {
    setForm(FORM_VACIO)
    setEditando('new')
  }

  const abrirEditar = (config) => {
    setForm({
      nombre:   config.nombre,
      provider: config.provider,
      host:     config.host,
      port:     config.port,
      tls:      config.tls,
      usuario:  config.usuario,
      password: '', // no mostrar password cifrada
      carpeta:  config.carpeta,
    })
    setEditando(config)
  }

  const handleSave = async () => {
    if (!form.usuario) { toast.error('El email es obligatorio'); return }
    if (editando === 'new' && !form.password) { toast.error('La contraseña es obligatoria'); return }
    if (!form.nombre) { toast.error('El nombre identificativo es obligatorio'); return }

    setSaving(true)
    try {
      if (editando === 'new') {
        await api.post('/email-config', form)
        toast.success('Cuenta añadida correctamente')
      } else {
        await api.put(`/email-config/${editando.id}`, form)
        toast.success('Cuenta actualizada correctamente')
      }
      setEditando(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (id) => {
    setTesting(id)
    try {
      await api.post(`/email-config/${id}/test`)
      toast.success('✅ Conexión exitosa')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error de conexión')
    } finally {
      setTesting(null)
    }
  }

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar la cuenta "${nombre}"?`)) return
    try {
      await api.delete(`/email-config/${id}`)
      toast.success('Cuenta eliminada')
      load()
    } catch { toast.error('Error al eliminar') }
  }

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Syne', fontSize: 18, marginBottom: 6 }}>📬 Configuración de Correo</h2>
        <p style={{ fontSize: 13, color: 'var(--text2)' }}>
          Añade una o varias cuentas de correo para importar facturas automáticamente desde el buzón.
        </p>
      </div>

      {/* Lista de cuentas configuradas */}
      {configs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {configs.map(c => (
            <div key={c.id} className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: c.activo ? 'rgba(63,185,80,.15)' : 'rgba(248,81,73,.1)',
                  border: `1px solid ${c.activo ? 'rgba(63,185,80,.3)' : 'rgba(248,81,73,.3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>{c.activo ? '✅' : '⏸️'}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {c.usuario} · {c.host} · {c.provider.toUpperCase()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => handleTest(c.id)}
                    disabled={testing === c.id}>
                    {testing === c.id ? '⏳' : '🔌'} Probar
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => abrirEditar(c)}>
                    ✏️
                  </button>
                  <button className="btn btn-secondary btn-sm"
                    style={{ color: 'var(--red)' }}
                    onClick={() => handleDelete(c.id, c.nombre)}>
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón añadir */}
      {!editando && (
        <button className="btn btn-primary" onClick={abrirNuevo}>
          + Añadir cuenta de correo
        </button>
      )}

      {/* Formulario nueva/editar */}
      {editando && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <span className="card-title">
              {editando === 'new' ? '➕ Nueva cuenta de correo' : `✏️ Editar — ${editando.nombre}`}
            </span>
          </div>

          <div className="form-grid-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Nombre identificativo *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                placeholder="Ej: Gmail principal, Facturación, etc." />
            </div>
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
              <label>Contraseña de aplicación {editando !== 'new' && '(dejar vacío para mantener)'}</label>
              <input type="password" value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
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
            <button className="btn btn-secondary" onClick={() => setEditando(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : '💾 Guardar'}
            </button>
          </div>
        </div>
      )}

      {configs.length === 0 && !editando && (
        <div style={{
          background: 'rgba(248,81,73,.08)', border: '1px solid rgba(248,81,73,.3)',
          borderRadius: 10, padding: '20px 24px', marginTop: 16,
          fontSize: 13, color: 'var(--text2)',
        }}>
          ⚠️ No hay ninguna cuenta configurada. Pulsa "Añadir cuenta de correo" para comenzar.
        </div>
      )}
    </div>
  )
}

export default ConfiguracionEmail
