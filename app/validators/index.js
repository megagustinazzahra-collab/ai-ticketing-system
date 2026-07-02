import { validationResult } from 'express-validator'

const validate = (validators, isWeb = false) => [
  ...validators,
  (req, res, next) => {
    const errors = validationResult(req)
    if (errors.isEmpty()) return next()

    const formatted = {}
    errors.array().forEach((err) => {
      if (!formatted[err.path]) formatted[err.path] = []
      formatted[err.path].push(err.msg)
    })

    if (isWeb) {
      req.validationErrors = formatted
      return next()
    }

    return res.status(422).json({ message: 'Unprocessable Entity', errors: formatted })
  },
]

export default validate
