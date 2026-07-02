import express from 'express'
import { isAuthenticated, hasRole } from '../../middlewares/authMiddleware.js'
import { USER_ROLE } from '../../helpers/constants.js'
import dashboardRouter from './dashboardRouter.js'
import ticketRouter from './ticketRouter.js'
import exportRouter from './exportRouter.js'
import logRouter from './logRouter.js'

const router = express.Router()

// Semua route /helpdesk/* wajib autentikasi + role helpdesk
router.use(isAuthenticated)
router.use(hasRole([USER_ROLE.HELPDESK]))

router.use('/dashboard', dashboardRouter)
router.use('/tickets', ticketRouter)
router.use('/export', exportRouter)
router.use('/logs', logRouter)

// Redirect /helpdesk → /helpdesk/dashboard
router.get('/', (req, res) => res.redirect('/helpdesk/dashboard'))

export default router
