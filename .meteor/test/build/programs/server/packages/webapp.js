(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var Log = Package.logging.Log;
var _ = Package.underscore._;
var RoutePolicy = Package.routepolicy.RoutePolicy;
var Boilerplate = Package['boilerplate-generator'].Boilerplate;
var WebAppHashing = Package['webapp-hashing'].WebAppHashing;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var WebApp, WebAppInternals, main;

var require = meteorInstall({"node_modules":{"meteor":{"webapp":{"webapp_server.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/webapp/webapp_server.js                                                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
!function (module1) {
  let _objectSpread;

  module1.link("@babel/runtime/helpers/objectSpread2", {
    default(v) {
      _objectSpread = v;
    }

  }, 0);
  module1.export({
    WebApp: () => WebApp,
    WebAppInternals: () => WebAppInternals
  });
  let assert;
  module1.link("assert", {
    default(v) {
      assert = v;
    }

  }, 0);
  let readFileSync;
  module1.link("fs", {
    readFileSync(v) {
      readFileSync = v;
    }

  }, 1);
  let createServer;
  module1.link("http", {
    createServer(v) {
      createServer = v;
    }

  }, 2);
  let pathJoin, pathDirname;
  module1.link("path", {
    join(v) {
      pathJoin = v;
    },

    dirname(v) {
      pathDirname = v;
    }

  }, 3);
  let parseUrl;
  module1.link("url", {
    parse(v) {
      parseUrl = v;
    }

  }, 4);
  let createHash;
  module1.link("crypto", {
    createHash(v) {
      createHash = v;
    }

  }, 5);
  let connect;
  module1.link("./connect.js", {
    connect(v) {
      connect = v;
    }

  }, 6);
  let compress;
  module1.link("compression", {
    default(v) {
      compress = v;
    }

  }, 7);
  let cookieParser;
  module1.link("cookie-parser", {
    default(v) {
      cookieParser = v;
    }

  }, 8);
  let qs;
  module1.link("qs", {
    default(v) {
      qs = v;
    }

  }, 9);
  let parseRequest;
  module1.link("parseurl", {
    default(v) {
      parseRequest = v;
    }

  }, 10);
  let basicAuth;
  module1.link("basic-auth-connect", {
    default(v) {
      basicAuth = v;
    }

  }, 11);
  let lookupUserAgent;
  module1.link("useragent", {
    lookup(v) {
      lookupUserAgent = v;
    }

  }, 12);
  let isModern;
  module1.link("meteor/modern-browsers", {
    isModern(v) {
      isModern = v;
    }

  }, 13);
  let send;
  module1.link("send", {
    default(v) {
      send = v;
    }

  }, 14);
  let removeExistingSocketFile, registerSocketFileCleanup;
  module1.link("./socket_file.js", {
    removeExistingSocketFile(v) {
      removeExistingSocketFile = v;
    },

    registerSocketFileCleanup(v) {
      registerSocketFileCleanup = v;
    }

  }, 15);
  let cluster;
  module1.link("cluster", {
    default(v) {
      cluster = v;
    }

  }, 16);
  let onMessage;
  module1.link("meteor/inter-process-messaging", {
    onMessage(v) {
      onMessage = v;
    }

  }, 17);
  var SHORT_SOCKET_TIMEOUT = 5 * 1000;
  var LONG_SOCKET_TIMEOUT = 120 * 1000;
  const WebApp = {};
  const WebAppInternals = {};
  const hasOwn = Object.prototype.hasOwnProperty; // backwards compat to 2.0 of connect

  connect.basicAuth = basicAuth;
  WebAppInternals.NpmModules = {
    connect: {
      version: Npm.require('connect/package.json').version,
      module: connect
    }
  }; // Though we might prefer to use web.browser (modern) as the default
  // architecture, safety requires a more compatible defaultArch.

  WebApp.defaultArch = 'web.browser.legacy'; // XXX maps archs to manifests

  WebApp.clientPrograms = {}; // XXX maps archs to program path on filesystem

  var archPath = {};

  var bundledJsCssUrlRewriteHook = function (url) {
    var bundledPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '';
    return bundledPrefix + url;
  };

  var sha1 = function (contents) {
    var hash = createHash('sha1');
    hash.update(contents);
    return hash.digest('hex');
  };

  function shouldCompress(req, res) {
    if (req.headers['x-no-compression']) {
      // don't compress responses with this request header
      return false;
    } // fallback to standard filter function


    return compress.filter(req, res);
  }

  ; // #BrowserIdentification
  //
  // We have multiple places that want to identify the browser: the
  // unsupported browser page, the appcache package, and, eventually
  // delivering browser polyfills only as needed.
  //
  // To avoid detecting the browser in multiple places ad-hoc, we create a
  // Meteor "browser" object. It uses but does not expose the npm
  // useragent module (we could choose a different mechanism to identify
  // the browser in the future if we wanted to).  The browser object
  // contains
  //
  // * `name`: the name of the browser in camel case
  // * `major`, `minor`, `patch`: integers describing the browser version
  //
  // Also here is an early version of a Meteor `request` object, intended
  // to be a high-level description of the request without exposing
  // details of connect's low-level `req`.  Currently it contains:
  //
  // * `browser`: browser identification object described above
  // * `url`: parsed url, including parsed query params
  //
  // As a temporary hack there is a `categorizeRequest` function on WebApp which
  // converts a connect `req` to a Meteor `request`. This can go away once smart
  // packages such as appcache are being passed a `request` object directly when
  // they serve content.
  //
  // This allows `request` to be used uniformly: it is passed to the html
  // attributes hook, and the appcache package can use it when deciding
  // whether to generate a 404 for the manifest.
  //
  // Real routing / server side rendering will probably refactor this
  // heavily.
  // e.g. "Mobile Safari" => "mobileSafari"

  var camelCase = function (name) {
    var parts = name.split(' ');
    parts[0] = parts[0].toLowerCase();

    for (var i = 1; i < parts.length; ++i) {
      parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substr(1);
    }

    return parts.join('');
  };

  var identifyBrowser = function (userAgentString) {
    var userAgent = lookupUserAgent(userAgentString);
    return {
      name: camelCase(userAgent.family),
      major: +userAgent.major,
      minor: +userAgent.minor,
      patch: +userAgent.patch
    };
  }; // XXX Refactor as part of implementing real routing.


  WebAppInternals.identifyBrowser = identifyBrowser;

  WebApp.categorizeRequest = function (req) {
    if (req.browser && req.arch && typeof req.modern === "boolean") {
      // Already categorized.
      return req;
    }

    const browser = identifyBrowser(req.headers["user-agent"]);
    const modern = isModern(browser);
    const path = typeof req.pathname === "string" ? req.pathname : parseRequest(req).pathname;
    const categorized = {
      browser,
      modern,
      path,
      arch: WebApp.defaultArch,
      url: parseUrl(req.url, true),
      dynamicHead: req.dynamicHead,
      dynamicBody: req.dynamicBody,
      headers: req.headers,
      cookies: req.cookies
    };
    const pathParts = path.split("/");
    const archKey = pathParts[1];

    if (archKey.startsWith("__")) {
      const archCleaned = "web." + archKey.slice(2);

      if (hasOwn.call(WebApp.clientPrograms, archCleaned)) {
        pathParts.splice(1, 1); // Remove the archKey part.

        return Object.assign(categorized, {
          arch: archCleaned,
          path: pathParts.join("/")
        });
      }
    } // TODO Perhaps one day we could infer Cordova clients here, so that we
    // wouldn't have to use prefixed "/__cordova/..." URLs.


    const preferredArchOrder = isModern(browser) ? ["web.browser", "web.browser.legacy"] : ["web.browser.legacy", "web.browser"];

    for (const arch of preferredArchOrder) {
      // If our preferred arch is not available, it's better to use another
      // client arch that is available than to guarantee the site won't work
      // by returning an unknown arch. For example, if web.browser.legacy is
      // excluded using the --exclude-archs command-line option, legacy
      // clients are better off receiving web.browser (which might actually
      // work) than receiving an HTTP 404 response. If none of the archs in
      // preferredArchOrder are defined, only then should we send a 404.
      if (hasOwn.call(WebApp.clientPrograms, arch)) {
        return Object.assign(categorized, {
          arch
        });
      }
    }

    return categorized;
  }; // HTML attribute hooks: functions to be called to determine any attributes to
  // be added to the '<html>' tag. Each function is passed a 'request' object (see
  // #BrowserIdentification) and should return null or object.


  var htmlAttributeHooks = [];

  var getHtmlAttributes = function (request) {
    var combinedAttributes = {};

    _.each(htmlAttributeHooks || [], function (hook) {
      var attributes = hook(request);
      if (attributes === null) return;
      if (typeof attributes !== 'object') throw Error("HTML attribute hook must return null or object");

      _.extend(combinedAttributes, attributes);
    });

    return combinedAttributes;
  };

  WebApp.addHtmlAttributeHook = function (hook) {
    htmlAttributeHooks.push(hook);
  }; // Serve app HTML for this URL?


  var appUrl = function (url) {
    if (url === '/favicon.ico' || url === '/robots.txt') return false; // NOTE: app.manifest is not a web standard like favicon.ico and
    // robots.txt. It is a file name we have chosen to use for HTML5
    // appcache URLs. It is included here to prevent using an appcache
    // then removing it from poisoning an app permanently. Eventually,
    // once we have server side routing, this won't be needed as
    // unknown URLs with return a 404 automatically.

    if (url === '/app.manifest') return false; // Avoid serving app HTML for declared routes such as /sockjs/.

    if (RoutePolicy.classify(url)) return false; // we currently return app HTML on all URLs by default

    return true;
  }; // We need to calculate the client hash after all packages have loaded
  // to give them a chance to populate __meteor_runtime_config__.
  //
  // Calculating the hash during startup means that packages can only
  // populate __meteor_runtime_config__ during load, not during startup.
  //
  // Calculating instead it at the beginning of main after all startup
  // hooks had run would allow packages to also populate
  // __meteor_runtime_config__ during startup, but that's too late for
  // autoupdate because it needs to have the client hash at startup to
  // insert the auto update version itself into
  // __meteor_runtime_config__ to get it to the client.
  //
  // An alternative would be to give autoupdate a "post-start,
  // pre-listen" hook to allow it to insert the auto update version at
  // the right moment.


  Meteor.startup(function () {
    function getter(key) {
      return function (arch) {
        arch = arch || WebApp.defaultArch;
        const program = WebApp.clientPrograms[arch];
        const value = program && program[key]; // If this is the first time we have calculated this hash,
        // program[key] will be a thunk (lazy function with no parameters)
        // that we should call to do the actual computation.

        return typeof value === "function" ? program[key] = value() : value;
      };
    }

    WebApp.calculateClientHash = WebApp.clientHash = getter("version");
    WebApp.calculateClientHashRefreshable = getter("versionRefreshable");
    WebApp.calculateClientHashNonRefreshable = getter("versionNonRefreshable");
    WebApp.calculateClientHashReplaceable = getter("versionReplaceable");
    WebApp.getRefreshableAssets = getter("refreshableAssets");
  }); // When we have a request pending, we want the socket timeout to be long, to
  // give ourselves a while to serve it, and to allow sockjs long polls to
  // complete.  On the other hand, we want to close idle sockets relatively
  // quickly, so that we can shut down relatively promptly but cleanly, without
  // cutting off anyone's response.

  WebApp._timeoutAdjustmentRequestCallback = function (req, res) {
    // this is really just req.socket.setTimeout(LONG_SOCKET_TIMEOUT);
    req.setTimeout(LONG_SOCKET_TIMEOUT); // Insert our new finish listener to run BEFORE the existing one which removes
    // the response from the socket.

    var finishListeners = res.listeners('finish'); // XXX Apparently in Node 0.12 this event was called 'prefinish'.
    // https://github.com/joyent/node/commit/7c9b6070
    // But it has switched back to 'finish' in Node v4:
    // https://github.com/nodejs/node/pull/1411

    res.removeAllListeners('finish');
    res.on('finish', function () {
      res.setTimeout(SHORT_SOCKET_TIMEOUT);
    });

    _.each(finishListeners, function (l) {
      res.on('finish', l);
    });
  }; // Will be updated by main before we listen.
  // Map from client arch to boilerplate object.
  // Boilerplate object has:
  //   - func: XXX
  //   - baseData: XXX


  var boilerplateByArch = {}; // Register a callback function that can selectively modify boilerplate
  // data given arguments (request, data, arch). The key should be a unique
  // identifier, to prevent accumulating duplicate callbacks from the same
  // call site over time. Callbacks will be called in the order they were
  // registered. A callback should return false if it did not make any
  // changes affecting the boilerplate. Passing null deletes the callback.
  // Any previous callback registered for this key will be returned.

  const boilerplateDataCallbacks = Object.create(null);

  WebAppInternals.registerBoilerplateDataCallback = function (key, callback) {
    const previousCallback = boilerplateDataCallbacks[key];

    if (typeof callback === "function") {
      boilerplateDataCallbacks[key] = callback;
    } else {
      assert.strictEqual(callback, null);
      delete boilerplateDataCallbacks[key];
    } // Return the previous callback in case the new callback needs to call
    // it; for example, when the new callback is a wrapper for the old.


    return previousCallback || null;
  }; // Given a request (as returned from `categorizeRequest`), return the
  // boilerplate HTML to serve for that request.
  //
  // If a previous connect middleware has rendered content for the head or body,
  // returns the boilerplate with that content patched in otherwise
  // memoizes on HTML attributes (used by, eg, appcache) and whether inline
  // scripts are currently allowed.
  // XXX so far this function is always called with arch === 'web.browser'


  function getBoilerplate(request, arch) {
    return getBoilerplateAsync(request, arch).await();
  }

  function getBoilerplateAsync(request, arch) {
    const boilerplate = boilerplateByArch[arch];
    const data = Object.assign({}, boilerplate.baseData, {
      htmlAttributes: getHtmlAttributes(request)
    }, _.pick(request, "dynamicHead", "dynamicBody"));
    let madeChanges = false;
    let promise = Promise.resolve();
    Object.keys(boilerplateDataCallbacks).forEach(key => {
      promise = promise.then(() => {
        const callback = boilerplateDataCallbacks[key];
        return callback(request, data, arch);
      }).then(result => {
        // Callbacks should return false if they did not make any changes.
        if (result !== false) {
          madeChanges = true;
        }
      });
    });
    return promise.then(() => ({
      stream: boilerplate.toHTMLStream(data),
      statusCode: data.statusCode,
      headers: data.headers
    }));
  }

  WebAppInternals.generateBoilerplateInstance = function (arch, manifest, additionalOptions) {
    additionalOptions = additionalOptions || {};
    const meteorRuntimeConfig = JSON.stringify(encodeURIComponent(JSON.stringify(_objectSpread(_objectSpread({}, __meteor_runtime_config__), additionalOptions.runtimeConfigOverrides || {}))));
    return new Boilerplate(arch, manifest, _.extend({
      pathMapper(itemPath) {
        return pathJoin(archPath[arch], itemPath);
      },

      baseDataExtension: {
        additionalStaticJs: _.map(additionalStaticJs || [], function (contents, pathname) {
          return {
            pathname: pathname,
            contents: contents
          };
        }),
        // Convert to a JSON string, then get rid of most weird characters, then
        // wrap in double quotes. (The outermost JSON.stringify really ought to
        // just be "wrap in double quotes" but we use it to be safe.) This might
        // end up inside a <script> tag so we need to be careful to not include
        // "</script>", but normal {{spacebars}} escaping escapes too much! See
        // https://github.com/meteor/meteor/issues/3730
        meteorRuntimeConfig,
        meteorRuntimeHash: sha1(meteorRuntimeConfig),
        rootUrlPathPrefix: __meteor_runtime_config__.ROOT_URL_PATH_PREFIX || '',
        bundledJsCssUrlRewriteHook: bundledJsCssUrlRewriteHook,
        sriMode: sriMode,
        inlineScriptsAllowed: WebAppInternals.inlineScriptsAllowed(),
        inline: additionalOptions.inline
      }
    }, additionalOptions));
  }; // A mapping from url path to architecture (e.g. "web.browser") to static
  // file information with the following fields:
  // - type: the type of file to be served
  // - cacheable: optionally, whether the file should be cached or not
  // - sourceMapUrl: optionally, the url of the source map
  //
  // Info also contains one of the following:
  // - content: the stringified content that should be served at this path
  // - absolutePath: the absolute path on disk to the file
  // Serve static files from the manifest or added with
  // `addStaticJs`. Exported for tests.


  WebAppInternals.staticFilesMiddleware = function (staticFilesByArch, req, res, next) {
    return Promise.asyncApply(() => {
      if ('GET' != req.method && 'HEAD' != req.method && 'OPTIONS' != req.method) {
        next();
        return;
      }

      var pathname = parseRequest(req).pathname;

      try {
        pathname = decodeURIComponent(pathname);
      } catch (e) {
        next();
        return;
      }

      var serveStaticJs = function (s) {
        res.writeHead(200, {
          'Content-type': 'application/javascript; charset=UTF-8'
        });
        res.write(s);
        res.end();
      };

      if (_.has(additionalStaticJs, pathname) && !WebAppInternals.inlineScriptsAllowed()) {
        serveStaticJs(additionalStaticJs[pathname]);
        return;
      }

      const {
        arch,
        path
      } = WebApp.categorizeRequest(req);

      if (!hasOwn.call(WebApp.clientPrograms, arch)) {
        // We could come here in case we run with some architectures excluded
        next();
        return;
      } // If pauseClient(arch) has been called, program.paused will be a
      // Promise that will be resolved when the program is unpaused.


      const program = WebApp.clientPrograms[arch];
      Promise.await(program.paused);

      if (path === "/meteor_runtime_config.js" && !WebAppInternals.inlineScriptsAllowed()) {
        serveStaticJs("__meteor_runtime_config__ = ".concat(program.meteorRuntimeConfig, ";"));
        return;
      }

      const info = getStaticFileInfo(staticFilesByArch, pathname, path, arch);

      if (!info) {
        next();
        return;
      } // We don't need to call pause because, unlike 'static', once we call into
      // 'send' and yield to the event loop, we never call another handler with
      // 'next'.
      // Cacheable files are files that should never change. Typically
      // named by their hash (eg meteor bundled js and css files).
      // We cache them ~forever (1yr).


      const maxAge = info.cacheable ? 1000 * 60 * 60 * 24 * 365 : 0;

      if (info.cacheable) {
        // Since we use req.headers["user-agent"] to determine whether the
        // client should receive modern or legacy resources, tell the client
        // to invalidate cached resources when/if its user agent string
        // changes in the future.
        res.setHeader("Vary", "User-Agent");
      } // Set the X-SourceMap header, which current Chrome, FireFox, and Safari
      // understand.  (The SourceMap header is slightly more spec-correct but FF
      // doesn't understand it.)
      //
      // You may also need to enable source maps in Chrome: open dev tools, click
      // the gear in the bottom right corner, and select "enable source maps".


      if (info.sourceMapUrl) {
        res.setHeader('X-SourceMap', __meteor_runtime_config__.ROOT_URL_PATH_PREFIX + info.sourceMapUrl);
      }

      if (info.type === "js" || info.type === "dynamic js") {
        res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
      } else if (info.type === "css") {
        res.setHeader("Content-Type", "text/css; charset=UTF-8");
      } else if (info.type === "json") {
        res.setHeader("Content-Type", "application/json; charset=UTF-8");
      }

      if (info.hash) {
        res.setHeader('ETag', '"' + info.hash + '"');
      }

      if (info.content) {
        res.write(info.content);
        res.end();
      } else {
        send(req, info.absolutePath, {
          maxage: maxAge,
          dotfiles: 'allow',
          // if we specified a dotfile in the manifest, serve it
          lastModified: false // don't set last-modified based on the file date

        }).on('error', function (err) {
          Log.error("Error serving static file " + err);
          res.writeHead(500);
          res.end();
        }).on('directory', function () {
          Log.error("Unexpected directory " + info.absolutePath);
          res.writeHead(500);
          res.end();
        }).pipe(res);
      }
    });
  };

  function getStaticFileInfo(staticFilesByArch, originalPath, path, arch) {
    if (!hasOwn.call(WebApp.clientPrograms, arch)) {
      return null;
    } // Get a list of all available static file architectures, with arch
    // first in the list if it exists.


    const staticArchList = Object.keys(staticFilesByArch);
    const archIndex = staticArchList.indexOf(arch);

    if (archIndex > 0) {
      staticArchList.unshift(staticArchList.splice(archIndex, 1)[0]);
    }

    let info = null;
    staticArchList.some(arch => {
      const staticFiles = staticFilesByArch[arch];

      function finalize(path) {
        info = staticFiles[path]; // Sometimes we register a lazy function instead of actual data in
        // the staticFiles manifest.

        if (typeof info === "function") {
          info = staticFiles[path] = info();
        }

        return info;
      } // If staticFiles contains originalPath with the arch inferred above,
      // use that information.


      if (hasOwn.call(staticFiles, originalPath)) {
        return finalize(originalPath);
      } // If categorizeRequest returned an alternate path, try that instead.


      if (path !== originalPath && hasOwn.call(staticFiles, path)) {
        return finalize(path);
      }
    });
    return info;
  } // Parse the passed in port value. Return the port as-is if it's a String
  // (e.g. a Windows Server style named pipe), otherwise return the port as an
  // integer.
  //
  // DEPRECATED: Direct use of this function is not recommended; it is no
  // longer used internally, and will be removed in a future release.


  WebAppInternals.parsePort = port => {
    let parsedPort = parseInt(port);

    if (Number.isNaN(parsedPort)) {
      parsedPort = port;
    }

    return parsedPort;
  };

  onMessage("webapp-pause-client", (_ref) => Promise.asyncApply(() => {
    let {
      arch
    } = _ref;
    WebAppInternals.pauseClient(arch);
  }));
  onMessage("webapp-reload-client", (_ref2) => Promise.asyncApply(() => {
    let {
      arch
    } = _ref2;
    WebAppInternals.generateClientProgram(arch);
  }));

  function runWebAppServer() {
    var shuttingDown = false;
    var syncQueue = new Meteor._SynchronousQueue();

    var getItemPathname = function (itemUrl) {
      return decodeURIComponent(parseUrl(itemUrl).pathname);
    };

    WebAppInternals.reloadClientPrograms = function () {
      syncQueue.runTask(function () {
        const staticFilesByArch = Object.create(null);
        const {
          configJson
        } = __meteor_bootstrap__;
        const clientArchs = configJson.clientArchs || Object.keys(configJson.clientPaths);

        try {
          clientArchs.forEach(arch => {
            generateClientProgram(arch, staticFilesByArch);
          });
          WebAppInternals.staticFilesByArch = staticFilesByArch;
        } catch (e) {
          Log.error("Error reloading the client program: " + e.stack);
          process.exit(1);
        }
      });
    }; // Pause any incoming requests and make them wait for the program to be
    // unpaused the next time generateClientProgram(arch) is called.


    WebAppInternals.pauseClient = function (arch) {
      syncQueue.runTask(() => {
        const program = WebApp.clientPrograms[arch];
        const {
          unpause
        } = program;
        program.paused = new Promise(resolve => {
          if (typeof unpause === "function") {
            // If there happens to be an existing program.unpause function,
            // compose it with the resolve function.
            program.unpause = function () {
              unpause();
              resolve();
            };
          } else {
            program.unpause = resolve;
          }
        });
      });
    };

    WebAppInternals.generateClientProgram = function (arch) {
      syncQueue.runTask(() => generateClientProgram(arch));
    };

    function generateClientProgram(arch) {
      let staticFilesByArch = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : WebAppInternals.staticFilesByArch;
      const clientDir = pathJoin(pathDirname(__meteor_bootstrap__.serverDir), arch); // read the control for the client we'll be serving up

      const programJsonPath = pathJoin(clientDir, "program.json");
      let programJson;

      try {
        programJson = JSON.parse(readFileSync(programJsonPath));
      } catch (e) {
        if (e.code === "ENOENT") return;
        throw e;
      }

      if (programJson.format !== "web-program-pre1") {
        throw new Error("Unsupported format for client assets: " + JSON.stringify(programJson.format));
      }

      if (!programJsonPath || !clientDir || !programJson) {
        throw new Error("Client config file not parsed.");
      }

      archPath[arch] = clientDir;
      const staticFiles = staticFilesByArch[arch] = Object.create(null);
      const {
        manifest
      } = programJson;
      manifest.forEach(item => {
        if (item.url && item.where === "client") {
          staticFiles[getItemPathname(item.url)] = {
            absolutePath: pathJoin(clientDir, item.path),
            cacheable: item.cacheable,
            hash: item.hash,
            // Link from source to its map
            sourceMapUrl: item.sourceMapUrl,
            type: item.type
          };

          if (item.sourceMap) {
            // Serve the source map too, under the specified URL. We assume
            // all source maps are cacheable.
            staticFiles[getItemPathname(item.sourceMapUrl)] = {
              absolutePath: pathJoin(clientDir, item.sourceMap),
              cacheable: true
            };
          }
        }
      });
      const {
        PUBLIC_SETTINGS
      } = __meteor_runtime_config__;
      const configOverrides = {
        PUBLIC_SETTINGS
      };
      const oldProgram = WebApp.clientPrograms[arch];
      const newProgram = WebApp.clientPrograms[arch] = {
        format: "web-program-pre1",
        manifest: manifest,
        // Use arrow functions so that these versions can be lazily
        // calculated later, and so that they will not be included in the
        // staticFiles[manifestUrl].content string below.
        //
        // Note: these version calculations must be kept in agreement with
        // CordovaBuilder#appendVersion in tools/cordova/builder.js, or hot
        // code push will reload Cordova apps unnecessarily.
        version: () => WebAppHashing.calculateClientHash(manifest, null, configOverrides),
        versionRefreshable: () => WebAppHashing.calculateClientHash(manifest, type => type === "css", configOverrides),
        versionNonRefreshable: () => WebAppHashing.calculateClientHash(manifest, (type, replaceable) => type !== "css" && !replaceable, configOverrides),
        versionReplaceable: () => WebAppHashing.calculateClientHash(manifest, (_type, replaceable) => {
          if (Meteor.isProduction && replaceable) {
            throw new Error('Unexpected replaceable file in production');
          }

          return replaceable;
        }, configOverrides),
        cordovaCompatibilityVersions: programJson.cordovaCompatibilityVersions,
        PUBLIC_SETTINGS
      }; // Expose program details as a string reachable via the following URL.

      const manifestUrlPrefix = "/__" + arch.replace(/^web\./, "");
      const manifestUrl = manifestUrlPrefix + getItemPathname("/manifest.json");

      staticFiles[manifestUrl] = () => {
        if (Package.autoupdate) {
          const {
            AUTOUPDATE_VERSION = Package.autoupdate.Autoupdate.autoupdateVersion
          } = process.env;

          if (AUTOUPDATE_VERSION) {
            newProgram.version = AUTOUPDATE_VERSION;
          }
        }

        if (typeof newProgram.version === "function") {
          newProgram.version = newProgram.version();
        }

        return {
          content: JSON.stringify(newProgram),
          cacheable: false,
          hash: newProgram.version,
          type: "json"
        };
      };

      generateBoilerplateForArch(arch); // If there are any requests waiting on oldProgram.paused, let them
      // continue now (using the new program).

      if (oldProgram && oldProgram.paused) {
        oldProgram.unpause();
      }
    }

    ;
    const defaultOptionsForArch = {
      'web.cordova': {
        runtimeConfigOverrides: {
          // XXX We use absoluteUrl() here so that we serve https://
          // URLs to cordova clients if force-ssl is in use. If we were
          // to use __meteor_runtime_config__.ROOT_URL instead of
          // absoluteUrl(), then Cordova clients would immediately get a
          // HCP setting their DDP_DEFAULT_CONNECTION_URL to
          // http://example.meteor.com. This breaks the app, because
          // force-ssl doesn't serve CORS headers on 302
          // redirects. (Plus it's undesirable to have clients
          // connecting to http://example.meteor.com when force-ssl is
          // in use.)
          DDP_DEFAULT_CONNECTION_URL: process.env.MOBILE_DDP_URL || Meteor.absoluteUrl(),
          ROOT_URL: process.env.MOBILE_ROOT_URL || Meteor.absoluteUrl()
        }
      },
      "web.browser": {
        runtimeConfigOverrides: {
          isModern: true
        }
      },
      "web.browser.legacy": {
        runtimeConfigOverrides: {
          isModern: false
        }
      }
    };

    WebAppInternals.generateBoilerplate = function () {
      // This boilerplate will be served to the mobile devices when used with
      // Meteor/Cordova for the Hot-Code Push and since the file will be served by
      // the device's server, it is important to set the DDP url to the actual
      // Meteor server accepting DDP connections and not the device's file server.
      syncQueue.runTask(function () {
        Object.keys(WebApp.clientPrograms).forEach(generateBoilerplateForArch);
      });
    };

    function generateBoilerplateForArch(arch) {
      const program = WebApp.clientPrograms[arch];
      const additionalOptions = defaultOptionsForArch[arch] || {};
      const {
        baseData
      } = boilerplateByArch[arch] = WebAppInternals.generateBoilerplateInstance(arch, program.manifest, additionalOptions); // We need the runtime config with overrides for meteor_runtime_config.js:

      program.meteorRuntimeConfig = JSON.stringify(_objectSpread(_objectSpread({}, __meteor_runtime_config__), additionalOptions.runtimeConfigOverrides || null));
      program.refreshableAssets = baseData.css.map(file => ({
        url: bundledJsCssUrlRewriteHook(file.url)
      }));
    }

    WebAppInternals.reloadClientPrograms(); // webserver

    var app = connect(); // Packages and apps can add handlers that run before any other Meteor
    // handlers via WebApp.rawConnectHandlers.

    var rawConnectHandlers = connect();
    app.use(rawConnectHandlers); // Auto-compress any json, javascript, or text.

    app.use(compress({
      filter: shouldCompress
    })); // parse cookies into an object

    app.use(cookieParser()); // We're not a proxy; reject (without crashing) attempts to treat us like
    // one. (See #1212.)

    app.use(function (req, res, next) {
      if (RoutePolicy.isValidUrl(req.url)) {
        next();
        return;
      }

      res.writeHead(400);
      res.write("Not a proxy");
      res.end();
    }); // Parse the query string into res.query. Used by oauth_server, but it's
    // generally pretty handy..
    //
    // Do this before the next middleware destroys req.url if a path prefix
    // is set to close #10111.

    app.use(function (request, response, next) {
      request.query = qs.parse(parseUrl(request.url).query);
      next();
    });

    function getPathParts(path) {
      const parts = path.split("/");

      while (parts[0] === "") parts.shift();

      return parts;
    }

    function isPrefixOf(prefix, array) {
      return prefix.length <= array.length && prefix.every((part, i) => part === array[i]);
    } // Strip off the path prefix, if it exists.


    app.use(function (request, response, next) {
      const pathPrefix = __meteor_runtime_config__.ROOT_URL_PATH_PREFIX;
      const {
        pathname,
        search
      } = parseUrl(request.url); // check if the path in the url starts with the path prefix

      if (pathPrefix) {
        const prefixParts = getPathParts(pathPrefix);
        const pathParts = getPathParts(pathname);

        if (isPrefixOf(prefixParts, pathParts)) {
          request.url = "/" + pathParts.slice(prefixParts.length).join("/");

          if (search) {
            request.url += search;
          }

          return next();
        }
      }

      if (pathname === "/favicon.ico" || pathname === "/robots.txt") {
        return next();
      }

      if (pathPrefix) {
        response.writeHead(404);
        response.write("Unknown path");
        response.end();
        return;
      }

      next();
    }); // Serve static files from the manifest.
    // This is inspired by the 'static' middleware.

    app.use(function (req, res, next) {
      WebAppInternals.staticFilesMiddleware(WebAppInternals.staticFilesByArch, req, res, next);
    }); // Core Meteor packages like dynamic-import can add handlers before
    // other handlers added by package and application code.

    app.use(WebAppInternals.meteorInternalHandlers = connect()); // Packages and apps can add handlers to this via WebApp.connectHandlers.
    // They are inserted before our default handler.

    var packageAndAppHandlers = connect();
    app.use(packageAndAppHandlers);
    var suppressConnectErrors = false; // connect knows it is an error handler because it has 4 arguments instead of
    // 3. go figure.  (It is not smart enough to find such a thing if it's hidden
    // inside packageAndAppHandlers.)

    app.use(function (err, req, res, next) {
      if (!err || !suppressConnectErrors || !req.headers['x-suppress-error']) {
        next(err);
        return;
      }

      res.writeHead(err.status, {
        'Content-Type': 'text/plain'
      });
      res.end("An error message");
    });
    app.use(function (req, res, next) {
      return Promise.asyncApply(() => {
        if (!appUrl(req.url)) {
          return next();
        } else {
          var headers = {
            'Content-Type': 'text/html; charset=utf-8'
          };

          if (shuttingDown) {
            headers['Connection'] = 'Close';
          }

          var request = WebApp.categorizeRequest(req);

          if (request.url.query && request.url.query['meteor_css_resource']) {
            // In this case, we're requesting a CSS resource in the meteor-specific
            // way, but we don't have it.  Serve a static css file that indicates that
            // we didn't have it, so we can detect that and refresh.  Make sure
            // that any proxies or CDNs don't cache this error!  (Normally proxies
            // or CDNs are smart enough not to cache error pages, but in order to
            // make this hack work, we need to return the CSS file as a 200, which
            // would otherwise be cached.)
            headers['Content-Type'] = 'text/css; charset=utf-8';
            headers['Cache-Control'] = 'no-cache';
            res.writeHead(200, headers);
            res.write(".meteor-css-not-found-error { width: 0px;}");
            res.end();
            return;
          }

          if (request.url.query && request.url.query['meteor_js_resource']) {
            // Similarly, we're requesting a JS resource that we don't have.
            // Serve an uncached 404. (We can't use the same hack we use for CSS,
            // because actually acting on that hack requires us to have the JS
            // already!)
            headers['Cache-Control'] = 'no-cache';
            res.writeHead(404, headers);
            res.end("404 Not Found");
            return;
          }

          if (request.url.query && request.url.query['meteor_dont_serve_index']) {
            // When downloading files during a Cordova hot code push, we need
            // to detect if a file is not available instead of inadvertently
            // downloading the default index page.
            // So similar to the situation above, we serve an uncached 404.
            headers['Cache-Control'] = 'no-cache';
            res.writeHead(404, headers);
            res.end("404 Not Found");
            return;
          }

          const {
            arch
          } = request;
          assert.strictEqual(typeof arch, "string", {
            arch
          });

          if (!hasOwn.call(WebApp.clientPrograms, arch)) {
            // We could come here in case we run with some architectures excluded
            headers['Cache-Control'] = 'no-cache';
            res.writeHead(404, headers);

            if (Meteor.isDevelopment) {
              res.end("No client program found for the ".concat(arch, " architecture."));
            } else {
              // Safety net, but this branch should not be possible.
              res.end("404 Not Found");
            }

            return;
          } // If pauseClient(arch) has been called, program.paused will be a
          // Promise that will be resolved when the program is unpaused.


          Promise.await(WebApp.clientPrograms[arch].paused);
          return getBoilerplateAsync(request, arch).then((_ref3) => {
            let {
              stream,
              statusCode,
              headers: newHeaders
            } = _ref3;

            if (!statusCode) {
              statusCode = res.statusCode ? res.statusCode : 200;
            }

            if (newHeaders) {
              Object.assign(headers, newHeaders);
            }

            res.writeHead(statusCode, headers);
            stream.pipe(res, {
              // End the response when the stream ends.
              end: true
            });
          }).catch(error => {
            Log.error("Error running template: " + error.stack);
            res.writeHead(500, headers);
            res.end();
          });
        }
      });
    }); // Return 404 by default, if no other handlers serve this URL.

    app.use(function (req, res) {
      res.writeHead(404);
      res.end();
    });
    var httpServer = createServer(app);
    var onListeningCallbacks = []; // After 5 seconds w/o data on a socket, kill it.  On the other hand, if
    // there's an outstanding request, give it a higher timeout instead (to avoid
    // killing long-polling requests)

    httpServer.setTimeout(SHORT_SOCKET_TIMEOUT); // Do this here, and then also in livedata/stream_server.js, because
    // stream_server.js kills all the current request handlers when installing its
    // own.

    httpServer.on('request', WebApp._timeoutAdjustmentRequestCallback); // If the client gave us a bad request, tell it instead of just closing the
    // socket. This lets load balancers in front of us differentiate between "a
    // server is randomly closing sockets for no reason" and "client sent a bad
    // request".
    //
    // This will only work on Node 6; Node 4 destroys the socket before calling
    // this event. See https://github.com/nodejs/node/pull/4557/ for details.

    httpServer.on('clientError', (err, socket) => {
      // Pre-Node-6, do nothing.
      if (socket.destroyed) {
        return;
      }

      if (err.message === 'Parse Error') {
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
      } else {
        // For other errors, use the default behavior as if we had no clientError
        // handler.
        socket.destroy(err);
      }
    }); // start up app

    _.extend(WebApp, {
      connectHandlers: packageAndAppHandlers,
      rawConnectHandlers: rawConnectHandlers,
      httpServer: httpServer,
      connectApp: app,
      // For testing.
      suppressConnectErrors: function () {
        suppressConnectErrors = true;
      },
      onListening: function (f) {
        if (onListeningCallbacks) onListeningCallbacks.push(f);else f();
      },
      // This can be overridden by users who want to modify how listening works
      // (eg, to run a proxy like Apollo Engine Proxy in front of the server).
      startListening: function (httpServer, listenOptions, cb) {
        httpServer.listen(listenOptions, cb);
      }
    }); // Let the rest of the packages (and Meteor.startup hooks) insert connect
    // middlewares and update __meteor_runtime_config__, then keep going to set up
    // actually serving HTML.


    exports.main = argv => {
      WebAppInternals.generateBoilerplate();

      const startHttpServer = listenOptions => {
        WebApp.startListening(httpServer, listenOptions, Meteor.bindEnvironment(() => {
          if (process.env.METEOR_PRINT_ON_LISTEN) {
            console.log("LISTENING");
          }

          const callbacks = onListeningCallbacks;
          onListeningCallbacks = null;
          callbacks.forEach(callback => {
            callback();
          });
        }, e => {
          console.error("Error listening:", e);
          console.error(e && e.stack);
        }));
      };

      let localPort = process.env.PORT || 0;
      let unixSocketPath = process.env.UNIX_SOCKET_PATH;

      if (unixSocketPath) {
        if (cluster.isWorker) {
          const workerName = cluster.worker.process.env.name || cluster.worker.id;
          unixSocketPath += "." + workerName + ".sock";
        } // Start the HTTP server using a socket file.


        removeExistingSocketFile(unixSocketPath);
        startHttpServer({
          path: unixSocketPath
        });
        registerSocketFileCleanup(unixSocketPath);
      } else {
        localPort = isNaN(Number(localPort)) ? localPort : Number(localPort);

        if (/\\\\?.+\\pipe\\?.+/.test(localPort)) {
          // Start the HTTP server using Windows Server style named pipe.
          startHttpServer({
            path: localPort
          });
        } else if (typeof localPort === "number") {
          // Start the HTTP server using TCP.
          startHttpServer({
            port: localPort,
            host: process.env.BIND_IP || "0.0.0.0"
          });
        } else {
          throw new Error("Invalid PORT specified");
        }
      }

      return "DAEMON";
    };
  }

  var inlineScriptsAllowed = true;

  WebAppInternals.inlineScriptsAllowed = function () {
    return inlineScriptsAllowed;
  };

  WebAppInternals.setInlineScriptsAllowed = function (value) {
    inlineScriptsAllowed = value;
    WebAppInternals.generateBoilerplate();
  };

  var sriMode;

  WebAppInternals.enableSubresourceIntegrity = function () {
    let use_credentials = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    sriMode = use_credentials ? 'use-credentials' : 'anonymous';
    WebAppInternals.generateBoilerplate();
  };

  WebAppInternals.setBundledJsCssUrlRewriteHook = function (hookFn) {
    bundledJsCssUrlRewriteHook = hookFn;
    WebAppInternals.generateBoilerplate();
  };

  WebAppInternals.setBundledJsCssPrefix = function (prefix) {
    var self = this;
    self.setBundledJsCssUrlRewriteHook(function (url) {
      return prefix + url;
    });
  }; // Packages can call `WebAppInternals.addStaticJs` to specify static
  // JavaScript to be included in the app. This static JS will be inlined,
  // unless inline scripts have been disabled, in which case it will be
  // served under `/<sha1 of contents>`.


  var additionalStaticJs = {};

  WebAppInternals.addStaticJs = function (contents) {
    additionalStaticJs["/" + sha1(contents) + ".js"] = contents;
  }; // Exported for tests


  WebAppInternals.getBoilerplate = getBoilerplate;
  WebAppInternals.additionalStaticJs = additionalStaticJs; // Start the server!

  runWebAppServer();
}.call(this, module);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"connect.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/webapp/connect.js                                                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  connect: () => connect
});
let npmConnect;
module.link("connect", {
  default(v) {
    npmConnect = v;
  }

}, 0);

function connect() {
  for (var _len = arguments.length, connectArgs = new Array(_len), _key = 0; _key < _len; _key++) {
    connectArgs[_key] = arguments[_key];
  }

  const handlers = npmConnect.apply(this, connectArgs);
  const originalUse = handlers.use; // Wrap the handlers.use method so that any provided handler functions
  // alway run in a Fiber.

  handlers.use = function use() {
    for (var _len2 = arguments.length, useArgs = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      useArgs[_key2] = arguments[_key2];
    }

    const {
      stack
    } = this;
    const originalLength = stack.length;
    const result = originalUse.apply(this, useArgs); // If we just added anything to the stack, wrap each new entry.handle
    // with a function that calls Promise.asyncApply to ensure the
    // original handler runs in a Fiber.

    for (let i = originalLength; i < stack.length; ++i) {
      const entry = stack[i];
      const originalHandle = entry.handle;

      if (originalHandle.length >= 4) {
        // If the original handle had four (or more) parameters, the
        // wrapper must also have four parameters, since connect uses
        // handle.length to dermine whether to pass the error as the first
        // argument to the handle function.
        entry.handle = function handle(err, req, res, next) {
          return Promise.asyncApply(originalHandle, this, arguments);
        };
      } else {
        entry.handle = function handle(req, res, next) {
          return Promise.asyncApply(originalHandle, this, arguments);
        };
      }
    }

    return result;
  };

  return handlers;
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"socket_file.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// packages/webapp/socket_file.js                                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.export({
  removeExistingSocketFile: () => removeExistingSocketFile,
  registerSocketFileCleanup: () => registerSocketFileCleanup
});
let statSync, unlinkSync, existsSync;
module.link("fs", {
  statSync(v) {
    statSync = v;
  },

  unlinkSync(v) {
    unlinkSync = v;
  },

  existsSync(v) {
    existsSync = v;
  }

}, 0);

const removeExistingSocketFile = socketPath => {
  try {
    if (statSync(socketPath).isSocket()) {
      // Since a new socket file will be created, remove the existing
      // file.
      unlinkSync(socketPath);
    } else {
      throw new Error("An existing file was found at \"".concat(socketPath, "\" and it is not ") + 'a socket file. Please confirm PORT is pointing to valid and ' + 'un-used socket file path.');
    }
  } catch (error) {
    // If there is no existing socket file to cleanup, great, we'll
    // continue normally. If the caught exception represents any other
    // issue, re-throw.
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

const registerSocketFileCleanup = function (socketPath) {
  let eventEmitter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : process;
  ['exit', 'SIGINT', 'SIGHUP', 'SIGTERM'].forEach(signal => {
    eventEmitter.on(signal, Meteor.bindEnvironment(() => {
      if (existsSync(socketPath)) {
        unlinkSync(socketPath);
      }
    }));
  });
};
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"node_modules":{"connect":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/connect/package.json                                                       //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "connect",
  "version": "3.6.5"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/connect/index.js                                                           //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"compression":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/compression/package.json                                                   //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "compression",
  "version": "1.7.1"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/compression/index.js                                                       //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"cookie-parser":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/cookie-parser/package.json                                                 //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "cookie-parser",
  "version": "1.4.3"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/cookie-parser/index.js                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"qs":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/qs/package.json                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "qs",
  "version": "6.4.0",
  "main": "lib/index.js"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"lib":{"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/qs/lib/index.js                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},"parseurl":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/parseurl/package.json                                                      //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "parseurl",
  "version": "1.3.2"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/parseurl/index.js                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"basic-auth-connect":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/basic-auth-connect/package.json                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "basic-auth-connect",
  "version": "1.0.0"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/basic-auth-connect/index.js                                                //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"useragent":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/useragent/package.json                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "useragent",
  "version": "2.3.0",
  "main": "./index.js"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/useragent/index.js                                                         //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"send":{"package.json":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/send/package.json                                                          //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.exports = {
  "name": "send",
  "version": "0.16.1"
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"index.js":function module(require,exports,module){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// node_modules/meteor/webapp/node_modules/send/index.js                                                              //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
module.useNode();
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/webapp/webapp_server.js");

/* Exports */
Package._define("webapp", exports, {
  WebApp: WebApp,
  WebAppInternals: WebAppInternals,
  main: main
});

})();

//# sourceURL=meteor://💻app/packages/webapp.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvd2ViYXBwL3dlYmFwcF9zZXJ2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL3dlYmFwcC9jb25uZWN0LmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy93ZWJhcHAvc29ja2V0X2ZpbGUuanMiXSwibmFtZXMiOlsiX29iamVjdFNwcmVhZCIsIm1vZHVsZTEiLCJsaW5rIiwiZGVmYXVsdCIsInYiLCJleHBvcnQiLCJXZWJBcHAiLCJXZWJBcHBJbnRlcm5hbHMiLCJhc3NlcnQiLCJyZWFkRmlsZVN5bmMiLCJjcmVhdGVTZXJ2ZXIiLCJwYXRoSm9pbiIsInBhdGhEaXJuYW1lIiwiam9pbiIsImRpcm5hbWUiLCJwYXJzZVVybCIsInBhcnNlIiwiY3JlYXRlSGFzaCIsImNvbm5lY3QiLCJjb21wcmVzcyIsImNvb2tpZVBhcnNlciIsInFzIiwicGFyc2VSZXF1ZXN0IiwiYmFzaWNBdXRoIiwibG9va3VwVXNlckFnZW50IiwibG9va3VwIiwiaXNNb2Rlcm4iLCJzZW5kIiwicmVtb3ZlRXhpc3RpbmdTb2NrZXRGaWxlIiwicmVnaXN0ZXJTb2NrZXRGaWxlQ2xlYW51cCIsImNsdXN0ZXIiLCJvbk1lc3NhZ2UiLCJTSE9SVF9TT0NLRVRfVElNRU9VVCIsIkxPTkdfU09DS0VUX1RJTUVPVVQiLCJoYXNPd24iLCJPYmplY3QiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsIk5wbU1vZHVsZXMiLCJ2ZXJzaW9uIiwiTnBtIiwicmVxdWlyZSIsIm1vZHVsZSIsImRlZmF1bHRBcmNoIiwiY2xpZW50UHJvZ3JhbXMiLCJhcmNoUGF0aCIsImJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rIiwidXJsIiwiYnVuZGxlZFByZWZpeCIsIl9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18iLCJST09UX1VSTF9QQVRIX1BSRUZJWCIsInNoYTEiLCJjb250ZW50cyIsImhhc2giLCJ1cGRhdGUiLCJkaWdlc3QiLCJzaG91bGRDb21wcmVzcyIsInJlcSIsInJlcyIsImhlYWRlcnMiLCJmaWx0ZXIiLCJjYW1lbENhc2UiLCJuYW1lIiwicGFydHMiLCJzcGxpdCIsInRvTG93ZXJDYXNlIiwiaSIsImxlbmd0aCIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic3Vic3RyIiwiaWRlbnRpZnlCcm93c2VyIiwidXNlckFnZW50U3RyaW5nIiwidXNlckFnZW50IiwiZmFtaWx5IiwibWFqb3IiLCJtaW5vciIsInBhdGNoIiwiY2F0ZWdvcml6ZVJlcXVlc3QiLCJicm93c2VyIiwiYXJjaCIsIm1vZGVybiIsInBhdGgiLCJwYXRobmFtZSIsImNhdGVnb3JpemVkIiwiZHluYW1pY0hlYWQiLCJkeW5hbWljQm9keSIsImNvb2tpZXMiLCJwYXRoUGFydHMiLCJhcmNoS2V5Iiwic3RhcnRzV2l0aCIsImFyY2hDbGVhbmVkIiwic2xpY2UiLCJjYWxsIiwic3BsaWNlIiwiYXNzaWduIiwicHJlZmVycmVkQXJjaE9yZGVyIiwiaHRtbEF0dHJpYnV0ZUhvb2tzIiwiZ2V0SHRtbEF0dHJpYnV0ZXMiLCJyZXF1ZXN0IiwiY29tYmluZWRBdHRyaWJ1dGVzIiwiXyIsImVhY2giLCJob29rIiwiYXR0cmlidXRlcyIsIkVycm9yIiwiZXh0ZW5kIiwiYWRkSHRtbEF0dHJpYnV0ZUhvb2siLCJwdXNoIiwiYXBwVXJsIiwiUm91dGVQb2xpY3kiLCJjbGFzc2lmeSIsIk1ldGVvciIsInN0YXJ0dXAiLCJnZXR0ZXIiLCJrZXkiLCJwcm9ncmFtIiwidmFsdWUiLCJjYWxjdWxhdGVDbGllbnRIYXNoIiwiY2xpZW50SGFzaCIsImNhbGN1bGF0ZUNsaWVudEhhc2hSZWZyZXNoYWJsZSIsImNhbGN1bGF0ZUNsaWVudEhhc2hOb25SZWZyZXNoYWJsZSIsImNhbGN1bGF0ZUNsaWVudEhhc2hSZXBsYWNlYWJsZSIsImdldFJlZnJlc2hhYmxlQXNzZXRzIiwiX3RpbWVvdXRBZGp1c3RtZW50UmVxdWVzdENhbGxiYWNrIiwic2V0VGltZW91dCIsImZpbmlzaExpc3RlbmVycyIsImxpc3RlbmVycyIsInJlbW92ZUFsbExpc3RlbmVycyIsIm9uIiwibCIsImJvaWxlcnBsYXRlQnlBcmNoIiwiYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzIiwiY3JlYXRlIiwicmVnaXN0ZXJCb2lsZXJwbGF0ZURhdGFDYWxsYmFjayIsImNhbGxiYWNrIiwicHJldmlvdXNDYWxsYmFjayIsInN0cmljdEVxdWFsIiwiZ2V0Qm9pbGVycGxhdGUiLCJnZXRCb2lsZXJwbGF0ZUFzeW5jIiwiYXdhaXQiLCJib2lsZXJwbGF0ZSIsImRhdGEiLCJiYXNlRGF0YSIsImh0bWxBdHRyaWJ1dGVzIiwicGljayIsIm1hZGVDaGFuZ2VzIiwicHJvbWlzZSIsIlByb21pc2UiLCJyZXNvbHZlIiwia2V5cyIsImZvckVhY2giLCJ0aGVuIiwicmVzdWx0Iiwic3RyZWFtIiwidG9IVE1MU3RyZWFtIiwic3RhdHVzQ29kZSIsImdlbmVyYXRlQm9pbGVycGxhdGVJbnN0YW5jZSIsIm1hbmlmZXN0IiwiYWRkaXRpb25hbE9wdGlvbnMiLCJtZXRlb3JSdW50aW1lQ29uZmlnIiwiSlNPTiIsInN0cmluZ2lmeSIsImVuY29kZVVSSUNvbXBvbmVudCIsInJ1bnRpbWVDb25maWdPdmVycmlkZXMiLCJCb2lsZXJwbGF0ZSIsInBhdGhNYXBwZXIiLCJpdGVtUGF0aCIsImJhc2VEYXRhRXh0ZW5zaW9uIiwiYWRkaXRpb25hbFN0YXRpY0pzIiwibWFwIiwibWV0ZW9yUnVudGltZUhhc2giLCJyb290VXJsUGF0aFByZWZpeCIsInNyaU1vZGUiLCJpbmxpbmVTY3JpcHRzQWxsb3dlZCIsImlubGluZSIsInN0YXRpY0ZpbGVzTWlkZGxld2FyZSIsInN0YXRpY0ZpbGVzQnlBcmNoIiwibmV4dCIsIm1ldGhvZCIsImRlY29kZVVSSUNvbXBvbmVudCIsImUiLCJzZXJ2ZVN0YXRpY0pzIiwicyIsIndyaXRlSGVhZCIsIndyaXRlIiwiZW5kIiwiaGFzIiwicGF1c2VkIiwiaW5mbyIsImdldFN0YXRpY0ZpbGVJbmZvIiwibWF4QWdlIiwiY2FjaGVhYmxlIiwic2V0SGVhZGVyIiwic291cmNlTWFwVXJsIiwidHlwZSIsImNvbnRlbnQiLCJhYnNvbHV0ZVBhdGgiLCJtYXhhZ2UiLCJkb3RmaWxlcyIsImxhc3RNb2RpZmllZCIsImVyciIsIkxvZyIsImVycm9yIiwicGlwZSIsIm9yaWdpbmFsUGF0aCIsInN0YXRpY0FyY2hMaXN0IiwiYXJjaEluZGV4IiwiaW5kZXhPZiIsInVuc2hpZnQiLCJzb21lIiwic3RhdGljRmlsZXMiLCJmaW5hbGl6ZSIsInBhcnNlUG9ydCIsInBvcnQiLCJwYXJzZWRQb3J0IiwicGFyc2VJbnQiLCJOdW1iZXIiLCJpc05hTiIsInBhdXNlQ2xpZW50IiwiZ2VuZXJhdGVDbGllbnRQcm9ncmFtIiwicnVuV2ViQXBwU2VydmVyIiwic2h1dHRpbmdEb3duIiwic3luY1F1ZXVlIiwiX1N5bmNocm9ub3VzUXVldWUiLCJnZXRJdGVtUGF0aG5hbWUiLCJpdGVtVXJsIiwicmVsb2FkQ2xpZW50UHJvZ3JhbXMiLCJydW5UYXNrIiwiY29uZmlnSnNvbiIsIl9fbWV0ZW9yX2Jvb3RzdHJhcF9fIiwiY2xpZW50QXJjaHMiLCJjbGllbnRQYXRocyIsInN0YWNrIiwicHJvY2VzcyIsImV4aXQiLCJ1bnBhdXNlIiwiY2xpZW50RGlyIiwic2VydmVyRGlyIiwicHJvZ3JhbUpzb25QYXRoIiwicHJvZ3JhbUpzb24iLCJjb2RlIiwiZm9ybWF0IiwiaXRlbSIsIndoZXJlIiwic291cmNlTWFwIiwiUFVCTElDX1NFVFRJTkdTIiwiY29uZmlnT3ZlcnJpZGVzIiwib2xkUHJvZ3JhbSIsIm5ld1Byb2dyYW0iLCJXZWJBcHBIYXNoaW5nIiwidmVyc2lvblJlZnJlc2hhYmxlIiwidmVyc2lvbk5vblJlZnJlc2hhYmxlIiwicmVwbGFjZWFibGUiLCJ2ZXJzaW9uUmVwbGFjZWFibGUiLCJfdHlwZSIsImlzUHJvZHVjdGlvbiIsImNvcmRvdmFDb21wYXRpYmlsaXR5VmVyc2lvbnMiLCJtYW5pZmVzdFVybFByZWZpeCIsInJlcGxhY2UiLCJtYW5pZmVzdFVybCIsIlBhY2thZ2UiLCJhdXRvdXBkYXRlIiwiQVVUT1VQREFURV9WRVJTSU9OIiwiQXV0b3VwZGF0ZSIsImF1dG91cGRhdGVWZXJzaW9uIiwiZW52IiwiZ2VuZXJhdGVCb2lsZXJwbGF0ZUZvckFyY2giLCJkZWZhdWx0T3B0aW9uc0ZvckFyY2giLCJERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTCIsIk1PQklMRV9ERFBfVVJMIiwiYWJzb2x1dGVVcmwiLCJST09UX1VSTCIsIk1PQklMRV9ST09UX1VSTCIsImdlbmVyYXRlQm9pbGVycGxhdGUiLCJyZWZyZXNoYWJsZUFzc2V0cyIsImNzcyIsImZpbGUiLCJhcHAiLCJyYXdDb25uZWN0SGFuZGxlcnMiLCJ1c2UiLCJpc1ZhbGlkVXJsIiwicmVzcG9uc2UiLCJxdWVyeSIsImdldFBhdGhQYXJ0cyIsInNoaWZ0IiwiaXNQcmVmaXhPZiIsInByZWZpeCIsImFycmF5IiwiZXZlcnkiLCJwYXJ0IiwicGF0aFByZWZpeCIsInNlYXJjaCIsInByZWZpeFBhcnRzIiwibWV0ZW9ySW50ZXJuYWxIYW5kbGVycyIsInBhY2thZ2VBbmRBcHBIYW5kbGVycyIsInN1cHByZXNzQ29ubmVjdEVycm9ycyIsInN0YXR1cyIsImlzRGV2ZWxvcG1lbnQiLCJuZXdIZWFkZXJzIiwiY2F0Y2giLCJodHRwU2VydmVyIiwib25MaXN0ZW5pbmdDYWxsYmFja3MiLCJzb2NrZXQiLCJkZXN0cm95ZWQiLCJtZXNzYWdlIiwiZGVzdHJveSIsImNvbm5lY3RIYW5kbGVycyIsImNvbm5lY3RBcHAiLCJvbkxpc3RlbmluZyIsImYiLCJzdGFydExpc3RlbmluZyIsImxpc3Rlbk9wdGlvbnMiLCJjYiIsImxpc3RlbiIsImV4cG9ydHMiLCJtYWluIiwiYXJndiIsInN0YXJ0SHR0cFNlcnZlciIsImJpbmRFbnZpcm9ubWVudCIsIk1FVEVPUl9QUklOVF9PTl9MSVNURU4iLCJjb25zb2xlIiwibG9nIiwiY2FsbGJhY2tzIiwibG9jYWxQb3J0IiwiUE9SVCIsInVuaXhTb2NrZXRQYXRoIiwiVU5JWF9TT0NLRVRfUEFUSCIsImlzV29ya2VyIiwid29ya2VyTmFtZSIsIndvcmtlciIsImlkIiwidGVzdCIsImhvc3QiLCJCSU5EX0lQIiwic2V0SW5saW5lU2NyaXB0c0FsbG93ZWQiLCJlbmFibGVTdWJyZXNvdXJjZUludGVncml0eSIsInVzZV9jcmVkZW50aWFscyIsInNldEJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rIiwiaG9va0ZuIiwic2V0QnVuZGxlZEpzQ3NzUHJlZml4Iiwic2VsZiIsImFkZFN0YXRpY0pzIiwibnBtQ29ubmVjdCIsImNvbm5lY3RBcmdzIiwiaGFuZGxlcnMiLCJhcHBseSIsIm9yaWdpbmFsVXNlIiwidXNlQXJncyIsIm9yaWdpbmFsTGVuZ3RoIiwiZW50cnkiLCJvcmlnaW5hbEhhbmRsZSIsImhhbmRsZSIsImFzeW5jQXBwbHkiLCJhcmd1bWVudHMiLCJzdGF0U3luYyIsInVubGlua1N5bmMiLCJleGlzdHNTeW5jIiwic29ja2V0UGF0aCIsImlzU29ja2V0IiwiZXZlbnRFbWl0dGVyIiwic2lnbmFsIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFJQSxhQUFKOztBQUFrQkMsU0FBTyxDQUFDQyxJQUFSLENBQWEsc0NBQWIsRUFBb0Q7QUFBQ0MsV0FBTyxDQUFDQyxDQUFELEVBQUc7QUFBQ0osbUJBQWEsR0FBQ0ksQ0FBZDtBQUFnQjs7QUFBNUIsR0FBcEQsRUFBa0YsQ0FBbEY7QUFBbEJILFNBQU8sQ0FBQ0ksTUFBUixDQUFlO0FBQUNDLFVBQU0sRUFBQyxNQUFJQSxNQUFaO0FBQW1CQyxtQkFBZSxFQUFDLE1BQUlBO0FBQXZDLEdBQWY7QUFBd0UsTUFBSUMsTUFBSjtBQUFXUCxTQUFPLENBQUNDLElBQVIsQ0FBYSxRQUFiLEVBQXNCO0FBQUNDLFdBQU8sQ0FBQ0MsQ0FBRCxFQUFHO0FBQUNJLFlBQU0sR0FBQ0osQ0FBUDtBQUFTOztBQUFyQixHQUF0QixFQUE2QyxDQUE3QztBQUFnRCxNQUFJSyxZQUFKO0FBQWlCUixTQUFPLENBQUNDLElBQVIs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XCJhc3NlcnRcIjtcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gXCJmc1wiO1xuaW1wb3J0IHsgY3JlYXRlU2VydmVyIH0gZnJvbSBcImh0dHBcIjtcbmltcG9ydCB7XG4gIGpvaW4gYXMgcGF0aEpvaW4sXG4gIGRpcm5hbWUgYXMgcGF0aERpcm5hbWUsXG59IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBwYXJzZSBhcyBwYXJzZVVybCB9IGZyb20gXCJ1cmxcIjtcbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tIFwiY3J5cHRvXCI7XG5pbXBvcnQgeyBjb25uZWN0IH0gZnJvbSBcIi4vY29ubmVjdC5qc1wiO1xuaW1wb3J0IGNvbXByZXNzIGZyb20gXCJjb21wcmVzc2lvblwiO1xuaW1wb3J0IGNvb2tpZVBhcnNlciBmcm9tIFwiY29va2llLXBhcnNlclwiO1xuaW1wb3J0IHFzIGZyb20gXCJxc1wiO1xuaW1wb3J0IHBhcnNlUmVxdWVzdCBmcm9tIFwicGFyc2V1cmxcIjtcbmltcG9ydCBiYXNpY0F1dGggZnJvbSBcImJhc2ljLWF1dGgtY29ubmVjdFwiO1xuaW1wb3J0IHsgbG9va3VwIGFzIGxvb2t1cFVzZXJBZ2VudCB9IGZyb20gXCJ1c2VyYWdlbnRcIjtcbmltcG9ydCB7IGlzTW9kZXJuIH0gZnJvbSBcIm1ldGVvci9tb2Rlcm4tYnJvd3NlcnNcIjtcbmltcG9ydCBzZW5kIGZyb20gXCJzZW5kXCI7XG5pbXBvcnQge1xuICByZW1vdmVFeGlzdGluZ1NvY2tldEZpbGUsXG4gIHJlZ2lzdGVyU29ja2V0RmlsZUNsZWFudXAsXG59IGZyb20gJy4vc29ja2V0X2ZpbGUuanMnO1xuaW1wb3J0IGNsdXN0ZXIgZnJvbSBcImNsdXN0ZXJcIjtcblxudmFyIFNIT1JUX1NPQ0tFVF9USU1FT1VUID0gNSoxMDAwO1xudmFyIExPTkdfU09DS0VUX1RJTUVPVVQgPSAxMjAqMTAwMDtcblxuZXhwb3J0IGNvbnN0IFdlYkFwcCA9IHt9O1xuZXhwb3J0IGNvbnN0IFdlYkFwcEludGVybmFscyA9IHt9O1xuXG5jb25zdCBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyBiYWNrd2FyZHMgY29tcGF0IHRvIDIuMCBvZiBjb25uZWN0XG5jb25uZWN0LmJhc2ljQXV0aCA9IGJhc2ljQXV0aDtcblxuV2ViQXBwSW50ZXJuYWxzLk5wbU1vZHVsZXMgPSB7XG4gIGNvbm5lY3Q6IHtcbiAgICB2ZXJzaW9uOiBOcG0ucmVxdWlyZSgnY29ubmVjdC9wYWNrYWdlLmpzb24nKS52ZXJzaW9uLFxuICAgIG1vZHVsZTogY29ubmVjdCxcbiAgfVxufTtcblxuLy8gVGhvdWdoIHdlIG1pZ2h0IHByZWZlciB0byB1c2Ugd2ViLmJyb3dzZXIgKG1vZGVybikgYXMgdGhlIGRlZmF1bHRcbi8vIGFyY2hpdGVjdHVyZSwgc2FmZXR5IHJlcXVpcmVzIGEgbW9yZSBjb21wYXRpYmxlIGRlZmF1bHRBcmNoLlxuV2ViQXBwLmRlZmF1bHRBcmNoID0gJ3dlYi5icm93c2VyLmxlZ2FjeSc7XG5cbi8vIFhYWCBtYXBzIGFyY2hzIHRvIG1hbmlmZXN0c1xuV2ViQXBwLmNsaWVudFByb2dyYW1zID0ge307XG5cbi8vIFhYWCBtYXBzIGFyY2hzIHRvIHByb2dyYW0gcGF0aCBvbiBmaWxlc3lzdGVtXG52YXIgYXJjaFBhdGggPSB7fTtcblxudmFyIGJ1bmRsZWRKc0Nzc1VybFJld3JpdGVIb29rID0gZnVuY3Rpb24gKHVybCkge1xuICB2YXIgYnVuZGxlZFByZWZpeCA9XG4gICAgIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVggfHwgJyc7XG4gIHJldHVybiBidW5kbGVkUHJlZml4ICsgdXJsO1xufTtcblxudmFyIHNoYTEgPSBmdW5jdGlvbiAoY29udGVudHMpIHtcbiAgdmFyIGhhc2ggPSBjcmVhdGVIYXNoKCdzaGExJyk7XG4gIGhhc2gudXBkYXRlKGNvbnRlbnRzKTtcbiAgcmV0dXJuIGhhc2guZGlnZXN0KCdoZXgnKTtcbn07XG5cbiBmdW5jdGlvbiBzaG91bGRDb21wcmVzcyhyZXEsIHJlcykge1xuICBpZiAocmVxLmhlYWRlcnNbJ3gtbm8tY29tcHJlc3Npb24nXSkge1xuICAgIC8vIGRvbid0IGNvbXByZXNzIHJlc3BvbnNlcyB3aXRoIHRoaXMgcmVxdWVzdCBoZWFkZXJcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBmYWxsYmFjayB0byBzdGFuZGFyZCBmaWx0ZXIgZnVuY3Rpb25cbiAgcmV0dXJuIGNvbXByZXNzLmZpbHRlcihyZXEsIHJlcyk7XG59O1xuXG4vLyAjQnJvd3NlcklkZW50aWZpY2F0aW9uXG4vL1xuLy8gV2UgaGF2ZSBtdWx0aXBsZSBwbGFjZXMgdGhhdCB3YW50IHRvIGlkZW50aWZ5IHRoZSBicm93c2VyOiB0aGVcbi8vIHVuc3VwcG9ydGVkIGJyb3dzZXIgcGFnZSwgdGhlIGFwcGNhY2hlIHBhY2thZ2UsIGFuZCwgZXZlbnR1YWxseVxuLy8gZGVsaXZlcmluZyBicm93c2VyIHBvbHlmaWxscyBvbmx5IGFzIG5lZWRlZC5cbi8vXG4vLyBUbyBhdm9pZCBkZXRlY3RpbmcgdGhlIGJyb3dzZXIgaW4gbXVsdGlwbGUgcGxhY2VzIGFkLWhvYywgd2UgY3JlYXRlIGFcbi8vIE1ldGVvciBcImJyb3dzZXJcIiBvYmplY3QuIEl0IHVzZXMgYnV0IGRvZXMgbm90IGV4cG9zZSB0aGUgbnBtXG4vLyB1c2VyYWdlbnQgbW9kdWxlICh3ZSBjb3VsZCBjaG9vc2UgYSBkaWZmZXJlbnQgbWVjaGFuaXNtIHRvIGlkZW50aWZ5XG4vLyB0aGUgYnJvd3NlciBpbiB0aGUgZnV0dXJlIGlmIHdlIHdhbnRlZCB0bykuICBUaGUgYnJvd3NlciBvYmplY3Rcbi8vIGNvbnRhaW5zXG4vL1xuLy8gKiBgbmFtZWA6IHRoZSBuYW1lIG9mIHRoZSBicm93c2VyIGluIGNhbWVsIGNhc2Vcbi8vICogYG1ham9yYCwgYG1pbm9yYCwgYHBhdGNoYDogaW50ZWdlcnMgZGVzY3JpYmluZyB0aGUgYnJvd3NlciB2ZXJzaW9uXG4vL1xuLy8gQWxzbyBoZXJlIGlzIGFuIGVhcmx5IHZlcnNpb24gb2YgYSBNZXRlb3IgYHJlcXVlc3RgIG9iamVjdCwgaW50ZW5kZWRcbi8vIHRvIGJlIGEgaGlnaC1sZXZlbCBkZXNjcmlwdGlvbiBvZiB0aGUgcmVxdWVzdCB3aXRob3V0IGV4cG9zaW5nXG4vLyBkZXRhaWxzIG9mIGNvbm5lY3QncyBsb3ctbGV2ZWwgYHJlcWAuICBDdXJyZW50bHkgaXQgY29udGFpbnM6XG4vL1xuLy8gKiBgYnJvd3NlcmA6IGJyb3dzZXIgaWRlbnRpZmljYXRpb24gb2JqZWN0IGRlc2NyaWJlZCBhYm92ZVxuLy8gKiBgdXJsYDogcGFyc2VkIHVybCwgaW5jbHVkaW5nIHBhcnNlZCBxdWVyeSBwYXJhbXNcbi8vXG4vLyBBcyBhIHRlbXBvcmFyeSBoYWNrIHRoZXJlIGlzIGEgYGNhdGVnb3JpemVSZXF1ZXN0YCBmdW5jdGlvbiBvbiBXZWJBcHAgd2hpY2hcbi8vIGNvbnZlcnRzIGEgY29ubmVjdCBgcmVxYCB0byBhIE1ldGVvciBgcmVxdWVzdGAuIFRoaXMgY2FuIGdvIGF3YXkgb25jZSBzbWFydFxuLy8gcGFja2FnZXMgc3VjaCBhcyBhcHBjYWNoZSBhcmUgYmVpbmcgcGFzc2VkIGEgYHJlcXVlc3RgIG9iamVjdCBkaXJlY3RseSB3aGVuXG4vLyB0aGV5IHNlcnZlIGNvbnRlbnQuXG4vL1xuLy8gVGhpcyBhbGxvd3MgYHJlcXVlc3RgIHRvIGJlIHVzZWQgdW5pZm9ybWx5OiBpdCBpcyBwYXNzZWQgdG8gdGhlIGh0bWxcbi8vIGF0dHJpYnV0ZXMgaG9vaywgYW5kIHRoZSBhcHBjYWNoZSBwYWNrYWdlIGNhbiB1c2UgaXQgd2hlbiBkZWNpZGluZ1xuLy8gd2hldGhlciB0byBnZW5lcmF0ZSBhIDQwNCBmb3IgdGhlIG1hbmlmZXN0LlxuLy9cbi8vIFJlYWwgcm91dGluZyAvIHNlcnZlciBzaWRlIHJlbmRlcmluZyB3aWxsIHByb2JhYmx5IHJlZmFjdG9yIHRoaXNcbi8vIGhlYXZpbHkuXG5cblxuLy8gZS5nLiBcIk1vYmlsZSBTYWZhcmlcIiA9PiBcIm1vYmlsZVNhZmFyaVwiXG52YXIgY2FtZWxDYXNlID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgdmFyIHBhcnRzID0gbmFtZS5zcGxpdCgnICcpO1xuICBwYXJ0c1swXSA9IHBhcnRzWzBdLnRvTG93ZXJDYXNlKCk7XG4gIGZvciAodmFyIGkgPSAxOyAgaSA8IHBhcnRzLmxlbmd0aDsgICsraSkge1xuICAgIHBhcnRzW2ldID0gcGFydHNbaV0uY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyBwYXJ0c1tpXS5zdWJzdHIoMSk7XG4gIH1cbiAgcmV0dXJuIHBhcnRzLmpvaW4oJycpO1xufTtcblxudmFyIGlkZW50aWZ5QnJvd3NlciA9IGZ1bmN0aW9uICh1c2VyQWdlbnRTdHJpbmcpIHtcbiAgdmFyIHVzZXJBZ2VudCA9IGxvb2t1cFVzZXJBZ2VudCh1c2VyQWdlbnRTdHJpbmcpO1xuICByZXR1cm4ge1xuICAgIG5hbWU6IGNhbWVsQ2FzZSh1c2VyQWdlbnQuZmFtaWx5KSxcbiAgICBtYWpvcjogK3VzZXJBZ2VudC5tYWpvcixcbiAgICBtaW5vcjogK3VzZXJBZ2VudC5taW5vcixcbiAgICBwYXRjaDogK3VzZXJBZ2VudC5wYXRjaFxuICB9O1xufTtcblxuLy8gWFhYIFJlZmFjdG9yIGFzIHBhcnQgb2YgaW1wbGVtZW50aW5nIHJlYWwgcm91dGluZy5cbldlYkFwcEludGVybmFscy5pZGVudGlmeUJyb3dzZXIgPSBpZGVudGlmeUJyb3dzZXI7XG5cbldlYkFwcC5jYXRlZ29yaXplUmVxdWVzdCA9IGZ1bmN0aW9uIChyZXEpIHtcbiAgaWYgKHJlcS5icm93c2VyICYmIHJlcS5hcmNoICYmIHR5cGVvZiByZXEubW9kZXJuID09PSBcImJvb2xlYW5cIikge1xuICAgIC8vIEFscmVhZHkgY2F0ZWdvcml6ZWQuXG4gICAgcmV0dXJuIHJlcTtcbiAgfVxuXG4gIGNvbnN0IGJyb3dzZXIgPSBpZGVudGlmeUJyb3dzZXIocmVxLmhlYWRlcnNbXCJ1c2VyLWFnZW50XCJdKTtcbiAgY29uc3QgbW9kZXJuID0gaXNNb2Rlcm4oYnJvd3Nlcik7XG4gIGNvbnN0IHBhdGggPSB0eXBlb2YgcmVxLnBhdGhuYW1lID09PSBcInN0cmluZ1wiXG4gICA/IHJlcS5wYXRobmFtZVxuICAgOiBwYXJzZVJlcXVlc3QocmVxKS5wYXRobmFtZTtcblxuICBjb25zdCBjYXRlZ29yaXplZCA9IHtcbiAgICBicm93c2VyLFxuICAgIG1vZGVybixcbiAgICBwYXRoLFxuICAgIGFyY2g6IFdlYkFwcC5kZWZhdWx0QXJjaCxcbiAgICB1cmw6IHBhcnNlVXJsKHJlcS51cmwsIHRydWUpLFxuICAgIGR5bmFtaWNIZWFkOiByZXEuZHluYW1pY0hlYWQsXG4gICAgZHluYW1pY0JvZHk6IHJlcS5keW5hbWljQm9keSxcbiAgICBoZWFkZXJzOiByZXEuaGVhZGVycyxcbiAgICBjb29raWVzOiByZXEuY29va2llcyxcbiAgfTtcblxuICBjb25zdCBwYXRoUGFydHMgPSBwYXRoLnNwbGl0KFwiL1wiKTtcbiAgY29uc3QgYXJjaEtleSA9IHBhdGhQYXJ0c1sxXTtcblxuICBpZiAoYXJjaEtleS5zdGFydHNXaXRoKFwiX19cIikpIHtcbiAgICBjb25zdCBhcmNoQ2xlYW5lZCA9IFwid2ViLlwiICsgYXJjaEtleS5zbGljZSgyKTtcbiAgICBpZiAoaGFzT3duLmNhbGwoV2ViQXBwLmNsaWVudFByb2dyYW1zLCBhcmNoQ2xlYW5lZCkpIHtcbiAgICAgIHBhdGhQYXJ0cy5zcGxpY2UoMSwgMSk7IC8vIFJlbW92ZSB0aGUgYXJjaEtleSBwYXJ0LlxuICAgICAgcmV0dXJuIE9iamVjdC5hc3NpZ24oY2F0ZWdvcml6ZWQsIHtcbiAgICAgICAgYXJjaDogYXJjaENsZWFuZWQsXG4gICAgICAgIHBhdGg6IHBhdGhQYXJ0cy5qb2luKFwiL1wiKSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIFRPRE8gUGVyaGFwcyBvbmUgZGF5IHdlIGNvdWxkIGluZmVyIENvcmRvdmEgY2xpZW50cyBoZXJlLCBzbyB0aGF0IHdlXG4gIC8vIHdvdWxkbid0IGhhdmUgdG8gdXNlIHByZWZpeGVkIFwiL19fY29yZG92YS8uLi5cIiBVUkxzLlxuICBjb25zdCBwcmVmZXJyZWRBcmNoT3JkZXIgPSBpc01vZGVybihicm93c2VyKVxuICAgID8gW1wid2ViLmJyb3dzZXJcIiwgXCJ3ZWIuYnJvd3Nlci5sZWdhY3lcIl1cbiAgICA6IFtcIndlYi5icm93c2VyLmxlZ2FjeVwiLCBcIndlYi5icm93c2VyXCJdO1xuXG4gIGZvciAoY29uc3QgYXJjaCBvZiBwcmVmZXJyZWRBcmNoT3JkZXIpIHtcbiAgICAvLyBJZiBvdXIgcHJlZmVycmVkIGFyY2ggaXMgbm90IGF2YWlsYWJsZSwgaXQncyBiZXR0ZXIgdG8gdXNlIGFub3RoZXJcbiAgICAvLyBjbGllbnQgYXJjaCB0aGF0IGlzIGF2YWlsYWJsZSB0aGFuIHRvIGd1YXJhbnRlZSB0aGUgc2l0ZSB3b24ndCB3b3JrXG4gICAgLy8gYnkgcmV0dXJuaW5nIGFuIHVua25vd24gYXJjaC4gRm9yIGV4YW1wbGUsIGlmIHdlYi5icm93c2VyLmxlZ2FjeSBpc1xuICAgIC8vIGV4Y2x1ZGVkIHVzaW5nIHRoZSAtLWV4Y2x1ZGUtYXJjaHMgY29tbWFuZC1saW5lIG9wdGlvbiwgbGVnYWN5XG4gICAgLy8gY2xpZW50cyBhcmUgYmV0dGVyIG9mZiByZWNlaXZpbmcgd2ViLmJyb3dzZXIgKHdoaWNoIG1pZ2h0IGFjdHVhbGx5XG4gICAgLy8gd29yaykgdGhhbiByZWNlaXZpbmcgYW4gSFRUUCA0MDQgcmVzcG9uc2UuIElmIG5vbmUgb2YgdGhlIGFyY2hzIGluXG4gICAgLy8gcHJlZmVycmVkQXJjaE9yZGVyIGFyZSBkZWZpbmVkLCBvbmx5IHRoZW4gc2hvdWxkIHdlIHNlbmQgYSA0MDQuXG4gICAgaWYgKGhhc093bi5jYWxsKFdlYkFwcC5jbGllbnRQcm9ncmFtcywgYXJjaCkpIHtcbiAgICAgIHJldHVybiBPYmplY3QuYXNzaWduKGNhdGVnb3JpemVkLCB7IGFyY2ggfSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNhdGVnb3JpemVkO1xufTtcblxuLy8gSFRNTCBhdHRyaWJ1dGUgaG9va3M6IGZ1bmN0aW9ucyB0byBiZSBjYWxsZWQgdG8gZGV0ZXJtaW5lIGFueSBhdHRyaWJ1dGVzIHRvXG4vLyBiZSBhZGRlZCB0byB0aGUgJzxodG1sPicgdGFnLiBFYWNoIGZ1bmN0aW9uIGlzIHBhc3NlZCBhICdyZXF1ZXN0JyBvYmplY3QgKHNlZVxuLy8gI0Jyb3dzZXJJZGVudGlmaWNhdGlvbikgYW5kIHNob3VsZCByZXR1cm4gbnVsbCBvciBvYmplY3QuXG52YXIgaHRtbEF0dHJpYnV0ZUhvb2tzID0gW107XG52YXIgZ2V0SHRtbEF0dHJpYnV0ZXMgPSBmdW5jdGlvbiAocmVxdWVzdCkge1xuICB2YXIgY29tYmluZWRBdHRyaWJ1dGVzICA9IHt9O1xuICBfLmVhY2goaHRtbEF0dHJpYnV0ZUhvb2tzIHx8IFtdLCBmdW5jdGlvbiAoaG9vaykge1xuICAgIHZhciBhdHRyaWJ1dGVzID0gaG9vayhyZXF1ZXN0KTtcbiAgICBpZiAoYXR0cmlidXRlcyA9PT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICBpZiAodHlwZW9mIGF0dHJpYnV0ZXMgIT09ICdvYmplY3QnKVxuICAgICAgdGhyb3cgRXJyb3IoXCJIVE1MIGF0dHJpYnV0ZSBob29rIG11c3QgcmV0dXJuIG51bGwgb3Igb2JqZWN0XCIpO1xuICAgIF8uZXh0ZW5kKGNvbWJpbmVkQXR0cmlidXRlcywgYXR0cmlidXRlcyk7XG4gIH0pO1xuICByZXR1cm4gY29tYmluZWRBdHRyaWJ1dGVzO1xufTtcbldlYkFwcC5hZGRIdG1sQXR0cmlidXRlSG9vayA9IGZ1bmN0aW9uIChob29rKSB7XG4gIGh0bWxBdHRyaWJ1dGVIb29rcy5wdXNoKGhvb2spO1xufTtcblxuLy8gU2VydmUgYXBwIEhUTUwgZm9yIHRoaXMgVVJMP1xudmFyIGFwcFVybCA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgaWYgKHVybCA9PT0gJy9mYXZpY29uLmljbycgfHwgdXJsID09PSAnL3JvYm90cy50eHQnKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyBOT1RFOiBhcHAubWFuaWZlc3QgaXMgbm90IGEgd2ViIHN0YW5kYXJkIGxpa2UgZmF2aWNvbi5pY28gYW5kXG4gIC8vIHJvYm90cy50eHQuIEl0IGlzIGEgZmlsZSBuYW1lIHdlIGhhdmUgY2hvc2VuIHRvIHVzZSBmb3IgSFRNTDVcbiAgLy8gYXBwY2FjaGUgVVJMcy4gSXQgaXMgaW5jbHVkZWQgaGVyZSB0byBwcmV2ZW50IHVzaW5nIGFuIGFwcGNhY2hlXG4gIC8vIHRoZW4gcmVtb3ZpbmcgaXQgZnJvbSBwb2lzb25pbmcgYW4gYXBwIHBlcm1hbmVudGx5LiBFdmVudHVhbGx5LFxuICAvLyBvbmNlIHdlIGhhdmUgc2VydmVyIHNpZGUgcm91dGluZywgdGhpcyB3b24ndCBiZSBuZWVkZWQgYXNcbiAgLy8gdW5rbm93biBVUkxzIHdpdGggcmV0dXJuIGEgNDA0IGF1dG9tYXRpY2FsbHkuXG4gIGlmICh1cmwgPT09ICcvYXBwLm1hbmlmZXN0JylcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgLy8gQXZvaWQgc2VydmluZyBhcHAgSFRNTCBmb3IgZGVjbGFyZWQgcm91dGVzIHN1Y2ggYXMgL3NvY2tqcy8uXG4gIGlmIChSb3V0ZVBvbGljeS5jbGFzc2lmeSh1cmwpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICAvLyB3ZSBjdXJyZW50bHkgcmV0dXJuIGFwcCBIVE1MIG9uIGFsbCBVUkxzIGJ5IGRlZmF1bHRcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8vIFdlIG5lZWQgdG8gY2FsY3VsYXRlIHRoZSBjbGllbnQgaGFzaCBhZnRlciBhbGwgcGFja2FnZXMgaGF2ZSBsb2FkZWRcbi8vIHRvIGdpdmUgdGhlbSBhIGNoYW5jZSB0byBwb3B1bGF0ZSBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlxuLy9cbi8vIENhbGN1bGF0aW5nIHRoZSBoYXNoIGR1cmluZyBzdGFydHVwIG1lYW5zIHRoYXQgcGFja2FnZXMgY2FuIG9ubHlcbi8vIHBvcHVsYXRlIF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18gZHVyaW5nIGxvYWQsIG5vdCBkdXJpbmcgc3RhcnR1cC5cbi8vXG4vLyBDYWxjdWxhdGluZyBpbnN0ZWFkIGl0IGF0IHRoZSBiZWdpbm5pbmcgb2YgbWFpbiBhZnRlciBhbGwgc3RhcnR1cFxuLy8gaG9va3MgaGFkIHJ1biB3b3VsZCBhbGxvdyBwYWNrYWdlcyB0byBhbHNvIHBvcHVsYXRlXG4vLyBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fIGR1cmluZyBzdGFydHVwLCBidXQgdGhhdCdzIHRvbyBsYXRlIGZvclxuLy8gYXV0b3VwZGF0ZSBiZWNhdXNlIGl0IG5lZWRzIHRvIGhhdmUgdGhlIGNsaWVudCBoYXNoIGF0IHN0YXJ0dXAgdG9cbi8vIGluc2VydCB0aGUgYXV0byB1cGRhdGUgdmVyc2lvbiBpdHNlbGYgaW50b1xuLy8gX19tZXRlb3JfcnVudGltZV9jb25maWdfXyB0byBnZXQgaXQgdG8gdGhlIGNsaWVudC5cbi8vXG4vLyBBbiBhbHRlcm5hdGl2ZSB3b3VsZCBiZSB0byBnaXZlIGF1dG91cGRhdGUgYSBcInBvc3Qtc3RhcnQsXG4vLyBwcmUtbGlzdGVuXCIgaG9vayB0byBhbGxvdyBpdCB0byBpbnNlcnQgdGhlIGF1dG8gdXBkYXRlIHZlcnNpb24gYXRcbi8vIHRoZSByaWdodCBtb21lbnQuXG5cbk1ldGVvci5zdGFydHVwKGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gZ2V0dGVyKGtleSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoYXJjaCkge1xuICAgICAgYXJjaCA9IGFyY2ggfHwgV2ViQXBwLmRlZmF1bHRBcmNoO1xuICAgICAgY29uc3QgcHJvZ3JhbSA9IFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoXTtcbiAgICAgIGNvbnN0IHZhbHVlID0gcHJvZ3JhbSAmJiBwcm9ncmFtW2tleV07XG4gICAgICAvLyBJZiB0aGlzIGlzIHRoZSBmaXJzdCB0aW1lIHdlIGhhdmUgY2FsY3VsYXRlZCB0aGlzIGhhc2gsXG4gICAgICAvLyBwcm9ncmFtW2tleV0gd2lsbCBiZSBhIHRodW5rIChsYXp5IGZ1bmN0aW9uIHdpdGggbm8gcGFyYW1ldGVycylcbiAgICAgIC8vIHRoYXQgd2Ugc2hvdWxkIGNhbGwgdG8gZG8gdGhlIGFjdHVhbCBjb21wdXRhdGlvbi5cbiAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwiZnVuY3Rpb25cIlxuICAgICAgICA/IHByb2dyYW1ba2V5XSA9IHZhbHVlKClcbiAgICAgICAgOiB2YWx1ZTtcbiAgICB9O1xuICB9XG5cbiAgV2ViQXBwLmNhbGN1bGF0ZUNsaWVudEhhc2ggPSBXZWJBcHAuY2xpZW50SGFzaCA9IGdldHRlcihcInZlcnNpb25cIik7XG4gIFdlYkFwcC5jYWxjdWxhdGVDbGllbnRIYXNoUmVmcmVzaGFibGUgPSBnZXR0ZXIoXCJ2ZXJzaW9uUmVmcmVzaGFibGVcIik7XG4gIFdlYkFwcC5jYWxjdWxhdGVDbGllbnRIYXNoTm9uUmVmcmVzaGFibGUgPSBnZXR0ZXIoXCJ2ZXJzaW9uTm9uUmVmcmVzaGFibGVcIik7XG4gIFdlYkFwcC5jYWxjdWxhdGVDbGllbnRIYXNoUmVwbGFjZWFibGUgPSBnZXR0ZXIoXCJ2ZXJzaW9uUmVwbGFjZWFibGVcIik7XG4gIFdlYkFwcC5nZXRSZWZyZXNoYWJsZUFzc2V0cyA9IGdldHRlcihcInJlZnJlc2hhYmxlQXNzZXRzXCIpO1xufSk7XG5cblxuXG4vLyBXaGVuIHdlIGhhdmUgYSByZXF1ZXN0IHBlbmRpbmcsIHdlIHdhbnQgdGhlIHNvY2tldCB0aW1lb3V0IHRvIGJlIGxvbmcsIHRvXG4vLyBnaXZlIG91cnNlbHZlcyBhIHdoaWxlIHRvIHNlcnZlIGl0LCBhbmQgdG8gYWxsb3cgc29ja2pzIGxvbmcgcG9sbHMgdG9cbi8vIGNvbXBsZXRlLiAgT24gdGhlIG90aGVyIGhhbmQsIHdlIHdhbnQgdG8gY2xvc2UgaWRsZSBzb2NrZXRzIHJlbGF0aXZlbHlcbi8vIHF1aWNrbHksIHNvIHRoYXQgd2UgY2FuIHNodXQgZG93biByZWxhdGl2ZWx5IHByb21wdGx5IGJ1dCBjbGVhbmx5LCB3aXRob3V0XG4vLyBjdXR0aW5nIG9mZiBhbnlvbmUncyByZXNwb25zZS5cbldlYkFwcC5fdGltZW91dEFkanVzdG1lbnRSZXF1ZXN0Q2FsbGJhY2sgPSBmdW5jdGlvbiAocmVxLCByZXMpIHtcbiAgLy8gdGhpcyBpcyByZWFsbHkganVzdCByZXEuc29ja2V0LnNldFRpbWVvdXQoTE9OR19TT0NLRVRfVElNRU9VVCk7XG4gIHJlcS5zZXRUaW1lb3V0KExPTkdfU09DS0VUX1RJTUVPVVQpO1xuICAvLyBJbnNlcnQgb3VyIG5ldyBmaW5pc2ggbGlzdGVuZXIgdG8gcnVuIEJFRk9SRSB0aGUgZXhpc3Rpbmcgb25lIHdoaWNoIHJlbW92ZXNcbiAgLy8gdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNvY2tldC5cbiAgdmFyIGZpbmlzaExpc3RlbmVycyA9IHJlcy5saXN0ZW5lcnMoJ2ZpbmlzaCcpO1xuICAvLyBYWFggQXBwYXJlbnRseSBpbiBOb2RlIDAuMTIgdGhpcyBldmVudCB3YXMgY2FsbGVkICdwcmVmaW5pc2gnLlxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vam95ZW50L25vZGUvY29tbWl0LzdjOWI2MDcwXG4gIC8vIEJ1dCBpdCBoYXMgc3dpdGNoZWQgYmFjayB0byAnZmluaXNoJyBpbiBOb2RlIHY0OlxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvcHVsbC8xNDExXG4gIHJlcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ2ZpbmlzaCcpO1xuICByZXMub24oJ2ZpbmlzaCcsIGZ1bmN0aW9uICgpIHtcbiAgICByZXMuc2V0VGltZW91dChTSE9SVF9TT0NLRVRfVElNRU9VVCk7XG4gIH0pO1xuICBfLmVhY2goZmluaXNoTGlzdGVuZXJzLCBmdW5jdGlvbiAobCkgeyByZXMub24oJ2ZpbmlzaCcsIGwpOyB9KTtcbn07XG5cblxuLy8gV2lsbCBiZSB1cGRhdGVkIGJ5IG1haW4gYmVmb3JlIHdlIGxpc3Rlbi5cbi8vIE1hcCBmcm9tIGNsaWVudCBhcmNoIHRvIGJvaWxlcnBsYXRlIG9iamVjdC5cbi8vIEJvaWxlcnBsYXRlIG9iamVjdCBoYXM6XG4vLyAgIC0gZnVuYzogWFhYXG4vLyAgIC0gYmFzZURhdGE6IFhYWFxudmFyIGJvaWxlcnBsYXRlQnlBcmNoID0ge307XG5cbi8vIFJlZ2lzdGVyIGEgY2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBjYW4gc2VsZWN0aXZlbHkgbW9kaWZ5IGJvaWxlcnBsYXRlXG4vLyBkYXRhIGdpdmVuIGFyZ3VtZW50cyAocmVxdWVzdCwgZGF0YSwgYXJjaCkuIFRoZSBrZXkgc2hvdWxkIGJlIGEgdW5pcXVlXG4vLyBpZGVudGlmaWVyLCB0byBwcmV2ZW50IGFjY3VtdWxhdGluZyBkdXBsaWNhdGUgY2FsbGJhY2tzIGZyb20gdGhlIHNhbWVcbi8vIGNhbGwgc2l0ZSBvdmVyIHRpbWUuIENhbGxiYWNrcyB3aWxsIGJlIGNhbGxlZCBpbiB0aGUgb3JkZXIgdGhleSB3ZXJlXG4vLyByZWdpc3RlcmVkLiBBIGNhbGxiYWNrIHNob3VsZCByZXR1cm4gZmFsc2UgaWYgaXQgZGlkIG5vdCBtYWtlIGFueVxuLy8gY2hhbmdlcyBhZmZlY3RpbmcgdGhlIGJvaWxlcnBsYXRlLiBQYXNzaW5nIG51bGwgZGVsZXRlcyB0aGUgY2FsbGJhY2suXG4vLyBBbnkgcHJldmlvdXMgY2FsbGJhY2sgcmVnaXN0ZXJlZCBmb3IgdGhpcyBrZXkgd2lsbCBiZSByZXR1cm5lZC5cbmNvbnN0IGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5XZWJBcHBJbnRlcm5hbHMucmVnaXN0ZXJCb2lsZXJwbGF0ZURhdGFDYWxsYmFjayA9IGZ1bmN0aW9uIChrZXksIGNhbGxiYWNrKSB7XG4gIGNvbnN0IHByZXZpb3VzQ2FsbGJhY2sgPSBib2lsZXJwbGF0ZURhdGFDYWxsYmFja3Nba2V5XTtcblxuICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBib2lsZXJwbGF0ZURhdGFDYWxsYmFja3Nba2V5XSA9IGNhbGxiYWNrO1xuICB9IGVsc2Uge1xuICAgIGFzc2VydC5zdHJpY3RFcXVhbChjYWxsYmFjaywgbnVsbCk7XG4gICAgZGVsZXRlIGJvaWxlcnBsYXRlRGF0YUNhbGxiYWNrc1trZXldO1xuICB9XG5cbiAgLy8gUmV0dXJuIHRoZSBwcmV2aW91cyBjYWxsYmFjayBpbiBjYXNlIHRoZSBuZXcgY2FsbGJhY2sgbmVlZHMgdG8gY2FsbFxuICAvLyBpdDsgZm9yIGV4YW1wbGUsIHdoZW4gdGhlIG5ldyBjYWxsYmFjayBpcyBhIHdyYXBwZXIgZm9yIHRoZSBvbGQuXG4gIHJldHVybiBwcmV2aW91c0NhbGxiYWNrIHx8IG51bGw7XG59O1xuXG4vLyBHaXZlbiBhIHJlcXVlc3QgKGFzIHJldHVybmVkIGZyb20gYGNhdGVnb3JpemVSZXF1ZXN0YCksIHJldHVybiB0aGVcbi8vIGJvaWxlcnBsYXRlIEhUTUwgdG8gc2VydmUgZm9yIHRoYXQgcmVxdWVzdC5cbi8vXG4vLyBJZiBhIHByZXZpb3VzIGNvbm5lY3QgbWlkZGxld2FyZSBoYXMgcmVuZGVyZWQgY29udGVudCBmb3IgdGhlIGhlYWQgb3IgYm9keSxcbi8vIHJldHVybnMgdGhlIGJvaWxlcnBsYXRlIHdpdGggdGhhdCBjb250ZW50IHBhdGNoZWQgaW4gb3RoZXJ3aXNlXG4vLyBtZW1vaXplcyBvbiBIVE1MIGF0dHJpYnV0ZXMgKHVzZWQgYnksIGVnLCBhcHBjYWNoZSkgYW5kIHdoZXRoZXIgaW5saW5lXG4vLyBzY3JpcHRzIGFyZSBjdXJyZW50bHkgYWxsb3dlZC5cbi8vIFhYWCBzbyBmYXIgdGhpcyBmdW5jdGlvbiBpcyBhbHdheXMgY2FsbGVkIHdpdGggYXJjaCA9PT0gJ3dlYi5icm93c2VyJ1xuZnVuY3Rpb24gZ2V0Qm9pbGVycGxhdGUocmVxdWVzdCwgYXJjaCkge1xuICByZXR1cm4gZ2V0Qm9pbGVycGxhdGVBc3luYyhyZXF1ZXN0LCBhcmNoKS5hd2FpdCgpO1xufVxuXG5mdW5jdGlvbiBnZXRCb2lsZXJwbGF0ZUFzeW5jKHJlcXVlc3QsIGFyY2gpIHtcbiAgY29uc3QgYm9pbGVycGxhdGUgPSBib2lsZXJwbGF0ZUJ5QXJjaFthcmNoXTtcbiAgY29uc3QgZGF0YSA9IE9iamVjdC5hc3NpZ24oe30sIGJvaWxlcnBsYXRlLmJhc2VEYXRhLCB7XG4gICAgaHRtbEF0dHJpYnV0ZXM6IGdldEh0bWxBdHRyaWJ1dGVzKHJlcXVlc3QpLFxuICB9LCBfLnBpY2socmVxdWVzdCwgXCJkeW5hbWljSGVhZFwiLCBcImR5bmFtaWNCb2R5XCIpKTtcblxuICBsZXQgbWFkZUNoYW5nZXMgPSBmYWxzZTtcbiAgbGV0IHByb21pc2UgPSBQcm9taXNlLnJlc29sdmUoKTtcblxuICBPYmplY3Qua2V5cyhib2lsZXJwbGF0ZURhdGFDYWxsYmFja3MpLmZvckVhY2goa2V5ID0+IHtcbiAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKCgpID0+IHtcbiAgICAgIGNvbnN0IGNhbGxiYWNrID0gYm9pbGVycGxhdGVEYXRhQ2FsbGJhY2tzW2tleV07XG4gICAgICByZXR1cm4gY2FsbGJhY2socmVxdWVzdCwgZGF0YSwgYXJjaCk7XG4gICAgfSkudGhlbihyZXN1bHQgPT4ge1xuICAgICAgLy8gQ2FsbGJhY2tzIHNob3VsZCByZXR1cm4gZmFsc2UgaWYgdGhleSBkaWQgbm90IG1ha2UgYW55IGNoYW5nZXMuXG4gICAgICBpZiAocmVzdWx0ICE9PSBmYWxzZSkge1xuICAgICAgICBtYWRlQ2hhbmdlcyA9IHRydWU7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuXG4gIHJldHVybiBwcm9taXNlLnRoZW4oKCkgPT4gKHtcbiAgICBzdHJlYW06IGJvaWxlcnBsYXRlLnRvSFRNTFN0cmVhbShkYXRhKSxcbiAgICBzdGF0dXNDb2RlOiBkYXRhLnN0YXR1c0NvZGUsXG4gICAgaGVhZGVyczogZGF0YS5oZWFkZXJzLFxuICB9KSk7XG59XG5cbldlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlSW5zdGFuY2UgPSBmdW5jdGlvbiAoYXJjaCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWFuaWZlc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZGl0aW9uYWxPcHRpb25zKSB7XG4gIGFkZGl0aW9uYWxPcHRpb25zID0gYWRkaXRpb25hbE9wdGlvbnMgfHwge307XG5cbiAgY29uc3QgbWV0ZW9yUnVudGltZUNvbmZpZyA9IEpTT04uc3RyaW5naWZ5KFxuICAgIGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAuLi5fX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLFxuICAgICAgLi4uKGFkZGl0aW9uYWxPcHRpb25zLnJ1bnRpbWVDb25maWdPdmVycmlkZXMgfHwge30pXG4gICAgfSkpXG4gICk7XG5cbiAgcmV0dXJuIG5ldyBCb2lsZXJwbGF0ZShhcmNoLCBtYW5pZmVzdCwgXy5leHRlbmQoe1xuICAgIHBhdGhNYXBwZXIoaXRlbVBhdGgpIHtcbiAgICAgIHJldHVybiBwYXRoSm9pbihhcmNoUGF0aFthcmNoXSwgaXRlbVBhdGgpO1xuICAgIH0sXG4gICAgYmFzZURhdGFFeHRlbnNpb246IHtcbiAgICAgIGFkZGl0aW9uYWxTdGF0aWNKczogXy5tYXAoXG4gICAgICAgIGFkZGl0aW9uYWxTdGF0aWNKcyB8fCBbXSxcbiAgICAgICAgZnVuY3Rpb24gKGNvbnRlbnRzLCBwYXRobmFtZSkge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBwYXRobmFtZTogcGF0aG5hbWUsXG4gICAgICAgICAgICBjb250ZW50czogY29udGVudHNcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICApLFxuICAgICAgLy8gQ29udmVydCB0byBhIEpTT04gc3RyaW5nLCB0aGVuIGdldCByaWQgb2YgbW9zdCB3ZWlyZCBjaGFyYWN0ZXJzLCB0aGVuXG4gICAgICAvLyB3cmFwIGluIGRvdWJsZSBxdW90ZXMuIChUaGUgb3V0ZXJtb3N0IEpTT04uc3RyaW5naWZ5IHJlYWxseSBvdWdodCB0b1xuICAgICAgLy8ganVzdCBiZSBcIndyYXAgaW4gZG91YmxlIHF1b3Rlc1wiIGJ1dCB3ZSB1c2UgaXQgdG8gYmUgc2FmZS4pIFRoaXMgbWlnaHRcbiAgICAgIC8vIGVuZCB1cCBpbnNpZGUgYSA8c2NyaXB0PiB0YWcgc28gd2UgbmVlZCB0byBiZSBjYXJlZnVsIHRvIG5vdCBpbmNsdWRlXG4gICAgICAvLyBcIjwvc2NyaXB0PlwiLCBidXQgbm9ybWFsIHt7c3BhY2ViYXJzfX0gZXNjYXBpbmcgZXNjYXBlcyB0b28gbXVjaCEgU2VlXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9pc3N1ZXMvMzczMFxuICAgICAgbWV0ZW9yUnVudGltZUNvbmZpZyxcbiAgICAgIG1ldGVvclJ1bnRpbWVIYXNoOiBzaGExKG1ldGVvclJ1bnRpbWVDb25maWcpLFxuICAgICAgcm9vdFVybFBhdGhQcmVmaXg6IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVggfHwgJycsXG4gICAgICBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vazogYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2ssXG4gICAgICBzcmlNb2RlOiBzcmlNb2RlLFxuICAgICAgaW5saW5lU2NyaXB0c0FsbG93ZWQ6IFdlYkFwcEludGVybmFscy5pbmxpbmVTY3JpcHRzQWxsb3dlZCgpLFxuICAgICAgaW5saW5lOiBhZGRpdGlvbmFsT3B0aW9ucy5pbmxpbmVcbiAgICB9XG4gIH0sIGFkZGl0aW9uYWxPcHRpb25zKSk7XG59O1xuXG4vLyBBIG1hcHBpbmcgZnJvbSB1cmwgcGF0aCB0byBhcmNoaXRlY3R1cmUgKGUuZy4gXCJ3ZWIuYnJvd3NlclwiKSB0byBzdGF0aWNcbi8vIGZpbGUgaW5mb3JtYXRpb24gd2l0aCB0aGUgZm9sbG93aW5nIGZpZWxkczpcbi8vIC0gdHlwZTogdGhlIHR5cGUgb2YgZmlsZSB0byBiZSBzZXJ2ZWRcbi8vIC0gY2FjaGVhYmxlOiBvcHRpb25hbGx5LCB3aGV0aGVyIHRoZSBmaWxlIHNob3VsZCBiZSBjYWNoZWQgb3Igbm90XG4vLyAtIHNvdXJjZU1hcFVybDogb3B0aW9uYWxseSwgdGhlIHVybCBvZiB0aGUgc291cmNlIG1hcFxuLy9cbi8vIEluZm8gYWxzbyBjb250YWlucyBvbmUgb2YgdGhlIGZvbGxvd2luZzpcbi8vIC0gY29udGVudDogdGhlIHN0cmluZ2lmaWVkIGNvbnRlbnQgdGhhdCBzaG91bGQgYmUgc2VydmVkIGF0IHRoaXMgcGF0aFxuLy8gLSBhYnNvbHV0ZVBhdGg6IHRoZSBhYnNvbHV0ZSBwYXRoIG9uIGRpc2sgdG8gdGhlIGZpbGVcblxuLy8gU2VydmUgc3RhdGljIGZpbGVzIGZyb20gdGhlIG1hbmlmZXN0IG9yIGFkZGVkIHdpdGhcbi8vIGBhZGRTdGF0aWNKc2AuIEV4cG9ydGVkIGZvciB0ZXN0cy5cbldlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc01pZGRsZXdhcmUgPSBhc3luYyBmdW5jdGlvbiAoXG4gIHN0YXRpY0ZpbGVzQnlBcmNoLFxuICByZXEsXG4gIHJlcyxcbiAgbmV4dCxcbikge1xuICBpZiAoJ0dFVCcgIT0gcmVxLm1ldGhvZCAmJiAnSEVBRCcgIT0gcmVxLm1ldGhvZCAmJiAnT1BUSU9OUycgIT0gcmVxLm1ldGhvZCkge1xuICAgIG5leHQoKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyIHBhdGhuYW1lID0gcGFyc2VSZXF1ZXN0KHJlcSkucGF0aG5hbWU7XG4gIHRyeSB7XG4gICAgcGF0aG5hbWUgPSBkZWNvZGVVUklDb21wb25lbnQocGF0aG5hbWUpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgbmV4dCgpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHZhciBzZXJ2ZVN0YXRpY0pzID0gZnVuY3Rpb24gKHMpIHtcbiAgICByZXMud3JpdGVIZWFkKDIwMCwge1xuICAgICAgJ0NvbnRlbnQtdHlwZSc6ICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0OyBjaGFyc2V0PVVURi04J1xuICAgIH0pO1xuICAgIHJlcy53cml0ZShzKTtcbiAgICByZXMuZW5kKCk7XG4gIH07XG5cbiAgaWYgKF8uaGFzKGFkZGl0aW9uYWxTdGF0aWNKcywgcGF0aG5hbWUpICYmXG4gICAgICAgICAgICAgICEgV2ViQXBwSW50ZXJuYWxzLmlubGluZVNjcmlwdHNBbGxvd2VkKCkpIHtcbiAgICBzZXJ2ZVN0YXRpY0pzKGFkZGl0aW9uYWxTdGF0aWNKc1twYXRobmFtZV0pO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHsgYXJjaCwgcGF0aCB9ID0gV2ViQXBwLmNhdGVnb3JpemVSZXF1ZXN0KHJlcSk7XG5cbiAgaWYgKCEgaGFzT3duLmNhbGwoV2ViQXBwLmNsaWVudFByb2dyYW1zLCBhcmNoKSkge1xuICAgIC8vIFdlIGNvdWxkIGNvbWUgaGVyZSBpbiBjYXNlIHdlIHJ1biB3aXRoIHNvbWUgYXJjaGl0ZWN0dXJlcyBleGNsdWRlZFxuICAgIG5leHQoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBJZiBwYXVzZUNsaWVudChhcmNoKSBoYXMgYmVlbiBjYWxsZWQsIHByb2dyYW0ucGF1c2VkIHdpbGwgYmUgYVxuICAvLyBQcm9taXNlIHRoYXQgd2lsbCBiZSByZXNvbHZlZCB3aGVuIHRoZSBwcm9ncmFtIGlzIHVucGF1c2VkLlxuICBjb25zdCBwcm9ncmFtID0gV2ViQXBwLmNsaWVudFByb2dyYW1zW2FyY2hdO1xuICBhd2FpdCBwcm9ncmFtLnBhdXNlZDtcblxuICBpZiAocGF0aCA9PT0gXCIvbWV0ZW9yX3J1bnRpbWVfY29uZmlnLmpzXCIgJiZcbiAgICAgICEgV2ViQXBwSW50ZXJuYWxzLmlubGluZVNjcmlwdHNBbGxvd2VkKCkpIHtcbiAgICBzZXJ2ZVN0YXRpY0pzKGBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fID0gJHtwcm9ncmFtLm1ldGVvclJ1bnRpbWVDb25maWd9O2ApO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGluZm8gPSBnZXRTdGF0aWNGaWxlSW5mbyhzdGF0aWNGaWxlc0J5QXJjaCwgcGF0aG5hbWUsIHBhdGgsIGFyY2gpO1xuICBpZiAoISBpbmZvKSB7XG4gICAgbmV4dCgpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIFdlIGRvbid0IG5lZWQgdG8gY2FsbCBwYXVzZSBiZWNhdXNlLCB1bmxpa2UgJ3N0YXRpYycsIG9uY2Ugd2UgY2FsbCBpbnRvXG4gIC8vICdzZW5kJyBhbmQgeWllbGQgdG8gdGhlIGV2ZW50IGxvb3AsIHdlIG5ldmVyIGNhbGwgYW5vdGhlciBoYW5kbGVyIHdpdGhcbiAgLy8gJ25leHQnLlxuXG4gIC8vIENhY2hlYWJsZSBmaWxlcyBhcmUgZmlsZXMgdGhhdCBzaG91bGQgbmV2ZXIgY2hhbmdlLiBUeXBpY2FsbHlcbiAgLy8gbmFtZWQgYnkgdGhlaXIgaGFzaCAoZWcgbWV0ZW9yIGJ1bmRsZWQganMgYW5kIGNzcyBmaWxlcykuXG4gIC8vIFdlIGNhY2hlIHRoZW0gfmZvcmV2ZXIgKDF5cikuXG4gIGNvbnN0IG1heEFnZSA9IGluZm8uY2FjaGVhYmxlXG4gICAgPyAxMDAwICogNjAgKiA2MCAqIDI0ICogMzY1XG4gICAgOiAwO1xuXG4gIGlmIChpbmZvLmNhY2hlYWJsZSkge1xuICAgIC8vIFNpbmNlIHdlIHVzZSByZXEuaGVhZGVyc1tcInVzZXItYWdlbnRcIl0gdG8gZGV0ZXJtaW5lIHdoZXRoZXIgdGhlXG4gICAgLy8gY2xpZW50IHNob3VsZCByZWNlaXZlIG1vZGVybiBvciBsZWdhY3kgcmVzb3VyY2VzLCB0ZWxsIHRoZSBjbGllbnRcbiAgICAvLyB0byBpbnZhbGlkYXRlIGNhY2hlZCByZXNvdXJjZXMgd2hlbi9pZiBpdHMgdXNlciBhZ2VudCBzdHJpbmdcbiAgICAvLyBjaGFuZ2VzIGluIHRoZSBmdXR1cmUuXG4gICAgcmVzLnNldEhlYWRlcihcIlZhcnlcIiwgXCJVc2VyLUFnZW50XCIpO1xuICB9XG5cbiAgLy8gU2V0IHRoZSBYLVNvdXJjZU1hcCBoZWFkZXIsIHdoaWNoIGN1cnJlbnQgQ2hyb21lLCBGaXJlRm94LCBhbmQgU2FmYXJpXG4gIC8vIHVuZGVyc3RhbmQuICAoVGhlIFNvdXJjZU1hcCBoZWFkZXIgaXMgc2xpZ2h0bHkgbW9yZSBzcGVjLWNvcnJlY3QgYnV0IEZGXG4gIC8vIGRvZXNuJ3QgdW5kZXJzdGFuZCBpdC4pXG4gIC8vXG4gIC8vIFlvdSBtYXkgYWxzbyBuZWVkIHRvIGVuYWJsZSBzb3VyY2UgbWFwcyBpbiBDaHJvbWU6IG9wZW4gZGV2IHRvb2xzLCBjbGlja1xuICAvLyB0aGUgZ2VhciBpbiB0aGUgYm90dG9tIHJpZ2h0IGNvcm5lciwgYW5kIHNlbGVjdCBcImVuYWJsZSBzb3VyY2UgbWFwc1wiLlxuICBpZiAoaW5mby5zb3VyY2VNYXBVcmwpIHtcbiAgICByZXMuc2V0SGVhZGVyKCdYLVNvdXJjZU1hcCcsXG4gICAgICAgICAgICAgICAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLlJPT1RfVVJMX1BBVEhfUFJFRklYICtcbiAgICAgICAgICAgICAgICAgIGluZm8uc291cmNlTWFwVXJsKTtcbiAgfVxuXG4gIGlmIChpbmZvLnR5cGUgPT09IFwianNcIiB8fFxuICAgICAgaW5mby50eXBlID09PSBcImR5bmFtaWMganNcIikge1xuICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qYXZhc2NyaXB0OyBjaGFyc2V0PVVURi04XCIpO1xuICB9IGVsc2UgaWYgKGluZm8udHlwZSA9PT0gXCJjc3NcIikge1xuICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJ0ZXh0L2NzczsgY2hhcnNldD1VVEYtOFwiKTtcbiAgfSBlbHNlIGlmIChpbmZvLnR5cGUgPT09IFwianNvblwiKSB7XG4gICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9VVRGLThcIik7XG4gIH1cblxuICBpZiAoaW5mby5oYXNoKSB7XG4gICAgcmVzLnNldEhlYWRlcignRVRhZycsICdcIicgKyBpbmZvLmhhc2ggKyAnXCInKTtcbiAgfVxuXG4gIGlmIChpbmZvLmNvbnRlbnQpIHtcbiAgICByZXMud3JpdGUoaW5mby5jb250ZW50KTtcbiAgICByZXMuZW5kKCk7XG4gIH0gZWxzZSB7XG4gICAgc2VuZChyZXEsIGluZm8uYWJzb2x1dGVQYXRoLCB7XG4gICAgICBtYXhhZ2U6IG1heEFnZSxcbiAgICAgIGRvdGZpbGVzOiAnYWxsb3cnLCAvLyBpZiB3ZSBzcGVjaWZpZWQgYSBkb3RmaWxlIGluIHRoZSBtYW5pZmVzdCwgc2VydmUgaXRcbiAgICAgIGxhc3RNb2RpZmllZDogZmFsc2UgLy8gZG9uJ3Qgc2V0IGxhc3QtbW9kaWZpZWQgYmFzZWQgb24gdGhlIGZpbGUgZGF0ZVxuICAgIH0pLm9uKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgIExvZy5lcnJvcihcIkVycm9yIHNlcnZpbmcgc3RhdGljIGZpbGUgXCIgKyBlcnIpO1xuICAgICAgcmVzLndyaXRlSGVhZCg1MDApO1xuICAgICAgcmVzLmVuZCgpO1xuICAgIH0pLm9uKCdkaXJlY3RvcnknLCBmdW5jdGlvbiAoKSB7XG4gICAgICBMb2cuZXJyb3IoXCJVbmV4cGVjdGVkIGRpcmVjdG9yeSBcIiArIGluZm8uYWJzb2x1dGVQYXRoKTtcbiAgICAgIHJlcy53cml0ZUhlYWQoNTAwKTtcbiAgICAgIHJlcy5lbmQoKTtcbiAgICB9KS5waXBlKHJlcyk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGdldFN0YXRpY0ZpbGVJbmZvKHN0YXRpY0ZpbGVzQnlBcmNoLCBvcmlnaW5hbFBhdGgsIHBhdGgsIGFyY2gpIHtcbiAgaWYgKCEgaGFzT3duLmNhbGwoV2ViQXBwLmNsaWVudFByb2dyYW1zLCBhcmNoKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgLy8gR2V0IGEgbGlzdCBvZiBhbGwgYXZhaWxhYmxlIHN0YXRpYyBmaWxlIGFyY2hpdGVjdHVyZXMsIHdpdGggYXJjaFxuICAvLyBmaXJzdCBpbiB0aGUgbGlzdCBpZiBpdCBleGlzdHMuXG4gIGNvbnN0IHN0YXRpY0FyY2hMaXN0ID0gT2JqZWN0LmtleXMoc3RhdGljRmlsZXNCeUFyY2gpO1xuICBjb25zdCBhcmNoSW5kZXggPSBzdGF0aWNBcmNoTGlzdC5pbmRleE9mKGFyY2gpO1xuICBpZiAoYXJjaEluZGV4ID4gMCkge1xuICAgIHN0YXRpY0FyY2hMaXN0LnVuc2hpZnQoc3RhdGljQXJjaExpc3Quc3BsaWNlKGFyY2hJbmRleCwgMSlbMF0pO1xuICB9XG5cbiAgbGV0IGluZm8gPSBudWxsO1xuXG4gIHN0YXRpY0FyY2hMaXN0LnNvbWUoYXJjaCA9PiB7XG4gICAgY29uc3Qgc3RhdGljRmlsZXMgPSBzdGF0aWNGaWxlc0J5QXJjaFthcmNoXTtcblxuICAgIGZ1bmN0aW9uIGZpbmFsaXplKHBhdGgpIHtcbiAgICAgIGluZm8gPSBzdGF0aWNGaWxlc1twYXRoXTtcbiAgICAgIC8vIFNvbWV0aW1lcyB3ZSByZWdpc3RlciBhIGxhenkgZnVuY3Rpb24gaW5zdGVhZCBvZiBhY3R1YWwgZGF0YSBpblxuICAgICAgLy8gdGhlIHN0YXRpY0ZpbGVzIG1hbmlmZXN0LlxuICAgICAgaWYgKHR5cGVvZiBpbmZvID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgaW5mbyA9IHN0YXRpY0ZpbGVzW3BhdGhdID0gaW5mbygpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGluZm87XG4gICAgfVxuXG4gICAgLy8gSWYgc3RhdGljRmlsZXMgY29udGFpbnMgb3JpZ2luYWxQYXRoIHdpdGggdGhlIGFyY2ggaW5mZXJyZWQgYWJvdmUsXG4gICAgLy8gdXNlIHRoYXQgaW5mb3JtYXRpb24uXG4gICAgaWYgKGhhc093bi5jYWxsKHN0YXRpY0ZpbGVzLCBvcmlnaW5hbFBhdGgpKSB7XG4gICAgICByZXR1cm4gZmluYWxpemUob3JpZ2luYWxQYXRoKTtcbiAgICB9XG5cbiAgICAvLyBJZiBjYXRlZ29yaXplUmVxdWVzdCByZXR1cm5lZCBhbiBhbHRlcm5hdGUgcGF0aCwgdHJ5IHRoYXQgaW5zdGVhZC5cbiAgICBpZiAocGF0aCAhPT0gb3JpZ2luYWxQYXRoICYmXG4gICAgICAgIGhhc093bi5jYWxsKHN0YXRpY0ZpbGVzLCBwYXRoKSkge1xuICAgICAgcmV0dXJuIGZpbmFsaXplKHBhdGgpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGluZm87XG59XG5cbi8vIFBhcnNlIHRoZSBwYXNzZWQgaW4gcG9ydCB2YWx1ZS4gUmV0dXJuIHRoZSBwb3J0IGFzLWlzIGlmIGl0J3MgYSBTdHJpbmdcbi8vIChlLmcuIGEgV2luZG93cyBTZXJ2ZXIgc3R5bGUgbmFtZWQgcGlwZSksIG90aGVyd2lzZSByZXR1cm4gdGhlIHBvcnQgYXMgYW5cbi8vIGludGVnZXIuXG4vL1xuLy8gREVQUkVDQVRFRDogRGlyZWN0IHVzZSBvZiB0aGlzIGZ1bmN0aW9uIGlzIG5vdCByZWNvbW1lbmRlZDsgaXQgaXMgbm9cbi8vIGxvbmdlciB1c2VkIGludGVybmFsbHksIGFuZCB3aWxsIGJlIHJlbW92ZWQgaW4gYSBmdXR1cmUgcmVsZWFzZS5cbldlYkFwcEludGVybmFscy5wYXJzZVBvcnQgPSBwb3J0ID0+IHtcbiAgbGV0IHBhcnNlZFBvcnQgPSBwYXJzZUludChwb3J0KTtcbiAgaWYgKE51bWJlci5pc05hTihwYXJzZWRQb3J0KSkge1xuICAgIHBhcnNlZFBvcnQgPSBwb3J0O1xuICB9XG4gIHJldHVybiBwYXJzZWRQb3J0O1xufVxuXG5pbXBvcnQgeyBvbk1lc3NhZ2UgfSBmcm9tIFwibWV0ZW9yL2ludGVyLXByb2Nlc3MtbWVzc2FnaW5nXCI7XG5cbm9uTWVzc2FnZShcIndlYmFwcC1wYXVzZS1jbGllbnRcIiwgYXN5bmMgKHsgYXJjaCB9KSA9PiB7XG4gIFdlYkFwcEludGVybmFscy5wYXVzZUNsaWVudChhcmNoKTtcbn0pO1xuXG5vbk1lc3NhZ2UoXCJ3ZWJhcHAtcmVsb2FkLWNsaWVudFwiLCBhc3luYyAoeyBhcmNoIH0pID0+IHtcbiAgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQ2xpZW50UHJvZ3JhbShhcmNoKTtcbn0pO1xuXG5mdW5jdGlvbiBydW5XZWJBcHBTZXJ2ZXIoKSB7XG4gIHZhciBzaHV0dGluZ0Rvd24gPSBmYWxzZTtcbiAgdmFyIHN5bmNRdWV1ZSA9IG5ldyBNZXRlb3IuX1N5bmNocm9ub3VzUXVldWUoKTtcblxuICB2YXIgZ2V0SXRlbVBhdGhuYW1lID0gZnVuY3Rpb24gKGl0ZW1VcmwpIHtcbiAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHBhcnNlVXJsKGl0ZW1VcmwpLnBhdGhuYW1lKTtcbiAgfTtcblxuICBXZWJBcHBJbnRlcm5hbHMucmVsb2FkQ2xpZW50UHJvZ3JhbXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgc3luY1F1ZXVlLnJ1blRhc2soZnVuY3Rpb24oKSB7XG4gICAgICBjb25zdCBzdGF0aWNGaWxlc0J5QXJjaCA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICAgIGNvbnN0IHsgY29uZmlnSnNvbiB9ID0gX19tZXRlb3JfYm9vdHN0cmFwX187XG4gICAgICBjb25zdCBjbGllbnRBcmNocyA9IGNvbmZpZ0pzb24uY2xpZW50QXJjaHMgfHxcbiAgICAgICAgT2JqZWN0LmtleXMoY29uZmlnSnNvbi5jbGllbnRQYXRocyk7XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGNsaWVudEFyY2hzLmZvckVhY2goYXJjaCA9PiB7XG4gICAgICAgICAgZ2VuZXJhdGVDbGllbnRQcm9ncmFtKGFyY2gsIHN0YXRpY0ZpbGVzQnlBcmNoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc0J5QXJjaCA9IHN0YXRpY0ZpbGVzQnlBcmNoO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBMb2cuZXJyb3IoXCJFcnJvciByZWxvYWRpbmcgdGhlIGNsaWVudCBwcm9ncmFtOiBcIiArIGUuc3RhY2spO1xuICAgICAgICBwcm9jZXNzLmV4aXQoMSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgLy8gUGF1c2UgYW55IGluY29taW5nIHJlcXVlc3RzIGFuZCBtYWtlIHRoZW0gd2FpdCBmb3IgdGhlIHByb2dyYW0gdG8gYmVcbiAgLy8gdW5wYXVzZWQgdGhlIG5leHQgdGltZSBnZW5lcmF0ZUNsaWVudFByb2dyYW0oYXJjaCkgaXMgY2FsbGVkLlxuICBXZWJBcHBJbnRlcm5hbHMucGF1c2VDbGllbnQgPSBmdW5jdGlvbiAoYXJjaCkge1xuICAgIHN5bmNRdWV1ZS5ydW5UYXNrKCgpID0+IHtcbiAgICAgIGNvbnN0IHByb2dyYW0gPSBXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaF07XG4gICAgICBjb25zdCB7IHVucGF1c2UgfSA9IHByb2dyYW07XG4gICAgICBwcm9ncmFtLnBhdXNlZCA9IG5ldyBQcm9taXNlKHJlc29sdmUgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHVucGF1c2UgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgIC8vIElmIHRoZXJlIGhhcHBlbnMgdG8gYmUgYW4gZXhpc3RpbmcgcHJvZ3JhbS51bnBhdXNlIGZ1bmN0aW9uLFxuICAgICAgICAgIC8vIGNvbXBvc2UgaXQgd2l0aCB0aGUgcmVzb2x2ZSBmdW5jdGlvbi5cbiAgICAgICAgICBwcm9ncmFtLnVucGF1c2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB1bnBhdXNlKCk7XG4gICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwcm9ncmFtLnVucGF1c2UgPSByZXNvbHZlO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfTtcblxuICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVDbGllbnRQcm9ncmFtID0gZnVuY3Rpb24gKGFyY2gpIHtcbiAgICBzeW5jUXVldWUucnVuVGFzaygoKSA9PiBnZW5lcmF0ZUNsaWVudFByb2dyYW0oYXJjaCkpO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGdlbmVyYXRlQ2xpZW50UHJvZ3JhbShcbiAgICBhcmNoLFxuICAgIHN0YXRpY0ZpbGVzQnlBcmNoID0gV2ViQXBwSW50ZXJuYWxzLnN0YXRpY0ZpbGVzQnlBcmNoLFxuICApIHtcbiAgICBjb25zdCBjbGllbnREaXIgPSBwYXRoSm9pbihcbiAgICAgIHBhdGhEaXJuYW1lKF9fbWV0ZW9yX2Jvb3RzdHJhcF9fLnNlcnZlckRpciksXG4gICAgICBhcmNoLFxuICAgICk7XG5cbiAgICAvLyByZWFkIHRoZSBjb250cm9sIGZvciB0aGUgY2xpZW50IHdlJ2xsIGJlIHNlcnZpbmcgdXBcbiAgICBjb25zdCBwcm9ncmFtSnNvblBhdGggPSBwYXRoSm9pbihjbGllbnREaXIsIFwicHJvZ3JhbS5qc29uXCIpO1xuXG4gICAgbGV0IHByb2dyYW1Kc29uO1xuICAgIHRyeSB7XG4gICAgICBwcm9ncmFtSnNvbiA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHByb2dyYW1Kc29uUGF0aCkpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLmNvZGUgPT09IFwiRU5PRU5UXCIpIHJldHVybjtcbiAgICAgIHRocm93IGU7XG4gICAgfVxuXG4gICAgaWYgKHByb2dyYW1Kc29uLmZvcm1hdCAhPT0gXCJ3ZWItcHJvZ3JhbS1wcmUxXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlVuc3VwcG9ydGVkIGZvcm1hdCBmb3IgY2xpZW50IGFzc2V0czogXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHByb2dyYW1Kc29uLmZvcm1hdCkpO1xuICAgIH1cblxuICAgIGlmICghIHByb2dyYW1Kc29uUGF0aCB8fCAhIGNsaWVudERpciB8fCAhIHByb2dyYW1Kc29uKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDbGllbnQgY29uZmlnIGZpbGUgbm90IHBhcnNlZC5cIik7XG4gICAgfVxuXG4gICAgYXJjaFBhdGhbYXJjaF0gPSBjbGllbnREaXI7XG4gICAgY29uc3Qgc3RhdGljRmlsZXMgPSBzdGF0aWNGaWxlc0J5QXJjaFthcmNoXSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBjb25zdCB7IG1hbmlmZXN0IH0gPSBwcm9ncmFtSnNvbjtcbiAgICBtYW5pZmVzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgaWYgKGl0ZW0udXJsICYmIGl0ZW0ud2hlcmUgPT09IFwiY2xpZW50XCIpIHtcbiAgICAgICAgc3RhdGljRmlsZXNbZ2V0SXRlbVBhdGhuYW1lKGl0ZW0udXJsKV0gPSB7XG4gICAgICAgICAgYWJzb2x1dGVQYXRoOiBwYXRoSm9pbihjbGllbnREaXIsIGl0ZW0ucGF0aCksXG4gICAgICAgICAgY2FjaGVhYmxlOiBpdGVtLmNhY2hlYWJsZSxcbiAgICAgICAgICBoYXNoOiBpdGVtLmhhc2gsXG4gICAgICAgICAgLy8gTGluayBmcm9tIHNvdXJjZSB0byBpdHMgbWFwXG4gICAgICAgICAgc291cmNlTWFwVXJsOiBpdGVtLnNvdXJjZU1hcFVybCxcbiAgICAgICAgICB0eXBlOiBpdGVtLnR5cGVcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAoaXRlbS5zb3VyY2VNYXApIHtcbiAgICAgICAgICAvLyBTZXJ2ZSB0aGUgc291cmNlIG1hcCB0b28sIHVuZGVyIHRoZSBzcGVjaWZpZWQgVVJMLiBXZSBhc3N1bWVcbiAgICAgICAgICAvLyBhbGwgc291cmNlIG1hcHMgYXJlIGNhY2hlYWJsZS5cbiAgICAgICAgICBzdGF0aWNGaWxlc1tnZXRJdGVtUGF0aG5hbWUoaXRlbS5zb3VyY2VNYXBVcmwpXSA9IHtcbiAgICAgICAgICAgIGFic29sdXRlUGF0aDogcGF0aEpvaW4oY2xpZW50RGlyLCBpdGVtLnNvdXJjZU1hcCksXG4gICAgICAgICAgICBjYWNoZWFibGU6IHRydWVcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCB7IFBVQkxJQ19TRVRUSU5HUyB9ID0gX19tZXRlb3JfcnVudGltZV9jb25maWdfXztcbiAgICBjb25zdCBjb25maWdPdmVycmlkZXMgPSB7XG4gICAgICBQVUJMSUNfU0VUVElOR1MsXG4gICAgfTtcblxuICAgIGNvbnN0IG9sZFByb2dyYW0gPSBXZWJBcHAuY2xpZW50UHJvZ3JhbXNbYXJjaF07XG4gICAgY29uc3QgbmV3UHJvZ3JhbSA9IFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoXSA9IHtcbiAgICAgIGZvcm1hdDogXCJ3ZWItcHJvZ3JhbS1wcmUxXCIsXG4gICAgICBtYW5pZmVzdDogbWFuaWZlc3QsXG4gICAgICAvLyBVc2UgYXJyb3cgZnVuY3Rpb25zIHNvIHRoYXQgdGhlc2UgdmVyc2lvbnMgY2FuIGJlIGxhemlseVxuICAgICAgLy8gY2FsY3VsYXRlZCBsYXRlciwgYW5kIHNvIHRoYXQgdGhleSB3aWxsIG5vdCBiZSBpbmNsdWRlZCBpbiB0aGVcbiAgICAgIC8vIHN0YXRpY0ZpbGVzW21hbmlmZXN0VXJsXS5jb250ZW50IHN0cmluZyBiZWxvdy5cbiAgICAgIC8vXG4gICAgICAvLyBOb3RlOiB0aGVzZSB2ZXJzaW9uIGNhbGN1bGF0aW9ucyBtdXN0IGJlIGtlcHQgaW4gYWdyZWVtZW50IHdpdGhcbiAgICAgIC8vIENvcmRvdmFCdWlsZGVyI2FwcGVuZFZlcnNpb24gaW4gdG9vbHMvY29yZG92YS9idWlsZGVyLmpzLCBvciBob3RcbiAgICAgIC8vIGNvZGUgcHVzaCB3aWxsIHJlbG9hZCBDb3Jkb3ZhIGFwcHMgdW5uZWNlc3NhcmlseS5cbiAgICAgIHZlcnNpb246ICgpID0+IFdlYkFwcEhhc2hpbmcuY2FsY3VsYXRlQ2xpZW50SGFzaChcbiAgICAgICAgbWFuaWZlc3QsIG51bGwsIGNvbmZpZ092ZXJyaWRlcyksXG4gICAgICB2ZXJzaW9uUmVmcmVzaGFibGU6ICgpID0+IFdlYkFwcEhhc2hpbmcuY2FsY3VsYXRlQ2xpZW50SGFzaChcbiAgICAgICAgbWFuaWZlc3QsIHR5cGUgPT4gdHlwZSA9PT0gXCJjc3NcIiwgY29uZmlnT3ZlcnJpZGVzKSxcbiAgICAgIHZlcnNpb25Ob25SZWZyZXNoYWJsZTogKCkgPT4gV2ViQXBwSGFzaGluZy5jYWxjdWxhdGVDbGllbnRIYXNoKFxuICAgICAgICBtYW5pZmVzdCwgKHR5cGUsIHJlcGxhY2VhYmxlKSA9PiB0eXBlICE9PSBcImNzc1wiICYmICFyZXBsYWNlYWJsZSwgY29uZmlnT3ZlcnJpZGVzKSxcbiAgICAgIHZlcnNpb25SZXBsYWNlYWJsZTogKCkgPT4gV2ViQXBwSGFzaGluZy5jYWxjdWxhdGVDbGllbnRIYXNoKFxuICAgICAgICBtYW5pZmVzdCwgKF90eXBlLCByZXBsYWNlYWJsZSkgPT4ge1xuICAgICAgICAgIGlmIChNZXRlb3IuaXNQcm9kdWN0aW9uICYmIHJlcGxhY2VhYmxlKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VuZXhwZWN0ZWQgcmVwbGFjZWFibGUgZmlsZSBpbiBwcm9kdWN0aW9uJyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHJlcGxhY2VhYmxlXG4gICAgICAgIH0sXG4gICAgICAgIGNvbmZpZ092ZXJyaWRlc1xuICAgICAgKSxcbiAgICAgIGNvcmRvdmFDb21wYXRpYmlsaXR5VmVyc2lvbnM6IHByb2dyYW1Kc29uLmNvcmRvdmFDb21wYXRpYmlsaXR5VmVyc2lvbnMsXG4gICAgICBQVUJMSUNfU0VUVElOR1MsXG4gICAgfTtcblxuICAgIC8vIEV4cG9zZSBwcm9ncmFtIGRldGFpbHMgYXMgYSBzdHJpbmcgcmVhY2hhYmxlIHZpYSB0aGUgZm9sbG93aW5nIFVSTC5cbiAgICBjb25zdCBtYW5pZmVzdFVybFByZWZpeCA9IFwiL19fXCIgKyBhcmNoLnJlcGxhY2UoL153ZWJcXC4vLCBcIlwiKTtcbiAgICBjb25zdCBtYW5pZmVzdFVybCA9IG1hbmlmZXN0VXJsUHJlZml4ICsgZ2V0SXRlbVBhdGhuYW1lKFwiL21hbmlmZXN0Lmpzb25cIik7XG5cbiAgICBzdGF0aWNGaWxlc1ttYW5pZmVzdFVybF0gPSAoKSA9PiB7XG4gICAgICBpZiAoUGFja2FnZS5hdXRvdXBkYXRlKSB7XG4gICAgICAgIGNvbnN0IHtcbiAgICAgICAgICBBVVRPVVBEQVRFX1ZFUlNJT04gPVxuICAgICAgICAgICAgUGFja2FnZS5hdXRvdXBkYXRlLkF1dG91cGRhdGUuYXV0b3VwZGF0ZVZlcnNpb25cbiAgICAgICAgfSA9IHByb2Nlc3MuZW52O1xuXG4gICAgICAgIGlmIChBVVRPVVBEQVRFX1ZFUlNJT04pIHtcbiAgICAgICAgICBuZXdQcm9ncmFtLnZlcnNpb24gPSBBVVRPVVBEQVRFX1ZFUlNJT047XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBuZXdQcm9ncmFtLnZlcnNpb24gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICBuZXdQcm9ncmFtLnZlcnNpb24gPSBuZXdQcm9ncmFtLnZlcnNpb24oKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgY29udGVudDogSlNPTi5zdHJpbmdpZnkobmV3UHJvZ3JhbSksXG4gICAgICAgIGNhY2hlYWJsZTogZmFsc2UsXG4gICAgICAgIGhhc2g6IG5ld1Byb2dyYW0udmVyc2lvbixcbiAgICAgICAgdHlwZTogXCJqc29uXCJcbiAgICAgIH07XG4gICAgfTtcblxuICAgIGdlbmVyYXRlQm9pbGVycGxhdGVGb3JBcmNoKGFyY2gpO1xuXG4gICAgLy8gSWYgdGhlcmUgYXJlIGFueSByZXF1ZXN0cyB3YWl0aW5nIG9uIG9sZFByb2dyYW0ucGF1c2VkLCBsZXQgdGhlbVxuICAgIC8vIGNvbnRpbnVlIG5vdyAodXNpbmcgdGhlIG5ldyBwcm9ncmFtKS5cbiAgICBpZiAob2xkUHJvZ3JhbSAmJlxuICAgICAgICBvbGRQcm9ncmFtLnBhdXNlZCkge1xuICAgICAgb2xkUHJvZ3JhbS51bnBhdXNlKCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IGRlZmF1bHRPcHRpb25zRm9yQXJjaCA9IHtcbiAgICAnd2ViLmNvcmRvdmEnOiB7XG4gICAgICBydW50aW1lQ29uZmlnT3ZlcnJpZGVzOiB7XG4gICAgICAgIC8vIFhYWCBXZSB1c2UgYWJzb2x1dGVVcmwoKSBoZXJlIHNvIHRoYXQgd2Ugc2VydmUgaHR0cHM6Ly9cbiAgICAgICAgLy8gVVJMcyB0byBjb3Jkb3ZhIGNsaWVudHMgaWYgZm9yY2Utc3NsIGlzIGluIHVzZS4gSWYgd2Ugd2VyZVxuICAgICAgICAvLyB0byB1c2UgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5ST09UX1VSTCBpbnN0ZWFkIG9mXG4gICAgICAgIC8vIGFic29sdXRlVXJsKCksIHRoZW4gQ29yZG92YSBjbGllbnRzIHdvdWxkIGltbWVkaWF0ZWx5IGdldCBhXG4gICAgICAgIC8vIEhDUCBzZXR0aW5nIHRoZWlyIEREUF9ERUZBVUxUX0NPTk5FQ1RJT05fVVJMIHRvXG4gICAgICAgIC8vIGh0dHA6Ly9leGFtcGxlLm1ldGVvci5jb20uIFRoaXMgYnJlYWtzIHRoZSBhcHAsIGJlY2F1c2VcbiAgICAgICAgLy8gZm9yY2Utc3NsIGRvZXNuJ3Qgc2VydmUgQ09SUyBoZWFkZXJzIG9uIDMwMlxuICAgICAgICAvLyByZWRpcmVjdHMuIChQbHVzIGl0J3MgdW5kZXNpcmFibGUgdG8gaGF2ZSBjbGllbnRzXG4gICAgICAgIC8vIGNvbm5lY3RpbmcgdG8gaHR0cDovL2V4YW1wbGUubWV0ZW9yLmNvbSB3aGVuIGZvcmNlLXNzbCBpc1xuICAgICAgICAvLyBpbiB1c2UuKVxuICAgICAgICBERFBfREVGQVVMVF9DT05ORUNUSU9OX1VSTDogcHJvY2Vzcy5lbnYuTU9CSUxFX0REUF9VUkwgfHxcbiAgICAgICAgICBNZXRlb3IuYWJzb2x1dGVVcmwoKSxcbiAgICAgICAgUk9PVF9VUkw6IHByb2Nlc3MuZW52Lk1PQklMRV9ST09UX1VSTCB8fFxuICAgICAgICAgIE1ldGVvci5hYnNvbHV0ZVVybCgpXG4gICAgICB9XG4gICAgfSxcblxuICAgIFwid2ViLmJyb3dzZXJcIjoge1xuICAgICAgcnVudGltZUNvbmZpZ092ZXJyaWRlczoge1xuICAgICAgICBpc01vZGVybjogdHJ1ZSxcbiAgICAgIH1cbiAgICB9LFxuXG4gICAgXCJ3ZWIuYnJvd3Nlci5sZWdhY3lcIjoge1xuICAgICAgcnVudGltZUNvbmZpZ092ZXJyaWRlczoge1xuICAgICAgICBpc01vZGVybjogZmFsc2UsXG4gICAgICB9XG4gICAgfSxcbiAgfTtcblxuICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBUaGlzIGJvaWxlcnBsYXRlIHdpbGwgYmUgc2VydmVkIHRvIHRoZSBtb2JpbGUgZGV2aWNlcyB3aGVuIHVzZWQgd2l0aFxuICAgIC8vIE1ldGVvci9Db3Jkb3ZhIGZvciB0aGUgSG90LUNvZGUgUHVzaCBhbmQgc2luY2UgdGhlIGZpbGUgd2lsbCBiZSBzZXJ2ZWQgYnlcbiAgICAvLyB0aGUgZGV2aWNlJ3Mgc2VydmVyLCBpdCBpcyBpbXBvcnRhbnQgdG8gc2V0IHRoZSBERFAgdXJsIHRvIHRoZSBhY3R1YWxcbiAgICAvLyBNZXRlb3Igc2VydmVyIGFjY2VwdGluZyBERFAgY29ubmVjdGlvbnMgYW5kIG5vdCB0aGUgZGV2aWNlJ3MgZmlsZSBzZXJ2ZXIuXG4gICAgc3luY1F1ZXVlLnJ1blRhc2soZnVuY3Rpb24oKSB7XG4gICAgICBPYmplY3Qua2V5cyhXZWJBcHAuY2xpZW50UHJvZ3JhbXMpXG4gICAgICAgIC5mb3JFYWNoKGdlbmVyYXRlQm9pbGVycGxhdGVGb3JBcmNoKTtcbiAgICB9KTtcbiAgfTtcblxuICBmdW5jdGlvbiBnZW5lcmF0ZUJvaWxlcnBsYXRlRm9yQXJjaChhcmNoKSB7XG4gICAgY29uc3QgcHJvZ3JhbSA9IFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoXTtcbiAgICBjb25zdCBhZGRpdGlvbmFsT3B0aW9ucyA9IGRlZmF1bHRPcHRpb25zRm9yQXJjaFthcmNoXSB8fCB7fTtcbiAgICBjb25zdCB7IGJhc2VEYXRhIH0gPSBib2lsZXJwbGF0ZUJ5QXJjaFthcmNoXSA9XG4gICAgICBXZWJBcHBJbnRlcm5hbHMuZ2VuZXJhdGVCb2lsZXJwbGF0ZUluc3RhbmNlKFxuICAgICAgICBhcmNoLFxuICAgICAgICBwcm9ncmFtLm1hbmlmZXN0LFxuICAgICAgICBhZGRpdGlvbmFsT3B0aW9ucyxcbiAgICAgICk7XG4gICAgLy8gV2UgbmVlZCB0aGUgcnVudGltZSBjb25maWcgd2l0aCBvdmVycmlkZXMgZm9yIG1ldGVvcl9ydW50aW1lX2NvbmZpZy5qczpcbiAgICBwcm9ncmFtLm1ldGVvclJ1bnRpbWVDb25maWcgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAuLi5fX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLFxuICAgICAgLi4uKGFkZGl0aW9uYWxPcHRpb25zLnJ1bnRpbWVDb25maWdPdmVycmlkZXMgfHwgbnVsbCksXG4gICAgfSk7XG4gICAgcHJvZ3JhbS5yZWZyZXNoYWJsZUFzc2V0cyA9IGJhc2VEYXRhLmNzcy5tYXAoZmlsZSA9PiAoe1xuICAgICAgdXJsOiBidW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayhmaWxlLnVybCksXG4gICAgfSkpO1xuICB9XG5cbiAgV2ViQXBwSW50ZXJuYWxzLnJlbG9hZENsaWVudFByb2dyYW1zKCk7XG5cbiAgLy8gd2Vic2VydmVyXG4gIHZhciBhcHAgPSBjb25uZWN0KCk7XG5cbiAgLy8gUGFja2FnZXMgYW5kIGFwcHMgY2FuIGFkZCBoYW5kbGVycyB0aGF0IHJ1biBiZWZvcmUgYW55IG90aGVyIE1ldGVvclxuICAvLyBoYW5kbGVycyB2aWEgV2ViQXBwLnJhd0Nvbm5lY3RIYW5kbGVycy5cbiAgdmFyIHJhd0Nvbm5lY3RIYW5kbGVycyA9IGNvbm5lY3QoKTtcbiAgYXBwLnVzZShyYXdDb25uZWN0SGFuZGxlcnMpO1xuXG4gIC8vIEF1dG8tY29tcHJlc3MgYW55IGpzb24sIGphdmFzY3JpcHQsIG9yIHRleHQuXG4gIGFwcC51c2UoY29tcHJlc3Moe2ZpbHRlcjogc2hvdWxkQ29tcHJlc3N9KSk7XG5cbiAgLy8gcGFyc2UgY29va2llcyBpbnRvIGFuIG9iamVjdFxuICBhcHAudXNlKGNvb2tpZVBhcnNlcigpKTtcblxuICAvLyBXZSdyZSBub3QgYSBwcm94eTsgcmVqZWN0ICh3aXRob3V0IGNyYXNoaW5nKSBhdHRlbXB0cyB0byB0cmVhdCB1cyBsaWtlXG4gIC8vIG9uZS4gKFNlZSAjMTIxMi4pXG4gIGFwcC51c2UoZnVuY3Rpb24ocmVxLCByZXMsIG5leHQpIHtcbiAgICBpZiAoUm91dGVQb2xpY3kuaXNWYWxpZFVybChyZXEudXJsKSkge1xuICAgICAgbmV4dCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXMud3JpdGVIZWFkKDQwMCk7XG4gICAgcmVzLndyaXRlKFwiTm90IGEgcHJveHlcIik7XG4gICAgcmVzLmVuZCgpO1xuICB9KTtcblxuICAvLyBQYXJzZSB0aGUgcXVlcnkgc3RyaW5nIGludG8gcmVzLnF1ZXJ5LiBVc2VkIGJ5IG9hdXRoX3NlcnZlciwgYnV0IGl0J3NcbiAgLy8gZ2VuZXJhbGx5IHByZXR0eSBoYW5keS4uXG4gIC8vXG4gIC8vIERvIHRoaXMgYmVmb3JlIHRoZSBuZXh0IG1pZGRsZXdhcmUgZGVzdHJveXMgcmVxLnVybCBpZiBhIHBhdGggcHJlZml4XG4gIC8vIGlzIHNldCB0byBjbG9zZSAjMTAxMTEuXG4gIGFwcC51c2UoZnVuY3Rpb24gKHJlcXVlc3QsIHJlc3BvbnNlLCBuZXh0KSB7XG4gICAgcmVxdWVzdC5xdWVyeSA9IHFzLnBhcnNlKHBhcnNlVXJsKHJlcXVlc3QudXJsKS5xdWVyeSk7XG4gICAgbmV4dCgpO1xuICB9KTtcblxuICBmdW5jdGlvbiBnZXRQYXRoUGFydHMocGF0aCkge1xuICAgIGNvbnN0IHBhcnRzID0gcGF0aC5zcGxpdChcIi9cIik7XG4gICAgd2hpbGUgKHBhcnRzWzBdID09PSBcIlwiKSBwYXJ0cy5zaGlmdCgpO1xuICAgIHJldHVybiBwYXJ0cztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzUHJlZml4T2YocHJlZml4LCBhcnJheSkge1xuICAgIHJldHVybiBwcmVmaXgubGVuZ3RoIDw9IGFycmF5Lmxlbmd0aCAmJlxuICAgICAgcHJlZml4LmV2ZXJ5KChwYXJ0LCBpKSA9PiBwYXJ0ID09PSBhcnJheVtpXSk7XG4gIH1cblxuICAvLyBTdHJpcCBvZmYgdGhlIHBhdGggcHJlZml4LCBpZiBpdCBleGlzdHMuXG4gIGFwcC51c2UoZnVuY3Rpb24gKHJlcXVlc3QsIHJlc3BvbnNlLCBuZXh0KSB7XG4gICAgY29uc3QgcGF0aFByZWZpeCA9IF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uUk9PVF9VUkxfUEFUSF9QUkVGSVg7XG4gICAgY29uc3QgeyBwYXRobmFtZSwgc2VhcmNoIH0gPSBwYXJzZVVybChyZXF1ZXN0LnVybCk7XG5cbiAgICAvLyBjaGVjayBpZiB0aGUgcGF0aCBpbiB0aGUgdXJsIHN0YXJ0cyB3aXRoIHRoZSBwYXRoIHByZWZpeFxuICAgIGlmIChwYXRoUHJlZml4KSB7XG4gICAgICBjb25zdCBwcmVmaXhQYXJ0cyA9IGdldFBhdGhQYXJ0cyhwYXRoUHJlZml4KTtcbiAgICAgIGNvbnN0IHBhdGhQYXJ0cyA9IGdldFBhdGhQYXJ0cyhwYXRobmFtZSk7XG4gICAgICBpZiAoaXNQcmVmaXhPZihwcmVmaXhQYXJ0cywgcGF0aFBhcnRzKSkge1xuICAgICAgICByZXF1ZXN0LnVybCA9IFwiL1wiICsgcGF0aFBhcnRzLnNsaWNlKHByZWZpeFBhcnRzLmxlbmd0aCkuam9pbihcIi9cIik7XG4gICAgICAgIGlmIChzZWFyY2gpIHtcbiAgICAgICAgICByZXF1ZXN0LnVybCArPSBzZWFyY2g7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocGF0aG5hbWUgPT09IFwiL2Zhdmljb24uaWNvXCIgfHxcbiAgICAgICAgcGF0aG5hbWUgPT09IFwiL3JvYm90cy50eHRcIikge1xuICAgICAgcmV0dXJuIG5leHQoKTtcbiAgICB9XG5cbiAgICBpZiAocGF0aFByZWZpeCkge1xuICAgICAgcmVzcG9uc2Uud3JpdGVIZWFkKDQwNCk7XG4gICAgICByZXNwb25zZS53cml0ZShcIlVua25vd24gcGF0aFwiKTtcbiAgICAgIHJlc3BvbnNlLmVuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIG5leHQoKTtcbiAgfSk7XG5cbiAgLy8gU2VydmUgc3RhdGljIGZpbGVzIGZyb20gdGhlIG1hbmlmZXN0LlxuICAvLyBUaGlzIGlzIGluc3BpcmVkIGJ5IHRoZSAnc3RhdGljJyBtaWRkbGV3YXJlLlxuICBhcHAudXNlKGZ1bmN0aW9uIChyZXEsIHJlcywgbmV4dCkge1xuICAgIFdlYkFwcEludGVybmFscy5zdGF0aWNGaWxlc01pZGRsZXdhcmUoXG4gICAgICBXZWJBcHBJbnRlcm5hbHMuc3RhdGljRmlsZXNCeUFyY2gsXG4gICAgICByZXEsIHJlcywgbmV4dFxuICAgICk7XG4gIH0pO1xuXG4gIC8vIENvcmUgTWV0ZW9yIHBhY2thZ2VzIGxpa2UgZHluYW1pYy1pbXBvcnQgY2FuIGFkZCBoYW5kbGVycyBiZWZvcmVcbiAgLy8gb3RoZXIgaGFuZGxlcnMgYWRkZWQgYnkgcGFja2FnZSBhbmQgYXBwbGljYXRpb24gY29kZS5cbiAgYXBwLnVzZShXZWJBcHBJbnRlcm5hbHMubWV0ZW9ySW50ZXJuYWxIYW5kbGVycyA9IGNvbm5lY3QoKSk7XG5cbiAgLy8gUGFja2FnZXMgYW5kIGFwcHMgY2FuIGFkZCBoYW5kbGVycyB0byB0aGlzIHZpYSBXZWJBcHAuY29ubmVjdEhhbmRsZXJzLlxuICAvLyBUaGV5IGFyZSBpbnNlcnRlZCBiZWZvcmUgb3VyIGRlZmF1bHQgaGFuZGxlci5cbiAgdmFyIHBhY2thZ2VBbmRBcHBIYW5kbGVycyA9IGNvbm5lY3QoKTtcbiAgYXBwLnVzZShwYWNrYWdlQW5kQXBwSGFuZGxlcnMpO1xuXG4gIHZhciBzdXBwcmVzc0Nvbm5lY3RFcnJvcnMgPSBmYWxzZTtcbiAgLy8gY29ubmVjdCBrbm93cyBpdCBpcyBhbiBlcnJvciBoYW5kbGVyIGJlY2F1c2UgaXQgaGFzIDQgYXJndW1lbnRzIGluc3RlYWQgb2ZcbiAgLy8gMy4gZ28gZmlndXJlLiAgKEl0IGlzIG5vdCBzbWFydCBlbm91Z2ggdG8gZmluZCBzdWNoIGEgdGhpbmcgaWYgaXQncyBoaWRkZW5cbiAgLy8gaW5zaWRlIHBhY2thZ2VBbmRBcHBIYW5kbGVycy4pXG4gIGFwcC51c2UoZnVuY3Rpb24gKGVyciwgcmVxLCByZXMsIG5leHQpIHtcbiAgICBpZiAoIWVyciB8fCAhc3VwcHJlc3NDb25uZWN0RXJyb3JzIHx8ICFyZXEuaGVhZGVyc1sneC1zdXBwcmVzcy1lcnJvciddKSB7XG4gICAgICBuZXh0KGVycik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJlcy53cml0ZUhlYWQoZXJyLnN0YXR1cywgeyAnQ29udGVudC1UeXBlJzogJ3RleHQvcGxhaW4nIH0pO1xuICAgIHJlcy5lbmQoXCJBbiBlcnJvciBtZXNzYWdlXCIpO1xuICB9KTtcblxuICBhcHAudXNlKGFzeW5jIGZ1bmN0aW9uIChyZXEsIHJlcywgbmV4dCkge1xuICAgIGlmICghIGFwcFVybChyZXEudXJsKSkge1xuICAgICAgcmV0dXJuIG5leHQoKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgaGVhZGVycyA9IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICd0ZXh0L2h0bWw7IGNoYXJzZXQ9dXRmLTgnXG4gICAgICB9O1xuXG4gICAgICBpZiAoc2h1dHRpbmdEb3duKSB7XG4gICAgICAgIGhlYWRlcnNbJ0Nvbm5lY3Rpb24nXSA9ICdDbG9zZSc7XG4gICAgICB9XG5cbiAgICAgIHZhciByZXF1ZXN0ID0gV2ViQXBwLmNhdGVnb3JpemVSZXF1ZXN0KHJlcSk7XG5cbiAgICAgIGlmIChyZXF1ZXN0LnVybC5xdWVyeSAmJiByZXF1ZXN0LnVybC5xdWVyeVsnbWV0ZW9yX2Nzc19yZXNvdXJjZSddKSB7XG4gICAgICAgIC8vIEluIHRoaXMgY2FzZSwgd2UncmUgcmVxdWVzdGluZyBhIENTUyByZXNvdXJjZSBpbiB0aGUgbWV0ZW9yLXNwZWNpZmljXG4gICAgICAgIC8vIHdheSwgYnV0IHdlIGRvbid0IGhhdmUgaXQuICBTZXJ2ZSBhIHN0YXRpYyBjc3MgZmlsZSB0aGF0IGluZGljYXRlcyB0aGF0XG4gICAgICAgIC8vIHdlIGRpZG4ndCBoYXZlIGl0LCBzbyB3ZSBjYW4gZGV0ZWN0IHRoYXQgYW5kIHJlZnJlc2guICBNYWtlIHN1cmVcbiAgICAgICAgLy8gdGhhdCBhbnkgcHJveGllcyBvciBDRE5zIGRvbid0IGNhY2hlIHRoaXMgZXJyb3IhICAoTm9ybWFsbHkgcHJveGllc1xuICAgICAgICAvLyBvciBDRE5zIGFyZSBzbWFydCBlbm91Z2ggbm90IHRvIGNhY2hlIGVycm9yIHBhZ2VzLCBidXQgaW4gb3JkZXIgdG9cbiAgICAgICAgLy8gbWFrZSB0aGlzIGhhY2sgd29yaywgd2UgbmVlZCB0byByZXR1cm4gdGhlIENTUyBmaWxlIGFzIGEgMjAwLCB3aGljaFxuICAgICAgICAvLyB3b3VsZCBvdGhlcndpc2UgYmUgY2FjaGVkLilcbiAgICAgICAgaGVhZGVyc1snQ29udGVudC1UeXBlJ10gPSAndGV4dC9jc3M7IGNoYXJzZXQ9dXRmLTgnO1xuICAgICAgICBoZWFkZXJzWydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy53cml0ZShcIi5tZXRlb3ItY3NzLW5vdC1mb3VuZC1lcnJvciB7IHdpZHRoOiAwcHg7fVwiKTtcbiAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXF1ZXN0LnVybC5xdWVyeSAmJiByZXF1ZXN0LnVybC5xdWVyeVsnbWV0ZW9yX2pzX3Jlc291cmNlJ10pIHtcbiAgICAgICAgLy8gU2ltaWxhcmx5LCB3ZSdyZSByZXF1ZXN0aW5nIGEgSlMgcmVzb3VyY2UgdGhhdCB3ZSBkb24ndCBoYXZlLlxuICAgICAgICAvLyBTZXJ2ZSBhbiB1bmNhY2hlZCA0MDQuIChXZSBjYW4ndCB1c2UgdGhlIHNhbWUgaGFjayB3ZSB1c2UgZm9yIENTUyxcbiAgICAgICAgLy8gYmVjYXVzZSBhY3R1YWxseSBhY3Rpbmcgb24gdGhhdCBoYWNrIHJlcXVpcmVzIHVzIHRvIGhhdmUgdGhlIEpTXG4gICAgICAgIC8vIGFscmVhZHkhKVxuICAgICAgICBoZWFkZXJzWydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICAgICByZXMud3JpdGVIZWFkKDQwNCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy5lbmQoXCI0MDQgTm90IEZvdW5kXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXF1ZXN0LnVybC5xdWVyeSAmJiByZXF1ZXN0LnVybC5xdWVyeVsnbWV0ZW9yX2RvbnRfc2VydmVfaW5kZXgnXSkge1xuICAgICAgICAvLyBXaGVuIGRvd25sb2FkaW5nIGZpbGVzIGR1cmluZyBhIENvcmRvdmEgaG90IGNvZGUgcHVzaCwgd2UgbmVlZFxuICAgICAgICAvLyB0byBkZXRlY3QgaWYgYSBmaWxlIGlzIG5vdCBhdmFpbGFibGUgaW5zdGVhZCBvZiBpbmFkdmVydGVudGx5XG4gICAgICAgIC8vIGRvd25sb2FkaW5nIHRoZSBkZWZhdWx0IGluZGV4IHBhZ2UuXG4gICAgICAgIC8vIFNvIHNpbWlsYXIgdG8gdGhlIHNpdHVhdGlvbiBhYm92ZSwgd2Ugc2VydmUgYW4gdW5jYWNoZWQgNDA0LlxuICAgICAgICBoZWFkZXJzWydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICAgICByZXMud3JpdGVIZWFkKDQwNCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy5lbmQoXCI0MDQgTm90IEZvdW5kXCIpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHsgYXJjaCB9ID0gcmVxdWVzdDtcbiAgICAgIGFzc2VydC5zdHJpY3RFcXVhbCh0eXBlb2YgYXJjaCwgXCJzdHJpbmdcIiwgeyBhcmNoIH0pO1xuXG4gICAgICBpZiAoISBoYXNPd24uY2FsbChXZWJBcHAuY2xpZW50UHJvZ3JhbXMsIGFyY2gpKSB7XG4gICAgICAgIC8vIFdlIGNvdWxkIGNvbWUgaGVyZSBpbiBjYXNlIHdlIHJ1biB3aXRoIHNvbWUgYXJjaGl0ZWN0dXJlcyBleGNsdWRlZFxuICAgICAgICBoZWFkZXJzWydDYWNoZS1Db250cm9sJ10gPSAnbm8tY2FjaGUnO1xuICAgICAgICByZXMud3JpdGVIZWFkKDQwNCwgaGVhZGVycyk7XG4gICAgICAgIGlmIChNZXRlb3IuaXNEZXZlbG9wbWVudCkge1xuICAgICAgICAgIHJlcy5lbmQoYE5vIGNsaWVudCBwcm9ncmFtIGZvdW5kIGZvciB0aGUgJHthcmNofSBhcmNoaXRlY3R1cmUuYCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gU2FmZXR5IG5ldCwgYnV0IHRoaXMgYnJhbmNoIHNob3VsZCBub3QgYmUgcG9zc2libGUuXG4gICAgICAgICAgcmVzLmVuZChcIjQwNCBOb3QgRm91bmRcIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBJZiBwYXVzZUNsaWVudChhcmNoKSBoYXMgYmVlbiBjYWxsZWQsIHByb2dyYW0ucGF1c2VkIHdpbGwgYmUgYVxuICAgICAgLy8gUHJvbWlzZSB0aGF0IHdpbGwgYmUgcmVzb2x2ZWQgd2hlbiB0aGUgcHJvZ3JhbSBpcyB1bnBhdXNlZC5cbiAgICAgIGF3YWl0IFdlYkFwcC5jbGllbnRQcm9ncmFtc1thcmNoXS5wYXVzZWQ7XG5cbiAgICAgIHJldHVybiBnZXRCb2lsZXJwbGF0ZUFzeW5jKHJlcXVlc3QsIGFyY2gpLnRoZW4oKHtcbiAgICAgICAgc3RyZWFtLFxuICAgICAgICBzdGF0dXNDb2RlLFxuICAgICAgICBoZWFkZXJzOiBuZXdIZWFkZXJzLFxuICAgICAgfSkgPT4ge1xuICAgICAgICBpZiAoIXN0YXR1c0NvZGUpIHtcbiAgICAgICAgICBzdGF0dXNDb2RlID0gcmVzLnN0YXR1c0NvZGUgPyByZXMuc3RhdHVzQ29kZSA6IDIwMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChuZXdIZWFkZXJzKSB7XG4gICAgICAgICAgT2JqZWN0LmFzc2lnbihoZWFkZXJzLCBuZXdIZWFkZXJzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcy53cml0ZUhlYWQoc3RhdHVzQ29kZSwgaGVhZGVycyk7XG5cbiAgICAgICAgc3RyZWFtLnBpcGUocmVzLCB7XG4gICAgICAgICAgLy8gRW5kIHRoZSByZXNwb25zZSB3aGVuIHRoZSBzdHJlYW0gZW5kcy5cbiAgICAgICAgICBlbmQ6IHRydWUsXG4gICAgICAgIH0pO1xuXG4gICAgICB9KS5jYXRjaChlcnJvciA9PiB7XG4gICAgICAgIExvZy5lcnJvcihcIkVycm9yIHJ1bm5pbmcgdGVtcGxhdGU6IFwiICsgZXJyb3Iuc3RhY2spO1xuICAgICAgICByZXMud3JpdGVIZWFkKDUwMCwgaGVhZGVycyk7XG4gICAgICAgIHJlcy5lbmQoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgLy8gUmV0dXJuIDQwNCBieSBkZWZhdWx0LCBpZiBubyBvdGhlciBoYW5kbGVycyBzZXJ2ZSB0aGlzIFVSTC5cbiAgYXBwLnVzZShmdW5jdGlvbiAocmVxLCByZXMpIHtcbiAgICByZXMud3JpdGVIZWFkKDQwNCk7XG4gICAgcmVzLmVuZCgpO1xuICB9KTtcblxuXG4gIHZhciBodHRwU2VydmVyID0gY3JlYXRlU2VydmVyKGFwcCk7XG4gIHZhciBvbkxpc3RlbmluZ0NhbGxiYWNrcyA9IFtdO1xuXG4gIC8vIEFmdGVyIDUgc2Vjb25kcyB3L28gZGF0YSBvbiBhIHNvY2tldCwga2lsbCBpdC4gIE9uIHRoZSBvdGhlciBoYW5kLCBpZlxuICAvLyB0aGVyZSdzIGFuIG91dHN0YW5kaW5nIHJlcXVlc3QsIGdpdmUgaXQgYSBoaWdoZXIgdGltZW91dCBpbnN0ZWFkICh0byBhdm9pZFxuICAvLyBraWxsaW5nIGxvbmctcG9sbGluZyByZXF1ZXN0cylcbiAgaHR0cFNlcnZlci5zZXRUaW1lb3V0KFNIT1JUX1NPQ0tFVF9USU1FT1VUKTtcblxuICAvLyBEbyB0aGlzIGhlcmUsIGFuZCB0aGVuIGFsc28gaW4gbGl2ZWRhdGEvc3RyZWFtX3NlcnZlci5qcywgYmVjYXVzZVxuICAvLyBzdHJlYW1fc2VydmVyLmpzIGtpbGxzIGFsbCB0aGUgY3VycmVudCByZXF1ZXN0IGhhbmRsZXJzIHdoZW4gaW5zdGFsbGluZyBpdHNcbiAgLy8gb3duLlxuICBodHRwU2VydmVyLm9uKCdyZXF1ZXN0JywgV2ViQXBwLl90aW1lb3V0QWRqdXN0bWVudFJlcXVlc3RDYWxsYmFjayk7XG5cbiAgLy8gSWYgdGhlIGNsaWVudCBnYXZlIHVzIGEgYmFkIHJlcXVlc3QsIHRlbGwgaXQgaW5zdGVhZCBvZiBqdXN0IGNsb3NpbmcgdGhlXG4gIC8vIHNvY2tldC4gVGhpcyBsZXRzIGxvYWQgYmFsYW5jZXJzIGluIGZyb250IG9mIHVzIGRpZmZlcmVudGlhdGUgYmV0d2VlbiBcImFcbiAgLy8gc2VydmVyIGlzIHJhbmRvbWx5IGNsb3Npbmcgc29ja2V0cyBmb3Igbm8gcmVhc29uXCIgYW5kIFwiY2xpZW50IHNlbnQgYSBiYWRcbiAgLy8gcmVxdWVzdFwiLlxuICAvL1xuICAvLyBUaGlzIHdpbGwgb25seSB3b3JrIG9uIE5vZGUgNjsgTm9kZSA0IGRlc3Ryb3lzIHRoZSBzb2NrZXQgYmVmb3JlIGNhbGxpbmdcbiAgLy8gdGhpcyBldmVudC4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9wdWxsLzQ1NTcvIGZvciBkZXRhaWxzLlxuICBodHRwU2VydmVyLm9uKCdjbGllbnRFcnJvcicsIChlcnIsIHNvY2tldCkgPT4ge1xuICAgIC8vIFByZS1Ob2RlLTYsIGRvIG5vdGhpbmcuXG4gICAgaWYgKHNvY2tldC5kZXN0cm95ZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZXJyLm1lc3NhZ2UgPT09ICdQYXJzZSBFcnJvcicpIHtcbiAgICAgIHNvY2tldC5lbmQoJ0hUVFAvMS4xIDQwMCBCYWQgUmVxdWVzdFxcclxcblxcclxcbicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBGb3Igb3RoZXIgZXJyb3JzLCB1c2UgdGhlIGRlZmF1bHQgYmVoYXZpb3IgYXMgaWYgd2UgaGFkIG5vIGNsaWVudEVycm9yXG4gICAgICAvLyBoYW5kbGVyLlxuICAgICAgc29ja2V0LmRlc3Ryb3koZXJyKTtcbiAgICB9XG4gIH0pO1xuXG4gIC8vIHN0YXJ0IHVwIGFwcFxuICBfLmV4dGVuZChXZWJBcHAsIHtcbiAgICBjb25uZWN0SGFuZGxlcnM6IHBhY2thZ2VBbmRBcHBIYW5kbGVycyxcbiAgICByYXdDb25uZWN0SGFuZGxlcnM6IHJhd0Nvbm5lY3RIYW5kbGVycyxcbiAgICBodHRwU2VydmVyOiBodHRwU2VydmVyLFxuICAgIGNvbm5lY3RBcHA6IGFwcCxcbiAgICAvLyBGb3IgdGVzdGluZy5cbiAgICBzdXBwcmVzc0Nvbm5lY3RFcnJvcnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN1cHByZXNzQ29ubmVjdEVycm9ycyA9IHRydWU7XG4gICAgfSxcbiAgICBvbkxpc3RlbmluZzogZnVuY3Rpb24gKGYpIHtcbiAgICAgIGlmIChvbkxpc3RlbmluZ0NhbGxiYWNrcylcbiAgICAgICAgb25MaXN0ZW5pbmdDYWxsYmFja3MucHVzaChmKTtcbiAgICAgIGVsc2VcbiAgICAgICAgZigpO1xuICAgIH0sXG4gICAgLy8gVGhpcyBjYW4gYmUgb3ZlcnJpZGRlbiBieSB1c2VycyB3aG8gd2FudCB0byBtb2RpZnkgaG93IGxpc3RlbmluZyB3b3Jrc1xuICAgIC8vIChlZywgdG8gcnVuIGEgcHJveHkgbGlrZSBBcG9sbG8gRW5naW5lIFByb3h5IGluIGZyb250IG9mIHRoZSBzZXJ2ZXIpLlxuICAgIHN0YXJ0TGlzdGVuaW5nOiBmdW5jdGlvbiAoaHR0cFNlcnZlciwgbGlzdGVuT3B0aW9ucywgY2IpIHtcbiAgICAgIGh0dHBTZXJ2ZXIubGlzdGVuKGxpc3Rlbk9wdGlvbnMsIGNiKTtcbiAgICB9LFxuICB9KTtcblxuICAvLyBMZXQgdGhlIHJlc3Qgb2YgdGhlIHBhY2thZ2VzIChhbmQgTWV0ZW9yLnN0YXJ0dXAgaG9va3MpIGluc2VydCBjb25uZWN0XG4gIC8vIG1pZGRsZXdhcmVzIGFuZCB1cGRhdGUgX19tZXRlb3JfcnVudGltZV9jb25maWdfXywgdGhlbiBrZWVwIGdvaW5nIHRvIHNldCB1cFxuICAvLyBhY3R1YWxseSBzZXJ2aW5nIEhUTUwuXG4gIGV4cG9ydHMubWFpbiA9IGFyZ3YgPT4ge1xuICAgIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlKCk7XG5cbiAgICBjb25zdCBzdGFydEh0dHBTZXJ2ZXIgPSBsaXN0ZW5PcHRpb25zID0+IHtcbiAgICAgIFdlYkFwcC5zdGFydExpc3RlbmluZyhodHRwU2VydmVyLCBsaXN0ZW5PcHRpb25zLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcbiAgICAgICAgaWYgKHByb2Nlc3MuZW52Lk1FVEVPUl9QUklOVF9PTl9MSVNURU4pIHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhcIkxJU1RFTklOR1wiKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBjYWxsYmFja3MgPSBvbkxpc3RlbmluZ0NhbGxiYWNrcztcbiAgICAgICAgb25MaXN0ZW5pbmdDYWxsYmFja3MgPSBudWxsO1xuICAgICAgICBjYWxsYmFja3MuZm9yRWFjaChjYWxsYmFjayA9PiB7IGNhbGxiYWNrKCk7IH0pO1xuICAgICAgfSwgZSA9PiB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvciBsaXN0ZW5pbmc6XCIsIGUpO1xuICAgICAgICBjb25zb2xlLmVycm9yKGUgJiYgZS5zdGFjayk7XG4gICAgICB9KSk7XG4gICAgfTtcblxuICAgIGxldCBsb2NhbFBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDA7XG4gICAgbGV0IHVuaXhTb2NrZXRQYXRoID0gcHJvY2Vzcy5lbnYuVU5JWF9TT0NLRVRfUEFUSDtcblxuICAgIGlmICh1bml4U29ja2V0UGF0aCkge1xuICAgICAgaWYgKGNsdXN0ZXIuaXNXb3JrZXIpIHtcbiAgICAgICAgY29uc3Qgd29ya2VyTmFtZSA9IGNsdXN0ZXIud29ya2VyLnByb2Nlc3MuZW52Lm5hbWUgfHwgY2x1c3Rlci53b3JrZXIuaWRcbiAgICAgICAgdW5peFNvY2tldFBhdGggKz0gXCIuXCIgKyB3b3JrZXJOYW1lICsgXCIuc29ja1wiO1xuICAgICAgfVxuICAgICAgLy8gU3RhcnQgdGhlIEhUVFAgc2VydmVyIHVzaW5nIGEgc29ja2V0IGZpbGUuXG4gICAgICByZW1vdmVFeGlzdGluZ1NvY2tldEZpbGUodW5peFNvY2tldFBhdGgpO1xuICAgICAgc3RhcnRIdHRwU2VydmVyKHsgcGF0aDogdW5peFNvY2tldFBhdGggfSk7XG4gICAgICByZWdpc3RlclNvY2tldEZpbGVDbGVhbnVwKHVuaXhTb2NrZXRQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbG9jYWxQb3J0ID0gaXNOYU4oTnVtYmVyKGxvY2FsUG9ydCkpID8gbG9jYWxQb3J0IDogTnVtYmVyKGxvY2FsUG9ydCk7XG4gICAgICBpZiAoL1xcXFxcXFxcPy4rXFxcXHBpcGVcXFxcPy4rLy50ZXN0KGxvY2FsUG9ydCkpIHtcbiAgICAgICAgLy8gU3RhcnQgdGhlIEhUVFAgc2VydmVyIHVzaW5nIFdpbmRvd3MgU2VydmVyIHN0eWxlIG5hbWVkIHBpcGUuXG4gICAgICAgIHN0YXJ0SHR0cFNlcnZlcih7IHBhdGg6IGxvY2FsUG9ydCB9KTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGxvY2FsUG9ydCA9PT0gXCJudW1iZXJcIikge1xuICAgICAgICAvLyBTdGFydCB0aGUgSFRUUCBzZXJ2ZXIgdXNpbmcgVENQLlxuICAgICAgICBzdGFydEh0dHBTZXJ2ZXIoe1xuICAgICAgICAgIHBvcnQ6IGxvY2FsUG9ydCxcbiAgICAgICAgICBob3N0OiBwcm9jZXNzLmVudi5CSU5EX0lQIHx8IFwiMC4wLjAuMFwiXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBQT1JUIHNwZWNpZmllZFwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gXCJEQUVNT05cIjtcbiAgfTtcbn1cblxudmFyIGlubGluZVNjcmlwdHNBbGxvd2VkID0gdHJ1ZTtcblxuV2ViQXBwSW50ZXJuYWxzLmlubGluZVNjcmlwdHNBbGxvd2VkID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gaW5saW5lU2NyaXB0c0FsbG93ZWQ7XG59O1xuXG5XZWJBcHBJbnRlcm5hbHMuc2V0SW5saW5lU2NyaXB0c0FsbG93ZWQgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgaW5saW5lU2NyaXB0c0FsbG93ZWQgPSB2YWx1ZTtcbiAgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQm9pbGVycGxhdGUoKTtcbn07XG5cbnZhciBzcmlNb2RlO1xuXG5XZWJBcHBJbnRlcm5hbHMuZW5hYmxlU3VicmVzb3VyY2VJbnRlZ3JpdHkgPSBmdW5jdGlvbih1c2VfY3JlZGVudGlhbHMgPSBmYWxzZSkge1xuICBzcmlNb2RlID0gdXNlX2NyZWRlbnRpYWxzID8gJ3VzZS1jcmVkZW50aWFscycgOiAnYW5vbnltb3VzJztcbiAgV2ViQXBwSW50ZXJuYWxzLmdlbmVyYXRlQm9pbGVycGxhdGUoKTtcbn07XG5cbldlYkFwcEludGVybmFscy5zZXRCdW5kbGVkSnNDc3NVcmxSZXdyaXRlSG9vayA9IGZ1bmN0aW9uIChob29rRm4pIHtcbiAgYnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2sgPSBob29rRm47XG4gIFdlYkFwcEludGVybmFscy5nZW5lcmF0ZUJvaWxlcnBsYXRlKCk7XG59O1xuXG5XZWJBcHBJbnRlcm5hbHMuc2V0QnVuZGxlZEpzQ3NzUHJlZml4ID0gZnVuY3Rpb24gKHByZWZpeCkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuc2V0QnVuZGxlZEpzQ3NzVXJsUmV3cml0ZUhvb2soXG4gICAgZnVuY3Rpb24gKHVybCkge1xuICAgICAgcmV0dXJuIHByZWZpeCArIHVybDtcbiAgfSk7XG59O1xuXG4vLyBQYWNrYWdlcyBjYW4gY2FsbCBgV2ViQXBwSW50ZXJuYWxzLmFkZFN0YXRpY0pzYCB0byBzcGVjaWZ5IHN0YXRpY1xuLy8gSmF2YVNjcmlwdCB0byBiZSBpbmNsdWRlZCBpbiB0aGUgYXBwLiBUaGlzIHN0YXRpYyBKUyB3aWxsIGJlIGlubGluZWQsXG4vLyB1bmxlc3MgaW5saW5lIHNjcmlwdHMgaGF2ZSBiZWVuIGRpc2FibGVkLCBpbiB3aGljaCBjYXNlIGl0IHdpbGwgYmVcbi8vIHNlcnZlZCB1bmRlciBgLzxzaGExIG9mIGNvbnRlbnRzPmAuXG52YXIgYWRkaXRpb25hbFN0YXRpY0pzID0ge307XG5XZWJBcHBJbnRlcm5hbHMuYWRkU3RhdGljSnMgPSBmdW5jdGlvbiAoY29udGVudHMpIHtcbiAgYWRkaXRpb25hbFN0YXRpY0pzW1wiL1wiICsgc2hhMShjb250ZW50cykgKyBcIi5qc1wiXSA9IGNvbnRlbnRzO1xufTtcblxuLy8gRXhwb3J0ZWQgZm9yIHRlc3RzXG5XZWJBcHBJbnRlcm5hbHMuZ2V0Qm9pbGVycGxhdGUgPSBnZXRCb2lsZXJwbGF0ZTtcbldlYkFwcEludGVybmFscy5hZGRpdGlvbmFsU3RhdGljSnMgPSBhZGRpdGlvbmFsU3RhdGljSnM7XG5cbi8vIFN0YXJ0IHRoZSBzZXJ2ZXIhXG5ydW5XZWJBcHBTZXJ2ZXIoKTtcbiIsImltcG9ydCBucG1Db25uZWN0IGZyb20gXCJjb25uZWN0XCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb25uZWN0KC4uLmNvbm5lY3RBcmdzKSB7XG4gIGNvbnN0IGhhbmRsZXJzID0gbnBtQ29ubmVjdC5hcHBseSh0aGlzLCBjb25uZWN0QXJncyk7XG4gIGNvbnN0IG9yaWdpbmFsVXNlID0gaGFuZGxlcnMudXNlO1xuXG4gIC8vIFdyYXAgdGhlIGhhbmRsZXJzLnVzZSBtZXRob2Qgc28gdGhhdCBhbnkgcHJvdmlkZWQgaGFuZGxlciBmdW5jdGlvbnNcbiAgLy8gYWx3YXkgcnVuIGluIGEgRmliZXIuXG4gIGhhbmRsZXJzLnVzZSA9IGZ1bmN0aW9uIHVzZSguLi51c2VBcmdzKSB7XG4gICAgY29uc3QgeyBzdGFjayB9ID0gdGhpcztcbiAgICBjb25zdCBvcmlnaW5hbExlbmd0aCA9IHN0YWNrLmxlbmd0aDtcbiAgICBjb25zdCByZXN1bHQgPSBvcmlnaW5hbFVzZS5hcHBseSh0aGlzLCB1c2VBcmdzKTtcblxuICAgIC8vIElmIHdlIGp1c3QgYWRkZWQgYW55dGhpbmcgdG8gdGhlIHN0YWNrLCB3cmFwIGVhY2ggbmV3IGVudHJ5LmhhbmRsZVxuICAgIC8vIHdpdGggYSBmdW5jdGlvbiB0aGF0IGNhbGxzIFByb21pc2UuYXN5bmNBcHBseSB0byBlbnN1cmUgdGhlXG4gICAgLy8gb3JpZ2luYWwgaGFuZGxlciBydW5zIGluIGEgRmliZXIuXG4gICAgZm9yIChsZXQgaSA9IG9yaWdpbmFsTGVuZ3RoOyBpIDwgc3RhY2subGVuZ3RoOyArK2kpIHtcbiAgICAgIGNvbnN0IGVudHJ5ID0gc3RhY2tbaV07XG4gICAgICBjb25zdCBvcmlnaW5hbEhhbmRsZSA9IGVudHJ5LmhhbmRsZTtcblxuICAgICAgaWYgKG9yaWdpbmFsSGFuZGxlLmxlbmd0aCA+PSA0KSB7XG4gICAgICAgIC8vIElmIHRoZSBvcmlnaW5hbCBoYW5kbGUgaGFkIGZvdXIgKG9yIG1vcmUpIHBhcmFtZXRlcnMsIHRoZVxuICAgICAgICAvLyB3cmFwcGVyIG11c3QgYWxzbyBoYXZlIGZvdXIgcGFyYW1ldGVycywgc2luY2UgY29ubmVjdCB1c2VzXG4gICAgICAgIC8vIGhhbmRsZS5sZW5ndGggdG8gZGVybWluZSB3aGV0aGVyIHRvIHBhc3MgdGhlIGVycm9yIGFzIHRoZSBmaXJzdFxuICAgICAgICAvLyBhcmd1bWVudCB0byB0aGUgaGFuZGxlIGZ1bmN0aW9uLlxuICAgICAgICBlbnRyeS5oYW5kbGUgPSBmdW5jdGlvbiBoYW5kbGUoZXJyLCByZXEsIHJlcywgbmV4dCkge1xuICAgICAgICAgIHJldHVybiBQcm9taXNlLmFzeW5jQXBwbHkob3JpZ2luYWxIYW5kbGUsIHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbnRyeS5oYW5kbGUgPSBmdW5jdGlvbiBoYW5kbGUocmVxLCByZXMsIG5leHQpIHtcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hc3luY0FwcGx5KG9yaWdpbmFsSGFuZGxlLCB0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgcmV0dXJuIGhhbmRsZXJzO1xufVxuIiwiaW1wb3J0IHsgc3RhdFN5bmMsIHVubGlua1N5bmMsIGV4aXN0c1N5bmMgfSBmcm9tICdmcyc7XG5cbi8vIFNpbmNlIGEgbmV3IHNvY2tldCBmaWxlIHdpbGwgYmUgY3JlYXRlZCB3aGVuIHRoZSBIVFRQIHNlcnZlclxuLy8gc3RhcnRzIHVwLCBpZiBmb3VuZCByZW1vdmUgdGhlIGV4aXN0aW5nIGZpbGUuXG4vL1xuLy8gV0FSTklORzpcbi8vIFRoaXMgd2lsbCByZW1vdmUgdGhlIGNvbmZpZ3VyZWQgc29ja2V0IGZpbGUgd2l0aG91dCB3YXJuaW5nLiBJZlxuLy8gdGhlIGNvbmZpZ3VyZWQgc29ja2V0IGZpbGUgaXMgYWxyZWFkeSBpbiB1c2UgYnkgYW5vdGhlciBhcHBsaWNhdGlvbixcbi8vIGl0IHdpbGwgc3RpbGwgYmUgcmVtb3ZlZC4gTm9kZSBkb2VzIG5vdCBwcm92aWRlIGEgcmVsaWFibGUgd2F5IHRvXG4vLyBkaWZmZXJlbnRpYXRlIGJldHdlZW4gYSBzb2NrZXQgZmlsZSB0aGF0IGlzIGFscmVhZHkgaW4gdXNlIGJ5XG4vLyBhbm90aGVyIGFwcGxpY2F0aW9uIG9yIGEgc3RhbGUgc29ja2V0IGZpbGUgdGhhdCBoYXMgYmVlblxuLy8gbGVmdCBvdmVyIGFmdGVyIGEgU0lHS0lMTC4gU2luY2Ugd2UgaGF2ZSBubyByZWxpYWJsZSB3YXkgdG9cbi8vIGRpZmZlcmVudGlhdGUgYmV0d2VlbiB0aGVzZSB0d28gc2NlbmFyaW9zLCB0aGUgYmVzdCBjb3Vyc2Ugb2Zcbi8vIGFjdGlvbiBkdXJpbmcgc3RhcnR1cCBpcyB0byByZW1vdmUgYW55IGV4aXN0aW5nIHNvY2tldCBmaWxlLiBUaGlzXG4vLyBpcyBub3QgdGhlIHNhZmVzdCBjb3Vyc2Ugb2YgYWN0aW9uIGFzIHJlbW92aW5nIHRoZSBleGlzdGluZyBzb2NrZXRcbi8vIGZpbGUgY291bGQgaW1wYWN0IGFuIGFwcGxpY2F0aW9uIHVzaW5nIGl0LCBidXQgdGhpcyBhcHByb2FjaCBoZWxwc1xuLy8gZW5zdXJlIHRoZSBIVFRQIHNlcnZlciBjYW4gc3RhcnR1cCB3aXRob3V0IG1hbnVhbFxuLy8gaW50ZXJ2ZW50aW9uIChlLmcuIGFza2luZyBmb3IgdGhlIHZlcmlmaWNhdGlvbiBhbmQgY2xlYW51cCBvZiBzb2NrZXRcbi8vIGZpbGVzIGJlZm9yZSBhbGxvd2luZyB0aGUgSFRUUCBzZXJ2ZXIgdG8gYmUgc3RhcnRlZCkuXG4vL1xuLy8gVGhlIGFib3ZlIGJlaW5nIHNhaWQsIGFzIGxvbmcgYXMgdGhlIHNvY2tldCBmaWxlIHBhdGggaXNcbi8vIGNvbmZpZ3VyZWQgY2FyZWZ1bGx5IHdoZW4gdGhlIGFwcGxpY2F0aW9uIGlzIGRlcGxveWVkIChhbmQgZXh0cmFcbi8vIGNhcmUgaXMgdGFrZW4gdG8gbWFrZSBzdXJlIHRoZSBjb25maWd1cmVkIHBhdGggaXMgdW5pcXVlIGFuZCBkb2Vzbid0XG4vLyBjb25mbGljdCB3aXRoIGFub3RoZXIgc29ja2V0IGZpbGUgcGF0aCksIHRoZW4gdGhlcmUgc2hvdWxkIG5vdCBiZVxuLy8gYW55IGlzc3VlcyB3aXRoIHRoaXMgYXBwcm9hY2guXG5leHBvcnQgY29uc3QgcmVtb3ZlRXhpc3RpbmdTb2NrZXRGaWxlID0gKHNvY2tldFBhdGgpID0+IHtcbiAgdHJ5IHtcbiAgICBpZiAoc3RhdFN5bmMoc29ja2V0UGF0aCkuaXNTb2NrZXQoKSkge1xuICAgICAgLy8gU2luY2UgYSBuZXcgc29ja2V0IGZpbGUgd2lsbCBiZSBjcmVhdGVkLCByZW1vdmUgdGhlIGV4aXN0aW5nXG4gICAgICAvLyBmaWxlLlxuICAgICAgdW5saW5rU3luYyhzb2NrZXRQYXRoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgQW4gZXhpc3RpbmcgZmlsZSB3YXMgZm91bmQgYXQgXCIke3NvY2tldFBhdGh9XCIgYW5kIGl0IGlzIG5vdCBgICtcbiAgICAgICAgJ2Egc29ja2V0IGZpbGUuIFBsZWFzZSBjb25maXJtIFBPUlQgaXMgcG9pbnRpbmcgdG8gdmFsaWQgYW5kICcgK1xuICAgICAgICAndW4tdXNlZCBzb2NrZXQgZmlsZSBwYXRoLidcbiAgICAgICk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIC8vIElmIHRoZXJlIGlzIG5vIGV4aXN0aW5nIHNvY2tldCBmaWxlIHRvIGNsZWFudXAsIGdyZWF0LCB3ZSdsbFxuICAgIC8vIGNvbnRpbnVlIG5vcm1hbGx5LiBJZiB0aGUgY2F1Z2h0IGV4Y2VwdGlvbiByZXByZXNlbnRzIGFueSBvdGhlclxuICAgIC8vIGlzc3VlLCByZS10aHJvdy5cbiAgICBpZiAoZXJyb3IuY29kZSAhPT0gJ0VOT0VOVCcpIHtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxufTtcblxuLy8gUmVtb3ZlIHRoZSBzb2NrZXQgZmlsZSB3aGVuIGRvbmUgdG8gYXZvaWQgbGVhdmluZyBiZWhpbmQgYSBzdGFsZSBvbmUuXG4vLyBOb3RlIC0gYSBzdGFsZSBzb2NrZXQgZmlsZSBpcyBzdGlsbCBsZWZ0IGJlaGluZCBpZiB0aGUgcnVubmluZyBub2RlXG4vLyBwcm9jZXNzIGlzIGtpbGxlZCB2aWEgc2lnbmFsIDkgLSBTSUdLSUxMLlxuZXhwb3J0IGNvbnN0IHJlZ2lzdGVyU29ja2V0RmlsZUNsZWFudXAgPVxuICAoc29ja2V0UGF0aCwgZXZlbnRFbWl0dGVyID0gcHJvY2VzcykgPT4ge1xuICAgIFsnZXhpdCcsICdTSUdJTlQnLCAnU0lHSFVQJywgJ1NJR1RFUk0nXS5mb3JFYWNoKHNpZ25hbCA9PiB7XG4gICAgICBldmVudEVtaXR0ZXIub24oc2lnbmFsLCBNZXRlb3IuYmluZEVudmlyb25tZW50KCgpID0+IHtcbiAgICAgICAgaWYgKGV4aXN0c1N5bmMoc29ja2V0UGF0aCkpIHtcbiAgICAgICAgICB1bmxpbmtTeW5jKHNvY2tldFBhdGgpO1xuICAgICAgICB9XG4gICAgICB9KSk7XG4gICAgfSk7XG4gIH07XG4iXX0=
