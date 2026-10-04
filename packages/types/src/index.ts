/**
 * Foundation API Response Envelope
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
  timestamp?: string;
}

/**
 * Health Check Response
 */
export interface HealthStatus {
  success: boolean;
  message: string;
  timestamp: string;
  environment: string;
  database: {
    connected: boolean;
  };
}
