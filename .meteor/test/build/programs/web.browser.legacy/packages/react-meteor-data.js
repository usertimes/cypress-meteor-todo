//////////////////////////////////////////////////////////////////////////
//                                                                      //
// This is a generated file. You can view the original                  //
// source in your browser if your browser supports source maps.         //
// Source maps are supported by all recent versions of Chrome, Safari,  //
// and Firefox, and by Internet Explorer 11.                            //
//                                                                      //
//////////////////////////////////////////////////////////////////////////


(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var meteorInstall = Package.modules.meteorInstall;
var meteorBabelHelpers = Package.modules.meteorBabelHelpers;
var Promise = Package.promise.Promise;
var Symbol = Package['ecmascript-runtime-client'].Symbol;
var Map = Package['ecmascript-runtime-client'].Map;
var Set = Package['ecmascript-runtime-client'].Set;

var require = meteorInstall({"node_modules":{"meteor":{"react-meteor-data":{"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/react-meteor-data/index.js                                                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var React;
module.link("react", {
  "default": function (v) {
    React = v;
  }
}, 0);
module.link("./useTracker", {
  "default": "useTracker"
}, 1);
module.link("./withTracker.tsx", {
  "default": "withTracker"
}, 2);

if (Meteor.isDevelopment) {
  var v = React.version.split('.');

  if (v[0] < 16 || v[0] == 16 && v[1] < 8) {
    console.warn('react-meteor-data 2.x requires React version >= 16.8.');
  }
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"useTracker.ts":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/react-meteor-data/useTracker.ts                                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var _typeof;

module.link("@babel/runtime/helpers/typeof", {
  default: function (v) {
    _typeof = v;
  }
}, 0);
var Meteor;
module.link("meteor/meteor", {
  Meteor: function (v) {
    Meteor = v;
  }
}, 0);
var Tracker;
module.link("meteor/tracker", {
  Tracker: function (v) {
    Tracker = v;
  }
}, 1);
var useReducer, useEffect, useRef, useMemo;
module.link("react", {
  useReducer: function (v) {
    useReducer = v;
  },
  useEffect: function (v) {
    useEffect = v;
  },
  useRef: function (v) {
    useRef = v;
  },
  useMemo: function (v) {
    useMemo = v;
  }
}, 2);

// Warns if data is a Mongo.Cursor or a POJO containing a Mongo.Cursor.
function checkCursor(data) {
  var shouldWarn = false;

  if (Package.mongo && Package.mongo.Mongo && data && _typeof(data) === 'object') {
    if (data instanceof Package.mongo.Mongo.Cursor) {
      shouldWarn = true;
    } else if (Object.getPrototypeOf(data) === Object.prototype) {
      Object.keys(data).forEach(function (key) {
        if (data[key] instanceof Package.mongo.Mongo.Cursor) {
          shouldWarn = true;
        }
      });
    }
  }

  if (shouldWarn) {
    console.warn('Warning: your reactive function is returning a Mongo cursor. ' + 'This value will not be reactive. You probably want to call ' + '`.fetch()` on the cursor before returning it.');
  }
} // Used to create a forceUpdate from useReducer. Forces update by
// incrementing a number whenever the dispatch method is invoked.


var fur = function (x) {
  return x + 1;
};

var useForceUpdate = function () {
  return useReducer(fur, 0)[1];
};

var useTrackerNoDeps = function (reactiveFn) {
  var skipUpdate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  var _useRef = useRef({
    isMounted: false,
    trackerData: null
  }),
      refs = _useRef.current;

  var forceUpdate = useForceUpdate(); // Without deps, always dispose and recreate the computation with every render.

  if (refs.computation) {
    refs.computation.stop(); // @ts-ignore This makes TS think ref.computation is "never" set

    delete refs.computation;
  } // Use Tracker.nonreactive in case we are inside a Tracker Computation.
  // This can happen if someone calls `ReactDOM.render` inside a Computation.
  // In that case, we want to opt out of the normal behavior of nested
  // Computations, where if the outer one is invalidated or stopped,
  // it stops the inner one.


  Tracker.nonreactive(function () {
    return Tracker.autorun(function (c) {
      refs.computation = c;

      if (c.firstRun) {
        // Always run the reactiveFn on firstRun
        refs.trackerData = reactiveFn(c);
      } else if (!skipUpdate || !skipUpdate(refs.trackerData, reactiveFn(c))) {
        // For any reactive change, forceUpdate and let the next render rebuild the computation.
        forceUpdate();
      }
    });
  }); // To avoid creating side effects in render with Tracker when not using deps
  // create the computation, run the user's reactive function in a computation synchronously,
  // then immediately dispose of it. It'll be recreated again after the render is committed.

  if (!refs.isMounted) {
    // We want to forceUpdate in useEffect to support StrictMode.
    // See: https://github.com/meteor/react-packages/issues/278
    if (refs.computation) {
      refs.computation.stop();
      delete refs.computation;
    }
  }

  useEffect(function () {
    // Let subsequent renders know we are mounted (render is committed).
    refs.isMounted = true; // Render is committed. Since useTracker without deps always runs synchronously,
    // forceUpdate and let the next render recreate the computation.

    if (!skipUpdate) {
      forceUpdate();
    } else {
      Tracker.nonreactive(function () {
        return Tracker.autorun(function (c) {
          refs.computation = c;

          if (!skipUpdate(refs.trackerData, reactiveFn(c))) {
            // For any reactive change, forceUpdate and let the next render rebuild the computation.
            forceUpdate();
          }
        });
      });
    } // stop the computation on unmount


    return function () {
      var _refs$computation;

      (_refs$computation = refs.computation) === null || _refs$computation === void 0 ? void 0 : _refs$computation.stop();
    };
  }, []);
  return refs.trackerData;
};

var useTrackerWithDeps = function (reactiveFn, deps) {
  var skipUpdate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  var forceUpdate = useForceUpdate();

  var _useRef2 = useRef({
    reactiveFn: reactiveFn
  }),
      refs = _useRef2.current; // keep reactiveFn ref fresh


  refs.reactiveFn = reactiveFn;
  useMemo(function () {
    // To jive with the lifecycle interplay between Tracker/Subscribe, run the
    // reactive function in a computation, then stop it, to force flush cycle.
    var comp = Tracker.nonreactive(function () {
      return Tracker.autorun(function (c) {
        refs.data = refs.reactiveFn();
      });
    }); // To avoid creating side effects in render, stop the computation immediately

    Meteor.defer(function () {
      comp.stop();
    });
  }, deps);
  useEffect(function () {
    var computation = Tracker.nonreactive(function () {
      return Tracker.autorun(function (c) {
        var data = refs.reactiveFn(c);

        if (!skipUpdate || !skipUpdate(refs.data, data)) {
          refs.data = data;
          forceUpdate();
        }
      });
    });
    return function () {
      computation.stop();
    };
  }, deps);
  return refs.data;
};

function useTrackerClient(reactiveFn) {
  var deps = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var skipUpdate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  if (deps === null || deps === undefined || !Array.isArray(deps)) {
    if (typeof deps === "function") {
      skipUpdate = deps;
    }

    return useTrackerNoDeps(reactiveFn, skipUpdate);
  } else {
    return useTrackerWithDeps(reactiveFn, deps, skipUpdate);
  }
}

var useTrackerServer = function (reactiveFn) {
  return Tracker.nonreactive(reactiveFn);
}; // When rendering on the server, we don't want to use the Tracker.
// We only do the first rendering on the server so we can get the data right away


var useTracker = Meteor.isServer ? useTrackerServer : useTrackerClient;

function useTrackerDev(reactiveFn) {
  var deps = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var skipUpdate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  function warn(expects, pos, arg, type) {
    console.warn("Warning: useTracker expected a " + expects + " in it's " + pos + " argument " + ("(" + arg + "), but got type of `" + type + "`."));
  }

  if (typeof reactiveFn !== 'function') {
    warn("function", "1st", "reactiveFn", reactiveFn);
  }

  if (deps && skipUpdate && !Array.isArray(deps) && typeof skipUpdate === "function") {
    warn("array & function", "2nd and 3rd", "deps, skipUpdate", _typeof(deps) + " & " + _typeof(skipUpdate));
  } else {
    if (deps && !Array.isArray(deps) && typeof deps !== "function") {
      warn("array or function", "2nd", "deps or skipUpdate", _typeof(deps));
    }

    if (skipUpdate && typeof skipUpdate !== "function") {
      warn("function", "3rd", "skipUpdate", _typeof(skipUpdate));
    }
  }

  var data = useTracker(reactiveFn, deps, skipUpdate);
  checkCursor(data);
  return data;
}

module.exportDefault(Meteor.isDevelopment ? useTrackerDev : useTracker);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"withTracker.tsx":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/react-meteor-data/withTracker.tsx                                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
var _extends;

module.link("@babel/runtime/helpers/extends", {
  default: function (v) {
    _extends = v;
  }
}, 0);
module.export({
  "default": function () {
    return withTracker;
  }
});
var React, forwardRef, memo;
module.link("react", {
  "default": function (v) {
    React = v;
  },
  forwardRef: function (v) {
    forwardRef = v;
  },
  memo: function (v) {
    memo = v;
  }
}, 0);
var useTracker;
module.link("./useTracker", {
  "default": function (v) {
    useTracker = v;
  }
}, 1);

function withTracker(options) {
  return function (Component) {
    var getMeteorData = typeof options === 'function' ? options : options.getMeteorData;
    var WithTracker = /*#__PURE__*/forwardRef(function (props, ref) {
      var data = useTracker(function () {
        return getMeteorData(props) || {};
      }, options.skipUpdate);
      return /*#__PURE__*/React.createElement(Component, _extends({
        ref: ref
      }, props, data));
    });
    var _options$pure = options.pure,
        pure = _options$pure === void 0 ? true : _options$pure;
    return pure ? /*#__PURE__*/memo(WithTracker) : WithTracker;
  };
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json",
    ".ts",
    ".tsx"
  ]
});


/* Exports */
Package._define("react-meteor-data");

})();
