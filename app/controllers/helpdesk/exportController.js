import dayjs from 'dayjs'
import { generateTicketExcel } from '../../services/exportService.js'
import models from '../../models/index.js'
import {
  ISSUE_TYPE_OPTIONS,
  WMS_MODULE_OPTIONS,
  TICKET_STATUS_LABEL,
} from '../../helpers/constants.js'
import { getClientIp } from '../../helpers/common.js'

export const exportPage = (req, res) => {
  const { status, priority, severity, issue_type, wms_module, start_date, end_date } = req.query
  return res.render('helpdesk/export', {
    layout: 'layouts/_layout',
    title: 'Ekspor Data Tiket',
    breadcrumb: [{ label: 'Ekspor Data', active: true }],
    activeMenu: 'export',
    issueTypeOptions: ISSUE_TYPE_OPTIONS,
    wmsModuleOptions: WMS_MODULE_OPTIONS,
    statusLabels: TICKET_STATUS_LABEL,
    filters: { status, priority, severity, issue_type, wms_module, start_date, end_date },
  })
}

export const exportDownload = async (req, res, next) => {
  try {
    const filters = {
      status:     req.query.status     || null,
      priority:   req.query.priority   || null,
      severity:   req.query.severity   || null,
      issue_type: req.query.issue_type || null,
      wms_module: req.query.wms_module || null,
      start_date: req.query.start_date || null,
      end_date:   req.query.end_date   || null,
    }

    const { workbook, count } = await generateTicketExcel(filters)

    await models.ActivityLog.create({
      user_id:     req.session.user.id,
      action:      'EXPORT_TICKETS',
      entity_type: 'Ticket',
      entity_id:   null,
      metadata:    { filters, count },
      ip_address:  getClientIp(req),
    })

    const filename = `tiket-wms-${dayjs().format('YYYYMMDD-HHmmss')}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    await workbook.xlsx.write(res)
    return res.end()
  } catch (err) {
    return next(err)
  }
}
