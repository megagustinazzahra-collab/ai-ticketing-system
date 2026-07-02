import express from 'express'
import { xss } from 'express-xss-sanitizer'
import { doubleCsrfProtection } from '../../helpers/csrf.js'
import { uploadMiddleware, validateFileTypes } from '../../middlewares/uploadMiddleware.js'
import validate from '../../validators/index.js'
import { createTicketValidator } from '../../validators/ticketValidator.js'
import { XSS_OPTION } from '../../helpers/constants.js'
import {
  listPage,
  createPage,
  handleCreate,
  detailPage,
  closeHandler,
} from '../../controllers/web/ticketController.js'

const router = express.Router()

// Daftar tiket milik reporter
router.get('/', listPage)

// Form submit tiket baru
router.get('/create', createPage)

// POST submit tiket (ada file upload — urutan middleware wajib)
router.post('/create',
  uploadMiddleware,
  validateFileTypes,
  doubleCsrfProtection,
  xss(XSS_OPTION),
  validate(createTicketValidator, true),
  handleCreate)

// Detail tiket reporter
router.get('/:uuid', detailPage)

// Reporter close tiket (Resolved → Closed)
router.post('/:uuid/close',
  doubleCsrfProtection,
  xss(XSS_OPTION),
  closeHandler)

export default router
