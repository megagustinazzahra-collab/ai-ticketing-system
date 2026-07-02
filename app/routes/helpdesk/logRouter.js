import express from 'express'
import { listPage } from '../../controllers/helpdesk/logController.js'

const router = express.Router()

router.get('/', listPage)

export default router
