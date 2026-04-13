// Runs daily at 06:00 Madrid time via cron in app.js
const run = async () => {
  console.log('[syncDelivery] Starting delivery sync...')
  // TODO: call glovo/ubereats/justeat services and upsert VentaDelivery records
  console.log('[syncDelivery] Done')
}
module.exports = { run }
