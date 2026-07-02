import ExcelJS from 'exceljs'
import { Op } from 'sequelize'
import models from '../models/index.js'
import { TICKET_STATUS_LABEL } from '../helpers/constants.js'
import { formatDate } from '../helpers/common.js'

/**
 * Query tiket dengan filter dan generate workbook Excel (.xlsx).
 * Returns { workbook, count }.
 */
export const generateTicketExcel = async (filters = {}) => {
  const { status, priority, severity, issue_type, wms_module, start_date, end_date } = filters

  const where = {}
  if (status) where.status = parseInt(status, 10)
  if (priority) where.priority = priority
  if (severity) where.severity = severity
  if (issue_type) where.issue_type = issue_type
  if (wms_module) where.wms_module = wms_module
  if (start_date || end_date) {
    where.created_at = {}
    if (start_date) where.created_at[Op.gte] = new Date(start_date)
    if (end_date) {
      const end = new Date(end_date)
      end.setHours(23, 59, 59, 999)
      where.created_at[Op.lte] = end
    }
  }

  const tickets = await models.Ticket.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: [
      { model: models.User, as: 'reporter', attributes: ['name', 'hospital_name'] },
      { model: models.User, as: 'pic', attributes: ['name'] },
      { model: models.TicketAttachment, as: 'attachments', attributes: ['original_name'] },
    ],
  })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'WMS Ticketing System'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Tiket WMS')

  const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } }
  const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  const headerAlignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  const cellBorder = {
    top:    { style: 'thin', color: { argb: 'FFD0D0D0' } },
    left:   { style: 'thin', color: { argb: 'FFD0D0D0' } },
    bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    right:  { style: 'thin', color: { argb: 'FFD0D0D0' } },
  }

  sheet.columns = [
    { header: 'No. Tiket',       key: 'ticket_number',      width: 20 },
    { header: 'Tanggal Laporan', key: 'created_at',         width: 22 },
    { header: 'Nama RS',         key: 'hospital_name',      width: 25 },
    { header: 'Tipe Issue',      key: 'issue_type',         width: 15 },
    { header: 'Device',          key: 'device',             width: 12 },
    { header: 'Modul WMS',       key: 'wms_module',         width: 30 },
    { header: 'Detail Problem',  key: 'problem_detail',     width: 40 },
    { header: 'Notes',           key: 'notes',              width: 25 },
    { header: 'Attachment',      key: 'attachment',         width: 25 },
    { header: 'Severity',        key: 'severity',           width: 12 },
    { header: 'Priority',        key: 'priority',           width: 12 },
    { header: 'Status',          key: 'status',             width: 14 },
    { header: 'PIC',             key: 'pic',                width: 20 },
    { header: 'Developer',       key: 'developer',          width: 20 },
    { header: 'CARD Jira',       key: 'jira_card',          width: 15 },
    { header: 'Tanggal Selesai', key: 'resolved_at',        width: 22 },
    { header: 'Resolution Time', key: 'resolution_minutes', width: 18 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.height = 32
  headerRow.eachCell((cell) => {
    cell.fill      = headerFill
    cell.font      = headerFont
    cell.alignment = headerAlignment
    cell.border    = cellBorder
  })

  tickets.forEach((t) => {
    const attachmentNames = t.attachments?.length
      ? t.attachments.map((a) => a.original_name).join(', ')
      : '-'

    const row = sheet.addRow({
      ticket_number:      t.ticket_number,
      created_at:         formatDate(t.created_at),
      hospital_name:      t.reporter?.hospital_name || '-',
      issue_type:         t.issue_type,
      device:             t.device,
      wms_module:         t.wms_module,
      problem_detail:     t.problem_detail,
      notes:              t.notes || '-',
      attachment:         attachmentNames,
      severity:           t.severity || '-',
      priority:           t.priority || '-',
      status:             TICKET_STATUS_LABEL[t.status] || '-',
      pic:                t.pic?.name || '-',
      developer:          t.developer || '-',
      jira_card:          t.jira_card || '-',
      resolved_at:        t.resolved_at ? formatDate(t.resolved_at) : '-',
      resolution_minutes: t.resolution_minutes ? `${t.resolution_minutes} menit` : '-',
    })

    row.eachCell((cell) => {
      cell.alignment = { vertical: 'top', wrapText: true }
      cell.border    = cellBorder
    })
  })

  // Freeze top header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  return { workbook, count: tickets.length }
}
