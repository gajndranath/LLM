import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CIMigrationService } from '../services/ci.service';
import { validateRequest } from '../middleware/validation.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';

const router = Router();

const auditMigrationSchema = z.object({
  sqlContent: z.string().min(1, "sqlContent is required").max(10_000_000, "Migration file exceeds 10MB limit"),
  repository: z.string().optional(),
  pullRequest: z.string().optional(),
  branch: z.string().optional()
});

// POST /api/ci/audit-migration
router.post(
  '/audit-migration',
  validateRequest(auditMigrationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { sqlContent, repository, pullRequest } = req.body;

    const result = await CIMigrationService.auditMigrationSQL(sqlContent, repository, pullRequest);

    const statusCode = result.passed ? 200 : 422;
    return res.status(statusCode).json(
      new ApiResponse(
        statusCode,
        result,
        result.passed
          ? "Migration safety checks passed"
          : `Migration checks failed with ${result.criticalIssues} critical violations (Score: ${result.score}/100)`
      )
    );
  })
);

export default router;
