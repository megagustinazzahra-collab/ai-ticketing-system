import express from 'express'
import { listPage } from '../../controllers/web/notificationController.js'

const router = express.Router()

router.get('/', listPage)

export default router
