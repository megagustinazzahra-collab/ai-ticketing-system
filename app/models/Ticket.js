import { Model } from 'sequelize'

export default (sequelize, DataTypes) => {
  class Ticket extends Model {
    static associate(models) {
      this.belongsTo(models.User, { as: 'reporter', foreignKey: 'reporter_id' })
      this.belongsTo(models.User, { as: 'pic', foreignKey: 'pic_id' })
      this.hasMany(models.TicketHistory, { as: 'histories', foreignKey: 'ticket_id' })
      this.hasMany(models.TicketComment, { as: 'comments', foreignKey: 'ticket_id' })
      this.hasMany(models.TicketAttachment, { as: 'attachments', foreignKey: 'ticket_id' })
      this.hasMany(models.Notification, { as: 'notifications', foreignKey: 'ticket_id' })
    }
  }

  Ticket.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    ticket_number: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
    },
    reporter_id: { type: DataTypes.BIGINT, allowNull: false },
    pic_id: { type: DataTypes.BIGINT, allowNull: true },
    developer: { type: DataTypes.STRING, allowNull: true },
    issue_type: {
      type: DataTypes.ENUM(
        'Bug', 'Change', 'Cleansing', 'Inquiries',
        'New Request', 'Performance', 'UI/UX', 'Lainnya',
      ),
      allowNull: false,
    },
    device: {
      type: DataTypes.ENUM('Web', 'Mobile', 'All', 'Backend', 'Timbangan', 'Printer', 'Lainnya'),
      allowNull: false,
    },
    wms_module: { type: DataTypes.STRING, allowNull: false },
    severity: {
      type: DataTypes.ENUM('Critical', 'High', 'Medium', 'Low'),
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM('Critical', 'High', 'Medium', 'Low'),
      allowNull: true,
    },
    problem_detail: { type: DataTypes.TEXT, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    jira_card: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    resolved_at: { type: DataTypes.DATE, allowNull: true },
    resolution_minutes: { type: DataTypes.INTEGER, allowNull: true },
    sla_started_at: { type: DataTypes.DATE, allowNull: true },
    sla_paused_minutes: { type: DataTypes.INTEGER, defaultValue: 0 },
    sla_deadline: { type: DataTypes.DATE, allowNull: true },
    sla_breached: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_by: { type: DataTypes.BIGINT, allowNull: true },
    updated_by: { type: DataTypes.BIGINT, allowNull: true },
    deleted_by: { type: DataTypes.BIGINT, allowNull: true },
  }, {
    sequelize,
    modelName: 'Ticket',
    underscored: true,
    paranoid: true,
    tableName: 'tickets',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  })

  Ticket.getBasicAttribute = function () {
    return [
      'id', 'uuid', 'ticket_number', 'reporter_id', 'pic_id', 'developer',
      'issue_type', 'device', 'wms_module', 'severity', 'priority',
      'problem_detail', 'notes', 'jira_card', 'status',
      'sla_started_at', 'sla_paused_minutes', 'sla_deadline', 'sla_breached',
      'resolved_at', 'resolution_minutes', 'created_at', 'updated_at',
    ]
  }

  Ticket.getTitle = () => 'Daftar Tiket'
  Ticket.getDetailTitle = () => 'Detail Tiket'

  Ticket.columnsList = function () {
    return [
      { label: '#', attribute: 'id', type: 'counter' },
      { label: 'No. Tiket', attribute: 'ticket_number', type: 'text' },
      { label: 'Nama RS', attribute: 'hospital_name', type: 'text' },
      { label: 'Tipe Issue', attribute: 'issue_type', type: 'text' },
      { label: 'Modul WMS', attribute: 'wms_module', type: 'text' },
      {
        label: 'Priority',
        attribute: 'priority',
        type: 'custom',
        custom: (value) => {
          const colorMap = { Critical: 'danger', High: 'warning', Medium: 'info', Low: 'secondary' }
          const cls = colorMap[value] || 'secondary'
          return `<td><span class="badge badge-${cls}">${value || '-'}</span></td>`
        },
      },
      {
        label: 'Status',
        attribute: 'status',
        type: 'custom',
        custom: (value) => {
          const labelMap = { 1: 'Open', 2: 'In Progress', 3: 'Pending', 4: 'Resolved', 5: 'Closed', 6: 'Rejected' }
          const colorMap = { 1: 'primary', 2: 'info', 3: 'warning', 4: 'success', 5: 'secondary', 6: 'danger' }
          return `<td><span class="badge badge-${colorMap[value] || 'secondary'}">${labelMap[value] || '-'}</span></td>`
        },
      },
      {
        label: 'SLA',
        attribute: 'sla_breached',
        type: 'custom',
        custom: (value, row) => {
          if (!row.sla_deadline) return `<td><span class="badge badge-light">-</span></td>`
          const cls = value ? 'danger' : 'success'
          const label = value ? 'Breach' : 'On Track'
          return `<td><span class="badge badge-${cls}">${label}</span></td>`
        },
      },
      { label: 'Tanggal', attribute: 'created_at', type: 'date' },
    ]
  }

  Ticket.getCreateFields = () => [
    'ticket_number', 'reporter_id', 'issue_type', 'device',
    'wms_module', 'problem_detail', 'notes',
  ]

  Ticket.getUpdateFields = () => [
    'status', 'severity', 'priority', 'pic_id', 'developer',
    'jira_card', 'resolved_at', 'resolution_minutes', 'notes',
    'sla_started_at', 'sla_paused_minutes', 'sla_deadline', 'sla_breached',
    'updated_by',
  ]

  return Ticket
}
