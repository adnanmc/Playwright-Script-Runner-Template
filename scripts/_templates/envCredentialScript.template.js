const { chromium } = require('playwright-core');

// Copy this file into a normal scripts subfolder, rename it, and edit the copy.
// This demonstrates optional credentials that can fall back to .env values.
module.exports = {
  name: 'New Script With Optional Credentials',
  description: 'Uses UI/API credentials when supplied, otherwise .env values.',
  inputs: ['optionalUsernameFromEnv', 'optionalPasswordFromEnv'],

  async run(inputs) {
    const username = String(inputs.username || '').trim()
      || process.env.EXAMPLE_USERNAME
      || '';

    const password = String(inputs.password || '')
      || process.env.EXAMPLE_PASSWORD
      || '';

    if (!username || !password) {
      throw new Error('Username/password were not supplied and were not found in .env.');
    }

    let browser;

    try {
      browser = await chromium.launch({
        channel: 'chrome',
        headless: process.env.ENV === 'prod'
      });

      const page = await browser.newPage();

      // Add login/task steps here. Never return or log the password.

      return {
        message: 'Credential-based task completed.',
        usernameSource: inputs.username ? 'input' : '.env',
        passwordSource: inputs.password ? 'input' : '.env'
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};
