export const hash = jest.fn().mockResolvedValue('$2a$12$hashedPassword');
export const compare = jest.fn().mockResolvedValue(true);
export const genSalt = jest.fn().mockResolvedValue('$2a$12$salt');
export default {
  hash,
  compare,
  genSalt,
};
