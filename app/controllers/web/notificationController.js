import models from '../../models/index.js'

export const listPage = async (req, res, next) => {
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

    const totalPages = Math.ceil(count / limit)
    const currentPage = parseInt(page, 10)

    // Tandai semua notifikasi sebagai sudah dibaca saat halaman dibuka
    await models.Notification.update(
      { is_read: true, read_at: new Date() },
      { where: { user_id: userId, is_read: false } },
    )

    return res.render('reporter/notification-list', {
      layout: 'layouts/_layout',
      title: 'Notifikasi',
      activeMenu: 'notifications',
      breadcrumb: [{ label: 'Notifikasi', active: true }],
      notifications: rows,
      total: count,
      page: currentPage,
      paginate: limit,
      totalPages,
      hasPrev: currentPage > 1,
      hasNext: currentPage < totalPages,
      prevPage: currentPage - 1,
      nextPage: currentPage + 1,
    })
  } catch (err) {
    return next(err)
  }
}
