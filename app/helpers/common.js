export const redirectSuccess = (url, message) =>
  `${url}?success=${encodeURIComponent(message)}`

export const redirectError = (url, message) =>
  `${url}?error=${encodeURIComponent(message)}`

export const formatDate = (date, locale = 'id-ID') => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const formatDateShort = (date, locale = 'id-ID') => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || null
