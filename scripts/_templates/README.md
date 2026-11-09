# Script starter templates

Files in this folder are intentionally ignored by script discovery.

To create a new script:

1. Copy the closest template into a normal project folder under `scripts/`.
2. Rename the copied file.
3. Change `name`, `description`, `inputs`, and `run()`.
4. Restart the server or refresh the script list.

Available starters:

- `browserScript.template.js` - Playwright + installed Chrome
- `nodeTask.template.js` - plain Node.js task
- `envCredentialScript.template.js` - optional UI/API credentials with `.env` fallback
