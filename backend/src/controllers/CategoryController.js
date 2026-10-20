import * as categoryModel from '../models/Category.js';

export async function list(_req, res, next) {
  try { res.json(await categoryModel.listCategories()); } catch (error) { next(error); }
}

export async function create(req, res, next) {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: 'El nombre de la categoría es obligatorio' });
    res.status(201).json(await categoryModel.createCategory(name));
  } catch (error) { next(error); }
}

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

export async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'Categoría no válida' });
    const result = await categoryModel.deleteCategory(id);
    if (result === 'deleted') return res.json({ message: 'Categoría eliminada' });
    if (result === 'not_found') return res.status(404).json({ message: 'La categoría no existe o ya fue eliminada' });
    if (result === 'protected') return res.status(409).json({ message: '«General» es la categoría por defecto y no se puede eliminar.' });
    const uses = [result.tickets && plural(result.tickets, 'ticket', 'tickets'), result.articles && plural(result.articles, 'artículo', 'artículos')].filter(Boolean).join(' y ');
    res.status(409).json({ message: `No se puede eliminar: la usan ${uses}. Cambia o elimina esos registros primero.` });
  } catch (error) { next(error); }
}
