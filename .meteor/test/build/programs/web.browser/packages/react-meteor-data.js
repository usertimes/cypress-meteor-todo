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
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"react-meteor-data":{"index.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/react-meteor-data/index.js                                                                      //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
let React;
module.link("react", {
  default(v) {
    React = v;
  }

}, 0);
module.link("./useTracker", {
  default: "useTracker"
}, 1);
module.link("./withTracker.tsx", {
  default: "withTracker"
}, 2);

if (Meteor.isDevelopment) {
  const v = React.version.split('.');

  if (v[0] < 16 || v[0] == 16 && v[1] < 8) {
    console.warn('react-meteor-data 2.x requires React version >= 16.8.');
  }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"useTracker.ts":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/react-meteor-data/useTracker.ts                                                                 //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
let Tracker;
module.link("meteor/tracker", {
  Tracker(v) {
    Tracker = v;
  }

}, 1);
let useReducer, useEffect, useRef, useMemo;
module.link("react", {
  useReducer(v) {
    useReducer = v;
  },

  useEffect(v) {
    useEffect = v;
  },

  useRef(v) {
    useRef = v;
  },

  useMemo(v) {
    useMemo = v;
  }

}, 2);

// Warns if data is a Mongo.Cursor or a POJO containing a Mongo.Cursor.
function checkCursor(data) {
  let shouldWarn = false;

  if (Package.mongo && Package.mongo.Mongo && data && typeof data === 'object') {
    if (data instanceof Package.mongo.Mongo.Cursor) {
      shouldWarn = true;
    } else if (Object.getPrototypeOf(data) === Object.prototype) {
      Object.keys(data).forEach(key => {
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


const fur = x => x + 1;

const useForceUpdate = () => useReducer(fur, 0)[1];

const useTrackerNoDeps = function (reactiveFn) {
  let skipUpdate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  const {
    current: refs
  } = useRef({
    isMounted: false,
    trackerData: null
  });
  const forceUpdate = useForceUpdate(); // Without deps, always dispose and recreate the computation with every render.

  if (refs.computation) {
    refs.computation.stop(); // @ts-ignore This makes TS think ref.computation is "never" set

    delete refs.computation;
  } // Use Tracker.nonreactive in case we are inside a Tracker Computation.
  // This can happen if someone calls `ReactDOM.render` inside a Computation.
  // In that case, we want to opt out of the normal behavior of nested
  // Computations, where if the outer one is invalidated or stopped,
  // it stops the inner one.


  Tracker.nonreactive(() => Tracker.autorun(c => {
    refs.computation = c;

    if (c.firstRun) {
      // Always run the reactiveFn on firstRun
      refs.trackerData = reactiveFn(c);
    } else if (!skipUpdate || !skipUpdate(refs.trackerData, reactiveFn(c))) {
      // For any reactive change, forceUpdate and let the next render rebuild the computation.
      forceUpdate();
    }
  })); // To avoid creating side effects in render with Tracker when not using deps
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

  useEffect(() => {
    // Let subsequent renders know we are mounted (render is committed).
    refs.isMounted = true; // Render is committed. Since useTracker without deps always runs synchronously,
    // forceUpdate and let the next render recreate the computation.

    if (!skipUpdate) {
      forceUpdate();
    } else {
      Tracker.nonreactive(() => Tracker.autorun(c => {
        refs.computation = c;

        if (!skipUpdate(refs.trackerData, reactiveFn(c))) {
          // For any reactive change, forceUpdate and let the next render rebuild the computation.
          forceUpdate();
        }
      }));
    } // stop the computation on unmount


    return () => {
      var _refs$computation;

      (_refs$computation = refs.computation) === null || _refs$computation === void 0 ? void 0 : _refs$computation.stop();
    };
  }, []);
  return refs.trackerData;
};

const useTrackerWithDeps = function (reactiveFn, deps) {
  let skipUpdate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
  const forceUpdate = useForceUpdate();
  const {
    current: refs
  } = useRef({
    reactiveFn
  }); // keep reactiveFn ref fresh

  refs.reactiveFn = reactiveFn;
  useMemo(() => {
    // To jive with the lifecycle interplay between Tracker/Subscribe, run the
    // reactive function in a computation, then stop it, to force flush cycle.
    const comp = Tracker.nonreactive(() => Tracker.autorun(c => {
      refs.data = refs.reactiveFn();
    })); // To avoid creating side effects in render, stop the computation immediately

    Meteor.defer(() => {
      comp.stop();
    });
  }, deps);
  useEffect(() => {
    const computation = Tracker.nonreactive(() => Tracker.autorun(c => {
      const data = refs.reactiveFn(c);

      if (!skipUpdate || !skipUpdate(refs.data, data)) {
        refs.data = data;
        forceUpdate();
      }
    }));
    return () => {
      computation.stop();
    };
  }, deps);
  return refs.data;
};

function useTrackerClient(reactiveFn) {
  let deps = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let skipUpdate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  if (deps === null || deps === undefined || !Array.isArray(deps)) {
    if (typeof deps === "function") {
      skipUpdate = deps;
    }

    return useTrackerNoDeps(reactiveFn, skipUpdate);
  } else {
    return useTrackerWithDeps(reactiveFn, deps, skipUpdate);
  }
}

const useTrackerServer = reactiveFn => {
  return Tracker.nonreactive(reactiveFn);
}; // When rendering on the server, we don't want to use the Tracker.
// We only do the first rendering on the server so we can get the data right away


const useTracker = Meteor.isServer ? useTrackerServer : useTrackerClient;

function useTrackerDev(reactiveFn) {
  let deps = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  let skipUpdate = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  function warn(expects, pos, arg, type) {
    console.warn("Warning: useTracker expected a ".concat(expects, " in it's ").concat(pos, " argument ") + "(".concat(arg, "), but got type of `").concat(type, "`."));
  }

  if (typeof reactiveFn !== 'function') {
    warn("function", "1st", "reactiveFn", reactiveFn);
  }

  if (deps && skipUpdate && !Array.isArray(deps) && typeof skipUpdate === "function") {
    warn("array & function", "2nd and 3rd", "deps, skipUpdate", "".concat(typeof deps, " & ").concat(typeof skipUpdate));
  } else {
    if (deps && !Array.isArray(deps) && typeof deps !== "function") {
      warn("array or function", "2nd", "deps or skipUpdate", typeof deps);
    }

    if (skipUpdate && typeof skipUpdate !== "function") {
      warn("function", "3rd", "skipUpdate", typeof skipUpdate);
    }
  }

  const data = useTracker(reactiveFn, deps, skipUpdate);
  checkCursor(data);
  return data;
}

module.exportDefault(Meteor.isDevelopment ? useTrackerDev : useTracker);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"withTracker.tsx":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                          //
// packages/react-meteor-data/withTracker.tsx                                                               //
//                                                                                                          //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                            //
let _extends;

module.link("@babel/runtime/helpers/extends", {
  default(v) {
    _extends = v;
  }

}, 0);
module.export({
  default: () => withTracker
});
let React, forwardRef, memo;
module.link("react", {
  default(v) {
    React = v;
  },

  forwardRef(v) {
    forwardRef = v;
  },

  memo(v) {
    memo = v;
  }

}, 0);
let useTracker;
module.link("./useTracker", {
  default(v) {
    useTracker = v;
  }

}, 1);

function withTracker(options) {
  return Component => {
    const getMeteorData = typeof options === 'function' ? options : options.getMeteorData;
    const WithTracker = /*#__PURE__*/forwardRef((props, ref) => {
      const data = useTracker(() => getMeteorData(props) || {}, options.skipUpdate);
      return /*#__PURE__*/React.createElement(Component, _extends({
        ref: ref
      }, props, data));
    });
    const {
      pure = true
    } = options;
    return pure ? /*#__PURE__*/memo(WithTracker) : WithTracker;
  };
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
