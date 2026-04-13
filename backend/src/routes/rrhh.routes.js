const router  = require('express').Router()
const auth    = require('../middleware/auth.middleware.js')
const role    = require('../middleware/role.middleware.js')
const tenant  = require('../middleware/tenant.middleware.js')
const upload  = require('../middleware/upload.middleware.js')
const ctrl    = require('../controllers/rrhh.controller.js')
const iaCtrl  = require('../controllers/ia.controller.js')

router.use(auth, tenant)

// Stats
router.get('/stats', ctrl.getStats)

// Empleados
router.get('/empleados',          ctrl.getEmpleados)
router.get('/empleados/:id',      ctrl.getEmpleadoById)
router.post('/empleados',         role('empresa'), ctrl.createEmpleado)
router.put('/empleados/:id',      role('empresa'), ctrl.updateEmpleado)
router.delete('/empleados/:id',   role('empresa'), ctrl.deleteEmpleado)

// Nóminas
router.get('/nominas',            ctrl.getNominas)
router.post('/nominas/generar',   role('empresa'), ctrl.generarNominas)
router.put('/nominas/:id',        role('empresa'), ctrl.updateNomina)

// Análisis CV con IA
router.post('/analizar-cv', upload.single('file'), iaCtrl.analizarCV)

module.exports = router
