import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth.js'

const Login = () => {
  const { login, loading, error } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    login(form)
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">
          <img src="/logo-kebablab.png" alt="Kebah Lab"
            style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', margin: '0 auto', display: 'block' }} />
          <h1>Kebah Lab ERP</h1>
          <p>Gestión inteligente de franquicias</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="tu@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div className="error-msg">{error}</div>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>
        <div className="login-footer">Kebab Lab ERP v1.0 · © 2026</div>
      </div>
    </div>
  )
}

export default Login
