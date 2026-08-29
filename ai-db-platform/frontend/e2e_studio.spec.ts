import { test, expect } from '@playwright/test';

test.describe('ATLAS Architecture Studio E2E Tests', () => {
  test('Frontend loads cleanly and renders root application structure', async ({ page }) => {
    // 1. Navigate to live Vite frontend preview server
    await page.goto('http://localhost:4173');
    
    // 2. Check title and root element presence
    await expect(page).toHaveTitle(/.*AI DB Platform|ATLAS|Architect.*/i);
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    
    console.log('✅ Playwright: Root page rendered cleanly without white screen crash!');
  });
});
