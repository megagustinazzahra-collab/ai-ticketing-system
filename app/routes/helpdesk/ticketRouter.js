import express from 'express'
import { xss } from 'express-xss-sanitizer'
import { doubleCsrfProtection } from '../../helpers/csrf.js'
import validate from '../../validators/index.js'
import { updateStatusValidator, assignValidator, helpdeskFieldsValidator, commentValidator } from '../../validators/ticketValidator.js'
import {
  listPage,
  detailPage,
  handleUpdateStatus,
  handleAssign,
  handleUpdateFields,
  addCommentHandler,
  deleteCommentHandler,
} from '../../controllers/helpdesk/ticketController.js'
import { XSS_OPTION } from '../../helpers/constants.js'

const router = express.Router()

// LIST semua tiket
router.get('/', listPage)

// DETAIL tiket
router.get('/:uuid', detailPage)

// UPDATE STATUS
router.post('/:uuid/status',
  doubleCsrfProtection,
  xss(XSS_OPTION),
  validate(updateStatusValidator, true),
  handleUpdateStatus)

// ASSIGN PIC & DEVELOPER
router.post('/:uuid/assign',
  doubleCsrfProtection,
  xss(XSS_OPTION),
  validate(assignValidator, true),
  handleAssign)

// UPDATE HELPDESK FIELDS (severity, priority, jira_card, notes)
router.post('/:uuid/fields',
  doubleCsrfProtection,
  xss(XSS_OPTION),
  validate(helpdeskFieldsValidator, true),
  handleUpdateFields)

// ADD COMMENT
router.post('/:uuid/comments',
  doubleCsrfProtection,
  xss(XSS_OPTION),
  validate(commentValidator, true),
  addCommentHandler)

// DELETE COMMENT (via POST karena form browser tidak support DELETE)
router.post('/:uuid/comments/:commentUuid/delete',
  doubleCsrfProtection,
  deleteCommentHandler)

export default router
