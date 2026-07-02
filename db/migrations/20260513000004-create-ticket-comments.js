module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ticket_comments', {
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
      ticket_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'tickets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      content: { type: Sequelize.TEXT, allowNull: false },
      created_by: { type: Sequelize.BIGINT, allowNull: true },
      updated_by: { type: Sequelize.BIGINT, allowNull: true },
      deleted_by: { type: Sequelize.BIGINT, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE },
      deleted_at: { allowNull: true, type: Sequelize.DATE },
    })

    await queryInterface.addIndex('ticket_comments', ['ticket_id'])
    await queryInterface.addIndex('ticket_comments', ['user_id'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('ticket_comments')
  },
}
