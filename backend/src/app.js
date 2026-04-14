const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const express  = require('express')
const cors     = require('cors')
const helmet   = require('helmet')
const morgan   = require('morgan')
const cron     = require('node-cron')
const sequelize = require('./config/database.js')

const logMiddleware = require('./middleware/log.middleware.js')
const app = express()

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(logMiddleware)

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth.routes.js'))
app.use('/api/franquicias', require('./routes/franquicias.routes.js'))
app.use('/api/ventas',      require('./routes/ventas.routes.js'))
app.use('/api/delivery',    require('./routes/delivery.routes.js'))
app.use('/api/rrhh',        require('./routes/rrhh.routes.js'))
app.use('/api/facturacion', require('./routes/facturacion.routes.js'))
app.use('/api/informes',    require('./routes/informes.routes.js'))
app.use('/api/logs',        require('./routes/logs.routes.js'))
app.use('/api/ia',          require('./routes/ia.routes.js'))

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({
  status: 'ok', version: '1.0.0', time: new Date().toISOString()
}))

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ message: err.message || 'Error interno del servidor' })
})

// ── Cron jobs ─────────────────────────────────────────────────────────────────
// Sync delivery platforms daily at 06:00 Madrid time
cron.schedule('0 6 * * *', () => {
  require('./jobs/syncDelivery.job.js').run()
}, { timezone: 'Europe/Madrid' })

// Daily report at 08:00 Madrid time
cron.schedule('0 8 * * *', () => {
  require('./jobs/informeDiario.job.js').run()
}, { timezone: 'Europe/Madrid' })

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001

sequelize.authenticate()
  .then(() => {
    console.log('✅ PostgreSQL connected')
    app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`))
  })
  .catch(err => {
    console.error('❌ DB connection failed:', err.message)
    process.exit(1)
  })

module.exports = app
