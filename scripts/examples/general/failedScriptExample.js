module.exports = {
  name: 'Failed Script Example',
  description: 'Intentionally throws an error so you can see exactly how failed script execution is reported by the UI and API.',

  inputs: ['optionalFailureMessage'],

  async run(inputs) {
    // A script reports failure by throwing an Error.
    // The Express runner catches it and automatically returns the common
    // { success: false, error: { message: "..." } } response envelope.
    const message = inputs.failureMessage?.trim()
      || 'This script failed on purpose for demonstration.';

    throw new Error(message);
  }
};
