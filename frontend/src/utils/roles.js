export const ROLE_LABELS = { user: 'Usuario', agent: 'Agente', admin: 'Administrador' };
export const ROLE_OPTIONS = Object.keys(ROLE_LABELS);
export const formatRole = (role) => ROLE_LABELS[role] || 'Usuario';