const router = require('express').Router()
const ctrl   = require('../controllers/auth.controller.js')
const auth   = require('../middleware/auth.middleware.js')

router.post('/login',  ctrl.login)
router.post('/logout', auth, ctrl.logout)
router.get('/me',      auth, ctrl.me)

module.exports = router
