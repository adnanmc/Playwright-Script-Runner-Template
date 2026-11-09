const { chromium } = require('playwright-core');

module.exports = {
  name: 'Get Page Title',
  description: 'Launches installed Google Chrome, opens a URL, and returns the page title.',

  inputs: ['url'],

  async run(inputs) {
    let browser;

    try {
      browser = await chromium.launch({
        channel: 'chrome',
        headless: process.env.ENV === 'prod'
      });

      const page = await browser.newPage();
      const response = await page.goto(inputs.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      return {
        url: page.url(),
        title: await page.title(),
        httpStatus: response ? response.status() : null
      };
    } catch (error) {
      if (/executable|chrome/i.test(error.message || '')) {
        throw new Error(
          `Google Chrome could not be started. Make sure the stable Chrome browser is installed. Original error: ${error.message}`
        );
      }

      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};
