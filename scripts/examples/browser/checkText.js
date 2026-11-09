const { chromium } = require('playwright-core');

module.exports = {
  name: 'Check Text On Page',
  description: 'Opens a page in installed Google Chrome and checks whether specific text is visible.',

  inputs: ['url', 'textToFind'],

  async run(inputs) {
    let browser;

    try {
      browser = await chromium.launch({
        channel: 'chrome',
        headless: process.env.ENV === 'prod'
      });

      const page = await browser.newPage();
      await page.goto(inputs.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      const locator = page.getByText(inputs.text, { exact: false }).first();
      const found = await locator.isVisible().catch(() => false);

      return {
        url: page.url(),
        searchedText: inputs.text,
        visible: found
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};
