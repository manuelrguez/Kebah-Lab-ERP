const router  = require('express').Router()
const auth    = require('../middleware/auth.middleware.js')
const role    = require('../middleware/role.middleware.js')
const tenant  = require('../middleware/tenant.middleware.js')
const ctrl    = require('../controllers/franquicias.controller.js')

router.use(auth, tenant)

// Meta endpoints (for selects/filters)
router.get('/meta/comunidades', ctrl.getComunidades)
router.get('/meta/empresas',    ctrl.getEmpresas)

// Stats
router.get('/:id/stats', ctrl.getStats)

// CRUD
router.get('/',    ctrl.getAll)
router.get('/:id', ctrl.getById)
router.post('/',   role('empresa'), ctrl.create)
router.put('/:id', role('empresa'), ctrl.update)
router.delete('/:id', role('central'), ctrl.remove)

module.exports = router
