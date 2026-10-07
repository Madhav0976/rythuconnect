import { apiClient, ApiError } from '@/lib/api/client';
import {
  Category,
  CreateListingRequest,
  UpdateListingRequest,
  PopulatedCropListing,
  FarmerDashboardStats,
  ListingStatus,
  ApiResponse,
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
};
