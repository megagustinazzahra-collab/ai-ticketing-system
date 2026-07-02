module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
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
      name: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      email: {
        allowNull: false,
        type: Sequelize.STRING,
        unique: true,
      },
      password: {
        allowNull: false,
        type: Sequelize.STRING,
      },
      hospital_name: {
        allowNull: true,
        type: Sequelize.STRING,
      },
      phone: {
        allowNull: true,
        type: Sequelize.STRING(20),
      },
      role_id: {
        allowNull: false,
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      is_active: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_by: { type: Sequelize.BIGINT, allowNull: true },
      updated_by: { type: Sequelize.BIGINT, allowNull: true },
      deleted_by: { type: Sequelize.BIGINT, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE },
      deleted_at: { allowNull: true, type: Sequelize.DATE },
    })

    await queryInterface.addIndex('users', ['email'])
    await queryInterface.addIndex('users', ['role_id'])
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('users')
  },
}
