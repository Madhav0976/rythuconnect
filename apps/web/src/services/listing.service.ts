import { apiClient, ApiError } from '@/lib/api/client';
import {
  Category,
  CreateListingRequest,
  UpdateListingRequest,
  PopulatedCropListing,
  FarmerDashboardStats,
  ListingStatus,
  ApiResponse,
  MarketplaceListing,
  MarketplaceQuery,
  PaginatedMarketplaceListings,
  ListingContactInfo,
} from '@rythuconnect/types';

export interface ListingServiceResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field?: string; message: string }>;
}

export const listingService = {
  /**
   * Retrieves active categories for crop listing selection.
   */
  async getCategories(): Promise<Category[]> {
    try {
      const res = await apiClient<ApiResponse<Category[]>>('/categories', {
        method: 'GET',
      });
      return res.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Creates a new crop listing for the authenticated farmer.
   */
  async createListing(
    payload: CreateListingRequest
  ): Promise<ListingServiceResult<PopulatedCropListing>> {
    try {
      const res = await apiClient<ApiResponse<PopulatedCropListing>>('/listings', {
        method: 'POST',
        body: payload,
      });

      return {
        success: true,
        message: res.message || 'Crop listing created successfully',
        data: res.data,
      };
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const errorData = err.data as Record<string, unknown> | undefined;
        return {
          success: false,
          message: err.message,
          errors: errorData?.errors as Array<{ field?: string; message: string }> | undefined,
        };
      }
      return {
        success: false,
        message: 'Network error occurred while creating listing. Please try again.',
      };
    }
  },

  /**
   * Retrieves all listings created by the authenticated farmer.
   */
  async getMyListings(statusFilter?: ListingStatus): Promise<PopulatedCropListing[]> {
    try {
      const endpoint = statusFilter ? `/listings/my?status=${statusFilter}` : '/listings/my';
      const res = await apiClient<ApiResponse<PopulatedCropListing[]>>(endpoint, {
        method: 'GET',
      });
      return res.data || [];
    } catch {
      return [];
    }
  },

  /**
   * Retrieves summary counts for the farmer dashboard.
   */
  async getMyStats(): Promise<FarmerDashboardStats> {
    try {
      const res = await apiClient<ApiResponse<FarmerDashboardStats>>('/listings/my/stats', {
        method: 'GET',
      });
      return (
        res.data || {
          totalListings: 0,
          activeListings: 0,
          soldListings: 0,
          expiredListings: 0,
        }
      );
    } catch {
      return {
        totalListings: 0,
        activeListings: 0,
        soldListings: 0,
        expiredListings: 0,
      };
    }
  },

  /**
   * Retrieves a single listing by its ID.
   */
  async getListingById(id: string): Promise<PopulatedCropListing | null> {
    try {
      const res = await apiClient<ApiResponse<PopulatedCropListing>>(`/listings/${id}`, {
        method: 'GET',
      });
      return res.data || null;
    } catch {
      return null;
    }
  },

  /**
   * Updates an existing crop listing owned by the farmer.
   */
  async updateListing(
    id: string,
    payload: UpdateListingRequest
  ): Promise<ListingServiceResult<PopulatedCropListing>> {
    try {
      const res = await apiClient<ApiResponse<PopulatedCropListing>>(`/listings/${id}`, {
        method: 'PATCH',
        body: payload,
      });

      return {
        success: true,
        message: res.message || 'Crop listing updated successfully',
        data: res.data,
      };
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const errorData = err.data as Record<string, unknown> | undefined;
        return {
          success: false,
          message: err.message,
          errors: errorData?.errors as Array<{ field?: string; message: string }> | undefined,
        };
      }
      return {
        success: false,
        message: 'Network error occurred while updating listing. Please try again.',
      };
    }
  },

  /**
   * Marks an available crop listing as SOLD.
   */
  async markListingSold(id: string): Promise<ListingServiceResult<PopulatedCropListing>> {
    try {
      const res = await apiClient<ApiResponse<PopulatedCropListing>>(`/listings/${id}/status`, {
        method: 'PATCH',
        body: { status: ListingStatus.SOLD },
      });

      return {
        success: true,
        message: res.message || 'Crop listing marked as SOLD successfully',
        data: res.data,
      };
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        return {
          success: false,
          message: err.message,
        };
      }
      return {
        success: false,
        message: 'Failed to update listing status. Please try again.',
      };
    }
  },

  /**
   * Deletes / removes a crop listing owned by the farmer.
   */
  async deleteListing(id: string): Promise<ListingServiceResult<void>> {
    try {
      const res = await apiClient<ApiResponse<void>>(`/listings/${id}`, {
        method: 'DELETE',
      });

      return {
        success: true,
        message: res.message || 'Crop listing deleted successfully',
      };
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        return {
          success: false,
          message: err.message,
        };
      }
      return {
        success: false,
        message: 'Failed to delete listing. Please try again.',
      };
    }
  },

  /**
   * Retrieves paginated available crop listings for buyer marketplace discovery.
   */
  async getMarketplaceListings(
    query: MarketplaceQuery = {}
  ): Promise<PaginatedMarketplaceListings> {
    try {
      const params: Record<string, string | number | undefined> = {};
      if (query.search) params.search = query.search;
      if (query.categoryId) params.categoryId = query.categoryId;
      if (query.minPrice !== undefined && query.minPrice !== null && Number.isFinite(query.minPrice)) {
        params.minPrice = query.minPrice;
      }
      if (query.maxPrice !== undefined && query.maxPrice !== null && Number.isFinite(query.maxPrice)) {
        params.maxPrice = query.maxPrice;
      }
      if (query.location) params.location = query.location;
      if (query.sort) params.sort = query.sort;
      if (query.page) params.page = query.page;
      if (query.limit) params.limit = query.limit;

      const res = await apiClient<ApiResponse<PaginatedMarketplaceListings>>(
        '/marketplace/listings',
        {
          method: 'GET',
          params,
        }
      );

      return (
        res.data || {
          items: [],
          page: 1,
          limit: 12,
          total: 0,
          totalPages: 0,
        }
      );
    } catch {
      return {
        items: [],
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
      };
    }
  },

  /**
   * Retrieves single available crop listing by ID for buyer detail screen.
   */
  async getMarketplaceListingById(id: string): Promise<MarketplaceListing | null> {
    try {
      const res = await apiClient<ApiResponse<MarketplaceListing>>(
        `/marketplace/listings/${id}`,
        {
          method: 'GET',
        }
      );
      return res.data || null;
    } catch {
      return null;
    }
  },

  /**
   * Retrieves verified farmer contact details for authorized buyer WhatsApp contact.
   */
  async getListingContact(id: string): Promise<ListingContactInfo | null> {
    try {
      const res = await apiClient<ApiResponse<ListingContactInfo>>(
        `/marketplace/listings/${id}/contact`,
        {
          method: 'GET',
        }
      );
      return res.data || null;
    } catch {
      return null;
    }
  },
};
