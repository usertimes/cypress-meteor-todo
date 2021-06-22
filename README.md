# cypress-meteor-todo

A simple React based Meteor app tested with Cypress.
You can follow the guide [here](www.example.com).

## Running demo app

Clone the repository

```shell
git clone git@github.com:usertimes/cypress-meteor-todo.git
```

Install dependencies

```shell
cd /cypress-meteor-todo
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
