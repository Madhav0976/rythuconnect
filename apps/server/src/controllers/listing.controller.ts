import { Request, Response, NextFunction } from 'express';
import {
  defaultListingService,
  ListingService,
  ListingForbiddenError,
  ListingNotFoundError,
  ListingValidationError,
} from '../services/listing.service';
import { ListingStatus } from '@rythuconnect/types';

function getParamId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

export class ListingController {
  constructor(private listingService: ListingService = defaultListingService) {}

  /**
   * POST /api/listings
   * Creates a new crop listing for the authenticated farmer.
   */
  createListing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmerId = req.user!.userId;
      const listing = await this.listingService.createListing(farmerId, req.body);

      res.status(201).json({
        success: true,
        message: 'Crop listing created successfully',
        data: listing,
      });
    } catch (err) {
      if (err instanceof ListingValidationError) {
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
   * GET /api/listings/my
   * Retrieves all listings created by the authenticated farmer.
   */
  getMyListings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmerId = req.user!.userId;
      const statusFilter = req.query.status as ListingStatus | undefined;
      const listings = await this.listingService.getFarmerListings(farmerId, statusFilter);

      res.status(200).json({
        success: true,
        message: 'Farmer listings retrieved successfully',
        data: listings,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/listings/my/stats
   * Retrieves aggregate listing statistics for the farmer dashboard.
   */
  getMyStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmerId = req.user!.userId;
      const stats = await this.listingService.getFarmerDashboardStats(farmerId);

      res.status(200).json({
        success: true,
        message: 'Farmer dashboard statistics retrieved successfully',
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/listings/:id
   * Retrieves a single listing by its ID.
   */
  getListingById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const listing = await this.listingService.getListingById(getParamId(req));

      res.status(200).json({
        success: true,
        message: 'Crop listing retrieved successfully',
        data: listing,
      });
    } catch (err) {
      if (err instanceof ListingNotFoundError) {
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
   * PATCH /api/listings/:id
   * Updates an existing listing owned by the authenticated farmer.
   */
  updateListing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmerId = req.user!.userId;
      const listing = await this.listingService.updateListing(getParamId(req), farmerId, req.body);

      res.status(200).json({
        success: true,
        message: 'Crop listing updated successfully',
        data: listing,
      });
    } catch (err) {
      if (err instanceof ListingForbiddenError) {
        res.status(403).json({
          success: false,
          message: err.message,
        });
        return;
      }
      if (err instanceof ListingNotFoundError) {
        res.status(404).json({
          success: false,
          message: err.message,
        });
        return;
      }
      if (err instanceof ListingValidationError) {
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
   * PATCH /api/listings/:id/status
   * Transitions listing status (e.g. AVAILABLE -> SOLD).
   */
  updateListingStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const farmerId = req.user!.userId;
      const { status } = req.body;
      const listing = await this.listingService.updateListingStatus(
        getParamId(req),
        farmerId,
        status
      );

      res.status(200).json({
        success: true,
        message: `Crop listing marked as ${status} successfully`,
        data: listing,
      });
    } catch (err) {
      if (err instanceof ListingForbiddenError) {
        res.status(403).json({
          success: false,
          message: err.message,
        });
        return;
      }
      if (err instanceof ListingNotFoundError) {
        res.status(404).json({
          success: false,
          message: err.message,
        });
        return;
      }
      if (err instanceof ListingValidationError) {
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
   * DELETE /api/listings/:id
   * Deactivates/deletes a crop listing owned by the authenticated farmer.
   */
  deleteListing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmerId = req.user!.userId;
      await this.listingService.deleteListing(getParamId(req), farmerId);

      res.status(200).json({
        success: true,
        message: 'Crop listing deleted successfully',
      });
    } catch (err) {
      if (err instanceof ListingForbiddenError) {
        res.status(403).json({
          success: false,
          message: err.message,
        });
        return;
      }
      if (err instanceof ListingNotFoundError) {
        res.status(404).json({
          success: false,
          message: err.message,
        });
        return;
      }
      if (err instanceof ListingValidationError) {
        res.status(400).json({
          success: false,
          message: err.message,
        });
        return;
      }
      next(err);
    }
  };
}

export const defaultListingController = new ListingController();
