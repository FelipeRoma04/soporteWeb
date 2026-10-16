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