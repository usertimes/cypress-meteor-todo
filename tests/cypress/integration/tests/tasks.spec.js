import { CHECKBOX, COUNTER, REMOVE_TODO, ROUTE_MAIN } from '../constants';

describe('Task methods', function () {
  let TODO_ITEM_ONE = 'buy some cheese';
  let TODO_ITEM_TWO = 'feed the cat';

  beforeEach(function () {
    cy.task('seed:database'); // reset and seed database
    cy.login();
    cy.visitAndWaitForSubscriptions(ROUTE_MAIN);
    cy.fixture('users.json').as('users');
    cy.fixture('tasks.json').as('tasks');
  });
  //
  // Demonstrating the use of `callMethod`
  it('can delete owned task from server', function () {
    const { _id: taskId } = this.tasks.testUserTask[0];

    cy.get('.tasks > li').should('have.length', 2);
    cy.callMethod('tasks.remove', taskId);
    cy.get('.tasks > li').should('have.length', 1);
  });
  //
  //

  it('should  add todo items', function () {
    // Create 1st todo
    cy.get('.task-form > input[name=add]').type(TODO_ITEM_ONE).type('{enter}');

    // Make sure the 1st span contains the 1st todo text
    cy.get('.tasks > li').find('span').should('contain', TODO_ITEM_ONE);

    // Create 2nd todo
    cy.get('.task-form > input[name=add]').type(TODO_ITEM_TWO).type('{enter}');

    // Make sure the 2nd label contains the 2nd todo text
    cy.get('.tasks > li').find('span').should('contain', TODO_ITEM_TWO);

    cy.get('.tasks > li').should('have.length', 4);
  });

  it('should remove todo items', function () {
    cy.get('.tasks > li').should('have.length', 2);
    cy.get(`.${REMOVE_TODO}`).first().click();
    cy.get('.tasks > li').should('have.length', 1);
    cy.get(`.${REMOVE_TODO}`).first().click();
    cy.get('.tasks > li').should('have.length', 0);
  });

  it('should check a todo item', function () {
    cy.getById(COUNTER).should('contain', '2');
    cy.get(`.${CHECKBOX}`).first().check();
    cy.getById(COUNTER).should('contain', '1');
  });

  it('should uncheck  todo item', function () {
    cy.get(`.${CHECKBOX}`).first().check();
    cy.getById(COUNTER).should('contain', '1');
    cy.get(`.${CHECKBOX}`).first().uncheck();
    cy.getById(COUNTER).should('contain', '2');
  });
});
