const router  = require('express').Router()
const auth    = require('../middleware/auth.middleware.js')
const role    = require('../middleware/role.middleware.js')
const tenant  = require('../middleware/tenant.middleware.js')
const ctrl    = require('../controllers/informes.controller.js')

router.use(auth, tenant)

// TODO: define specific routes for informes module
router.get('/',    ctrl.getAll)
router.get('/:id', ctrl.getById)
router.post('/',   ctrl.create)
router.put('/:id', ctrl.update)
router.delete('/:id', role('empresa'), ctrl.remove)

module.exports = router
