import jwt from 'jsonwebtoken'

export const isAuthenticated = (req, res, next) => {
  if (req.session?.user) return next()
  return res.redirect('/login')
}

export const isAuthenticateJwt = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token tidak ditemukan.' })
  }
  const token = authHeader.split(' ')[1]
  try {
    req.user = jwt.verify(token, process.env.SESSION_SECRET)
    return next()
  } catch {
    return res.status(401).json({ message: 'Token tidak valid atau sudah kadaluarsa.' })
  }
}

export const hasRole = (allowedRoles) => (req, res, next) => {
  const roleId = req.session?.user?.role_id ?? req.user?.role_id
  if (!allowedRoles.includes(roleId)) {
    if (req.path.startsWith('/api')) {
      return res.status(403).json({ message: 'Akses ditolak.' })
    }
    return res.status(403).render('error', { title: 'Akses Ditolak', message: 'Anda tidak memiliki izin untuk mengakses halaman ini.', code: 403 })
  }
  return next()
}

export const isOwnerOrHelpdesk = (req, res, next) => {
  const user = req.session?.user
  if (!user) return res.redirect('/login')
  if (user.role_id === 2) return next()
  req.ownerOnly = true
  return next()
}
