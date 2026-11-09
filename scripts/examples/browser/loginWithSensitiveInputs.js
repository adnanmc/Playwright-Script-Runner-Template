const { chromium } = require('playwright-core');

function maskEmail(email) {
  const [name = '', domain = ''] = String(email).split('@');

  if (!domain) {
    return '***';
  }

  const visibleStart = name.slice(0, 1);
  return `${visibleStart}${'*'.repeat(Math.max(3, name.length - 1))}@${domain}`;
}

module.exports = {
  name: 'Login With Sensitive Inputs',
  description: 'Playwright example with email and password inputs. The password is masked in the UI and is never returned in the result.',

  inputs: ['email', 'password'],

  async run(inputs) {
    let browser;

    try {
      browser = await chromium.launch({
        channel: 'chrome',
        headless: process.env.ENV === 'prod'
      });

      const page = await browser.newPage();

      // This example uses a local in-memory HTML page so it is safe to run
      // without sending the sample credentials to an external website.
      await page.setContent(`
        <!doctype html>
        <html>
          <body>
            <form id="loginForm">
              <label>Email <input id="email" type="email" /></label>
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

      await page.locator('#email').fill(inputs.email);
      await page.locator('#password').fill(inputs.password);
      await page.getByRole('button', { name: 'Sign in' }).click();

      const status = await page.locator('#status').textContent();

      if (status !== 'Submitted') {
        throw new Error('The demo login form was not submitted successfully.');
      }

      return {
        submitted: true,
        email: maskEmail(inputs.email),
        passwordReturned: false,
        note: 'The password was used by the automation but was intentionally excluded from the result.'
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};
