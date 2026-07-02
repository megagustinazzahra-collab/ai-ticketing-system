import express from 'express'
import { xss } from 'express-xss-sanitizer'
import { doubleCsrfProtection } from '../../helpers/csrf.js'
import { loginRateLimit } from '../../helpers/rateLimit.js'
import validate from '../../validators/index.js'
import { loginValidator, registerValidator, forgotPasswordValidator, changePasswordValidator } from '../../validators/authValidator.js'
import {
  loginPage, loginHandler,
  logoutHandler,
  registerPage, registerHandler,
  forgotPasswordPage, forgotPasswordHandler,
  changePasswordPage, changePasswordHandler,
} from '../../controllers/web/authController.js'
import { XSS_OPTION } from '../../helpers/constants.js'

const router = express.Router()

// Login
router.get('/login', loginPage)
router.post('/login',
  loginRateLimit,
  doubleCsrfProtection,
  xss(XSS_OPTION),
  validate(loginValidator, true),
  loginHandler)

// Logout
router.post('/logout', logoutHandler)

// Register
router.get('/register', registerPage)
router.post('/register',
  doubleCsrfProtection,
  xss(XSS_OPTION),
  validate(registerValidator, true),
  registerHandler)

// Forgot Password
router.get('/forgot-password', forgotPasswordPage)
router.post('/forgot-password',
  doubleCsrfProtection,
  xss(XSS_OPTION),
  validate(forgotPasswordValidator, true),
  forgotPasswordHandler)

// Change Password (via token)
router.get('/change-password', changePasswordPage)
router.post('/change-password',
  doubleCsrfProtection,
  xss(XSS_OPTION),
  validate(changePasswordValidator, true),
  changePasswordHandler)

export default router
