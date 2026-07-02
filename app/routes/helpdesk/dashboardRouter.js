import express from 'express'
import { dashboardPage } from '../../controllers/helpdesk/dashboardController.js'

const router = express.Router()

router.get('/', dashboardPage)

export default router
