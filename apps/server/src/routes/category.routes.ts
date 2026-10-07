import { Router } from 'express';
import { defaultCategoryController, CategoryController } from '../controllers/category.controller';

export function createCategoryRouter(controller: CategoryController = defaultCategoryController): Router {
  const router = Router();

  // Public/authenticated: Get active categories
  router.get('/', controller.getCategories);

  return router;
}

export default createCategoryRouter();
