import express from 'express'
import {
  getUnreadCount,
  listNotifications,
  markAsRead,
  markAllAsRead,
} from '../../controllers/api/notificationController.js'

const router = express.Router()

router.get('/unread-count', getUnreadCount)
router.get('/', listNotifications)
router.patch('/:uuid/read', markAsRead)
router.patch('/read-all', markAllAsRead)

export default router
