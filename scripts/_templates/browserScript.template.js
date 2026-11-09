const { chromium } = require('playwright-core');

// Copy this file into a normal scripts subfolder, rename it, and edit the copy.
// Files under scripts/_templates are ignored by automatic script discovery.
module.exports = {
  name: 'New Browser Script',
  description: 'Describe what this browser automation does.',

  // Pick reusable fields from scripts/_config/inputCatalog.js.
  inputs: ['url'],

  async run(inputs) {
    let browser;

    try {
      browser = await chromium.launch({
        channel: 'chrome',
        headless: process.env.ENV === 'prod'
      });

      const page = await browser.newPage();
      await page.goto(inputs.url);

      // Add the task-specific Playwright steps here.

      return {
        message: 'Browser task completed.',
        finalUrl: page.url()
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};
