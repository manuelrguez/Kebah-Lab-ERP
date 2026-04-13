// Runs daily at 08:00 Madrid time via cron in app.js
const run = async () => {
  console.log('[informeDiario] Generating daily report...')
  // TODO: aggregate yesterday's data and trigger AI report via claude.service
  console.log('[informeDiario] Done')
}
module.exports = { run }
