import { Model } from 'sequelize'

export default (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      this.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' })
      this.belongsTo(models.Ticket, { as: 'ticket', foreignKey: 'ticket_id' })
    }
  }

  Notification.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    ticket_id: { type: DataTypes.BIGINT, allowNull: true },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    is_read: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    read_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: 'Notification',
    underscored: true,
    paranoid: false,
    tableName: 'notifications',
    createdAt: 'created_at',
    updatedAt: false,
  })

  return Notification
}
