import { Request, Response, NextFunction } from 'express';
import {
  defaultMarketplaceService,
  MarketplaceService,
  MarketplaceNotFoundError,
  MarketplaceValidationError,
} from '../services/marketplace.service';
import { MarketplaceQuery } from '@rythuconnect/types';

function getParamId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService = defaultMarketplaceService) {}

  /**
   * GET /api/marketplace/listings
   * Retrieves paginated available crop listings for buyer marketplace discovery.
   */
  getListings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query: MarketplaceQuery = {
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        categoryId: typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined,
        minPrice: req.query.minPrice !== undefined && req.query.minPrice !== '' ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice !== undefined && req.query.maxPrice !== '' ? Number(req.query.maxPrice) : undefined,
        location: typeof req.query.location === 'string' ? req.query.location : undefined,
        sort: typeof req.query.sort === 'string' ? (req.query.sort as any) : undefined,
        page: req.query.page !== undefined && req.query.page !== '' ? Number(req.query.page) : undefined,
        limit: req.query.limit !== undefined && req.query.limit !== '' ? Number(req.query.limit) : undefined,
      };

      const result = await this.marketplaceService.getMarketplaceListings(query);

      res.status(200).json({
        success: true,
        message: 'Marketplace listings retrieved successfully',
        data: result,
      });
    } catch (err) {
      if (err instanceof MarketplaceValidationError) {
        res.status(400).json({
          success: false,
          message: err.message,
        });
        return;
      }
      next(err);
    }
  };

  /**
   * GET /api/marketplace/listings/:id
   * Retrieves single available crop listing by ID for buyer detail screen.
   */
  getListingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParamId(req);
      const listing = await this.marketplaceService.getMarketplaceListingById(id);

      res.status(200).json({
        success: true,
        message: 'Marketplace listing retrieved successfully',
        data: listing,
      });
    } catch (err) {
      if (err instanceof MarketplaceNotFoundError) {
        res.status(404).json({
          success: false,
          message: err.message,
        });
        return;
      }
      next(err);
    }
  };

  /**
   * GET /api/marketplace/listings/:id/contact
   * Retrieves verified farmer contact phone number for authorized buyers to initiate WhatsApp chat.
   */
  getListingContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getParamId(req);
      const contactInfo = await this.marketplaceService.getListingContact(id);

      res.status(200).json({
        success: true,
        message: 'Farmer contact details retrieved successfully',
        data: contactInfo,
      });
    } catch (err) {
      if (err instanceof MarketplaceNotFoundError) {
        res.status(404).json({
          success: false,
          message: err.message,
        });
        return;
      }
      next(err);
    }
  };
}

export const defaultMarketplaceController = new MarketplaceController();
