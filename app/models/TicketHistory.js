import { Model } from 'sequelize'

export default (sequelize, DataTypes) => {
  class TicketHistory extends Model {
    static associate(models) {
      this.belongsTo(models.Ticket, { as: 'ticket', foreignKey: 'ticket_id' })
      this.belongsTo(models.User, { as: 'actor', foreignKey: 'changed_by' })
    }
  }

  TicketHistory.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    ticket_id: { type: DataTypes.BIGINT, allowNull: false },
    changed_by: { type: DataTypes.BIGINT, allowNull: false },
    from_status: { type: DataTypes.INTEGER, allowNull: true },
    to_status: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.TEXT, allowNull: true },
  }, {
    sequelize,
    modelName: 'TicketHistory',
    underscored: true,
    paranoid: false,
    tableName: 'ticket_histories',
    createdAt: 'created_at',
    updatedAt: false,
  })

  return TicketHistory
}
