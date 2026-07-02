import dayjs from 'dayjs'
import models from '../models/index.js'

export const generateTicketNumber = async () => {
  const today = dayjs().format('YYYYMMDD')
  const prefix = `TKT-${today}-`

  const last = await models.Ticket.findOne({
    where: models.sequelize.where(
      models.sequelize.fn('LEFT', models.sequelize.col('ticket_number'), prefix.length),
      prefix,
    ),
    order: [['id', 'DESC']],
    paranoid: false,
  })

  const seq = last
    ? parseInt(last.ticket_number.split('-')[2], 10) + 1
    : 1

  return `${prefix}${String(seq).padStart(3, '0')}`
}
