import { Model } from 'sequelize'

export default (sequelize, DataTypes) => {
  class ActivityLog extends Model {
    static associate(models) {
      this.belongsTo(models.User, { as: 'user', foreignKey: 'user_id' })
    }
  }

  ActivityLog.init({
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: { type: DataTypes.BIGINT, allowNull: true },
    action: { type: DataTypes.STRING(100), allowNull: false },
    entity_type: { type: DataTypes.STRING(50), allowNull: true },
    entity_id: { type: DataTypes.BIGINT, allowNull: true },
    metadata: { type: DataTypes.JSONB, allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
  }, {
    sequelize,
    modelName: 'ActivityLog',
    underscored: true,
    paranoid: false,
    tableName: 'activity_logs',
    createdAt: 'created_at',
    updatedAt: false,
  })

  return ActivityLog
}
