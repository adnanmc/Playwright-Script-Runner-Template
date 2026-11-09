// Central reusable input catalog.
//
// Preferred script usage:
//   inputs: ['url', 'environment', 'optionalUsernameFromEnv']
//
// The server expands these short keys into the full input metadata that the
// existing v1.2.4 UI already understands. This file intentionally lives under
// scripts/ so project teams can customize reusable inputs without editing the
// runner infrastructure. Add commonly reused inputs here once
// instead of redefining label/type/placeholder/etc. in every script.

module.exports = {
  // ---------------------------------------------------------------------------
  // Common browser / text inputs
  // ---------------------------------------------------------------------------
  url: {
    name: 'url',
    label: 'Website URL',
    type: 'url',
    required: true,
    placeholder: 'https://example.com',
    example: 'https://example.com'
  },

  textToFind: {
    name: 'text',
    label: 'Text To Find',
    type: 'text',
    required: true,
    placeholder: 'Example Domain',
    example: 'Example Domain'
  },

  message: {
    name: 'message',
    label: 'Message',
    type: 'text',
    required: true,
    placeholder: 'Hello QA',
    example: 'Hello QA'
  },

  optionalFailureMessage: {
    name: 'failureMessage',
    label: 'Failure Message',
    type: 'text',
    required: false,
    placeholder: 'This script failed on purpose for demonstration.',
    example: 'This script failed on purpose for demonstration.'
  },

  // ---------------------------------------------------------------------------
  // Credentials / sensitive inputs
  // ---------------------------------------------------------------------------
  email: {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    sensitive: true,
    placeholder: 'qa.user@example.com',
    example: 'qa.user@example.com',
    helpText: 'Sensitive input. Avoid returning or logging real account details from scripts.'
  },

  password: {
    name: 'password',
    label: 'Password',
    type: 'password',
    required: true,
    sensitive: true,
    placeholder: 'Enter password',
    example: 'example-password',
    helpText: 'Sensitive input. Do not return or log the password from a script.'
  },

  optionalUsernameFromEnv: {
    name: 'username',
    label: 'Username',
    type: 'text',
    required: false,
    sensitive: true,
    placeholder: 'Leave blank to use EXAMPLE_USERNAME from .env',
    example: '',
    helpText: 'Optional. If blank, the script can read process.env.EXAMPLE_USERNAME.'
  },

  optionalPasswordFromEnv: {
    name: 'password',
    label: 'Password',
    type: 'password',
    required: false,
    sensitive: true,
    placeholder: 'Leave blank to use EXAMPLE_PASSWORD from .env',
    example: '',
    helpText: 'Optional. If blank, the script can read process.env.EXAMPLE_PASSWORD.'
  },

  // ---------------------------------------------------------------------------
  // Generic task inputs
  // ---------------------------------------------------------------------------
  optionalCount: {
    name: 'count',
    label: 'Count',
    type: 'number',
    required: false,
    placeholder: '1',
    example: 1
  },

  recordCount: {
    name: 'count',
    label: 'Number Of Records',
    type: 'number',
    required: true,
    placeholder: '3',
    example: 3,
    helpText: 'For the included example, the count is limited to 1 through 20.'
  },

  optionalEmailPrefix: {
    name: 'prefix',
    label: 'Email Prefix',
    type: 'text',
    required: false,
    placeholder: 'qa-user',
    example: 'qa-user',
    helpText: 'Used to make generated mock email addresses easy to recognize.'
  },

  // ---------------------------------------------------------------------------
  // Examples of reusable QA-oriented inputs you can use in future scripts
  // ---------------------------------------------------------------------------
  environment: {
    name: 'environment',
    label: 'Environment',
    type: 'select',
    required: true,
    options: ['QA', 'STG', 'PROD'],
    example: 'QA'
  },

  departureDate: {
    name: 'departureDate',
    label: 'Departure Date',
    type: 'date',
    required: true
  },

  flightNumber: {
    name: 'flightNumber',
    label: 'Flight Number',
    type: 'text',
    required: true,
    placeholder: '1234',
    example: '1234'
  },

  delayMinute: {
    name: 'delayMinute',
    label: 'Delay Minute',
    type: 'number',
    required: true,
    placeholder: '15',
    example: 15,
    helpText: 'Whole number of delay minutes.'
  },

  flightGate: {
    name: 'flightGate',
    label: 'Flight Gate',
    type: 'text',
    required: true,
    placeholder: 'A12',
    example: 'A12',
    helpText: 'Alphanumeric gate value, for example A12 or B7.'
  },

  flightTerminal: {
    name: 'flightTerminal',
    label: 'Flight Terminal',
    type: 'text',
    required: true,
    placeholder: 'T5',
    example: 'T5',
    helpText: 'Alphanumeric terminal value, for example T5 or 4B.'
  },

  reasonCode: {
    name: 'reasonCode',
    label: 'Reason Code',
    type: 'text',
    required: true,
    placeholder: 'WX01',
    example: 'WX01',
    helpText: 'Alphanumeric reason code.'
  },

  confirmationCode: {
    name: 'confirmationCode',
    label: 'Confirmation Code',
    type: 'text',
    required: true,
    placeholder: 'ABC123',
    example: 'ABC123'
  }
};
