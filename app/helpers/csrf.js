import { doubleCsrf } from 'csrf-csrf'

const { generateToken } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET || 'csrf-fallback-secret',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64,
  getTokenFromRequest: (req) => req.body?.csrfToken || req.headers['x-csrf-token'],
})

// Bypass CSRF untuk testing
export const doubleCsrfProtection = (req, res, next) => next()

export const csrfTokenMiddleware = (req, res, next) => {
  req.csrfToken = () => ''
  next()
}

export { generateToken }