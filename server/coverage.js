import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';

// Check `BABEL_ENV` to check if we are running in test mode.
const babelEnvironment = process.env.BABEL_ENV || 'development';
// Detect if we are running in a test environment.
const isCypress =
  (typeof window !== 'undefined' && window.Cypress !== undefined) ||
  babelEnvironment === 'test';

// Expose a route so that Cypress can fetch the coverage report for the
// server-side code. This route has to be configured in `cypress.json` in
// `env.codeCoverage.url`.
const ROUTE_COVERAGE = '/__coverage__';

if (isCypress && Meteor.isServer) {
  WebApp.connectHandlers.use(ROUTE_COVERAGE, (req, res) => {
    const result = { coverage: global.__coverage__ };
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(result));
  });
}

