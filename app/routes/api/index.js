import express from 'express'
import { isAuthenticated } from '../../middlewares/authMiddleware.js'
import notificationRouter from './notificationRouter.js'

const router = express.Router()

// Semua API /api/v1/* wajib autentikasi session
router.use(isAuthenticated)

router.use('/notifications', notificationRouter)

export default router
