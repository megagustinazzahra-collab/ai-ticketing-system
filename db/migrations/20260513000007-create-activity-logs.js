module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('activity_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      uuid: {
        allowNull: false,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      action: { type: Sequelize.STRING(100), allowNull: false },
      entity_type: { type: Sequelize.STRING(50), allowNull: true },
      entity_id: { type: Sequelize.BIGINT, allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
    })

    await queryInterface.addIndex('activity_logs', ['user_id'])
    await queryInterface.addIndex('activity_logs', ['action'])
    await queryInterface.addIndex('activity_logs', ['entity_type', 'entity_id'])
    await queryInterface.addIndex('activity_logs', ['created_at'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('activity_logs')
  },
}
