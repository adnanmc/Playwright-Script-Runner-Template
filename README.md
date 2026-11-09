# QA Script Runner Template - Node Tasks + playwright-core

This repository is intended to be copied into project-specific QA support tools such as **TOPS Script Runner**, **BlueEye Script Runner**, or any other standalone script repository.

## The template rule: only edit 3 places

For normal project use, QA engineers should only need to work in:

```text
info.json   -> project name and descriptions
.env        -> local machine/environment values and credentials
scripts/    -> runnable scripts, reusable inputs, and starter templates
```

Everything else should be treated as **template infrastructure**. You normally should not need to edit `server.js`, `public/`, `src/`, `tailwind.config.js`, or `package.json` just to add project scripts.

`npm run check` also discovers JavaScript files automatically, so adding a new script does **not** require updating a hard-coded validation list in `package.json`.

### Example: turning the template into TOPS Script Runner

1. Copy the repository into a new TOPS repository.
2. Update `info.json` with the TOPS title and description.
3. Copy `.env.example` to `.env` and set any TOPS-specific local values.
4. Add TOPS scripts under folders such as `scripts/tops/flights/` or `scripts/tops/delays/`.
5. If TOPS needs a reusable input that is not already available, add it once in `scripts/_config/inputCatalog.js`.
6. Start the app with `npm start`.

Folders below `scripts/` that begin with `_` are intentionally ignored by automatic script discovery. The template uses this for:

```text
scripts/_config/      reusable project input definitions
scripts/_templates/   starter files to copy when creating scripts
```

Normal folders such as `scripts/tops/`, `scripts/flights/`, or `scripts/tools/` continue to appear automatically in the UI.

## Chrome DevTools Recorder Converter

This build keeps the v1.2.4 runner behavior intact and adds a separate browser-only page at:

```text
http://localhost:3000/recorder.html
```

Use Chrome DevTools **Recorder → Export → JSON**, paste the JSON into the converter, and click **Convert Recording**. The page generates an editable standalone script in this app's existing format:

```javascript
module.exports = {
  name: '...',
  description: '...',
  inputs: ['url'],
  async run(inputs) {
    // playwright-core automation
  }
};
```

The converter is intentionally a staging area. It does **not** automatically write into `/scripts`. Review and edit the output, run **Check Syntax**, then copy or download the `.js` file and place the final version in the appropriate scripts subfolder. This keeps the stable script-discovery/execution path unchanged.

By default, the first recorded navigation becomes the shared `url` catalog input. Obvious email/password change steps can also be converted to the existing `email` and `password` catalog inputs so recorded password text is not embedded in the generated file. Other recorded form values remain literal and should be reviewed before saving.

Common Recorder steps are converted directly. Custom steps and network-emulation steps become visible `TODO` comments, while nested frame/target usage is called out in the converter warnings for manual review.

## Why playwright-core?

For scripts that need browser automation, this project intentionally uses **playwright-core**, not the full `playwright` package.

Browser scripts launch the stable Google Chrome already installed on the laptop:

```js
const { chromium } = require('playwright-core');

const browser = await chromium.launch({
  channel: 'chrome',
  headless: process.env.ENV === 'prod'
});
```

There is **no `npx playwright install` step** and this project does not need Playwright-managed browser binaries.

This is useful on managed corporate laptops where security software such as ThreatLocker may block downloaded browser executables.

## Requirements

- Node.js 18 or newer
- Google Chrome stable installed on the computer for scripts that use Playwright

Plain Node.js task scripts do not launch Chrome and do not need to import `playwright-core`.

## Run locally

From this project folder:

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3000
```

`npm install` installs the Node libraries and compiles the local Tailwind stylesheet. It does not install Playwright browser binaries.


## .env loading and optional credential fallback

The server loads a local `.env` file **before** it creates the Express app or discovers scripts, so any script can read values from `process.env` during execution.

This project uses `dotenv` in `server.js`:

```js
const dotenv = require('dotenv');

dotenv.config({
  path: path.join(__dirname, '.env')
});
```

A safe template is included as:

```text
.env.example
```

For local testing, copy it to `.env`:

**Windows Command Prompt:**

```bat
copy .env.example .env
```

**PowerShell:**

```powershell
Copy-Item .env.example .env
```

The real `.env` file is already listed in `.gitignore` and should not be committed when it contains real credentials.

Example values:

```text
EXAMPLE_USERNAME=qa.user@example.com
EXAMPLE_PASSWORD=example-password
```

### Optional username/password pattern

The working example is:

```text
scripts/examples/browser/loginWithEnvFallback.js
```

Its username and password inputs are optional. The script first checks what the user/API supplied and falls back to `.env` only when the corresponding input is blank:

```js
const username = String(inputs.username || '').trim()
  || process.env.EXAMPLE_USERNAME
  || '';

const password = String(inputs.password || '')
  || process.env.EXAMPLE_PASSWORD
  || '';
```

This allows the same script to support both workflows:

1. A user enters temporary credentials in the UI/API request.
2. The user leaves the fields blank and the script uses machine-local values from `.env`.

The example never returns the password. Its JSON result only reports whether each credential came from `input` or `.env`.


## Script library loading state

When the page first opens, the sidebar immediately shows a small **Loading scripts...** animation while the browser waits for `/api/scripts`. The search field stays disabled until discovery finishes, then the loader is replaced by the normal automatically generated script navigation.

This is only a UI loading indicator; script discovery and folder grouping work the same way as before.

## Project-owned files vs template infrastructure

The intended ownership boundary is:

| Project-owned | Purpose |
| --- | --- |
| `info.json` | App title, description, and page labels |
| `.env` | Machine-local values, URLs, credentials, and secrets |
| `scripts/` | All project scripts and script-specific configuration |

Inside `scripts/`:

```text
scripts/
  _config/
    inputCatalog.js
  _templates/
    browserScript.template.js
    nodeTask.template.js
    envCredentialScript.template.js
  examples/
  your-project-folders/
```

The underscore-prefixed folders are support areas and are not shown as runnable scripts. To create a new script, copy a starter from `scripts/_templates/` into a normal folder and edit the copy.
Files whose names begin with `_` are also ignored by runnable script discovery, which gives projects a safe place for helper/config files under `scripts/`.

The following files are infrastructure and normally should not be changed for a project-specific repository:

```text
server.js
public/
src/
tailwind.config.js
package.json
```

This keeps project maintenance focused on the task scripts instead of the execution platform itself.

## Script types

The runner does not require every script to use Playwright. It simply discovers Node modules under `scripts/` and calls their exported `run(inputs)` function.

This project includes examples of both styles:

```text
scripts/
  examples/
    browser/
      getPageTitle.js
      checkText.js
      loginWithSensitiveInputs.js
      loginWithEnvFallback.js
    general/
      echoInputs.js
      failedScriptExample.js
      catalogInputExample.js
    tasks/
      generateMockTestData.js
```

- `examples/browser/*` contains Playwright examples using installed Chrome.
- `examples/general/*` contains generic runner behavior examples, including the master input catalog example.
- `examples/tasks/generateMockTestData.js` is a pure Node.js task with no Playwright import and no browser.

Keeping all demos below `scripts/examples/` means future real business scripts can live in their own top-level folders without getting mixed with sample code.

## Master input catalog (recommended)

To keep script files focused on the actual task, common input definitions now live in one central file:

```text
scripts/_config/inputCatalog.js
```

Instead of repeating this in every script:

```js
inputs: [
  {
    name: 'url',
    label: 'Website URL',
    type: 'url',
    required: true,
    placeholder: 'https://example.com'
  }
]
```

A script can simply reference the catalog key:

```js
inputs: ['url']
```

Or pick several reusable inputs:

```js
inputs: ['url', 'environment', 'flightNumber', 'departureDate', 'flightGate']
```

The server expands those keys into the complete definitions before sending script metadata to the existing UI. Script code still receives normal values such as `inputs.url`, `inputs.environment`, and `inputs.flightNumber`.

### Examples already included in the catalog

```text
url
textToFind
message
optionalFailureMessage
email
password
optionalUsernameFromEnv
optionalPasswordFromEnv
optionalCount
recordCount
optionalEmailPrefix
environment
departureDate
flightNumber
delayMinute
flightGate
flightTerminal
reasonCode
confirmationCode
```

The catalog is intentionally just a plain JavaScript object under the project-owned `scripts/` area so it stays easy to maintain. When the team notices a field being reused across scripts, add it to `scripts/_config/inputCatalog.js` once and future scripts can reference its key.

The flight-oriented catalog now also includes:

```js
inputs: ['delayMinute', 'flightGate', 'flightTerminal', 'reasonCode']
```

- `delayMinute` renders as a numeric input and returns a number.
- `flightGate`, `flightTerminal`, and `reasonCode` render as normal text inputs for alphanumeric values.

For example:

```js
confirmationCode: {
  name: 'confirmationCode',
  label: 'Confirmation Code',
  type: 'text',
  required: true,
  placeholder: 'ABC123',
  example: 'ABC123'
}
```

Then any script can use:

```js
inputs: ['confirmationCode']
```

### Escape hatch for one-off inputs

The original v1.2.4 full-object format is still supported. If a script truly needs a unique field that is unlikely to be reused, you can still write:

```js
inputs: [
  {
    name: 'specialValue',
    label: 'Special Value',
    type: 'text',
    required: false
  }
]
```

This keeps the common path extremely simple without removing flexibility for unusual cases.

### Recommended team convention

Use the catalog for anything that appears in more than one script. Only use a full inline object for genuinely one-off fields. This keeps labels, input types, placeholders, sensitive flags, and API examples consistent across the entire runner.

## Add a new script

Create a `.js` file anywhere under `scripts/`.

Example:

```js
const { chromium } = require('playwright-core');

module.exports = {
  name: 'My New Script',
  description: 'What this script does.',
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

      // If something should make this script count as failed, throw an Error.
      // The Express runner catches it and returns the standard failure JSON.
      if (!response || !response.ok()) {
        const status = response ? response.status() : 'no response';
        throw new Error(`Page request failed with HTTP status: ${status}`);
      }

      return {
        url: page.url(),
        title: await page.title(),
        httpStatus: response.status()
      };
    } catch (error) {
      // Add useful context, then rethrow so the platform knows the script failed.
      throw new Error(`My New Script failed: ${error.message}`);
    } finally {
      // Cleanup belongs in finally so it runs after both success and failure.
      if (browser) {
        await browser.close();
      }
    }
  }
};
```

### Sensitive inputs such as email and password

Input metadata can use normal HTML input types such as `email` and `password`. Mark sensitive fields with `sensitive: true` so the UI and generated API documentation can treat them more carefully.

Preferred catalog-based example:

```js
inputs: ['email', 'password']
```

The complete definitions for those keys live once in `scripts/_config/inputCatalog.js`, including the input type, sensitive flag, placeholder, and safe API example values.

A `password` input is masked by the browser. The generated API examples use only the fake values declared in the script metadata; they do not copy what a user typed into the form.

The working example is:

```text
scripts/examples/browser/loginWithSensitiveInputs.js
```

That example uses the password to fill a local in-memory login form but deliberately does **not** return the password in the result. The email is masked before it is returned.

There is also an optional-credential example:

```text
scripts/examples/browser/loginWithEnvFallback.js
```

It demonstrates the common pattern where username/password fields are optional and blank values fall back to `.env`.

For real credentials:

- do not return passwords, tokens, or secrets in a script result
- do not include them in thrown error messages
- avoid logging request bodies or raw `inputs`
- remember that API callers still send the values in the HTTP request body because the script needs them to execute

The runner does not write input values to a database or filesystem. They exist in the local request/form memory for the execution.

### Plain Node.js task example

A non-Playwright task follows the exact same contract and simply leaves out the Playwright import:

```js
const { randomUUID } = require('crypto');

module.exports = {
  name: 'Generate Mock Test Data',
  description: 'Pure Node.js task. No browser is launched.',
  inputs: [
    {
      name: 'count',
      label: 'Number Of Records',
      type: 'number',
      required: true
    }
  ],

  async run(inputs) {
    return {
      id: randomUUID(),
      requestedCount: Number(inputs.count)
    };
  }
};
```

The complete working example is:

```text
scripts/examples/tasks/generateMockTestData.js
```

It demonstrates that the project is a generic **script execution platform**. Playwright is available to scripts that need browser automation, but it is not required for every task.

### How script failures work

A script **does not** need to build its own failure response. It only needs to throw an `Error` when it cannot complete successfully:

```js
async run(inputs) {
  if (!inputs.someValue) {
    throw new Error('someValue is required.');
  }

  return {
    completed: true
  };
}
```

The Express runner catches the error and converts it to the common API response:

```json
{
  "success": false,
  "script": "examples/general/failedScriptExample",
  "durationMs": 12,
  "error": {
    "message": "This script failed on purpose for demonstration."
  }
}
```

There is a working example at:

```text
scripts/examples/general/failedScriptExample.js
```

Run **Failed Script Example** from the UI to see the failure state and JSON response without needing to break a real script.

The UI discovers scripts automatically. Folder structure becomes navigation structure.

For example:

```text
scripts/
  reservations/
    searchReservation.js
  flights/
    status/
      checkFlightStatus.js
```

becomes grouped navigation automatically.

## Script contract

Each script exports:

- `name` - required
- `description` - optional
- `inputs` - optional array used to generate the UI form
- `run(inputs)` - required async function

An input definition can use fields such as `name`, `label`, `type`, `required`, `placeholder`, `example`, `helpText`, and `sensitive`.

On success, return the JSON-compatible data that is useful to the caller. On failure, throw an `Error`. The Express platform handles the common success/failure JSON envelope automatically.

## Local Tailwind CSS

Tailwind is installed as a development dependency and compiles to:

```text
public/css/app.css
```

There is no CDN dependency.

To rebuild CSS manually after changing the UI:

```bash
npm run build:css
```

## Local vs production browser mode

By default the Playwright examples run Chrome headed so QA engineers can see the browser.

If started with `ENV=prod`, those browser examples use headless Chrome. Plain Node.js task scripts are unaffected.

## Trigger scripts through the API

The browser UI is optional. Other automation tools can execute any discovered script by calling the same Express API used by the UI.

Endpoint:

```text
POST http://localhost:3000/api/run
Content-Type: application/json
```

Example request:

```json
{
  "scriptId": "examples/browser/getPageTitle",
  "inputs": {
    "url": "https://example.com"
  }
}
```

Example success response:

```json
{
  "success": true,
  "script": "examples/browser/getPageTitle",
  "durationMs": 1234,
  "result": {
    "url": "https://example.com/",
    "title": "Example Domain",
    "httpStatus": 200
  }
}
```

Example failure response:

```json
{
  "success": false,
  "script": "examples/general/failedScriptExample",
  "durationMs": 12,
  "error": {
    "message": "This script failed on purpose for demonstration."
  }
}
```

### JavaScript API caller with failure handling

An external automation tool should check both the HTTP status and the JSON `success` flag:

```js
async function runRemoteScript() {
  try {
    const response = await fetch('http://localhost:3000/api/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        scriptId: 'examples/browser/getPageTitle',
        inputs: {
          url: 'https://example.com'
        }
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error?.message || `Script request failed with HTTP ${response.status}`
      );
    }

    console.log('Script succeeded:', result.result);
    return result;
  } catch (error) {
    console.error('Script execution failed:', error.message);
    throw error;
  }
}

runRemoteScript();
```

The API uses HTTP status codes as well:

- `200` - script completed successfully
- `400` - invalid request or missing required inputs
- `404` - script ID was not found
- `500` - the selected script ran and threw an error

Each script screen in the UI contains an **API Usage** section. It is collapsed by default and automatically shows the correct `scriptId`, sample input values, a cURL command, a JavaScript `fetch` example with failure handling, and the common response envelopes.

No API documentation needs to be manually added when a new script is created. The examples are generated from the script's existing `inputs` metadata.

## Customize this template for a project

Project branding is centralized in the root-level `info.json` file. A team copying this template should normally customize this file before creating its own scripts.

Default configuration:

```json
{
  "title": "QA Script Runner",
  "description": "Standalone Node tasks and Playwright browser automation powered by Express.",
  "runnerLabel": "Script Runner",
  "recorderLabel": "Recorder Converter",
  "recorderDescription": "Convert Chrome DevTools Recorder JSON into this app's standalone Playwright script format."
}
```

For example, a TOPS repository could use:

```json
{
  "title": "TOPS Script Runner",
  "description": "QA support scripts and troubleshooting utilities for the TOPS project.",
  "runnerLabel": "TOPS Scripts",
  "recorderLabel": "Recorder Converter",
  "recorderDescription": "Convert Chrome DevTools Recorder JSON into TOPS-compatible runner scripts."
}
```

The server reads `info.json` when it starts and exposes the safe display values to the browser through `/api/info`. Both the Script Runner and Recorder Converter use the same configuration, including the browser tab title and top navigation labels.

If `info.json` is missing, invalid JSON, or contains an empty value, the app falls back to the original QA Script Runner defaults instead of failing to start.

Keep runtime settings and secrets out of `info.json`. Port numbers, credentials, tokens, and machine-specific values still belong in `.env`.
