import { ROUTE_MAIN } from '../integration/constants';

// Get DOM elements by id. this command adds the prefix "data-test-id".
Cypress.Commands.add('getById', (selector, ...args) => {
  cy.get(`[data-test-id=${selector}]`, ...args);
});

// Returns a Meteor instance from the browser.
Cypress.Commands.add('getMeteor', () =>
  cy.window().then(({ Meteor }) => {
    if (!Meteor) {
      // When trying to access the `window` object before “visiting” a page in a
      // test, we get an `undefined` value. Therefore, the `Meteor` object is
      // undefined. We visit the app so that we get the Window instance of the
      // app from which we get the `Meteor` instance used in tests
      cy.visit(ROUTE_MAIN);
      return cy.window().then(({ Meteor: MeteorSecondTry }) => MeteorSecondTry);
    }
    return Meteor;
  })
);

// Check if the meteor subscriptions are ready, should equal true.
Cypress.Commands.add('allSubscriptionsReady', (options = {}) => {
  const log = {
    name: 'allSubscriptionsReady',
  };

  const getValue = () => {
    const DDP = cy.state('window').DDP;

    return DDP._allSubscriptionsReady();
  };

  const resolveValue = () => {
    return Cypress.Promise.try(getValue).then((value) => {
      return cy.verifyUpcomingAssertions(value, options, {
        onRetry: resolveValue,
      });
    });
  };

  return resolveValue().then((value) => {
    Cypress.log(log);
    return value;
  });
});

// Calls a Meteor method.
Cypress.Commands.add('callMethod', (method, ...params) => {
  Cypress.log({
    name: 'Calling method',
    consoleProps: () => ({ name: method, params }),
  });

  cy.getMeteor().then((Meteor) => {
    return new Cypress.Promise((resolve, reject) => {
      Meteor.call(method, ...params, (err, result) => {
        if (err) {
          return reject(err);
        }
        console.log(`%c${method}`, 'color: red; font-style: italic;', result);
        resolve(result);
      });
    });
  });
});

Cypress.Commands.add('logout', () => {
  Cypress.log({
    name: 'Logging out',
  });

  cy.getMeteor().then(
    (Meteor) =>
      new Cypress.Promise((resolve, reject) => {
        Meteor.logout((err, result) => {
          if (err) {
            reject(err);
          }
          resolve(result);
        });
      })
  );
});

Cypress.Commands.add('visitAndWaitForSubscriptions', (url) => {
  cy.visit(url);
  cy.allSubscriptionsReady().should('eq', true);
});

Cypress.Commands.add(
  'login',
  (username = 'user', password = 'password') => {
    cy.getMeteor().then((Meteor) => {
      // Logout first if the user is already logged in
      const promise = Meteor.userId() ? cy.logout() : Promise.resolve();

      return promise.then(
        () =>
          new Cypress.Promise((resolve, reject) => {
            Meteor.loginWithPassword(username, password, (err) => {
              if (err) {
                return reject(err);
              }
              resolve();
            });
          })
      );
    });
    cy.getMeteor().invoke('user').should('exist').and('not.be.null');
  }
);
