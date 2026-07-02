import { Model } from 'sequelize'

export default (sequelize, DataTypes) => {
  class TicketAttachment extends Model {
    static associate(models) {
      this.belongsTo(models.Ticket, { as: 'ticket', foreignKey: 'ticket_id' })
    }
  }

  TicketAttachment.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    ticket_id: { type: DataTypes.BIGINT, allowNull: false },
    original_name: { type: DataTypes.STRING, allowNull: false },
    stored_name: { type: DataTypes.STRING, allowNull: false },
    mime_type: { type: DataTypes.STRING(100), allowNull: false },
    file_size: { type: DataTypes.INTEGER, allowNull: false },
  }, {
    sequelize,
    modelName: 'TicketAttachment',
    underscored: true,
    paranoid: false,
    tableName: 'ticket_attachments',
    createdAt: 'created_at',
    updatedAt: false,
  })

  return TicketAttachment
}
