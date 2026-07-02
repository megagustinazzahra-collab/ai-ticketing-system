import multer from 'multer'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { filetypeinfo } from 'magic-bytes.js'
import { redirectError } from '../helpers/common.js'

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf']
const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'application/pdf']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 5

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    cb(null, unique)
  },
})

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error('Format file tidak diizinkan. Gunakan: PNG, JPG, JPEG, PDF'))
  }
  return cb(null, true)
}

const uploader = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
})

export const uploadMiddleware = (req, res, next) => {
  uploader.array('attachments', MAX_FILES)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.redirect(redirectError('/tickets/create', 'Ukuran file melebihi batas 5MB.'))
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.redirect(redirectError('/tickets/create', `Maksimal ${MAX_FILES} file attachment.`))
      }
      return res.redirect(redirectError('/tickets/create', `Upload error: ${err.message}`))
    }
    if (err) {
      return res.redirect(redirectError('/tickets/create', err.message))
    }
    return next()
  })
}

const cleanupTempFiles = (files) => {
  if (!files || files.length === 0) return
  files.forEach((f) => {
    try { fs.unlinkSync(f.path) } catch {}
  })
}

export const validateFileTypes = async (req, res, next) => {
  if (!req.files || req.files.length === 0) return next()

  try {
    for (const file of req.files) {
      const fd = fs.openSync(file.path, 'r')
      const buffer = Buffer.alloc(12)
      fs.readSync(fd, buffer, 0, 12, 0)
      fs.closeSync(fd)

      const types = filetypeinfo(buffer)
      const isValid = types.some((t) => ALLOWED_MIMES.includes(t.mime))

      if (!isValid) {
        cleanupTempFiles(req.files)
        return res.redirect(redirectError('/tickets/create', `File "${file.originalname}" bukan tipe yang valid. Gunakan PNG, JPG, JPEG, atau PDF.`))
      }
    }
    return next()
  } catch (err) {
    cleanupTempFiles(req.files)
    return next(err)
  }
}
