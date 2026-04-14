const router = require('express').Router()
const auth   = require('../middleware/auth.middleware.js')
const role   = require('../middleware/role.middleware.js')
const ctrl   = require('../controllers/logs.controller.js')

router.use(auth, role('central')) // solo admins

router.get('/stats', ctrl.getStats)
router.get('/',      ctrl.getLogs)

module.exports = router
