import { body } from 'express-validator'

export const passwordMatch = (confirmField = 'password_confirmation') =>
  body(confirmField).custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Konfirmasi password tidak cocok.')
    return true
  })

export const strongPassword = (field = 'password') =>
  body(field)
    .isLength({ min: 8 }).withMessage('Password minimal 8 karakter.')
    .matches(/[A-Z]/).withMessage('Password harus mengandung huruf kapital.')
    .matches(/[0-9]/).withMessage('Password harus mengandung angka.')
