const path = require('path');

const { Seeder } = require('mongo-seeding');
const config = {
  database: 'mongodb://localhost:4001/meteor',
  dropDatabase: true,
};
const seeder = new Seeder(config);
const collections = seeder.readCollectionsFromPath(
  path.resolve('./tests/cypress/plugins/data')
);

module.exports = (on, config) => {
  on('task', {
    async 'seed:database'() {
      await seeder.import(collections);
      // > If you do not need to return a value, explicitly return null to
      // > signal that the given event has been handled.
      return null;
    },
  });
  return config;
};
