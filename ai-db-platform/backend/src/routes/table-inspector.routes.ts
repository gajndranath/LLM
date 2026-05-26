import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireMinRole } from '../middleware/rbac.middleware';
import { getConnectionPool } from '../services/connection.service';
import { extractSchema } from '../services/schema.service';
import { executeQuery } from '../services/execution.service';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

const router = Router();
router.use(authenticate);

// GET /api/connections/:connectionId/tables/:tableName/data
router.get(
  '/:connectionId/tables/:tableName/data',
  requireMinRole('ANALYST'),
  asyncHandler(async (req: Request, res: Response) => {
    const { connectionId, tableName } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const search = req.query.search ? String(req.query.search).trim() : '';

    if (!connectionId || !tableName) {
      throw new ApiError(400, 'Connection ID and table name are required');
    }

    const pool = await getConnectionPool(connectionId, req.user!.userId);

    // 1. Get database schema to validate table existence
    const schema = await extractSchema(pool, connectionId);
    const matchedTable = schema.tables.find(
      (t) => t.table_name.toLowerCase() === tableName.toLowerCase()
    );

    if (!matchedTable) {
      throw new ApiError(404, `Table '${tableName}' not found in database schema`);
    }

    // 2. Safely construct the query using validated identifiers to prevent SQL injection
    // Standardize to use double quotes around table name & schema name
    const escapedSchema = `"${matchedTable.table_schema}"`;
    const escapedTable = `"${matchedTable.table_name}"`;

    let whereClause = '';
    let countParams: unknown[] = [];
    let dataParams: unknown[] = [limit, offset];

    if (search) {
      const searchVal = `%${search}%`;
      const searchConditions = matchedTable.columns.map((col, idx) => {
        // Cast column values to text to handle integer/uuid/date columns safely
        return `CAST("${col.column_name}" AS text) ILIKE $${idx + 3}`;
      });
      whereClause = `WHERE ${searchConditions.join(' OR ')}`;
      countParams = matchedTable.columns.map(() => searchVal);
      dataParams = [limit, offset, ...countParams];
    }

    // 3. Count total rows (with search filter if applicable)
    // Note: for COUNT query, since there are no limit/offset params, index matches search conditions starting at $1
    let countSql = `SELECT COUNT(*)::bigint as total FROM ${escapedSchema}.${escapedTable}`;
    if (search) {
      const countConditions = matchedTable.columns.map((col, idx) => {
        return `CAST("${col.column_name}" AS text) ILIKE $${idx + 1}`;
      });
      countSql += ` WHERE ${countConditions.join(' OR ')}`;
    }
    const countResult = await executeQuery(pool, countSql, search ? countParams : [], true);
    const totalCount = Number(countResult.rows[0]?.total || 0);

    // 4. Fetch page of rows (with search filter if applicable)
    const dataSql = `SELECT * FROM ${escapedSchema}.${escapedTable} ${whereClause} LIMIT $1 OFFSET $2`;
    const dataResult = await executeQuery(pool, dataSql, dataParams, true);

    return res.status(200).json(
      new ApiResponse(200, {
        rows: dataResult.rows,
        fields: dataResult.fields,
        total: totalCount,
        limit,
        offset,
      }, 'Table data fetched successfully')
    );
  })
);

export default router;
