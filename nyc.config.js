// `nyc` is the command-line tool for `istanbul` which is used for instrumenting
// code for end-to-end testing.
'use strict';

module.exports = {
  'report-dir': './tests/cypress/coverage',
  reporter: ['html', 'json-summary'],
};
