# Scripts workspace

This folder is the main place QA engineers should work after creating a project from the template.

## Normal project work

Create business folders directly under `scripts/`, for example:

```text
scripts/
  examples/
  tops/
    flights/
      updateGate.js
    delays/
      addDelay.js
```

Every normal `.js` file outside an underscore-prefixed folder is discovered automatically and appears in the UI using the same folder hierarchy.

## Support folders

- `_config/` - reusable project input definitions
- `_templates/` - copyable starter scripts

Underscore-prefixed folders are ignored by automatic discovery and never appear in the runnable script list.

## Recommended script shape

```js
module.exports = {
  name: 'Update Flight Gate',
  description: 'Updates a flight gate for testing.',
  inputs: ['flightNumber', 'flightGate'],

  async run(inputs) {
    // Task-specific logic only.
    return {
      flightNumber: inputs.flightNumber,
      flightGate: inputs.flightGate
    };
  }
};
```

For most new scripts, choose inputs from `_config/inputCatalog.js` and focus on the `run()` function.
