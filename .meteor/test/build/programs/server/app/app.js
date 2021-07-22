var require = meteorInstall({"imports":{"api":{"tasksMethods.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                              //
// imports/api/tasksMethods.js                                                                  //
//                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                //
let check;
module.link("meteor/check", {
  check(v) {
    check = v;
  }

}, 0);
let TasksCollection;
module.link("/imports/db/TasksCollection", {
  TasksCollection(v) {
    TasksCollection = v;
  }

}, 1);

function cov_1g7q374t3p() {
  var path = "/Users/idrismahjoubi/cypress-meteor-react/imports/api/tasksMethods.js";
  var hash = "d466dfd4f2ae811606f078ec1a519cecbbdffd64";
  var global = new Function("return this")();
  var gcv = "__coverage__";
  var coverageData = {
    path: "/Users/idrismahjoubi/cypress-meteor-react/imports/api/tasksMethods.js",
    statementMap: {
      "0": {
        start: {
          line: 4,
          column: 0
        },
        end: {
          line: 55,
          column: 3
        }
      },
      "1": {
        start: {
          line: 6,
          column: 4
        },
        end: {
          line: 6,
          column: 24
        }
      },
      "2": {
        start: {
          line: 8,
          column: 4
        },
        end: {
          line: 10,
          column: 5
        }
      },
      "3": {
        start: {
          line: 9,
          column: 6
        },
        end: {
          line: 9,
          column: 48
        }
      },
      "4": {
        start: {
          line: 12,
          column: 4
        },
        end: {
          line: 16,
          column: 7
        }
      },
      "5": {
        start: {
          line: 20,
          column: 4
        },
        end: {
          line: 20,
          column: 26
        }
      },
      "6": {
        start: {
          line: 22,
          column: 4
        },
        end: {
          line: 24,
          column: 5
        }
      },
      "7": {
        start: {
          line: 23,
          column: 6
        },
        end: {
          line: 23,
          column: 48
        }
      },
      "8": {
        start: {
          line: 26,
          column: 17
        },
        end: {
          line: 26,
          column: 78
        }
      },
      "9": {
        start: {
          line: 28,
          column: 4
        },
        end: {
          line: 30,
          column: 5
        }
      },
      "10": {
        start: {
          line: 29,
          column: 6
        },
        end: {
          line: 29,
          column: 47
        }
      },
      "11": {
        start: {
          line: 32,
          column: 4
        },
        end: {
          line: 32,
          column: 35
        }
      },
      "12": {
        start: {
          line: 36,
          column: 4
        },
        end: {
          line: 36,
          column: 26
        }
      },
      "13": {
        start: {
          line: 37,
          column: 4
        },
        end: {
          line: 37,
          column: 30
        }
      },
      "14": {
        start: {
          line: 39,
          column: 4
        },
        end: {
          line: 41,
          column: 5
        }
      },
      "15": {
        start: {
          line: 40,
          column: 6
        },
        end: {
          line: 40,
          column: 48
        }
      },
      "16": {
        start: {
          line: 43,
          column: 17
        },
        end: {
          line: 43,
          column: 78
        }
      },
      "17": {
        start: {
          line: 45,
          column: 4
        },
        end: {
          line: 47,
          column: 5
        }
      },
      "18": {
        start: {
          line: 46,
          column: 6
        },
        end: {
          line: 46,
          column: 47
        }
      },
      "19": {
        start: {
          line: 49,
          column: 4
        },
        end: {
          line: 53,
          column: 7
        }
      }
    },
    fnMap: {
      "0": {
        name: "(anonymous_0)",
        decl: {
          start: {
            line: 5,
            column: 2
          },
          end: {
            line: 5,
            column: 3
          }
        },
        loc: {
          start: {
            line: 5,
            column: 23
          },
          end: {
            line: 17,
            column: 3
          }
        },
        line: 5
      },
      "1": {
        name: "(anonymous_1)",
        decl: {
          start: {
            line: 19,
            column: 2
          },
          end: {
            line: 19,
            column: 3
          }
        },
        loc: {
          start: {
            line: 19,
            column: 25
          },
          end: {
            line: 33,
            column: 3
          }
        },
        line: 19
      },
      "2": {
        name: "(anonymous_2)",
        decl: {
          start: {
            line: 35,
            column: 2
          },
          end: {
            line: 35,
            column: 3
          }
        },
        loc: {
          start: {
            line: 35,
            column: 42
          },
          end: {
            line: 54,
            column: 3
          }
        },
        line: 35
      }
    },
    branchMap: {
      "0": {
        loc: {
          start: {
            line: 8,
            column: 4
          },
          end: {
            line: 10,
            column: 5
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 8,
            column: 4
          },
          end: {
            line: 10,
            column: 5
          }
        }, {
          start: {
            line: 8,
            column: 4
          },
          end: {
            line: 10,
            column: 5
          }
        }],
        line: 8
      },
      "1": {
        loc: {
          start: {
            line: 22,
            column: 4
          },
          end: {
            line: 24,
            column: 5
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 22,
            column: 4
          },
          end: {
            line: 24,
            column: 5
          }
        }, {
          start: {
            line: 22,
            column: 4
          },
          end: {
            line: 24,
            column: 5
          }
        }],
        line: 22
      },
      "2": {
        loc: {
          start: {
            line: 28,
            column: 4
          },
          end: {
            line: 30,
            column: 5
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 28,
            column: 4
          },
          end: {
            line: 30,
            column: 5
          }
        }, {
          start: {
            line: 28,
            column: 4
          },
          end: {
            line: 30,
            column: 5
          }
        }],
        line: 28
      },
      "3": {
        loc: {
          start: {
            line: 39,
            column: 4
          },
          end: {
            line: 41,
            column: 5
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 39,
            column: 4
          },
          end: {
            line: 41,
            column: 5
          }
        }, {
          start: {
            line: 39,
            column: 4
          },
          end: {
            line: 41,
            column: 5
          }
        }],
        line: 39
      },
      "4": {
        loc: {
          start: {
            line: 45,
            column: 4
          },
          end: {
            line: 47,
            column: 5
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 45,
            column: 4
          },
          end: {
            line: 47,
            column: 5
          }
        }, {
          start: {
            line: 45,
            column: 4
          },
          end: {
            line: 47,
            column: 5
          }
        }],
        line: 45
      }
    },
    s: {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0,
      "7": 0,
      "8": 0,
      "9": 0,
      "10": 0,
      "11": 0,
      "12": 0,
      "13": 0,
      "14": 0,
      "15": 0,
      "16": 0,
      "17": 0,
      "18": 0,
      "19": 0
    },
    f: {
      "0": 0,
      "1": 0,
      "2": 0
    },
    b: {
      "0": [0, 0],
      "1": [0, 0],
      "2": [0, 0],
      "3": [0, 0],
      "4": [0, 0]
    },
    _coverageSchema: "1a1c01bbd47fc00a2c39e90264f33305004495a9",
    hash: "d466dfd4f2ae811606f078ec1a519cecbbdffd64"
  };
  var coverage = global[gcv] || (global[gcv] = {});

  if (!coverage[path] || coverage[path].hash !== hash) {
    coverage[path] = coverageData;
  }

  var actualCoverage = coverage[path];
  {
    // @ts-ignore
    cov_1g7q374t3p = function () {
      return actualCoverage;
    };
  }
  return actualCoverage;
}

cov_1g7q374t3p();
cov_1g7q374t3p().s[0]++;
Meteor.methods({
  'tasks.insert'(text) {
    cov_1g7q374t3p().f[0]++;
    cov_1g7q374t3p().s[1]++;
    check(text, String);
    cov_1g7q374t3p().s[2]++;

    if (!this.userId) {
      cov_1g7q374t3p().b[0][0]++;
      cov_1g7q374t3p().s[3]++;
      throw new Meteor.Error('Not authorized.');
    } else {
      cov_1g7q374t3p().b[0][1]++;
    }

    cov_1g7q374t3p().s[4]++;
    TasksCollection.insert({
      text,
      createdAt: new Date(),
      userId: this.userId
    });
  },

  'tasks.remove'(taskId) {
    cov_1g7q374t3p().f[1]++;
    cov_1g7q374t3p().s[5]++;
    check(taskId, String);
    cov_1g7q374t3p().s[6]++;

    if (!this.userId) {
      cov_1g7q374t3p().b[1][0]++;
      cov_1g7q374t3p().s[7]++;
      throw new Meteor.Error('Not authorized.');
    } else {
      cov_1g7q374t3p().b[1][1]++;
    }

    const task = (cov_1g7q374t3p().s[8]++, TasksCollection.findOne({
      _id: taskId,
      userId: this.userId
    }));
    cov_1g7q374t3p().s[9]++;

    if (!task) {
      cov_1g7q374t3p().b[2][0]++;
      cov_1g7q374t3p().s[10]++;
      throw new Meteor.Error('Access denied.');
    } else {
      cov_1g7q374t3p().b[2][1]++;
    }

    cov_1g7q374t3p().s[11]++;
    TasksCollection.remove(taskId);
  },

  'tasks.setIsChecked'(taskId, isChecked) {
    cov_1g7q374t3p().f[2]++;
    cov_1g7q374t3p().s[12]++;
    check(taskId, String);
    cov_1g7q374t3p().s[13]++;
    check(isChecked, Boolean);
    cov_1g7q374t3p().s[14]++;

    if (!this.userId) {
      cov_1g7q374t3p().b[3][0]++;
      cov_1g7q374t3p().s[15]++;
      throw new Meteor.Error('Not authorized.');
    } else {
      cov_1g7q374t3p().b[3][1]++;
    }

    const task = (cov_1g7q374t3p().s[16]++, TasksCollection.findOne({
      _id: taskId,
      userId: this.userId
    }));
    cov_1g7q374t3p().s[17]++;

    if (!task) {
      cov_1g7q374t3p().b[4][0]++;
      cov_1g7q374t3p().s[18]++;
      throw new Meteor.Error('Access denied.');
    } else {
      cov_1g7q374t3p().b[4][1]++;
    }

    cov_1g7q374t3p().s[19]++;
    TasksCollection.update(taskId, {
      $set: {
        isChecked
      }
    });
  }

});
//////////////////////////////////////////////////////////////////////////////////////////////////

},"tasksPublications.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                              //
// imports/api/tasksPublications.js                                                             //
//                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let TasksCollection;
module.link("/imports/db/TasksCollection", {
  TasksCollection(v) {
    TasksCollection = v;
  }

}, 1);

function cov_9aret2v5j() {
  var path = "/Users/idrismahjoubi/cypress-meteor-react/imports/api/tasksPublications.js";
  var hash = "8a4c58a7d4357efc4aa54346f550e60e15593eec";
  var global = new Function("return this")();
  var gcv = "__coverage__";
  var coverageData = {
    path: "/Users/idrismahjoubi/cypress-meteor-react/imports/api/tasksPublications.js",
    statementMap: {
      "0": {
        start: {
          line: 4,
          column: 0
        },
        end: {
          line: 6,
          column: 3
        }
      },
      "1": {
        start: {
          line: 5,
          column: 2
        },
        end: {
          line: 5,
          column: 55
        }
      }
    },
    fnMap: {
      "0": {
        name: "publishTasks",
        decl: {
          start: {
            line: 4,
            column: 33
          },
          end: {
            line: 4,
            column: 45
          }
        },
        loc: {
          start: {
            line: 4,
            column: 48
          },
          end: {
            line: 6,
            column: 1
          }
        },
        line: 4
      }
    },
    branchMap: {},
    s: {
      "0": 0,
      "1": 0
    },
    f: {
      "0": 0
    },
    b: {},
    _coverageSchema: "1a1c01bbd47fc00a2c39e90264f33305004495a9",
    hash: "8a4c58a7d4357efc4aa54346f550e60e15593eec"
  };
  var coverage = global[gcv] || (global[gcv] = {});

  if (!coverage[path] || coverage[path].hash !== hash) {
    coverage[path] = coverageData;
  }

  var actualCoverage = coverage[path];
  {
    // @ts-ignore
    cov_9aret2v5j = function () {
      return actualCoverage;
    };
  }
  return actualCoverage;
}

cov_9aret2v5j();
cov_9aret2v5j().s[0]++;
Meteor.publish('tasks', function publishTasks() {
  cov_9aret2v5j().f[0]++;
  cov_9aret2v5j().s[1]++;
  return TasksCollection.find({
    userId: this.userId
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////

}},"db":{"TasksCollection.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                              //
// imports/db/TasksCollection.js                                                                //
//                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                //
module.export({
  TasksCollection: () => TasksCollection
});
let Mongo;
module.link("meteor/mongo", {
  Mongo(v) {
    Mongo = v;
  }

}, 0);

function cov_273dnovt6i() {
  var path = "/Users/idrismahjoubi/cypress-meteor-react/imports/db/TasksCollection.js";
  var hash = "70d396568e30bd15b5efea1bf0b57db086140246";
  var global = new Function("return this")();
  var gcv = "__coverage__";
  var coverageData = {
    path: "/Users/idrismahjoubi/cypress-meteor-react/imports/db/TasksCollection.js",
    statementMap: {
      "0": {
        start: {
          line: 3,
          column: 31
        },
        end: {
          line: 3,
          column: 60
        }
      }
    },
    fnMap: {},
    branchMap: {},
    s: {
      "0": 0
    },
    f: {},
    b: {},
    _coverageSchema: "1a1c01bbd47fc00a2c39e90264f33305004495a9",
    hash: "70d396568e30bd15b5efea1bf0b57db086140246"
  };
  var coverage = global[gcv] || (global[gcv] = {});

  if (!coverage[path] || coverage[path].hash !== hash) {
    coverage[path] = coverageData;
  }

  var actualCoverage = coverage[path];
  {
    // @ts-ignore
    cov_273dnovt6i = function () {
      return actualCoverage;
    };
  }
  return actualCoverage;
}

cov_273dnovt6i();
const TasksCollection = (cov_273dnovt6i().s[0]++, new Mongo.Collection('tasks'));
//////////////////////////////////////////////////////////////////////////////////////////////////

}}},"server":{"coverage.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                              //
// server/coverage.js                                                                           //
//                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let WebApp;
module.link("meteor/webapp", {
  WebApp(v) {
    WebApp = v;
  }

}, 1);

function cov_2gggx87ym3() {
  var path = "/Users/idrismahjoubi/cypress-meteor-react/server/coverage.js";
  var hash = "d2c15fbad76f4151b6c4759b4ef5f26e04209a7e";
  var global = new Function("return this")();
  var gcv = "__coverage__";
  var coverageData = {
    path: "/Users/idrismahjoubi/cypress-meteor-react/server/coverage.js",
    statementMap: {
      "0": {
        start: {
          line: 5,
          column: 25
        },
        end: {
          line: 5,
          column: 63
        }
      },
      "1": {
        start: {
          line: 8,
          column: 2
        },
        end: {
          line: 9,
          column: 29
        }
      },
      "2": {
        start: {
          line: 14,
          column: 23
        },
        end: {
          line: 14,
          column: 38
        }
      },
      "3": {
        start: {
          line: 16,
          column: 0
        },
        end: {
          line: 22,
          column: 1
        }
      },
      "4": {
        start: {
          line: 17,
          column: 2
        },
        end: {
          line: 21,
          column: 5
        }
      },
      "5": {
        start: {
          line: 18,
          column: 19
        },
        end: {
          line: 18,
          column: 52
        }
      },
      "6": {
        start: {
          line: 19,
          column: 4
        },
        end: {
          line: 19,
          column: 61
        }
      },
      "7": {
        start: {
          line: 20,
          column: 4
        },
        end: {
          line: 20,
          column: 36
        }
      }
    },
    fnMap: {
      "0": {
        name: "(anonymous_0)",
        decl: {
          start: {
            line: 17,
            column: 45
          },
          end: {
            line: 17,
            column: 46
          }
        },
        loc: {
          start: {
            line: 17,
            column: 59
          },
          end: {
            line: 21,
            column: 3
          }
        },
        line: 17
      }
    },
    branchMap: {
      "0": {
        loc: {
          start: {
            line: 5,
            column: 25
          },
          end: {
            line: 5,
            column: 63
          }
        },
        type: "binary-expr",
        locations: [{
          start: {
            line: 5,
            column: 25
          },
          end: {
            line: 5,
            column: 46
          }
        }, {
          start: {
            line: 5,
            column: 50
          },
          end: {
            line: 5,
            column: 63
          }
        }],
        line: 5
      },
      "1": {
        loc: {
          start: {
            line: 8,
            column: 2
          },
          end: {
            line: 9,
            column: 29
          }
        },
        type: "binary-expr",
        locations: [{
          start: {
            line: 8,
            column: 3
          },
          end: {
            line: 8,
            column: 32
          }
        }, {
          start: {
            line: 8,
            column: 36
          },
          end: {
            line: 8,
            column: 64
          }
        }, {
          start: {
            line: 9,
            column: 2
          },
          end: {
            line: 9,
            column: 29
          }
        }],
        line: 8
      },
      "2": {
        loc: {
          start: {
            line: 16,
            column: 0
          },
          end: {
            line: 22,
            column: 1
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 16,
            column: 0
          },
          end: {
            line: 22,
            column: 1
          }
        }, {
          start: {
            line: 16,
            column: 0
          },
          end: {
            line: 22,
            column: 1
          }
        }],
        line: 16
      },
      "3": {
        loc: {
          start: {
            line: 16,
            column: 4
          },
          end: {
            line: 16,
            column: 32
          }
        },
        type: "binary-expr",
        locations: [{
          start: {
            line: 16,
            column: 4
          },
          end: {
            line: 16,
            column: 13
          }
        }, {
          start: {
            line: 16,
            column: 17
          },
          end: {
            line: 16,
            column: 32
          }
        }],
        line: 16
      }
    },
    s: {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0,
      "7": 0
    },
    f: {
      "0": 0
    },
    b: {
      "0": [0, 0],
      "1": [0, 0, 0],
      "2": [0, 0],
      "3": [0, 0]
    },
    _coverageSchema: "1a1c01bbd47fc00a2c39e90264f33305004495a9",
    hash: "d2c15fbad76f4151b6c4759b4ef5f26e04209a7e"
  };
  var coverage = global[gcv] || (global[gcv] = {});

  if (!coverage[path] || coverage[path].hash !== hash) {
    coverage[path] = coverageData;
  }

  var actualCoverage = coverage[path];
  {
    // @ts-ignore
    cov_2gggx87ym3 = function () {
      return actualCoverage;
    };
  }
  return actualCoverage;
}

cov_2gggx87ym3();
// Check `BABEL_ENV` to check if we are running in test mode.
const babelEnvironment = (cov_2gggx87ym3().s[0]++, (cov_2gggx87ym3().b[0][0]++, process.env.BABEL_ENV) || (cov_2gggx87ym3().b[0][1]++, 'development')); // Detect if we are running in a test environment.

const isCypress = (cov_2gggx87ym3().s[1]++, (cov_2gggx87ym3().b[1][0]++, typeof window !== 'undefined') && (cov_2gggx87ym3().b[1][1]++, window.Cypress !== undefined) || (cov_2gggx87ym3().b[1][2]++, babelEnvironment === 'test')); // Expose a route so that Cypress can fetch the coverage report for the
// server-side code. This route has to be configured in `cypress.json` in
// `env.codeCoverage.url`.

const ROUTE_COVERAGE = (cov_2gggx87ym3().s[2]++, '/__coverage__');
cov_2gggx87ym3().s[3]++;

if ((cov_2gggx87ym3().b[3][0]++, isCypress) && (cov_2gggx87ym3().b[3][1]++, Meteor.isServer)) {
  cov_2gggx87ym3().b[2][0]++;
  cov_2gggx87ym3().s[4]++;
  WebApp.connectHandlers.use(ROUTE_COVERAGE, (req, res) => {
    cov_2gggx87ym3().f[0]++;
    const result = (cov_2gggx87ym3().s[5]++, {
      coverage: global.__coverage__
    });
    cov_2gggx87ym3().s[6]++;
    res.writeHead(200, {
      'Content-Type': 'application/json'
    });
    cov_2gggx87ym3().s[7]++;
    res.end(JSON.stringify(result));
  });
} else {
  cov_2gggx87ym3().b[2][1]++;
}
//////////////////////////////////////////////////////////////////////////////////////////////////

},"main.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                              //
// server/main.js                                                                               //
//                                                                                              //
//////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Accounts;
module.link("meteor/accounts-base", {
  Accounts(v) {
    Accounts = v;
  }

}, 1);
let TasksCollection;
module.link("/imports/db/TasksCollection", {
  TasksCollection(v) {
    TasksCollection = v;
  }

}, 2);
module.link("/imports/api/tasksMethods");
module.link("/imports/api/tasksPublications");
module.link("./coverage");

function cov_19gjlkite6() {
  var path = "/Users/idrismahjoubi/cypress-meteor-react/server/main.js";
  var hash = "a1d793f8ff5b1fe7244b71467fd40a43e97793ae";
  var global = new Function("return this")();
  var gcv = "__coverage__";
  var coverageData = {
    path: "/Users/idrismahjoubi/cypress-meteor-react/server/main.js",
    statementMap: {
      "0": {
        start: {
          line: 8,
          column: 19
        },
        end: {
          line: 13,
          column: 4
        }
      },
      "1": {
        start: {
          line: 9,
          column: 2
        },
        end: {
          line: 13,
          column: 4
        }
      },
      "2": {
        start: {
          line: 15,
          column: 22
        },
        end: {
          line: 15,
          column: 33
        }
      },
      "3": {
        start: {
          line: 16,
          column: 22
        },
        end: {
          line: 16,
          column: 32
        }
      },
      "4": {
        start: {
          line: 18,
          column: 0
        },
        end: {
          line: 39,
          column: 3
        }
      },
      "5": {
        start: {
          line: 19,
          column: 2
        },
        end: {
          line: 24,
          column: 3
        }
      },
      "6": {
        start: {
          line: 20,
          column: 4
        },
        end: {
          line: 23,
          column: 7
        }
      },
      "7": {
        start: {
          line: 26,
          column: 15
        },
        end: {
          line: 26,
          column: 57
        }
      },
      "8": {
        start: {
          line: 28,
          column: 2
        },
        end: {
          line: 38,
          column: 3
        }
      },
      "9": {
        start: {
          line: 29,
          column: 4
        },
        end: {
          line: 37,
          column: 56
        }
      },
      "10": {
        start: {
          line: 37,
          column: 28
        },
        end: {
          line: 37,
          column: 54
        }
      }
    },
    fnMap: {
      "0": {
        name: "(anonymous_0)",
        decl: {
          start: {
            line: 8,
            column: 19
          },
          end: {
            line: 8,
            column: 20
          }
        },
        loc: {
          start: {
            line: 9,
            column: 2
          },
          end: {
            line: 13,
            column: 4
          }
        },
        line: 9
      },
      "1": {
        name: "(anonymous_1)",
        decl: {
          start: {
            line: 18,
            column: 15
          },
          end: {
            line: 18,
            column: 16
          }
        },
        loc: {
          start: {
            line: 18,
            column: 21
          },
          end: {
            line: 39,
            column: 1
          }
        },
        line: 18
      },
      "2": {
        name: "(anonymous_2)",
        decl: {
          start: {
            line: 37,
            column: 14
          },
          end: {
            line: 37,
            column: 15
          }
        },
        loc: {
          start: {
            line: 37,
            column: 28
          },
          end: {
            line: 37,
            column: 54
          }
        },
        line: 37
      }
    },
    branchMap: {
      "0": {
        loc: {
          start: {
            line: 19,
            column: 2
          },
          end: {
            line: 24,
            column: 3
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 19,
            column: 2
          },
          end: {
            line: 24,
            column: 3
          }
        }, {
          start: {
            line: 19,
            column: 2
          },
          end: {
            line: 24,
            column: 3
          }
        }],
        line: 19
      },
      "1": {
        loc: {
          start: {
            line: 28,
            column: 2
          },
          end: {
            line: 38,
            column: 3
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 28,
            column: 2
          },
          end: {
            line: 38,
            column: 3
          }
        }, {
          start: {
            line: 28,
            column: 2
          },
          end: {
            line: 38,
            column: 3
          }
        }],
        line: 28
      }
    },
    s: {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0,
      "7": 0,
      "8": 0,
      "9": 0,
      "10": 0
    },
    f: {
      "0": 0,
      "1": 0,
      "2": 0
    },
    b: {
      "0": [0, 0],
      "1": [0, 0]
    },
    _coverageSchema: "1a1c01bbd47fc00a2c39e90264f33305004495a9",
    hash: "a1d793f8ff5b1fe7244b71467fd40a43e97793ae"
  };
  var coverage = global[gcv] || (global[gcv] = {});

  if (!coverage[path] || coverage[path].hash !== hash) {
    coverage[path] = coverageData;
  }

  var actualCoverage = coverage[path];
  {
    // @ts-ignore
    cov_19gjlkite6 = function () {
      return actualCoverage;
    };
  }
  return actualCoverage;
}

cov_19gjlkite6();
cov_19gjlkite6().s[0]++;

const insertTask = (taskText, user) => {
  cov_19gjlkite6().f[0]++;
  cov_19gjlkite6().s[1]++;
  return TasksCollection.insert({
    text: taskText,
    userId: user._id,
    createdAt: new Date()
  });
};

const SEED_USERNAME = (cov_19gjlkite6().s[2]++, 'usertimes');
const SEED_PASSWORD = (cov_19gjlkite6().s[3]++, 'password');
cov_19gjlkite6().s[4]++;
Meteor.startup(() => {
  cov_19gjlkite6().f[1]++;
  cov_19gjlkite6().s[5]++;

  if (!Accounts.findUserByUsername(SEED_USERNAME)) {
    cov_19gjlkite6().b[0][0]++;
    cov_19gjlkite6().s[6]++;
    Accounts.createUser({
      username: SEED_USERNAME,
      password: SEED_PASSWORD
    });
  } else {
    cov_19gjlkite6().b[0][1]++;
  }

  const user = (cov_19gjlkite6().s[7]++, Accounts.findUserByUsername(SEED_USERNAME));
  cov_19gjlkite6().s[8]++;

  if (TasksCollection.find().count() === 0) {
    cov_19gjlkite6().b[1][0]++;
    cov_19gjlkite6().s[9]++;
    ['First Task', 'Second Task', 'Third Task', 'Fourth Task', 'Fifth Task', 'Sixth Task', 'Seventh Task'].forEach(taskText => {
      cov_19gjlkite6().f[2]++;
      cov_19gjlkite6().s[10]++;
      return insertTask(taskText, user);
    });
  } else {
    cov_19gjlkite6().b[1][1]++;
  }
});
//////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".ts",
    ".mjs"
  ]
});

var exports = require("/server/main.js");
//# sourceURL=meteor://💻app/app/app.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9hcGkvdGFza3NNZXRob2RzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9pbXBvcnRzL2FwaS90YXNrc1B1YmxpY2F0aW9ucy5qcyIsIm1ldGVvcjovL/CfkrthcHAvaW1wb3J0cy9kYi9UYXNrc0NvbGxlY3Rpb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3NlcnZlci9jb3ZlcmFnZS5qcyIsIm1ldGVvcjovL/CfkrthcHAvc2VydmVyL21haW4uanMiXSwibmFtZXMiOlsiTWV0ZW9yIiwiY2hlY2siLCJUYXNrc0NvbGxlY3Rpb24iLCJjcmVhdGVkQXQiLCJ1c2VySWQiLCJ0YXNrIiwiX2lkIiwiJHNldCIsImlzQ2hlY2tlZCIsIk1vbmdvIiwiYmFiZWxFbnZpcm9ubWVudCIsImlzQ3lwcmVzcyIsIndpbmRvdyIsIlJPVVRFX0NPVkVSQUdFIiwiV2ViQXBwIiwicmVzdWx0IiwiY292ZXJhZ2UiLCJnbG9iYWwiLCJfX2NvdmVyYWdlX18iLCJyZXMiLCJKU09OIiwiaW5zZXJ0VGFzayIsInRleHQiLCJ1c2VyIiwiU0VFRF9VU0VSTkFNRSIsIlNFRURfUEFTU1dPUkQiLCJBY2NvdW50cyIsInVzZXJuYW1lIiwicGFzc3dvcmQiLCJ0YXNrVGV4dCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7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Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQ0FZOzs7Ozs7Ozs7OztBQVJaLE1BQU1PLFVBQVUsR0FBRyxvQkFDakI7QUFBQTtBQUFBO0FBQUEsd0JBQWUsQ0FBZixPQUF1QjtBQUNyQkMsUUFBSSxFQURpQjtBQUVyQmxCLFVBQU0sRUFBRW1CLElBQUksQ0FGUztBQUdyQnBCLGFBQVMsRUFBRTtBQUhVLEdBQXZCO0FBREY7O0FBT0EsTUFBTXFCLGFBQWEsNkJBQW5CLFdBQW1CLENBQW5CO0FBQ0EsTUFBTUMsYUFBYSw2QkFBbkIsVUFBbUIsQ0FBbkI7O0FBRUF6QixNQUFNLENBQU5BLFFBQWUsTUFBTTtBQUFBO0FBQUE7O0FBQ25CLE1BQUksQ0FBQzBCLFFBQVEsQ0FBUkEsbUJBQUwsYUFBS0EsQ0FBTCxFQUFpRDtBQUFBO0FBQUE7QUFDL0NBLFlBQVEsQ0FBUkEsV0FBb0I7QUFDbEJDLGNBQVEsRUFEVTtBQUVsQkMsY0FBUSxFQUFFSDtBQUZRLEtBQXBCQztBQURGO0FBQUE7QUFBQTs7QUFPQSxRQUFNSCxJQUFJLDZCQUFHRyxRQUFRLENBQVJBLG1CQUFiLGFBQWFBLENBQUgsQ0FBVjtBQVJtQjs7QUFVbkIsTUFBSXhCLGVBQWUsQ0FBZkEsbUJBQUosR0FBMEM7QUFBQTtBQUFBO0FBQ3hDLG1IQVFXMkIsUUFBRCxJQUFjO0FBQUE7QUFBQTtBQUFBLHVCQUFVLFdBQVYsSUFBVSxDQUFWO0FBUnhCO0FBREY7QUFBQTtBQUFBO0FBVkY3QixHIiwiZmlsZSI6Ii9hcHAuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjaGVjayB9IGZyb20gJ21ldGVvci9jaGVjayc7XG5pbXBvcnQgeyBUYXNrc0NvbGxlY3Rpb24gfSBmcm9tICcvaW1wb3J0cy9kYi9UYXNrc0NvbGxlY3Rpb24nO1xuXG5NZXRlb3IubWV0aG9kcyh7XG4gICd0YXNrcy5pbnNlcnQnKHRleHQpIHtcbiAgICBjaGVjayh0ZXh0LCBTdHJpbmcpO1xuXG4gICAgaWYgKCF0aGlzLnVzZXJJZCkge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcignTm90IGF1dGhvcml6ZWQuJyk7XG4gICAgfVxuXG4gICAgVGFza3NDb2xsZWN0aW9uLmluc2VydCh7XG4gICAgICB0ZXh0LFxuICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxuICAgICAgdXNlcklkOiB0aGlzLnVzZXJJZCxcbiAgICB9KTtcbiAgfSxcblxuICAndGFza3MucmVtb3ZlJyh0YXNrSWQpIHtcbiAgICBjaGVjayh0YXNrSWQsIFN0cmluZyk7XG5cbiAgICBpZiAoIXRoaXMudXNlcklkKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdOb3QgYXV0aG9yaXplZC4nKTtcbiAgICB9XG5cbiAgICBjb25zdCB0YXNrID0gVGFza3NDb2xsZWN0aW9uLmZpbmRPbmUoeyBfaWQ6IHRhc2tJZCwgdXNlcklkOiB0aGlzLnVzZXJJZCB9KTtcblxuICAgIGlmICghdGFzaykge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcignQWNjZXNzIGRlbmllZC4nKTtcbiAgICB9XG5cbiAgICBUYXNrc0NvbGxlY3Rpb24ucmVtb3ZlKHRhc2tJZCk7XG4gIH0sXG5cbiAgJ3Rhc2tzLnNldElzQ2hlY2tlZCcodGFza0lkLCBpc0NoZWNrZWQpIHtcbiAgICBjaGVjayh0YXNrSWQsIFN0cmluZyk7XG4gICAgY2hlY2soaXNDaGVja2VkLCBCb29sZWFuKTtcblxuICAgIGlmICghdGhpcy51c2VySWQpIHtcbiAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoJ05vdCBhdXRob3JpemVkLicpO1xuICAgIH1cblxuICAgIGNvbnN0IHRhc2sgPSBUYXNrc0NvbGxlY3Rpb24uZmluZE9uZSh7IF9pZDogdGFza0lkLCB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xuXG4gICAgaWYgKCF0YXNrKSB7XG4gICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKCdBY2Nlc3MgZGVuaWVkLicpO1xuICAgIH1cblxuICAgIFRhc2tzQ29sbGVjdGlvbi51cGRhdGUodGFza0lkLCB7XG4gICAgICAkc2V0OiB7XG4gICAgICAgIGlzQ2hlY2tlZCxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH0sXG59KTtcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgVGFza3NDb2xsZWN0aW9uIH0gZnJvbSAnL2ltcG9ydHMvZGIvVGFza3NDb2xsZWN0aW9uJztcblxuTWV0ZW9yLnB1Ymxpc2goJ3Rhc2tzJywgZnVuY3Rpb24gcHVibGlzaFRhc2tzKCkge1xuICByZXR1cm4gVGFza3NDb2xsZWN0aW9uLmZpbmQoeyB1c2VySWQ6IHRoaXMudXNlcklkIH0pO1xufSk7XG4iLCJpbXBvcnQgeyBNb25nbyB9IGZyb20gJ21ldGVvci9tb25nbyc7XG5cbmV4cG9ydCBjb25zdCBUYXNrc0NvbGxlY3Rpb24gPSBuZXcgTW9uZ28uQ29sbGVjdGlvbigndGFza3MnKTtcbiIsImltcG9ydCB7IE1ldGVvciB9IGZyb20gJ21ldGVvci9tZXRlb3InO1xuaW1wb3J0IHsgV2ViQXBwIH0gZnJvbSAnbWV0ZW9yL3dlYmFwcCc7XG5cbi8vIENoZWNrIGBCQUJFTF9FTlZgIHRvIGNoZWNrIGlmIHdlIGFyZSBydW5uaW5nIGluIHRlc3QgbW9kZS5cbmNvbnN0IGJhYmVsRW52aXJvbm1lbnQgPSBwcm9jZXNzLmVudi5CQUJFTF9FTlYgfHwgJ2RldmVsb3BtZW50Jztcbi8vIERldGVjdCBpZiB3ZSBhcmUgcnVubmluZyBpbiBhIHRlc3QgZW52aXJvbm1lbnQuXG5jb25zdCBpc0N5cHJlc3MgPVxuICAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LkN5cHJlc3MgIT09IHVuZGVmaW5lZCkgfHxcbiAgYmFiZWxFbnZpcm9ubWVudCA9PT0gJ3Rlc3QnO1xuXG4vLyBFeHBvc2UgYSByb3V0ZSBzbyB0aGF0IEN5cHJlc3MgY2FuIGZldGNoIHRoZSBjb3ZlcmFnZSByZXBvcnQgZm9yIHRoZVxuLy8gc2VydmVyLXNpZGUgY29kZS4gVGhpcyByb3V0ZSBoYXMgdG8gYmUgY29uZmlndXJlZCBpbiBgY3lwcmVzcy5qc29uYCBpblxuLy8gYGVudi5jb2RlQ292ZXJhZ2UudXJsYC5cbmNvbnN0IFJPVVRFX0NPVkVSQUdFID0gJy9fX2NvdmVyYWdlX18nO1xuXG5pZiAoaXNDeXByZXNzICYmIE1ldGVvci5pc1NlcnZlcikge1xuICBXZWJBcHAuY29ubmVjdEhhbmRsZXJzLnVzZShST1VURV9DT1ZFUkFHRSwgKHJlcSwgcmVzKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0geyBjb3ZlcmFnZTogZ2xvYmFsLl9fY292ZXJhZ2VfXyB9O1xuICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJ30pO1xuICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkocmVzdWx0KSk7XG4gIH0pO1xufVxuXG4iLCJpbXBvcnQgeyBNZXRlb3IgfSBmcm9tICdtZXRlb3IvbWV0ZW9yJztcbmltcG9ydCB7IEFjY291bnRzIH0gZnJvbSAnbWV0ZW9yL2FjY291bnRzLWJhc2UnO1xuaW1wb3J0IHsgVGFza3NDb2xsZWN0aW9uIH0gZnJvbSAnL2ltcG9ydHMvZGIvVGFza3NDb2xsZWN0aW9uJztcbmltcG9ydCAnL2ltcG9ydHMvYXBpL3Rhc2tzTWV0aG9kcyc7XG5pbXBvcnQgJy9pbXBvcnRzL2FwaS90YXNrc1B1YmxpY2F0aW9ucyc7XG5pbXBvcnQgJy4vY292ZXJhZ2UnO1xuXG5jb25zdCBpbnNlcnRUYXNrID0gKHRhc2tUZXh0LCB1c2VyKSA9PlxuICBUYXNrc0NvbGxlY3Rpb24uaW5zZXJ0KHtcbiAgICB0ZXh0OiB0YXNrVGV4dCxcbiAgICB1c2VySWQ6IHVzZXIuX2lkLFxuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcbiAgfSk7XG5cbmNvbnN0IFNFRURfVVNFUk5BTUUgPSAndXNlcnRpbWVzJztcbmNvbnN0IFNFRURfUEFTU1dPUkQgPSAncGFzc3dvcmQnO1xuXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG4gIGlmICghQWNjb3VudHMuZmluZFVzZXJCeVVzZXJuYW1lKFNFRURfVVNFUk5BTUUpKSB7XG4gICAgQWNjb3VudHMuY3JlYXRlVXNlcih7XG4gICAgICB1c2VybmFtZTogU0VFRF9VU0VSTkFNRSxcbiAgICAgIHBhc3N3b3JkOiBTRUVEX1BBU1NXT1JELFxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgdXNlciA9IEFjY291bnRzLmZpbmRVc2VyQnlVc2VybmFtZShTRUVEX1VTRVJOQU1FKTtcblxuICBpZiAoVGFza3NDb2xsZWN0aW9uLmZpbmQoKS5jb3VudCgpID09PSAwKSB7XG4gICAgW1xuICAgICAgJ0ZpcnN0IFRhc2snLFxuICAgICAgJ1NlY29uZCBUYXNrJyxcbiAgICAgICdUaGlyZCBUYXNrJyxcbiAgICAgICdGb3VydGggVGFzaycsXG4gICAgICAnRmlmdGggVGFzaycsXG4gICAgICAnU2l4dGggVGFzaycsXG4gICAgICAnU2V2ZW50aCBUYXNrJyxcbiAgICBdLmZvckVhY2goKHRhc2tUZXh0KSA9PiBpbnNlcnRUYXNrKHRhc2tUZXh0LCB1c2VyKSk7XG4gIH1cbn0pO1xuIl19
