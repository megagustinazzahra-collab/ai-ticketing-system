module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('notifications', {
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
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      ticket_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: { model: 'tickets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      title: { type: Sequelize.STRING, allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      read_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
    })

    await queryInterface.addIndex('notifications', ['user_id'])
    await queryInterface.addIndex('notifications', ['is_read'])
    await queryInterface.addIndex('notifications', ['ticket_id'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('notifications')
  },
}
