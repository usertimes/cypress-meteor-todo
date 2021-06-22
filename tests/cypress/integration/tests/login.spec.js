import { ROUTE_MAIN, LOGIN_BUTTON } from '../constants';

describe('Login', function () {
  beforeEach(function () {
    cy.task('seed:database');
    cy.visitAndWaitForSubscriptions(ROUTE_MAIN);
  });

  it('Should login Successfully', function () {
    cy.get('input[name=username]').clear().type('user');
    cy.get('input[name=password]').clear().type('password');

    cy.getById(LOGIN_BUTTON).click();
    // user exists and is now logged in
    cy.getMeteor().invoke('user').should('exist').and('not.be.null');
  });
});
