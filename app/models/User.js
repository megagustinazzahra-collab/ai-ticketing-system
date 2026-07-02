import { Model } from 'sequelize'

export default (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      this.hasMany(models.Ticket, { as: 'reportedTickets', foreignKey: 'reporter_id' })
      this.hasMany(models.Ticket, { as: 'assignedTickets', foreignKey: 'pic_id' })
      this.hasMany(models.TicketHistory, { as: 'ticketHistories', foreignKey: 'changed_by' })
      this.hasMany(models.TicketComment, { as: 'comments', foreignKey: 'user_id' })
      this.hasMany(models.Notification, { as: 'notifications', foreignKey: 'user_id' })
      this.hasMany(models.ActivityLog, { as: 'activityLogs', foreignKey: 'user_id' })
    }
  }

  User.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    hospital_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    created_by: { type: DataTypes.BIGINT, allowNull: true },
    updated_by: { type: DataTypes.BIGINT, allowNull: true },
    deleted_by: { type: DataTypes.BIGINT, allowNull: true },
  }, {
    sequelize,
    modelName: 'User',
    underscored: true,
    paranoid: true,
    tableName: 'users',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  })

  User.getBasicAttribute = function () {
    return ['id', 'uuid', 'name', 'email', 'hospital_name', 'phone', 'role_id', 'is_active', 'created_at']
  }

  User.getTitle = () => 'Daftar Pengguna'
  User.getDetailTitle = () => 'Detail Pengguna'

  User.columnsList = function () {
    return [
      { label: '#', attribute: 'id', type: 'counter' },
      { label: 'Nama', attribute: 'name', type: 'text' },
      { label: 'Email', attribute: 'email', type: 'text' },
      { label: 'Nama RS', attribute: 'hospital_name', type: 'text' },
      { label: 'No. HP', attribute: 'phone', type: 'text' },
      {
        label: 'Role',
        attribute: 'role_id',
        type: 'custom',
        custom: (value) => {
          const label = value === 2 ? 'Helpdesk' : 'Reporter'
          const cls = value === 2 ? 'info' : 'secondary'
          return `<td><span class="badge badge-${cls}">${label}</span></td>`
        },
      },
      {
        label: 'Status',
        attribute: 'is_active',
        type: 'custom',
        custom: (value) => {
          const label = value ? 'Aktif' : 'Nonaktif'
          const cls = value ? 'success' : 'danger'
          return `<td><span class="badge badge-${cls}">${label}</span></td>`
        },
      },
      { label: 'Dibuat', attribute: 'created_at', type: 'date' },
    ]
  }

  User.getCreateFields = () => ['name', 'email', 'password', 'hospital_name', 'phone', 'role_id']

  User.getUpdateFields = () => ['name', 'hospital_name', 'phone', 'is_active']

  return User
}
