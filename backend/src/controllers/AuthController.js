import * as authService from '../services/AuthService.js';
export async function register(req, res, next) { try { res.status(201).json(await authService.register(req.body)); } catch (error) { next(error); } }
export async function login(req, res, next) { try { res.json(await authService.login(req.body)); } catch (error) { next(error); } }
export function me(req, res) { res.json(req.user); }
export async function changePassword(req, res, next) { try { const { token } = await authService.changePassword(req.user.id, req.body); res.json({ message: 'Contraseña actualizada', token }); } catch (error) { next(error); } }