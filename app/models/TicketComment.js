import { Model } from 'sequelize'

export default (sequelize, DataTypes) => {
  class TicketComment extends Model {
    static associate(models) {
      this.belongsTo(models.Ticket, { as: 'ticket', foreignKey: 'ticket_id' })
      this.belongsTo(models.User, { as: 'author', foreignKey: 'user_id' })
    }
  }

  TicketComment.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    ticket_id: { type: DataTypes.BIGINT, allowNull: false },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    created_by: { type: DataTypes.BIGINT, allowNull: true },
    updated_by: { type: DataTypes.BIGINT, allowNull: true },
    deleted_by: { type: DataTypes.BIGINT, allowNull: true },
  }, {
    sequelize,
    modelName: 'TicketComment',
    underscored: true,
    paranoid: true,
    tableName: 'ticket_comments',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
  })

  return TicketComment
}
