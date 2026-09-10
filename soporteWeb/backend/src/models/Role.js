export const ROLES = Object.freeze({
  USER: 'user',
  AGENT: 'agent',
  ADMIN: 'admin'
});

export const STAFF_ROLES = Object.freeze([ROLES.AGENT, ROLES.ADMIN]);
export const ALL_ROLES = Object.freeze(Object.values(ROLES));
