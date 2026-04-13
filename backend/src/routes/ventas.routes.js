const router = require('express').Router()
const auth   = require('../middleware/auth.middleware.js')
const role   = require('../middleware/role.middleware.js')
const tenant = require('../middleware/tenant.middleware.js')
const ctrl   = require('../controllers/ventas.controller.js')

router.use(auth, tenant)

router.get('/dashboard-stats',      ctrl.getDashboardStats)
router.get('/por-dia',              ctrl.getVentasPorDia)
router.get('/por-franquicia',       ctrl.getVentasPorFranquicia)
router.get('/',                     ctrl.getAll)
router.post('/',                    role('franquiciado'), ctrl.create)
router.put('/:id',                  role('franquiciado'), ctrl.update)
router.delete('/:id',               role('empresa'), ctrl.remove)

module.exports = router
