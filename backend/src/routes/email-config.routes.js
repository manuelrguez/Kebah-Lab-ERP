const router = require('express').Router()
const auth   = require('../middleware/auth.middleware.js')
const role   = require('../middleware/role.middleware.js')
const tenant = require('../middleware/tenant.middleware.js')
const ctrl   = require('../controllers/email-config.controller.js')

router.use(auth, tenant, role('empresa'))

router.get('/',          ctrl.getConfig)
router.post('/',         ctrl.saveConfig)
router.delete('/',       ctrl.deleteConfig)
router.post('/test',     ctrl.testConexion)

module.exports = router
