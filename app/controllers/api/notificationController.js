import models from '../../models/index.js'

export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.session.user.id
    const count = await models.Notification.count({
      where: { user_id: userId, is_read: false },
    })
    return res.status(200).json({ count })
  } catch (err) {
    return next(err)
  }
}

export const listNotifications = async (req, res, next) => {
  try {
    const userId = req.session.user.id
    const { page = 1, paginate = 20 } = req.query
    const limit = parseInt(paginate, 10)
    const offset = (parseInt(page, 10) - 1) * limit

    const { count, rows } = await models.Notification.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: models.Ticket,
          as: 'ticket',
          attributes: ['uuid', 'ticket_number'],
          required: false,
        },
      ],
    })

    return res.status(200).json({ total: count, page: parseInt(page, 10), perPage: limit, list: rows })
  } catch (err) {
    return next(err)
  }
}

export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.session.user.id
    const { uuid } = req.params
    const notif = await models.Notification.findOne({ where: { uuid, user_id: userId } })
    if (!notif) return res.status(404).json({ message: 'Notifikasi tidak ditemukan.' })

    await notif.update({ is_read: true, read_at: new Date() })
    return res.status(200).json({ message: 'OK' })
  } catch (err) {
    return next(err)
  }
}

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.session.user.id
    await models.Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: userId, is_read: false } },
    )
    return res.status(200).json({ message: 'OK' })
  } catch (err) {
    return next(err)
  }
}
