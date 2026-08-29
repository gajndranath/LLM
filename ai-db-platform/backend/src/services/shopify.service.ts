import { dbQuery } from '../config/database';
import { env } from '../config/env';

export interface ShopifyStoreConfig {
  shopDomain: string;
  accessToken: string;
  currency: string;
  timezone: string;
}

export interface EcomAnalyticsQueryResponse {
  sql: string;
  chartType: 'BAR' | 'LINE' | 'DONUT' | 'TABLE';
  summary: string;
  data: any[];
}

export class ShopifyAnalyticsService {
  /**
   * Initializes high-performance e-commerce tables in tenant database.
   */
  public static async initShopifyTables(): Promise<void> {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS shopify_stores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        shop_domain VARCHAR(255) NOT NULL UNIQUE,
        currency VARCHAR(8) DEFAULT 'USD',
        timezone VARCHAR(64) DEFAULT 'UTC',
        last_sync_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shopify_orders (
        id VARCHAR(64) PRIMARY KEY,
        store_domain VARCHAR(255) NOT NULL,
        order_number VARCHAR(32) NOT NULL,
        total_price NUMERIC(12, 2) NOT NULL,
        subtotal_price NUMERIC(12, 2),
        total_tax NUMERIC(12, 2) DEFAULT 0.00,
        total_refunds NUMERIC(12, 2) DEFAULT 0.00,
        total_discounts NUMERIC(12, 2) DEFAULT 0.00,
        currency VARCHAR(8) DEFAULT 'USD',
        financial_status VARCHAR(32) NOT NULL,
        customer_id VARCHAR(64),
        processed_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS shopify_line_items (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) REFERENCES shopify_orders(id) ON DELETE CASCADE,
        product_id VARCHAR(64),
        title VARCHAR(255) NOT NULL,
        quantity INT NOT NULL,
        price NUMERIC(12, 2) NOT NULL,
        total_discount NUMERIC(12, 2) DEFAULT 0.00
      );

      CREATE TABLE IF NOT EXISTS shopify_customers (
        id VARCHAR(64) PRIMARY KEY,
        store_domain VARCHAR(255) NOT NULL,
        email_hash VARCHAR(64),
        orders_count INT DEFAULT 0,
        total_spent NUMERIC(12, 2) DEFAULT 0.00,
        city VARCHAR(100),
        country VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shopify_orders_processed ON shopify_orders(processed_at);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shopify_orders_store ON shopify_orders(store_domain);
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shopify_line_items_order ON shopify_line_items(order_id);
    `);
  }

  /**
   * Generates e-commerce tailored SQL queries from natural language with strict Read-Only guardrails.
   */
  public static async generateEcomSQL(
    userPrompt: string,
    shopDomain: string
  ): Promise<EcomAnalyticsQueryResponse> {
    const prompt = userPrompt.toLowerCase();
    let generatedSQL = '';
    let chartType: 'BAR' | 'LINE' | 'DONUT' | 'TABLE' = 'TABLE';
    let summary = '';

    // E-Commerce Semantic Intent Detection
    if (prompt.includes('top') || prompt.includes('product') || prompt.includes('selling')) {
      chartType = 'BAR';
      summary = 'Top revenue-generating products ordered by net sales volume.';
      generatedSQL = `
        SELECT 
          li.title AS product_name,
          SUM(li.quantity) AS total_units_sold,
          SUM(li.quantity * li.price) AS total_revenue
        FROM shopify_line_items li
        JOIN shopify_orders o ON o.id = li.order_id
        WHERE o.store_domain = '${shopDomain}' AND o.financial_status IN ('paid', 'partially_refunded')
        GROUP BY li.title
        ORDER BY total_revenue DESC
        LIMIT 10;
      `.trim();
    } else if (prompt.includes('trend') || prompt.includes('daily') || prompt.includes('month') || prompt.includes('sales')) {
      chartType = 'LINE';
      summary = 'Daily net sales trend over the last 30 days.';
      generatedSQL = `
        SELECT 
          DATE_TRUNC('day', processed_at) AS order_date,
          SUM(total_price - total_refunds) AS net_revenue,
          COUNT(id) AS total_orders
        FROM shopify_orders
        WHERE store_domain = '${shopDomain}'
          AND processed_at >= NOW() - INTERVAL '30 days'
          AND financial_status IN ('paid', 'partially_refunded')
        GROUP BY order_date
        ORDER BY order_date ASC;
      `.trim();
    } else if (prompt.includes('customer') || prompt.includes('repeat') || prompt.includes('cohort')) {
      chartType = 'DONUT';
      summary = 'Repeat vs first-time customer revenue contribution.';
      generatedSQL = `
        SELECT 
          CASE WHEN orders_count > 1 THEN 'Repeat Customers' ELSE 'First-Time Customers' END AS customer_segment,
          COUNT(id) AS total_customers,
          SUM(total_spent) AS total_revenue
        FROM shopify_customers
        WHERE store_domain = '${shopDomain}'
        GROUP BY customer_segment;
      `.trim();
    } else {
      chartType = 'TABLE';
      summary = 'Recent store orders and financial fulfillment status.';
      generatedSQL = `
        SELECT 
          order_number,
          total_price,
          financial_status,
          processed_at
        FROM shopify_orders
        WHERE store_domain = '${shopDomain}'
        ORDER BY processed_at DESC
        LIMIT 20;
      `.trim();
    }

    // Execute generated query under strict Read-Only Sandbox transaction
    const executionResult = await dbQuery(
      `BEGIN;
       SET TRANSACTION READ ONLY;
       SET LOCAL statement_timeout = '5000ms';
       ${generatedSQL}
       COMMIT;`
    );

    // Extract table rows safely
    const data = Array.isArray(executionResult) ? executionResult[executionResult.length - 2]?.rows || [] : executionResult?.rows || [];

    return {
      sql: generatedSQL,
      chartType,
      summary,
      data
    };
  }
}
