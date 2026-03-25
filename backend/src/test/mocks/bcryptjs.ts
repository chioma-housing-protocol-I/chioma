export const hash = jest.fn(async () => 'hashed-password');
export const compare = jest.fn(async () => true);
export const genSalt = jest.fn(async () => 'salt');
