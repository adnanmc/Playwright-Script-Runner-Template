const { chromium } = require('playwright-core');

function maskUsername(username) {
  const value = String(username || '');

  if (value.includes('@')) {
    const [name = '', domain = ''] = value.split('@');
    return `${name.slice(0, 1)}${'*'.repeat(Math.max(3, name.length - 1))}@${domain}`;
  }

  if (value.length <= 2) {
    return '*'.repeat(value.length || 3);
  }

  return `${value.slice(0, 1)}${'*'.repeat(Math.max(3, value.length - 2))}${value.slice(-1)}`;
}

module.exports = {
  name: 'Login With Optional .env Credentials',
  description: 'Playwright example where username and password are optional. Blank values fall back to EXAMPLE_USERNAME and EXAMPLE_PASSWORD from the server .env file.',

  inputs: ['optionalUsernameFromEnv', 'optionalPasswordFromEnv'],

  async run(inputs) {
    const suppliedUsername = String(inputs.username || '').trim();
    const suppliedPassword = String(inputs.password || '');

    const username = suppliedUsername || process.env.EXAMPLE_USERNAME || '';
    const password = suppliedPassword || process.env.EXAMPLE_PASSWORD || '';

    if (!username) {
      throw new Error(
        'No username was provided. Enter one in the UI/API or set EXAMPLE_USERNAME in the .env file.'
      );
    }

    if (!password) {
      throw new Error(
        'No password was provided. Enter one in the UI/API or set EXAMPLE_PASSWORD in the .env file.'
      );
    }

    const credentialSource = {
      username: suppliedUsername ? 'input' : '.env',
      password: suppliedPassword ? 'input' : '.env'
    };

    let browser;

    try {
      browser = await chromium.launch({
        channel: 'chrome',
        headless: process.env.ENV === 'prod'
      });

      const page = await browser.newPage();

      // This is an in-memory demo page. The credentials are not sent to any
      // external service; it simply demonstrates the fallback pattern safely.
      await page.setContent(`
        <!doctype html>
        <html>
          <body>
            <form id="loginForm">
              <label>Username <input id="username" /></label>
              <label>Password <input id="password" type="password" /></label>
              <button type="submit">Sign in</button>
            </form>
            <p id="status"></p>
            <script>
              document.getElementById('loginForm').addEventListener('submit', (event) => {
                event.preventDefault();
                document.getElementById('status').textContent = 'Submitted';
              });
            <\/script>
          </body>
        </html>
      `);

      await page.locator('#username').fill(username);
      await page.locator('#password').fill(password);
      await page.getByRole('button', { name: 'Sign in' }).click();

      const status = await page.locator('#status').textContent();

      if (status !== 'Submitted') {
        throw new Error('The demo login form was not submitted successfully.');
      }

      return {
        submitted: true,
        username: maskUsername(username),
        credentialSource,
        passwordReturned: false,
        note: 'Credentials were used by the script but the password was never returned or logged.'
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};
