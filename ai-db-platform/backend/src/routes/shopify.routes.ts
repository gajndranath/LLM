import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware';
import { ShopifyAnalyticsService } from '../services/shopify.service';
import { validateRequest } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();

router.use(authenticate);

const ecomQuerySchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(1000),
  shopDomain: z.string().min(1, "Shop domain is required")
});

// POST /api/shopify/query - Text-to-SQL E-commerce Analytics
router.post(
  '/query',
  validateRequest(ecomQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { prompt, shopDomain } = req.body;

    const result = await ShopifyAnalyticsService.generateEcomSQL(prompt, shopDomain);

    return res.status(200).json(
      new ApiResponse(200, result, "E-Commerce analytics generated successfully")
    );
  })
);

export default router;
