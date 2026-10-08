import { apiClient, ApiError } from '@/lib/api/client';
import {
  ApiResponse,
  DeliveryEstimateRequest,
  DeliveryEstimateResult,
} from '@rythuconnect/types';

export interface DeliveryServiceResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field?: string; message: string }>;
}

export const deliveryService = {
  /**
   * Calls the backend delivery estimation engine to calculate distance and charges.
   * Authoritative calculation performed on server.
   */
  async estimateDelivery(
    payload: DeliveryEstimateRequest
  ): Promise<DeliveryServiceResult<DeliveryEstimateResult>> {
    try {
      const res = await apiClient<ApiResponse<DeliveryEstimateResult>>(
        '/delivery/estimate',
        {
          method: 'POST',
          body: payload,
        }
      );

      return {
        success: true,
        message: res.message || 'Delivery estimated successfully',
        data: res.data,
      };
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const errorData = err.data as Record<string, unknown> | undefined;
        return {
          success: false,
          message: err.message || 'Failed to estimate delivery',
          errors: errorData?.errors as Array<{ field?: string; message: string }> | undefined,
        };
      }

      return {
        success: false,
        message: 'Network error occurred while estimating delivery. Please try again.',
      };
    }
  },
};
