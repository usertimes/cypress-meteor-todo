var require = meteorInstall({"imports":{"db":{"TasksCollection.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// imports/db/TasksCollection.js                                                                              //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"ui":{"App.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// imports/ui/App.js                                                                                          //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
let _objectSpread;

module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }

}, 0);
module.export({
  App: () => App
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let React, useState, Fragment;
module.link("react", {
  default(v) {
    React = v;
  },

  useState(v) {
    useState = v;
  },

  Fragment(v) {
    Fragment = v;
  }

}, 1);
let useTracker;
module.link("meteor/react-meteor-data", {
  useTracker(v) {
    useTracker = v;
  }

}, 2);
let TasksCollection;
module.link("/imports/db/TasksCollection", {
  TasksCollection(v) {
    TasksCollection = v;
  }

}, 3);
let Task;
module.link("./Task", {
  Task(v) {
    Task = v;
  }

}, 4);
let TaskForm;
module.link("./TaskForm", {
  TaskForm(v) {
    TaskForm = v;
  }

}, 5);
let LoginForm;
module.link("./LoginForm", {
  LoginForm(v) {
    LoginForm = v;
  }

}, 6);
let testProp, COUNTER;
module.link("../testIds", {
  testProp(v) {
    testProp = v;
  },

  COUNTER(v) {
    COUNTER = v;
  }

}, 7);

function cov_4oh2l4gaa() {
  var path = "/Users/idrismahjoubi/cypress-meteor-react/imports/ui/App.js";
  var hash = "266607952ceb078c700123762b57b0b918f56a03";
  var global = new Function("return this")();
  var gcv = "__coverage__";
  var coverageData = {
    path: "/Users/idrismahjoubi/cypress-meteor-react/imports/ui/App.js",
    statementMap: {
      "0": {
        start: {
          line: 10,
          column: 22
        },
        end: {
          line: 11,
          column: 52
        }
      },
      "1": {
        start: {
          line: 11,
          column: 2
        },
        end: {
          line: 11,
          column: 52
        }
      },
      "2": {
        start: {
          line: 13,
          column: 19
        },
        end: {
          line: 13,
          column: 64
        }
      },
      "3": {
        start: {
          line: 13,
          column: 32
        },
        end: {
          line: 13,
          column: 64
        }
      },
      "4": {
        start: {
          line: 15,
          column: 19
        },
        end: {
          line: 101,
          column: 1
        }
      },
      "5": {
        start: {
          line: 16,
          column: 15
        },
        end: {
          line: 16,
          column: 46
        }
      },
      "6": {
        start: {
          line: 16,
          column: 32
        },
        end: {
          line: 16,
          column: 45
        }
      },
      "7": {
        start: {
          line: 18,
          column: 44
        },
        end: {
          line: 18,
          column: 59
        }
      },
      "8": {
        start: {
          line: 20,
          column: 30
        },
        end: {
          line: 20,
          column: 58
        }
      },
      "9": {
        start: {
          line: 22,
          column: 21
        },
        end: {
          line: 22,
          column: 53
        }
      },
      "10": {
        start: {
          line: 24,
          column: 28
        },
        end: {
          line: 24,
          column: 69
        }
      },
      "11": {
        start: {
          line: 26,
          column: 50
        },
        end: {
          line: 46,
          column: 4
        }
      },
      "12": {
        start: {
          line: 27,
          column: 28
        },
        end: {
          line: 27,
          column: 63
        }
      },
      "13": {
        start: {
          line: 28,
          column: 4
        },
        end: {
          line: 30,
          column: 5
        }
      },
      "14": {
        start: {
          line: 29,
          column: 6
        },
        end: {
          line: 29,
          column: 29
        }
      },
      "15": {
        start: {
          line: 31,
          column: 20
        },
        end: {
          line: 31,
          column: 45
        }
      },
      "16": {
        start: {
          line: 33,
          column: 4
        },
        end: {
          line: 35,
          column: 5
        }
      },
      "17": {
        start: {
          line: 34,
          column: 6
        },
        end: {
          line: 34,
          column: 53
        }
      },
      "18": {
        start: {
          line: 37,
          column: 18
        },
        end: {
          line: 42,
          column: 13
        }
      },
      "19": {
        start: {
          line: 43,
          column: 30
        },
        end: {
          line: 43,
          column: 77
        }
      },
      "20": {
        start: {
          line: 45,
          column: 4
        },
        end: {
          line: 45,
          column: 40
        }
      },
      "21": {
        start: {
          line: 48,
          column: 28
        },
        end: {
          line: 50,
          column: 4
        }
      },
      "22": {
        start: {
          line: 52,
          column: 17
        },
        end: {
          line: 52,
          column: 38
        }
      },
      "23": {
        start: {
          line: 52,
          column: 23
        },
        end: {
          line: 52,
          column: 38
        }
      },
      "24": {
        start: {
          line: 54,
          column: 2
        },
        end: {
          line: 100,
          column: 4
        }
      },
      "25": {
        start: {
          line: 77,
          column: 37
        },
        end: {
          line: 77,
          column: 69
        }
      },
      "26": {
        start: {
          line: 86,
          column: 16
        },
        end: {
          line: 91,
          column: 18
        }
      }
    },
    fnMap: {
      "0": {
        name: "(anonymous_0)",
        decl: {
          start: {
            line: 10,
            column: 22
          },
          end: {
            line: 10,
            column: 23
          }
        },
        loc: {
          start: {
            line: 11,
            column: 2
          },
          end: {
            line: 11,
            column: 52
          }
        },
        line: 11
      },
      "1": {
        name: "(anonymous_1)",
        decl: {
          start: {
            line: 13,
            column: 19
          },
          end: {
            line: 13,
            column: 20
          }
        },
        loc: {
          start: {
            line: 13,
            column: 32
          },
          end: {
            line: 13,
            column: 64
          }
        },
        line: 13
      },
      "2": {
        name: "(anonymous_2)",
        decl: {
          start: {
            line: 15,
            column: 19
          },
          end: {
            line: 15,
            column: 20
          }
        },
        loc: {
          start: {
            line: 15,
            column: 25
          },
          end: {
            line: 101,
            column: 1
          }
        },
        line: 15
      },
      "3": {
        name: "(anonymous_3)",
        decl: {
          start: {
            line: 16,
            column: 26
          },
          end: {
            line: 16,
            column: 27
          }
        },
        loc: {
          start: {
            line: 16,
            column: 32
          },
          end: {
            line: 16,
            column: 45
          }
        },
        line: 16
      },
      "4": {
        name: "(anonymous_4)",
        decl: {
          start: {
            line: 26,
            column: 61
          },
          end: {
            line: 26,
            column: 62
          }
        },
        loc: {
          start: {
            line: 26,
            column: 67
          },
          end: {
            line: 46,
            column: 3
          }
        },
        line: 26
      },
      "5": {
        name: "(anonymous_5)",
        decl: {
          start: {
            line: 52,
            column: 17
          },
          end: {
            line: 52,
            column: 18
          }
        },
        loc: {
          start: {
            line: 52,
            column: 23
          },
          end: {
            line: 52,
            column: 38
          }
        },
        line: 52
      },
      "6": {
        name: "(anonymous_6)",
        decl: {
          start: {
            line: 77,
            column: 31
          },
          end: {
            line: 77,
            column: 32
          }
        },
        loc: {
          start: {
            line: 77,
            column: 37
          },
          end: {
            line: 77,
            column: 69
          }
        },
        line: 77
      },
      "7": {
        name: "(anonymous_7)",
        decl: {
          start: {
            line: 85,
            column: 25
          },
          end: {
            line: 85,
            column: 26
          }
        },
        loc: {
          start: {
            line: 86,
            column: 16
          },
          end: {
            line: 91,
            column: 18
          }
        },
        line: 86
      }
    },
    branchMap: {
      "0": {
        loc: {
          start: {
            line: 22,
            column: 21
          },
          end: {
            line: 22,
            column: 53
          }
        },
        type: "cond-expr",
        locations: [{
          start: {
            line: 22,
            column: 28
          },
          end: {
            line: 22,
            column: 48
          }
        }, {
          start: {
            line: 22,
            column: 51
          },
          end: {
            line: 22,
            column: 53
          }
        }],
        line: 22
      },
      "1": {
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
      "2": {
        loc: {
          start: {
            line: 33,
            column: 4
          },
          end: {
            line: 35,
            column: 5
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 33,
            column: 4
          },
          end: {
            line: 35,
            column: 5
          }
        }, {
          start: {
            line: 33,
            column: 4
          },
          end: {
            line: 35,
            column: 5
          }
        }],
        line: 33
      },
      "3": {
        loc: {
          start: {
            line: 38,
            column: 6
          },
          end: {
            line: 38,
            column: 52
          }
        },
        type: "cond-expr",
        locations: [{
          start: {
            line: 38,
            column: 22
          },
          end: {
            line: 38,
            column: 39
          }
        }, {
          start: {
            line: 38,
            column: 42
          },
          end: {
            line: 38,
            column: 52
          }
        }],
        line: 38
      },
      "4": {
        loc: {
          start: {
            line: 49,
            column: 4
          },
          end: {
            line: 49,
            column: 54
          }
        },
        type: "cond-expr",
        locations: [{
          start: {
            line: 49,
            column: 24
          },
          end: {
            line: 49,
            column: 49
          }
        }, {
          start: {
            line: 49,
            column: 52
          },
          end: {
            line: 49,
            column: 54
          }
        }],
        line: 49
      },
      "5": {
        loc: {
          start: {
            line: 68,
            column: 9
          },
          end: {
            line: 97,
            column: 9
          }
        },
        type: "cond-expr",
        locations: [{
          start: {
            line: 69,
            column: 10
          },
          end: {
            line: 94,
            column: 21
          }
        }, {
          start: {
            line: 96,
            column: 10
          },
          end: {
            line: 96,
            column: 23
          }
        }],
        line: 68
      },
      "6": {
        loc: {
          start: {
            line: 78,
            column: 17
          },
          end: {
            line: 78,
            column: 62
          }
        },
        type: "cond-expr",
        locations: [{
          start: {
            line: 78,
            column: 33
          },
          end: {
            line: 78,
            column: 43
          }
        }, {
          start: {
            line: 78,
            column: 46
          },
          end: {
            line: 78,
            column: 62
          }
        }],
        line: 78
      },
      "7": {
        loc: {
          start: {
            line: 82,
            column: 13
          },
          end: {
            line: 82,
            column: 67
          }
        },
        type: "binary-expr",
        locations: [{
          start: {
            line: 82,
            column: 13
          },
          end: {
            line: 82,
            column: 22
          }
        }, {
          start: {
            line: 82,
            column: 26
          },
          end: {
            line: 82,
            column: 67
          }
        }],
        line: 82
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
      "19": 0,
      "20": 0,
      "21": 0,
      "22": 0,
      "23": 0,
      "24": 0,
      "25": 0,
      "26": 0
    },
    f: {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0,
      "7": 0
    },
    b: {
      "0": [0, 0],
      "1": [0, 0],
      "2": [0, 0],
      "3": [0, 0],
      "4": [0, 0],
      "5": [0, 0],
      "6": [0, 0],
      "7": [0, 0]
    },
    _coverageSchema: "1a1c01bbd47fc00a2c39e90264f33305004495a9",
    hash: "266607952ceb078c700123762b57b0b918f56a03"
  };
  var coverage = global[gcv] || (global[gcv] = {});

  if (!coverage[path] || coverage[path].hash !== hash) {
    coverage[path] = coverageData;
  }

  var actualCoverage = coverage[path];
  {
    // @ts-ignore
    cov_4oh2l4gaa = function () {
      return actualCoverage;
    };
  }
  return actualCoverage;
}

cov_4oh2l4gaa();
cov_4oh2l4gaa().s[0]++;

const toggleChecked = (_ref) => {
  let {
    _id,
    isChecked
  } = _ref;
  cov_4oh2l4gaa().f[0]++;
  cov_4oh2l4gaa().s[1]++;
  return Meteor.call('tasks.setIsChecked', _id, !isChecked);
};

cov_4oh2l4gaa().s[2]++;

const deleteTask = (_ref2) => {
  let {
    _id
  } = _ref2;
  cov_4oh2l4gaa().f[1]++;
  cov_4oh2l4gaa().s[3]++;
  return Meteor.call('tasks.remove', _id);
};

cov_4oh2l4gaa().s[4]++;

const App = () => {
  cov_4oh2l4gaa().f[2]++;
  const user = (cov_4oh2l4gaa().s[5]++, useTracker(() => {
    cov_4oh2l4gaa().f[3]++;
    cov_4oh2l4gaa().s[6]++;
    return Meteor.user();
  }));
  const [hideCompleted, setHideCompleted] = (cov_4oh2l4gaa().s[7]++, useState(false));
  const hideCompletedFilter = (cov_4oh2l4gaa().s[8]++, {
    isChecked: {
      $ne: true
    }
  });
  const userFilter = (cov_4oh2l4gaa().s[9]++, user ? (cov_4oh2l4gaa().b[0][0]++, {
    userId: user._id
  }) : (cov_4oh2l4gaa().b[0][1]++, {}));
  const pendingOnlyFilter = (cov_4oh2l4gaa().s[10]++, _objectSpread(_objectSpread({}, hideCompletedFilter), userFilter));
  const {
    tasks,
    pendingTasksCount,
    isLoading
  } = (cov_4oh2l4gaa().s[11]++, useTracker(() => {
    cov_4oh2l4gaa().f[4]++;
    const noDataAvailable = (cov_4oh2l4gaa().s[12]++, {
      tasks: [],
      pendingTasksCount: 0
    });
    cov_4oh2l4gaa().s[13]++;

    if (!Meteor.user()) {
      cov_4oh2l4gaa().b[1][0]++;
      cov_4oh2l4gaa().s[14]++;
      return noDataAvailable;
    } else {
      cov_4oh2l4gaa().b[1][1]++;
    }

    const handler = (cov_4oh2l4gaa().s[15]++, Meteor.subscribe('tasks'));
    cov_4oh2l4gaa().s[16]++;

    if (!handler.ready()) {
      cov_4oh2l4gaa().b[2][0]++;
      cov_4oh2l4gaa().s[17]++;
      return _objectSpread(_objectSpread({}, noDataAvailable), {}, {
        isLoading: true
      });
    } else {
      cov_4oh2l4gaa().b[2][1]++;
    }

    const tasks = (cov_4oh2l4gaa().s[18]++, TasksCollection.find(hideCompleted ? (cov_4oh2l4gaa().b[3][0]++, pendingOnlyFilter) : (cov_4oh2l4gaa().b[3][1]++, userFilter), {
      sort: {
        createdAt: -1
      }
    }).fetch());
    const pendingTasksCount = (cov_4oh2l4gaa().s[19]++, TasksCollection.find(pendingOnlyFilter).count());
    cov_4oh2l4gaa().s[20]++;
    return {
      tasks,
      pendingTasksCount
    };
  }));
  const pendingTasksTitle = (cov_4oh2l4gaa().s[21]++, "".concat(pendingTasksCount ? (cov_4oh2l4gaa().b[4][0]++, " (".concat(pendingTasksCount, ")")) : (cov_4oh2l4gaa().b[4][1]++, '')));
  cov_4oh2l4gaa().s[22]++;

  const logout = () => {
    cov_4oh2l4gaa().f[5]++;
    cov_4oh2l4gaa().s[23]++;
    return Meteor.logout();
  };

  cov_4oh2l4gaa().s[24]++;
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement("header", null, /*#__PURE__*/React.createElement("div", {
    className: "app-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-header"
  }, /*#__PURE__*/React.createElement("h1", null, "\uD83D\uDCDD\uFE0F To Do List", /*#__PURE__*/React.createElement("span", testProp(COUNTER), " ", pendingTasksTitle, " "))))), /*#__PURE__*/React.createElement("div", {
    className: "main"
  }, user ? (cov_4oh2l4gaa().b[5][0]++, /*#__PURE__*/React.createElement(Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "user",
    onClick: logout
  }, user.username, " \uD83D\uDEAA"), /*#__PURE__*/React.createElement(TaskForm, null), /*#__PURE__*/React.createElement("div", {
    className: "filter"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      cov_4oh2l4gaa().f[6]++;
      cov_4oh2l4gaa().s[25]++;
      return setHideCompleted(!hideCompleted);
    }
  }, hideCompleted ? (cov_4oh2l4gaa().b[6][0]++, 'Show All') : (cov_4oh2l4gaa().b[6][1]++, 'Hide Completed'))), (cov_4oh2l4gaa().b[7][0]++, isLoading) && (cov_4oh2l4gaa().b[7][1]++, /*#__PURE__*/React.createElement("div", {
    className: "loading"
  }, "loading...")), /*#__PURE__*/React.createElement("ul", {
    className: "tasks"
  }, tasks.map(task => {
    cov_4oh2l4gaa().f[7]++;
    cov_4oh2l4gaa().s[26]++;
    return /*#__PURE__*/React.createElement(Task, {
      key: task._id,
      task: task,
      onCheckboxClick: toggleChecked,
      onDeleteClick: deleteTask
    });
  })))) : (cov_4oh2l4gaa().b[5][1]++, /*#__PURE__*/React.createElement(LoginForm, null))));
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"LoginForm.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// imports/ui/LoginForm.js                                                                                    //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
let _extends;

module.link("@babel/runtime/helpers/extends", {
  default(v) {
    _extends = v;
  }

}, 0);
module.export({
  LoginForm: () => LoginForm
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let React, useState;
module.link("react", {
  default(v) {
    React = v;
  },

  useState(v) {
    useState = v;
  }

}, 1);
let LOGIN_BUTTON, testProp;
module.link("../testIds", {
  LOGIN_BUTTON(v) {
    LOGIN_BUTTON = v;
  },

  testProp(v) {
    testProp = v;
  }

}, 2);

function cov_gn6csi8bt() {
  var path = "/Users/idrismahjoubi/cypress-meteor-react/imports/ui/LoginForm.js";
  var hash = "623f605bdfcce5a9c304c569e5150ceeb7c20d96";
  var global = new Function("return this")();
  var gcv = "__coverage__";
  var coverageData = {
    path: "/Users/idrismahjoubi/cypress-meteor-react/imports/ui/LoginForm.js",
    statementMap: {
      "0": {
        start: {
          line: 5,
          column: 25
        },
        end: {
          line: 46,
          column: 1
        }
      },
      "1": {
        start: {
          line: 6,
          column: 34
        },
        end: {
          line: 6,
          column: 46
        }
      },
      "2": {
        start: {
          line: 7,
          column: 34
        },
        end: {
          line: 7,
          column: 46
        }
      },
      "3": {
        start: {
          line: 9,
          column: 17
        },
        end: {
          line: 13,
          column: 3
        }
      },
      "4": {
        start: {
          line: 10,
          column: 4
        },
        end: {
          line: 10,
          column: 23
        }
      },
      "5": {
        start: {
          line: 12,
          column: 4
        },
        end: {
          line: 12,
          column: 49
        }
      },
      "6": {
        start: {
          line: 15,
          column: 2
        },
        end: {
          line: 45,
          column: 4
        }
      },
      "7": {
        start: {
          line: 24,
          column: 27
        },
        end: {
          line: 24,
          column: 54
        }
      },
      "8": {
        start: {
          line: 36,
          column: 27
        },
        end: {
          line: 36,
          column: 54
        }
      }
    },
    fnMap: {
      "0": {
        name: "(anonymous_0)",
        decl: {
          start: {
            line: 5,
            column: 25
          },
          end: {
            line: 5,
            column: 26
          }
        },
        loc: {
          start: {
            line: 5,
            column: 31
          },
          end: {
            line: 46,
            column: 1
          }
        },
        line: 5
      },
      "1": {
        name: "(anonymous_1)",
        decl: {
          start: {
            line: 9,
            column: 17
          },
          end: {
            line: 9,
            column: 18
          }
        },
        loc: {
          start: {
            line: 9,
            column: 24
          },
          end: {
            line: 13,
            column: 3
          }
        },
        line: 9
      },
      "2": {
        name: "(anonymous_2)",
        decl: {
          start: {
            line: 24,
            column: 20
          },
          end: {
            line: 24,
            column: 21
          }
        },
        loc: {
          start: {
            line: 24,
            column: 27
          },
          end: {
            line: 24,
            column: 54
          }
        },
        line: 24
      },
      "3": {
        name: "(anonymous_3)",
        decl: {
          start: {
            line: 36,
            column: 20
          },
          end: {
            line: 36,
            column: 21
          }
        },
        loc: {
          start: {
            line: 36,
            column: 27
          },
          end: {
            line: 36,
            column: 54
          }
        },
        line: 36
      }
    },
    branchMap: {},
    s: {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
      "6": 0,
      "7": 0,
      "8": 0
    },
    f: {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0
    },
    b: {},
    _coverageSchema: "1a1c01bbd47fc00a2c39e90264f33305004495a9",
    hash: "623f605bdfcce5a9c304c569e5150ceeb7c20d96"
  };
  var coverage = global[gcv] || (global[gcv] = {});

  if (!coverage[path] || coverage[path].hash !== hash) {
    coverage[path] = coverageData;
  }

  var actualCoverage = coverage[path];
  {
    // @ts-ignore
    cov_gn6csi8bt = function () {
      return actualCoverage;
    };
  }
  return actualCoverage;
}

cov_gn6csi8bt();
cov_gn6csi8bt().s[0]++;

const LoginForm = () => {
  cov_gn6csi8bt().f[0]++;
  const [username, setUsername] = (cov_gn6csi8bt().s[1]++, useState(''));
  const [password, setPassword] = (cov_gn6csi8bt().s[2]++, useState(''));
  cov_gn6csi8bt().s[3]++;

  const submit = e => {
    cov_gn6csi8bt().f[1]++;
    cov_gn6csi8bt().s[4]++;
    e.preventDefault();
    cov_gn6csi8bt().s[5]++;
    Meteor.loginWithPassword(username, password);
  };

  cov_gn6csi8bt().s[6]++;
  return /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    className: "login-form"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: "username"
  }, "Username"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    placeholder: "Username",
    name: "username",
    required: true,
    onChange: e => {
      cov_gn6csi8bt().f[2]++;
      cov_gn6csi8bt().s[7]++;
      return setUsername(e.target.value);
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    htmlFor: "password"
  }, "Password"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    placeholder: "Password",
    name: "password",
    required: true,
    onChange: e => {
      cov_gn6csi8bt().f[3]++;
      cov_gn6csi8bt().s[8]++;
      return setPassword(e.target.value);
    }
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", _extends({
    type: "submit"
  }, testProp(LOGIN_BUTTON)), "Log In")));
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"Task.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// imports/ui/Task.js                                                                                         //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
module.export({
  Task: () => Task
});
let React;
module.link("react", {
  default(v) {
    React = v;
  }

}, 0);
let testProp, REMOVE_TODO, CHECKBOX;
module.link("../testIds", {
  testProp(v) {
    testProp = v;
  },

  REMOVE_TODO(v) {
    REMOVE_TODO = v;
  },

  CHECKBOX(v) {
    CHECKBOX = v;
  }

}, 1);

function cov_16g46f81mt() {
  var path = "/Users/idrismahjoubi/cypress-meteor-react/imports/ui/Task.js";
  var hash = "a0c47338bc92504b4b5711f9105f61036224c924";
  var global = new Function("return this")();
  var gcv = "__coverage__";
  var coverageData = {
    path: "/Users/idrismahjoubi/cypress-meteor-react/imports/ui/Task.js",
    statementMap: {
      "0": {
        start: {
          line: 4,
          column: 20
        },
        end: {
          line: 20,
          column: 1
        }
      },
      "1": {
        start: {
          line: 5,
          column: 2
        },
        end: {
          line: 19,
          column: 4
        }
      },
      "2": {
        start: {
          line: 11,
          column: 23
        },
        end: {
          line: 11,
          column: 44
        }
      },
      "3": {
        start: {
          line: 15,
          column: 53
        },
        end: {
          line: 15,
          column: 72
        }
      }
    },
    fnMap: {
      "0": {
        name: "(anonymous_0)",
        decl: {
          start: {
            line: 4,
            column: 20
          },
          end: {
            line: 4,
            column: 21
          }
        },
        loc: {
          start: {
            line: 4,
            column: 66
          },
          end: {
            line: 20,
            column: 1
          }
        },
        line: 4
      },
      "1": {
        name: "(anonymous_1)",
        decl: {
          start: {
            line: 11,
            column: 17
          },
          end: {
            line: 11,
            column: 18
          }
        },
        loc: {
          start: {
            line: 11,
            column: 23
          },
          end: {
            line: 11,
            column: 44
          }
        },
        line: 11
      },
      "2": {
        name: "(anonymous_2)",
        decl: {
          start: {
            line: 15,
            column: 47
          },
          end: {
            line: 15,
            column: 48
          }
        },
        loc: {
          start: {
            line: 15,
            column: 53
          },
          end: {
            line: 15,
            column: 72
          }
        },
        line: 15
      }
    },
    branchMap: {},
    s: {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0
    },
    f: {
      "0": 0,
      "1": 0,
      "2": 0
    },
    b: {},
    _coverageSchema: "1a1c01bbd47fc00a2c39e90264f33305004495a9",
    hash: "a0c47338bc92504b4b5711f9105f61036224c924"
  };
  var coverage = global[gcv] || (global[gcv] = {});

  if (!coverage[path] || coverage[path].hash !== hash) {
    coverage[path] = coverageData;
  }

  var actualCoverage = coverage[path];
  {
    // @ts-ignore
    cov_16g46f81mt = function () {
      return actualCoverage;
    };
  }
  return actualCoverage;
}

cov_16g46f81mt();
cov_16g46f81mt().s[0]++;

const Task = (_ref) => {
  let {
    task,
    onCheckboxClick,
    onDeleteClick
  } = _ref;
  cov_16g46f81mt().f[0]++;
  cov_16g46f81mt().s[1]++;
  return /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("input", {
    className: CHECKBOX,
    type: "checkbox",
    checked: !!task.isChecked,
    onClick: () => {
      cov_16g46f81mt().f[1]++;
      cov_16g46f81mt().s[2]++;
      return onCheckboxClick(task);
    },
    readOnly: true
  }), /*#__PURE__*/React.createElement("span", null, task.text), /*#__PURE__*/React.createElement("button", {
    className: REMOVE_TODO,
    onClick: () => {
      cov_16g46f81mt().f[2]++;
      cov_16g46f81mt().s[3]++;
      return onDeleteClick(task);
    }
  }, "\xD7"));
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"TaskForm.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// imports/ui/TaskForm.js                                                                                     //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
module.export({
  TaskForm: () => TaskForm
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let React, useState;
module.link("react", {
  default(v) {
    React = v;
  },

  useState(v) {
    useState = v;
  }

}, 1);

function cov_2a9hgq1r4r() {
  var path = "/Users/idrismahjoubi/cypress-meteor-react/imports/ui/TaskForm.js";
  var hash = "cd16a6b77ff8d5a991d1ecfaa9daa0bf67a53497";
  var global = new Function("return this")();
  var gcv = "__coverage__";
  var coverageData = {
    path: "/Users/idrismahjoubi/cypress-meteor-react/imports/ui/TaskForm.js",
    statementMap: {
      "0": {
        start: {
          line: 4,
          column: 24
        },
        end: {
          line: 30,
          column: 1
        }
      },
      "1": {
        start: {
          line: 5,
          column: 26
        },
        end: {
          line: 5,
          column: 38
        }
      },
      "2": {
        start: {
          line: 7,
          column: 23
        },
        end: {
          line: 15,
          column: 3
        }
      },
      "3": {
        start: {
          line: 8,
          column: 4
        },
        end: {
          line: 8,
          column: 23
        }
      },
      "4": {
        start: {
          line: 10,
          column: 4
        },
        end: {
          line: 10,
          column: 22
        }
      },
      "5": {
        start: {
          line: 10,
          column: 15
        },
        end: {
          line: 10,
          column: 22
        }
      },
      "6": {
        start: {
          line: 12,
          column: 4
        },
        end: {
          line: 12,
          column: 38
        }
      },
      "7": {
        start: {
          line: 14,
          column: 4
        },
        end: {
          line: 14,
          column: 16
        }
      },
      "8": {
        start: {
          line: 17,
          column: 2
        },
        end: {
          line: 29,
          column: 4
        }
      },
      "9": {
        start: {
          line: 24,
          column: 23
        },
        end: {
          line: 24,
          column: 46
        }
      }
    },
    fnMap: {
      "0": {
        name: "(anonymous_0)",
        decl: {
          start: {
            line: 4,
            column: 24
          },
          end: {
            line: 4,
            column: 25
          }
        },
        loc: {
          start: {
            line: 4,
            column: 30
          },
          end: {
            line: 30,
            column: 1
          }
        },
        line: 4
      },
      "1": {
        name: "(anonymous_1)",
        decl: {
          start: {
            line: 7,
            column: 23
          },
          end: {
            line: 7,
            column: 24
          }
        },
        loc: {
          start: {
            line: 7,
            column: 28
          },
          end: {
            line: 15,
            column: 3
          }
        },
        line: 7
      },
      "2": {
        name: "(anonymous_2)",
        decl: {
          start: {
            line: 24,
            column: 18
          },
          end: {
            line: 24,
            column: 19
          }
        },
        loc: {
          start: {
            line: 24,
            column: 23
          },
          end: {
            line: 24,
            column: 46
          }
        },
        line: 24
      }
    },
    branchMap: {
      "0": {
        loc: {
          start: {
            line: 10,
            column: 4
          },
          end: {
            line: 10,
            column: 22
          }
        },
        type: "if",
        locations: [{
          start: {
            line: 10,
            column: 4
          },
          end: {
            line: 10,
            column: 22
          }
        }, {
          start: {
            line: 10,
            column: 4
          },
          end: {
            line: 10,
            column: 22
          }
        }],
        line: 10
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
      "9": 0
    },
    f: {
      "0": 0,
      "1": 0,
      "2": 0
    },
    b: {
      "0": [0, 0]
    },
    _coverageSchema: "1a1c01bbd47fc00a2c39e90264f33305004495a9",
    hash: "cd16a6b77ff8d5a991d1ecfaa9daa0bf67a53497"
  };
  var coverage = global[gcv] || (global[gcv] = {});

  if (!coverage[path] || coverage[path].hash !== hash) {
    coverage[path] = coverageData;
  }

  var actualCoverage = coverage[path];
  {
    // @ts-ignore
    cov_2a9hgq1r4r = function () {
      return actualCoverage;
    };
  }
  return actualCoverage;
}

cov_2a9hgq1r4r();
cov_2a9hgq1r4r().s[0]++;

const TaskForm = () => {
  cov_2a9hgq1r4r().f[0]++;
  const [text, setText] = (cov_2a9hgq1r4r().s[1]++, useState(''));
  cov_2a9hgq1r4r().s[2]++;

  const handleSubmit = e => {
    cov_2a9hgq1r4r().f[1]++;
    cov_2a9hgq1r4r().s[3]++;
    e.preventDefault();
    cov_2a9hgq1r4r().s[4]++;

    if (!text) {
      cov_2a9hgq1r4r().b[0][0]++;
      cov_2a9hgq1r4r().s[5]++;
      return;
    } else {
      cov_2a9hgq1r4r().b[0][1]++;
    }

    cov_2a9hgq1r4r().s[6]++;
    Meteor.call('tasks.insert', text);
    cov_2a9hgq1r4r().s[7]++;
    setText('');
  };

  cov_2a9hgq1r4r().s[8]++;
  return /*#__PURE__*/React.createElement("form", {
    className: "task-form",
    onSubmit: handleSubmit
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    name: "add",
    placeholder: "Type to add new tasks",
    value: text,
    onChange: e => {
      cov_2a9hgq1r4r().f[2]++;
      cov_2a9hgq1r4r().s[9]++;
      return setText(e.target.value);
    }
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit"
  }, "Add Task"));
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"testIds.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// imports/testIds.js                                                                                         //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
module.export({
  LOGIN_BUTTON: () => LOGIN_BUTTON,
  REMOVE_TODO: () => REMOVE_TODO,
  CHECKBOX: () => CHECKBOX,
  COUNTER: () => COUNTER,
  testProp: () => testProp
});

function cov_1qop14v6hh() {
  var path = "/Users/idrismahjoubi/cypress-meteor-react/imports/testIds.js";
  var hash = "eec1e181fcfc42455fc28416ebee0b0ee8b4e416";
  var global = new Function("return this")();
  var gcv = "__coverage__";
  var coverageData = {
    path: "/Users/idrismahjoubi/cypress-meteor-react/imports/testIds.js",
    statementMap: {
      "0": {
        start: {
          line: 1,
          column: 28
        },
        end: {
          line: 1,
          column: 42
        }
      },
      "1": {
        start: {
          line: 2,
          column: 27
        },
        end: {
          line: 2,
          column: 40
        }
      },
      "2": {
        start: {
          line: 3,
          column: 24
        },
        end: {
          line: 3,
          column: 34
        }
      },
      "3": {
        start: {
          line: 4,
          column: 23
        },
        end: {
          line: 4,
          column: 32
        }
      },
      "4": {
        start: {
          line: 7,
          column: 24
        },
        end: {
          line: 7,
          column: 56
        }
      },
      "5": {
        start: {
          line: 7,
          column: 33
        },
        end: {
          line: 7,
          column: 55
        }
      }
    },
    fnMap: {
      "0": {
        name: "(anonymous_0)",
        decl: {
          start: {
            line: 7,
            column: 24
          },
          end: {
            line: 7,
            column: 25
          }
        },
        loc: {
          start: {
            line: 7,
            column: 33
          },
          end: {
            line: 7,
            column: 55
          }
        },
        line: 7
      }
    },
    branchMap: {},
    s: {
      "0": 0,
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0
    },
    f: {
      "0": 0
    },
    b: {},
    _coverageSchema: "1a1c01bbd47fc00a2c39e90264f33305004495a9",
    hash: "eec1e181fcfc42455fc28416ebee0b0ee8b4e416"
  };
  var coverage = global[gcv] || (global[gcv] = {});

  if (!coverage[path] || coverage[path].hash !== hash) {
    coverage[path] = coverageData;
  }

  var actualCoverage = coverage[path];
  {
    // @ts-ignore
    cov_1qop14v6hh = function () {
      return actualCoverage;
    };
  }
  return actualCoverage;
}

cov_1qop14v6hh();
const LOGIN_BUTTON = (cov_1qop14v6hh().s[0]++, 'LOGIN_BUTTON');
const REMOVE_TODO = (cov_1qop14v6hh().s[1]++, 'REMOVE_TODO');
const CHECKBOX = (cov_1qop14v6hh().s[2]++, 'CHECKBOX');
const COUNTER = (cov_1qop14v6hh().s[3]++, 'COUNTER');
// Helper function to select elements.
cov_1qop14v6hh().s[4]++;

const testProp = id => {
  cov_1qop14v6hh().f[0]++;
  cov_1qop14v6hh().s[5]++;
  return {
    'data-test-id': id
  };
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"client":{"main.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                            //
// client/main.js                                                                                             //
//                                                                                                            //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                              //
let React;
module.link("react", {
  default(v) {
    React = v;
  }

}, 0);
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 1);
let render;
module.link("react-dom", {
  render(v) {
    render = v;
  }

}, 2);
let App;
module.link("/imports/ui/App", {
  App(v) {
    App = v;
  }

}, 3);

function cov_1quhjm47y4() {
  var path = "/Users/idrismahjoubi/cypress-meteor-react/client/main.js";
  var hash = "1abe8854b072e73ae9c0c8afbfc74f4ba403916f";
  var global = new Function("return this")();
  var gcv = "__coverage__";
  var coverageData = {
    path: "/Users/idrismahjoubi/cypress-meteor-react/client/main.js",
    statementMap: {
      "0": {
        start: {
          line: 6,
          column: 0
        },
        end: {
          line: 8,
          column: 3
        }
      },
      "1": {
        start: {
          line: 7,
          column: 2
        },
        end: {
          line: 7,
          column: 59
        }
      }
    },
    fnMap: {
      "0": {
        name: "(anonymous_0)",
        decl: {
          start: {
            line: 6,
            column: 15
          },
          end: {
            line: 6,
            column: 16
          }
        },
        loc: {
          start: {
            line: 6,
            column: 21
          },
          end: {
            line: 8,
            column: 1
          }
        },
        line: 6
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
    hash: "1abe8854b072e73ae9c0c8afbfc74f4ba403916f"
  };
  var coverage = global[gcv] || (global[gcv] = {});

  if (!coverage[path] || coverage[path].hash !== hash) {
    coverage[path] = coverageData;
  }

  var actualCoverage = coverage[path];
  {
    // @ts-ignore
    cov_1quhjm47y4 = function () {
      return actualCoverage;
    };
  }
  return actualCoverage;
}

cov_1quhjm47y4();
cov_1quhjm47y4().s[0]++;
Meteor.startup(() => {
  cov_1quhjm47y4().f[0]++;
  cov_1quhjm47y4().s[1]++;
  render( /*#__PURE__*/React.createElement(App, null), document.getElementById('react-target'));
});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{
  "extensions": [
    ".js",
    ".json",
    ".html",
    ".css",
    ".ts",
    ".mjs"
  ]
});

var exports = require("/client/main.js");