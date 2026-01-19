// // Export both type and value
// export type Role = 'ADMIN' | 'USER' | 'MODERATOR';
// export const Role = {
//   ADMIN: 'ADMIN' as Role,
//   USER: 'USER' as Role,
//   MODERATOR: 'MODERATOR' as Role,
// } as const;
export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
  SELLER = 'SELLER',
  CUSTOMER = 'CUSTOMER',
  MODERATOR = 'MODERATOR',
}

