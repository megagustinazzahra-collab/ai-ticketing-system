import { Client } from 'minio'
import fs from 'fs'
import path from 'path'
import logger from '../../config/winston.js'

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT, 10) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
})

const BUCKET = process.env.MINIO_BUCKET || 'wms-ticketing'

export const ensureBucket = async () => {
  try {
    const exists = await minioClient.bucketExists(BUCKET)
    if (!exists) {
      await minioClient.makeBucket(BUCKET, 'us-east-1')
      logger.info(`MinIO bucket "${BUCKET}" created`)
    }
  } catch (err) {
    logger.warn(`MinIO bucket check failed: ${err.message}`)
  }
}

/**
 * Upload file dari path lokal ke MinIO.
 * Menghapus file temp setelah upload berhasil.
 */
export const uploadFile = async (filePath, objectName, contentType) => {
  await minioClient.fPutObject(BUCKET, objectName, filePath, {
    'Content-Type': contentType,
  })
  try { fs.unlinkSync(filePath) } catch {}
}

/**
 * Generate presigned URL untuk download (valid 1 jam).
 */
export const getPresignedUrl = async (objectName, expirySeconds = 3600) => {
  return minioClient.presignedGetObject(BUCKET, objectName, expirySeconds)
}

/**
 * Hapus file dari MinIO.
 */
export const deleteFile = async (objectName) => {
  try {
    await minioClient.removeObject(BUCKET, objectName)
  } catch (err) {
    logger.warn(`MinIO deleteFile failed for "${objectName}": ${err.message}`)
  }
}

/**
 * Buat nama unik untuk file yang disimpan di MinIO.
 * Format: tickets/<ticketNumber>/<timestamp>-<original>
 */
export const buildObjectName = (ticketNumber, originalName) => {
  const ext = path.extname(originalName).toLowerCase()
  const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
  return `tickets/${ticketNumber}/${Date.now()}-${base}${ext}`
}
