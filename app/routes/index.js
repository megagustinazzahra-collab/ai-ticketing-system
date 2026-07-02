import express from 'express'
import { isAuthenticated } from '../middlewares/authMiddleware.js'
import authRouter from './web/authRouter.js'
import ticketRouter from './web/ticketRouter.js'
import notificationRouter from './web/notificationRouter.js'
import helpdeskRouter from './helpdesk/index.js'
import apiRouter from './api/index.js'

const router = express.Router()

// Root redirect
router.get('/', (req, res) => {
  if (req.session?.user) {
    return res.redirect(req.session.user.role_id === 2 ? '/helpdesk/tickets' : '/tickets')
  }
  return res.redirect('/login')
})

// ── Auth routes (Modul 3) ──
router.use('/', authRouter)

// ── Reporter routes (Modul 4) ──
router.use('/tickets', isAuthenticated, ticketRouter)

// ── Helpdesk routes (Modul 5) ──
router.use('/helpdesk', helpdeskRouter)

// ── Notification routes (Modul 7) ──
router.use('/notifications', isAuthenticated, notificationRouter)

// ── API routes (Modul 7) ──
router.use('/api/v1', apiRouter)

export default router
