const router = require('express').Router()
const auth   = require('../middleware/auth.middleware.js')
const role   = require('../middleware/role.middleware.js')
const tenant = require('../middleware/tenant.middleware.js')
const ctrl   = require('../controllers/delivery.controller.js')

router.use(auth, tenant)

router.get('/resumen',           ctrl.getResumen)
router.get('/por-dia',           ctrl.getPedidosPorDia)
router.get('/pedidos',           ctrl.getPedidos)
router.get('/status',            ctrl.getStatus)
router.post('/sync/all',         role('empresa'), ctrl.syncAll)
router.post('/sync/:plataforma', role('empresa'), ctrl.syncPlataforma)
router.post('/',                 role('franquiciado'), ctrl.create)
router.put('/:id',               role('franquiciado'), ctrl.update)
router.delete('/:id',            role('empresa'), ctrl.remove)

module.exports = router
