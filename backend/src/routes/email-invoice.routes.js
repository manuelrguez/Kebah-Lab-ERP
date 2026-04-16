const router = require('express').Router()
const auth   = require('../middleware/auth.middleware.js')
const role   = require('../middleware/role.middleware.js')
const tenant = require('../middleware/tenant.middleware.js')
const ctrl   = require('../controllers/email-invoice.controller.js')

router.use(auth, tenant, role('empresa'))

router.get('/configs',                ctrl.getConfigs)
router.post('/config',                ctrl.saveConfig)
router.delete('/config/:configId',    ctrl.deleteConfig)
router.post('/sync/:configId',        ctrl.syncManual)
router.post('/sync-directo',          ctrl.syncDirecto)
//router.get('/test', ctrl.test)

module.exports = router
