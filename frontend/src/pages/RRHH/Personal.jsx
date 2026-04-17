import { useState, useEffect } from 'react'
import { formatCurrency, formatDate } from '../../utils/formatters.js'
import api from '../../services/api.js'
import toast from 'react-hot-toast'

const ESTADOS = ['activo', 'baja', 'vacaciones']
const TIPOS_CONTRATO = ['indefinido', 'temporal', 'practicas']
const DEPARTAMENTOS = ['Cocina', 'Sala', 'Gestión', 'Limpieza', 'Reparto', 'Administración']
const LIMIT = 15

const ModalEmpleado = ({ empleado, franquicias, onClose, onSaved }) => {
  const isEdit = !!empleado?.id
  const [form, setForm] = useState({
    nombre:              empleado?.nombre              || '',
    dni:                 empleado?.dni                 || '',
    email:               empleado?.email               || '',
    telefono:            empleado?.telefono            || '',
    puesto:              empleado?.puesto              || '',
    departamento:        empleado?.departamento        || '',
    franquicia_id:       empleado?.franquicia_id       ? String(empleado.franquicia_id) : '',
    fecha_alta:          empleado?.fecha_alta          || '',
    salario_bruto_anual: empleado?.salario_bruto_anual || '',
    iban:                empleado?.iban                || '',
    num_ss:              empleado?.num_ss              || '',
    tipo_contrato:       empleado?.tipo_contrato       || 'indefinido',
    estado:              empleado?.estado              || 'activo',
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.nombre || !form.franquicia_id) {
      toast.error('Nombre y franquicia son obligatorios')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        await api.put(`/rrhh/empleados/${empleado.id}`, form)
        toast.success('Empleado actualizado')
      } else {
        await api.post('/rrhh/empleados', form)
        toast.success('Empleado creado')
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
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEdit ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid-2">
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>Nombre completo *</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ahmed Malik" />
            </div>
            <div className="form-group">
              <label>DNI / NIE</label>
              <input value={form.dni} onChange={e => set('dni', e.target.value)} placeholder="X1234567A" />
            </div>
            <div className="form-group">
              <label>Nº Seguridad Social</label>
              <input value={form.num_ss} onChange={e => set('num_ss', e.target.value)} placeholder="28/12345678/90" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="empleado@email.com" />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="611223344" />
            </div>
            <div className="form-group">
              <label>Franquicia *</label>
              <select value={form.franquicia_id} onChange={e => set('franquicia_id', e.target.value)}>
                <option value="">Seleccionar franquicia</option>
                {franquicias.map(f => <option key={f.id} value={String(f.id)}>{f.nombre}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Departamento</label>
              <select value={form.departamento} onChange={e => set('departamento', e.target.value)}>
                <option value="">Seleccionar</option>
                {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Puesto</label>
              <input value={form.puesto} onChange={e => set('puesto', e.target.value)} placeholder="Encargado / Cocinero..." />
            </div>
            <div className="form-group">
              <label>Tipo contrato</label>
              <select value={form.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)}>
                {TIPOS_CONTRATO.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select value={form.estado} onChange={e => set('estado', e.target.value)}>
                {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Fecha de alta</label>
              <input type="date" value={form.fecha_alta} onChange={e => set('fecha_alta', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Salario bruto anual (€)</label>
              <input type="number" value={form.salario_bruto_anual} onChange={e => set('salario_bruto_anual', e.target.value)} placeholder="18000" />
            </div>
            <div className="form-group" style={{ gridColumn: '1/-1' }}>
              <label>IBAN</label>
              <input value={form.iban} onChange={e => set('iban', e.target.value)} placeholder="ES12 1234 5678 9012 3456 7890" />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear empleado'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ESTADO_STYLE = {
  activo:      'status--green',
  baja:        'status--red',
  vacaciones:  'status--blue',
}

const Personal = () => {
  const [tab, setTab]             = useState('empleados')
  const [empleados, setEmpleados] = useState([])
  const [franquicias, setFranquicias] = useState([])
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [filters, setFilters]     = useState({ search: '', franquicia_id: '', estado: '' })
  const [page, setPage]           = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.search)        params.search        = filters.search
      if (filters.franquicia_id) params.franquicia_id = filters.franquicia_id
      if (filters.estado)        params.estado        = filters.estado

      const [eData, fData, sData] = await Promise.all([
        api.get('/rrhh/empleados', { params }).then(r => r.data),
        api.get('/franquicias').then(r => r.data),
        api.get('/rrhh/stats').then(r => r.data),
      ])
      setEmpleados(eData)
      setFranquicias(fData)
      setStats(sData)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { setPage(1); load() }, [filters])

  const handleBaja = async (id, nombre) => {
    if (!confirm(`¿Dar de baja a "${nombre}"?`)) return
    try {
      await api.delete(`/rrhh/empleados/${id}`)
      toast.success('Empleado dado de baja')
      load()
    } catch {
      toast.error('Error al dar de baja')
    }
  }

  const initials    = (nombre) => nombre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const avatarColors = ['#E5BC55', '#58a6ff', '#3fb950', '#bc8cff', '#e3762a', '#f85149']
  const avatarColor  = (id) => avatarColors[id % avatarColors.length]

  const totalPages   = Math.ceil(empleados.length / LIMIT)
  const empPagina    = empleados.slice((page - 1) * LIMIT, page * LIMIT)

  return (
    <div className="page-content">
      {stats && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 20 }}>
          {[
            { label: 'Total empleados',   value: stats.total,     icon: '👥', color: 'blue'  },
            { label: 'Activos',           value: stats.activos,   icon: '✅', color: 'green' },
            { label: 'Masa salarial/mes', value: formatCurrency(stats.masa_salarial_mensual), icon: '💰', color: 'gold' },
            { label: 'Bajas',             value: stats.bajas,     icon: '⚠️', color: 'red'   },
          ].map(s => (
            <div key={s.label} className={`stat-card stat-card--${s.color}`}>
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'empleados', label: '👥 Empleados' },
          { key: 'nominas',   label: '💰 Nóminas' },
          { key: 'cvs',       label: '🤖 Análisis CVs IA' },
        ].map(t => (
          <button key={t.key}
            className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'empleados' && (
        <>
          <div className="filter-row">
            <div className="search-box">
              <span>🔍</span>
              <input placeholder="Buscar empleado..."
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <select className="input-select" value={filters.franquicia_id}
              onChange={e => setFilters(f => ({ ...f, franquicia_id: e.target.value }))}>
              <option value="">Todas las franquicias</option>
              {franquicias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
            <select className="input-select" value={filters.estado}
              onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}>
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => setModal('new')}>+ Nuevo Empleado</button>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">👥 Empleados ({empleados.length})</span>
            </div>
            {loading ? <div className="loading">Cargando...</div> : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th><th>DNI</th><th>Puesto</th>
                      <th>Franquicia</th><th>F. Alta</th>
                      <th>Salario bruto</th><th>Estado</th><th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {empleados.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>
                        No hay empleados. <button className="link-sm" onClick={() => setModal('new')}>Añadir el primero →</button>
                      </td></tr>
                    ) : empPagina.map(emp => (
                      <tr key={emp.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: '50%',
                              background: avatarColor(emp.id),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 700, color: '#000', flexShrink: 0
                            }}>{initials(emp.nombre)}</div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{emp.nombre}</div>
                              {emp.email && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{emp.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{emp.dni || '—'}</td>
                        <td>
                          <div>{emp.puesto || '—'}</div>
                          {emp.departamento && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{emp.departamento}</div>}
                        </td>
                        <td>{emp.franquicia?.nombre || '—'}</td>
                        <td>{emp.fecha_alta ? formatDate(emp.fecha_alta) : '—'}</td>
                        <td className="amount-gold">
                          {emp.salario_bruto_anual ? formatCurrency(parseFloat(emp.salario_bruto_anual)) + '/año' : '—'}
                        </td>
                        <td>
                          <span className={`status ${ESTADO_STYLE[emp.estado] || 'status--blue'}`}>
                            {emp.estado}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setModal(emp)}>✏️</button>
                            <button className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--red)' }}
                              onClick={() => handleBaja(emp.id, emp.nombre)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div style={{ display:'flex', justifyContent:'center', gap:6, padding:'16px 0', borderTop:'1px solid var(--border)' }}>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => setPage(p => Math.max(1, p-1))}
                  disabled={page === 1}>← Anterior</button>
                <span style={{ padding:'5px 12px', fontSize:13, color:'var(--text2)' }}>
                  {page} / {totalPages} · {empleados.length} empleados
                </span>
                <button className="btn btn-secondary btn-sm"
                  onClick={() => setPage(p => Math.min(totalPages, p+1))}
                  disabled={page === totalPages}>Siguiente →</button>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'nominas' && <NominasTab franquicias={franquicias} />}
      {tab === 'cvs'     && <CVsTab franquicias={franquicias} />}

      {modal && (
        <ModalEmpleado
          empleado={modal === 'new' ? null : modal}
          franquicias={franquicias}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}

const NominasTab = ({ franquicias }) => {
  const now = new Date()
  const [periodo, setPeriodo]         = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [franquicia_id, setFranquiciaId] = useState('')
  const [nominas, setNominas]         = useState([])
  const [loading, setLoading]         = useState(false)
  const [generating, setGenerating]   = useState(false)
  const [page, setPage]               = useState(1)

  const loadNominas = async () => {
    setLoading(true)
    try {
      const params = {}
      if (periodo) params.periodo = periodo
      const data = await api.get('/rrhh/nominas', { params }).then(r => r.data)
      setNominas(data)
      setPage(1)
    } catch {
      toast.error('Error al cargar nóminas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadNominas() }, [periodo])

  const generar = async () => {
    if (!confirm(`¿Generar nóminas para ${periodo}?`)) return
    setGenerating(true)
    try {
      const res = await api.post('/rrhh/nominas/generar', { periodo, franquicia_id: franquicia_id || undefined })
      toast.success(res.data.message)
      loadNominas()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al generar')
    } finally {
      setGenerating(false)
    }
  }

  const totalBruto = nominas.reduce((s, n) => s + parseFloat(n.salario_bruto || 0), 0)
  const totalNeto  = nominas.reduce((s, n) => s + parseFloat(n.salario_neto  || 0), 0)
  const totalDed   = nominas.reduce((s, n) => s + parseFloat(n.deducciones   || 0), 0)

  const totalPages  = Math.ceil(nominas.length / LIMIT)
  const nomPagina   = nominas.slice((page - 1) * LIMIT, page * LIMIT)

  return (
    <div>
      <div className="filter-row">
        <input type="month" className="input-select" value={periodo}
          onChange={e => setPeriodo(e.target.value)} />
        <select className="input-select" value={franquicia_id}
          onChange={e => setFranquiciaId(e.target.value)}>
          <option value="">Todas las franquicias</option>
          {franquicias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
        <button className="btn btn-primary" onClick={generar} disabled={generating}>
          {generating ? '⏳ Generando...' : `⚡ Generar nóminas (${periodo})`}
        </button>
      </div>

      {nominas.length > 0 && (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
          <div className="stat-card stat-card--blue">
            <div className="stat-label">Total bruto</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totalBruto)}</div>
          </div>
          <div className="stat-card stat-card--red">
            <div className="stat-label">Total deducciones</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totalDed)}</div>
          </div>
          <div className="stat-card stat-card--green">
            <div className="stat-label">Total neto a pagar</div>
            <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totalNeto)}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">💰 Nóminas — {periodo}</span>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{nominas.length} empleados</span>
        </div>
        {loading ? <div className="loading">Cargando...</div> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Empleado</th><th>Franquicia</th><th>Bruto</th><th>Deducciones</th><th>Neto</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {nominas.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text3)', padding: 40 }}>
                    No hay nóminas para este periodo. Pulsa "Generar nóminas" para crearlas.
                  </td></tr>
                ) : nomPagina.map(n => (
                  <tr key={n.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{n.empleado?.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{n.empleado?.puesto}</div>
                    </td>
                    <td>{n.empleado?.franquicia?.nombre || '—'}</td>
                    <td>{formatCurrency(parseFloat(n.salario_bruto || 0))}</td>
                    <td style={{ color: 'var(--red)' }}>−{formatCurrency(parseFloat(n.deducciones || 0))}</td>
                    <td className="amount-gold">{formatCurrency(parseFloat(n.salario_neto || 0))}</td>
                    <td>
                      <span className={`status ${n.estado === 'pagada' ? 'status--green' : n.estado === 'procesada' ? 'status--orange' : 'status--red'}`}>
                        {n.estado}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm"
                        onClick={async () => {
                          await api.put(`/rrhh/nominas/${n.id}`, { estado: 'pagada' })
                          toast.success('Marcada como pagada')
                          loadNominas()
                        }}
                        disabled={n.estado === 'pagada'}>
                        ✅ Pagar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:6, padding:'16px 0', borderTop:'1px solid var(--border)' }}>
            <button className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.max(1, p-1))}
              disabled={page === 1}>← Anterior</button>
            <span style={{ padding:'5px 12px', fontSize:13, color:'var(--text2)' }}>
              {page} / {totalPages} · {nominas.length} nóminas
            </span>
            <button className="btn btn-secondary btn-sm"
              onClick={() => setPage(p => Math.min(totalPages, p+1))}
              disabled={page === totalPages}>Siguiente →</button>
          </div>
        )}
      </div>
    </div>
  )
}

const CVsTab = ({ franquicias }) => {
  const [file, setFile]           = useState(null)
  const [puesto, setPuesto]       = useState('Encargado de local')
  const [analyzing, setAnalyzing] = useState(false)
  const [results, setResults]     = useState([])

  const analyze = async () => {
    if (!file) { toast.error('Selecciona un CV en PDF'); return }
    setAnalyzing(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('puesto', puesto)
      const res = await api.post('/rrhh/analizar-cv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResults(prev => [{ ...res.data.data, fileName: file.name, ts: new Date() }, ...prev])
      setFile(null)
      toast.success('CV analizado correctamente')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error al analizar CV')
    } finally {
      setAnalyzing(false)
    }
  }

  const scoreColor = (s) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--orange)' : 'var(--red)'
  const recLabel   = {
    contratar: { label: '⭐ Contratar', cls: 'status--green' },
    revisar:   { label: '🔍 Revisar',   cls: 'status--orange' },
    descartar: { label: '❌ Descartar', cls: 'status--red' }
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 16 }}>🤖 Análisis de CVs con Inteligencia Artificial</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div className="form-group">
              <label>Puesto a cubrir</label>
              <input value={puesto} onChange={e => setPuesto(e.target.value)} placeholder="Ej: Encargado, Cocinero..." />
            </div>
            <div
              className="drop-zone"
              onClick={() => document.getElementById('cv-input').click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]) }}
            >
              {file ? (
                <div>
                  <div style={{ fontSize: 24 }}>📄</div>
                  <div style={{ fontWeight: 600, marginTop: 8 }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{(file.size / 1024).toFixed(0)} KB</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 32 }}>📄</div>
                  <div style={{ marginTop: 8 }}>Arrastra el CV aquí o haz clic</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Solo PDF</div>
                </div>
              )}
            </div>
            <input id="cv-input" type="file" accept=".pdf" style={{ display: 'none' }}
              onChange={e => setFile(e.target.files[0])} />
            <button className="btn btn-primary w-full" style={{ marginTop: 12 }}
              onClick={analyze} disabled={analyzing || !file}>
              {analyzing ? '⏳ Analizando con Claude IA...' : '🤖 Analizar CV'}
            </button>
          </div>
          <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, marginBottom: 12 }}>¿Qué analiza la IA?</div>
            {[
              '📋 Extrae datos personales automáticamente',
              '⭐ Puntúa adecuación al puesto (0-100)',
              '🌍 Evalúa idiomas y certificaciones',
              '💼 Analiza años de experiencia en hostelería',
              '💡 Genera resumen y recomendación de contratación',
            ].map(t => <div key={t} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>{t}</div>)}
          </div>
        </div>
      </div>

      {results.map((r, i) => (
        <div key={i} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg,var(--purple),var(--blue))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: '#000', flexShrink: 0
            }}>
              {r.nombre ? r.nombre.split(' ').map(w => w[0]).slice(0,2).join('') : '?'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{r.nombre || r.fileName}</div>
                <span className={`status ${recLabel[r.recomendacion]?.cls || 'status--blue'}`}>
                  {recLabel[r.recomendacion]?.label || r.recomendacion}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                {r.email} {r.telefono && `· ${r.telefono}`} · {r.experiencia_años || 0} años exp.
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor(r.puntuacion_total), fontFamily: 'Syne' }}>
                {r.puntuacion_total}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)' }}>PUNTUACIÓN</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'Adecuación',  val: r.puntuacion_adecuacion },
              { label: 'Experiencia', val: r.puntuacion_experiencia },
              { label: 'Idiomas',     val: r.puntuacion_idiomas },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: 6, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{s.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 4, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${s.val}%`, height: '100%', background: 'linear-gradient(90deg,var(--gold),var(--green))', borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(s.val), minWidth: 30 }}>{s.val}%</span>
                </div>
              </div>
            ))}
          </div>

          {r.resumen_ia && (
            <div style={{ background: 'var(--bg4)', borderRadius: 6, padding: 12, borderLeft: '3px solid var(--gold)', fontSize: 13, color: 'var(--text2)' }}>
              💬 <strong>IA:</strong> {r.resumen_ia}
            </div>
          )}

          {(r.idiomas?.length > 0 || r.certificaciones?.length > 0) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              {r.idiomas?.map(l => <span key={l} className="status status--blue" style={{ fontSize: 11 }}>🌍 {l}</span>)}
              {r.certificaciones?.map(c => <span key={c} className="status status--green" style={{ fontSize: 11 }}>✅ {c}</span>)}
            </div>
          )}
        </div>
      ))}

      {results.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 40, fontSize: 14 }}>
          Sube un CV en PDF para analizarlo con IA
        </div>
      )}
    </div>
  )
}

export default Personal