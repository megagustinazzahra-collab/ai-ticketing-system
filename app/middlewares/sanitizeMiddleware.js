import sanitizeHtml from 'sanitize-html'

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} })
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeValue(v)]))
  }
  return value
}

export const sanitizeBody = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body)
  next()
}
