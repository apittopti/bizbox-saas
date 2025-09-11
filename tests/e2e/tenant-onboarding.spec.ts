/**
 * Tenant Onboarding E2E Tests
 * Tests the complete tenant onboarding flow from signup to first use
 */
import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';

test.describe('Tenant Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the landing page
    await page.goto('/');
  });

  test('should complete basic tenant signup flow', async ({ page }) => {
    const tenantData = {
      companyName: faker.company.name(),
      domain: faker.internet.domainWord(),
      adminEmail: faker.internet.email(),
      adminFirstName: faker.person.firstName(),
      adminLastName: faker.person.lastName(),
      password: 'SecurePass123!'
    };

    // Click signup button
    await page.click('[data-testid="signup-button"]');
    
    // Fill signup form
    await page.fill('[data-testid="company-name"]', tenantData.companyName);
    await page.fill('[data-testid="domain"]', tenantData.domain);
    await page.fill('[data-testid="admin-email"]', tenantData.adminEmail);
    await page.fill('[data-testid="admin-first-name"]', tenantData.adminFirstName);
    await page.fill('[data-testid="admin-last-name"]', tenantData.adminLastName);
    await page.fill('[data-testid="password"]', tenantData.password);
    await page.fill('[data-testid="confirm-password"]', tenantData.password);

    // Select plan
    await page.click('[data-testid="plan-basic"]');

    // Submit form
    await page.click('[data-testid="create-tenant-button"]');

    // Should redirect to verification page
    await expect(page).toHaveURL(/\/verify-email/);
    await expect(page.locator('[data-testid="verification-message"]')).toContainText(
      'Please check your email to verify your account'
    );

    // Simulate email verification (in real test, you'd check email)
    const verificationToken = 'test-verification-token';
    await page.goto(`/verify-email?token=${verificationToken}`);

    // Should redirect to onboarding dashboard
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.locator('[data-testid="welcome-message"]')).toContainText(
      `Welcome to BizBox, ${tenantData.adminFirstName}!`
    );
  });

  test('should guide through initial setup wizard', async ({ page }) => {
    // Skip to onboarding (assume user is verified and logged in)
    await page.goto('/onboarding');

    // Step 1: Business Information
    await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 1 of 4');
    
    await page.fill('[data-testid="business-description"]', 'A test business for BizBox');
    await page.selectOption('[data-testid="business-category"]', 'consulting');
    await page.fill('[data-testid="business-phone"]', '+1 (555) 123-4567');
    
    // Add business address
    await page.fill('[data-testid="business-address"]', '123 Test St');
    await page.fill('[data-testid="business-city"]', 'Test City');
    await page.selectOption('[data-testid="business-state"]', 'CA');
    await page.fill('[data-testid="business-zip"]', '12345');

    await page.click('[data-testid="next-step"]');

    // Step 2: Customize Appearance
    await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 2 of 4');
    
    // Upload logo
    await page.setInputFiles('[data-testid="logo-upload"]', './tests/fixtures/test-logo.png');
    
    // Select color scheme
    await page.click('[data-testid="color-scheme-blue"]');
    
    // Customize theme
    await page.selectOption('[data-testid="font-family"]', 'Inter');

    await page.click('[data-testid="next-step"]');

    // Step 3: Configure Features
    await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 3 of 4');
    
    // Enable website builder (should be pre-selected for basic plan)
    await expect(page.locator('[data-testid="feature-website-builder"]')).toBeChecked();
    
    // Basic plan shouldn't have booking option
    await expect(page.locator('[data-testid="feature-booking"]')).toBeDisabled();
    await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();

    await page.click('[data-testid="next-step"]');

    // Step 4: Create First Page
    await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 4 of 4');
    
    await page.fill('[data-testid="page-title"]', 'Welcome to My Business');
    await page.fill('[data-testid="page-description"]', 'This is our homepage description');
    
    // Select template
    await page.click('[data-testid="template-business"]');

    await page.click('[data-testid="complete-setup"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="setup-complete-message"]')).toBeVisible();
  });

  test('should create and preview first website page', async ({ page }) => {
    // Start from dashboard after onboarding
    await page.goto('/dashboard');

    // Navigate to website builder
    await page.click('[data-testid="nav-website"]');
    await expect(page).toHaveURL(/\/builder/);

    // Should see the created homepage
    await expect(page.locator('[data-testid="page-list"]')).toContainText('Welcome to My Business');

    // Click to edit the homepage
    await page.click('[data-testid="edit-homepage"]');
    await expect(page).toHaveURL(/\/builder\/pages\/.*/);

    // Website builder should load
    await expect(page.locator('[data-testid="builder-canvas"]')).toBeVisible();
    await expect(page.locator('[data-testid="builder-sidebar"]')).toBeVisible();

    // Add a new block
    await page.click('[data-testid="add-block"]');
    await page.click('[data-testid="block-heading"]');
    
    // Edit the heading
    await page.fill('[data-testid="heading-text"]', 'About Our Services');
    await page.selectOption('[data-testid="heading-level"]', 'h2');

    // Add paragraph block
    await page.click('[data-testid="add-block"]');
    await page.click('[data-testid="block-paragraph"]');
    await page.fill('[data-testid="paragraph-text"]', 'We provide excellent consulting services to help your business grow.');

    // Save changes
    await page.click('[data-testid="save-page"]');
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();

    // Preview the page
    await page.click('[data-testid="preview-page"]');
    
    // Should open preview in new tab
    const [previewPage] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('[data-testid="preview-page"]')
    ]);

    await previewPage.waitForLoadState();
    
    // Check preview content
    await expect(previewPage.locator('h1')).toContainText('Welcome to My Business');
    await expect(previewPage.locator('h2')).toContainText('About Our Services');
    await expect(previewPage.locator('p')).toContainText('We provide excellent consulting services');

    await previewPage.close();
  });

  test('should handle plan upgrade during onboarding', async ({ page }) => {
    await page.goto('/onboarding');

    // Navigate to features step
    await page.click('[data-testid="skip-to-features"]'); // Skip first steps

    // Try to enable booking (requires upgrade)
    await page.click('[data-testid="feature-booking"]');

    // Should show upgrade modal
    await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="upgrade-title"]')).toContainText('Upgrade Required');

    // View plan comparison
    await page.click('[data-testid="compare-plans"]');
    await expect(page.locator('[data-testid="plan-comparison"]')).toBeVisible();

    // Select Professional plan
    await page.click('[data-testid="select-professional"]');

    // Should show payment form
    await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();

    // Fill payment information (using test card)
    await page.fill('[data-testid="card-number"]', '4242424242424242');
    await page.fill('[data-testid="card-expiry"]', '12/25');
    await page.fill('[data-testid="card-cvc"]', '123');
    await page.fill('[data-testid="cardholder-name"]', 'Test User');

    await page.click('[data-testid="complete-upgrade"]');

    // Should process payment and upgrade plan
    await expect(page.locator('[data-testid="upgrade-success"]')).toBeVisible();
    
    // Booking feature should now be available
    await expect(page.locator('[data-testid="feature-booking"]')).toBeEnabled();
    await expect(page.locator('[data-testid="feature-ecommerce"]')).toBeEnabled();
  });

  test('should validate domain availability during signup', async ({ page }) => {
    await page.goto('/signup');

    // Try to use an existing domain
    await page.fill('[data-testid="domain"]', 'existing-domain');
    await page.blur('[data-testid="domain"]');

    // Should show domain unavailable message
    await expect(page.locator('[data-testid="domain-error"]')).toContainText('Domain is already taken');
    await expect(page.locator('[data-testid="domain-suggestions"]')).toBeVisible();

    // Try a suggested domain
    await page.click('[data-testid="suggested-domain"]:first-child');
    
    // Should show domain available
    await expect(page.locator('[data-testid="domain-success"]')).toContainText('Domain is available');

    // Should be able to proceed
    await expect(page.locator('[data-testid="create-tenant-button"]')).toBeEnabled();
  });

  test('should handle errors gracefully during onboarding', async ({ page }) => {
    await page.goto('/onboarding');

    // Simulate network error during save
    await page.route('**/api/tenant/settings', route => route.abort());

    await page.fill('[data-testid="business-description"]', 'Test description');
    await page.click('[data-testid="next-step"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Something went wrong');
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Retry should work
    await page.unroute('**/api/tenant/settings');
    await page.click('[data-testid="retry-button"]');

    // Should proceed to next step
    await expect(page.locator('[data-testid="step-indicator"]')).toContainText('Step 2 of 4');
  });

  test('should provide help and support during onboarding', async ({ page }) => {
    await page.goto('/onboarding');

    // Help button should be visible
    await expect(page.locator('[data-testid="help-button"]')).toBeVisible();

    // Click help
    await page.click('[data-testid="help-button"]');
    await expect(page.locator('[data-testid="help-panel"]')).toBeVisible();

    // Should show contextual help
    await expect(page.locator('[data-testid="help-content"]')).toContainText('Business Information');

    // Start live chat
    await page.click('[data-testid="start-chat"]');
    await expect(page.locator('[data-testid="chat-widget"]')).toBeVisible();

    // Should be able to send message
    await page.fill('[data-testid="chat-input"]', 'I need help with onboarding');
    await page.click('[data-testid="send-message"]');

    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('I need help with onboarding');
  });

  test('should save progress and allow resuming onboarding', async ({ page }) => {
    await page.goto('/onboarding');

    // Fill out first step
    await page.fill('[data-testid="business-description"]', 'My test business');
    await page.selectOption('[data-testid="business-category"]', 'consulting');
    
    // Progress should be saved automatically
    await expect(page.locator('[data-testid="auto-save-indicator"]')).toBeVisible();

    // Refresh page
    await page.reload();

    // Should resume from where we left off
    await expect(page.locator('[data-testid="business-description"]')).toHaveValue('My test business');
    await expect(page.locator('[data-testid="business-category"]')).toHaveValue('consulting');

    // Navigate away and back
    await page.goto('/dashboard');
    await page.goto('/onboarding');

    // Should still have saved data
    await expect(page.locator('[data-testid="business-description"]')).toHaveValue('My test business');

    // Should show resume banner
    await expect(page.locator('[data-testid="resume-banner"]')).toContainText('Continue where you left off');
  });
});