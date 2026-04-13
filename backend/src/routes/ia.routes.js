const router = require('express').Router()
const auth   = require('../middleware/auth.middleware.js')
const tenant = require('../middleware/tenant.middleware.js')
const upload = require('../middleware/upload.middleware.js')
const ctrl   = require('../controllers/ia.controller.js')

router.use(auth, tenant)

router.post('/chat',         ctrl.chat)
router.post('/ocr',          upload.single('file'), ctrl.ocr)
router.post('/analizar-cv',  upload.single('file'), ctrl.analizarCV)
router.post('/informe',      ctrl.generarInforme)

module.exports = router
