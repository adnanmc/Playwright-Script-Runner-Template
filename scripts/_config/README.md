# Project script configuration

This folder is intentionally inside `scripts/` so a project team can customize reusable script inputs without touching the runner infrastructure.

## inputCatalog.js

Add or edit reusable input definitions here. Runnable scripts can then reference the catalog entry by key:

```js
inputs: ['flightNumber', 'flightGate', 'reasonCode']
```

Folders whose names begin with `_` are ignored by the script discovery engine, so this configuration file never appears as a runnable script in the UI.
