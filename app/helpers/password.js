import bcryptjs from 'bcryptjs'

const SALT_ROUNDS = 12

export const hashPassword = (password) => bcryptjs.hash(password, SALT_ROUNDS)

export const comparePassword = (password, hash) => bcryptjs.compare(password, hash)
