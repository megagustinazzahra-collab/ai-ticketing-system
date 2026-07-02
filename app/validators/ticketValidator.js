import { body } from 'express-validator'
import { ISSUE_TYPE_OPTIONS, DEVICE_OPTIONS, WMS_MODULE_OPTIONS, TICKET_STATUS } from '../helpers/constants.js'

const baseTicketFields = [
  body('issue_type')
    .notEmpty().withMessage('Tipe issue wajib dipilih.')
    .isIn(ISSUE_TYPE_OPTIONS).withMessage('Tipe issue tidak valid.'),

  body('device')
    .notEmpty().withMessage('Device wajib dipilih.')
    .isIn(DEVICE_OPTIONS).withMessage('Device tidak valid.'),

  body('wms_module')
    .notEmpty().withMessage('Modul WMS wajib dipilih.')
    .isIn(WMS_MODULE_OPTIONS).withMessage('Modul WMS tidak valid.'),

  body('problem_detail')
    .notEmpty().withMessage('Detail problem wajib diisi.')
    .isLength({ min: 10 }).withMessage('Detail problem minimal 10 karakter.'),

  body('notes')
    .optional({ nullable: true, checkFalsy: true })
    .isString().withMessage('Notes harus berupa teks.')
    .isLength({ max: 1000 }).withMessage('Notes maksimal 1000 karakter.'),
]

export const createTicketValidator = [...baseTicketFields]

export const commentValidator = [
  body('content')
    .notEmpty().withMessage('Komentar tidak boleh kosong.')
    .isLength({ min: 3 }).withMessage('Komentar minimal 3 karakter.')
    .isLength({ max: 2000 }).withMessage('Komentar maksimal 2000 karakter.'),
]

export const updateStatusValidator = [
  body('new_status')
    .notEmpty().withMessage('Status baru wajib dipilih.')
    .isInt({ min: 1, max: 6 }).withMessage('Status tidak valid.'),

  body('reason')
    .if(body('new_status').equals(String(TICKET_STATUS.REJECTED)))
    .notEmpty().withMessage('Alasan penolakan wajib diisi saat tiket ditolak.'),
]

export const assignValidator = [
  body('pic_id')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 }).withMessage('PIC tidak valid.'),

  body('developer')
    .optional({ nullable: true, checkFalsy: true })
    .isString().withMessage('Developer harus berupa teks.')
    .isLength({ max: 100 }).withMessage('Developer maksimal 100 karakter.'),
]

export const helpdeskFieldsValidator = [
  body('severity')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Critical', 'High', 'Medium', 'Low']).withMessage('Severity tidak valid.'),

  body('priority')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Critical', 'High', 'Medium', 'Low']).withMessage('Priority tidak valid.'),

  body('jira_card')
    .optional({ nullable: true, checkFalsy: true })
    .isString().withMessage('CARD Jira harus berupa teks.')
    .isLength({ max: 50 }).withMessage('CARD Jira maksimal 50 karakter.'),

  body('notes')
    .optional({ nullable: true, checkFalsy: true })
    .isString().withMessage('Notes harus berupa teks.')
    .isLength({ max: 2000 }).withMessage('Notes maksimal 2000 karakter.'),
]
