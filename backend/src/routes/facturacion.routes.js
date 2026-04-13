const router = require('express').Router()
const auth   = require('../middleware/auth.middleware.js')
const role   = require('../middleware/role.middleware.js')
const tenant = require('../middleware/tenant.middleware.js')
const upload = require('../middleware/upload.middleware.js')
const ctrl   = require('../controllers/facturacion.controller.js')

router.use(auth, tenant)

router.get('/stats',          ctrl.getStats)
router.get('/',               ctrl.getAll)
router.get('/:id',            ctrl.getById)
router.post('/',              role('central'), ctrl.create)
router.put('/:id',            role('central'), ctrl.update)
router.delete('/:id',         role('central'), ctrl.remove)
router.post('/export/zip',    role('central'), ctrl.exportZip)
router.post('/ocr',           role('central'), upload.single('file'), ctrl.importOCR)

module.exports = router
