# Testing a Meteor app with Cypress

End-to-end testing with Cypress against a Meteor + react demo app.

This repo contains a Meteor todo app from the official [React & Meteor tutorial](https://react-tutorial.meteor.com/).
We added end-to-end tests with [Cypress](https://www.cypress.io/). (update after publish)

You can read about how Cypress was set up in the [corresponding blog article](#) or dive through the code.

## Features

- `npm` scripts to run end-to-end tests with Cypress (see `package.json`)
- Independent test environment
- Code coverage (client + server)
- Custom commands

## Running demo app

Clone the repository

```shell
git clone git@github.com:usertimes/cypress-meteor-todo.git
```

Install dependencies

```shell
cd cypress-meteor-todo
```

```shell
npm install
```

or

```shell
yarn install
```

Build and run the project

```shell
npm start
```

Navigate to `http://localhost:3000`.

## Running end-to-end tests

Running app in test environment

```shell
npm run e2e
```

Navigate to `http://localhost:4000`.

After the Meteor server has started in a test environment:

For Cypress graphical test runner, run :

```shell
npm run cypress:ui
```

For Cypress headless mode (_i.e., on the console or in a CI environment_), run :

```shell
npm run cypress:headless
```

---

To run the server and launch tests in one command:

- For the graphical test runner

```shell
npm run test:dev:ui
```

- For headless mode.

```shell
npm run test:dev:headless
```

## Open code coverage reporter

The instrumentation and collection of client and server code coverage happens automatically.
After running the full test suits run :

```shell
npm run coverage:open
```
