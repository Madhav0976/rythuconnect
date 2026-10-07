import { Request, Response, NextFunction } from 'express';
import { defaultCategoryService, CategoryService } from '../services/category.service';

export class CategoryController {
  constructor(private categoryService: CategoryService = defaultCategoryService) {}

  /**
   * GET /api/categories
   * Returns list of active categories for farmer crop listing creation and marketplace filtering.
   */
  getCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await this.categoryService.getActiveCategories();
      res.status(200).json({
        success: true,
        message: 'Categories retrieved successfully',
        data: categories,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const defaultCategoryController = new CategoryController();
