require('dotenv').config({ path: './.env' })
const { VentaTPV, Franquicia, sequelize } = require('./src/models/index.js')

async function seed() {
  await sequelize.authenticate()
  const franquicias = await Franquicia.findAll({ where: { activo: true } })
  if (!franquicias.length) { console.log('❌ No hay franquicias'); process.exit(1) }

  const rnd = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100

  const ventas = []
  const hoy = new Date()

  // Generate 60 days of data for each franchise
  for (let d = 60; d >= 0; d--) {
    const fecha = new Date(hoy)
    fecha.setDate(fecha.getDate() - d)
    const fechaStr = fecha.toISOString().split('T')[0]
    const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6

    for (const f of franquicias) {
      const baseVenta  = esFinde ? rnd(800, 1800) : rnd(400, 1200)
      const tickets    = Math.round(rnd(20, 80))
      const efectivoPct = rnd(0.2, 0.45)
      const efectivo   = Math.round(baseVenta * efectivoPct * 100) / 100
      const tarjeta    = Math.round((baseVenta - efectivo) * 100) / 100

      ventas.push({
        franquicia_id: f.id,
        fecha: fechaStr,
        total: baseVenta,
        num_tickets: tickets,
        efectivo,
        tarjeta,
        hora_inicio: '11:00',
        hora_fin:    '23:30',
      })
    }
  }

  // Insert in batches
  const batch = 50
  for (let i = 0; i < ventas.length; i += batch) {
    await VentaTPV.bulkCreate(ventas.slice(i, i + batch), { ignoreDuplicates: true })
    process.stdout.write(`\r📊 Insertando... ${Math.min(i + batch, ventas.length)}/${ventas.length}`)
  }

  console.log(`\n✅ ${ventas.length} registros de ventas creados (60 días × ${franquicias.length} franquicias)`)
  process.exit(0)
}

seed().catch(e => { console.error(e.message); process.exit(1) })
