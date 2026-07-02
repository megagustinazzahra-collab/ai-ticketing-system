import express from 'express'
import { exportPage, exportDownload } from '../../controllers/helpdesk/exportController.js'

const router = express.Router()

// GET /helpdesk/export — form filter
router.get('/', exportPage)

// GET /helpdesk/export/download — stream file .xlsx
router.get('/download', exportDownload)

export default router
