import { Request, Response, NextFunction } from 'express';
import {
  DeliveryService,
  defaultDeliveryService,
  DeliveryNotFoundError,
  DeliveryValidationError,
} from '../services/delivery.service';

export class DeliveryController {
  constructor(private deliveryService: DeliveryService = defaultDeliveryService) {}

  estimateDelivery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.deliveryService.estimateDelivery(req.body);

      res.status(200).json({
        success: true,
        message: 'Delivery estimation calculated successfully',
        data: result,
      });
    } catch (err: any) {
      if (err instanceof DeliveryNotFoundError) {
        res.status(404).json({
          success: false,
          message: err.message,
        });
        return;
      }

      if (err instanceof DeliveryValidationError) {
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
export const defaultDeliveryController = new DeliveryController();
