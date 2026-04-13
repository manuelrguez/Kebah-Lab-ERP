require('dotenv').config({ path: './.env' })
const { VentaDelivery, Franquicia, sequelize } = require('./src/models/index.js')

async function seed() {
  await sequelize.authenticate()
  const franquicias = await Franquicia.findAll({ where: { activo: true } })
  if (!franquicias.length) { console.log('❌ No hay franquicias activas'); process.exit(1) }

  const plataformas = [
    { key: 'glovo',    comision: 25 },
    { key: 'ubereats', comision: 30 },
    { key: 'justeat',  comision: 22 },
  ]
  const rnd = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100
  const hoy = new Date()
  const registros = []

  for (let d = 60; d >= 0; d--) {
    const fecha = new Date(hoy)
    fecha.setDate(fecha.getDate() - d)
    const fechaStr  = fecha.toISOString().split('T')[0]
    const esFinde   = fecha.getDay() === 0 || fecha.getDay() === 6

    for (const f of franquicias) {
      for (const p of plataformas) {
        const base    = esFinde ? rnd(300, 900) : rnd(150, 600)
        const pedidos = Math.round(rnd(10, 70))
        registros.push({
          franquicia_id: f.id,
          plataforma:    p.key,
          fecha:         fechaStr,
          total:         base,
          num_pedidos:   pedidos,
          comision_pct:  p.comision,
        })
      }
    }
  }

  const batch = 100
  for (let i = 0; i < registros.length; i += batch) {
    await VentaDelivery.bulkCreate(registros.slice(i, i + batch), { ignoreDuplicates: true })
    process.stdout.write(`\r🛵 Insertando... ${Math.min(i + batch, registros.length)}/${registros.length}`)
  }

  console.log(`\n✅ ${registros.length} registros delivery creados (60 días × ${franquicias.length} franquicias × 3 plataformas)`)
  process.exit(0)
}
seed().catch(e => { console.error(e.message); process.exit(1) })
