// Copy this file into a normal scripts subfolder, rename it, and edit the copy.
// Plain Node tasks do not need to import playwright-core.
module.exports = {
  name: 'New Node Task',
  description: 'Describe what this non-browser task does.',

  // Pick reusable fields from scripts/_config/inputCatalog.js.
  inputs: ['message'],

  async run(inputs) {
    // Add the task-specific Node.js logic here.

    return {
      message: inputs.message,
      completed: true
    };
  }
};
