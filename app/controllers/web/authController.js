import * as authService from '../../services/authService.js'
import { redirectSuccess, redirectError, getClientIp } from '../../helpers/common.js'
import { USER_ROLE } from '../../helpers/constants.js'
import models from '../../models/index.js'

const { APP_URL } = process.env

// ── GET /login ──
export async function loginPage(req, res) {
  if (req.session?.user) {
    return res.redirect(req.session.user.role_id === USER_ROLE.HELPDESK ? '/helpdesk/dashboard' : '/tickets')
  }
  return res.render('auth/login', {
    layout: 'layouts/_auth',
    title: 'Login',
    csrfToken: req.csrfToken?.(),
    error: req.query.error || null,
  })
}

// ── POST /login ──
export async function loginHandler(req, res, next) {
  const { email, password, captchaToken } = req.body

  if (req.validationErrors) {
    return res.render('auth/login', {
      layout: 'layouts/_auth',
      title: 'Login',
      csrfToken: req.csrfToken?.(),
      errors: req.validationErrors,
      oldEmail: email,
    })
  }

  try {
    const userData = await authService.login(email, password, captchaToken)
    req.session.user = userData

    await models.ActivityLog.create({
      user_id: userData.id,
      action: 'LOGIN',
      entity_type: 'User',
      entity_id: userData.id,
      metadata: { email: userData.email },
      ip_address: getClientIp(req),
    })

    const redirect = userData.role_id === USER_ROLE.HELPDESK ? '/helpdesk/dashboard' : '/tickets'
    return res.redirect(redirect)
  } catch (err) {
    await models.ActivityLog.create({
      user_id: null,
      action: 'LOGIN_FAILED',
      entity_type: 'User',
      entity_id: null,
      metadata: { email },
      ip_address: getClientIp(req),
    }).catch(() => {})

    return res.render('auth/login', {
      layout: 'layouts/_auth',
      title: 'Login',
      csrfToken: req.csrfToken?.(),
      error: err.message,
      oldEmail: email,
    })
  }
}

// ── POST /logout ──
export async function logoutHandler(req, res, next) {
  const user = req.session?.user
  req.session.destroy(async () => {
    if (user) {
      await models.ActivityLog.create({
        user_id: user.id,
        action: 'LOGOUT',
        entity_type: 'User',
        entity_id: user.id,
        metadata: {},
        ip_address: getClientIp(req),
      }).catch(() => {})
    }
    res.clearCookie('connect.sid')
    return res.redirect('/login')
  })
}

// ── GET /register ──
export function registerPage(req, res) {
  if (req.session?.user) return res.redirect('/tickets')
  return res.render('auth/register', {
    layout: 'layouts/_auth',
    title: 'Daftar Akun',
    csrfToken: req.csrfToken?.(),
  })
}

// ── POST /register ──
export async function registerHandler(req, res, next) {
  const { name, email, password, hospital_name, phone } = req.body

  if (req.validationErrors) {
    return res.render('auth/register', {
      layout: 'layouts/_auth',
      title: 'Daftar Akun',
      csrfToken: req.csrfToken?.(),
      errors: req.validationErrors,
      old: { name, email, hospital_name, phone },
    })
  }

  try {
    const user = await authService.register({ name, email, password, hospital_name, phone })

    await models.ActivityLog.create({
      user_id: user.id,
      action: 'REGISTER',
      entity_type: 'User',
      entity_id: user.id,
      metadata: { email },
      ip_address: getClientIp(req),
    }).catch(() => {})

    return res.redirect(redirectSuccess('/login', 'Registrasi berhasil! Silakan login.'))
  } catch (err) {
    return res.render('auth/register', {
      layout: 'layouts/_auth',
      title: 'Daftar Akun',
      csrfToken: req.csrfToken?.(),
      errors: { email: [err.message] },
      old: { name, email, hospital_name, phone },
    })
  }
}

// ── GET /forgot-password ──
export function forgotPasswordPage(req, res) {
  return res.render('auth/forgot-password', {
    layout: 'layouts/_auth',
    title: 'Lupa Password',
    csrfToken: req.csrfToken?.(),
    success: req.query.success || null,
  })
}

// ── POST /forgot-password ──
export async function forgotPasswordHandler(req, res, next) {
  const { email } = req.body

  if (req.validationErrors) {
    return res.render('auth/forgot-password', {
      layout: 'layouts/_auth',
      title: 'Lupa Password',
      csrfToken: req.csrfToken?.(),
      errors: req.validationErrors,
    })
  }

  try {
    await authService.generateResetToken(email)
  } catch {
    // sengaja tidak expose error — selalu tampilkan pesan sukses
  }

  return res.redirect(redirectSuccess('/forgot-password', 'Jika email terdaftar, link reset password telah dikirim.'))
}

// ── GET /change-password ──
export async function changePasswordPage(req, res) {
  const { token } = req.query
  if (!token) return res.redirect('/forgot-password')

  try {
    await authService.verifyResetToken(token)
  } catch {
    return res.redirect(redirectError('/forgot-password', 'Link reset tidak valid atau sudah kadaluarsa.'))
  }

  return res.render('auth/change-password', {
    layout: 'layouts/_auth',
    title: 'Buat Password Baru',
    csrfToken: req.csrfToken?.(),
    token,
  })
}

// ── POST /change-password ──
export async function changePasswordHandler(req, res, next) {
  const { token, password } = req.body

  if (req.validationErrors) {
    return res.render('auth/change-password', {
      layout: 'layouts/_auth',
      title: 'Buat Password Baru',
      csrfToken: req.csrfToken?.(),
      token,
      errors: req.validationErrors,
    })
  }

  try {
    await authService.resetPassword(token, password)
    return res.redirect(redirectSuccess('/login', 'Password berhasil diubah. Silakan login.'))
  } catch (err) {
    return res.render('auth/change-password', {
      layout: 'layouts/_auth',
      title: 'Buat Password Baru',
      csrfToken: req.csrfToken?.(),
      token,
      error: err.message,
    })
  }
}
