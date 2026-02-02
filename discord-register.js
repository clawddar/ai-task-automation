const { chromium } = require('playwright');
const fs = require('fs');

const EMAIL = 'clawddar@gmail.com';
const USERNAME = 'Clawddar';
const PASSWORD = 'Cl4wdd4r_D1sc0rd_2026!';
const DISPLAY_NAME = 'Clawddar 🐾';

async function register() {
    console.log('Launching browser...');
    const browser = await chromium.launch({ 
        headless: true,  // Running headless, will use screenshots
        slowMo: 500 
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    try {
        console.log('Going to Discord register page...');
        await page.goto('https://discord.com/register', { waitUntil: 'networkidle' });
        
        // Take screenshot of initial page
        await page.screenshot({ path: '/tmp/discord-1-initial.png' });
        console.log('Screenshot saved: /tmp/discord-1-initial.png');
        
        // Wait a moment for page to fully load
        await page.waitForTimeout(2000);
        
        // Fill in email
        console.log('Filling email...');
        await page.fill('input[name="email"]', EMAIL);
        
        // Fill display name if field exists
        const displayNameField = await page.$('input[name="global_name"]');
        if (displayNameField) {
            console.log('Filling display name...');
            await page.fill('input[name="global_name"]', DISPLAY_NAME);
        }
        
        // Fill username
        console.log('Filling username...');
        await page.fill('input[name="username"]', USERNAME);
        
        // Fill password
        console.log('Filling password...');
        await page.fill('input[name="password"]', PASSWORD);
        
        // Date of birth - need to select from dropdowns
        console.log('Filling date of birth...');
        // Month
        const monthSelect = await page.$('select:has-text("Month")') || await page.$('div[class*="inputMonth"]');
        if (monthSelect) {
            await monthSelect.click();
            await page.waitForTimeout(300);
            await page.click('text=January');
        }
        
        // Day
        const daySelect = await page.$('select:has-text("Day")') || await page.$('div[class*="inputDay"]');
        if (daySelect) {
            await daySelect.click();
            await page.waitForTimeout(300);
            await page.click('text=15');
        }
        
        // Year
        const yearSelect = await page.$('select:has-text("Year")') || await page.$('div[class*="inputYear"]');
        if (yearSelect) {
            await yearSelect.click();
            await page.waitForTimeout(300);
            await page.click('text=1995');
        }
        
        // Screenshot after filling form
        await page.screenshot({ path: '/tmp/discord-2-filled.png' });
        console.log('Screenshot saved: /tmp/discord-2-filled.png');
        
        // Terms checkbox if exists
        const termsCheckbox = await page.$('input[type="checkbox"]');
        if (termsCheckbox) {
            await termsCheckbox.click();
        }
        
        // Click continue/register button
        console.log('Looking for submit button...');
        const submitButton = await page.$('button[type="submit"]') || await page.$('button:has-text("Continue")');
        if (submitButton) {
            await submitButton.click();
            console.log('Clicked submit button');
        }
        
        // Wait for response/CAPTCHA
        await page.waitForTimeout(3000);
        
        // Screenshot to see what happened (likely CAPTCHA)
        await page.screenshot({ path: '/tmp/discord-3-after-submit.png' });
        console.log('Screenshot saved: /tmp/discord-3-after-submit.png');
        
        // Check for CAPTCHA iframe
        const captchaFrame = await page.$('iframe[src*="hcaptcha"]') || await page.$('iframe[src*="recaptcha"]');
        if (captchaFrame) {
            console.log('CAPTCHA detected! Taking screenshot...');
            await page.screenshot({ path: '/tmp/discord-4-captcha.png', fullPage: true });
            console.log('CAPTCHA screenshot saved. Need vision analysis to proceed.');
        }
        
        // Keep browser open for manual inspection
        console.log('Waiting 30 seconds for inspection...');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('Error:', error.message);
        await page.screenshot({ path: '/tmp/discord-error.png' });
    } finally {
        await browser.close();
    }
}

register().catch(console.error);
