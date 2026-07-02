import { body } from 'express-validator'
import { strongPassword, passwordMatch } from './customValidator.js'

export const loginValidator = [
  body('email').notEmpty().withMessage('Email wajib diisi.').isEmail().withMessage('Format email tidak valid.'),
  body('password').notEmpty().withMessage('Password wajib diisi.'),
]

export const registerValidator = [
  body('name').notEmpty().withMessage('Nama wajib diisi.').isLength({ max: 100 }).withMessage('Nama maksimal 100 karakter.'),
  body('email').notEmpty().withMessage('Email wajib diisi.').isEmail().withMessage('Format email tidak valid.'),
  body('hospital_name').notEmpty().withMessage('Nama Fasyankes / Entitas wajib diisi.').isLength({ max: 150 }).withMessage('Nama Fasyankes maksimal 150 karakter.'),
  body('phone').optional({ checkFalsy: true }).isMobilePhone('id-ID').withMessage('Format nomor HP tidak valid.'),
  strongPassword('password'),
  passwordMatch('password_confirmation'),
]

export const forgotPasswordValidator = [
  body('email').notEmpty().withMessage('Email wajib diisi.').isEmail().withMessage('Format email tidak valid.'),
]

export const changePasswordValidator = [
  body('token').notEmpty().withMessage('Token tidak valid.'),
  strongPassword('password'),
  passwordMatch('password_confirmation'),
]
