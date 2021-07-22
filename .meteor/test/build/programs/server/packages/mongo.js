(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var NpmModuleMongodb = Package['npm-mongo'].NpmModuleMongodb;
var NpmModuleMongodbVersion = Package['npm-mongo'].NpmModuleMongodbVersion;
var AllowDeny = Package['allow-deny'].AllowDeny;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var LocalCollection = Package.minimongo.LocalCollection;
var Minimongo = Package.minimongo.Minimongo;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var Tracker = Package.tracker.Tracker;
var Deps = Package.tracker.Deps;
var DiffSequence = Package['diff-sequence'].DiffSequence;
var MongoID = Package['mongo-id'].MongoID;
var check = Package.check.check;
var Match = Package.check.Match;
var ECMAScript = Package.ecmascript.ECMAScript;
var Decimal = Package['mongo-decimal'].Decimal;
var _ = Package.underscore._;
var MaxHeap = Package['binary-heap'].MaxHeap;
var MinHeap = Package['binary-heap'].MinHeap;
var MinMaxHeap = Package['binary-heap'].MinMaxHeap;
var Hook = Package['callback-hook'].Hook;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var MongoInternals, MongoConnection, CursorDescription, Cursor, listenAll, forEachTrigger, OPLOG_COLLECTION, idForOp, OplogHandle, ObserveMultiplexer, ObserveHandle, PollingObserveDriver, OplogObserveDriver, Mongo, selector, callback, options;

var require = meteorInstall({"node_modules":{"meteor":{"mongo":{"mongo_driver.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/mongo_driver.js                                                                                      //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  let _objectSpread;

  module1.link("@babel/runtime/helpers/objectSpread2", {
    default(v) {
      _objectSpread = v;
    }

  }, 0);
  let DocFetcher;
  module1.link("./doc_fetcher.js", {
    DocFetcher(v) {
      DocFetcher = v;
    }

  }, 0);

  /**
   * Provide a synchronous Collection API using fibers, backed by
   * MongoDB.  This is only for use on the server, and mostly identical
   * to the client API.
   *
   * NOTE: the public API methods must be run within a fiber. If you call
   * these outside of a fiber they will explode!
   */
  const path = require("path");

  var MongoDB = NpmModuleMongodb;

  var Future = Npm.require('fibers/future');

  MongoInternals = {};
  MongoInternals.NpmModules = {
    mongodb: {
      version: NpmModuleMongodbVersion,
      module: MongoDB
    }
  }; // Older version of what is now available via
  // MongoInternals.NpmModules.mongodb.module.  It was never documented, but
  // people do use it.
  // XXX COMPAT WITH 1.0.3.2

  MongoInternals.NpmModule = MongoDB;
  const FILE_ASSET_SUFFIX = 'Asset';
  const ASSETS_FOLDER = 'assets';
  const APP_FOLDER = 'app'; // This is used to add or remove EJSON from the beginning of everything nested
  // inside an EJSON custom type. It should only be called on pure JSON!

  var replaceNames = function (filter, thing) {
    if (typeof thing === "object" && thing !== null) {
      if (_.isArray(thing)) {
        return _.map(thing, _.bind(replaceNames, null, filter));
      }

      var ret = {};

      _.each(thing, function (value, key) {
        ret[filter(key)] = replaceNames(filter, value);
      });

      return ret;
    }

    return thing;
  }; // Ensure that EJSON.clone keeps a Timestamp as a Timestamp (instead of just
  // doing a structural clone).
  // XXX how ok is this? what if there are multiple copies of MongoDB loaded?


  MongoDB.Timestamp.prototype.clone = function () {
    // Timestamps should be immutable.
    return this;
  };

  var makeMongoLegal = function (name) {
    return "EJSON" + name;
  };

  var unmakeMongoLegal = function (name) {
    return name.substr(5);
  };

  var replaceMongoAtomWithMeteor = function (document) {
    if (document instanceof MongoDB.Binary) {
      var buffer = document.value(true);
      return new Uint8Array(buffer);
    }

    if (document instanceof MongoDB.ObjectID) {
      return new Mongo.ObjectID(document.toHexString());
    }

    if (document instanceof MongoDB.Decimal128) {
      return Decimal(document.toString());
    }

    if (document["EJSON$type"] && document["EJSON$value"] && _.size(document) === 2) {
      return EJSON.fromJSONValue(replaceNames(unmakeMongoLegal, document));
    }

    if (document instanceof MongoDB.Timestamp) {
      // For now, the Meteor representation of a Mongo timestamp type (not a date!
      // this is a weird internal thing used in the oplog!) is the same as the
      // Mongo representation. We need to do this explicitly or else we would do a
      // structural clone and lose the prototype.
      return document;
    }

    return undefined;
  };

  var replaceMeteorAtomWithMongo = function (document) {
    if (EJSON.isBinary(document)) {
      // This does more copies than we'd like, but is necessary because
      // MongoDB.BSON only looks like it takes a Uint8Array (and doesn't actually
      // serialize it correctly).
      return new MongoDB.Binary(Buffer.from(document));
    }

    if (document instanceof Mongo.ObjectID) {
      return new MongoDB.ObjectID(document.toHexString());
    }

    if (document instanceof MongoDB.Timestamp) {
      // For now, the Meteor representation of a Mongo timestamp type (not a date!
      // this is a weird internal thing used in the oplog!) is the same as the
      // Mongo representation. We need to do this explicitly or else we would do a
      // structural clone and lose the prototype.
      return document;
    }

    if (document instanceof Decimal) {
      return MongoDB.Decimal128.fromString(document.toString());
    }

    if (EJSON._isCustomType(document)) {
      return replaceNames(makeMongoLegal, EJSON.toJSONValue(document));
    } // It is not ordinarily possible to stick dollar-sign keys into mongo
    // so we don't bother checking for things that need escaping at this time.


    return undefined;
  };

  var replaceTypes = function (document, atomTransformer) {
    if (typeof document !== 'object' || document === null) return document;
    var replacedTopLevelAtom = atomTransformer(document);
    if (replacedTopLevelAtom !== undefined) return replacedTopLevelAtom;
    var ret = document;

    _.each(document, function (val, key) {
      var valReplaced = replaceTypes(val, atomTransformer);

      if (val !== valReplaced) {
        // Lazy clone. Shallow copy.
        if (ret === document) ret = _.clone(document);
        ret[key] = valReplaced;
      }
    });

    return ret;
  };

  MongoConnection = function (url, options) {
    var _Meteor$settings, _Meteor$settings$pack, _Meteor$settings$pack2;

    var self = this;
    options = options || {};
    self._observeMultiplexers = {};
    self._onFailoverHook = new Hook();

    const userOptions = _objectSpread(_objectSpread({}, Mongo._connectionOptions || {}), ((_Meteor$settings = Meteor.settings) === null || _Meteor$settings === void 0 ? void 0 : (_Meteor$settings$pack = _Meteor$settings.packages) === null || _Meteor$settings$pack === void 0 ? void 0 : (_Meteor$settings$pack2 = _Meteor$settings$pack.mongo) === null || _Meteor$settings$pack2 === void 0 ? void 0 : _Meteor$settings$pack2.options) || {});

    var mongoOptions = Object.assign({
      ignoreUndefined: true,
      // (node:59240) [MONGODB DRIVER] Warning: Current Server Discovery and
      // Monitoring engine is deprecated, and will be removed in a future version.
      // To use the new Server Discover and Monitoring engine, pass option
      // { useUnifiedTopology: true } to the MongoClient constructor.
      useUnifiedTopology: true
    }, userOptions); // The autoReconnect and reconnectTries options are incompatible with
    // useUnifiedTopology: https://github.com/meteor/meteor/pull/10861#commitcomment-37525845

    if (!mongoOptions.useUnifiedTopology) {
      // Reconnect on error. This defaults to true, but it never hurts to be
      // explicit about it.
      mongoOptions.autoReconnect = true; // Try to reconnect forever, instead of stopping after 30 tries (the
      // default), with each attempt separated by 1000ms.

      mongoOptions.reconnectTries = Infinity;
    } // Disable the native parser by default, unless specifically enabled
    // in the mongo URL.
    // - The native driver can cause errors which normally would be
    //   thrown, caught, and handled into segfaults that take down the
    //   whole app.
    // - Binary modules don't yet work when you bundle and move the bundle
    //   to a different platform (aka deploy)
    // We should revisit this after binary npm module support lands.


    if (!/[\?&]native_?[pP]arser=/.test(url)) {
      mongoOptions.native_parser = false;
    } // Internally the oplog connections specify their own poolSize
    // which we don't want to overwrite with any user defined value


    if (_.has(options, 'poolSize')) {
      // If we just set this for "server", replSet will override it. If we just
      // set it for replSet, it will be ignored if we're not using a replSet.
      mongoOptions.poolSize = options.poolSize;
    } // Transform options like "tlsCAFileAsset": "filename.pem" into
    // "tlsCAFile": "/<fullpath>/filename.pem"


    Object.entries(mongoOptions || {}).filter((_ref) => {
      let [key] = _ref;
      return key && key.endsWith(FILE_ASSET_SUFFIX);
    }).forEach((_ref2) => {
      let [key, value] = _ref2;
      const optionName = key.replace(FILE_ASSET_SUFFIX, '');
      mongoOptions[optionName] = path.join(Assets.getServerDir(), ASSETS_FOLDER, APP_FOLDER, value);
      delete mongoOptions[key];
    });
    self.db = null; // We keep track of the ReplSet's primary, so that we can trigger hooks when
    // it changes.  The Node driver's joined callback seems to fire way too
    // often, which is why we need to track it ourselves.

    self._primary = null;
    self._oplogHandle = null;
    self._docFetcher = null;
    var connectFuture = new Future();
    MongoDB.connect(url, mongoOptions, Meteor.bindEnvironment(function (err, client) {
      if (err) {
        throw err;
      }

      var db = client.db(); // First, figure out what the current primary is, if any.

      if (db.serverConfig.isMasterDoc) {
        self._primary = db.serverConfig.isMasterDoc.primary;
      }

      db.serverConfig.on('joined', Meteor.bindEnvironment(function (kind, doc) {
        if (kind === 'primary') {
          if (doc.primary !== self._primary) {
            self._primary = doc.primary;

            self._onFailoverHook.each(function (callback) {
              callback();
              return true;
            });
          }
        } else if (doc.me === self._primary) {
          // The thing we thought was primary is now something other than
          // primary.  Forget that we thought it was primary.  (This means
          // that if a server stops being primary and then starts being
          // primary again without another server becoming primary in the
          // middle, we'll correctly count it as a failover.)
          self._primary = null;
        }
      })); // Allow the constructor to return.

      connectFuture['return']({
        client,
        db
      });
    }, connectFuture.resolver() // onException
    )); // Wait for the connection to be successful (throws on failure) and assign the
    // results (`client` and `db`) to `self`.

    Object.assign(self, connectFuture.wait());

    if (options.oplogUrl && !Package['disable-oplog']) {
      self._oplogHandle = new OplogHandle(options.oplogUrl, self.db.databaseName);
      self._docFetcher = new DocFetcher(self);
    }
  };

  MongoConnection.prototype.close = function () {
    var self = this;
    if (!self.db) throw Error("close called before Connection created?"); // XXX probably untested

    var oplogHandle = self._oplogHandle;
    self._oplogHandle = null;
    if (oplogHandle) oplogHandle.stop(); // Use Future.wrap so that errors get thrown. This happens to
    // work even outside a fiber since the 'close' method is not
    // actually asynchronous.

    Future.wrap(_.bind(self.client.close, self.client))(true).wait();
  }; // Returns the Mongo Collection object; may yield.


  MongoConnection.prototype.rawCollection = function (collectionName) {
    var self = this;
    if (!self.db) throw Error("rawCollection called before Connection created?");
    var future = new Future();
    self.db.collection(collectionName, future.resolver());
    return future.wait();
  };

  MongoConnection.prototype._createCappedCollection = function (collectionName, byteSize, maxDocuments) {
    var self = this;
    if (!self.db) throw Error("_createCappedCollection called before Connection created?");
    var future = new Future();
    self.db.createCollection(collectionName, {
      capped: true,
      size: byteSize,
      max: maxDocuments
    }, future.resolver());
    future.wait();
  }; // This should be called synchronously with a write, to create a
  // transaction on the current write fence, if any. After we can read
  // the write, and after observers have been notified (or at least,
  // after the observer notifiers have added themselves to the write
  // fence), you should call 'committed()' on the object returned.


  MongoConnection.prototype._maybeBeginWrite = function () {
    var fence = DDPServer._CurrentWriteFence.get();

    if (fence) {
      return fence.beginWrite();
    } else {
      return {
        committed: function () {}
      };
    }
  }; // Internal interface: adds a callback which is called when the Mongo primary
  // changes. Returns a stop handle.


  MongoConnection.prototype._onFailover = function (callback) {
    return this._onFailoverHook.register(callback);
  }; //////////// Public API //////////
  // The write methods block until the database has confirmed the write (it may
  // not be replicated or stable on disk, but one server has confirmed it) if no
  // callback is provided. If a callback is provided, then they call the callback
  // when the write is confirmed. They return nothing on success, and raise an
  // exception on failure.
  //
  // After making a write (with insert, update, remove), observers are
  // notified asynchronously. If you want to receive a callback once all
  // of the observer notifications have landed for your write, do the
  // writes inside a write fence (set DDPServer._CurrentWriteFence to a new
  // _WriteFence, and then set a callback on the write fence.)
  //
  // Since our execution environment is single-threaded, this is
  // well-defined -- a write "has been made" if it's returned, and an
  // observer "has been notified" if its callback has returned.


  var writeCallback = function (write, refresh, callback) {
    return function (err, result) {
      if (!err) {
        // XXX We don't have to run this on error, right?
        try {
          refresh();
        } catch (refreshErr) {
          if (callback) {
            callback(refreshErr);
            return;
          } else {
            throw refreshErr;
          }
        }
      }

      write.committed();

      if (callback) {
        callback(err, result);
      } else if (err) {
        throw err;
      }
    };
  };

  var bindEnvironmentForWrite = function (callback) {
    return Meteor.bindEnvironment(callback, "Mongo write");
  };

  MongoConnection.prototype._insert = function (collection_name, document, callback) {
    var self = this;

    var sendError = function (e) {
      if (callback) return callback(e);
      throw e;
    };

    if (collection_name === "___meteor_failure_test_collection") {
      var e = new Error("Failure test");
      e._expectedByTest = true;
      sendError(e);
      return;
    }

    if (!(LocalCollection._isPlainObject(document) && !EJSON._isCustomType(document))) {
      sendError(new Error("Only plain objects may be inserted into MongoDB"));
      return;
    }

    var write = self._maybeBeginWrite();

    var refresh = function () {
      Meteor.refresh({
        collection: collection_name,
        id: document._id
      });
    };

    callback = bindEnvironmentForWrite(writeCallback(write, refresh, callback));

    try {
      var collection = self.rawCollection(collection_name);
      collection.insert(replaceTypes(document, replaceMeteorAtomWithMongo), {
        safe: true
      }, callback);
    } catch (err) {
      write.committed();
      throw err;
    }
  }; // Cause queries that may be affected by the selector to poll in this write
  // fence.


  MongoConnection.prototype._refresh = function (collectionName, selector) {
    var refreshKey = {
      collection: collectionName
    }; // If we know which documents we're removing, don't poll queries that are
    // specific to other documents. (Note that multiple notifications here should
    // not cause multiple polls, since all our listener is doing is enqueueing a
    // poll.)

    var specificIds = LocalCollection._idsMatchedBySelector(selector);

    if (specificIds) {
      _.each(specificIds, function (id) {
        Meteor.refresh(_.extend({
          id: id
        }, refreshKey));
      });
    } else {
      Meteor.refresh(refreshKey);
    }
  };

  MongoConnection.prototype._remove = function (collection_name, selector, callback) {
    var self = this;

    if (collection_name === "___meteor_failure_test_collection") {
      var e = new Error("Failure test");
      e._expectedByTest = true;

      if (callback) {
        return callback(e);
      } else {
        throw e;
      }
    }

    var write = self._maybeBeginWrite();

    var refresh = function () {
      self._refresh(collection_name, selector);
    };

    callback = bindEnvironmentForWrite(writeCallback(write, refresh, callback));

    try {
      var collection = self.rawCollection(collection_name);

      var wrappedCallback = function (err, driverResult) {
        callback(err, transformResult(driverResult).numberAffected);
      };

      collection.remove(replaceTypes(selector, replaceMeteorAtomWithMongo), {
        safe: true
      }, wrappedCallback);
    } catch (err) {
      write.committed();
      throw err;
    }
  };

  MongoConnection.prototype._dropCollection = function (collectionName, cb) {
    var self = this;

    var write = self._maybeBeginWrite();

    var refresh = function () {
      Meteor.refresh({
        collection: collectionName,
        id: null,
        dropCollection: true
      });
    };

    cb = bindEnvironmentForWrite(writeCallback(write, refresh, cb));

    try {
      var collection = self.rawCollection(collectionName);
      collection.drop(cb);
    } catch (e) {
      write.committed();
      throw e;
    }
  }; // For testing only.  Slightly better than `c.rawDatabase().dropDatabase()`
  // because it lets the test's fence wait for it to be complete.


  MongoConnection.prototype._dropDatabase = function (cb) {
    var self = this;

    var write = self._maybeBeginWrite();

    var refresh = function () {
      Meteor.refresh({
        dropDatabase: true
      });
    };

    cb = bindEnvironmentForWrite(writeCallback(write, refresh, cb));

    try {
      self.db.dropDatabase(cb);
    } catch (e) {
      write.committed();
      throw e;
    }
  };

  MongoConnection.prototype._update = function (collection_name, selector, mod, options, callback) {
    var self = this;

    if (!callback && options instanceof Function) {
      callback = options;
      options = null;
    }

    if (collection_name === "___meteor_failure_test_collection") {
      var e = new Error("Failure test");
      e._expectedByTest = true;

      if (callback) {
        return callback(e);
      } else {
        throw e;
      }
    } // explicit safety check. null and undefined can crash the mongo
    // driver. Although the node driver and minimongo do 'support'
    // non-object modifier in that they don't crash, they are not
    // meaningful operations and do not do anything. Defensively throw an
    // error here.


    if (!mod || typeof mod !== 'object') throw new Error("Invalid modifier. Modifier must be an object.");

    if (!(LocalCollection._isPlainObject(mod) && !EJSON._isCustomType(mod))) {
      throw new Error("Only plain objects may be used as replacement" + " documents in MongoDB");
    }

    if (!options) options = {};

    var write = self._maybeBeginWrite();

    var refresh = function () {
      self._refresh(collection_name, selector);
    };

    callback = writeCallback(write, refresh, callback);

    try {
      var collection = self.rawCollection(collection_name);
      var mongoOpts = {
        safe: true
      }; // Add support for filtered positional operator

      if (options.arrayFilters !== undefined) mongoOpts.arrayFilters = options.arrayFilters; // explictly enumerate options that minimongo supports

      if (options.upsert) mongoOpts.upsert = true;
      if (options.multi) mongoOpts.multi = true; // Lets you get a more more full result from MongoDB. Use with caution:
      // might not work with C.upsert (as opposed to C.update({upsert:true}) or
      // with simulated upsert.

      if (options.fullResult) mongoOpts.fullResult = true;
      var mongoSelector = replaceTypes(selector, replaceMeteorAtomWithMongo);
      var mongoMod = replaceTypes(mod, replaceMeteorAtomWithMongo);

      var isModify = LocalCollection._isModificationMod(mongoMod);

      if (options._forbidReplace && !isModify) {
        var err = new Error("Invalid modifier. Replacements are forbidden.");

        if (callback) {
          return callback(err);
        } else {
          throw err;
        }
      } // We've already run replaceTypes/replaceMeteorAtomWithMongo on
      // selector and mod.  We assume it doesn't matter, as far as
      // the behavior of modifiers is concerned, whether `_modify`
      // is run on EJSON or on mongo-converted EJSON.
      // Run this code up front so that it fails fast if someone uses
      // a Mongo update operator we don't support.


      let knownId;

      if (options.upsert) {
        try {
          let newDoc = LocalCollection._createUpsertDocument(selector, mod);

          knownId = newDoc._id;
        } catch (err) {
          if (callback) {
            return callback(err);
          } else {
            throw err;
          }
        }
      }

      if (options.upsert && !isModify && !knownId && options.insertedId && !(options.insertedId instanceof Mongo.ObjectID && options.generatedId)) {
        // In case of an upsert with a replacement, where there is no _id defined
        // in either the query or the replacement doc, mongo will generate an id itself.
        // Therefore we need this special strategy if we want to control the id ourselves.
        // We don't need to do this when:
        // - This is not a replacement, so we can add an _id to $setOnInsert
        // - The id is defined by query or mod we can just add it to the replacement doc
        // - The user did not specify any id preference and the id is a Mongo ObjectId,
        //     then we can just let Mongo generate the id
        simulateUpsertWithInsertedId(collection, mongoSelector, mongoMod, options, // This callback does not need to be bindEnvironment'ed because
        // simulateUpsertWithInsertedId() wraps it and then passes it through
        // bindEnvironmentForWrite.
        function (error, result) {
          // If we got here via a upsert() call, then options._returnObject will
          // be set and we should return the whole object. Otherwise, we should
          // just return the number of affected docs to match the mongo API.
          if (result && !options._returnObject) {
            callback(error, result.numberAffected);
          } else {
            callback(error, result);
          }
        });
      } else {
        if (options.upsert && !knownId && options.insertedId && isModify) {
          if (!mongoMod.hasOwnProperty('$setOnInsert')) {
            mongoMod.$setOnInsert = {};
          }

          knownId = options.insertedId;
          Object.assign(mongoMod.$setOnInsert, replaceTypes({
            _id: options.insertedId
          }, replaceMeteorAtomWithMongo));
        }

        collection.update(mongoSelector, mongoMod, mongoOpts, bindEnvironmentForWrite(function (err, result) {
          if (!err) {
            var meteorResult = transformResult(result);

            if (meteorResult && options._returnObject) {
              // If this was an upsert() call, and we ended up
              // inserting a new doc and we know its id, then
              // return that id as well.
              if (options.upsert && meteorResult.insertedId) {
                if (knownId) {
                  meteorResult.insertedId = knownId;
                } else if (meteorResult.insertedId instanceof MongoDB.ObjectID) {
                  meteorResult.insertedId = new Mongo.ObjectID(meteorResult.insertedId.toHexString());
                }
              }

              callback(err, meteorResult);
            } else {
              callback(err, meteorResult.numberAffected);
            }
          } else {
            callback(err);
          }
        }));
      }
    } catch (e) {
      write.committed();
      throw e;
    }
  };

  var transformResult = function (driverResult) {
    var meteorResult = {
      numberAffected: 0
    };

    if (driverResult) {
      var mongoResult = driverResult.result; // On updates with upsert:true, the inserted values come as a list of
      // upserted values -- even with options.multi, when the upsert does insert,
      // it only inserts one element.

      if (mongoResult.upserted) {
        meteorResult.numberAffected += mongoResult.upserted.length;

        if (mongoResult.upserted.length == 1) {
          meteorResult.insertedId = mongoResult.upserted[0]._id;
        }
      } else {
        meteorResult.numberAffected = mongoResult.n;
      }
    }

    return meteorResult;
  };

  var NUM_OPTIMISTIC_TRIES = 3; // exposed for testing

  MongoConnection._isCannotChangeIdError = function (err) {
    // Mongo 3.2.* returns error as next Object:
    // {name: String, code: Number, errmsg: String}
    // Older Mongo returns:
    // {name: String, code: Number, err: String}
    var error = err.errmsg || err.err; // We don't use the error code here
    // because the error code we observed it producing (16837) appears to be
    // a far more generic error code based on examining the source.

    if (error.indexOf('The _id field cannot be changed') === 0 || error.indexOf("the (immutable) field '_id' was found to have been altered to _id") !== -1) {
      return true;
    }

    return false;
  };

  var simulateUpsertWithInsertedId = function (collection, selector, mod, options, callback) {
    // STRATEGY: First try doing an upsert with a generated ID.
    // If this throws an error about changing the ID on an existing document
    // then without affecting the database, we know we should probably try
    // an update without the generated ID. If it affected 0 documents,
    // then without affecting the database, we the document that first
    // gave the error is probably removed and we need to try an insert again
    // We go back to step one and repeat.
    // Like all "optimistic write" schemes, we rely on the fact that it's
    // unlikely our writes will continue to be interfered with under normal
    // circumstances (though sufficiently heavy contention with writers
    // disagreeing on the existence of an object will cause writes to fail
    // in theory).
    var insertedId = options.insertedId; // must exist

    var mongoOptsForUpdate = {
      safe: true,
      multi: options.multi
    };
    var mongoOptsForInsert = {
      safe: true,
      upsert: true
    };
    var replacementWithId = Object.assign(replaceTypes({
      _id: insertedId
    }, replaceMeteorAtomWithMongo), mod);
    var tries = NUM_OPTIMISTIC_TRIES;

    var doUpdate = function () {
      tries--;

      if (!tries) {
        callback(new Error("Upsert failed after " + NUM_OPTIMISTIC_TRIES + " tries."));
      } else {
        collection.update(selector, mod, mongoOptsForUpdate, bindEnvironmentForWrite(function (err, result) {
          if (err) {
            callback(err);
          } else if (result && result.result.n != 0) {
            callback(null, {
              numberAffected: result.result.n
            });
          } else {
            doConditionalInsert();
          }
        }));
      }
    };

    var doConditionalInsert = function () {
      collection.update(selector, replacementWithId, mongoOptsForInsert, bindEnvironmentForWrite(function (err, result) {
        if (err) {
          // figure out if this is a
          // "cannot change _id of document" error, and
          // if so, try doUpdate() again, up to 3 times.
          if (MongoConnection._isCannotChangeIdError(err)) {
            doUpdate();
          } else {
            callback(err);
          }
        } else {
          callback(null, {
            numberAffected: result.result.upserted.length,
            insertedId: insertedId
          });
        }
      }));
    };

    doUpdate();
  };

  _.each(["insert", "update", "remove", "dropCollection", "dropDatabase"], function (method) {
    MongoConnection.prototype[method] = function ()
    /* arguments */
    {
      var self = this;
      return Meteor.wrapAsync(self["_" + method]).apply(self, arguments);
    };
  }); // XXX MongoConnection.upsert() does not return the id of the inserted document
  // unless you set it explicitly in the selector or modifier (as a replacement
  // doc).


  MongoConnection.prototype.upsert = function (collectionName, selector, mod, options, callback) {
    var self = this;

    if (typeof options === "function" && !callback) {
      callback = options;
      options = {};
    }

    return self.update(collectionName, selector, mod, _.extend({}, options, {
      upsert: true,
      _returnObject: true
    }), callback);
  };

  MongoConnection.prototype.find = function (collectionName, selector, options) {
    var self = this;
    if (arguments.length === 1) selector = {};
    return new Cursor(self, new CursorDescription(collectionName, selector, options));
  };

  MongoConnection.prototype.findOne = function (collection_name, selector, options) {
    var self = this;
    if (arguments.length === 1) selector = {};
    options = options || {};
    options.limit = 1;
    return self.find(collection_name, selector, options).fetch()[0];
  }; // We'll actually design an index API later. For now, we just pass through to
  // Mongo's, but make it synchronous.


  MongoConnection.prototype._ensureIndex = function (collectionName, index, options) {
    var self = this; // We expect this function to be called at startup, not from within a method,
    // so we don't interact with the write fence.

    var collection = self.rawCollection(collectionName);
    var future = new Future();
    var indexName = collection.ensureIndex(index, options, future.resolver());
    future.wait();
  };

  MongoConnection.prototype._dropIndex = function (collectionName, index) {
    var self = this; // This function is only used by test code, not within a method, so we don't
    // interact with the write fence.

    var collection = self.rawCollection(collectionName);
    var future = new Future();
    var indexName = collection.dropIndex(index, future.resolver());
    future.wait();
  }; // CURSORS
  // There are several classes which relate to cursors:
  //
  // CursorDescription represents the arguments used to construct a cursor:
  // collectionName, selector, and (find) options.  Because it is used as a key
  // for cursor de-dup, everything in it should either be JSON-stringifiable or
  // not affect observeChanges output (eg, options.transform functions are not
  // stringifiable but do not affect observeChanges).
  //
  // SynchronousCursor is a wrapper around a MongoDB cursor
  // which includes fully-synchronous versions of forEach, etc.
  //
  // Cursor is the cursor object returned from find(), which implements the
  // documented Mongo.Collection cursor API.  It wraps a CursorDescription and a
  // SynchronousCursor (lazily: it doesn't contact Mongo until you call a method
  // like fetch or forEach on it).
  //
  // ObserveHandle is the "observe handle" returned from observeChanges. It has a
  // reference to an ObserveMultiplexer.
  //
  // ObserveMultiplexer allows multiple identical ObserveHandles to be driven by a
  // single observe driver.
  //
  // There are two "observe drivers" which drive ObserveMultiplexers:
  //   - PollingObserveDriver caches the results of a query and reruns it when
  //     necessary.
  //   - OplogObserveDriver follows the Mongo operation log to directly observe
  //     database changes.
  // Both implementations follow the same simple interface: when you create them,
  // they start sending observeChanges callbacks (and a ready() invocation) to
  // their ObserveMultiplexer, and you stop them by calling their stop() method.


  CursorDescription = function (collectionName, selector, options) {
    var self = this;
    self.collectionName = collectionName;
    self.selector = Mongo.Collection._rewriteSelector(selector);
    self.options = options || {};
  };

  Cursor = function (mongo, cursorDescription) {
    var self = this;
    self._mongo = mongo;
    self._cursorDescription = cursorDescription;
    self._synchronousCursor = null;
  };

  _.each(['forEach', 'map', 'fetch', 'count', Symbol.iterator], function (method) {
    Cursor.prototype[method] = function () {
      var self = this; // You can only observe a tailable cursor.

      if (self._cursorDescription.options.tailable) throw new Error("Cannot call " + method + " on a tailable cursor");

      if (!self._synchronousCursor) {
        self._synchronousCursor = self._mongo._createSynchronousCursor(self._cursorDescription, {
          // Make sure that the "self" argument to forEach/map callbacks is the
          // Cursor, not the SynchronousCursor.
          selfForIteration: self,
          useTransform: true
        });
      }

      return self._synchronousCursor[method].apply(self._synchronousCursor, arguments);
    };
  }); // Since we don't actually have a "nextObject" interface, there's really no
  // reason to have a "rewind" interface.  All it did was make multiple calls
  // to fetch/map/forEach return nothing the second time.
  // XXX COMPAT WITH 0.8.1


  Cursor.prototype.rewind = function () {};

  Cursor.prototype.getTransform = function () {
    return this._cursorDescription.options.transform;
  }; // When you call Meteor.publish() with a function that returns a Cursor, we need
  // to transmute it into the equivalent subscription.  This is the function that
  // does that.


  Cursor.prototype._publishCursor = function (sub) {
    var self = this;
    var collection = self._cursorDescription.collectionName;
    return Mongo.Collection._publishCursor(self, sub, collection);
  }; // Used to guarantee that publish functions return at most one cursor per
  // collection. Private, because we might later have cursors that include
  // documents from multiple collections somehow.


  Cursor.prototype._getCollectionName = function () {
    var self = this;
    return self._cursorDescription.collectionName;
  };

  Cursor.prototype.observe = function (callbacks) {
    var self = this;
    return LocalCollection._observeFromObserveChanges(self, callbacks);
  };

  Cursor.prototype.observeChanges = function (callbacks) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var self = this;
    var methods = ['addedAt', 'added', 'changedAt', 'changed', 'removedAt', 'removed', 'movedTo'];

    var ordered = LocalCollection._observeChangesCallbacksAreOrdered(callbacks);

    let exceptionName = callbacks._fromObserve ? 'observe' : 'observeChanges';
    exceptionName += ' callback';
    methods.forEach(function (method) {
      if (callbacks[method] && typeof callbacks[method] == "function") {
        callbacks[method] = Meteor.bindEnvironment(callbacks[method], method + exceptionName);
      }
    });
    return self._mongo._observeChanges(self._cursorDescription, ordered, callbacks, options.nonMutatingCallbacks);
  };

  MongoConnection.prototype._createSynchronousCursor = function (cursorDescription, options) {
    var self = this;
    options = _.pick(options || {}, 'selfForIteration', 'useTransform');
    var collection = self.rawCollection(cursorDescription.collectionName);
    var cursorOptions = cursorDescription.options;
    var mongoOptions = {
      sort: cursorOptions.sort,
      limit: cursorOptions.limit,
      skip: cursorOptions.skip,
      projection: cursorOptions.fields,
      readPreference: cursorOptions.readPreference
    }; // Do we want a tailable cursor (which only works on capped collections)?

    if (cursorOptions.tailable) {
      // We want a tailable cursor...
      mongoOptions.tailable = true; // ... and for the server to wait a bit if any getMore has no data (rather
      // than making us put the relevant sleeps in the client)...

      mongoOptions.awaitdata = true; // ... and to keep querying the server indefinitely rather than just 5 times
      // if there's no more data.

      mongoOptions.numberOfRetries = -1; // And if this is on the oplog collection and the cursor specifies a 'ts',
      // then set the undocumented oplog replay flag, which does a special scan to
      // find the first document (instead of creating an index on ts). This is a
      // very hard-coded Mongo flag which only works on the oplog collection and
      // only works with the ts field.

      if (cursorDescription.collectionName === OPLOG_COLLECTION && cursorDescription.selector.ts) {
        mongoOptions.oplogReplay = true;
      }
    }

    var dbCursor = collection.find(replaceTypes(cursorDescription.selector, replaceMeteorAtomWithMongo), mongoOptions);

    if (typeof cursorOptions.maxTimeMs !== 'undefined') {
      dbCursor = dbCursor.maxTimeMS(cursorOptions.maxTimeMs);
    }

    if (typeof cursorOptions.hint !== 'undefined') {
      dbCursor = dbCursor.hint(cursorOptions.hint);
    }

    return new SynchronousCursor(dbCursor, cursorDescription, options);
  };

  var SynchronousCursor = function (dbCursor, cursorDescription, options) {
    var self = this;
    options = _.pick(options || {}, 'selfForIteration', 'useTransform');
    self._dbCursor = dbCursor;
    self._cursorDescription = cursorDescription; // The "self" argument passed to forEach/map callbacks. If we're wrapped
    // inside a user-visible Cursor, we want to provide the outer cursor!

    self._selfForIteration = options.selfForIteration || self;

    if (options.useTransform && cursorDescription.options.transform) {
      self._transform = LocalCollection.wrapTransform(cursorDescription.options.transform);
    } else {
      self._transform = null;
    }

    self._synchronousCount = Future.wrap(dbCursor.count.bind(dbCursor));
    self._visitedIds = new LocalCollection._IdMap();
  };

  _.extend(SynchronousCursor.prototype, {
    // Returns a Promise for the next object from the underlying cursor (before
    // the Mongo->Meteor type replacement).
    _rawNextObjectPromise: function () {
      const self = this;
      return new Promise((resolve, reject) => {
        self._dbCursor.next((err, doc) => {
          if (err) {
            reject(err);
          } else {
            resolve(doc);
          }
        });
      });
    },
    // Returns a Promise for the next object from the cursor, skipping those whose
    // IDs we've already seen and replacing Mongo atoms with Meteor atoms.
    _nextObjectPromise: function () {
      return Promise.asyncApply(() => {
        var self = this;

        while (true) {
          var doc = Promise.await(self._rawNextObjectPromise());
          if (!doc) return null;
          doc = replaceTypes(doc, replaceMongoAtomWithMeteor);

          if (!self._cursorDescription.options.tailable && _.has(doc, '_id')) {
            // Did Mongo give us duplicate documents in the same cursor? If so,
            // ignore this one. (Do this before the transform, since transform might
            // return some unrelated value.) We don't do this for tailable cursors,
            // because we want to maintain O(1) memory usage. And if there isn't _id
            // for some reason (maybe it's the oplog), then we don't do this either.
            // (Be careful to do this for falsey but existing _id, though.)
            if (self._visitedIds.has(doc._id)) continue;

            self._visitedIds.set(doc._id, true);
          }

          if (self._transform) doc = self._transform(doc);
          return doc;
        }
      });
    },
    // Returns a promise which is resolved with the next object (like with
    // _nextObjectPromise) or rejected if the cursor doesn't return within
    // timeoutMS ms.
    _nextObjectPromiseWithTimeout: function (timeoutMS) {
      const self = this;

      if (!timeoutMS) {
        return self._nextObjectPromise();
      }

      const nextObjectPromise = self._nextObjectPromise();

      const timeoutErr = new Error('Client-side timeout waiting for next object');
      const timeoutPromise = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(timeoutErr);
        }, timeoutMS);
      });
      return Promise.race([nextObjectPromise, timeoutPromise]).catch(err => {
        if (err === timeoutErr) {
          self.close();
        }

        throw err;
      });
    },
    _nextObject: function () {
      var self = this;
      return self._nextObjectPromise().await();
    },
    forEach: function (callback, thisArg) {
      var self = this; // Get back to the beginning.

      self._rewind(); // We implement the loop ourself instead of using self._dbCursor.each,
      // because "each" will call its callback outside of a fiber which makes it
      // much more complex to make this function synchronous.


      var index = 0;

      while (true) {
        var doc = self._nextObject();

        if (!doc) return;
        callback.call(thisArg, doc, index++, self._selfForIteration);
      }
    },
    // XXX Allow overlapping callback executions if callback yields.
    map: function (callback, thisArg) {
      var self = this;
      var res = [];
      self.forEach(function (doc, index) {
        res.push(callback.call(thisArg, doc, index, self._selfForIteration));
      });
      return res;
    },
    _rewind: function () {
      var self = this; // known to be synchronous

      self._dbCursor.rewind();

      self._visitedIds = new LocalCollection._IdMap();
    },
    // Mostly usable for tailable cursors.
    close: function () {
      var self = this;

      self._dbCursor.close();
    },
    fetch: function () {
      var self = this;
      return self.map(_.identity);
    },
    count: function () {
      let applySkipLimit = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
      var self = this;
      return self._synchronousCount(applySkipLimit).wait();
    },
    // This method is NOT wrapped in Cursor.
    getRawObjects: function (ordered) {
      var self = this;

      if (ordered) {
        return self.fetch();
      } else {
        var results = new LocalCollection._IdMap();
        self.forEach(function (doc) {
          results.set(doc._id, doc);
        });
        return results;
      }
    }
  });

  SynchronousCursor.prototype[Symbol.iterator] = function () {
    var self = this; // Get back to the beginning.

    self._rewind();

    return {
      next() {
        const doc = self._nextObject();

        return doc ? {
          value: doc
        } : {
          done: true
        };
      }

    };
  }; // Tails the cursor described by cursorDescription, most likely on the
  // oplog. Calls docCallback with each document found. Ignores errors and just
  // restarts the tail on error.
  //
  // If timeoutMS is set, then if we don't get a new document every timeoutMS,
  // kill and restart the cursor. This is primarily a workaround for #8598.


  MongoConnection.prototype.tail = function (cursorDescription, docCallback, timeoutMS) {
    var self = this;
    if (!cursorDescription.options.tailable) throw new Error("Can only tail a tailable cursor");

    var cursor = self._createSynchronousCursor(cursorDescription);

    var stopped = false;
    var lastTS;

    var loop = function () {
      var doc = null;

      while (true) {
        if (stopped) return;

        try {
          doc = cursor._nextObjectPromiseWithTimeout(timeoutMS).await();
        } catch (err) {
          // There's no good way to figure out if this was actually an error from
          // Mongo, or just client-side (including our own timeout error). Ah
          // well. But either way, we need to retry the cursor (unless the failure
          // was because the observe got stopped).
          doc = null;
        } // Since we awaited a promise above, we need to check again to see if
        // we've been stopped before calling the callback.


        if (stopped) return;

        if (doc) {
          // If a tailable cursor contains a "ts" field, use it to recreate the
          // cursor on error. ("ts" is a standard that Mongo uses internally for
          // the oplog, and there's a special flag that lets you do binary search
          // on it instead of needing to use an index.)
          lastTS = doc.ts;
          docCallback(doc);
        } else {
          var newSelector = _.clone(cursorDescription.selector);

          if (lastTS) {
            newSelector.ts = {
              $gt: lastTS
            };
          }

          cursor = self._createSynchronousCursor(new CursorDescription(cursorDescription.collectionName, newSelector, cursorDescription.options)); // Mongo failover takes many seconds.  Retry in a bit.  (Without this
          // setTimeout, we peg the CPU at 100% and never notice the actual
          // failover.

          Meteor.setTimeout(loop, 100);
          break;
        }
      }
    };

    Meteor.defer(loop);
    return {
      stop: function () {
        stopped = true;
        cursor.close();
      }
    };
  };

  MongoConnection.prototype._observeChanges = function (cursorDescription, ordered, callbacks, nonMutatingCallbacks) {
    var self = this;

    if (cursorDescription.options.tailable) {
      return self._observeChangesTailable(cursorDescription, ordered, callbacks);
    } // You may not filter out _id when observing changes, because the id is a core
    // part of the observeChanges API.


    if (cursorDescription.options.fields && (cursorDescription.options.fields._id === 0 || cursorDescription.options.fields._id === false)) {
      throw Error("You may not observe a cursor with {fields: {_id: 0}}");
    }

    var observeKey = EJSON.stringify(_.extend({
      ordered: ordered
    }, cursorDescription));
    var multiplexer, observeDriver;
    var firstHandle = false; // Find a matching ObserveMultiplexer, or create a new one. This next block is
    // guaranteed to not yield (and it doesn't call anything that can observe a
    // new query), so no other calls to this function can interleave with it.

    Meteor._noYieldsAllowed(function () {
      if (_.has(self._observeMultiplexers, observeKey)) {
        multiplexer = self._observeMultiplexers[observeKey];
      } else {
        firstHandle = true; // Create a new ObserveMultiplexer.

        multiplexer = new ObserveMultiplexer({
          ordered: ordered,
          onStop: function () {
            delete self._observeMultiplexers[observeKey];
            observeDriver.stop();
          }
        });
        self._observeMultiplexers[observeKey] = multiplexer;
      }
    });

    var observeHandle = new ObserveHandle(multiplexer, callbacks, nonMutatingCallbacks);

    if (firstHandle) {
      var matcher, sorter;

      var canUseOplog = _.all([function () {
        // At a bare minimum, using the oplog requires us to have an oplog, to
        // want unordered callbacks, and to not want a callback on the polls
        // that won't happen.
        return self._oplogHandle && !ordered && !callbacks._testOnlyPollCallback;
      }, function () {
        // We need to be able to compile the selector. Fall back to polling for
        // some newfangled $selector that minimongo doesn't support yet.
        try {
          matcher = new Minimongo.Matcher(cursorDescription.selector);
          return true;
        } catch (e) {
          // XXX make all compilation errors MinimongoError or something
          //     so that this doesn't ignore unrelated exceptions
          return false;
        }
      }, function () {
        // ... and the selector itself needs to support oplog.
        return OplogObserveDriver.cursorSupported(cursorDescription, matcher);
      }, function () {
        // And we need to be able to compile the sort, if any.  eg, can't be
        // {$natural: 1}.
        if (!cursorDescription.options.sort) return true;

        try {
          sorter = new Minimongo.Sorter(cursorDescription.options.sort);
          return true;
        } catch (e) {
          // XXX make all compilation errors MinimongoError or something
          //     so that this doesn't ignore unrelated exceptions
          return false;
        }
      }], function (f) {
        return f();
      }); // invoke each function


      var driverClass = canUseOplog ? OplogObserveDriver : PollingObserveDriver;
      observeDriver = new driverClass({
        cursorDescription: cursorDescription,
        mongoHandle: self,
        multiplexer: multiplexer,
        ordered: ordered,
        matcher: matcher,
        // ignored by polling
        sorter: sorter,
        // ignored by polling
        _testOnlyPollCallback: callbacks._testOnlyPollCallback
      }); // This field is only set for use in tests.

      multiplexer._observeDriver = observeDriver;
    } // Blocks until the initial adds have been sent.


    multiplexer.addHandleAndSendInitialAdds(observeHandle);
    return observeHandle;
  }; // Listen for the invalidation messages that will trigger us to poll the
  // database for changes. If this selector specifies specific IDs, specify them
  // here, so that updates to different specific IDs don't cause us to poll.
  // listenCallback is the same kind of (notification, complete) callback passed
  // to InvalidationCrossbar.listen.


  listenAll = function (cursorDescription, listenCallback) {
    var listeners = [];
    forEachTrigger(cursorDescription, function (trigger) {
      listeners.push(DDPServer._InvalidationCrossbar.listen(trigger, listenCallback));
    });
    return {
      stop: function () {
        _.each(listeners, function (listener) {
          listener.stop();
        });
      }
    };
  };

  forEachTrigger = function (cursorDescription, triggerCallback) {
    var key = {
      collection: cursorDescription.collectionName
    };

    var specificIds = LocalCollection._idsMatchedBySelector(cursorDescription.selector);

    if (specificIds) {
      _.each(specificIds, function (id) {
        triggerCallback(_.extend({
          id: id
        }, key));
      });

      triggerCallback(_.extend({
        dropCollection: true,
        id: null
      }, key));
    } else {
      triggerCallback(key);
    } // Everyone cares about the database being dropped.


    triggerCallback({
      dropDatabase: true
    });
  }; // observeChanges for tailable cursors on capped collections.
  //
  // Some differences from normal cursors:
  //   - Will never produce anything other than 'added' or 'addedBefore'. If you
  //     do update a document that has already been produced, this will not notice
  //     it.
  //   - If you disconnect and reconnect from Mongo, it will essentially restart
  //     the query, which will lead to duplicate results. This is pretty bad,
  //     but if you include a field called 'ts' which is inserted as
  //     new MongoInternals.MongoTimestamp(0, 0) (which is initialized to the
  //     current Mongo-style timestamp), we'll be able to find the place to
  //     restart properly. (This field is specifically understood by Mongo with an
  //     optimization which allows it to find the right place to start without
  //     an index on ts. It's how the oplog works.)
  //   - No callbacks are triggered synchronously with the call (there's no
  //     differentiation between "initial data" and "later changes"; everything
  //     that matches the query gets sent asynchronously).
  //   - De-duplication is not implemented.
  //   - Does not yet interact with the write fence. Probably, this should work by
  //     ignoring removes (which don't work on capped collections) and updates
  //     (which don't affect tailable cursors), and just keeping track of the ID
  //     of the inserted object, and closing the write fence once you get to that
  //     ID (or timestamp?).  This doesn't work well if the document doesn't match
  //     the query, though.  On the other hand, the write fence can close
  //     immediately if it does not match the query. So if we trust minimongo
  //     enough to accurately evaluate the query against the write fence, we
  //     should be able to do this...  Of course, minimongo doesn't even support
  //     Mongo Timestamps yet.


  MongoConnection.prototype._observeChangesTailable = function (cursorDescription, ordered, callbacks) {
    var self = this; // Tailable cursors only ever call added/addedBefore callbacks, so it's an
    // error if you didn't provide them.

    if (ordered && !callbacks.addedBefore || !ordered && !callbacks.added) {
      throw new Error("Can't observe an " + (ordered ? "ordered" : "unordered") + " tailable cursor without a " + (ordered ? "addedBefore" : "added") + " callback");
    }

    return self.tail(cursorDescription, function (doc) {
      var id = doc._id;
      delete doc._id; // The ts is an implementation detail. Hide it.

      delete doc.ts;

      if (ordered) {
        callbacks.addedBefore(id, doc, null);
      } else {
        callbacks.added(id, doc);
      }
    });
  }; // XXX We probably need to find a better way to expose this. Right now
  // it's only used by tests, but in fact you need it in normal
  // operation to interact with capped collections.


  MongoInternals.MongoTimestamp = MongoDB.Timestamp;
  MongoInternals.Connection = MongoConnection;
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oplog_tailing.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_tailing.js                                                                                     //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let NpmModuleMongodb;
module.link("meteor/npm-mongo", {
  NpmModuleMongodb(v) {
    NpmModuleMongodb = v;
  }

}, 0);

var Future = Npm.require('fibers/future');

const {
  Long
} = NpmModuleMongodb;
OPLOG_COLLECTION = 'oplog.rs';
var TOO_FAR_BEHIND = process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000;
var TAIL_TIMEOUT = +process.env.METEOR_OPLOG_TAIL_TIMEOUT || 30000;

var showTS = function (ts) {
  return "Timestamp(" + ts.getHighBits() + ", " + ts.getLowBits() + ")";
};

idForOp = function (op) {
  if (op.op === 'd') return op.o._id;else if (op.op === 'i') return op.o._id;else if (op.op === 'u') return op.o2._id;else if (op.op === 'c') throw Error("Operator 'c' doesn't supply an object with id: " + EJSON.stringify(op));else throw Error("Unknown op: " + EJSON.stringify(op));
};

OplogHandle = function (oplogUrl, dbName) {
  var self = this;
  self._oplogUrl = oplogUrl;
  self._dbName = dbName;
  self._oplogLastEntryConnection = null;
  self._oplogTailConnection = null;
  self._stopped = false;
  self._tailHandle = null;
  self._readyFuture = new Future();
  self._crossbar = new DDPServer._Crossbar({
    factPackage: "mongo-livedata",
    factName: "oplog-watchers"
  });
  self._baseOplogSelector = {
    ns: new RegExp("^(?:" + [Meteor._escapeRegExp(self._dbName + "."), Meteor._escapeRegExp("admin.$cmd")].join("|") + ")"),
    $or: [{
      op: {
        $in: ['i', 'u', 'd']
      }
    }, // drop collection
    {
      op: 'c',
      'o.drop': {
        $exists: true
      }
    }, {
      op: 'c',
      'o.dropDatabase': 1
    }, {
      op: 'c',
      'o.applyOps': {
        $exists: true
      }
    }]
  }; // Data structures to support waitUntilCaughtUp(). Each oplog entry has a
  // MongoTimestamp object on it (which is not the same as a Date --- it's a
  // combination of time and an incrementing counter; see
  // http://docs.mongodb.org/manual/reference/bson-types/#timestamps).
  //
  // _catchingUpFutures is an array of {ts: MongoTimestamp, future: Future}
  // objects, sorted by ascending timestamp. _lastProcessedTS is the
  // MongoTimestamp of the last oplog entry we've processed.
  //
  // Each time we call waitUntilCaughtUp, we take a peek at the final oplog
  // entry in the db.  If we've already processed it (ie, it is not greater than
  // _lastProcessedTS), waitUntilCaughtUp immediately returns. Otherwise,
  // waitUntilCaughtUp makes a new Future and inserts it along with the final
  // timestamp entry that it read, into _catchingUpFutures. waitUntilCaughtUp
  // then waits on that future, which is resolved once _lastProcessedTS is
  // incremented to be past its timestamp by the worker fiber.
  //
  // XXX use a priority queue or something else that's faster than an array

  self._catchingUpFutures = [];
  self._lastProcessedTS = null;
  self._onSkippedEntriesHook = new Hook({
    debugPrintExceptions: "onSkippedEntries callback"
  });
  self._entryQueue = new Meteor._DoubleEndedQueue();
  self._workerActive = false;

  self._startTailing();
};

_.extend(OplogHandle.prototype, {
  stop: function () {
    var self = this;
    if (self._stopped) return;
    self._stopped = true;
    if (self._tailHandle) self._tailHandle.stop(); // XXX should close connections too
  },
  onOplogEntry: function (trigger, callback) {
    var self = this;
    if (self._stopped) throw new Error("Called onOplogEntry on stopped handle!"); // Calling onOplogEntry requires us to wait for the tailing to be ready.

    self._readyFuture.wait();

    var originalCallback = callback;
    callback = Meteor.bindEnvironment(function (notification) {
      originalCallback(notification);
    }, function (err) {
      Meteor._debug("Error in oplog callback", err);
    });

    var listenHandle = self._crossbar.listen(trigger, callback);

    return {
      stop: function () {
        listenHandle.stop();
      }
    };
  },
  // Register a callback to be invoked any time we skip oplog entries (eg,
  // because we are too far behind).
  onSkippedEntries: function (callback) {
    var self = this;
    if (self._stopped) throw new Error("Called onSkippedEntries on stopped handle!");
    return self._onSkippedEntriesHook.register(callback);
  },
  // Calls `callback` once the oplog has been processed up to a point that is
  // roughly "now": specifically, once we've processed all ops that are
  // currently visible.
  // XXX become convinced that this is actually safe even if oplogConnection
  // is some kind of pool
  waitUntilCaughtUp: function () {
    var self = this;
    if (self._stopped) throw new Error("Called waitUntilCaughtUp on stopped handle!"); // Calling waitUntilCaughtUp requries us to wait for the oplog connection to
    // be ready.

    self._readyFuture.wait();

    var lastEntry;

    while (!self._stopped) {
      // We need to make the selector at least as restrictive as the actual
      // tailing selector (ie, we need to specify the DB name) or else we might
      // find a TS that won't show up in the actual tail stream.
      try {
        lastEntry = self._oplogLastEntryConnection.findOne(OPLOG_COLLECTION, self._baseOplogSelector, {
          fields: {
            ts: 1
          },
          sort: {
            $natural: -1
          }
        });
        break;
      } catch (e) {
        // During failover (eg) if we get an exception we should log and retry
        // instead of crashing.
        Meteor._debug("Got exception while reading last entry", e);

        Meteor._sleepForMs(100);
      }
    }

    if (self._stopped) return;

    if (!lastEntry) {
      // Really, nothing in the oplog? Well, we've processed everything.
      return;
    }

    var ts = lastEntry.ts;
    if (!ts) throw Error("oplog entry without ts: " + EJSON.stringify(lastEntry));

    if (self._lastProcessedTS && ts.lessThanOrEqual(self._lastProcessedTS)) {
      // We've already caught up to here.
      return;
    } // Insert the future into our list. Almost always, this will be at the end,
    // but it's conceivable that if we fail over from one primary to another,
    // the oplog entries we see will go backwards.


    var insertAfter = self._catchingUpFutures.length;

    while (insertAfter - 1 > 0 && self._catchingUpFutures[insertAfter - 1].ts.greaterThan(ts)) {
      insertAfter--;
    }

    var f = new Future();

    self._catchingUpFutures.splice(insertAfter, 0, {
      ts: ts,
      future: f
    });

    f.wait();
  },
  _startTailing: function () {
    var self = this; // First, make sure that we're talking to the local database.

    var mongodbUri = Npm.require('mongodb-uri');

    if (mongodbUri.parse(self._oplogUrl).database !== 'local') {
      throw Error("$MONGO_OPLOG_URL must be set to the 'local' database of " + "a Mongo replica set");
    } // We make two separate connections to Mongo. The Node Mongo driver
    // implements a naive round-robin connection pool: each "connection" is a
    // pool of several (5 by default) TCP connections, and each request is
    // rotated through the pools. Tailable cursor queries block on the server
    // until there is some data to return (or until a few seconds have
    // passed). So if the connection pool used for tailing cursors is the same
    // pool used for other queries, the other queries will be delayed by seconds
    // 1/5 of the time.
    //
    // The tail connection will only ever be running a single tail command, so
    // it only needs to make one underlying TCP connection.


    self._oplogTailConnection = new MongoConnection(self._oplogUrl, {
      poolSize: 1
    }); // XXX better docs, but: it's to get monotonic results
    // XXX is it safe to say "if there's an in flight query, just use its
    //     results"? I don't think so but should consider that

    self._oplogLastEntryConnection = new MongoConnection(self._oplogUrl, {
      poolSize: 1
    }); // Now, make sure that there actually is a repl set here. If not, oplog
    // tailing won't ever find anything!
    // More on the isMasterDoc
    // https://docs.mongodb.com/manual/reference/command/isMaster/

    var f = new Future();

    self._oplogLastEntryConnection.db.admin().command({
      ismaster: 1
    }, f.resolver());

    var isMasterDoc = f.wait();

    if (!(isMasterDoc && isMasterDoc.setName)) {
      throw Error("$MONGO_OPLOG_URL must be set to the 'local' database of " + "a Mongo replica set");
    } // Find the last oplog entry.


    var lastOplogEntry = self._oplogLastEntryConnection.findOne(OPLOG_COLLECTION, {}, {
      sort: {
        $natural: -1
      },
      fields: {
        ts: 1
      }
    });

    var oplogSelector = _.clone(self._baseOplogSelector);

    if (lastOplogEntry) {
      // Start after the last entry that currently exists.
      oplogSelector.ts = {
        $gt: lastOplogEntry.ts
      }; // If there are any calls to callWhenProcessedLatest before any other
      // oplog entries show up, allow callWhenProcessedLatest to call its
      // callback immediately.

      self._lastProcessedTS = lastOplogEntry.ts;
    }

    var cursorDescription = new CursorDescription(OPLOG_COLLECTION, oplogSelector, {
      tailable: true
    }); // Start tailing the oplog.
    //
    // We restart the low-level oplog query every 30 seconds if we didn't get a
    // doc. This is a workaround for #8598: the Node Mongo driver has at least
    // one bug that can lead to query callbacks never getting called (even with
    // an error) when leadership failover occur.

    self._tailHandle = self._oplogTailConnection.tail(cursorDescription, function (doc) {
      self._entryQueue.push(doc);

      self._maybeStartWorker();
    }, TAIL_TIMEOUT);

    self._readyFuture.return();
  },
  _maybeStartWorker: function () {
    var self = this;
    if (self._workerActive) return;
    self._workerActive = true;
    Meteor.defer(function () {
      // May be called recursively in case of transactions.
      function handleDoc(doc) {
        if (doc.ns === "admin.$cmd") {
          if (doc.o.applyOps) {
            // This was a successful transaction, so we need to apply the
            // operations that were involved.
            let nextTimestamp = doc.ts;
            doc.o.applyOps.forEach(op => {
              // See https://github.com/meteor/meteor/issues/10420.
              if (!op.ts) {
                op.ts = nextTimestamp;
                nextTimestamp = nextTimestamp.add(Long.ONE);
              }

              handleDoc(op);
            });
            return;
          }

          throw new Error("Unknown command " + EJSON.stringify(doc));
        }

        const trigger = {
          dropCollection: false,
          dropDatabase: false,
          op: doc
        };

        if (typeof doc.ns === "string" && doc.ns.startsWith(self._dbName + ".")) {
          trigger.collection = doc.ns.slice(self._dbName.length + 1);
        } // Is it a special command and the collection name is hidden
        // somewhere in operator?


        if (trigger.collection === "$cmd") {
          if (doc.o.dropDatabase) {
            delete trigger.collection;
            trigger.dropDatabase = true;
          } else if (_.has(doc.o, "drop")) {
            trigger.collection = doc.o.drop;
            trigger.dropCollection = true;
            trigger.id = null;
          } else {
            throw Error("Unknown command " + EJSON.stringify(doc));
          }
        } else {
          // All other ops have an id.
          trigger.id = idForOp(doc);
        }

        self._crossbar.fire(trigger);
      }

      try {
        while (!self._stopped && !self._entryQueue.isEmpty()) {
          // Are we too far behind? Just tell our observers that they need to
          // repoll, and drop our queue.
          if (self._entryQueue.length > TOO_FAR_BEHIND) {
            var lastEntry = self._entryQueue.pop();

            self._entryQueue.clear();

            self._onSkippedEntriesHook.each(function (callback) {
              callback();
              return true;
            }); // Free any waitUntilCaughtUp() calls that were waiting for us to
            // pass something that we just skipped.


            self._setLastProcessedTS(lastEntry.ts);

            continue;
          }

          const doc = self._entryQueue.shift(); // Fire trigger(s) for this doc.


          handleDoc(doc); // Now that we've processed this operation, process pending
          // sequencers.

          if (doc.ts) {
            self._setLastProcessedTS(doc.ts);
          } else {
            throw Error("oplog entry without ts: " + EJSON.stringify(doc));
          }
        }
      } finally {
        self._workerActive = false;
      }
    });
  },
  _setLastProcessedTS: function (ts) {
    var self = this;
    self._lastProcessedTS = ts;

    while (!_.isEmpty(self._catchingUpFutures) && self._catchingUpFutures[0].ts.lessThanOrEqual(self._lastProcessedTS)) {
      var sequencer = self._catchingUpFutures.shift();

      sequencer.future.return();
    }
  },
  //Methods used on tests to dinamically change TOO_FAR_BEHIND
  _defineTooFarBehind: function (value) {
    TOO_FAR_BEHIND = value;
  },
  _resetTooFarBehind: function () {
    TOO_FAR_BEHIND = process.env.METEOR_OPLOG_TOO_FAR_BEHIND || 2000;
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"observe_multiplex.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/observe_multiplex.js                                                                                 //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _objectWithoutProperties;

module.link("@babel/runtime/helpers/objectWithoutProperties", {
  default(v) {
    _objectWithoutProperties = v;
  }

}, 0);

var Future = Npm.require('fibers/future');

ObserveMultiplexer = function (options) {
  var self = this;
  if (!options || !_.has(options, 'ordered')) throw Error("must specified ordered");
  Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", 1);
  self._ordered = options.ordered;

  self._onStop = options.onStop || function () {};

  self._queue = new Meteor._SynchronousQueue();
  self._handles = {};
  self._readyFuture = new Future();
  self._cache = new LocalCollection._CachingChangeObserver({
    ordered: options.ordered
  }); // Number of addHandleAndSendInitialAdds tasks scheduled but not yet
  // running. removeHandle uses this to know if it's time to call the onStop
  // callback.

  self._addHandleTasksScheduledButNotPerformed = 0;

  _.each(self.callbackNames(), function (callbackName) {
    self[callbackName] = function ()
    /* ... */
    {
      self._applyCallback(callbackName, _.toArray(arguments));
    };
  });
};

_.extend(ObserveMultiplexer.prototype, {
  addHandleAndSendInitialAdds: function (handle) {
    var self = this; // Check this before calling runTask (even though runTask does the same
    // check) so that we don't leak an ObserveMultiplexer on error by
    // incrementing _addHandleTasksScheduledButNotPerformed and never
    // decrementing it.

    if (!self._queue.safeToRunTask()) throw new Error("Can't call observeChanges from an observe callback on the same query");
    ++self._addHandleTasksScheduledButNotPerformed;
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-handles", 1);

    self._queue.runTask(function () {
      self._handles[handle._id] = handle; // Send out whatever adds we have so far (whether or not we the
      // multiplexer is ready).

      self._sendAdds(handle);

      --self._addHandleTasksScheduledButNotPerformed;
    }); // *outside* the task, since otherwise we'd deadlock


    self._readyFuture.wait();
  },
  // Remove an observe handle. If it was the last observe handle, call the
  // onStop callback; you cannot add any more observe handles after this.
  //
  // This is not synchronized with polls and handle additions: this means that
  // you can safely call it from within an observe callback, but it also means
  // that we have to be careful when we iterate over _handles.
  removeHandle: function (id) {
    var self = this; // This should not be possible: you can only call removeHandle by having
    // access to the ObserveHandle, which isn't returned to user code until the
    // multiplex is ready.

    if (!self._ready()) throw new Error("Can't remove handles until the multiplex is ready");
    delete self._handles[id];
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-handles", -1);

    if (_.isEmpty(self._handles) && self._addHandleTasksScheduledButNotPerformed === 0) {
      self._stop();
    }
  },
  _stop: function (options) {
    var self = this;
    options = options || {}; // It shouldn't be possible for us to stop when all our handles still
    // haven't been returned from observeChanges!

    if (!self._ready() && !options.fromQueryError) throw Error("surprising _stop: not ready"); // Call stop callback (which kills the underlying process which sends us
    // callbacks and removes us from the connection's dictionary).

    self._onStop();

    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-multiplexers", -1); // Cause future addHandleAndSendInitialAdds calls to throw (but the onStop
    // callback should make our connection forget about us).

    self._handles = null;
  },
  // Allows all addHandleAndSendInitialAdds calls to return, once all preceding
  // adds have been processed. Does not block.
  ready: function () {
    var self = this;

    self._queue.queueTask(function () {
      if (self._ready()) throw Error("can't make ObserveMultiplex ready twice!");

      self._readyFuture.return();
    });
  },
  // If trying to execute the query results in an error, call this. This is
  // intended for permanent errors, not transient network errors that could be
  // fixed. It should only be called before ready(), because if you called ready
  // that meant that you managed to run the query once. It will stop this
  // ObserveMultiplex and cause addHandleAndSendInitialAdds calls (and thus
  // observeChanges calls) to throw the error.
  queryError: function (err) {
    var self = this;

    self._queue.runTask(function () {
      if (self._ready()) throw Error("can't claim query has an error after it worked!");

      self._stop({
        fromQueryError: true
      });

      self._readyFuture.throw(err);
    });
  },
  // Calls "cb" once the effects of all "ready", "addHandleAndSendInitialAdds"
  // and observe callbacks which came before this call have been propagated to
  // all handles. "ready" must have already been called on this multiplexer.
  onFlush: function (cb) {
    var self = this;

    self._queue.queueTask(function () {
      if (!self._ready()) throw Error("only call onFlush on a multiplexer that will be ready");
      cb();
    });
  },
  callbackNames: function () {
    var self = this;
    if (self._ordered) return ["addedBefore", "changed", "movedBefore", "removed"];else return ["added", "changed", "removed"];
  },
  _ready: function () {
    return this._readyFuture.isResolved();
  },
  _applyCallback: function (callbackName, args) {
    var self = this;

    self._queue.queueTask(function () {
      // If we stopped in the meantime, do nothing.
      if (!self._handles) return; // First, apply the change to the cache.

      self._cache.applyChange[callbackName].apply(null, args); // If we haven't finished the initial adds, then we should only be getting
      // adds.


      if (!self._ready() && callbackName !== 'added' && callbackName !== 'addedBefore') {
        throw new Error("Got " + callbackName + " during initial adds");
      } // Now multiplex the callbacks out to all observe handles. It's OK if
      // these calls yield; since we're inside a task, no other use of our queue
      // can continue until these are done. (But we do have to be careful to not
      // use a handle that got removed, because removeHandle does not use the
      // queue; thus, we iterate over an array of keys that we control.)


      _.each(_.keys(self._handles), function (handleId) {
        var handle = self._handles && self._handles[handleId];
        if (!handle) return;
        var callback = handle['_' + callbackName]; // clone arguments so that callbacks can mutate their arguments

        callback && callback.apply(null, handle.nonMutatingCallbacks ? args : EJSON.clone(args));
      });
    });
  },
  // Sends initial adds to a handle. It should only be called from within a task
  // (the task that is processing the addHandleAndSendInitialAdds call). It
  // synchronously invokes the handle's added or addedBefore; there's no need to
  // flush the queue afterwards to ensure that the callbacks get out.
  _sendAdds: function (handle) {
    var self = this;
    if (self._queue.safeToRunTask()) throw Error("_sendAdds may only be called from within a task!");
    var add = self._ordered ? handle._addedBefore : handle._added;
    if (!add) return; // note: docs may be an _IdMap or an OrderedDict

    self._cache.docs.forEach(function (doc, id) {
      if (!_.has(self._handles, handle._id)) throw Error("handle got removed before sending initial adds!");

      const _ref = handle.nonMutatingCallbacks ? doc : EJSON.clone(doc),
            {
        _id
      } = _ref,
            fields = _objectWithoutProperties(_ref, ["_id"]);

      if (self._ordered) add(id, fields, null); // we're going in order, so add at end
      else add(id, fields);
    });
  }
});

var nextObserveHandleId = 1; // When the callbacks do not mutate the arguments, we can skip a lot of data clones

ObserveHandle = function (multiplexer, callbacks) {
  let nonMutatingCallbacks = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  var self = this; // The end user is only supposed to call stop().  The other fields are
  // accessible to the multiplexer, though.

  self._multiplexer = multiplexer;

  _.each(multiplexer.callbackNames(), function (name) {
    if (callbacks[name]) {
      self['_' + name] = callbacks[name];
    } else if (name === "addedBefore" && callbacks.added) {
      // Special case: if you specify "added" and "movedBefore", you get an
      // ordered observe where for some reason you don't get ordering data on
      // the adds.  I dunno, we wrote tests for it, there must have been a
      // reason.
      self._addedBefore = function (id, fields, before) {
        callbacks.added(id, fields);
      };
    }
  });

  self._stopped = false;
  self._id = nextObserveHandleId++;
  self.nonMutatingCallbacks = nonMutatingCallbacks;
};

ObserveHandle.prototype.stop = function () {
  var self = this;
  if (self._stopped) return;
  self._stopped = true;

  self._multiplexer.removeHandle(self._id);
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"doc_fetcher.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/doc_fetcher.js                                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  DocFetcher: () => DocFetcher
});

var Fiber = Npm.require('fibers');

class DocFetcher {
  constructor(mongoConnection) {
    this._mongoConnection = mongoConnection; // Map from op -> [callback]

    this._callbacksForOp = new Map();
  } // Fetches document "id" from collectionName, returning it or null if not
  // found.
  //
  // If you make multiple calls to fetch() with the same op reference,
  // DocFetcher may assume that they all return the same document. (It does
  // not check to see if collectionName/id match.)
  //
  // You may assume that callback is never called synchronously (and in fact
  // OplogObserveDriver does so).


  fetch(collectionName, id, op, callback) {
    const self = this;
    check(collectionName, String);
    check(op, Object); // If there's already an in-progress fetch for this cache key, yield until
    // it's done and return whatever it returns.

    if (self._callbacksForOp.has(op)) {
      self._callbacksForOp.get(op).push(callback);

      return;
    }

    const callbacks = [callback];

    self._callbacksForOp.set(op, callbacks);

    Fiber(function () {
      try {
        var doc = self._mongoConnection.findOne(collectionName, {
          _id: id
        }) || null; // Return doc to all relevant callbacks. Note that this array can
        // continue to grow during callback excecution.

        while (callbacks.length > 0) {
          // Clone the document so that the various calls to fetch don't return
          // objects that are intertwingled with each other. Clone before
          // popping the future, so that if clone throws, the error gets passed
          // to the next callback.
          callbacks.pop()(null, EJSON.clone(doc));
        }
      } catch (e) {
        while (callbacks.length > 0) {
          callbacks.pop()(e);
        }
      } finally {
        // XXX consider keeping the doc around for a period of time before
        // removing from the cache
        self._callbacksForOp.delete(op);
      }
    }).run();
  }

}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"polling_observe_driver.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/polling_observe_driver.js                                                                            //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var POLLING_THROTTLE_MS = +process.env.METEOR_POLLING_THROTTLE_MS || 50;
var POLLING_INTERVAL_MS = +process.env.METEOR_POLLING_INTERVAL_MS || 10 * 1000;

PollingObserveDriver = function (options) {
  var self = this;
  self._cursorDescription = options.cursorDescription;
  self._mongoHandle = options.mongoHandle;
  self._ordered = options.ordered;
  self._multiplexer = options.multiplexer;
  self._stopCallbacks = [];
  self._stopped = false;
  self._synchronousCursor = self._mongoHandle._createSynchronousCursor(self._cursorDescription); // previous results snapshot.  on each poll cycle, diffs against
  // results drives the callbacks.

  self._results = null; // The number of _pollMongo calls that have been added to self._taskQueue but
  // have not started running. Used to make sure we never schedule more than one
  // _pollMongo (other than possibly the one that is currently running). It's
  // also used by _suspendPolling to pretend there's a poll scheduled. Usually,
  // it's either 0 (for "no polls scheduled other than maybe one currently
  // running") or 1 (for "a poll scheduled that isn't running yet"), but it can
  // also be 2 if incremented by _suspendPolling.

  self._pollsScheduledButNotStarted = 0;
  self._pendingWrites = []; // people to notify when polling completes
  // Make sure to create a separately throttled function for each
  // PollingObserveDriver object.

  self._ensurePollIsScheduled = _.throttle(self._unthrottledEnsurePollIsScheduled, self._cursorDescription.options.pollingThrottleMs || POLLING_THROTTLE_MS
  /* ms */
  ); // XXX figure out if we still need a queue

  self._taskQueue = new Meteor._SynchronousQueue();
  var listenersHandle = listenAll(self._cursorDescription, function (notification) {
    // When someone does a transaction that might affect us, schedule a poll
    // of the database. If that transaction happens inside of a write fence,
    // block the fence until we've polled and notified observers.
    var fence = DDPServer._CurrentWriteFence.get();

    if (fence) self._pendingWrites.push(fence.beginWrite()); // Ensure a poll is scheduled... but if we already know that one is,
    // don't hit the throttled _ensurePollIsScheduled function (which might
    // lead to us calling it unnecessarily in <pollingThrottleMs> ms).

    if (self._pollsScheduledButNotStarted === 0) self._ensurePollIsScheduled();
  });

  self._stopCallbacks.push(function () {
    listenersHandle.stop();
  }); // every once and a while, poll even if we don't think we're dirty, for
  // eventual consistency with database writes from outside the Meteor
  // universe.
  //
  // For testing, there's an undocumented callback argument to observeChanges
  // which disables time-based polling and gets called at the beginning of each
  // poll.


  if (options._testOnlyPollCallback) {
    self._testOnlyPollCallback = options._testOnlyPollCallback;
  } else {
    var pollingInterval = self._cursorDescription.options.pollingIntervalMs || self._cursorDescription.options._pollingInterval || // COMPAT with 1.2
    POLLING_INTERVAL_MS;
    var intervalHandle = Meteor.setInterval(_.bind(self._ensurePollIsScheduled, self), pollingInterval);

    self._stopCallbacks.push(function () {
      Meteor.clearInterval(intervalHandle);
    });
  } // Make sure we actually poll soon!


  self._unthrottledEnsurePollIsScheduled();

  Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", 1);
};

_.extend(PollingObserveDriver.prototype, {
  // This is always called through _.throttle (except once at startup).
  _unthrottledEnsurePollIsScheduled: function () {
    var self = this;
    if (self._pollsScheduledButNotStarted > 0) return;
    ++self._pollsScheduledButNotStarted;

    self._taskQueue.queueTask(function () {
      self._pollMongo();
    });
  },
  // test-only interface for controlling polling.
  //
  // _suspendPolling blocks until any currently running and scheduled polls are
  // done, and prevents any further polls from being scheduled. (new
  // ObserveHandles can be added and receive their initial added callbacks,
  // though.)
  //
  // _resumePolling immediately polls, and allows further polls to occur.
  _suspendPolling: function () {
    var self = this; // Pretend that there's another poll scheduled (which will prevent
    // _ensurePollIsScheduled from queueing any more polls).

    ++self._pollsScheduledButNotStarted; // Now block until all currently running or scheduled polls are done.

    self._taskQueue.runTask(function () {}); // Confirm that there is only one "poll" (the fake one we're pretending to
    // have) scheduled.


    if (self._pollsScheduledButNotStarted !== 1) throw new Error("_pollsScheduledButNotStarted is " + self._pollsScheduledButNotStarted);
  },
  _resumePolling: function () {
    var self = this; // We should be in the same state as in the end of _suspendPolling.

    if (self._pollsScheduledButNotStarted !== 1) throw new Error("_pollsScheduledButNotStarted is " + self._pollsScheduledButNotStarted); // Run a poll synchronously (which will counteract the
    // ++_pollsScheduledButNotStarted from _suspendPolling).

    self._taskQueue.runTask(function () {
      self._pollMongo();
    });
  },
  _pollMongo: function () {
    var self = this;
    --self._pollsScheduledButNotStarted;
    if (self._stopped) return;
    var first = false;
    var newResults;
    var oldResults = self._results;

    if (!oldResults) {
      first = true; // XXX maybe use OrderedDict instead?

      oldResults = self._ordered ? [] : new LocalCollection._IdMap();
    }

    self._testOnlyPollCallback && self._testOnlyPollCallback(); // Save the list of pending writes which this round will commit.

    var writesForCycle = self._pendingWrites;
    self._pendingWrites = []; // Get the new query results. (This yields.)

    try {
      newResults = self._synchronousCursor.getRawObjects(self._ordered);
    } catch (e) {
      if (first && typeof e.code === 'number') {
        // This is an error document sent to us by mongod, not a connection
        // error generated by the client. And we've never seen this query work
        // successfully. Probably it's a bad selector or something, so we should
        // NOT retry. Instead, we should halt the observe (which ends up calling
        // `stop` on us).
        self._multiplexer.queryError(new Error("Exception while polling query " + JSON.stringify(self._cursorDescription) + ": " + e.message));

        return;
      } // getRawObjects can throw if we're having trouble talking to the
      // database.  That's fine --- we will repoll later anyway. But we should
      // make sure not to lose track of this cycle's writes.
      // (It also can throw if there's just something invalid about this query;
      // unfortunately the ObserveDriver API doesn't provide a good way to
      // "cancel" the observe from the inside in this case.


      Array.prototype.push.apply(self._pendingWrites, writesForCycle);

      Meteor._debug("Exception while polling query " + JSON.stringify(self._cursorDescription), e);

      return;
    } // Run diffs.


    if (!self._stopped) {
      LocalCollection._diffQueryChanges(self._ordered, oldResults, newResults, self._multiplexer);
    } // Signals the multiplexer to allow all observeChanges calls that share this
    // multiplexer to return. (This happens asynchronously, via the
    // multiplexer's queue.)


    if (first) self._multiplexer.ready(); // Replace self._results atomically.  (This assignment is what makes `first`
    // stay through on the next cycle, so we've waited until after we've
    // committed to ready-ing the multiplexer.)

    self._results = newResults; // Once the ObserveMultiplexer has processed everything we've done in this
    // round, mark all the writes which existed before this call as
    // commmitted. (If new writes have shown up in the meantime, there'll
    // already be another _pollMongo task scheduled.)

    self._multiplexer.onFlush(function () {
      _.each(writesForCycle, function (w) {
        w.committed();
      });
    });
  },
  stop: function () {
    var self = this;
    self._stopped = true;

    _.each(self._stopCallbacks, function (c) {
      c();
    }); // Release any write fences that are waiting on us.


    _.each(self._pendingWrites, function (w) {
      w.committed();
    });

    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-polling", -1);
  }
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"oplog_observe_driver.js":function module(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/oplog_observe_driver.js                                                                              //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var Future = Npm.require('fibers/future');

var PHASE = {
  QUERYING: "QUERYING",
  FETCHING: "FETCHING",
  STEADY: "STEADY"
}; // Exception thrown by _needToPollQuery which unrolls the stack up to the
// enclosing call to finishIfNeedToPollQuery.

var SwitchedToQuery = function () {};

var finishIfNeedToPollQuery = function (f) {
  return function () {
    try {
      f.apply(this, arguments);
    } catch (e) {
      if (!(e instanceof SwitchedToQuery)) throw e;
    }
  };
};

var currentId = 0; // OplogObserveDriver is an alternative to PollingObserveDriver which follows
// the Mongo operation log instead of just re-polling the query. It obeys the
// same simple interface: constructing it starts sending observeChanges
// callbacks (and a ready() invocation) to the ObserveMultiplexer, and you stop
// it by calling the stop() method.

OplogObserveDriver = function (options) {
  var self = this;
  self._usesOplog = true; // tests look at this

  self._id = currentId;
  currentId++;
  self._cursorDescription = options.cursorDescription;
  self._mongoHandle = options.mongoHandle;
  self._multiplexer = options.multiplexer;

  if (options.ordered) {
    throw Error("OplogObserveDriver only supports unordered observeChanges");
  }

  var sorter = options.sorter; // We don't support $near and other geo-queries so it's OK to initialize the
  // comparator only once in the constructor.

  var comparator = sorter && sorter.getComparator();

  if (options.cursorDescription.options.limit) {
    // There are several properties ordered driver implements:
    // - _limit is a positive number
    // - _comparator is a function-comparator by which the query is ordered
    // - _unpublishedBuffer is non-null Min/Max Heap,
    //                      the empty buffer in STEADY phase implies that the
    //                      everything that matches the queries selector fits
    //                      into published set.
    // - _published - Max Heap (also implements IdMap methods)
    var heapOptions = {
      IdMap: LocalCollection._IdMap
    };
    self._limit = self._cursorDescription.options.limit;
    self._comparator = comparator;
    self._sorter = sorter;
    self._unpublishedBuffer = new MinMaxHeap(comparator, heapOptions); // We need something that can find Max value in addition to IdMap interface

    self._published = new MaxHeap(comparator, heapOptions);
  } else {
    self._limit = 0;
    self._comparator = null;
    self._sorter = null;
    self._unpublishedBuffer = null;
    self._published = new LocalCollection._IdMap();
  } // Indicates if it is safe to insert a new document at the end of the buffer
  // for this query. i.e. it is known that there are no documents matching the
  // selector those are not in published or buffer.


  self._safeAppendToBuffer = false;
  self._stopped = false;
  self._stopHandles = [];
  Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", 1);

  self._registerPhaseChange(PHASE.QUERYING);

  self._matcher = options.matcher;
  var projection = self._cursorDescription.options.fields || {};
  self._projectionFn = LocalCollection._compileProjection(projection); // Projection function, result of combining important fields for selector and
  // existing fields projection

  self._sharedProjection = self._matcher.combineIntoProjection(projection);
  if (sorter) self._sharedProjection = sorter.combineIntoProjection(self._sharedProjection);
  self._sharedProjectionFn = LocalCollection._compileProjection(self._sharedProjection);
  self._needToFetch = new LocalCollection._IdMap();
  self._currentlyFetching = null;
  self._fetchGeneration = 0;
  self._requeryWhenDoneThisQuery = false;
  self._writesToCommitWhenWeReachSteady = []; // If the oplog handle tells us that it skipped some entries (because it got
  // behind, say), re-poll.

  self._stopHandles.push(self._mongoHandle._oplogHandle.onSkippedEntries(finishIfNeedToPollQuery(function () {
    self._needToPollQuery();
  })));

  forEachTrigger(self._cursorDescription, function (trigger) {
    self._stopHandles.push(self._mongoHandle._oplogHandle.onOplogEntry(trigger, function (notification) {
      Meteor._noYieldsAllowed(finishIfNeedToPollQuery(function () {
        var op = notification.op;

        if (notification.dropCollection || notification.dropDatabase) {
          // Note: this call is not allowed to block on anything (especially
          // on waiting for oplog entries to catch up) because that will block
          // onOplogEntry!
          self._needToPollQuery();
        } else {
          // All other operators should be handled depending on phase
          if (self._phase === PHASE.QUERYING) {
            self._handleOplogEntryQuerying(op);
          } else {
            self._handleOplogEntrySteadyOrFetching(op);
          }
        }
      }));
    }));
  }); // XXX ordering w.r.t. everything else?

  self._stopHandles.push(listenAll(self._cursorDescription, function (notification) {
    // If we're not in a pre-fire write fence, we don't have to do anything.
    var fence = DDPServer._CurrentWriteFence.get();

    if (!fence || fence.fired) return;

    if (fence._oplogObserveDrivers) {
      fence._oplogObserveDrivers[self._id] = self;
      return;
    }

    fence._oplogObserveDrivers = {};
    fence._oplogObserveDrivers[self._id] = self;
    fence.onBeforeFire(function () {
      var drivers = fence._oplogObserveDrivers;
      delete fence._oplogObserveDrivers; // This fence cannot fire until we've caught up to "this point" in the
      // oplog, and all observers made it back to the steady state.

      self._mongoHandle._oplogHandle.waitUntilCaughtUp();

      _.each(drivers, function (driver) {
        if (driver._stopped) return;
        var write = fence.beginWrite();

        if (driver._phase === PHASE.STEADY) {
          // Make sure that all of the callbacks have made it through the
          // multiplexer and been delivered to ObserveHandles before committing
          // writes.
          driver._multiplexer.onFlush(function () {
            write.committed();
          });
        } else {
          driver._writesToCommitWhenWeReachSteady.push(write);
        }
      });
    });
  })); // When Mongo fails over, we need to repoll the query, in case we processed an
  // oplog entry that got rolled back.


  self._stopHandles.push(self._mongoHandle._onFailover(finishIfNeedToPollQuery(function () {
    self._needToPollQuery();
  }))); // Give _observeChanges a chance to add the new ObserveHandle to our
  // multiplexer, so that the added calls get streamed.


  Meteor.defer(finishIfNeedToPollQuery(function () {
    self._runInitialQuery();
  }));
};

_.extend(OplogObserveDriver.prototype, {
  _addPublished: function (id, doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var fields = _.clone(doc);

      delete fields._id;

      self._published.set(id, self._sharedProjectionFn(doc));

      self._multiplexer.added(id, self._projectionFn(fields)); // After adding this document, the published set might be overflowed
      // (exceeding capacity specified by limit). If so, push the maximum
      // element to the buffer, we might want to save it in memory to reduce the
      // amount of Mongo lookups in the future.


      if (self._limit && self._published.size() > self._limit) {
        // XXX in theory the size of published is no more than limit+1
        if (self._published.size() !== self._limit + 1) {
          throw new Error("After adding to published, " + (self._published.size() - self._limit) + " documents are overflowing the set");
        }

        var overflowingDocId = self._published.maxElementId();

        var overflowingDoc = self._published.get(overflowingDocId);

        if (EJSON.equals(overflowingDocId, id)) {
          throw new Error("The document just added is overflowing the published set");
        }

        self._published.remove(overflowingDocId);

        self._multiplexer.removed(overflowingDocId);

        self._addBuffered(overflowingDocId, overflowingDoc);
      }
    });
  },
  _removePublished: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._published.remove(id);

      self._multiplexer.removed(id);

      if (!self._limit || self._published.size() === self._limit) return;
      if (self._published.size() > self._limit) throw Error("self._published got too big"); // OK, we are publishing less than the limit. Maybe we should look in the
      // buffer to find the next element past what we were publishing before.

      if (!self._unpublishedBuffer.empty()) {
        // There's something in the buffer; move the first thing in it to
        // _published.
        var newDocId = self._unpublishedBuffer.minElementId();

        var newDoc = self._unpublishedBuffer.get(newDocId);

        self._removeBuffered(newDocId);

        self._addPublished(newDocId, newDoc);

        return;
      } // There's nothing in the buffer.  This could mean one of a few things.
      // (a) We could be in the middle of re-running the query (specifically, we
      // could be in _publishNewResults). In that case, _unpublishedBuffer is
      // empty because we clear it at the beginning of _publishNewResults. In
      // this case, our caller already knows the entire answer to the query and
      // we don't need to do anything fancy here.  Just return.


      if (self._phase === PHASE.QUERYING) return; // (b) We're pretty confident that the union of _published and
      // _unpublishedBuffer contain all documents that match selector. Because
      // _unpublishedBuffer is empty, that means we're confident that _published
      // contains all documents that match selector. So we have nothing to do.

      if (self._safeAppendToBuffer) return; // (c) Maybe there are other documents out there that should be in our
      // buffer. But in that case, when we emptied _unpublishedBuffer in
      // _removeBuffered, we should have called _needToPollQuery, which will
      // either put something in _unpublishedBuffer or set _safeAppendToBuffer
      // (or both), and it will put us in QUERYING for that whole time. So in
      // fact, we shouldn't be able to get here.

      throw new Error("Buffer inexplicably empty");
    });
  },
  _changePublished: function (id, oldDoc, newDoc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._published.set(id, self._sharedProjectionFn(newDoc));

      var projectedNew = self._projectionFn(newDoc);

      var projectedOld = self._projectionFn(oldDoc);

      var changed = DiffSequence.makeChangedFields(projectedNew, projectedOld);
      if (!_.isEmpty(changed)) self._multiplexer.changed(id, changed);
    });
  },
  _addBuffered: function (id, doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._unpublishedBuffer.set(id, self._sharedProjectionFn(doc)); // If something is overflowing the buffer, we just remove it from cache


      if (self._unpublishedBuffer.size() > self._limit) {
        var maxBufferedId = self._unpublishedBuffer.maxElementId();

        self._unpublishedBuffer.remove(maxBufferedId); // Since something matching is removed from cache (both published set and
        // buffer), set flag to false


        self._safeAppendToBuffer = false;
      }
    });
  },
  // Is called either to remove the doc completely from matching set or to move
  // it to the published set later.
  _removeBuffered: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._unpublishedBuffer.remove(id); // To keep the contract "buffer is never empty in STEADY phase unless the
      // everything matching fits into published" true, we poll everything as
      // soon as we see the buffer becoming empty.


      if (!self._unpublishedBuffer.size() && !self._safeAppendToBuffer) self._needToPollQuery();
    });
  },
  // Called when a document has joined the "Matching" results set.
  // Takes responsibility of keeping _unpublishedBuffer in sync with _published
  // and the effect of limit enforced.
  _addMatching: function (doc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var id = doc._id;
      if (self._published.has(id)) throw Error("tried to add something already published " + id);
      if (self._limit && self._unpublishedBuffer.has(id)) throw Error("tried to add something already existed in buffer " + id);
      var limit = self._limit;
      var comparator = self._comparator;
      var maxPublished = limit && self._published.size() > 0 ? self._published.get(self._published.maxElementId()) : null;
      var maxBuffered = limit && self._unpublishedBuffer.size() > 0 ? self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId()) : null; // The query is unlimited or didn't publish enough documents yet or the
      // new document would fit into published set pushing the maximum element
      // out, then we need to publish the doc.

      var toPublish = !limit || self._published.size() < limit || comparator(doc, maxPublished) < 0; // Otherwise we might need to buffer it (only in case of limited query).
      // Buffering is allowed if the buffer is not filled up yet and all
      // matching docs are either in the published set or in the buffer.

      var canAppendToBuffer = !toPublish && self._safeAppendToBuffer && self._unpublishedBuffer.size() < limit; // Or if it is small enough to be safely inserted to the middle or the
      // beginning of the buffer.

      var canInsertIntoBuffer = !toPublish && maxBuffered && comparator(doc, maxBuffered) <= 0;
      var toBuffer = canAppendToBuffer || canInsertIntoBuffer;

      if (toPublish) {
        self._addPublished(id, doc);
      } else if (toBuffer) {
        self._addBuffered(id, doc);
      } else {
        // dropping it and not saving to the cache
        self._safeAppendToBuffer = false;
      }
    });
  },
  // Called when a document leaves the "Matching" results set.
  // Takes responsibility of keeping _unpublishedBuffer in sync with _published
  // and the effect of limit enforced.
  _removeMatching: function (id) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (!self._published.has(id) && !self._limit) throw Error("tried to remove something matching but not cached " + id);

      if (self._published.has(id)) {
        self._removePublished(id);
      } else if (self._unpublishedBuffer.has(id)) {
        self._removeBuffered(id);
      }
    });
  },
  _handleDoc: function (id, newDoc) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var matchesNow = newDoc && self._matcher.documentMatches(newDoc).result;

      var publishedBefore = self._published.has(id);

      var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);

      var cachedBefore = publishedBefore || bufferedBefore;

      if (matchesNow && !cachedBefore) {
        self._addMatching(newDoc);
      } else if (cachedBefore && !matchesNow) {
        self._removeMatching(id);
      } else if (cachedBefore && matchesNow) {
        var oldDoc = self._published.get(id);

        var comparator = self._comparator;

        var minBuffered = self._limit && self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.minElementId());

        var maxBuffered;

        if (publishedBefore) {
          // Unlimited case where the document stays in published once it
          // matches or the case when we don't have enough matching docs to
          // publish or the changed but matching doc will stay in published
          // anyways.
          //
          // XXX: We rely on the emptiness of buffer. Be sure to maintain the
          // fact that buffer can't be empty if there are matching documents not
          // published. Notably, we don't want to schedule repoll and continue
          // relying on this property.
          var staysInPublished = !self._limit || self._unpublishedBuffer.size() === 0 || comparator(newDoc, minBuffered) <= 0;

          if (staysInPublished) {
            self._changePublished(id, oldDoc, newDoc);
          } else {
            // after the change doc doesn't stay in the published, remove it
            self._removePublished(id); // but it can move into buffered now, check it


            maxBuffered = self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId());
            var toBuffer = self._safeAppendToBuffer || maxBuffered && comparator(newDoc, maxBuffered) <= 0;

            if (toBuffer) {
              self._addBuffered(id, newDoc);
            } else {
              // Throw away from both published set and buffer
              self._safeAppendToBuffer = false;
            }
          }
        } else if (bufferedBefore) {
          oldDoc = self._unpublishedBuffer.get(id); // remove the old version manually instead of using _removeBuffered so
          // we don't trigger the querying immediately.  if we end this block
          // with the buffer empty, we will need to trigger the query poll
          // manually too.

          self._unpublishedBuffer.remove(id);

          var maxPublished = self._published.get(self._published.maxElementId());

          maxBuffered = self._unpublishedBuffer.size() && self._unpublishedBuffer.get(self._unpublishedBuffer.maxElementId()); // the buffered doc was updated, it could move to published

          var toPublish = comparator(newDoc, maxPublished) < 0; // or stays in buffer even after the change

          var staysInBuffer = !toPublish && self._safeAppendToBuffer || !toPublish && maxBuffered && comparator(newDoc, maxBuffered) <= 0;

          if (toPublish) {
            self._addPublished(id, newDoc);
          } else if (staysInBuffer) {
            // stays in buffer but changes
            self._unpublishedBuffer.set(id, newDoc);
          } else {
            // Throw away from both published set and buffer
            self._safeAppendToBuffer = false; // Normally this check would have been done in _removeBuffered but
            // we didn't use it, so we need to do it ourself now.

            if (!self._unpublishedBuffer.size()) {
              self._needToPollQuery();
            }
          }
        } else {
          throw new Error("cachedBefore implies either of publishedBefore or bufferedBefore is true.");
        }
      }
    });
  },
  _fetchModifiedDocuments: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._registerPhaseChange(PHASE.FETCHING); // Defer, because nothing called from the oplog entry handler may yield,
      // but fetch() yields.


      Meteor.defer(finishIfNeedToPollQuery(function () {
        while (!self._stopped && !self._needToFetch.empty()) {
          if (self._phase === PHASE.QUERYING) {
            // While fetching, we decided to go into QUERYING mode, and then we
            // saw another oplog entry, so _needToFetch is not empty. But we
            // shouldn't fetch these documents until AFTER the query is done.
            break;
          } // Being in steady phase here would be surprising.


          if (self._phase !== PHASE.FETCHING) throw new Error("phase in fetchModifiedDocuments: " + self._phase);
          self._currentlyFetching = self._needToFetch;
          var thisGeneration = ++self._fetchGeneration;
          self._needToFetch = new LocalCollection._IdMap();
          var waiting = 0;
          var fut = new Future(); // This loop is safe, because _currentlyFetching will not be updated
          // during this loop (in fact, it is never mutated).

          self._currentlyFetching.forEach(function (op, id) {
            waiting++;

            self._mongoHandle._docFetcher.fetch(self._cursorDescription.collectionName, id, op, finishIfNeedToPollQuery(function (err, doc) {
              try {
                if (err) {
                  Meteor._debug("Got exception while fetching documents", err); // If we get an error from the fetcher (eg, trouble
                  // connecting to Mongo), let's just abandon the fetch phase
                  // altogether and fall back to polling. It's not like we're
                  // getting live updates anyway.


                  if (self._phase !== PHASE.QUERYING) {
                    self._needToPollQuery();
                  }
                } else if (!self._stopped && self._phase === PHASE.FETCHING && self._fetchGeneration === thisGeneration) {
                  // We re-check the generation in case we've had an explicit
                  // _pollQuery call (eg, in another fiber) which should
                  // effectively cancel this round of fetches.  (_pollQuery
                  // increments the generation.)
                  self._handleDoc(id, doc);
                }
              } finally {
                waiting--; // Because fetch() never calls its callback synchronously,
                // this is safe (ie, we won't call fut.return() before the
                // forEach is done).

                if (waiting === 0) fut.return();
              }
            }));
          });

          fut.wait(); // Exit now if we've had a _pollQuery call (here or in another fiber).

          if (self._phase === PHASE.QUERYING) return;
          self._currentlyFetching = null;
        } // We're done fetching, so we can be steady, unless we've had a
        // _pollQuery call (here or in another fiber).


        if (self._phase !== PHASE.QUERYING) self._beSteady();
      }));
    });
  },
  _beSteady: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._registerPhaseChange(PHASE.STEADY);

      var writes = self._writesToCommitWhenWeReachSteady;
      self._writesToCommitWhenWeReachSteady = [];

      self._multiplexer.onFlush(function () {
        _.each(writes, function (w) {
          w.committed();
        });
      });
    });
  },
  _handleOplogEntryQuerying: function (op) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      self._needToFetch.set(idForOp(op), op);
    });
  },
  _handleOplogEntrySteadyOrFetching: function (op) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var id = idForOp(op); // If we're already fetching this one, or about to, we can't optimize;
      // make sure that we fetch it again if necessary.

      if (self._phase === PHASE.FETCHING && (self._currentlyFetching && self._currentlyFetching.has(id) || self._needToFetch.has(id))) {
        self._needToFetch.set(id, op);

        return;
      }

      if (op.op === 'd') {
        if (self._published.has(id) || self._limit && self._unpublishedBuffer.has(id)) self._removeMatching(id);
      } else if (op.op === 'i') {
        if (self._published.has(id)) throw new Error("insert found for already-existing ID in published");
        if (self._unpublishedBuffer && self._unpublishedBuffer.has(id)) throw new Error("insert found for already-existing ID in buffer"); // XXX what if selector yields?  for now it can't but later it could
        // have $where

        if (self._matcher.documentMatches(op.o).result) self._addMatching(op.o);
      } else if (op.op === 'u') {
        // Is this a modifier ($set/$unset, which may require us to poll the
        // database to figure out if the whole document matches the selector) or
        // a replacement (in which case we can just directly re-evaluate the
        // selector)?
        var isReplace = !_.has(op.o, '$set') && !_.has(op.o, '$unset'); // If this modifier modifies something inside an EJSON custom type (ie,
        // anything with EJSON$), then we can't try to use
        // LocalCollection._modify, since that just mutates the EJSON encoding,
        // not the actual object.

        var canDirectlyModifyDoc = !isReplace && modifierCanBeDirectlyApplied(op.o);

        var publishedBefore = self._published.has(id);

        var bufferedBefore = self._limit && self._unpublishedBuffer.has(id);

        if (isReplace) {
          self._handleDoc(id, _.extend({
            _id: id
          }, op.o));
        } else if ((publishedBefore || bufferedBefore) && canDirectlyModifyDoc) {
          // Oh great, we actually know what the document is, so we can apply
          // this directly.
          var newDoc = self._published.has(id) ? self._published.get(id) : self._unpublishedBuffer.get(id);
          newDoc = EJSON.clone(newDoc);
          newDoc._id = id;

          try {
            LocalCollection._modify(newDoc, op.o);
          } catch (e) {
            if (e.name !== "MinimongoError") throw e; // We didn't understand the modifier.  Re-fetch.

            self._needToFetch.set(id, op);

            if (self._phase === PHASE.STEADY) {
              self._fetchModifiedDocuments();
            }

            return;
          }

          self._handleDoc(id, self._sharedProjectionFn(newDoc));
        } else if (!canDirectlyModifyDoc || self._matcher.canBecomeTrueByModifier(op.o) || self._sorter && self._sorter.affectedByModifier(op.o)) {
          self._needToFetch.set(id, op);

          if (self._phase === PHASE.STEADY) self._fetchModifiedDocuments();
        }
      } else {
        throw Error("XXX SURPRISING OPERATION: " + op);
      }
    });
  },
  // Yields!
  _runInitialQuery: function () {
    var self = this;
    if (self._stopped) throw new Error("oplog stopped surprisingly early");

    self._runQuery({
      initial: true
    }); // yields


    if (self._stopped) return; // can happen on queryError
    // Allow observeChanges calls to return. (After this, it's possible for
    // stop() to be called.)

    self._multiplexer.ready();

    self._doneQuerying(); // yields

  },
  // In various circumstances, we may just want to stop processing the oplog and
  // re-run the initial query, just as if we were a PollingObserveDriver.
  //
  // This function may not block, because it is called from an oplog entry
  // handler.
  //
  // XXX We should call this when we detect that we've been in FETCHING for "too
  // long".
  //
  // XXX We should call this when we detect Mongo failover (since that might
  // mean that some of the oplog entries we have processed have been rolled
  // back). The Node Mongo driver is in the middle of a bunch of huge
  // refactorings, including the way that it notifies you when primary
  // changes. Will put off implementing this until driver 1.4 is out.
  _pollQuery: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (self._stopped) return; // Yay, we get to forget about all the things we thought we had to fetch.

      self._needToFetch = new LocalCollection._IdMap();
      self._currentlyFetching = null;
      ++self._fetchGeneration; // ignore any in-flight fetches

      self._registerPhaseChange(PHASE.QUERYING); // Defer so that we don't yield.  We don't need finishIfNeedToPollQuery
      // here because SwitchedToQuery is not thrown in QUERYING mode.


      Meteor.defer(function () {
        self._runQuery();

        self._doneQuerying();
      });
    });
  },
  // Yields!
  _runQuery: function (options) {
    var self = this;
    options = options || {};
    var newResults, newBuffer; // This while loop is just to retry failures.

    while (true) {
      // If we've been stopped, we don't have to run anything any more.
      if (self._stopped) return;
      newResults = new LocalCollection._IdMap();
      newBuffer = new LocalCollection._IdMap(); // Query 2x documents as the half excluded from the original query will go
      // into unpublished buffer to reduce additional Mongo lookups in cases
      // when documents are removed from the published set and need a
      // replacement.
      // XXX needs more thought on non-zero skip
      // XXX 2 is a "magic number" meaning there is an extra chunk of docs for
      // buffer if such is needed.

      var cursor = self._cursorForQuery({
        limit: self._limit * 2
      });

      try {
        cursor.forEach(function (doc, i) {
          // yields
          if (!self._limit || i < self._limit) {
            newResults.set(doc._id, doc);
          } else {
            newBuffer.set(doc._id, doc);
          }
        });
        break;
      } catch (e) {
        if (options.initial && typeof e.code === 'number') {
          // This is an error document sent to us by mongod, not a connection
          // error generated by the client. And we've never seen this query work
          // successfully. Probably it's a bad selector or something, so we
          // should NOT retry. Instead, we should halt the observe (which ends
          // up calling `stop` on us).
          self._multiplexer.queryError(e);

          return;
        } // During failover (eg) if we get an exception we should log and retry
        // instead of crashing.


        Meteor._debug("Got exception while polling query", e);

        Meteor._sleepForMs(100);
      }
    }

    if (self._stopped) return;

    self._publishNewResults(newResults, newBuffer);
  },
  // Transitions to QUERYING and runs another query, or (if already in QUERYING)
  // ensures that we will query again later.
  //
  // This function may not block, because it is called from an oplog entry
  // handler. However, if we were not already in the QUERYING phase, it throws
  // an exception that is caught by the closest surrounding
  // finishIfNeedToPollQuery call; this ensures that we don't continue running
  // close that was designed for another phase inside PHASE.QUERYING.
  //
  // (It's also necessary whenever logic in this file yields to check that other
  // phases haven't put us into QUERYING mode, though; eg,
  // _fetchModifiedDocuments does this.)
  _needToPollQuery: function () {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      if (self._stopped) return; // If we're not already in the middle of a query, we can query now
      // (possibly pausing FETCHING).

      if (self._phase !== PHASE.QUERYING) {
        self._pollQuery();

        throw new SwitchedToQuery();
      } // We're currently in QUERYING. Set a flag to ensure that we run another
      // query when we're done.


      self._requeryWhenDoneThisQuery = true;
    });
  },
  // Yields!
  _doneQuerying: function () {
    var self = this;
    if (self._stopped) return;

    self._mongoHandle._oplogHandle.waitUntilCaughtUp(); // yields


    if (self._stopped) return;
    if (self._phase !== PHASE.QUERYING) throw Error("Phase unexpectedly " + self._phase);

    Meteor._noYieldsAllowed(function () {
      if (self._requeryWhenDoneThisQuery) {
        self._requeryWhenDoneThisQuery = false;

        self._pollQuery();
      } else if (self._needToFetch.empty()) {
        self._beSteady();
      } else {
        self._fetchModifiedDocuments();
      }
    });
  },
  _cursorForQuery: function (optionsOverwrite) {
    var self = this;
    return Meteor._noYieldsAllowed(function () {
      // The query we run is almost the same as the cursor we are observing,
      // with a few changes. We need to read all the fields that are relevant to
      // the selector, not just the fields we are going to publish (that's the
      // "shared" projection). And we don't want to apply any transform in the
      // cursor, because observeChanges shouldn't use the transform.
      var options = _.clone(self._cursorDescription.options); // Allow the caller to modify the options. Useful to specify different
      // skip and limit values.


      _.extend(options, optionsOverwrite);

      options.fields = self._sharedProjection;
      delete options.transform; // We are NOT deep cloning fields or selector here, which should be OK.

      var description = new CursorDescription(self._cursorDescription.collectionName, self._cursorDescription.selector, options);
      return new Cursor(self._mongoHandle, description);
    });
  },
  // Replace self._published with newResults (both are IdMaps), invoking observe
  // callbacks on the multiplexer.
  // Replace self._unpublishedBuffer with newBuffer.
  //
  // XXX This is very similar to LocalCollection._diffQueryUnorderedChanges. We
  // should really: (a) Unify IdMap and OrderedDict into Unordered/OrderedDict
  // (b) Rewrite diff.js to use these classes instead of arrays and objects.
  _publishNewResults: function (newResults, newBuffer) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      // If the query is limited and there is a buffer, shut down so it doesn't
      // stay in a way.
      if (self._limit) {
        self._unpublishedBuffer.clear();
      } // First remove anything that's gone. Be careful not to modify
      // self._published while iterating over it.


      var idsToRemove = [];

      self._published.forEach(function (doc, id) {
        if (!newResults.has(id)) idsToRemove.push(id);
      });

      _.each(idsToRemove, function (id) {
        self._removePublished(id);
      }); // Now do adds and changes.
      // If self has a buffer and limit, the new fetched result will be
      // limited correctly as the query has sort specifier.


      newResults.forEach(function (doc, id) {
        self._handleDoc(id, doc);
      }); // Sanity-check that everything we tried to put into _published ended up
      // there.
      // XXX if this is slow, remove it later

      if (self._published.size() !== newResults.size()) {
        console.error('The Mongo server and the Meteor query disagree on how ' + 'many documents match your query. Cursor description: ', self._cursorDescription);
        throw Error("The Mongo server and the Meteor query disagree on how " + "many documents match your query. Maybe it is hitting a Mongo " + "edge case? The query is: " + EJSON.stringify(self._cursorDescription.selector));
      }

      self._published.forEach(function (doc, id) {
        if (!newResults.has(id)) throw Error("_published has a doc that newResults doesn't; " + id);
      }); // Finally, replace the buffer


      newBuffer.forEach(function (doc, id) {
        self._addBuffered(id, doc);
      });
      self._safeAppendToBuffer = newBuffer.size() < self._limit;
    });
  },
  // This stop function is invoked from the onStop of the ObserveMultiplexer, so
  // it shouldn't actually be possible to call it until the multiplexer is
  // ready.
  //
  // It's important to check self._stopped after every call in this file that
  // can yield!
  stop: function () {
    var self = this;
    if (self._stopped) return;
    self._stopped = true;

    _.each(self._stopHandles, function (handle) {
      handle.stop();
    }); // Note: we *don't* use multiplexer.onFlush here because this stop
    // callback is actually invoked by the multiplexer itself when it has
    // determined that there are no handles left. So nothing is actually going
    // to get flushed (and it's probably not valid to call methods on the
    // dying multiplexer).


    _.each(self._writesToCommitWhenWeReachSteady, function (w) {
      w.committed(); // maybe yields?
    });

    self._writesToCommitWhenWeReachSteady = null; // Proactively drop references to potentially big things.

    self._published = null;
    self._unpublishedBuffer = null;
    self._needToFetch = null;
    self._currentlyFetching = null;
    self._oplogEntryHandle = null;
    self._listenersHandle = null;
    Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "observe-drivers-oplog", -1);
  },
  _registerPhaseChange: function (phase) {
    var self = this;

    Meteor._noYieldsAllowed(function () {
      var now = new Date();

      if (self._phase) {
        var timeDiff = now - self._phaseStartTime;
        Package['facts-base'] && Package['facts-base'].Facts.incrementServerFact("mongo-livedata", "time-spent-in-" + self._phase + "-phase", timeDiff);
      }

      self._phase = phase;
      self._phaseStartTime = now;
    });
  }
}); // Does our oplog tailing code support this cursor? For now, we are being very
// conservative and allowing only simple queries with simple options.
// (This is a "static method".)


OplogObserveDriver.cursorSupported = function (cursorDescription, matcher) {
  // First, check the options.
  var options = cursorDescription.options; // Did the user say no explicitly?
  // underscored version of the option is COMPAT with 1.2

  if (options.disableOplog || options._disableOplog) return false; // skip is not supported: to support it we would need to keep track of all
  // "skipped" documents or at least their ids.
  // limit w/o a sort specifier is not supported: current implementation needs a
  // deterministic way to order documents.

  if (options.skip || options.limit && !options.sort) return false; // If a fields projection option is given check if it is supported by
  // minimongo (some operators are not supported).

  if (options.fields) {
    try {
      LocalCollection._checkSupportedProjection(options.fields);
    } catch (e) {
      if (e.name === "MinimongoError") {
        return false;
      } else {
        throw e;
      }
    }
  } // We don't allow the following selectors:
  //   - $where (not confident that we provide the same JS environment
  //             as Mongo, and can yield!)
  //   - $near (has "interesting" properties in MongoDB, like the possibility
  //            of returning an ID multiple times, though even polling maybe
  //            have a bug there)
  //           XXX: once we support it, we would need to think more on how we
  //           initialize the comparators when we create the driver.


  return !matcher.hasWhere() && !matcher.hasGeoQuery();
};

var modifierCanBeDirectlyApplied = function (modifier) {
  return _.all(modifier, function (fields, operation) {
    return _.all(fields, function (value, field) {
      return !/EJSON\$/.test(field);
    });
  });
};

MongoInternals.OplogObserveDriver = OplogObserveDriver;
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"local_collection_driver.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/local_collection_driver.js                                                                           //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
module.export({
  LocalCollectionDriver: () => LocalCollectionDriver
});
const LocalCollectionDriver = new class LocalCollectionDriver {
  constructor() {
    this.noConnCollections = Object.create(null);
  }

  open(name, conn) {
    if (!name) {
      return new LocalCollection();
    }

    if (!conn) {
      return ensureCollection(name, this.noConnCollections);
    }

    if (!conn._mongo_livedata_collections) {
      conn._mongo_livedata_collections = Object.create(null);
    } // XXX is there a way to keep track of a connection's collections without
    // dangling it off the connection object?


    return ensureCollection(name, conn._mongo_livedata_collections);
  }

}();

function ensureCollection(name, collections) {
  return name in collections ? collections[name] : collections[name] = new LocalCollection(name);
}
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"remote_collection_driver.js":function module(require){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/remote_collection_driver.js                                                                          //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
MongoInternals.RemoteCollectionDriver = function (mongo_url, options) {
  var self = this;
  self.mongo = new MongoConnection(mongo_url, options);
};

_.extend(MongoInternals.RemoteCollectionDriver.prototype, {
  open: function (name) {
    var self = this;
    var ret = {};

    _.each(['find', 'findOne', 'insert', 'update', 'upsert', 'remove', '_ensureIndex', '_dropIndex', '_createCappedCollection', 'dropCollection', 'rawCollection'], function (m) {
      ret[m] = _.bind(self.mongo[m], self.mongo, name);
    });

    return ret;
  }
}); // Create the singleton RemoteCollectionDriver only on demand, so we
// only require Mongo configuration if it's actually used (eg, not if
// you're only trying to receive data from a remote DDP server.)


MongoInternals.defaultRemoteCollectionDriver = _.once(function () {
  var connectionOptions = {};
  var mongoUrl = process.env.MONGO_URL;

  if (process.env.MONGO_OPLOG_URL) {
    connectionOptions.oplogUrl = process.env.MONGO_OPLOG_URL;
  }

  if (!mongoUrl) throw new Error("MONGO_URL must be set in environment");
  return new MongoInternals.RemoteCollectionDriver(mongoUrl, connectionOptions);
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"collection.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/collection.js                                                                                        //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
!function (module1) {
  let _objectSpread;

  module1.link("@babel/runtime/helpers/objectSpread2", {
    default(v) {
      _objectSpread = v;
    }

  }, 0);
  // options.connection, if given, is a LivedataClient or LivedataServer
  // XXX presently there is no way to destroy/clean up a Collection

  /**
   * @summary Namespace for MongoDB-related items
   * @namespace
   */
  Mongo = {};
  /**
   * @summary Constructor for a Collection
   * @locus Anywhere
   * @instancename collection
   * @class
   * @param {String} name The name of the collection.  If null, creates an unmanaged (unsynchronized) local collection.
   * @param {Object} [options]
   * @param {Object} options.connection The server connection that will manage this collection. Uses the default connection if not specified.  Pass the return value of calling [`DDP.connect`](#ddp_connect) to specify a different server. Pass `null` to specify no connection. Unmanaged (`name` is null) collections cannot specify a connection.
   * @param {String} options.idGeneration The method of generating the `_id` fields of new documents in this collection.  Possible values:
  
   - **`'STRING'`**: random strings
   - **`'MONGO'`**:  random [`Mongo.ObjectID`](#mongo_object_id) values
  
  The default id generation technique is `'STRING'`.
   * @param {Function} options.transform An optional transformation function. Documents will be passed through this function before being returned from `fetch` or `findOne`, and before being passed to callbacks of `observe`, `map`, `forEach`, `allow`, and `deny`. Transforms are *not* applied for the callbacks of `observeChanges` or to cursors returned from publish functions.
   * @param {Boolean} options.defineMutationMethods Set to `false` to skip setting up the mutation methods that enable insert/update/remove from client code. Default `true`.
   */

  Mongo.Collection = function Collection(name, options) {
    if (!name && name !== null) {
      Meteor._debug("Warning: creating anonymous collection. It will not be " + "saved or synchronized over the network. (Pass null for " + "the collection name to turn off this warning.)");

      name = null;
    }

    if (name !== null && typeof name !== "string") {
      throw new Error("First argument to new Mongo.Collection must be a string or null");
    }

    if (options && options.methods) {
      // Backwards compatibility hack with original signature (which passed
      // "connection" directly instead of in options. (Connections must have a "methods"
      // method.)
      // XXX remove before 1.0
      options = {
        connection: options
      };
    } // Backwards compatibility: "connection" used to be called "manager".


    if (options && options.manager && !options.connection) {
      options.connection = options.manager;
    }

    options = _objectSpread({
      connection: undefined,
      idGeneration: 'STRING',
      transform: null,
      _driver: undefined,
      _preventAutopublish: false
    }, options);

    switch (options.idGeneration) {
      case 'MONGO':
        this._makeNewID = function () {
          var src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
          return new Mongo.ObjectID(src.hexString(24));
        };

        break;

      case 'STRING':
      default:
        this._makeNewID = function () {
          var src = name ? DDP.randomStream('/collection/' + name) : Random.insecure;
          return src.id();
        };

        break;
    }

    this._transform = LocalCollection.wrapTransform(options.transform);
    if (!name || options.connection === null) // note: nameless collections never have a connection
      this._connection = null;else if (options.connection) this._connection = options.connection;else if (Meteor.isClient) this._connection = Meteor.connection;else this._connection = Meteor.server;

    if (!options._driver) {
      // XXX This check assumes that webapp is loaded so that Meteor.server !==
      // null. We should fully support the case of "want to use a Mongo-backed
      // collection from Node code without webapp", but we don't yet.
      // #MeteorServerNull
      if (name && this._connection === Meteor.server && typeof MongoInternals !== "undefined" && MongoInternals.defaultRemoteCollectionDriver) {
        options._driver = MongoInternals.defaultRemoteCollectionDriver();
      } else {
        const {
          LocalCollectionDriver
        } = require("./local_collection_driver.js");

        options._driver = LocalCollectionDriver;
      }
    }

    this._collection = options._driver.open(name, this._connection);
    this._name = name;
    this._driver = options._driver;

    this._maybeSetUpReplication(name, options); // XXX don't define these until allow or deny is actually used for this
    // collection. Could be hard if the security rules are only defined on the
    // server.


    if (options.defineMutationMethods !== false) {
      try {
        this._defineMutationMethods({
          useExisting: options._suppressSameNameError === true
        });
      } catch (error) {
        // Throw a more understandable error on the server for same collection name
        if (error.message === "A method named '/".concat(name, "/insert' is already defined")) throw new Error("There is already a collection named \"".concat(name, "\""));
        throw error;
      }
    } // autopublish


    if (Package.autopublish && !options._preventAutopublish && this._connection && this._connection.publish) {
      this._connection.publish(null, () => this.find(), {
        is_auto: true
      });
    }
  };

  Object.assign(Mongo.Collection.prototype, {
    _maybeSetUpReplication(name, _ref) {
      let {
        _suppressSameNameError = false
      } = _ref;
      const self = this;

      if (!(self._connection && self._connection.registerStore)) {
        return;
      } // OK, we're going to be a slave, replicating some remote
      // database, except possibly with some temporary divergence while
      // we have unacknowledged RPC's.


      const ok = self._connection.registerStore(name, {
        // Called at the beginning of a batch of updates. batchSize is the number
        // of update calls to expect.
        //
        // XXX This interface is pretty janky. reset probably ought to go back to
        // being its own function, and callers shouldn't have to calculate
        // batchSize. The optimization of not calling pause/remove should be
        // delayed until later: the first call to update() should buffer its
        // message, and then we can either directly apply it at endUpdate time if
        // it was the only update, or do pauseObservers/apply/apply at the next
        // update() if there's another one.
        beginUpdate(batchSize, reset) {
          // pause observers so users don't see flicker when updating several
          // objects at once (including the post-reconnect reset-and-reapply
          // stage), and so that a re-sorting of a query can take advantage of the
          // full _diffQuery moved calculation instead of applying change one at a
          // time.
          if (batchSize > 1 || reset) self._collection.pauseObservers();
          if (reset) self._collection.remove({});
        },

        // Apply an update.
        // XXX better specify this interface (not in terms of a wire message)?
        update(msg) {
          var mongoId = MongoID.idParse(msg.id);

          var doc = self._collection._docs.get(mongoId); // Is this a "replace the whole doc" message coming from the quiescence
          // of method writes to an object? (Note that 'undefined' is a valid
          // value meaning "remove it".)


          if (msg.msg === 'replace') {
            var replace = msg.replace;

            if (!replace) {
              if (doc) self._collection.remove(mongoId);
            } else if (!doc) {
              self._collection.insert(replace);
            } else {
              // XXX check that replace has no $ ops
              self._collection.update(mongoId, replace);
            }

            return;
          } else if (msg.msg === 'added') {
            if (doc) {
              throw new Error("Expected not to find a document already present for an add");
            }

            self._collection.insert(_objectSpread({
              _id: mongoId
            }, msg.fields));
          } else if (msg.msg === 'removed') {
            if (!doc) throw new Error("Expected to find a document already present for removed");

            self._collection.remove(mongoId);
          } else if (msg.msg === 'changed') {
            if (!doc) throw new Error("Expected to find a document to change");
            const keys = Object.keys(msg.fields);

            if (keys.length > 0) {
              var modifier = {};
              keys.forEach(key => {
                const value = msg.fields[key];

                if (EJSON.equals(doc[key], value)) {
                  return;
                }

                if (typeof value === "undefined") {
                  if (!modifier.$unset) {
                    modifier.$unset = {};
                  }

                  modifier.$unset[key] = 1;
                } else {
                  if (!modifier.$set) {
                    modifier.$set = {};
                  }

                  modifier.$set[key] = value;
                }
              });

              if (Object.keys(modifier).length > 0) {
                self._collection.update(mongoId, modifier);
              }
            }
          } else {
            throw new Error("I don't know how to deal with this message");
          }
        },

        // Called at the end of a batch of updates.
        endUpdate() {
          self._collection.resumeObservers();
        },

        // Called around method stub invocations to capture the original versions
        // of modified documents.
        saveOriginals() {
          self._collection.saveOriginals();
        },

        retrieveOriginals() {
          return self._collection.retrieveOriginals();
        },

        // Used to preserve current versions of documents across a store reset.
        getDoc(id) {
          return self.findOne(id);
        },

        // To be able to get back to the collection from the store.
        _getCollection() {
          return self;
        }

      });

      if (!ok) {
        const message = "There is already a collection named \"".concat(name, "\"");

        if (_suppressSameNameError === true) {
          // XXX In theory we do not have to throw when `ok` is falsy. The
          // store is already defined for this collection name, but this
          // will simply be another reference to it and everything should
          // work. However, we have historically thrown an error here, so
          // for now we will skip the error only when _suppressSameNameError
          // is `true`, allowing people to opt in and give this some real
          // world testing.
          console.warn ? console.warn(message) : console.log(message);
        } else {
          throw new Error(message);
        }
      }
    },

    ///
    /// Main collection API
    ///
    _getFindSelector(args) {
      if (args.length == 0) return {};else return args[0];
    },

    _getFindOptions(args) {
      var self = this;

      if (args.length < 2) {
        return {
          transform: self._transform
        };
      } else {
        check(args[1], Match.Optional(Match.ObjectIncluding({
          fields: Match.Optional(Match.OneOf(Object, undefined)),
          sort: Match.Optional(Match.OneOf(Object, Array, Function, undefined)),
          limit: Match.Optional(Match.OneOf(Number, undefined)),
          skip: Match.Optional(Match.OneOf(Number, undefined))
        })));
        return _objectSpread({
          transform: self._transform
        }, args[1]);
      }
    },

    /**
     * @summary Find the documents in a collection that match the selector.
     * @locus Anywhere
     * @method find
     * @memberof Mongo.Collection
     * @instance
     * @param {MongoSelector} [selector] A query describing the documents to find
     * @param {Object} [options]
     * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
     * @param {Number} options.skip Number of results to skip at the beginning
     * @param {Number} options.limit Maximum number of results to return
     * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
     * @param {Boolean} options.reactive (Client only) Default `true`; pass `false` to disable reactivity
     * @param {Function} options.transform Overrides `transform` on the  [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
     * @param {Boolean} options.disableOplog (Server only) Pass true to disable oplog-tailing on this query. This affects the way server processes calls to `observe` on this query. Disabling the oplog can be useful when working with data that updates in large batches.
     * @param {Number} options.pollingIntervalMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the frequency (in milliseconds) of how often to poll this query when observing on the server. Defaults to 10000ms (10 seconds).
     * @param {Number} options.pollingThrottleMs (Server only) When oplog is disabled (through the use of `disableOplog` or when otherwise not available), the minimum time (in milliseconds) to allow between re-polling when observing on the server. Increasing this will save CPU and mongo load at the expense of slower updates to users. Decreasing this is not recommended. Defaults to 50ms.
     * @param {Number} options.maxTimeMs (Server only) If set, instructs MongoDB to set a time limit for this cursor's operations. If the operation reaches the specified time limit (in milliseconds) without the having been completed, an exception will be thrown. Useful to prevent an (accidental or malicious) unoptimized query from causing a full collection scan that would disrupt other database users, at the expense of needing to handle the resulting error.
     * @param {String|Object} options.hint (Server only) Overrides MongoDB's default index selection and query optimization process. Specify an index to force its use, either by its name or index specification. You can also specify `{ $natural : 1 }` to force a forwards collection scan, or `{ $natural : -1 }` for a reverse collection scan. Setting this is only recommended for advanced users.
     * @param {String} options.readPreference (Server only) Specifies a custom MongoDB [`readPreference`](https://docs.mongodb.com/manual/core/read-preference) for this particular cursor. Possible values are `primary`, `primaryPreferred`, `secondary`, `secondaryPreferred` and `nearest`.
     * @returns {Mongo.Cursor}
     */
    find() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      // Collection.find() (return all docs) behaves differently
      // from Collection.find(undefined) (return 0 docs).  so be
      // careful about the length of arguments.
      return this._collection.find(this._getFindSelector(args), this._getFindOptions(args));
    },

    /**
     * @summary Finds the first document that matches the selector, as ordered by sort and skip options. Returns `undefined` if no matching document is found.
     * @locus Anywhere
     * @method findOne
     * @memberof Mongo.Collection
     * @instance
     * @param {MongoSelector} [selector] A query describing the documents to find
     * @param {Object} [options]
     * @param {MongoSortSpecifier} options.sort Sort order (default: natural order)
     * @param {Number} options.skip Number of results to skip at the beginning
     * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
     * @param {Boolean} options.reactive (Client only) Default true; pass false to disable reactivity
     * @param {Function} options.transform Overrides `transform` on the [`Collection`](#collections) for this cursor.  Pass `null` to disable transformation.
     * @param {String} options.readPreference (Server only) Specifies a custom MongoDB [`readPreference`](https://docs.mongodb.com/manual/core/read-preference) for fetching the document. Possible values are `primary`, `primaryPreferred`, `secondary`, `secondaryPreferred` and `nearest`.
     * @returns {Object}
     */
    findOne() {
      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      return this._collection.findOne(this._getFindSelector(args), this._getFindOptions(args));
    }

  });
  Object.assign(Mongo.Collection, {
    _publishCursor(cursor, sub, collection) {
      var observeHandle = cursor.observeChanges({
        added: function (id, fields) {
          sub.added(collection, id, fields);
        },
        changed: function (id, fields) {
          sub.changed(collection, id, fields);
        },
        removed: function (id) {
          sub.removed(collection, id);
        }
      }, // Publications don't mutate the documents
      // This is tested by the `livedata - publish callbacks clone` test
      {
        nonMutatingCallbacks: true
      }); // We don't call sub.ready() here: it gets called in livedata_server, after
      // possibly calling _publishCursor on multiple returned cursors.
      // register stop callback (expects lambda w/ no args).

      sub.onStop(function () {
        observeHandle.stop();
      }); // return the observeHandle in case it needs to be stopped early

      return observeHandle;
    },

    // protect against dangerous selectors.  falsey and {_id: falsey} are both
    // likely programmer error, and not what you want, particularly for destructive
    // operations. If a falsey _id is sent in, a new string _id will be
    // generated and returned; if a fallbackId is provided, it will be returned
    // instead.
    _rewriteSelector(selector) {
      let {
        fallbackId
      } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      // shorthand -- scalars match _id
      if (LocalCollection._selectorIsId(selector)) selector = {
        _id: selector
      };

      if (Array.isArray(selector)) {
        // This is consistent with the Mongo console itself; if we don't do this
        // check passing an empty array ends up selecting all items
        throw new Error("Mongo selector can't be an array.");
      }

      if (!selector || '_id' in selector && !selector._id) {
        // can't match anything
        return {
          _id: fallbackId || Random.id()
        };
      }

      return selector;
    }

  });
  Object.assign(Mongo.Collection.prototype, {
    // 'insert' immediately returns the inserted document's new _id.
    // The others return values immediately if you are in a stub, an in-memory
    // unmanaged collection, or a mongo-backed collection and you don't pass a
    // callback. 'update' and 'remove' return the number of affected
    // documents. 'upsert' returns an object with keys 'numberAffected' and, if an
    // insert happened, 'insertedId'.
    //
    // Otherwise, the semantics are exactly like other methods: they take
    // a callback as an optional last argument; if no callback is
    // provided, they block until the operation is complete, and throw an
    // exception if it fails; if a callback is provided, then they don't
    // necessarily block, and they call the callback when they finish with error and
    // result arguments.  (The insert method provides the document ID as its result;
    // update and remove provide the number of affected docs as the result; upsert
    // provides an object with numberAffected and maybe insertedId.)
    //
    // On the client, blocking is impossible, so if a callback
    // isn't provided, they just return immediately and any error
    // information is lost.
    //
    // There's one more tweak. On the client, if you don't provide a
    // callback, then if there is an error, a message will be logged with
    // Meteor._debug.
    //
    // The intent (though this is actually determined by the underlying
    // drivers) is that the operations should be done synchronously, not
    // generating their result until the database has acknowledged
    // them. In the future maybe we should provide a flag to turn this
    // off.

    /**
     * @summary Insert a document in the collection.  Returns its unique _id.
     * @locus Anywhere
     * @method  insert
     * @memberof Mongo.Collection
     * @instance
     * @param {Object} doc The document to insert. May not yet have an _id attribute, in which case Meteor will generate one for you.
     * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the _id as the second.
     */
    insert(doc, callback) {
      // Make sure we were passed a document to insert
      if (!doc) {
        throw new Error("insert requires an argument");
      } // Make a shallow clone of the document, preserving its prototype.


      doc = Object.create(Object.getPrototypeOf(doc), Object.getOwnPropertyDescriptors(doc));

      if ('_id' in doc) {
        if (!doc._id || !(typeof doc._id === 'string' || doc._id instanceof Mongo.ObjectID)) {
          throw new Error("Meteor requires document _id fields to be non-empty strings or ObjectIDs");
        }
      } else {
        let generateId = true; // Don't generate the id if we're the client and the 'outermost' call
        // This optimization saves us passing both the randomSeed and the id
        // Passing both is redundant.

        if (this._isRemoteCollection()) {
          const enclosing = DDP._CurrentMethodInvocation.get();

          if (!enclosing) {
            generateId = false;
          }
        }

        if (generateId) {
          doc._id = this._makeNewID();
        }
      } // On inserts, always return the id that we generated; on all other
      // operations, just return the result from the collection.


      var chooseReturnValueFromCollectionResult = function (result) {
        if (doc._id) {
          return doc._id;
        } // XXX what is this for??
        // It's some iteraction between the callback to _callMutatorMethod and
        // the return value conversion


        doc._id = result;
        return result;
      };

      const wrappedCallback = wrapCallback(callback, chooseReturnValueFromCollectionResult);

      if (this._isRemoteCollection()) {
        const result = this._callMutatorMethod("insert", [doc], wrappedCallback);

        return chooseReturnValueFromCollectionResult(result);
      } // it's my collection.  descend into the collection object
      // and propagate any exception.


      try {
        // If the user provided a callback and the collection implements this
        // operation asynchronously, then queryRet will be undefined, and the
        // result will be returned through the callback instead.
        const result = this._collection.insert(doc, wrappedCallback);

        return chooseReturnValueFromCollectionResult(result);
      } catch (e) {
        if (callback) {
          callback(e);
          return null;
        }

        throw e;
      }
    },

    /**
     * @summary Modify one or more documents in the collection. Returns the number of matched documents.
     * @locus Anywhere
     * @method update
     * @memberof Mongo.Collection
     * @instance
     * @param {MongoSelector} selector Specifies which documents to modify
     * @param {MongoModifier} modifier Specifies how to modify the documents
     * @param {Object} [options]
     * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
     * @param {Boolean} options.upsert True to insert a document if no matching documents are found.
     * @param {Array} options.arrayFilters Optional. Used in combination with MongoDB [filtered positional operator](https://docs.mongodb.com/manual/reference/operator/update/positional-filtered/) to specify which elements to modify in an array field.
     * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
     */
    update(selector, modifier) {
      for (var _len3 = arguments.length, optionsAndCallback = new Array(_len3 > 2 ? _len3 - 2 : 0), _key3 = 2; _key3 < _len3; _key3++) {
        optionsAndCallback[_key3 - 2] = arguments[_key3];
      }

      const callback = popCallbackFromArgs(optionsAndCallback); // We've already popped off the callback, so we are left with an array
      // of one or zero items

      const options = _objectSpread({}, optionsAndCallback[0] || null);

      let insertedId;

      if (options && options.upsert) {
        // set `insertedId` if absent.  `insertedId` is a Meteor extension.
        if (options.insertedId) {
          if (!(typeof options.insertedId === 'string' || options.insertedId instanceof Mongo.ObjectID)) throw new Error("insertedId must be string or ObjectID");
          insertedId = options.insertedId;
        } else if (!selector || !selector._id) {
          insertedId = this._makeNewID();
          options.generatedId = true;
          options.insertedId = insertedId;
        }
      }

      selector = Mongo.Collection._rewriteSelector(selector, {
        fallbackId: insertedId
      });
      const wrappedCallback = wrapCallback(callback);

      if (this._isRemoteCollection()) {
        const args = [selector, modifier, options];
        return this._callMutatorMethod("update", args, wrappedCallback);
      } // it's my collection.  descend into the collection object
      // and propagate any exception.


      try {
        // If the user provided a callback and the collection implements this
        // operation asynchronously, then queryRet will be undefined, and the
        // result will be returned through the callback instead.
        return this._collection.update(selector, modifier, options, wrappedCallback);
      } catch (e) {
        if (callback) {
          callback(e);
          return null;
        }

        throw e;
      }
    },

    /**
     * @summary Remove documents from the collection
     * @locus Anywhere
     * @method remove
     * @memberof Mongo.Collection
     * @instance
     * @param {MongoSelector} selector Specifies which documents to remove
     * @param {Function} [callback] Optional.  If present, called with an error object as its argument.
     */
    remove(selector, callback) {
      selector = Mongo.Collection._rewriteSelector(selector);
      const wrappedCallback = wrapCallback(callback);

      if (this._isRemoteCollection()) {
        return this._callMutatorMethod("remove", [selector], wrappedCallback);
      } // it's my collection.  descend into the collection object
      // and propagate any exception.


      try {
        // If the user provided a callback and the collection implements this
        // operation asynchronously, then queryRet will be undefined, and the
        // result will be returned through the callback instead.
        return this._collection.remove(selector, wrappedCallback);
      } catch (e) {
        if (callback) {
          callback(e);
          return null;
        }

        throw e;
      }
    },

    // Determine if this collection is simply a minimongo representation of a real
    // database on another server
    _isRemoteCollection() {
      // XXX see #MeteorServerNull
      return this._connection && this._connection !== Meteor.server;
    },

    /**
     * @summary Modify one or more documents in the collection, or insert one if no matching documents were found. Returns an object with keys `numberAffected` (the number of documents modified)  and `insertedId` (the unique _id of the document that was inserted, if any).
     * @locus Anywhere
     * @method upsert
     * @memberof Mongo.Collection
     * @instance
     * @param {MongoSelector} selector Specifies which documents to modify
     * @param {MongoModifier} modifier Specifies how to modify the documents
     * @param {Object} [options]
     * @param {Boolean} options.multi True to modify all matching documents; false to only modify one of the matching documents (the default).
     * @param {Function} [callback] Optional.  If present, called with an error object as the first argument and, if no error, the number of affected documents as the second.
     */
    upsert(selector, modifier, options, callback) {
      if (!callback && typeof options === "function") {
        callback = options;
        options = {};
      }

      return this.update(selector, modifier, _objectSpread(_objectSpread({}, options), {}, {
        _returnObject: true,
        upsert: true
      }), callback);
    },

    // We'll actually design an index API later. For now, we just pass through to
    // Mongo's, but make it synchronous.
    _ensureIndex(index, options) {
      var self = this;
      if (!self._collection._ensureIndex) throw new Error("Can only call _ensureIndex on server collections");

      self._collection._ensureIndex(index, options);
    },

    _dropIndex(index) {
      var self = this;
      if (!self._collection._dropIndex) throw new Error("Can only call _dropIndex on server collections");

      self._collection._dropIndex(index);
    },

    _dropCollection() {
      var self = this;
      if (!self._collection.dropCollection) throw new Error("Can only call _dropCollection on server collections");

      self._collection.dropCollection();
    },

    _createCappedCollection(byteSize, maxDocuments) {
      var self = this;
      if (!self._collection._createCappedCollection) throw new Error("Can only call _createCappedCollection on server collections");

      self._collection._createCappedCollection(byteSize, maxDocuments);
    },

    /**
     * @summary Returns the [`Collection`](http://mongodb.github.io/node-mongodb-native/3.0/api/Collection.html) object corresponding to this collection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
     * @locus Server
     * @memberof Mongo.Collection
     * @instance
     */
    rawCollection() {
      var self = this;

      if (!self._collection.rawCollection) {
        throw new Error("Can only call rawCollection on server collections");
      }

      return self._collection.rawCollection();
    },

    /**
     * @summary Returns the [`Db`](http://mongodb.github.io/node-mongodb-native/3.0/api/Db.html) object corresponding to this collection's database connection from the [npm `mongodb` driver module](https://www.npmjs.com/package/mongodb) which is wrapped by `Mongo.Collection`.
     * @locus Server
     * @memberof Mongo.Collection
     * @instance
     */
    rawDatabase() {
      var self = this;

      if (!(self._driver.mongo && self._driver.mongo.db)) {
        throw new Error("Can only call rawDatabase on server collections");
      }

      return self._driver.mongo.db;
    }

  }); // Convert the callback to not return a result if there is an error

  function wrapCallback(callback, convertResult) {
    return callback && function (error, result) {
      if (error) {
        callback(error);
      } else if (typeof convertResult === "function") {
        callback(error, convertResult(result));
      } else {
        callback(error, result);
      }
    };
  }
  /**
   * @summary Create a Mongo-style `ObjectID`.  If you don't specify a `hexString`, the `ObjectID` will generated randomly (not using MongoDB's ID construction rules).
   * @locus Anywhere
   * @class
   * @param {String} [hexString] Optional.  The 24-character hexadecimal contents of the ObjectID to create
   */


  Mongo.ObjectID = MongoID.ObjectID;
  /**
   * @summary To create a cursor, use find. To access the documents in a cursor, use forEach, map, or fetch.
   * @class
   * @instanceName cursor
   */

  Mongo.Cursor = LocalCollection.Cursor;
  /**
   * @deprecated in 0.9.1
   */

  Mongo.Collection.Cursor = Mongo.Cursor;
  /**
   * @deprecated in 0.9.1
   */

  Mongo.Collection.ObjectID = Mongo.ObjectID;
  /**
   * @deprecated in 0.9.1
   */

  Meteor.Collection = Mongo.Collection; // Allow deny stuff is now in the allow-deny package

  Object.assign(Meteor.Collection.prototype, AllowDeny.CollectionPrototype);

  function popCallbackFromArgs(args) {
    // Pull off any callback (or perhaps a 'callback' variable that was passed
    // in undefined, like how 'upsert' does it).
    if (args.length && (args[args.length - 1] === undefined || args[args.length - 1] instanceof Function)) {
      return args.pop();
    }
  }
}.call(this, module);
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"connection_options.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/mongo/connection_options.js                                                                                //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
/**
 * @summary Allows for user specified connection options
 * @example http://mongodb.github.io/node-mongodb-native/3.0/reference/connecting/connection-settings/
 * @locus Server
 * @param {Object} options User specified Mongo connection options
 */
Mongo.setConnectionOptions = function setConnectionOptions(options) {
  check(options, Object);
  Mongo._connectionOptions = options;
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/mongo/mongo_driver.js");
require("/node_modules/meteor/mongo/oplog_tailing.js");
require("/node_modules/meteor/mongo/observe_multiplex.js");
require("/node_modules/meteor/mongo/doc_fetcher.js");
require("/node_modules/meteor/mongo/polling_observe_driver.js");
require("/node_modules/meteor/mongo/oplog_observe_driver.js");
require("/node_modules/meteor/mongo/local_collection_driver.js");
require("/node_modules/meteor/mongo/remote_collection_driver.js");
require("/node_modules/meteor/mongo/collection.js");
require("/node_modules/meteor/mongo/connection_options.js");

/* Exports */
Package._define("mongo", {
  MongoInternals: MongoInternals,
  Mongo: Mongo,
  ObserveMultiplexer: ObserveMultiplexer
});

})();

//# sourceURL=meteor://💻app/packages/mongo.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vbW9uZ29fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vcGxvZ190YWlsaW5nLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9vYnNlcnZlX211bHRpcGxleC5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vZG9jX2ZldGNoZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL3BvbGxpbmdfb2JzZXJ2ZV9kcml2ZXIuanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL21vbmdvL29wbG9nX29ic2VydmVfZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9sb2NhbF9jb2xsZWN0aW9uX2RyaXZlci5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvbW9uZ28vcmVtb3RlX2NvbGxlY3Rpb25fZHJpdmVyLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb2xsZWN0aW9uLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9tb25nby9jb25uZWN0aW9uX29wdGlvbnMuanMiXSwibmFtZXMiOlsiX29iamVjdFNwcmVhZCIsIm1vZHVsZTEiLCJsaW5rIiwiZGVmYXVsdCIsInYiLCJEb2NGZXRjaGVyIiwicGF0aCIsInJlcXVpcmUiLCJNb25nb0RCIiwiTnBtTW9kdWxlTW9uZ29kYiIsIkZ1dHVyZSIsIk5wbSIsIk1vbmdvSW50ZXJuYWxzIiwiTnBtTW9kdWxlcyIsIm1vbmdvZGIiLCJ2ZXJzaW9uIiwiTnBtTW9kdWxlTW9uZ29kYlZlcnNpb24iLCJtb2R1bGUiLCJOcG1Nb2R1bGUiLCJGSUxFX0FTU0VUX1NVRkZJWCIsIkFTU0VUU19GT0xERVIiLCJBUFBfRk9MREVSIiwicmVwbGFjZU5hbWVzIiwiZmlsdGVyIiwidGhpbmciLCJfIiwiaXNBcnJheSIsIm1hcCIsImJpbmQiLCJyZXQiLCJlYWNoIiwidmFsdWUiLCJrZXkiLCJUaW1lc3RhbXAiLCJwcm90b3R5cGUiLCJjbG9uZSIsIm1ha2VNb25nb0xlZ2FsIiwibmFtZSIsInVubWFrZU1vbmdvTGVnYWwiLCJzdWJzdHIiLCJyZXBsYWNlTW9uZ29BdG9tV2l0aE1ldGVvciIsImRvY3VtZW50IiwiQmluYXJ5IiwiYnVmZmVyIiwiVWludDhBcnJheSIsIk9iamVjdElEIiwiTW9uZ28iLCJ0b0hleFN0cmluZyIsIkRlY2ltYWwxMjgiLCJEZWNpbWFsIiwidG9TdHJpbmciLCJzaXplIiwiRUpTT04iLCJmcm9tSlNPTlZhbHVlIiwidW5kZWZpbmVkIiwicmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28iLCJpc0JpbmFyeSIsIkJ1ZmZlciIsImZyb20iLCJmcm9tU3RyaW5nIiwiX2lzQ3VzdG9tVHlwZSIsInRvSlNPTlZhbHVlIiwicmVwbGFjZVR5cGVzIiwiYXRvbVRyYW5zZm9ybWVyIiwicmVwbGFjZWRUb3BMZXZlbEF0b20iLCJ2YWwiLCJ2YWxSZXBsYWNlZCIsIk1vbmdvQ29ubmVjdGlvbiIsInVybCIsIm9wdGlvbnMiLCJzZWxmIiwiX29ic2VydmVNdWx0aXBsZXhlcnMiLCJfb25GYWlsb3Zlckhvb2siLCJIb29rIiwidXNlck9wdGlvbnMiLCJfY29ubmVjdGlvbk9wdGlvbnMiLCJNZXRlb3IiLCJzZXR0aW5ncyIsInBhY2thZ2VzIiwibW9uZ28iLCJtb25nb09wdGlvbnMiLCJPYmplY3QiLCJhc3NpZ24iLCJpZ25vcmVVbmRlZmluZWQiLCJ1c2VVbmlmaWVkVG9wb2xvZ3kiLCJhdXRvUmVjb25uZWN0IiwicmVjb25uZWN0VHJpZXMiLCJJbmZpbml0eSIsInRlc3QiLCJuYXRpdmVfcGFyc2VyIiwiaGFzIiwicG9vbFNpemUiLCJlbnRyaWVzIiwiZW5kc1dpdGgiLCJmb3JFYWNoIiwib3B0aW9uTmFtZSIsInJlcGxhY2UiLCJqb2luIiwiQXNzZXRzIiwiZ2V0U2VydmVyRGlyIiwiZGIiLCJfcHJpbWFyeSIsIl9vcGxvZ0hhbmRsZSIsIl9kb2NGZXRjaGVyIiwiY29ubmVjdEZ1dHVyZSIsImNvbm5lY3QiLCJiaW5kRW52aXJvbm1lbnQiLCJlcnIiLCJjbGllbnQiLCJzZXJ2ZXJDb25maWciLCJpc01hc3RlckRvYyIsInByaW1hcnkiLCJvbiIsImtpbmQiLCJkb2MiLCJjYWxsYmFjayIsIm1lIiwicmVzb2x2ZXIiLCJ3YWl0Iiwib3Bsb2dVcmwiLCJQYWNrYWdlIiwiT3Bsb2dIYW5kbGUiLCJkYXRhYmFzZU5hbWUiLCJjbG9zZSIsIkVycm9yIiwib3Bsb2dIYW5kbGUiLCJzdG9wIiwid3JhcCIsInJhd0NvbGxlY3Rpb24iLCJjb2xsZWN0aW9uTmFtZSIsImZ1dHVyZSIsImNvbGxlY3Rpb24iLCJfY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbiIsImJ5dGVTaXplIiwibWF4RG9jdW1lbnRzIiwiY3JlYXRlQ29sbGVjdGlvbiIsImNhcHBlZCIsIm1heCIsIl9tYXliZUJlZ2luV3JpdGUiLCJmZW5jZSIsIkREUFNlcnZlciIsIl9DdXJyZW50V3JpdGVGZW5jZSIsImdldCIsImJlZ2luV3JpdGUiLCJjb21taXR0ZWQiLCJfb25GYWlsb3ZlciIsInJlZ2lzdGVyIiwid3JpdGVDYWxsYmFjayIsIndyaXRlIiwicmVmcmVzaCIsInJlc3VsdCIsInJlZnJlc2hFcnIiLCJiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSIsIl9pbnNlcnQiLCJjb2xsZWN0aW9uX25hbWUiLCJzZW5kRXJyb3IiLCJlIiwiX2V4cGVjdGVkQnlUZXN0IiwiTG9jYWxDb2xsZWN0aW9uIiwiX2lzUGxhaW5PYmplY3QiLCJpZCIsIl9pZCIsImluc2VydCIsInNhZmUiLCJfcmVmcmVzaCIsInNlbGVjdG9yIiwicmVmcmVzaEtleSIsInNwZWNpZmljSWRzIiwiX2lkc01hdGNoZWRCeVNlbGVjdG9yIiwiZXh0ZW5kIiwiX3JlbW92ZSIsIndyYXBwZWRDYWxsYmFjayIsImRyaXZlclJlc3VsdCIsInRyYW5zZm9ybVJlc3VsdCIsIm51bWJlckFmZmVjdGVkIiwicmVtb3ZlIiwiX2Ryb3BDb2xsZWN0aW9uIiwiY2IiLCJkcm9wQ29sbGVjdGlvbiIsImRyb3AiLCJfZHJvcERhdGFiYXNlIiwiZHJvcERhdGFiYXNlIiwiX3VwZGF0ZSIsIm1vZCIsIkZ1bmN0aW9uIiwibW9uZ29PcHRzIiwiYXJyYXlGaWx0ZXJzIiwidXBzZXJ0IiwibXVsdGkiLCJmdWxsUmVzdWx0IiwibW9uZ29TZWxlY3RvciIsIm1vbmdvTW9kIiwiaXNNb2RpZnkiLCJfaXNNb2RpZmljYXRpb25Nb2QiLCJfZm9yYmlkUmVwbGFjZSIsImtub3duSWQiLCJuZXdEb2MiLCJfY3JlYXRlVXBzZXJ0RG9jdW1lbnQiLCJpbnNlcnRlZElkIiwiZ2VuZXJhdGVkSWQiLCJzaW11bGF0ZVVwc2VydFdpdGhJbnNlcnRlZElkIiwiZXJyb3IiLCJfcmV0dXJuT2JqZWN0IiwiaGFzT3duUHJvcGVydHkiLCIkc2V0T25JbnNlcnQiLCJ1cGRhdGUiLCJtZXRlb3JSZXN1bHQiLCJtb25nb1Jlc3VsdCIsInVwc2VydGVkIiwibGVuZ3RoIiwibiIsIk5VTV9PUFRJTUlTVElDX1RSSUVTIiwiX2lzQ2Fubm90Q2hhbmdlSWRFcnJvciIsImVycm1zZyIsImluZGV4T2YiLCJtb25nb09wdHNGb3JVcGRhdGUiLCJtb25nb09wdHNGb3JJbnNlcnQiLCJyZXBsYWNlbWVudFdpdGhJZCIsInRyaWVzIiwiZG9VcGRhdGUiLCJkb0NvbmRpdGlvbmFsSW5zZXJ0IiwibWV0aG9kIiwid3JhcEFzeW5jIiwiYXBwbHkiLCJhcmd1bWVudHMiLCJmaW5kIiwiQ3Vyc29yIiwiQ3Vyc29yRGVzY3JpcHRpb24iLCJmaW5kT25lIiwibGltaXQiLCJmZXRjaCIsIl9lbnN1cmVJbmRleCIsImluZGV4IiwiaW5kZXhOYW1lIiwiZW5zdXJlSW5kZXgiLCJfZHJvcEluZGV4IiwiZHJvcEluZGV4IiwiQ29sbGVjdGlvbiIsIl9yZXdyaXRlU2VsZWN0b3IiLCJjdXJzb3JEZXNjcmlwdGlvbiIsIl9tb25nbyIsIl9jdXJzb3JEZXNjcmlwdGlvbiIsIl9zeW5jaHJvbm91c0N1cnNvciIsIlN5bWJvbCIsIml0ZXJhdG9yIiwidGFpbGFibGUiLCJfY3JlYXRlU3luY2hyb25vdXNDdXJzb3IiLCJzZWxmRm9ySXRlcmF0aW9uIiwidXNlVHJhbnNmb3JtIiwicmV3aW5kIiwiZ2V0VHJhbnNmb3JtIiwidHJhbnNmb3JtIiwiX3B1Ymxpc2hDdXJzb3IiLCJzdWIiLCJfZ2V0Q29sbGVjdGlvbk5hbWUiLCJvYnNlcnZlIiwiY2FsbGJhY2tzIiwiX29ic2VydmVGcm9tT2JzZXJ2ZUNoYW5nZXMiLCJvYnNlcnZlQ2hhbmdlcyIsIm1ldGhvZHMiLCJvcmRlcmVkIiwiX29ic2VydmVDaGFuZ2VzQ2FsbGJhY2tzQXJlT3JkZXJlZCIsImV4Y2VwdGlvbk5hbWUiLCJfZnJvbU9ic2VydmUiLCJfb2JzZXJ2ZUNoYW5nZXMiLCJub25NdXRhdGluZ0NhbGxiYWNrcyIsInBpY2siLCJjdXJzb3JPcHRpb25zIiwic29ydCIsInNraXAiLCJwcm9qZWN0aW9uIiwiZmllbGRzIiwicmVhZFByZWZlcmVuY2UiLCJhd2FpdGRhdGEiLCJudW1iZXJPZlJldHJpZXMiLCJPUExPR19DT0xMRUNUSU9OIiwidHMiLCJvcGxvZ1JlcGxheSIsImRiQ3Vyc29yIiwibWF4VGltZU1zIiwibWF4VGltZU1TIiwiaGludCIsIlN5bmNocm9ub3VzQ3Vyc29yIiwiX2RiQ3Vyc29yIiwiX3NlbGZGb3JJdGVyYXRpb24iLCJfdHJhbnNmb3JtIiwid3JhcFRyYW5zZm9ybSIsIl9zeW5jaHJvbm91c0NvdW50IiwiY291bnQiLCJfdmlzaXRlZElkcyIsIl9JZE1hcCIsIl9yYXdOZXh0T2JqZWN0UHJvbWlzZSIsIlByb21pc2UiLCJyZXNvbHZlIiwicmVqZWN0IiwibmV4dCIsIl9uZXh0T2JqZWN0UHJvbWlzZSIsInNldCIsIl9uZXh0T2JqZWN0UHJvbWlzZVdpdGhUaW1lb3V0IiwidGltZW91dE1TIiwibmV4dE9iamVjdFByb21pc2UiLCJ0aW1lb3V0RXJyIiwidGltZW91dFByb21pc2UiLCJ0aW1lciIsInNldFRpbWVvdXQiLCJyYWNlIiwiY2F0Y2giLCJfbmV4dE9iamVjdCIsImF3YWl0IiwidGhpc0FyZyIsIl9yZXdpbmQiLCJjYWxsIiwicmVzIiwicHVzaCIsImlkZW50aXR5IiwiYXBwbHlTa2lwTGltaXQiLCJnZXRSYXdPYmplY3RzIiwicmVzdWx0cyIsImRvbmUiLCJ0YWlsIiwiZG9jQ2FsbGJhY2siLCJjdXJzb3IiLCJzdG9wcGVkIiwibGFzdFRTIiwibG9vcCIsIm5ld1NlbGVjdG9yIiwiJGd0IiwiZGVmZXIiLCJfb2JzZXJ2ZUNoYW5nZXNUYWlsYWJsZSIsIm9ic2VydmVLZXkiLCJzdHJpbmdpZnkiLCJtdWx0aXBsZXhlciIsIm9ic2VydmVEcml2ZXIiLCJmaXJzdEhhbmRsZSIsIl9ub1lpZWxkc0FsbG93ZWQiLCJPYnNlcnZlTXVsdGlwbGV4ZXIiLCJvblN0b3AiLCJvYnNlcnZlSGFuZGxlIiwiT2JzZXJ2ZUhhbmRsZSIsIm1hdGNoZXIiLCJzb3J0ZXIiLCJjYW5Vc2VPcGxvZyIsImFsbCIsIl90ZXN0T25seVBvbGxDYWxsYmFjayIsIk1pbmltb25nbyIsIk1hdGNoZXIiLCJPcGxvZ09ic2VydmVEcml2ZXIiLCJjdXJzb3JTdXBwb3J0ZWQiLCJTb3J0ZXIiLCJmIiwiZHJpdmVyQ2xhc3MiLCJQb2xsaW5nT2JzZXJ2ZURyaXZlciIsIm1vbmdvSGFuZGxlIiwiX29ic2VydmVEcml2ZXIiLCJhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMiLCJsaXN0ZW5BbGwiLCJsaXN0ZW5DYWxsYmFjayIsImxpc3RlbmVycyIsImZvckVhY2hUcmlnZ2VyIiwidHJpZ2dlciIsIl9JbnZhbGlkYXRpb25Dcm9zc2JhciIsImxpc3RlbiIsImxpc3RlbmVyIiwidHJpZ2dlckNhbGxiYWNrIiwiYWRkZWRCZWZvcmUiLCJhZGRlZCIsIk1vbmdvVGltZXN0YW1wIiwiQ29ubmVjdGlvbiIsIkxvbmciLCJUT09fRkFSX0JFSElORCIsInByb2Nlc3MiLCJlbnYiLCJNRVRFT1JfT1BMT0dfVE9PX0ZBUl9CRUhJTkQiLCJUQUlMX1RJTUVPVVQiLCJNRVRFT1JfT1BMT0dfVEFJTF9USU1FT1VUIiwic2hvd1RTIiwiZ2V0SGlnaEJpdHMiLCJnZXRMb3dCaXRzIiwiaWRGb3JPcCIsIm9wIiwibyIsIm8yIiwiZGJOYW1lIiwiX29wbG9nVXJsIiwiX2RiTmFtZSIsIl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24iLCJfb3Bsb2dUYWlsQ29ubmVjdGlvbiIsIl9zdG9wcGVkIiwiX3RhaWxIYW5kbGUiLCJfcmVhZHlGdXR1cmUiLCJfY3Jvc3NiYXIiLCJfQ3Jvc3NiYXIiLCJmYWN0UGFja2FnZSIsImZhY3ROYW1lIiwiX2Jhc2VPcGxvZ1NlbGVjdG9yIiwibnMiLCJSZWdFeHAiLCJfZXNjYXBlUmVnRXhwIiwiJG9yIiwiJGluIiwiJGV4aXN0cyIsIl9jYXRjaGluZ1VwRnV0dXJlcyIsIl9sYXN0UHJvY2Vzc2VkVFMiLCJfb25Ta2lwcGVkRW50cmllc0hvb2siLCJkZWJ1Z1ByaW50RXhjZXB0aW9ucyIsIl9lbnRyeVF1ZXVlIiwiX0RvdWJsZUVuZGVkUXVldWUiLCJfd29ya2VyQWN0aXZlIiwiX3N0YXJ0VGFpbGluZyIsIm9uT3Bsb2dFbnRyeSIsIm9yaWdpbmFsQ2FsbGJhY2siLCJub3RpZmljYXRpb24iLCJfZGVidWciLCJsaXN0ZW5IYW5kbGUiLCJvblNraXBwZWRFbnRyaWVzIiwid2FpdFVudGlsQ2F1Z2h0VXAiLCJsYXN0RW50cnkiLCIkbmF0dXJhbCIsIl9zbGVlcEZvck1zIiwibGVzc1RoYW5PckVxdWFsIiwiaW5zZXJ0QWZ0ZXIiLCJncmVhdGVyVGhhbiIsInNwbGljZSIsIm1vbmdvZGJVcmkiLCJwYXJzZSIsImRhdGFiYXNlIiwiYWRtaW4iLCJjb21tYW5kIiwiaXNtYXN0ZXIiLCJzZXROYW1lIiwibGFzdE9wbG9nRW50cnkiLCJvcGxvZ1NlbGVjdG9yIiwiX21heWJlU3RhcnRXb3JrZXIiLCJyZXR1cm4iLCJoYW5kbGVEb2MiLCJhcHBseU9wcyIsIm5leHRUaW1lc3RhbXAiLCJhZGQiLCJPTkUiLCJzdGFydHNXaXRoIiwic2xpY2UiLCJmaXJlIiwiaXNFbXB0eSIsInBvcCIsImNsZWFyIiwiX3NldExhc3RQcm9jZXNzZWRUUyIsInNoaWZ0Iiwic2VxdWVuY2VyIiwiX2RlZmluZVRvb0ZhckJlaGluZCIsIl9yZXNldFRvb0ZhckJlaGluZCIsIl9vYmplY3RXaXRob3V0UHJvcGVydGllcyIsIkZhY3RzIiwiaW5jcmVtZW50U2VydmVyRmFjdCIsIl9vcmRlcmVkIiwiX29uU3RvcCIsIl9xdWV1ZSIsIl9TeW5jaHJvbm91c1F1ZXVlIiwiX2hhbmRsZXMiLCJfY2FjaGUiLCJfQ2FjaGluZ0NoYW5nZU9ic2VydmVyIiwiX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkIiwiY2FsbGJhY2tOYW1lcyIsImNhbGxiYWNrTmFtZSIsIl9hcHBseUNhbGxiYWNrIiwidG9BcnJheSIsImhhbmRsZSIsInNhZmVUb1J1blRhc2siLCJydW5UYXNrIiwiX3NlbmRBZGRzIiwicmVtb3ZlSGFuZGxlIiwiX3JlYWR5IiwiX3N0b3AiLCJmcm9tUXVlcnlFcnJvciIsInJlYWR5IiwicXVldWVUYXNrIiwicXVlcnlFcnJvciIsInRocm93Iiwib25GbHVzaCIsImlzUmVzb2x2ZWQiLCJhcmdzIiwiYXBwbHlDaGFuZ2UiLCJrZXlzIiwiaGFuZGxlSWQiLCJfYWRkZWRCZWZvcmUiLCJfYWRkZWQiLCJkb2NzIiwibmV4dE9ic2VydmVIYW5kbGVJZCIsIl9tdWx0aXBsZXhlciIsImJlZm9yZSIsImV4cG9ydCIsIkZpYmVyIiwiY29uc3RydWN0b3IiLCJtb25nb0Nvbm5lY3Rpb24iLCJfbW9uZ29Db25uZWN0aW9uIiwiX2NhbGxiYWNrc0Zvck9wIiwiTWFwIiwiY2hlY2siLCJTdHJpbmciLCJkZWxldGUiLCJydW4iLCJQT0xMSU5HX1RIUk9UVExFX01TIiwiTUVURU9SX1BPTExJTkdfVEhST1RUTEVfTVMiLCJQT0xMSU5HX0lOVEVSVkFMX01TIiwiTUVURU9SX1BPTExJTkdfSU5URVJWQUxfTVMiLCJfbW9uZ29IYW5kbGUiLCJfc3RvcENhbGxiYWNrcyIsIl9yZXN1bHRzIiwiX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCIsIl9wZW5kaW5nV3JpdGVzIiwiX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCIsInRocm90dGxlIiwiX3VudGhyb3R0bGVkRW5zdXJlUG9sbElzU2NoZWR1bGVkIiwicG9sbGluZ1Rocm90dGxlTXMiLCJfdGFza1F1ZXVlIiwibGlzdGVuZXJzSGFuZGxlIiwicG9sbGluZ0ludGVydmFsIiwicG9sbGluZ0ludGVydmFsTXMiLCJfcG9sbGluZ0ludGVydmFsIiwiaW50ZXJ2YWxIYW5kbGUiLCJzZXRJbnRlcnZhbCIsImNsZWFySW50ZXJ2YWwiLCJfcG9sbE1vbmdvIiwiX3N1c3BlbmRQb2xsaW5nIiwiX3Jlc3VtZVBvbGxpbmciLCJmaXJzdCIsIm5ld1Jlc3VsdHMiLCJvbGRSZXN1bHRzIiwid3JpdGVzRm9yQ3ljbGUiLCJjb2RlIiwiSlNPTiIsIm1lc3NhZ2UiLCJBcnJheSIsIl9kaWZmUXVlcnlDaGFuZ2VzIiwidyIsImMiLCJQSEFTRSIsIlFVRVJZSU5HIiwiRkVUQ0hJTkciLCJTVEVBRFkiLCJTd2l0Y2hlZFRvUXVlcnkiLCJmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeSIsImN1cnJlbnRJZCIsIl91c2VzT3Bsb2ciLCJjb21wYXJhdG9yIiwiZ2V0Q29tcGFyYXRvciIsImhlYXBPcHRpb25zIiwiSWRNYXAiLCJfbGltaXQiLCJfY29tcGFyYXRvciIsIl9zb3J0ZXIiLCJfdW5wdWJsaXNoZWRCdWZmZXIiLCJNaW5NYXhIZWFwIiwiX3B1Ymxpc2hlZCIsIk1heEhlYXAiLCJfc2FmZUFwcGVuZFRvQnVmZmVyIiwiX3N0b3BIYW5kbGVzIiwiX3JlZ2lzdGVyUGhhc2VDaGFuZ2UiLCJfbWF0Y2hlciIsIl9wcm9qZWN0aW9uRm4iLCJfY29tcGlsZVByb2plY3Rpb24iLCJfc2hhcmVkUHJvamVjdGlvbiIsImNvbWJpbmVJbnRvUHJvamVjdGlvbiIsIl9zaGFyZWRQcm9qZWN0aW9uRm4iLCJfbmVlZFRvRmV0Y2giLCJfY3VycmVudGx5RmV0Y2hpbmciLCJfZmV0Y2hHZW5lcmF0aW9uIiwiX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSIsIl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5IiwiX25lZWRUb1BvbGxRdWVyeSIsIl9waGFzZSIsIl9oYW5kbGVPcGxvZ0VudHJ5UXVlcnlpbmciLCJfaGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmciLCJmaXJlZCIsIl9vcGxvZ09ic2VydmVEcml2ZXJzIiwib25CZWZvcmVGaXJlIiwiZHJpdmVycyIsImRyaXZlciIsIl9ydW5Jbml0aWFsUXVlcnkiLCJfYWRkUHVibGlzaGVkIiwib3ZlcmZsb3dpbmdEb2NJZCIsIm1heEVsZW1lbnRJZCIsIm92ZXJmbG93aW5nRG9jIiwiZXF1YWxzIiwicmVtb3ZlZCIsIl9hZGRCdWZmZXJlZCIsIl9yZW1vdmVQdWJsaXNoZWQiLCJlbXB0eSIsIm5ld0RvY0lkIiwibWluRWxlbWVudElkIiwiX3JlbW92ZUJ1ZmZlcmVkIiwiX2NoYW5nZVB1Ymxpc2hlZCIsIm9sZERvYyIsInByb2plY3RlZE5ldyIsInByb2plY3RlZE9sZCIsImNoYW5nZWQiLCJEaWZmU2VxdWVuY2UiLCJtYWtlQ2hhbmdlZEZpZWxkcyIsIm1heEJ1ZmZlcmVkSWQiLCJfYWRkTWF0Y2hpbmciLCJtYXhQdWJsaXNoZWQiLCJtYXhCdWZmZXJlZCIsInRvUHVibGlzaCIsImNhbkFwcGVuZFRvQnVmZmVyIiwiY2FuSW5zZXJ0SW50b0J1ZmZlciIsInRvQnVmZmVyIiwiX3JlbW92ZU1hdGNoaW5nIiwiX2hhbmRsZURvYyIsIm1hdGNoZXNOb3ciLCJkb2N1bWVudE1hdGNoZXMiLCJwdWJsaXNoZWRCZWZvcmUiLCJidWZmZXJlZEJlZm9yZSIsImNhY2hlZEJlZm9yZSIsIm1pbkJ1ZmZlcmVkIiwic3RheXNJblB1Ymxpc2hlZCIsInN0YXlzSW5CdWZmZXIiLCJfZmV0Y2hNb2RpZmllZERvY3VtZW50cyIsInRoaXNHZW5lcmF0aW9uIiwid2FpdGluZyIsImZ1dCIsIl9iZVN0ZWFkeSIsIndyaXRlcyIsImlzUmVwbGFjZSIsImNhbkRpcmVjdGx5TW9kaWZ5RG9jIiwibW9kaWZpZXJDYW5CZURpcmVjdGx5QXBwbGllZCIsIl9tb2RpZnkiLCJjYW5CZWNvbWVUcnVlQnlNb2RpZmllciIsImFmZmVjdGVkQnlNb2RpZmllciIsIl9ydW5RdWVyeSIsImluaXRpYWwiLCJfZG9uZVF1ZXJ5aW5nIiwiX3BvbGxRdWVyeSIsIm5ld0J1ZmZlciIsIl9jdXJzb3JGb3JRdWVyeSIsImkiLCJfcHVibGlzaE5ld1Jlc3VsdHMiLCJvcHRpb25zT3ZlcndyaXRlIiwiZGVzY3JpcHRpb24iLCJpZHNUb1JlbW92ZSIsImNvbnNvbGUiLCJfb3Bsb2dFbnRyeUhhbmRsZSIsIl9saXN0ZW5lcnNIYW5kbGUiLCJwaGFzZSIsIm5vdyIsIkRhdGUiLCJ0aW1lRGlmZiIsIl9waGFzZVN0YXJ0VGltZSIsImRpc2FibGVPcGxvZyIsIl9kaXNhYmxlT3Bsb2ciLCJfY2hlY2tTdXBwb3J0ZWRQcm9qZWN0aW9uIiwiaGFzV2hlcmUiLCJoYXNHZW9RdWVyeSIsIm1vZGlmaWVyIiwib3BlcmF0aW9uIiwiZmllbGQiLCJMb2NhbENvbGxlY3Rpb25Ecml2ZXIiLCJub0Nvbm5Db2xsZWN0aW9ucyIsImNyZWF0ZSIsIm9wZW4iLCJjb25uIiwiZW5zdXJlQ29sbGVjdGlvbiIsIl9tb25nb19saXZlZGF0YV9jb2xsZWN0aW9ucyIsImNvbGxlY3Rpb25zIiwiUmVtb3RlQ29sbGVjdGlvbkRyaXZlciIsIm1vbmdvX3VybCIsIm0iLCJkZWZhdWx0UmVtb3RlQ29sbGVjdGlvbkRyaXZlciIsIm9uY2UiLCJjb25uZWN0aW9uT3B0aW9ucyIsIm1vbmdvVXJsIiwiTU9OR09fVVJMIiwiTU9OR09fT1BMT0dfVVJMIiwiY29ubmVjdGlvbiIsIm1hbmFnZXIiLCJpZEdlbmVyYXRpb24iLCJfZHJpdmVyIiwiX3ByZXZlbnRBdXRvcHVibGlzaCIsIl9tYWtlTmV3SUQiLCJzcmMiLCJERFAiLCJyYW5kb21TdHJlYW0iLCJSYW5kb20iLCJpbnNlY3VyZSIsImhleFN0cmluZyIsIl9jb25uZWN0aW9uIiwiaXNDbGllbnQiLCJzZXJ2ZXIiLCJfY29sbGVjdGlvbiIsIl9uYW1lIiwiX21heWJlU2V0VXBSZXBsaWNhdGlvbiIsImRlZmluZU11dGF0aW9uTWV0aG9kcyIsIl9kZWZpbmVNdXRhdGlvbk1ldGhvZHMiLCJ1c2VFeGlzdGluZyIsIl9zdXBwcmVzc1NhbWVOYW1lRXJyb3IiLCJhdXRvcHVibGlzaCIsInB1Ymxpc2giLCJpc19hdXRvIiwicmVnaXN0ZXJTdG9yZSIsIm9rIiwiYmVnaW5VcGRhdGUiLCJiYXRjaFNpemUiLCJyZXNldCIsInBhdXNlT2JzZXJ2ZXJzIiwibXNnIiwibW9uZ29JZCIsIk1vbmdvSUQiLCJpZFBhcnNlIiwiX2RvY3MiLCIkdW5zZXQiLCIkc2V0IiwiZW5kVXBkYXRlIiwicmVzdW1lT2JzZXJ2ZXJzIiwic2F2ZU9yaWdpbmFscyIsInJldHJpZXZlT3JpZ2luYWxzIiwiZ2V0RG9jIiwiX2dldENvbGxlY3Rpb24iLCJ3YXJuIiwibG9nIiwiX2dldEZpbmRTZWxlY3RvciIsIl9nZXRGaW5kT3B0aW9ucyIsIk1hdGNoIiwiT3B0aW9uYWwiLCJPYmplY3RJbmNsdWRpbmciLCJPbmVPZiIsIk51bWJlciIsImZhbGxiYWNrSWQiLCJfc2VsZWN0b3JJc0lkIiwiZ2V0UHJvdG90eXBlT2YiLCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzIiwiZ2VuZXJhdGVJZCIsIl9pc1JlbW90ZUNvbGxlY3Rpb24iLCJlbmNsb3NpbmciLCJfQ3VycmVudE1ldGhvZEludm9jYXRpb24iLCJjaG9vc2VSZXR1cm5WYWx1ZUZyb21Db2xsZWN0aW9uUmVzdWx0Iiwid3JhcENhbGxiYWNrIiwiX2NhbGxNdXRhdG9yTWV0aG9kIiwib3B0aW9uc0FuZENhbGxiYWNrIiwicG9wQ2FsbGJhY2tGcm9tQXJncyIsInJhd0RhdGFiYXNlIiwiY29udmVydFJlc3VsdCIsIkFsbG93RGVueSIsIkNvbGxlY3Rpb25Qcm90b3R5cGUiLCJzZXRDb25uZWN0aW9uT3B0aW9ucyJdLCJtYXBwaW5ncyI6Ijs7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Q0FBSixLQUEwQjNKLFNBQTFCLElBQ0F5YSxJQUFJLENBQUNBLElBQUksQ0FBQzlRLE1BQUwsR0FBYyxDQUFmLENBQUosWUFBaUN6QixRQUZsQyxDQUFKLEVBRWlEO0FBQy9DLGFBQU91UyxJQUFJLENBQUNwQyxHQUFMLEVBQVA7QUFDRDtBQUNGOzs7Ozs7Ozs7Ozs7QUMvd0JEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBN1ksS0FBSyxDQUFDdXJCLG9CQUFOLEdBQTZCLFNBQVNBLG9CQUFULENBQStCaHFCLE9BQS9CLEVBQXdDO0FBQ25FMmEsT0FBSyxDQUFDM2EsT0FBRCxFQUFVWSxNQUFWLENBQUw7QUFDQW5DLE9BQUssQ0FBQzZCLGtCQUFOLEdBQTJCTixPQUEzQjtBQUNELENBSEQsQyIsImZpbGUiOiIvcGFja2FnZXMvbW9uZ28uanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFByb3ZpZGUgYSBzeW5jaHJvbm91cyBDb2xsZWN0aW9uIEFQSSB1c2luZyBmaWJlcnMsIGJhY2tlZCBieVxuICogTW9uZ29EQi4gIFRoaXMgaXMgb25seSBmb3IgdXNlIG9uIHRoZSBzZXJ2ZXIsIGFuZCBtb3N0bHkgaWRlbnRpY2FsXG4gKiB0byB0aGUgY2xpZW50IEFQSS5cbiAqXG4gKiBOT1RFOiB0aGUgcHVibGljIEFQSSBtZXRob2RzIG11c3QgYmUgcnVuIHdpdGhpbiBhIGZpYmVyLiBJZiB5b3UgY2FsbFxuICogdGhlc2Ugb3V0c2lkZSBvZiBhIGZpYmVyIHRoZXkgd2lsbCBleHBsb2RlIVxuICovXG5cbmNvbnN0IHBhdGggPSByZXF1aXJlKFwicGF0aFwiKTtcblxudmFyIE1vbmdvREIgPSBOcG1Nb2R1bGVNb25nb2RiO1xudmFyIEZ1dHVyZSA9IE5wbS5yZXF1aXJlKCdmaWJlcnMvZnV0dXJlJyk7XG5pbXBvcnQgeyBEb2NGZXRjaGVyIH0gZnJvbSBcIi4vZG9jX2ZldGNoZXIuanNcIjtcblxuTW9uZ29JbnRlcm5hbHMgPSB7fTtcblxuTW9uZ29JbnRlcm5hbHMuTnBtTW9kdWxlcyA9IHtcbiAgbW9uZ29kYjoge1xuICAgIHZlcnNpb246IE5wbU1vZHVsZU1vbmdvZGJWZXJzaW9uLFxuICAgIG1vZHVsZTogTW9uZ29EQlxuICB9XG59O1xuXG4vLyBPbGRlciB2ZXJzaW9uIG9mIHdoYXQgaXMgbm93IGF2YWlsYWJsZSB2aWFcbi8vIE1vbmdvSW50ZXJuYWxzLk5wbU1vZHVsZXMubW9uZ29kYi5tb2R1bGUuICBJdCB3YXMgbmV2ZXIgZG9jdW1lbnRlZCwgYnV0XG4vLyBwZW9wbGUgZG8gdXNlIGl0LlxuLy8gWFhYIENPTVBBVCBXSVRIIDEuMC4zLjJcbk1vbmdvSW50ZXJuYWxzLk5wbU1vZHVsZSA9IE1vbmdvREI7XG5cbmNvbnN0IEZJTEVfQVNTRVRfU1VGRklYID0gJ0Fzc2V0JztcbmNvbnN0IEFTU0VUU19GT0xERVIgPSAnYXNzZXRzJztcbmNvbnN0IEFQUF9GT0xERVIgPSAnYXBwJztcblxuLy8gVGhpcyBpcyB1c2VkIHRvIGFkZCBvciByZW1vdmUgRUpTT04gZnJvbSB0aGUgYmVnaW5uaW5nIG9mIGV2ZXJ5dGhpbmcgbmVzdGVkXG4vLyBpbnNpZGUgYW4gRUpTT04gY3VzdG9tIHR5cGUuIEl0IHNob3VsZCBvbmx5IGJlIGNhbGxlZCBvbiBwdXJlIEpTT04hXG52YXIgcmVwbGFjZU5hbWVzID0gZnVuY3Rpb24gKGZpbHRlciwgdGhpbmcpIHtcbiAgaWYgKHR5cGVvZiB0aGluZyA9PT0gXCJvYmplY3RcIiAmJiB0aGluZyAhPT0gbnVsbCkge1xuICAgIGlmIChfLmlzQXJyYXkodGhpbmcpKSB7XG4gICAgICByZXR1cm4gXy5tYXAodGhpbmcsIF8uYmluZChyZXBsYWNlTmFtZXMsIG51bGwsIGZpbHRlcikpO1xuICAgIH1cbiAgICB2YXIgcmV0ID0ge307XG4gICAgXy5lYWNoKHRoaW5nLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgcmV0W2ZpbHRlcihrZXkpXSA9IHJlcGxhY2VOYW1lcyhmaWx0ZXIsIHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmV0O1xuICB9XG4gIHJldHVybiB0aGluZztcbn07XG5cbi8vIEVuc3VyZSB0aGF0IEVKU09OLmNsb25lIGtlZXBzIGEgVGltZXN0YW1wIGFzIGEgVGltZXN0YW1wIChpbnN0ZWFkIG9mIGp1c3Rcbi8vIGRvaW5nIGEgc3RydWN0dXJhbCBjbG9uZSkuXG4vLyBYWFggaG93IG9rIGlzIHRoaXM/IHdoYXQgaWYgdGhlcmUgYXJlIG11bHRpcGxlIGNvcGllcyBvZiBNb25nb0RCIGxvYWRlZD9cbk1vbmdvREIuVGltZXN0YW1wLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uICgpIHtcbiAgLy8gVGltZXN0YW1wcyBzaG91bGQgYmUgaW1tdXRhYmxlLlxuICByZXR1cm4gdGhpcztcbn07XG5cbnZhciBtYWtlTW9uZ29MZWdhbCA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBcIkVKU09OXCIgKyBuYW1lOyB9O1xudmFyIHVubWFrZU1vbmdvTGVnYWwgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gbmFtZS5zdWJzdHIoNSk7IH07XG5cbnZhciByZXBsYWNlTW9uZ29BdG9tV2l0aE1ldGVvciA9IGZ1bmN0aW9uIChkb2N1bWVudCkge1xuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBNb25nb0RCLkJpbmFyeSkge1xuICAgIHZhciBidWZmZXIgPSBkb2N1bWVudC52YWx1ZSh0cnVlKTtcbiAgICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkoYnVmZmVyKTtcbiAgfVxuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBNb25nb0RCLk9iamVjdElEKSB7XG4gICAgcmV0dXJuIG5ldyBNb25nby5PYmplY3RJRChkb2N1bWVudC50b0hleFN0cmluZygpKTtcbiAgfVxuICBpZiAoZG9jdW1lbnQgaW5zdGFuY2VvZiBNb25nb0RCLkRlY2ltYWwxMjgpIHtcbiAgICByZXR1cm4gRGVjaW1hbChkb2N1bWVudC50b1N0cmluZygpKTtcbiAgfVxuICBpZiAoZG9jdW1lbnRbXCJFSlNPTiR0eXBlXCJdICYmIGRvY3VtZW50W1wiRUpTT04kdmFsdWVcIl0gJiYgXy5zaXplKGRvY3VtZW50KSA9PT0gMikge1xuICAgIHJldHVybiBFSlNPTi5mcm9tSlNPTlZhbHVlKHJlcGxhY2VOYW1lcyh1bm1ha2VNb25nb0xlZ2FsLCBkb2N1bWVudCkpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuVGltZXN0YW1wKSB7XG4gICAgLy8gRm9yIG5vdywgdGhlIE1ldGVvciByZXByZXNlbnRhdGlvbiBvZiBhIE1vbmdvIHRpbWVzdGFtcCB0eXBlIChub3QgYSBkYXRlIVxuICAgIC8vIHRoaXMgaXMgYSB3ZWlyZCBpbnRlcm5hbCB0aGluZyB1c2VkIGluIHRoZSBvcGxvZyEpIGlzIHRoZSBzYW1lIGFzIHRoZVxuICAgIC8vIE1vbmdvIHJlcHJlc2VudGF0aW9uLiBXZSBuZWVkIHRvIGRvIHRoaXMgZXhwbGljaXRseSBvciBlbHNlIHdlIHdvdWxkIGRvIGFcbiAgICAvLyBzdHJ1Y3R1cmFsIGNsb25lIGFuZCBsb3NlIHRoZSBwcm90b3R5cGUuXG4gICAgcmV0dXJuIGRvY3VtZW50O1xuICB9XG4gIHJldHVybiB1bmRlZmluZWQ7XG59O1xuXG52YXIgcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28gPSBmdW5jdGlvbiAoZG9jdW1lbnQpIHtcbiAgaWYgKEVKU09OLmlzQmluYXJ5KGRvY3VtZW50KSkge1xuICAgIC8vIFRoaXMgZG9lcyBtb3JlIGNvcGllcyB0aGFuIHdlJ2QgbGlrZSwgYnV0IGlzIG5lY2Vzc2FyeSBiZWNhdXNlXG4gICAgLy8gTW9uZ29EQi5CU09OIG9ubHkgbG9va3MgbGlrZSBpdCB0YWtlcyBhIFVpbnQ4QXJyYXkgKGFuZCBkb2Vzbid0IGFjdHVhbGx5XG4gICAgLy8gc2VyaWFsaXplIGl0IGNvcnJlY3RseSkuXG4gICAgcmV0dXJuIG5ldyBNb25nb0RCLkJpbmFyeShCdWZmZXIuZnJvbShkb2N1bWVudCkpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEKSB7XG4gICAgcmV0dXJuIG5ldyBNb25nb0RCLk9iamVjdElEKGRvY3VtZW50LnRvSGV4U3RyaW5nKCkpO1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIE1vbmdvREIuVGltZXN0YW1wKSB7XG4gICAgLy8gRm9yIG5vdywgdGhlIE1ldGVvciByZXByZXNlbnRhdGlvbiBvZiBhIE1vbmdvIHRpbWVzdGFtcCB0eXBlIChub3QgYSBkYXRlIVxuICAgIC8vIHRoaXMgaXMgYSB3ZWlyZCBpbnRlcm5hbCB0aGluZyB1c2VkIGluIHRoZSBvcGxvZyEpIGlzIHRoZSBzYW1lIGFzIHRoZVxuICAgIC8vIE1vbmdvIHJlcHJlc2VudGF0aW9uLiBXZSBuZWVkIHRvIGRvIHRoaXMgZXhwbGljaXRseSBvciBlbHNlIHdlIHdvdWxkIGRvIGFcbiAgICAvLyBzdHJ1Y3R1cmFsIGNsb25lIGFuZCBsb3NlIHRoZSBwcm90b3R5cGUuXG4gICAgcmV0dXJuIGRvY3VtZW50O1xuICB9XG4gIGlmIChkb2N1bWVudCBpbnN0YW5jZW9mIERlY2ltYWwpIHtcbiAgICByZXR1cm4gTW9uZ29EQi5EZWNpbWFsMTI4LmZyb21TdHJpbmcoZG9jdW1lbnQudG9TdHJpbmcoKSk7XG4gIH1cbiAgaWYgKEVKU09OLl9pc0N1c3RvbVR5cGUoZG9jdW1lbnQpKSB7XG4gICAgcmV0dXJuIHJlcGxhY2VOYW1lcyhtYWtlTW9uZ29MZWdhbCwgRUpTT04udG9KU09OVmFsdWUoZG9jdW1lbnQpKTtcbiAgfVxuICAvLyBJdCBpcyBub3Qgb3JkaW5hcmlseSBwb3NzaWJsZSB0byBzdGljayBkb2xsYXItc2lnbiBrZXlzIGludG8gbW9uZ29cbiAgLy8gc28gd2UgZG9uJ3QgYm90aGVyIGNoZWNraW5nIGZvciB0aGluZ3MgdGhhdCBuZWVkIGVzY2FwaW5nIGF0IHRoaXMgdGltZS5cbiAgcmV0dXJuIHVuZGVmaW5lZDtcbn07XG5cbnZhciByZXBsYWNlVHlwZXMgPSBmdW5jdGlvbiAoZG9jdW1lbnQsIGF0b21UcmFuc2Zvcm1lcikge1xuICBpZiAodHlwZW9mIGRvY3VtZW50ICE9PSAnb2JqZWN0JyB8fCBkb2N1bWVudCA9PT0gbnVsbClcbiAgICByZXR1cm4gZG9jdW1lbnQ7XG5cbiAgdmFyIHJlcGxhY2VkVG9wTGV2ZWxBdG9tID0gYXRvbVRyYW5zZm9ybWVyKGRvY3VtZW50KTtcbiAgaWYgKHJlcGxhY2VkVG9wTGV2ZWxBdG9tICE9PSB1bmRlZmluZWQpXG4gICAgcmV0dXJuIHJlcGxhY2VkVG9wTGV2ZWxBdG9tO1xuXG4gIHZhciByZXQgPSBkb2N1bWVudDtcbiAgXy5lYWNoKGRvY3VtZW50LCBmdW5jdGlvbiAodmFsLCBrZXkpIHtcbiAgICB2YXIgdmFsUmVwbGFjZWQgPSByZXBsYWNlVHlwZXModmFsLCBhdG9tVHJhbnNmb3JtZXIpO1xuICAgIGlmICh2YWwgIT09IHZhbFJlcGxhY2VkKSB7XG4gICAgICAvLyBMYXp5IGNsb25lLiBTaGFsbG93IGNvcHkuXG4gICAgICBpZiAocmV0ID09PSBkb2N1bWVudClcbiAgICAgICAgcmV0ID0gXy5jbG9uZShkb2N1bWVudCk7XG4gICAgICByZXRba2V5XSA9IHZhbFJlcGxhY2VkO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5cbk1vbmdvQ29ubmVjdGlvbiA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgc2VsZi5fb2JzZXJ2ZU11bHRpcGxleGVycyA9IHt9O1xuICBzZWxmLl9vbkZhaWxvdmVySG9vayA9IG5ldyBIb29rO1xuXG4gIGNvbnN0IHVzZXJPcHRpb25zID0ge1xuICAgIC4uLihNb25nby5fY29ubmVjdGlvbk9wdGlvbnMgfHwge30pLFxuICAgIC4uLihNZXRlb3Iuc2V0dGluZ3M/LnBhY2thZ2VzPy5tb25nbz8ub3B0aW9ucyB8fCB7fSlcbiAgfTtcblxuICB2YXIgbW9uZ29PcHRpb25zID0gT2JqZWN0LmFzc2lnbih7XG4gICAgaWdub3JlVW5kZWZpbmVkOiB0cnVlLFxuICAgIC8vIChub2RlOjU5MjQwKSBbTU9OR09EQiBEUklWRVJdIFdhcm5pbmc6IEN1cnJlbnQgU2VydmVyIERpc2NvdmVyeSBhbmRcbiAgICAvLyBNb25pdG9yaW5nIGVuZ2luZSBpcyBkZXByZWNhdGVkLCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIGEgZnV0dXJlIHZlcnNpb24uXG4gICAgLy8gVG8gdXNlIHRoZSBuZXcgU2VydmVyIERpc2NvdmVyIGFuZCBNb25pdG9yaW5nIGVuZ2luZSwgcGFzcyBvcHRpb25cbiAgICAvLyB7IHVzZVVuaWZpZWRUb3BvbG9neTogdHJ1ZSB9IHRvIHRoZSBNb25nb0NsaWVudCBjb25zdHJ1Y3Rvci5cbiAgICB1c2VVbmlmaWVkVG9wb2xvZ3k6IHRydWUsXG4gIH0sIHVzZXJPcHRpb25zKTtcblxuICAvLyBUaGUgYXV0b1JlY29ubmVjdCBhbmQgcmVjb25uZWN0VHJpZXMgb3B0aW9ucyBhcmUgaW5jb21wYXRpYmxlIHdpdGhcbiAgLy8gdXNlVW5pZmllZFRvcG9sb2d5OiBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9wdWxsLzEwODYxI2NvbW1pdGNvbW1lbnQtMzc1MjU4NDVcbiAgaWYgKCFtb25nb09wdGlvbnMudXNlVW5pZmllZFRvcG9sb2d5KSB7XG4gICAgLy8gUmVjb25uZWN0IG9uIGVycm9yLiBUaGlzIGRlZmF1bHRzIHRvIHRydWUsIGJ1dCBpdCBuZXZlciBodXJ0cyB0byBiZVxuICAgIC8vIGV4cGxpY2l0IGFib3V0IGl0LlxuICAgIG1vbmdvT3B0aW9ucy5hdXRvUmVjb25uZWN0ID0gdHJ1ZTtcbiAgICAvLyBUcnkgdG8gcmVjb25uZWN0IGZvcmV2ZXIsIGluc3RlYWQgb2Ygc3RvcHBpbmcgYWZ0ZXIgMzAgdHJpZXMgKHRoZVxuICAgIC8vIGRlZmF1bHQpLCB3aXRoIGVhY2ggYXR0ZW1wdCBzZXBhcmF0ZWQgYnkgMTAwMG1zLlxuICAgIG1vbmdvT3B0aW9ucy5yZWNvbm5lY3RUcmllcyA9IEluZmluaXR5O1xuICB9XG5cbiAgLy8gRGlzYWJsZSB0aGUgbmF0aXZlIHBhcnNlciBieSBkZWZhdWx0LCB1bmxlc3Mgc3BlY2lmaWNhbGx5IGVuYWJsZWRcbiAgLy8gaW4gdGhlIG1vbmdvIFVSTC5cbiAgLy8gLSBUaGUgbmF0aXZlIGRyaXZlciBjYW4gY2F1c2UgZXJyb3JzIHdoaWNoIG5vcm1hbGx5IHdvdWxkIGJlXG4gIC8vICAgdGhyb3duLCBjYXVnaHQsIGFuZCBoYW5kbGVkIGludG8gc2VnZmF1bHRzIHRoYXQgdGFrZSBkb3duIHRoZVxuICAvLyAgIHdob2xlIGFwcC5cbiAgLy8gLSBCaW5hcnkgbW9kdWxlcyBkb24ndCB5ZXQgd29yayB3aGVuIHlvdSBidW5kbGUgYW5kIG1vdmUgdGhlIGJ1bmRsZVxuICAvLyAgIHRvIGEgZGlmZmVyZW50IHBsYXRmb3JtIChha2EgZGVwbG95KVxuICAvLyBXZSBzaG91bGQgcmV2aXNpdCB0aGlzIGFmdGVyIGJpbmFyeSBucG0gbW9kdWxlIHN1cHBvcnQgbGFuZHMuXG4gIGlmICghKC9bXFw/Jl1uYXRpdmVfP1twUF1hcnNlcj0vLnRlc3QodXJsKSkpIHtcbiAgICBtb25nb09wdGlvbnMubmF0aXZlX3BhcnNlciA9IGZhbHNlO1xuICB9XG5cbiAgLy8gSW50ZXJuYWxseSB0aGUgb3Bsb2cgY29ubmVjdGlvbnMgc3BlY2lmeSB0aGVpciBvd24gcG9vbFNpemVcbiAgLy8gd2hpY2ggd2UgZG9uJ3Qgd2FudCB0byBvdmVyd3JpdGUgd2l0aCBhbnkgdXNlciBkZWZpbmVkIHZhbHVlXG4gIGlmIChfLmhhcyhvcHRpb25zLCAncG9vbFNpemUnKSkge1xuICAgIC8vIElmIHdlIGp1c3Qgc2V0IHRoaXMgZm9yIFwic2VydmVyXCIsIHJlcGxTZXQgd2lsbCBvdmVycmlkZSBpdC4gSWYgd2UganVzdFxuICAgIC8vIHNldCBpdCBmb3IgcmVwbFNldCwgaXQgd2lsbCBiZSBpZ25vcmVkIGlmIHdlJ3JlIG5vdCB1c2luZyBhIHJlcGxTZXQuXG4gICAgbW9uZ29PcHRpb25zLnBvb2xTaXplID0gb3B0aW9ucy5wb29sU2l6ZTtcbiAgfVxuXG4gIC8vIFRyYW5zZm9ybSBvcHRpb25zIGxpa2UgXCJ0bHNDQUZpbGVBc3NldFwiOiBcImZpbGVuYW1lLnBlbVwiIGludG9cbiAgLy8gXCJ0bHNDQUZpbGVcIjogXCIvPGZ1bGxwYXRoPi9maWxlbmFtZS5wZW1cIlxuICBPYmplY3QuZW50cmllcyhtb25nb09wdGlvbnMgfHwge30pXG4gICAgLmZpbHRlcigoW2tleV0pID0+IGtleSAmJiBrZXkuZW5kc1dpdGgoRklMRV9BU1NFVF9TVUZGSVgpKVxuICAgIC5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgIGNvbnN0IG9wdGlvbk5hbWUgPSBrZXkucmVwbGFjZShGSUxFX0FTU0VUX1NVRkZJWCwgJycpO1xuICAgICAgbW9uZ29PcHRpb25zW29wdGlvbk5hbWVdID0gcGF0aC5qb2luKEFzc2V0cy5nZXRTZXJ2ZXJEaXIoKSxcbiAgICAgICAgQVNTRVRTX0ZPTERFUiwgQVBQX0ZPTERFUiwgdmFsdWUpO1xuICAgICAgZGVsZXRlIG1vbmdvT3B0aW9uc1trZXldO1xuICAgIH0pO1xuXG4gIHNlbGYuZGIgPSBudWxsO1xuICAvLyBXZSBrZWVwIHRyYWNrIG9mIHRoZSBSZXBsU2V0J3MgcHJpbWFyeSwgc28gdGhhdCB3ZSBjYW4gdHJpZ2dlciBob29rcyB3aGVuXG4gIC8vIGl0IGNoYW5nZXMuICBUaGUgTm9kZSBkcml2ZXIncyBqb2luZWQgY2FsbGJhY2sgc2VlbXMgdG8gZmlyZSB3YXkgdG9vXG4gIC8vIG9mdGVuLCB3aGljaCBpcyB3aHkgd2UgbmVlZCB0byB0cmFjayBpdCBvdXJzZWx2ZXMuXG4gIHNlbGYuX3ByaW1hcnkgPSBudWxsO1xuICBzZWxmLl9vcGxvZ0hhbmRsZSA9IG51bGw7XG4gIHNlbGYuX2RvY0ZldGNoZXIgPSBudWxsO1xuXG5cbiAgdmFyIGNvbm5lY3RGdXR1cmUgPSBuZXcgRnV0dXJlO1xuICBNb25nb0RCLmNvbm5lY3QoXG4gICAgdXJsLFxuICAgIG1vbmdvT3B0aW9ucyxcbiAgICBNZXRlb3IuYmluZEVudmlyb25tZW50KFxuICAgICAgZnVuY3Rpb24gKGVyciwgY2xpZW50KSB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgZGIgPSBjbGllbnQuZGIoKTtcblxuICAgICAgICAvLyBGaXJzdCwgZmlndXJlIG91dCB3aGF0IHRoZSBjdXJyZW50IHByaW1hcnkgaXMsIGlmIGFueS5cbiAgICAgICAgaWYgKGRiLnNlcnZlckNvbmZpZy5pc01hc3RlckRvYykge1xuICAgICAgICAgIHNlbGYuX3ByaW1hcnkgPSBkYi5zZXJ2ZXJDb25maWcuaXNNYXN0ZXJEb2MucHJpbWFyeTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRiLnNlcnZlckNvbmZpZy5vbihcbiAgICAgICAgICAnam9pbmVkJywgTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmdW5jdGlvbiAoa2luZCwgZG9jKSB7XG4gICAgICAgICAgICBpZiAoa2luZCA9PT0gJ3ByaW1hcnknKSB7XG4gICAgICAgICAgICAgIGlmIChkb2MucHJpbWFyeSAhPT0gc2VsZi5fcHJpbWFyeSkge1xuICAgICAgICAgICAgICAgIHNlbGYuX3ByaW1hcnkgPSBkb2MucHJpbWFyeTtcbiAgICAgICAgICAgICAgICBzZWxmLl9vbkZhaWxvdmVySG9vay5lYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRvYy5tZSA9PT0gc2VsZi5fcHJpbWFyeSkge1xuICAgICAgICAgICAgICAvLyBUaGUgdGhpbmcgd2UgdGhvdWdodCB3YXMgcHJpbWFyeSBpcyBub3cgc29tZXRoaW5nIG90aGVyIHRoYW5cbiAgICAgICAgICAgICAgLy8gcHJpbWFyeS4gIEZvcmdldCB0aGF0IHdlIHRob3VnaHQgaXQgd2FzIHByaW1hcnkuICAoVGhpcyBtZWFuc1xuICAgICAgICAgICAgICAvLyB0aGF0IGlmIGEgc2VydmVyIHN0b3BzIGJlaW5nIHByaW1hcnkgYW5kIHRoZW4gc3RhcnRzIGJlaW5nXG4gICAgICAgICAgICAgIC8vIHByaW1hcnkgYWdhaW4gd2l0aG91dCBhbm90aGVyIHNlcnZlciBiZWNvbWluZyBwcmltYXJ5IGluIHRoZVxuICAgICAgICAgICAgICAvLyBtaWRkbGUsIHdlJ2xsIGNvcnJlY3RseSBjb3VudCBpdCBhcyBhIGZhaWxvdmVyLilcbiAgICAgICAgICAgICAgc2VsZi5fcHJpbWFyeSA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuXG4gICAgICAgIC8vIEFsbG93IHRoZSBjb25zdHJ1Y3RvciB0byByZXR1cm4uXG4gICAgICAgIGNvbm5lY3RGdXR1cmVbJ3JldHVybiddKHsgY2xpZW50LCBkYiB9KTtcbiAgICAgIH0sXG4gICAgICBjb25uZWN0RnV0dXJlLnJlc29sdmVyKCkgIC8vIG9uRXhjZXB0aW9uXG4gICAgKVxuICApO1xuXG4gIC8vIFdhaXQgZm9yIHRoZSBjb25uZWN0aW9uIHRvIGJlIHN1Y2Nlc3NmdWwgKHRocm93cyBvbiBmYWlsdXJlKSBhbmQgYXNzaWduIHRoZVxuICAvLyByZXN1bHRzIChgY2xpZW50YCBhbmQgYGRiYCkgdG8gYHNlbGZgLlxuICBPYmplY3QuYXNzaWduKHNlbGYsIGNvbm5lY3RGdXR1cmUud2FpdCgpKTtcblxuICBpZiAob3B0aW9ucy5vcGxvZ1VybCAmJiAhIFBhY2thZ2VbJ2Rpc2FibGUtb3Bsb2cnXSkge1xuICAgIHNlbGYuX29wbG9nSGFuZGxlID0gbmV3IE9wbG9nSGFuZGxlKG9wdGlvbnMub3Bsb2dVcmwsIHNlbGYuZGIuZGF0YWJhc2VOYW1lKTtcbiAgICBzZWxmLl9kb2NGZXRjaGVyID0gbmV3IERvY0ZldGNoZXIoc2VsZik7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghIHNlbGYuZGIpXG4gICAgdGhyb3cgRXJyb3IoXCJjbG9zZSBjYWxsZWQgYmVmb3JlIENvbm5lY3Rpb24gY3JlYXRlZD9cIik7XG5cbiAgLy8gWFhYIHByb2JhYmx5IHVudGVzdGVkXG4gIHZhciBvcGxvZ0hhbmRsZSA9IHNlbGYuX29wbG9nSGFuZGxlO1xuICBzZWxmLl9vcGxvZ0hhbmRsZSA9IG51bGw7XG4gIGlmIChvcGxvZ0hhbmRsZSlcbiAgICBvcGxvZ0hhbmRsZS5zdG9wKCk7XG5cbiAgLy8gVXNlIEZ1dHVyZS53cmFwIHNvIHRoYXQgZXJyb3JzIGdldCB0aHJvd24uIFRoaXMgaGFwcGVucyB0b1xuICAvLyB3b3JrIGV2ZW4gb3V0c2lkZSBhIGZpYmVyIHNpbmNlIHRoZSAnY2xvc2UnIG1ldGhvZCBpcyBub3RcbiAgLy8gYWN0dWFsbHkgYXN5bmNocm9ub3VzLlxuICBGdXR1cmUud3JhcChfLmJpbmQoc2VsZi5jbGllbnQuY2xvc2UsIHNlbGYuY2xpZW50KSkodHJ1ZSkud2FpdCgpO1xufTtcblxuLy8gUmV0dXJucyB0aGUgTW9uZ28gQ29sbGVjdGlvbiBvYmplY3Q7IG1heSB5aWVsZC5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUucmF3Q29sbGVjdGlvbiA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgaWYgKCEgc2VsZi5kYilcbiAgICB0aHJvdyBFcnJvcihcInJhd0NvbGxlY3Rpb24gY2FsbGVkIGJlZm9yZSBDb25uZWN0aW9uIGNyZWF0ZWQ/XCIpO1xuXG4gIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlO1xuICBzZWxmLmRiLmNvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUsIGZ1dHVyZS5yZXNvbHZlcigpKTtcbiAgcmV0dXJuIGZ1dHVyZS53YWl0KCk7XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9jcmVhdGVDYXBwZWRDb2xsZWN0aW9uID0gZnVuY3Rpb24gKFxuICAgIGNvbGxlY3Rpb25OYW1lLCBieXRlU2l6ZSwgbWF4RG9jdW1lbnRzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoISBzZWxmLmRiKVxuICAgIHRocm93IEVycm9yKFwiX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24gY2FsbGVkIGJlZm9yZSBDb25uZWN0aW9uIGNyZWF0ZWQ/XCIpO1xuXG4gIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlKCk7XG4gIHNlbGYuZGIuY3JlYXRlQ29sbGVjdGlvbihcbiAgICBjb2xsZWN0aW9uTmFtZSxcbiAgICB7IGNhcHBlZDogdHJ1ZSwgc2l6ZTogYnl0ZVNpemUsIG1heDogbWF4RG9jdW1lbnRzIH0sXG4gICAgZnV0dXJlLnJlc29sdmVyKCkpO1xuICBmdXR1cmUud2FpdCgpO1xufTtcblxuLy8gVGhpcyBzaG91bGQgYmUgY2FsbGVkIHN5bmNocm9ub3VzbHkgd2l0aCBhIHdyaXRlLCB0byBjcmVhdGUgYVxuLy8gdHJhbnNhY3Rpb24gb24gdGhlIGN1cnJlbnQgd3JpdGUgZmVuY2UsIGlmIGFueS4gQWZ0ZXIgd2UgY2FuIHJlYWRcbi8vIHRoZSB3cml0ZSwgYW5kIGFmdGVyIG9ic2VydmVycyBoYXZlIGJlZW4gbm90aWZpZWQgKG9yIGF0IGxlYXN0LFxuLy8gYWZ0ZXIgdGhlIG9ic2VydmVyIG5vdGlmaWVycyBoYXZlIGFkZGVkIHRoZW1zZWx2ZXMgdG8gdGhlIHdyaXRlXG4vLyBmZW5jZSksIHlvdSBzaG91bGQgY2FsbCAnY29tbWl0dGVkKCknIG9uIHRoZSBvYmplY3QgcmV0dXJuZWQuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9tYXliZUJlZ2luV3JpdGUgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBmZW5jZSA9IEREUFNlcnZlci5fQ3VycmVudFdyaXRlRmVuY2UuZ2V0KCk7XG4gIGlmIChmZW5jZSkge1xuICAgIHJldHVybiBmZW5jZS5iZWdpbldyaXRlKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHtjb21taXR0ZWQ6IGZ1bmN0aW9uICgpIHt9fTtcbiAgfVxufTtcblxuLy8gSW50ZXJuYWwgaW50ZXJmYWNlOiBhZGRzIGEgY2FsbGJhY2sgd2hpY2ggaXMgY2FsbGVkIHdoZW4gdGhlIE1vbmdvIHByaW1hcnlcbi8vIGNoYW5nZXMuIFJldHVybnMgYSBzdG9wIGhhbmRsZS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX29uRmFpbG92ZXIgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgcmV0dXJuIHRoaXMuX29uRmFpbG92ZXJIb29rLnJlZ2lzdGVyKGNhbGxiYWNrKTtcbn07XG5cblxuLy8vLy8vLy8vLy8vIFB1YmxpYyBBUEkgLy8vLy8vLy8vL1xuXG4vLyBUaGUgd3JpdGUgbWV0aG9kcyBibG9jayB1bnRpbCB0aGUgZGF0YWJhc2UgaGFzIGNvbmZpcm1lZCB0aGUgd3JpdGUgKGl0IG1heVxuLy8gbm90IGJlIHJlcGxpY2F0ZWQgb3Igc3RhYmxlIG9uIGRpc2ssIGJ1dCBvbmUgc2VydmVyIGhhcyBjb25maXJtZWQgaXQpIGlmIG5vXG4vLyBjYWxsYmFjayBpcyBwcm92aWRlZC4gSWYgYSBjYWxsYmFjayBpcyBwcm92aWRlZCwgdGhlbiB0aGV5IGNhbGwgdGhlIGNhbGxiYWNrXG4vLyB3aGVuIHRoZSB3cml0ZSBpcyBjb25maXJtZWQuIFRoZXkgcmV0dXJuIG5vdGhpbmcgb24gc3VjY2VzcywgYW5kIHJhaXNlIGFuXG4vLyBleGNlcHRpb24gb24gZmFpbHVyZS5cbi8vXG4vLyBBZnRlciBtYWtpbmcgYSB3cml0ZSAod2l0aCBpbnNlcnQsIHVwZGF0ZSwgcmVtb3ZlKSwgb2JzZXJ2ZXJzIGFyZVxuLy8gbm90aWZpZWQgYXN5bmNocm9ub3VzbHkuIElmIHlvdSB3YW50IHRvIHJlY2VpdmUgYSBjYWxsYmFjayBvbmNlIGFsbFxuLy8gb2YgdGhlIG9ic2VydmVyIG5vdGlmaWNhdGlvbnMgaGF2ZSBsYW5kZWQgZm9yIHlvdXIgd3JpdGUsIGRvIHRoZVxuLy8gd3JpdGVzIGluc2lkZSBhIHdyaXRlIGZlbmNlIChzZXQgRERQU2VydmVyLl9DdXJyZW50V3JpdGVGZW5jZSB0byBhIG5ld1xuLy8gX1dyaXRlRmVuY2UsIGFuZCB0aGVuIHNldCBhIGNhbGxiYWNrIG9uIHRoZSB3cml0ZSBmZW5jZS4pXG4vL1xuLy8gU2luY2Ugb3VyIGV4ZWN1dGlvbiBlbnZpcm9ubWVudCBpcyBzaW5nbGUtdGhyZWFkZWQsIHRoaXMgaXNcbi8vIHdlbGwtZGVmaW5lZCAtLSBhIHdyaXRlIFwiaGFzIGJlZW4gbWFkZVwiIGlmIGl0J3MgcmV0dXJuZWQsIGFuZCBhblxuLy8gb2JzZXJ2ZXIgXCJoYXMgYmVlbiBub3RpZmllZFwiIGlmIGl0cyBjYWxsYmFjayBoYXMgcmV0dXJuZWQuXG5cbnZhciB3cml0ZUNhbGxiYWNrID0gZnVuY3Rpb24gKHdyaXRlLCByZWZyZXNoLCBjYWxsYmFjaykge1xuICByZXR1cm4gZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgaWYgKCEgZXJyKSB7XG4gICAgICAvLyBYWFggV2UgZG9uJ3QgaGF2ZSB0byBydW4gdGhpcyBvbiBlcnJvciwgcmlnaHQ/XG4gICAgICB0cnkge1xuICAgICAgICByZWZyZXNoKCk7XG4gICAgICB9IGNhdGNoIChyZWZyZXNoRXJyKSB7XG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgIGNhbGxiYWNrKHJlZnJlc2hFcnIpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyByZWZyZXNoRXJyO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgY2FsbGJhY2soZXJyLCByZXN1bHQpO1xuICAgIH0gZWxzZSBpZiAoZXJyKSB7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9O1xufTtcblxudmFyIGJpbmRFbnZpcm9ubWVudEZvcldyaXRlID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gIHJldHVybiBNZXRlb3IuYmluZEVudmlyb25tZW50KGNhbGxiYWNrLCBcIk1vbmdvIHdyaXRlXCIpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5faW5zZXJ0ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25fbmFtZSwgZG9jdW1lbnQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHZhciBzZW5kRXJyb3IgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmIChjYWxsYmFjaylcbiAgICAgIHJldHVybiBjYWxsYmFjayhlKTtcbiAgICB0aHJvdyBlO1xuICB9O1xuXG4gIGlmIChjb2xsZWN0aW9uX25hbWUgPT09IFwiX19fbWV0ZW9yX2ZhaWx1cmVfdGVzdF9jb2xsZWN0aW9uXCIpIHtcbiAgICB2YXIgZSA9IG5ldyBFcnJvcihcIkZhaWx1cmUgdGVzdFwiKTtcbiAgICBlLl9leHBlY3RlZEJ5VGVzdCA9IHRydWU7XG4gICAgc2VuZEVycm9yKGUpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICghKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChkb2N1bWVudCkgJiZcbiAgICAgICAgIUVKU09OLl9pc0N1c3RvbVR5cGUoZG9jdW1lbnQpKSkge1xuICAgIHNlbmRFcnJvcihuZXcgRXJyb3IoXG4gICAgICBcIk9ubHkgcGxhaW4gb2JqZWN0cyBtYXkgYmUgaW5zZXJ0ZWQgaW50byBNb25nb0RCXCIpKTtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgd3JpdGUgPSBzZWxmLl9tYXliZUJlZ2luV3JpdGUoKTtcbiAgdmFyIHJlZnJlc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgTWV0ZW9yLnJlZnJlc2goe2NvbGxlY3Rpb246IGNvbGxlY3Rpb25fbmFtZSwgaWQ6IGRvY3VtZW50Ll9pZCB9KTtcbiAgfTtcbiAgY2FsbGJhY2sgPSBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZSh3cml0ZUNhbGxiYWNrKHdyaXRlLCByZWZyZXNoLCBjYWxsYmFjaykpO1xuICB0cnkge1xuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25fbmFtZSk7XG4gICAgY29sbGVjdGlvbi5pbnNlcnQocmVwbGFjZVR5cGVzKGRvY3VtZW50LCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksXG4gICAgICAgICAgICAgICAgICAgICAge3NhZmU6IHRydWV9LCBjYWxsYmFjayk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIHRocm93IGVycjtcbiAgfVxufTtcblxuLy8gQ2F1c2UgcXVlcmllcyB0aGF0IG1heSBiZSBhZmZlY3RlZCBieSB0aGUgc2VsZWN0b3IgdG8gcG9sbCBpbiB0aGlzIHdyaXRlXG4vLyBmZW5jZS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX3JlZnJlc2ggPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIHNlbGVjdG9yKSB7XG4gIHZhciByZWZyZXNoS2V5ID0ge2NvbGxlY3Rpb246IGNvbGxlY3Rpb25OYW1lfTtcbiAgLy8gSWYgd2Uga25vdyB3aGljaCBkb2N1bWVudHMgd2UncmUgcmVtb3ZpbmcsIGRvbid0IHBvbGwgcXVlcmllcyB0aGF0IGFyZVxuICAvLyBzcGVjaWZpYyB0byBvdGhlciBkb2N1bWVudHMuIChOb3RlIHRoYXQgbXVsdGlwbGUgbm90aWZpY2F0aW9ucyBoZXJlIHNob3VsZFxuICAvLyBub3QgY2F1c2UgbXVsdGlwbGUgcG9sbHMsIHNpbmNlIGFsbCBvdXIgbGlzdGVuZXIgaXMgZG9pbmcgaXMgZW5xdWV1ZWluZyBhXG4gIC8vIHBvbGwuKVxuICB2YXIgc3BlY2lmaWNJZHMgPSBMb2NhbENvbGxlY3Rpb24uX2lkc01hdGNoZWRCeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgaWYgKHNwZWNpZmljSWRzKSB7XG4gICAgXy5lYWNoKHNwZWNpZmljSWRzLCBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIE1ldGVvci5yZWZyZXNoKF8uZXh0ZW5kKHtpZDogaWR9LCByZWZyZXNoS2V5KSk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgTWV0ZW9yLnJlZnJlc2gocmVmcmVzaEtleSk7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX3JlbW92ZSA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uX25hbWUsIHNlbGVjdG9yLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoY29sbGVjdGlvbl9uYW1lID09PSBcIl9fX21ldGVvcl9mYWlsdXJlX3Rlc3RfY29sbGVjdGlvblwiKSB7XG4gICAgdmFyIGUgPSBuZXcgRXJyb3IoXCJGYWlsdXJlIHRlc3RcIik7XG4gICAgZS5fZXhwZWN0ZWRCeVRlc3QgPSB0cnVlO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIHZhciB3cml0ZSA9IHNlbGYuX21heWJlQmVnaW5Xcml0ZSgpO1xuICB2YXIgcmVmcmVzaCA9IGZ1bmN0aW9uICgpIHtcbiAgICBzZWxmLl9yZWZyZXNoKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IpO1xuICB9O1xuICBjYWxsYmFjayA9IGJpbmRFbnZpcm9ubWVudEZvcldyaXRlKHdyaXRlQ2FsbGJhY2sod3JpdGUsIHJlZnJlc2gsIGNhbGxiYWNrKSk7XG5cbiAgdHJ5IHtcbiAgICB2YXIgY29sbGVjdGlvbiA9IHNlbGYucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uX25hbWUpO1xuICAgIHZhciB3cmFwcGVkQ2FsbGJhY2sgPSBmdW5jdGlvbihlcnIsIGRyaXZlclJlc3VsdCkge1xuICAgICAgY2FsbGJhY2soZXJyLCB0cmFuc2Zvcm1SZXN1bHQoZHJpdmVyUmVzdWx0KS5udW1iZXJBZmZlY3RlZCk7XG4gICAgfTtcbiAgICBjb2xsZWN0aW9uLnJlbW92ZShyZXBsYWNlVHlwZXMoc2VsZWN0b3IsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSxcbiAgICAgICAgICAgICAgICAgICAgICAge3NhZmU6IHRydWV9LCB3cmFwcGVkQ2FsbGJhY2spO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICB0aHJvdyBlcnI7XG4gIH1cbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Ryb3BDb2xsZWN0aW9uID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICAgIE1ldGVvci5yZWZyZXNoKHtjb2xsZWN0aW9uOiBjb2xsZWN0aW9uTmFtZSwgaWQ6IG51bGwsXG4gICAgICAgICAgICAgICAgICAgIGRyb3BDb2xsZWN0aW9uOiB0cnVlfSk7XG4gIH07XG4gIGNiID0gYmluZEVudmlyb25tZW50Rm9yV3JpdGUod3JpdGVDYWxsYmFjayh3cml0ZSwgcmVmcmVzaCwgY2IpKTtcblxuICB0cnkge1xuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25OYW1lKTtcbiAgICBjb2xsZWN0aW9uLmRyb3AoY2IpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgdGhyb3cgZTtcbiAgfVxufTtcblxuLy8gRm9yIHRlc3Rpbmcgb25seS4gIFNsaWdodGx5IGJldHRlciB0aGFuIGBjLnJhd0RhdGFiYXNlKCkuZHJvcERhdGFiYXNlKClgXG4vLyBiZWNhdXNlIGl0IGxldHMgdGhlIHRlc3QncyBmZW5jZSB3YWl0IGZvciBpdCB0byBiZSBjb21wbGV0ZS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2Ryb3BEYXRhYmFzZSA9IGZ1bmN0aW9uIChjYikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICAgIE1ldGVvci5yZWZyZXNoKHsgZHJvcERhdGFiYXNlOiB0cnVlIH0pO1xuICB9O1xuICBjYiA9IGJpbmRFbnZpcm9ubWVudEZvcldyaXRlKHdyaXRlQ2FsbGJhY2sod3JpdGUsIHJlZnJlc2gsIGNiKSk7XG5cbiAgdHJ5IHtcbiAgICBzZWxmLmRiLmRyb3BEYXRhYmFzZShjYik7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICB3cml0ZS5jb21taXR0ZWQoKTtcbiAgICB0aHJvdyBlO1xuICB9XG59O1xuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl91cGRhdGUgPSBmdW5jdGlvbiAoY29sbGVjdGlvbl9uYW1lLCBzZWxlY3RvciwgbW9kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMsIGNhbGxiYWNrKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICBpZiAoISBjYWxsYmFjayAmJiBvcHRpb25zIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICBjYWxsYmFjayA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IG51bGw7XG4gIH1cblxuICBpZiAoY29sbGVjdGlvbl9uYW1lID09PSBcIl9fX21ldGVvcl9mYWlsdXJlX3Rlc3RfY29sbGVjdGlvblwiKSB7XG4gICAgdmFyIGUgPSBuZXcgRXJyb3IoXCJGYWlsdXJlIHRlc3RcIik7XG4gICAgZS5fZXhwZWN0ZWRCeVRlc3QgPSB0cnVlO1xuICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrKGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfVxuXG4gIC8vIGV4cGxpY2l0IHNhZmV0eSBjaGVjay4gbnVsbCBhbmQgdW5kZWZpbmVkIGNhbiBjcmFzaCB0aGUgbW9uZ29cbiAgLy8gZHJpdmVyLiBBbHRob3VnaCB0aGUgbm9kZSBkcml2ZXIgYW5kIG1pbmltb25nbyBkbyAnc3VwcG9ydCdcbiAgLy8gbm9uLW9iamVjdCBtb2RpZmllciBpbiB0aGF0IHRoZXkgZG9uJ3QgY3Jhc2gsIHRoZXkgYXJlIG5vdFxuICAvLyBtZWFuaW5nZnVsIG9wZXJhdGlvbnMgYW5kIGRvIG5vdCBkbyBhbnl0aGluZy4gRGVmZW5zaXZlbHkgdGhyb3cgYW5cbiAgLy8gZXJyb3IgaGVyZS5cbiAgaWYgKCFtb2QgfHwgdHlwZW9mIG1vZCAhPT0gJ29iamVjdCcpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBtb2RpZmllci4gTW9kaWZpZXIgbXVzdCBiZSBhbiBvYmplY3QuXCIpO1xuXG4gIGlmICghKExvY2FsQ29sbGVjdGlvbi5faXNQbGFpbk9iamVjdChtb2QpICYmXG4gICAgICAgICFFSlNPTi5faXNDdXN0b21UeXBlKG1vZCkpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJPbmx5IHBsYWluIG9iamVjdHMgbWF5IGJlIHVzZWQgYXMgcmVwbGFjZW1lbnRcIiArXG4gICAgICAgIFwiIGRvY3VtZW50cyBpbiBNb25nb0RCXCIpO1xuICB9XG5cbiAgaWYgKCFvcHRpb25zKSBvcHRpb25zID0ge307XG5cbiAgdmFyIHdyaXRlID0gc2VsZi5fbWF5YmVCZWdpbldyaXRlKCk7XG4gIHZhciByZWZyZXNoID0gZnVuY3Rpb24gKCkge1xuICAgIHNlbGYuX3JlZnJlc2goY29sbGVjdGlvbl9uYW1lLCBzZWxlY3Rvcik7XG4gIH07XG4gIGNhbGxiYWNrID0gd3JpdGVDYWxsYmFjayh3cml0ZSwgcmVmcmVzaCwgY2FsbGJhY2spO1xuICB0cnkge1xuICAgIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGNvbGxlY3Rpb25fbmFtZSk7XG4gICAgdmFyIG1vbmdvT3B0cyA9IHtzYWZlOiB0cnVlfTtcbiAgICAvLyBBZGQgc3VwcG9ydCBmb3IgZmlsdGVyZWQgcG9zaXRpb25hbCBvcGVyYXRvclxuICAgIGlmIChvcHRpb25zLmFycmF5RmlsdGVycyAhPT0gdW5kZWZpbmVkKSBtb25nb09wdHMuYXJyYXlGaWx0ZXJzID0gb3B0aW9ucy5hcnJheUZpbHRlcnM7XG4gICAgLy8gZXhwbGljdGx5IGVudW1lcmF0ZSBvcHRpb25zIHRoYXQgbWluaW1vbmdvIHN1cHBvcnRzXG4gICAgaWYgKG9wdGlvbnMudXBzZXJ0KSBtb25nb09wdHMudXBzZXJ0ID0gdHJ1ZTtcbiAgICBpZiAob3B0aW9ucy5tdWx0aSkgbW9uZ29PcHRzLm11bHRpID0gdHJ1ZTtcbiAgICAvLyBMZXRzIHlvdSBnZXQgYSBtb3JlIG1vcmUgZnVsbCByZXN1bHQgZnJvbSBNb25nb0RCLiBVc2Ugd2l0aCBjYXV0aW9uOlxuICAgIC8vIG1pZ2h0IG5vdCB3b3JrIHdpdGggQy51cHNlcnQgKGFzIG9wcG9zZWQgdG8gQy51cGRhdGUoe3Vwc2VydDp0cnVlfSkgb3JcbiAgICAvLyB3aXRoIHNpbXVsYXRlZCB1cHNlcnQuXG4gICAgaWYgKG9wdGlvbnMuZnVsbFJlc3VsdCkgbW9uZ29PcHRzLmZ1bGxSZXN1bHQgPSB0cnVlO1xuXG4gICAgdmFyIG1vbmdvU2VsZWN0b3IgPSByZXBsYWNlVHlwZXMoc2VsZWN0b3IsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKTtcbiAgICB2YXIgbW9uZ29Nb2QgPSByZXBsYWNlVHlwZXMobW9kLCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyk7XG5cbiAgICB2YXIgaXNNb2RpZnkgPSBMb2NhbENvbGxlY3Rpb24uX2lzTW9kaWZpY2F0aW9uTW9kKG1vbmdvTW9kKTtcblxuICAgIGlmIChvcHRpb25zLl9mb3JiaWRSZXBsYWNlICYmICFpc01vZGlmeSkge1xuICAgICAgdmFyIGVyciA9IG5ldyBFcnJvcihcIkludmFsaWQgbW9kaWZpZXIuIFJlcGxhY2VtZW50cyBhcmUgZm9yYmlkZGVuLlwiKTtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXZSd2ZSBhbHJlYWR5IHJ1biByZXBsYWNlVHlwZXMvcmVwbGFjZU1ldGVvckF0b21XaXRoTW9uZ28gb25cbiAgICAvLyBzZWxlY3RvciBhbmQgbW9kLiAgV2UgYXNzdW1lIGl0IGRvZXNuJ3QgbWF0dGVyLCBhcyBmYXIgYXNcbiAgICAvLyB0aGUgYmVoYXZpb3Igb2YgbW9kaWZpZXJzIGlzIGNvbmNlcm5lZCwgd2hldGhlciBgX21vZGlmeWBcbiAgICAvLyBpcyBydW4gb24gRUpTT04gb3Igb24gbW9uZ28tY29udmVydGVkIEVKU09OLlxuXG4gICAgLy8gUnVuIHRoaXMgY29kZSB1cCBmcm9udCBzbyB0aGF0IGl0IGZhaWxzIGZhc3QgaWYgc29tZW9uZSB1c2VzXG4gICAgLy8gYSBNb25nbyB1cGRhdGUgb3BlcmF0b3Igd2UgZG9uJ3Qgc3VwcG9ydC5cbiAgICBsZXQga25vd25JZDtcbiAgICBpZiAob3B0aW9ucy51cHNlcnQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGxldCBuZXdEb2MgPSBMb2NhbENvbGxlY3Rpb24uX2NyZWF0ZVVwc2VydERvY3VtZW50KHNlbGVjdG9yLCBtb2QpO1xuICAgICAgICBrbm93bklkID0gbmV3RG9jLl9pZDtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBlcnI7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy51cHNlcnQgJiZcbiAgICAgICAgISBpc01vZGlmeSAmJlxuICAgICAgICAhIGtub3duSWQgJiZcbiAgICAgICAgb3B0aW9ucy5pbnNlcnRlZElkICYmXG4gICAgICAgICEgKG9wdGlvbnMuaW5zZXJ0ZWRJZCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEICYmXG4gICAgICAgICAgIG9wdGlvbnMuZ2VuZXJhdGVkSWQpKSB7XG4gICAgICAvLyBJbiBjYXNlIG9mIGFuIHVwc2VydCB3aXRoIGEgcmVwbGFjZW1lbnQsIHdoZXJlIHRoZXJlIGlzIG5vIF9pZCBkZWZpbmVkXG4gICAgICAvLyBpbiBlaXRoZXIgdGhlIHF1ZXJ5IG9yIHRoZSByZXBsYWNlbWVudCBkb2MsIG1vbmdvIHdpbGwgZ2VuZXJhdGUgYW4gaWQgaXRzZWxmLlxuICAgICAgLy8gVGhlcmVmb3JlIHdlIG5lZWQgdGhpcyBzcGVjaWFsIHN0cmF0ZWd5IGlmIHdlIHdhbnQgdG8gY29udHJvbCB0aGUgaWQgb3Vyc2VsdmVzLlxuXG4gICAgICAvLyBXZSBkb24ndCBuZWVkIHRvIGRvIHRoaXMgd2hlbjpcbiAgICAgIC8vIC0gVGhpcyBpcyBub3QgYSByZXBsYWNlbWVudCwgc28gd2UgY2FuIGFkZCBhbiBfaWQgdG8gJHNldE9uSW5zZXJ0XG4gICAgICAvLyAtIFRoZSBpZCBpcyBkZWZpbmVkIGJ5IHF1ZXJ5IG9yIG1vZCB3ZSBjYW4ganVzdCBhZGQgaXQgdG8gdGhlIHJlcGxhY2VtZW50IGRvY1xuICAgICAgLy8gLSBUaGUgdXNlciBkaWQgbm90IHNwZWNpZnkgYW55IGlkIHByZWZlcmVuY2UgYW5kIHRoZSBpZCBpcyBhIE1vbmdvIE9iamVjdElkLFxuICAgICAgLy8gICAgIHRoZW4gd2UgY2FuIGp1c3QgbGV0IE1vbmdvIGdlbmVyYXRlIHRoZSBpZFxuXG4gICAgICBzaW11bGF0ZVVwc2VydFdpdGhJbnNlcnRlZElkKFxuICAgICAgICBjb2xsZWN0aW9uLCBtb25nb1NlbGVjdG9yLCBtb25nb01vZCwgb3B0aW9ucyxcbiAgICAgICAgLy8gVGhpcyBjYWxsYmFjayBkb2VzIG5vdCBuZWVkIHRvIGJlIGJpbmRFbnZpcm9ubWVudCdlZCBiZWNhdXNlXG4gICAgICAgIC8vIHNpbXVsYXRlVXBzZXJ0V2l0aEluc2VydGVkSWQoKSB3cmFwcyBpdCBhbmQgdGhlbiBwYXNzZXMgaXQgdGhyb3VnaFxuICAgICAgICAvLyBiaW5kRW52aXJvbm1lbnRGb3JXcml0ZS5cbiAgICAgICAgZnVuY3Rpb24gKGVycm9yLCByZXN1bHQpIHtcbiAgICAgICAgICAvLyBJZiB3ZSBnb3QgaGVyZSB2aWEgYSB1cHNlcnQoKSBjYWxsLCB0aGVuIG9wdGlvbnMuX3JldHVybk9iamVjdCB3aWxsXG4gICAgICAgICAgLy8gYmUgc2V0IGFuZCB3ZSBzaG91bGQgcmV0dXJuIHRoZSB3aG9sZSBvYmplY3QuIE90aGVyd2lzZSwgd2Ugc2hvdWxkXG4gICAgICAgICAgLy8ganVzdCByZXR1cm4gdGhlIG51bWJlciBvZiBhZmZlY3RlZCBkb2NzIHRvIG1hdGNoIHRoZSBtb25nbyBBUEkuXG4gICAgICAgICAgaWYgKHJlc3VsdCAmJiAhIG9wdGlvbnMuX3JldHVybk9iamVjdCkge1xuICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIHJlc3VsdC5udW1iZXJBZmZlY3RlZCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVycm9yLCByZXN1bHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuXG4gICAgICBpZiAob3B0aW9ucy51cHNlcnQgJiYgIWtub3duSWQgJiYgb3B0aW9ucy5pbnNlcnRlZElkICYmIGlzTW9kaWZ5KSB7XG4gICAgICAgIGlmICghbW9uZ29Nb2QuaGFzT3duUHJvcGVydHkoJyRzZXRPbkluc2VydCcpKSB7XG4gICAgICAgICAgbW9uZ29Nb2QuJHNldE9uSW5zZXJ0ID0ge307XG4gICAgICAgIH1cbiAgICAgICAga25vd25JZCA9IG9wdGlvbnMuaW5zZXJ0ZWRJZDtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihtb25nb01vZC4kc2V0T25JbnNlcnQsIHJlcGxhY2VUeXBlcyh7X2lkOiBvcHRpb25zLmluc2VydGVkSWR9LCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbykpO1xuICAgICAgfVxuXG4gICAgICBjb2xsZWN0aW9uLnVwZGF0ZShcbiAgICAgICAgbW9uZ29TZWxlY3RvciwgbW9uZ29Nb2QsIG1vbmdvT3B0cyxcbiAgICAgICAgYmluZEVudmlyb25tZW50Rm9yV3JpdGUoZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgICAgICAgaWYgKCEgZXJyKSB7XG4gICAgICAgICAgICB2YXIgbWV0ZW9yUmVzdWx0ID0gdHJhbnNmb3JtUmVzdWx0KHJlc3VsdCk7XG4gICAgICAgICAgICBpZiAobWV0ZW9yUmVzdWx0ICYmIG9wdGlvbnMuX3JldHVybk9iamVjdCkge1xuICAgICAgICAgICAgICAvLyBJZiB0aGlzIHdhcyBhbiB1cHNlcnQoKSBjYWxsLCBhbmQgd2UgZW5kZWQgdXBcbiAgICAgICAgICAgICAgLy8gaW5zZXJ0aW5nIGEgbmV3IGRvYyBhbmQgd2Uga25vdyBpdHMgaWQsIHRoZW5cbiAgICAgICAgICAgICAgLy8gcmV0dXJuIHRoYXQgaWQgYXMgd2VsbC5cbiAgICAgICAgICAgICAgaWYgKG9wdGlvbnMudXBzZXJ0ICYmIG1ldGVvclJlc3VsdC5pbnNlcnRlZElkKSB7XG4gICAgICAgICAgICAgICAgaWYgKGtub3duSWQpIHtcbiAgICAgICAgICAgICAgICAgIG1ldGVvclJlc3VsdC5pbnNlcnRlZElkID0ga25vd25JZDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKG1ldGVvclJlc3VsdC5pbnNlcnRlZElkIGluc3RhbmNlb2YgTW9uZ29EQi5PYmplY3RJRCkge1xuICAgICAgICAgICAgICAgICAgbWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQgPSBuZXcgTW9uZ28uT2JqZWN0SUQobWV0ZW9yUmVzdWx0Lmluc2VydGVkSWQudG9IZXhTdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBtZXRlb3JSZXN1bHQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBtZXRlb3JSZXN1bHQubnVtYmVyQWZmZWN0ZWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIHdyaXRlLmNvbW1pdHRlZCgpO1xuICAgIHRocm93IGU7XG4gIH1cbn07XG5cbnZhciB0cmFuc2Zvcm1SZXN1bHQgPSBmdW5jdGlvbiAoZHJpdmVyUmVzdWx0KSB7XG4gIHZhciBtZXRlb3JSZXN1bHQgPSB7IG51bWJlckFmZmVjdGVkOiAwIH07XG4gIGlmIChkcml2ZXJSZXN1bHQpIHtcbiAgICB2YXIgbW9uZ29SZXN1bHQgPSBkcml2ZXJSZXN1bHQucmVzdWx0O1xuXG4gICAgLy8gT24gdXBkYXRlcyB3aXRoIHVwc2VydDp0cnVlLCB0aGUgaW5zZXJ0ZWQgdmFsdWVzIGNvbWUgYXMgYSBsaXN0IG9mXG4gICAgLy8gdXBzZXJ0ZWQgdmFsdWVzIC0tIGV2ZW4gd2l0aCBvcHRpb25zLm11bHRpLCB3aGVuIHRoZSB1cHNlcnQgZG9lcyBpbnNlcnQsXG4gICAgLy8gaXQgb25seSBpbnNlcnRzIG9uZSBlbGVtZW50LlxuICAgIGlmIChtb25nb1Jlc3VsdC51cHNlcnRlZCkge1xuICAgICAgbWV0ZW9yUmVzdWx0Lm51bWJlckFmZmVjdGVkICs9IG1vbmdvUmVzdWx0LnVwc2VydGVkLmxlbmd0aDtcblxuICAgICAgaWYgKG1vbmdvUmVzdWx0LnVwc2VydGVkLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgIG1ldGVvclJlc3VsdC5pbnNlcnRlZElkID0gbW9uZ29SZXN1bHQudXBzZXJ0ZWRbMF0uX2lkO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBtZXRlb3JSZXN1bHQubnVtYmVyQWZmZWN0ZWQgPSBtb25nb1Jlc3VsdC5uO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBtZXRlb3JSZXN1bHQ7XG59O1xuXG5cbnZhciBOVU1fT1BUSU1JU1RJQ19UUklFUyA9IDM7XG5cbi8vIGV4cG9zZWQgZm9yIHRlc3Rpbmdcbk1vbmdvQ29ubmVjdGlvbi5faXNDYW5ub3RDaGFuZ2VJZEVycm9yID0gZnVuY3Rpb24gKGVycikge1xuXG4gIC8vIE1vbmdvIDMuMi4qIHJldHVybnMgZXJyb3IgYXMgbmV4dCBPYmplY3Q6XG4gIC8vIHtuYW1lOiBTdHJpbmcsIGNvZGU6IE51bWJlciwgZXJybXNnOiBTdHJpbmd9XG4gIC8vIE9sZGVyIE1vbmdvIHJldHVybnM6XG4gIC8vIHtuYW1lOiBTdHJpbmcsIGNvZGU6IE51bWJlciwgZXJyOiBTdHJpbmd9XG4gIHZhciBlcnJvciA9IGVyci5lcnJtc2cgfHwgZXJyLmVycjtcblxuICAvLyBXZSBkb24ndCB1c2UgdGhlIGVycm9yIGNvZGUgaGVyZVxuICAvLyBiZWNhdXNlIHRoZSBlcnJvciBjb2RlIHdlIG9ic2VydmVkIGl0IHByb2R1Y2luZyAoMTY4MzcpIGFwcGVhcnMgdG8gYmVcbiAgLy8gYSBmYXIgbW9yZSBnZW5lcmljIGVycm9yIGNvZGUgYmFzZWQgb24gZXhhbWluaW5nIHRoZSBzb3VyY2UuXG4gIGlmIChlcnJvci5pbmRleE9mKCdUaGUgX2lkIGZpZWxkIGNhbm5vdCBiZSBjaGFuZ2VkJykgPT09IDBcbiAgICB8fCBlcnJvci5pbmRleE9mKFwidGhlIChpbW11dGFibGUpIGZpZWxkICdfaWQnIHdhcyBmb3VuZCB0byBoYXZlIGJlZW4gYWx0ZXJlZCB0byBfaWRcIikgIT09IC0xKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59O1xuXG52YXIgc2ltdWxhdGVVcHNlcnRXaXRoSW5zZXJ0ZWRJZCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uLCBzZWxlY3RvciwgbW9kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgLy8gU1RSQVRFR1k6IEZpcnN0IHRyeSBkb2luZyBhbiB1cHNlcnQgd2l0aCBhIGdlbmVyYXRlZCBJRC5cbiAgLy8gSWYgdGhpcyB0aHJvd3MgYW4gZXJyb3IgYWJvdXQgY2hhbmdpbmcgdGhlIElEIG9uIGFuIGV4aXN0aW5nIGRvY3VtZW50XG4gIC8vIHRoZW4gd2l0aG91dCBhZmZlY3RpbmcgdGhlIGRhdGFiYXNlLCB3ZSBrbm93IHdlIHNob3VsZCBwcm9iYWJseSB0cnlcbiAgLy8gYW4gdXBkYXRlIHdpdGhvdXQgdGhlIGdlbmVyYXRlZCBJRC4gSWYgaXQgYWZmZWN0ZWQgMCBkb2N1bWVudHMsXG4gIC8vIHRoZW4gd2l0aG91dCBhZmZlY3RpbmcgdGhlIGRhdGFiYXNlLCB3ZSB0aGUgZG9jdW1lbnQgdGhhdCBmaXJzdFxuICAvLyBnYXZlIHRoZSBlcnJvciBpcyBwcm9iYWJseSByZW1vdmVkIGFuZCB3ZSBuZWVkIHRvIHRyeSBhbiBpbnNlcnQgYWdhaW5cbiAgLy8gV2UgZ28gYmFjayB0byBzdGVwIG9uZSBhbmQgcmVwZWF0LlxuICAvLyBMaWtlIGFsbCBcIm9wdGltaXN0aWMgd3JpdGVcIiBzY2hlbWVzLCB3ZSByZWx5IG9uIHRoZSBmYWN0IHRoYXQgaXQnc1xuICAvLyB1bmxpa2VseSBvdXIgd3JpdGVzIHdpbGwgY29udGludWUgdG8gYmUgaW50ZXJmZXJlZCB3aXRoIHVuZGVyIG5vcm1hbFxuICAvLyBjaXJjdW1zdGFuY2VzICh0aG91Z2ggc3VmZmljaWVudGx5IGhlYXZ5IGNvbnRlbnRpb24gd2l0aCB3cml0ZXJzXG4gIC8vIGRpc2FncmVlaW5nIG9uIHRoZSBleGlzdGVuY2Ugb2YgYW4gb2JqZWN0IHdpbGwgY2F1c2Ugd3JpdGVzIHRvIGZhaWxcbiAgLy8gaW4gdGhlb3J5KS5cblxuICB2YXIgaW5zZXJ0ZWRJZCA9IG9wdGlvbnMuaW5zZXJ0ZWRJZDsgLy8gbXVzdCBleGlzdFxuICB2YXIgbW9uZ29PcHRzRm9yVXBkYXRlID0ge1xuICAgIHNhZmU6IHRydWUsXG4gICAgbXVsdGk6IG9wdGlvbnMubXVsdGlcbiAgfTtcbiAgdmFyIG1vbmdvT3B0c0Zvckluc2VydCA9IHtcbiAgICBzYWZlOiB0cnVlLFxuICAgIHVwc2VydDogdHJ1ZVxuICB9O1xuXG4gIHZhciByZXBsYWNlbWVudFdpdGhJZCA9IE9iamVjdC5hc3NpZ24oXG4gICAgcmVwbGFjZVR5cGVzKHtfaWQ6IGluc2VydGVkSWR9LCByZXBsYWNlTWV0ZW9yQXRvbVdpdGhNb25nbyksXG4gICAgbW9kKTtcblxuICB2YXIgdHJpZXMgPSBOVU1fT1BUSU1JU1RJQ19UUklFUztcblxuICB2YXIgZG9VcGRhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgdHJpZXMtLTtcbiAgICBpZiAoISB0cmllcykge1xuICAgICAgY2FsbGJhY2sobmV3IEVycm9yKFwiVXBzZXJ0IGZhaWxlZCBhZnRlciBcIiArIE5VTV9PUFRJTUlTVElDX1RSSUVTICsgXCIgdHJpZXMuXCIpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29sbGVjdGlvbi51cGRhdGUoc2VsZWN0b3IsIG1vZCwgbW9uZ29PcHRzRm9yVXBkYXRlLFxuICAgICAgICAgICAgICAgICAgICAgICAgYmluZEVudmlyb25tZW50Rm9yV3JpdGUoZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3VsdCAmJiByZXN1bHQucmVzdWx0Lm4gIT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG51bWJlckFmZmVjdGVkOiByZXN1bHQucmVzdWx0Lm5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb0NvbmRpdGlvbmFsSW5zZXJ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICB9XG4gIH07XG5cbiAgdmFyIGRvQ29uZGl0aW9uYWxJbnNlcnQgPSBmdW5jdGlvbiAoKSB7XG4gICAgY29sbGVjdGlvbi51cGRhdGUoc2VsZWN0b3IsIHJlcGxhY2VtZW50V2l0aElkLCBtb25nb09wdHNGb3JJbnNlcnQsXG4gICAgICAgICAgICAgICAgICAgICAgYmluZEVudmlyb25tZW50Rm9yV3JpdGUoZnVuY3Rpb24gKGVyciwgcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGZpZ3VyZSBvdXQgaWYgdGhpcyBpcyBhXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFwiY2Fubm90IGNoYW5nZSBfaWQgb2YgZG9jdW1lbnRcIiBlcnJvciwgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmIHNvLCB0cnkgZG9VcGRhdGUoKSBhZ2FpbiwgdXAgdG8gMyB0aW1lcy5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKE1vbmdvQ29ubmVjdGlvbi5faXNDYW5ub3RDaGFuZ2VJZEVycm9yKGVycikpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb1VwZGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBudW1iZXJBZmZlY3RlZDogcmVzdWx0LnJlc3VsdC51cHNlcnRlZC5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5zZXJ0ZWRJZDogaW5zZXJ0ZWRJZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfSkpO1xuICB9O1xuXG4gIGRvVXBkYXRlKCk7XG59O1xuXG5fLmVhY2goW1wiaW5zZXJ0XCIsIFwidXBkYXRlXCIsIFwicmVtb3ZlXCIsIFwiZHJvcENvbGxlY3Rpb25cIiwgXCJkcm9wRGF0YWJhc2VcIl0sIGZ1bmN0aW9uIChtZXRob2QpIHtcbiAgTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24gKC8qIGFyZ3VtZW50cyAqLykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICByZXR1cm4gTWV0ZW9yLndyYXBBc3luYyhzZWxmW1wiX1wiICsgbWV0aG9kXSkuYXBwbHkoc2VsZiwgYXJndW1lbnRzKTtcbiAgfTtcbn0pO1xuXG4vLyBYWFggTW9uZ29Db25uZWN0aW9uLnVwc2VydCgpIGRvZXMgbm90IHJldHVybiB0aGUgaWQgb2YgdGhlIGluc2VydGVkIGRvY3VtZW50XG4vLyB1bmxlc3MgeW91IHNldCBpdCBleHBsaWNpdGx5IGluIHRoZSBzZWxlY3RvciBvciBtb2RpZmllciAoYXMgYSByZXBsYWNlbWVudFxuLy8gZG9jKS5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUudXBzZXJ0ID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3RvciwgbW9kLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucywgY2FsbGJhY2spIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAodHlwZW9mIG9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIiAmJiAhIGNhbGxiYWNrKSB7XG4gICAgY2FsbGJhY2sgPSBvcHRpb25zO1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuXG4gIHJldHVybiBzZWxmLnVwZGF0ZShjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IsIG1vZCxcbiAgICAgICAgICAgICAgICAgICAgIF8uZXh0ZW5kKHt9LCBvcHRpb25zLCB7XG4gICAgICAgICAgICAgICAgICAgICAgIHVwc2VydDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgX3JldHVybk9iamVjdDogdHJ1ZVxuICAgICAgICAgICAgICAgICAgICAgfSksIGNhbGxiYWNrKTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuZmluZCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKVxuICAgIHNlbGVjdG9yID0ge307XG5cbiAgcmV0dXJuIG5ldyBDdXJzb3IoXG4gICAgc2VsZiwgbmV3IEN1cnNvckRlc2NyaXB0aW9uKGNvbGxlY3Rpb25OYW1lLCBzZWxlY3Rvciwgb3B0aW9ucykpO1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5maW5kT25lID0gZnVuY3Rpb24gKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKVxuICAgIHNlbGVjdG9yID0ge307XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIG9wdGlvbnMubGltaXQgPSAxO1xuICByZXR1cm4gc2VsZi5maW5kKGNvbGxlY3Rpb25fbmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMpLmZldGNoKClbMF07XG59O1xuXG4vLyBXZSdsbCBhY3R1YWxseSBkZXNpZ24gYW4gaW5kZXggQVBJIGxhdGVyLiBGb3Igbm93LCB3ZSBqdXN0IHBhc3MgdGhyb3VnaCB0b1xuLy8gTW9uZ28ncywgYnV0IG1ha2UgaXQgc3luY2hyb25vdXMuXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9lbnN1cmVJbmRleCA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBXZSBleHBlY3QgdGhpcyBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYXQgc3RhcnR1cCwgbm90IGZyb20gd2l0aGluIGEgbWV0aG9kLFxuICAvLyBzbyB3ZSBkb24ndCBpbnRlcmFjdCB3aXRoIHRoZSB3cml0ZSBmZW5jZS5cbiAgdmFyIGNvbGxlY3Rpb24gPSBzZWxmLnJhd0NvbGxlY3Rpb24oY29sbGVjdGlvbk5hbWUpO1xuICB2YXIgZnV0dXJlID0gbmV3IEZ1dHVyZTtcbiAgdmFyIGluZGV4TmFtZSA9IGNvbGxlY3Rpb24uZW5zdXJlSW5kZXgoaW5kZXgsIG9wdGlvbnMsIGZ1dHVyZS5yZXNvbHZlcigpKTtcbiAgZnV0dXJlLndhaXQoKTtcbn07XG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9kcm9wSW5kZXggPSBmdW5jdGlvbiAoY29sbGVjdGlvbk5hbWUsIGluZGV4KSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBUaGlzIGZ1bmN0aW9uIGlzIG9ubHkgdXNlZCBieSB0ZXN0IGNvZGUsIG5vdCB3aXRoaW4gYSBtZXRob2QsIHNvIHdlIGRvbid0XG4gIC8vIGludGVyYWN0IHdpdGggdGhlIHdyaXRlIGZlbmNlLlxuICB2YXIgY29sbGVjdGlvbiA9IHNlbGYucmF3Q29sbGVjdGlvbihjb2xsZWN0aW9uTmFtZSk7XG4gIHZhciBmdXR1cmUgPSBuZXcgRnV0dXJlO1xuICB2YXIgaW5kZXhOYW1lID0gY29sbGVjdGlvbi5kcm9wSW5kZXgoaW5kZXgsIGZ1dHVyZS5yZXNvbHZlcigpKTtcbiAgZnV0dXJlLndhaXQoKTtcbn07XG5cbi8vIENVUlNPUlNcblxuLy8gVGhlcmUgYXJlIHNldmVyYWwgY2xhc3NlcyB3aGljaCByZWxhdGUgdG8gY3Vyc29yczpcbi8vXG4vLyBDdXJzb3JEZXNjcmlwdGlvbiByZXByZXNlbnRzIHRoZSBhcmd1bWVudHMgdXNlZCB0byBjb25zdHJ1Y3QgYSBjdXJzb3I6XG4vLyBjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IsIGFuZCAoZmluZCkgb3B0aW9ucy4gIEJlY2F1c2UgaXQgaXMgdXNlZCBhcyBhIGtleVxuLy8gZm9yIGN1cnNvciBkZS1kdXAsIGV2ZXJ5dGhpbmcgaW4gaXQgc2hvdWxkIGVpdGhlciBiZSBKU09OLXN0cmluZ2lmaWFibGUgb3Jcbi8vIG5vdCBhZmZlY3Qgb2JzZXJ2ZUNoYW5nZXMgb3V0cHV0IChlZywgb3B0aW9ucy50cmFuc2Zvcm0gZnVuY3Rpb25zIGFyZSBub3Rcbi8vIHN0cmluZ2lmaWFibGUgYnV0IGRvIG5vdCBhZmZlY3Qgb2JzZXJ2ZUNoYW5nZXMpLlxuLy9cbi8vIFN5bmNocm9ub3VzQ3Vyc29yIGlzIGEgd3JhcHBlciBhcm91bmQgYSBNb25nb0RCIGN1cnNvclxuLy8gd2hpY2ggaW5jbHVkZXMgZnVsbHktc3luY2hyb25vdXMgdmVyc2lvbnMgb2YgZm9yRWFjaCwgZXRjLlxuLy9cbi8vIEN1cnNvciBpcyB0aGUgY3Vyc29yIG9iamVjdCByZXR1cm5lZCBmcm9tIGZpbmQoKSwgd2hpY2ggaW1wbGVtZW50cyB0aGVcbi8vIGRvY3VtZW50ZWQgTW9uZ28uQ29sbGVjdGlvbiBjdXJzb3IgQVBJLiAgSXQgd3JhcHMgYSBDdXJzb3JEZXNjcmlwdGlvbiBhbmQgYVxuLy8gU3luY2hyb25vdXNDdXJzb3IgKGxhemlseTogaXQgZG9lc24ndCBjb250YWN0IE1vbmdvIHVudGlsIHlvdSBjYWxsIGEgbWV0aG9kXG4vLyBsaWtlIGZldGNoIG9yIGZvckVhY2ggb24gaXQpLlxuLy9cbi8vIE9ic2VydmVIYW5kbGUgaXMgdGhlIFwib2JzZXJ2ZSBoYW5kbGVcIiByZXR1cm5lZCBmcm9tIG9ic2VydmVDaGFuZ2VzLiBJdCBoYXMgYVxuLy8gcmVmZXJlbmNlIHRvIGFuIE9ic2VydmVNdWx0aXBsZXhlci5cbi8vXG4vLyBPYnNlcnZlTXVsdGlwbGV4ZXIgYWxsb3dzIG11bHRpcGxlIGlkZW50aWNhbCBPYnNlcnZlSGFuZGxlcyB0byBiZSBkcml2ZW4gYnkgYVxuLy8gc2luZ2xlIG9ic2VydmUgZHJpdmVyLlxuLy9cbi8vIFRoZXJlIGFyZSB0d28gXCJvYnNlcnZlIGRyaXZlcnNcIiB3aGljaCBkcml2ZSBPYnNlcnZlTXVsdGlwbGV4ZXJzOlxuLy8gICAtIFBvbGxpbmdPYnNlcnZlRHJpdmVyIGNhY2hlcyB0aGUgcmVzdWx0cyBvZiBhIHF1ZXJ5IGFuZCByZXJ1bnMgaXQgd2hlblxuLy8gICAgIG5lY2Vzc2FyeS5cbi8vICAgLSBPcGxvZ09ic2VydmVEcml2ZXIgZm9sbG93cyB0aGUgTW9uZ28gb3BlcmF0aW9uIGxvZyB0byBkaXJlY3RseSBvYnNlcnZlXG4vLyAgICAgZGF0YWJhc2UgY2hhbmdlcy5cbi8vIEJvdGggaW1wbGVtZW50YXRpb25zIGZvbGxvdyB0aGUgc2FtZSBzaW1wbGUgaW50ZXJmYWNlOiB3aGVuIHlvdSBjcmVhdGUgdGhlbSxcbi8vIHRoZXkgc3RhcnQgc2VuZGluZyBvYnNlcnZlQ2hhbmdlcyBjYWxsYmFja3MgKGFuZCBhIHJlYWR5KCkgaW52b2NhdGlvbikgdG9cbi8vIHRoZWlyIE9ic2VydmVNdWx0aXBsZXhlciwgYW5kIHlvdSBzdG9wIHRoZW0gYnkgY2FsbGluZyB0aGVpciBzdG9wKCkgbWV0aG9kLlxuXG5DdXJzb3JEZXNjcmlwdGlvbiA9IGZ1bmN0aW9uIChjb2xsZWN0aW9uTmFtZSwgc2VsZWN0b3IsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLmNvbGxlY3Rpb25OYW1lID0gY29sbGVjdGlvbk5hbWU7XG4gIHNlbGYuc2VsZWN0b3IgPSBNb25nby5Db2xsZWN0aW9uLl9yZXdyaXRlU2VsZWN0b3Ioc2VsZWN0b3IpO1xuICBzZWxmLm9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xufTtcblxuQ3Vyc29yID0gZnVuY3Rpb24gKG1vbmdvLCBjdXJzb3JEZXNjcmlwdGlvbikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgc2VsZi5fbW9uZ28gPSBtb25nbztcbiAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24gPSBjdXJzb3JEZXNjcmlwdGlvbjtcbiAgc2VsZi5fc3luY2hyb25vdXNDdXJzb3IgPSBudWxsO1xufTtcblxuXy5lYWNoKFsnZm9yRWFjaCcsICdtYXAnLCAnZmV0Y2gnLCAnY291bnQnLCBTeW1ib2wuaXRlcmF0b3JdLCBmdW5jdGlvbiAobWV0aG9kKSB7XG4gIEN1cnNvci5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBZb3UgY2FuIG9ubHkgb2JzZXJ2ZSBhIHRhaWxhYmxlIGN1cnNvci5cbiAgICBpZiAoc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50YWlsYWJsZSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBjYWxsIFwiICsgbWV0aG9kICsgXCIgb24gYSB0YWlsYWJsZSBjdXJzb3JcIik7XG5cbiAgICBpZiAoIXNlbGYuX3N5bmNocm9ub3VzQ3Vyc29yKSB7XG4gICAgICBzZWxmLl9zeW5jaHJvbm91c0N1cnNvciA9IHNlbGYuX21vbmdvLl9jcmVhdGVTeW5jaHJvbm91c0N1cnNvcihcbiAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24sIHtcbiAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhhdCB0aGUgXCJzZWxmXCIgYXJndW1lbnQgdG8gZm9yRWFjaC9tYXAgY2FsbGJhY2tzIGlzIHRoZVxuICAgICAgICAgIC8vIEN1cnNvciwgbm90IHRoZSBTeW5jaHJvbm91c0N1cnNvci5cbiAgICAgICAgICBzZWxmRm9ySXRlcmF0aW9uOiBzZWxmLFxuICAgICAgICAgIHVzZVRyYW5zZm9ybTogdHJ1ZVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VsZi5fc3luY2hyb25vdXNDdXJzb3JbbWV0aG9kXS5hcHBseShcbiAgICAgIHNlbGYuX3N5bmNocm9ub3VzQ3Vyc29yLCBhcmd1bWVudHMpO1xuICB9O1xufSk7XG5cbi8vIFNpbmNlIHdlIGRvbid0IGFjdHVhbGx5IGhhdmUgYSBcIm5leHRPYmplY3RcIiBpbnRlcmZhY2UsIHRoZXJlJ3MgcmVhbGx5IG5vXG4vLyByZWFzb24gdG8gaGF2ZSBhIFwicmV3aW5kXCIgaW50ZXJmYWNlLiAgQWxsIGl0IGRpZCB3YXMgbWFrZSBtdWx0aXBsZSBjYWxsc1xuLy8gdG8gZmV0Y2gvbWFwL2ZvckVhY2ggcmV0dXJuIG5vdGhpbmcgdGhlIHNlY29uZCB0aW1lLlxuLy8gWFhYIENPTVBBVCBXSVRIIDAuOC4xXG5DdXJzb3IucHJvdG90eXBlLnJld2luZCA9IGZ1bmN0aW9uICgpIHtcbn07XG5cbkN1cnNvci5wcm90b3R5cGUuZ2V0VHJhbnNmb3JtID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy50cmFuc2Zvcm07XG59O1xuXG4vLyBXaGVuIHlvdSBjYWxsIE1ldGVvci5wdWJsaXNoKCkgd2l0aCBhIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIEN1cnNvciwgd2UgbmVlZFxuLy8gdG8gdHJhbnNtdXRlIGl0IGludG8gdGhlIGVxdWl2YWxlbnQgc3Vic2NyaXB0aW9uLiAgVGhpcyBpcyB0aGUgZnVuY3Rpb24gdGhhdFxuLy8gZG9lcyB0aGF0LlxuXG5DdXJzb3IucHJvdG90eXBlLl9wdWJsaXNoQ3Vyc29yID0gZnVuY3Rpb24gKHN1Yikge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBjb2xsZWN0aW9uID0gc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWU7XG4gIHJldHVybiBNb25nby5Db2xsZWN0aW9uLl9wdWJsaXNoQ3Vyc29yKHNlbGYsIHN1YiwgY29sbGVjdGlvbik7XG59O1xuXG4vLyBVc2VkIHRvIGd1YXJhbnRlZSB0aGF0IHB1Ymxpc2ggZnVuY3Rpb25zIHJldHVybiBhdCBtb3N0IG9uZSBjdXJzb3IgcGVyXG4vLyBjb2xsZWN0aW9uLiBQcml2YXRlLCBiZWNhdXNlIHdlIG1pZ2h0IGxhdGVyIGhhdmUgY3Vyc29ycyB0aGF0IGluY2x1ZGVcbi8vIGRvY3VtZW50cyBmcm9tIG11bHRpcGxlIGNvbGxlY3Rpb25zIHNvbWVob3cuXG5DdXJzb3IucHJvdG90eXBlLl9nZXRDb2xsZWN0aW9uTmFtZSA9IGZ1bmN0aW9uICgpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICByZXR1cm4gc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWU7XG59O1xuXG5DdXJzb3IucHJvdG90eXBlLm9ic2VydmUgPSBmdW5jdGlvbiAoY2FsbGJhY2tzKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgcmV0dXJuIExvY2FsQ29sbGVjdGlvbi5fb2JzZXJ2ZUZyb21PYnNlcnZlQ2hhbmdlcyhzZWxmLCBjYWxsYmFja3MpO1xufTtcblxuQ3Vyc29yLnByb3RvdHlwZS5vYnNlcnZlQ2hhbmdlcyA9IGZ1bmN0aW9uIChjYWxsYmFja3MsIG9wdGlvbnMgPSB7fSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHZhciBtZXRob2RzID0gW1xuICAgICdhZGRlZEF0JyxcbiAgICAnYWRkZWQnLFxuICAgICdjaGFuZ2VkQXQnLFxuICAgICdjaGFuZ2VkJyxcbiAgICAncmVtb3ZlZEF0JyxcbiAgICAncmVtb3ZlZCcsXG4gICAgJ21vdmVkVG8nXG4gIF07XG4gIHZhciBvcmRlcmVkID0gTG9jYWxDb2xsZWN0aW9uLl9vYnNlcnZlQ2hhbmdlc0NhbGxiYWNrc0FyZU9yZGVyZWQoY2FsbGJhY2tzKTtcblxuICBsZXQgZXhjZXB0aW9uTmFtZSA9IGNhbGxiYWNrcy5fZnJvbU9ic2VydmUgPyAnb2JzZXJ2ZScgOiAnb2JzZXJ2ZUNoYW5nZXMnO1xuICBleGNlcHRpb25OYW1lICs9ICcgY2FsbGJhY2snO1xuICBtZXRob2RzLmZvckVhY2goZnVuY3Rpb24gKG1ldGhvZCkge1xuICAgIGlmIChjYWxsYmFja3NbbWV0aG9kXSAmJiB0eXBlb2YgY2FsbGJhY2tzW21ldGhvZF0gPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBjYWxsYmFja3NbbWV0aG9kXSA9IE1ldGVvci5iaW5kRW52aXJvbm1lbnQoY2FsbGJhY2tzW21ldGhvZF0sIG1ldGhvZCArIGV4Y2VwdGlvbk5hbWUpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHNlbGYuX21vbmdvLl9vYnNlcnZlQ2hhbmdlcyhcbiAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiwgb3JkZXJlZCwgY2FsbGJhY2tzLCBvcHRpb25zLm5vbk11dGF0aW5nQ2FsbGJhY2tzKTtcbn07XG5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX2NyZWF0ZVN5bmNocm9ub3VzQ3Vyc29yID0gZnVuY3Rpb24oXG4gICAgY3Vyc29yRGVzY3JpcHRpb24sIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBvcHRpb25zID0gXy5waWNrKG9wdGlvbnMgfHwge30sICdzZWxmRm9ySXRlcmF0aW9uJywgJ3VzZVRyYW5zZm9ybScpO1xuXG4gIHZhciBjb2xsZWN0aW9uID0gc2VsZi5yYXdDb2xsZWN0aW9uKGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lKTtcbiAgdmFyIGN1cnNvck9wdGlvbnMgPSBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zO1xuICB2YXIgbW9uZ29PcHRpb25zID0ge1xuICAgIHNvcnQ6IGN1cnNvck9wdGlvbnMuc29ydCxcbiAgICBsaW1pdDogY3Vyc29yT3B0aW9ucy5saW1pdCxcbiAgICBza2lwOiBjdXJzb3JPcHRpb25zLnNraXAsXG4gICAgcHJvamVjdGlvbjogY3Vyc29yT3B0aW9ucy5maWVsZHMsXG4gICAgcmVhZFByZWZlcmVuY2U6IGN1cnNvck9wdGlvbnMucmVhZFByZWZlcmVuY2VcbiAgfTtcblxuICAvLyBEbyB3ZSB3YW50IGEgdGFpbGFibGUgY3Vyc29yICh3aGljaCBvbmx5IHdvcmtzIG9uIGNhcHBlZCBjb2xsZWN0aW9ucyk/XG4gIGlmIChjdXJzb3JPcHRpb25zLnRhaWxhYmxlKSB7XG4gICAgLy8gV2Ugd2FudCBhIHRhaWxhYmxlIGN1cnNvci4uLlxuICAgIG1vbmdvT3B0aW9ucy50YWlsYWJsZSA9IHRydWU7XG4gICAgLy8gLi4uIGFuZCBmb3IgdGhlIHNlcnZlciB0byB3YWl0IGEgYml0IGlmIGFueSBnZXRNb3JlIGhhcyBubyBkYXRhIChyYXRoZXJcbiAgICAvLyB0aGFuIG1ha2luZyB1cyBwdXQgdGhlIHJlbGV2YW50IHNsZWVwcyBpbiB0aGUgY2xpZW50KS4uLlxuICAgIG1vbmdvT3B0aW9ucy5hd2FpdGRhdGEgPSB0cnVlO1xuICAgIC8vIC4uLiBhbmQgdG8ga2VlcCBxdWVyeWluZyB0aGUgc2VydmVyIGluZGVmaW5pdGVseSByYXRoZXIgdGhhbiBqdXN0IDUgdGltZXNcbiAgICAvLyBpZiB0aGVyZSdzIG5vIG1vcmUgZGF0YS5cbiAgICBtb25nb09wdGlvbnMubnVtYmVyT2ZSZXRyaWVzID0gLTE7XG4gICAgLy8gQW5kIGlmIHRoaXMgaXMgb24gdGhlIG9wbG9nIGNvbGxlY3Rpb24gYW5kIHRoZSBjdXJzb3Igc3BlY2lmaWVzIGEgJ3RzJyxcbiAgICAvLyB0aGVuIHNldCB0aGUgdW5kb2N1bWVudGVkIG9wbG9nIHJlcGxheSBmbGFnLCB3aGljaCBkb2VzIGEgc3BlY2lhbCBzY2FuIHRvXG4gICAgLy8gZmluZCB0aGUgZmlyc3QgZG9jdW1lbnQgKGluc3RlYWQgb2YgY3JlYXRpbmcgYW4gaW5kZXggb24gdHMpLiBUaGlzIGlzIGFcbiAgICAvLyB2ZXJ5IGhhcmQtY29kZWQgTW9uZ28gZmxhZyB3aGljaCBvbmx5IHdvcmtzIG9uIHRoZSBvcGxvZyBjb2xsZWN0aW9uIGFuZFxuICAgIC8vIG9ubHkgd29ya3Mgd2l0aCB0aGUgdHMgZmllbGQuXG4gICAgaWYgKGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lID09PSBPUExPR19DT0xMRUNUSU9OICYmXG4gICAgICAgIGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yLnRzKSB7XG4gICAgICBtb25nb09wdGlvbnMub3Bsb2dSZXBsYXkgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIHZhciBkYkN1cnNvciA9IGNvbGxlY3Rpb24uZmluZChcbiAgICByZXBsYWNlVHlwZXMoY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IsIHJlcGxhY2VNZXRlb3JBdG9tV2l0aE1vbmdvKSxcbiAgICBtb25nb09wdGlvbnMpO1xuXG4gIGlmICh0eXBlb2YgY3Vyc29yT3B0aW9ucy5tYXhUaW1lTXMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgZGJDdXJzb3IgPSBkYkN1cnNvci5tYXhUaW1lTVMoY3Vyc29yT3B0aW9ucy5tYXhUaW1lTXMpO1xuICB9XG4gIGlmICh0eXBlb2YgY3Vyc29yT3B0aW9ucy5oaW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGRiQ3Vyc29yID0gZGJDdXJzb3IuaGludChjdXJzb3JPcHRpb25zLmhpbnQpO1xuICB9XG5cbiAgcmV0dXJuIG5ldyBTeW5jaHJvbm91c0N1cnNvcihkYkN1cnNvciwgY3Vyc29yRGVzY3JpcHRpb24sIG9wdGlvbnMpO1xufTtcblxudmFyIFN5bmNocm9ub3VzQ3Vyc29yID0gZnVuY3Rpb24gKGRiQ3Vyc29yLCBjdXJzb3JEZXNjcmlwdGlvbiwgb3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIG9wdGlvbnMgPSBfLnBpY2sob3B0aW9ucyB8fCB7fSwgJ3NlbGZGb3JJdGVyYXRpb24nLCAndXNlVHJhbnNmb3JtJyk7XG5cbiAgc2VsZi5fZGJDdXJzb3IgPSBkYkN1cnNvcjtcbiAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24gPSBjdXJzb3JEZXNjcmlwdGlvbjtcbiAgLy8gVGhlIFwic2VsZlwiIGFyZ3VtZW50IHBhc3NlZCB0byBmb3JFYWNoL21hcCBjYWxsYmFja3MuIElmIHdlJ3JlIHdyYXBwZWRcbiAgLy8gaW5zaWRlIGEgdXNlci12aXNpYmxlIEN1cnNvciwgd2Ugd2FudCB0byBwcm92aWRlIHRoZSBvdXRlciBjdXJzb3IhXG4gIHNlbGYuX3NlbGZGb3JJdGVyYXRpb24gPSBvcHRpb25zLnNlbGZGb3JJdGVyYXRpb24gfHwgc2VsZjtcbiAgaWYgKG9wdGlvbnMudXNlVHJhbnNmb3JtICYmIGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudHJhbnNmb3JtKSB7XG4gICAgc2VsZi5fdHJhbnNmb3JtID0gTG9jYWxDb2xsZWN0aW9uLndyYXBUcmFuc2Zvcm0oXG4gICAgICBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRyYW5zZm9ybSk7XG4gIH0gZWxzZSB7XG4gICAgc2VsZi5fdHJhbnNmb3JtID0gbnVsbDtcbiAgfVxuXG4gIHNlbGYuX3N5bmNocm9ub3VzQ291bnQgPSBGdXR1cmUud3JhcChkYkN1cnNvci5jb3VudC5iaW5kKGRiQ3Vyc29yKSk7XG4gIHNlbGYuX3Zpc2l0ZWRJZHMgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbn07XG5cbl8uZXh0ZW5kKFN5bmNocm9ub3VzQ3Vyc29yLnByb3RvdHlwZSwge1xuICAvLyBSZXR1cm5zIGEgUHJvbWlzZSBmb3IgdGhlIG5leHQgb2JqZWN0IGZyb20gdGhlIHVuZGVybHlpbmcgY3Vyc29yIChiZWZvcmVcbiAgLy8gdGhlIE1vbmdvLT5NZXRlb3IgdHlwZSByZXBsYWNlbWVudCkuXG4gIF9yYXdOZXh0T2JqZWN0UHJvbWlzZTogZnVuY3Rpb24gKCkge1xuICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBzZWxmLl9kYkN1cnNvci5uZXh0KChlcnIsIGRvYykgPT4ge1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzb2x2ZShkb2MpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBSZXR1cm5zIGEgUHJvbWlzZSBmb3IgdGhlIG5leHQgb2JqZWN0IGZyb20gdGhlIGN1cnNvciwgc2tpcHBpbmcgdGhvc2Ugd2hvc2VcbiAgLy8gSURzIHdlJ3ZlIGFscmVhZHkgc2VlbiBhbmQgcmVwbGFjaW5nIE1vbmdvIGF0b21zIHdpdGggTWV0ZW9yIGF0b21zLlxuICBfbmV4dE9iamVjdFByb21pc2U6IGFzeW5jIGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdmFyIGRvYyA9IGF3YWl0IHNlbGYuX3Jhd05leHRPYmplY3RQcm9taXNlKCk7XG5cbiAgICAgIGlmICghZG9jKSByZXR1cm4gbnVsbDtcbiAgICAgIGRvYyA9IHJlcGxhY2VUeXBlcyhkb2MsIHJlcGxhY2VNb25nb0F0b21XaXRoTWV0ZW9yKTtcblxuICAgICAgaWYgKCFzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRhaWxhYmxlICYmIF8uaGFzKGRvYywgJ19pZCcpKSB7XG4gICAgICAgIC8vIERpZCBNb25nbyBnaXZlIHVzIGR1cGxpY2F0ZSBkb2N1bWVudHMgaW4gdGhlIHNhbWUgY3Vyc29yPyBJZiBzbyxcbiAgICAgICAgLy8gaWdub3JlIHRoaXMgb25lLiAoRG8gdGhpcyBiZWZvcmUgdGhlIHRyYW5zZm9ybSwgc2luY2UgdHJhbnNmb3JtIG1pZ2h0XG4gICAgICAgIC8vIHJldHVybiBzb21lIHVucmVsYXRlZCB2YWx1ZS4pIFdlIGRvbid0IGRvIHRoaXMgZm9yIHRhaWxhYmxlIGN1cnNvcnMsXG4gICAgICAgIC8vIGJlY2F1c2Ugd2Ugd2FudCB0byBtYWludGFpbiBPKDEpIG1lbW9yeSB1c2FnZS4gQW5kIGlmIHRoZXJlIGlzbid0IF9pZFxuICAgICAgICAvLyBmb3Igc29tZSByZWFzb24gKG1heWJlIGl0J3MgdGhlIG9wbG9nKSwgdGhlbiB3ZSBkb24ndCBkbyB0aGlzIGVpdGhlci5cbiAgICAgICAgLy8gKEJlIGNhcmVmdWwgdG8gZG8gdGhpcyBmb3IgZmFsc2V5IGJ1dCBleGlzdGluZyBfaWQsIHRob3VnaC4pXG4gICAgICAgIGlmIChzZWxmLl92aXNpdGVkSWRzLmhhcyhkb2MuX2lkKSkgY29udGludWU7XG4gICAgICAgIHNlbGYuX3Zpc2l0ZWRJZHMuc2V0KGRvYy5faWQsIHRydWUpO1xuICAgICAgfVxuXG4gICAgICBpZiAoc2VsZi5fdHJhbnNmb3JtKVxuICAgICAgICBkb2MgPSBzZWxmLl90cmFuc2Zvcm0oZG9jKTtcblxuICAgICAgcmV0dXJuIGRvYztcbiAgICB9XG4gIH0sXG5cbiAgLy8gUmV0dXJucyBhIHByb21pc2Ugd2hpY2ggaXMgcmVzb2x2ZWQgd2l0aCB0aGUgbmV4dCBvYmplY3QgKGxpa2Ugd2l0aFxuICAvLyBfbmV4dE9iamVjdFByb21pc2UpIG9yIHJlamVjdGVkIGlmIHRoZSBjdXJzb3IgZG9lc24ndCByZXR1cm4gd2l0aGluXG4gIC8vIHRpbWVvdXRNUyBtcy5cbiAgX25leHRPYmplY3RQcm9taXNlV2l0aFRpbWVvdXQ6IGZ1bmN0aW9uICh0aW1lb3V0TVMpIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBpZiAoIXRpbWVvdXRNUykge1xuICAgICAgcmV0dXJuIHNlbGYuX25leHRPYmplY3RQcm9taXNlKCk7XG4gICAgfVxuICAgIGNvbnN0IG5leHRPYmplY3RQcm9taXNlID0gc2VsZi5fbmV4dE9iamVjdFByb21pc2UoKTtcbiAgICBjb25zdCB0aW1lb3V0RXJyID0gbmV3IEVycm9yKCdDbGllbnQtc2lkZSB0aW1lb3V0IHdhaXRpbmcgZm9yIG5leHQgb2JqZWN0Jyk7XG4gICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCB0aW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICByZWplY3QodGltZW91dEVycik7XG4gICAgICB9LCB0aW1lb3V0TVMpO1xuICAgIH0pO1xuICAgIHJldHVybiBQcm9taXNlLnJhY2UoW25leHRPYmplY3RQcm9taXNlLCB0aW1lb3V0UHJvbWlzZV0pXG4gICAgICAuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICBpZiAoZXJyID09PSB0aW1lb3V0RXJyKSB7XG4gICAgICAgICAgc2VsZi5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH0pO1xuICB9LFxuXG4gIF9uZXh0T2JqZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLl9uZXh0T2JqZWN0UHJvbWlzZSgpLmF3YWl0KCk7XG4gIH0sXG5cbiAgZm9yRWFjaDogZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gR2V0IGJhY2sgdG8gdGhlIGJlZ2lubmluZy5cbiAgICBzZWxmLl9yZXdpbmQoKTtcblxuICAgIC8vIFdlIGltcGxlbWVudCB0aGUgbG9vcCBvdXJzZWxmIGluc3RlYWQgb2YgdXNpbmcgc2VsZi5fZGJDdXJzb3IuZWFjaCxcbiAgICAvLyBiZWNhdXNlIFwiZWFjaFwiIHdpbGwgY2FsbCBpdHMgY2FsbGJhY2sgb3V0c2lkZSBvZiBhIGZpYmVyIHdoaWNoIG1ha2VzIGl0XG4gICAgLy8gbXVjaCBtb3JlIGNvbXBsZXggdG8gbWFrZSB0aGlzIGZ1bmN0aW9uIHN5bmNocm9ub3VzLlxuICAgIHZhciBpbmRleCA9IDA7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHZhciBkb2MgPSBzZWxmLl9uZXh0T2JqZWN0KCk7XG4gICAgICBpZiAoIWRvYykgcmV0dXJuO1xuICAgICAgY2FsbGJhY2suY2FsbCh0aGlzQXJnLCBkb2MsIGluZGV4KyssIHNlbGYuX3NlbGZGb3JJdGVyYXRpb24pO1xuICAgIH1cbiAgfSxcblxuICAvLyBYWFggQWxsb3cgb3ZlcmxhcHBpbmcgY2FsbGJhY2sgZXhlY3V0aW9ucyBpZiBjYWxsYmFjayB5aWVsZHMuXG4gIG1hcDogZnVuY3Rpb24gKGNhbGxiYWNrLCB0aGlzQXJnKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBzZWxmLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaW5kZXgpIHtcbiAgICAgIHJlcy5wdXNoKGNhbGxiYWNrLmNhbGwodGhpc0FyZywgZG9jLCBpbmRleCwgc2VsZi5fc2VsZkZvckl0ZXJhdGlvbikpO1xuICAgIH0pO1xuICAgIHJldHVybiByZXM7XG4gIH0sXG5cbiAgX3Jld2luZDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIC8vIGtub3duIHRvIGJlIHN5bmNocm9ub3VzXG4gICAgc2VsZi5fZGJDdXJzb3IucmV3aW5kKCk7XG5cbiAgICBzZWxmLl92aXNpdGVkSWRzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gIH0sXG5cbiAgLy8gTW9zdGx5IHVzYWJsZSBmb3IgdGFpbGFibGUgY3Vyc29ycy5cbiAgY2xvc2U6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICBzZWxmLl9kYkN1cnNvci5jbG9zZSgpO1xuICB9LFxuXG4gIGZldGNoOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHJldHVybiBzZWxmLm1hcChfLmlkZW50aXR5KTtcbiAgfSxcblxuICBjb3VudDogZnVuY3Rpb24gKGFwcGx5U2tpcExpbWl0ID0gZmFsc2UpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIHNlbGYuX3N5bmNocm9ub3VzQ291bnQoYXBwbHlTa2lwTGltaXQpLndhaXQoKTtcbiAgfSxcblxuICAvLyBUaGlzIG1ldGhvZCBpcyBOT1Qgd3JhcHBlZCBpbiBDdXJzb3IuXG4gIGdldFJhd09iamVjdHM6IGZ1bmN0aW9uIChvcmRlcmVkKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChvcmRlcmVkKSB7XG4gICAgICByZXR1cm4gc2VsZi5mZXRjaCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcmVzdWx0cyA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgICAgc2VsZi5mb3JFYWNoKGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgcmVzdWx0cy5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJlc3VsdHM7XG4gICAgfVxuICB9XG59KTtcblxuU3luY2hyb25vdXNDdXJzb3IucHJvdG90eXBlW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcblxuICAvLyBHZXQgYmFjayB0byB0aGUgYmVnaW5uaW5nLlxuICBzZWxmLl9yZXdpbmQoKTtcblxuICByZXR1cm4ge1xuICAgIG5leHQoKSB7XG4gICAgICBjb25zdCBkb2MgPSBzZWxmLl9uZXh0T2JqZWN0KCk7XG4gICAgICByZXR1cm4gZG9jID8ge1xuICAgICAgICB2YWx1ZTogZG9jXG4gICAgICB9IDoge1xuICAgICAgICBkb25lOiB0cnVlXG4gICAgICB9O1xuICAgIH1cbiAgfTtcbn07XG5cbi8vIFRhaWxzIHRoZSBjdXJzb3IgZGVzY3JpYmVkIGJ5IGN1cnNvckRlc2NyaXB0aW9uLCBtb3N0IGxpa2VseSBvbiB0aGVcbi8vIG9wbG9nLiBDYWxscyBkb2NDYWxsYmFjayB3aXRoIGVhY2ggZG9jdW1lbnQgZm91bmQuIElnbm9yZXMgZXJyb3JzIGFuZCBqdXN0XG4vLyByZXN0YXJ0cyB0aGUgdGFpbCBvbiBlcnJvci5cbi8vXG4vLyBJZiB0aW1lb3V0TVMgaXMgc2V0LCB0aGVuIGlmIHdlIGRvbid0IGdldCBhIG5ldyBkb2N1bWVudCBldmVyeSB0aW1lb3V0TVMsXG4vLyBraWxsIGFuZCByZXN0YXJ0IHRoZSBjdXJzb3IuIFRoaXMgaXMgcHJpbWFyaWx5IGEgd29ya2Fyb3VuZCBmb3IgIzg1OTguXG5Nb25nb0Nvbm5lY3Rpb24ucHJvdG90eXBlLnRhaWwgPSBmdW5jdGlvbiAoY3Vyc29yRGVzY3JpcHRpb24sIGRvY0NhbGxiYWNrLCB0aW1lb3V0TVMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBpZiAoIWN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMudGFpbGFibGUpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgdGFpbCBhIHRhaWxhYmxlIGN1cnNvclwiKTtcblxuICB2YXIgY3Vyc29yID0gc2VsZi5fY3JlYXRlU3luY2hyb25vdXNDdXJzb3IoY3Vyc29yRGVzY3JpcHRpb24pO1xuXG4gIHZhciBzdG9wcGVkID0gZmFsc2U7XG4gIHZhciBsYXN0VFM7XG4gIHZhciBsb29wID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBkb2MgPSBudWxsO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBpZiAoc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZG9jID0gY3Vyc29yLl9uZXh0T2JqZWN0UHJvbWlzZVdpdGhUaW1lb3V0KHRpbWVvdXRNUykuYXdhaXQoKTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAvLyBUaGVyZSdzIG5vIGdvb2Qgd2F5IHRvIGZpZ3VyZSBvdXQgaWYgdGhpcyB3YXMgYWN0dWFsbHkgYW4gZXJyb3IgZnJvbVxuICAgICAgICAvLyBNb25nbywgb3IganVzdCBjbGllbnQtc2lkZSAoaW5jbHVkaW5nIG91ciBvd24gdGltZW91dCBlcnJvcikuIEFoXG4gICAgICAgIC8vIHdlbGwuIEJ1dCBlaXRoZXIgd2F5LCB3ZSBuZWVkIHRvIHJldHJ5IHRoZSBjdXJzb3IgKHVubGVzcyB0aGUgZmFpbHVyZVxuICAgICAgICAvLyB3YXMgYmVjYXVzZSB0aGUgb2JzZXJ2ZSBnb3Qgc3RvcHBlZCkuXG4gICAgICAgIGRvYyA9IG51bGw7XG4gICAgICB9XG4gICAgICAvLyBTaW5jZSB3ZSBhd2FpdGVkIGEgcHJvbWlzZSBhYm92ZSwgd2UgbmVlZCB0byBjaGVjayBhZ2FpbiB0byBzZWUgaWZcbiAgICAgIC8vIHdlJ3ZlIGJlZW4gc3RvcHBlZCBiZWZvcmUgY2FsbGluZyB0aGUgY2FsbGJhY2suXG4gICAgICBpZiAoc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuICAgICAgaWYgKGRvYykge1xuICAgICAgICAvLyBJZiBhIHRhaWxhYmxlIGN1cnNvciBjb250YWlucyBhIFwidHNcIiBmaWVsZCwgdXNlIGl0IHRvIHJlY3JlYXRlIHRoZVxuICAgICAgICAvLyBjdXJzb3Igb24gZXJyb3IuIChcInRzXCIgaXMgYSBzdGFuZGFyZCB0aGF0IE1vbmdvIHVzZXMgaW50ZXJuYWxseSBmb3JcbiAgICAgICAgLy8gdGhlIG9wbG9nLCBhbmQgdGhlcmUncyBhIHNwZWNpYWwgZmxhZyB0aGF0IGxldHMgeW91IGRvIGJpbmFyeSBzZWFyY2hcbiAgICAgICAgLy8gb24gaXQgaW5zdGVhZCBvZiBuZWVkaW5nIHRvIHVzZSBhbiBpbmRleC4pXG4gICAgICAgIGxhc3RUUyA9IGRvYy50cztcbiAgICAgICAgZG9jQ2FsbGJhY2soZG9jKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBuZXdTZWxlY3RvciA9IF8uY2xvbmUoY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IpO1xuICAgICAgICBpZiAobGFzdFRTKSB7XG4gICAgICAgICAgbmV3U2VsZWN0b3IudHMgPSB7JGd0OiBsYXN0VFN9O1xuICAgICAgICB9XG4gICAgICAgIGN1cnNvciA9IHNlbGYuX2NyZWF0ZVN5bmNocm9ub3VzQ3Vyc29yKG5ldyBDdXJzb3JEZXNjcmlwdGlvbihcbiAgICAgICAgICBjdXJzb3JEZXNjcmlwdGlvbi5jb2xsZWN0aW9uTmFtZSxcbiAgICAgICAgICBuZXdTZWxlY3RvcixcbiAgICAgICAgICBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zKSk7XG4gICAgICAgIC8vIE1vbmdvIGZhaWxvdmVyIHRha2VzIG1hbnkgc2Vjb25kcy4gIFJldHJ5IGluIGEgYml0LiAgKFdpdGhvdXQgdGhpc1xuICAgICAgICAvLyBzZXRUaW1lb3V0LCB3ZSBwZWcgdGhlIENQVSBhdCAxMDAlIGFuZCBuZXZlciBub3RpY2UgdGhlIGFjdHVhbFxuICAgICAgICAvLyBmYWlsb3Zlci5cbiAgICAgICAgTWV0ZW9yLnNldFRpbWVvdXQobG9vcCwgMTAwKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIE1ldGVvci5kZWZlcihsb29wKTtcblxuICByZXR1cm4ge1xuICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHN0b3BwZWQgPSB0cnVlO1xuICAgICAgY3Vyc29yLmNsb3NlKCk7XG4gICAgfVxuICB9O1xufTtcblxuTW9uZ29Db25uZWN0aW9uLnByb3RvdHlwZS5fb2JzZXJ2ZUNoYW5nZXMgPSBmdW5jdGlvbiAoXG4gICAgY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcywgbm9uTXV0YXRpbmdDYWxsYmFja3MpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmIChjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnRhaWxhYmxlKSB7XG4gICAgcmV0dXJuIHNlbGYuX29ic2VydmVDaGFuZ2VzVGFpbGFibGUoY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcyk7XG4gIH1cblxuICAvLyBZb3UgbWF5IG5vdCBmaWx0ZXIgb3V0IF9pZCB3aGVuIG9ic2VydmluZyBjaGFuZ2VzLCBiZWNhdXNlIHRoZSBpZCBpcyBhIGNvcmVcbiAgLy8gcGFydCBvZiB0aGUgb2JzZXJ2ZUNoYW5nZXMgQVBJLlxuICBpZiAoY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5maWVsZHMgJiZcbiAgICAgIChjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmZpZWxkcy5faWQgPT09IDAgfHxcbiAgICAgICBjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmZpZWxkcy5faWQgPT09IGZhbHNlKSkge1xuICAgIHRocm93IEVycm9yKFwiWW91IG1heSBub3Qgb2JzZXJ2ZSBhIGN1cnNvciB3aXRoIHtmaWVsZHM6IHtfaWQ6IDB9fVwiKTtcbiAgfVxuXG4gIHZhciBvYnNlcnZlS2V5ID0gRUpTT04uc3RyaW5naWZ5KFxuICAgIF8uZXh0ZW5kKHtvcmRlcmVkOiBvcmRlcmVkfSwgY3Vyc29yRGVzY3JpcHRpb24pKTtcblxuICB2YXIgbXVsdGlwbGV4ZXIsIG9ic2VydmVEcml2ZXI7XG4gIHZhciBmaXJzdEhhbmRsZSA9IGZhbHNlO1xuXG4gIC8vIEZpbmQgYSBtYXRjaGluZyBPYnNlcnZlTXVsdGlwbGV4ZXIsIG9yIGNyZWF0ZSBhIG5ldyBvbmUuIFRoaXMgbmV4dCBibG9jayBpc1xuICAvLyBndWFyYW50ZWVkIHRvIG5vdCB5aWVsZCAoYW5kIGl0IGRvZXNuJ3QgY2FsbCBhbnl0aGluZyB0aGF0IGNhbiBvYnNlcnZlIGFcbiAgLy8gbmV3IHF1ZXJ5KSwgc28gbm8gb3RoZXIgY2FsbHMgdG8gdGhpcyBmdW5jdGlvbiBjYW4gaW50ZXJsZWF2ZSB3aXRoIGl0LlxuICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgaWYgKF8uaGFzKHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnMsIG9ic2VydmVLZXkpKSB7XG4gICAgICBtdWx0aXBsZXhlciA9IHNlbGYuX29ic2VydmVNdWx0aXBsZXhlcnNbb2JzZXJ2ZUtleV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGZpcnN0SGFuZGxlID0gdHJ1ZTtcbiAgICAgIC8vIENyZWF0ZSBhIG5ldyBPYnNlcnZlTXVsdGlwbGV4ZXIuXG4gICAgICBtdWx0aXBsZXhlciA9IG5ldyBPYnNlcnZlTXVsdGlwbGV4ZXIoe1xuICAgICAgICBvcmRlcmVkOiBvcmRlcmVkLFxuICAgICAgICBvblN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBkZWxldGUgc2VsZi5fb2JzZXJ2ZU11bHRpcGxleGVyc1tvYnNlcnZlS2V5XTtcbiAgICAgICAgICBvYnNlcnZlRHJpdmVyLnN0b3AoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBzZWxmLl9vYnNlcnZlTXVsdGlwbGV4ZXJzW29ic2VydmVLZXldID0gbXVsdGlwbGV4ZXI7XG4gICAgfVxuICB9KTtcblxuICB2YXIgb2JzZXJ2ZUhhbmRsZSA9IG5ldyBPYnNlcnZlSGFuZGxlKG11bHRpcGxleGVyLFxuICAgIGNhbGxiYWNrcyxcbiAgICBub25NdXRhdGluZ0NhbGxiYWNrcyxcbiAgKTtcblxuICBpZiAoZmlyc3RIYW5kbGUpIHtcbiAgICB2YXIgbWF0Y2hlciwgc29ydGVyO1xuICAgIHZhciBjYW5Vc2VPcGxvZyA9IF8uYWxsKFtcbiAgICAgIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gQXQgYSBiYXJlIG1pbmltdW0sIHVzaW5nIHRoZSBvcGxvZyByZXF1aXJlcyB1cyB0byBoYXZlIGFuIG9wbG9nLCB0b1xuICAgICAgICAvLyB3YW50IHVub3JkZXJlZCBjYWxsYmFja3MsIGFuZCB0byBub3Qgd2FudCBhIGNhbGxiYWNrIG9uIHRoZSBwb2xsc1xuICAgICAgICAvLyB0aGF0IHdvbid0IGhhcHBlbi5cbiAgICAgICAgcmV0dXJuIHNlbGYuX29wbG9nSGFuZGxlICYmICFvcmRlcmVkICYmXG4gICAgICAgICAgIWNhbGxiYWNrcy5fdGVzdE9ubHlQb2xsQ2FsbGJhY2s7XG4gICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIFdlIG5lZWQgdG8gYmUgYWJsZSB0byBjb21waWxlIHRoZSBzZWxlY3Rvci4gRmFsbCBiYWNrIHRvIHBvbGxpbmcgZm9yXG4gICAgICAgIC8vIHNvbWUgbmV3ZmFuZ2xlZCAkc2VsZWN0b3IgdGhhdCBtaW5pbW9uZ28gZG9lc24ndCBzdXBwb3J0IHlldC5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBtYXRjaGVyID0gbmV3IE1pbmltb25nby5NYXRjaGVyKGN1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIC8vIFhYWCBtYWtlIGFsbCBjb21waWxhdGlvbiBlcnJvcnMgTWluaW1vbmdvRXJyb3Igb3Igc29tZXRoaW5nXG4gICAgICAgICAgLy8gICAgIHNvIHRoYXQgdGhpcyBkb2Vzbid0IGlnbm9yZSB1bnJlbGF0ZWQgZXhjZXB0aW9uc1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyAuLi4gYW5kIHRoZSBzZWxlY3RvciBpdHNlbGYgbmVlZHMgdG8gc3VwcG9ydCBvcGxvZy5cbiAgICAgICAgcmV0dXJuIE9wbG9nT2JzZXJ2ZURyaXZlci5jdXJzb3JTdXBwb3J0ZWQoY3Vyc29yRGVzY3JpcHRpb24sIG1hdGNoZXIpO1xuICAgICAgfSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBBbmQgd2UgbmVlZCB0byBiZSBhYmxlIHRvIGNvbXBpbGUgdGhlIHNvcnQsIGlmIGFueS4gIGVnLCBjYW4ndCBiZVxuICAgICAgICAvLyB7JG5hdHVyYWw6IDF9LlxuICAgICAgICBpZiAoIWN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuc29ydClcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBzb3J0ZXIgPSBuZXcgTWluaW1vbmdvLlNvcnRlcihjdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnNvcnQpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgLy8gWFhYIG1ha2UgYWxsIGNvbXBpbGF0aW9uIGVycm9ycyBNaW5pbW9uZ29FcnJvciBvciBzb21ldGhpbmdcbiAgICAgICAgICAvLyAgICAgc28gdGhhdCB0aGlzIGRvZXNuJ3QgaWdub3JlIHVucmVsYXRlZCBleGNlcHRpb25zXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XSwgZnVuY3Rpb24gKGYpIHsgcmV0dXJuIGYoKTsgfSk7ICAvLyBpbnZva2UgZWFjaCBmdW5jdGlvblxuXG4gICAgdmFyIGRyaXZlckNsYXNzID0gY2FuVXNlT3Bsb2cgPyBPcGxvZ09ic2VydmVEcml2ZXIgOiBQb2xsaW5nT2JzZXJ2ZURyaXZlcjtcbiAgICBvYnNlcnZlRHJpdmVyID0gbmV3IGRyaXZlckNsYXNzKHtcbiAgICAgIGN1cnNvckRlc2NyaXB0aW9uOiBjdXJzb3JEZXNjcmlwdGlvbixcbiAgICAgIG1vbmdvSGFuZGxlOiBzZWxmLFxuICAgICAgbXVsdGlwbGV4ZXI6IG11bHRpcGxleGVyLFxuICAgICAgb3JkZXJlZDogb3JkZXJlZCxcbiAgICAgIG1hdGNoZXI6IG1hdGNoZXIsICAvLyBpZ25vcmVkIGJ5IHBvbGxpbmdcbiAgICAgIHNvcnRlcjogc29ydGVyLCAgLy8gaWdub3JlZCBieSBwb2xsaW5nXG4gICAgICBfdGVzdE9ubHlQb2xsQ2FsbGJhY2s6IGNhbGxiYWNrcy5fdGVzdE9ubHlQb2xsQ2FsbGJhY2tcbiAgICB9KTtcblxuICAgIC8vIFRoaXMgZmllbGQgaXMgb25seSBzZXQgZm9yIHVzZSBpbiB0ZXN0cy5cbiAgICBtdWx0aXBsZXhlci5fb2JzZXJ2ZURyaXZlciA9IG9ic2VydmVEcml2ZXI7XG4gIH1cblxuICAvLyBCbG9ja3MgdW50aWwgdGhlIGluaXRpYWwgYWRkcyBoYXZlIGJlZW4gc2VudC5cbiAgbXVsdGlwbGV4ZXIuYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzKG9ic2VydmVIYW5kbGUpO1xuXG4gIHJldHVybiBvYnNlcnZlSGFuZGxlO1xufTtcblxuLy8gTGlzdGVuIGZvciB0aGUgaW52YWxpZGF0aW9uIG1lc3NhZ2VzIHRoYXQgd2lsbCB0cmlnZ2VyIHVzIHRvIHBvbGwgdGhlXG4vLyBkYXRhYmFzZSBmb3IgY2hhbmdlcy4gSWYgdGhpcyBzZWxlY3RvciBzcGVjaWZpZXMgc3BlY2lmaWMgSURzLCBzcGVjaWZ5IHRoZW1cbi8vIGhlcmUsIHNvIHRoYXQgdXBkYXRlcyB0byBkaWZmZXJlbnQgc3BlY2lmaWMgSURzIGRvbid0IGNhdXNlIHVzIHRvIHBvbGwuXG4vLyBsaXN0ZW5DYWxsYmFjayBpcyB0aGUgc2FtZSBraW5kIG9mIChub3RpZmljYXRpb24sIGNvbXBsZXRlKSBjYWxsYmFjayBwYXNzZWRcbi8vIHRvIEludmFsaWRhdGlvbkNyb3NzYmFyLmxpc3Rlbi5cblxubGlzdGVuQWxsID0gZnVuY3Rpb24gKGN1cnNvckRlc2NyaXB0aW9uLCBsaXN0ZW5DYWxsYmFjaykge1xuICB2YXIgbGlzdGVuZXJzID0gW107XG4gIGZvckVhY2hUcmlnZ2VyKGN1cnNvckRlc2NyaXB0aW9uLCBmdW5jdGlvbiAodHJpZ2dlcikge1xuICAgIGxpc3RlbmVycy5wdXNoKEREUFNlcnZlci5fSW52YWxpZGF0aW9uQ3Jvc3NiYXIubGlzdGVuKFxuICAgICAgdHJpZ2dlciwgbGlzdGVuQ2FsbGJhY2spKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBzdG9wOiBmdW5jdGlvbiAoKSB7XG4gICAgICBfLmVhY2gobGlzdGVuZXJzLCBmdW5jdGlvbiAobGlzdGVuZXIpIHtcbiAgICAgICAgbGlzdGVuZXIuc3RvcCgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufTtcblxuZm9yRWFjaFRyaWdnZXIgPSBmdW5jdGlvbiAoY3Vyc29yRGVzY3JpcHRpb24sIHRyaWdnZXJDYWxsYmFjaykge1xuICB2YXIga2V5ID0ge2NvbGxlY3Rpb246IGN1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lfTtcbiAgdmFyIHNwZWNpZmljSWRzID0gTG9jYWxDb2xsZWN0aW9uLl9pZHNNYXRjaGVkQnlTZWxlY3RvcihcbiAgICBjdXJzb3JEZXNjcmlwdGlvbi5zZWxlY3Rvcik7XG4gIGlmIChzcGVjaWZpY0lkcykge1xuICAgIF8uZWFjaChzcGVjaWZpY0lkcywgZnVuY3Rpb24gKGlkKSB7XG4gICAgICB0cmlnZ2VyQ2FsbGJhY2soXy5leHRlbmQoe2lkOiBpZH0sIGtleSkpO1xuICAgIH0pO1xuICAgIHRyaWdnZXJDYWxsYmFjayhfLmV4dGVuZCh7ZHJvcENvbGxlY3Rpb246IHRydWUsIGlkOiBudWxsfSwga2V5KSk7XG4gIH0gZWxzZSB7XG4gICAgdHJpZ2dlckNhbGxiYWNrKGtleSk7XG4gIH1cbiAgLy8gRXZlcnlvbmUgY2FyZXMgYWJvdXQgdGhlIGRhdGFiYXNlIGJlaW5nIGRyb3BwZWQuXG4gIHRyaWdnZXJDYWxsYmFjayh7IGRyb3BEYXRhYmFzZTogdHJ1ZSB9KTtcbn07XG5cbi8vIG9ic2VydmVDaGFuZ2VzIGZvciB0YWlsYWJsZSBjdXJzb3JzIG9uIGNhcHBlZCBjb2xsZWN0aW9ucy5cbi8vXG4vLyBTb21lIGRpZmZlcmVuY2VzIGZyb20gbm9ybWFsIGN1cnNvcnM6XG4vLyAgIC0gV2lsbCBuZXZlciBwcm9kdWNlIGFueXRoaW5nIG90aGVyIHRoYW4gJ2FkZGVkJyBvciAnYWRkZWRCZWZvcmUnLiBJZiB5b3Vcbi8vICAgICBkbyB1cGRhdGUgYSBkb2N1bWVudCB0aGF0IGhhcyBhbHJlYWR5IGJlZW4gcHJvZHVjZWQsIHRoaXMgd2lsbCBub3Qgbm90aWNlXG4vLyAgICAgaXQuXG4vLyAgIC0gSWYgeW91IGRpc2Nvbm5lY3QgYW5kIHJlY29ubmVjdCBmcm9tIE1vbmdvLCBpdCB3aWxsIGVzc2VudGlhbGx5IHJlc3RhcnRcbi8vICAgICB0aGUgcXVlcnksIHdoaWNoIHdpbGwgbGVhZCB0byBkdXBsaWNhdGUgcmVzdWx0cy4gVGhpcyBpcyBwcmV0dHkgYmFkLFxuLy8gICAgIGJ1dCBpZiB5b3UgaW5jbHVkZSBhIGZpZWxkIGNhbGxlZCAndHMnIHdoaWNoIGlzIGluc2VydGVkIGFzXG4vLyAgICAgbmV3IE1vbmdvSW50ZXJuYWxzLk1vbmdvVGltZXN0YW1wKDAsIDApICh3aGljaCBpcyBpbml0aWFsaXplZCB0byB0aGVcbi8vICAgICBjdXJyZW50IE1vbmdvLXN0eWxlIHRpbWVzdGFtcCksIHdlJ2xsIGJlIGFibGUgdG8gZmluZCB0aGUgcGxhY2UgdG9cbi8vICAgICByZXN0YXJ0IHByb3Blcmx5LiAoVGhpcyBmaWVsZCBpcyBzcGVjaWZpY2FsbHkgdW5kZXJzdG9vZCBieSBNb25nbyB3aXRoIGFuXG4vLyAgICAgb3B0aW1pemF0aW9uIHdoaWNoIGFsbG93cyBpdCB0byBmaW5kIHRoZSByaWdodCBwbGFjZSB0byBzdGFydCB3aXRob3V0XG4vLyAgICAgYW4gaW5kZXggb24gdHMuIEl0J3MgaG93IHRoZSBvcGxvZyB3b3Jrcy4pXG4vLyAgIC0gTm8gY2FsbGJhY2tzIGFyZSB0cmlnZ2VyZWQgc3luY2hyb25vdXNseSB3aXRoIHRoZSBjYWxsICh0aGVyZSdzIG5vXG4vLyAgICAgZGlmZmVyZW50aWF0aW9uIGJldHdlZW4gXCJpbml0aWFsIGRhdGFcIiBhbmQgXCJsYXRlciBjaGFuZ2VzXCI7IGV2ZXJ5dGhpbmdcbi8vICAgICB0aGF0IG1hdGNoZXMgdGhlIHF1ZXJ5IGdldHMgc2VudCBhc3luY2hyb25vdXNseSkuXG4vLyAgIC0gRGUtZHVwbGljYXRpb24gaXMgbm90IGltcGxlbWVudGVkLlxuLy8gICAtIERvZXMgbm90IHlldCBpbnRlcmFjdCB3aXRoIHRoZSB3cml0ZSBmZW5jZS4gUHJvYmFibHksIHRoaXMgc2hvdWxkIHdvcmsgYnlcbi8vICAgICBpZ25vcmluZyByZW1vdmVzICh3aGljaCBkb24ndCB3b3JrIG9uIGNhcHBlZCBjb2xsZWN0aW9ucykgYW5kIHVwZGF0ZXNcbi8vICAgICAod2hpY2ggZG9uJ3QgYWZmZWN0IHRhaWxhYmxlIGN1cnNvcnMpLCBhbmQganVzdCBrZWVwaW5nIHRyYWNrIG9mIHRoZSBJRFxuLy8gICAgIG9mIHRoZSBpbnNlcnRlZCBvYmplY3QsIGFuZCBjbG9zaW5nIHRoZSB3cml0ZSBmZW5jZSBvbmNlIHlvdSBnZXQgdG8gdGhhdFxuLy8gICAgIElEIChvciB0aW1lc3RhbXA/KS4gIFRoaXMgZG9lc24ndCB3b3JrIHdlbGwgaWYgdGhlIGRvY3VtZW50IGRvZXNuJ3QgbWF0Y2hcbi8vICAgICB0aGUgcXVlcnksIHRob3VnaC4gIE9uIHRoZSBvdGhlciBoYW5kLCB0aGUgd3JpdGUgZmVuY2UgY2FuIGNsb3NlXG4vLyAgICAgaW1tZWRpYXRlbHkgaWYgaXQgZG9lcyBub3QgbWF0Y2ggdGhlIHF1ZXJ5LiBTbyBpZiB3ZSB0cnVzdCBtaW5pbW9uZ29cbi8vICAgICBlbm91Z2ggdG8gYWNjdXJhdGVseSBldmFsdWF0ZSB0aGUgcXVlcnkgYWdhaW5zdCB0aGUgd3JpdGUgZmVuY2UsIHdlXG4vLyAgICAgc2hvdWxkIGJlIGFibGUgdG8gZG8gdGhpcy4uLiAgT2YgY291cnNlLCBtaW5pbW9uZ28gZG9lc24ndCBldmVuIHN1cHBvcnRcbi8vICAgICBNb25nbyBUaW1lc3RhbXBzIHlldC5cbk1vbmdvQ29ubmVjdGlvbi5wcm90b3R5cGUuX29ic2VydmVDaGFuZ2VzVGFpbGFibGUgPSBmdW5jdGlvbiAoXG4gICAgY3Vyc29yRGVzY3JpcHRpb24sIG9yZGVyZWQsIGNhbGxiYWNrcykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgLy8gVGFpbGFibGUgY3Vyc29ycyBvbmx5IGV2ZXIgY2FsbCBhZGRlZC9hZGRlZEJlZm9yZSBjYWxsYmFja3MsIHNvIGl0J3MgYW5cbiAgLy8gZXJyb3IgaWYgeW91IGRpZG4ndCBwcm92aWRlIHRoZW0uXG4gIGlmICgob3JkZXJlZCAmJiAhY2FsbGJhY2tzLmFkZGVkQmVmb3JlKSB8fFxuICAgICAgKCFvcmRlcmVkICYmICFjYWxsYmFja3MuYWRkZWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3Qgb2JzZXJ2ZSBhbiBcIiArIChvcmRlcmVkID8gXCJvcmRlcmVkXCIgOiBcInVub3JkZXJlZFwiKVxuICAgICAgICAgICAgICAgICAgICArIFwiIHRhaWxhYmxlIGN1cnNvciB3aXRob3V0IGEgXCJcbiAgICAgICAgICAgICAgICAgICAgKyAob3JkZXJlZCA/IFwiYWRkZWRCZWZvcmVcIiA6IFwiYWRkZWRcIikgKyBcIiBjYWxsYmFja1wiKTtcbiAgfVxuXG4gIHJldHVybiBzZWxmLnRhaWwoY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uIChkb2MpIHtcbiAgICB2YXIgaWQgPSBkb2MuX2lkO1xuICAgIGRlbGV0ZSBkb2MuX2lkO1xuICAgIC8vIFRoZSB0cyBpcyBhbiBpbXBsZW1lbnRhdGlvbiBkZXRhaWwuIEhpZGUgaXQuXG4gICAgZGVsZXRlIGRvYy50cztcbiAgICBpZiAob3JkZXJlZCkge1xuICAgICAgY2FsbGJhY2tzLmFkZGVkQmVmb3JlKGlkLCBkb2MsIG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjYWxsYmFja3MuYWRkZWQoaWQsIGRvYyk7XG4gICAgfVxuICB9KTtcbn07XG5cbi8vIFhYWCBXZSBwcm9iYWJseSBuZWVkIHRvIGZpbmQgYSBiZXR0ZXIgd2F5IHRvIGV4cG9zZSB0aGlzLiBSaWdodCBub3dcbi8vIGl0J3Mgb25seSB1c2VkIGJ5IHRlc3RzLCBidXQgaW4gZmFjdCB5b3UgbmVlZCBpdCBpbiBub3JtYWxcbi8vIG9wZXJhdGlvbiB0byBpbnRlcmFjdCB3aXRoIGNhcHBlZCBjb2xsZWN0aW9ucy5cbk1vbmdvSW50ZXJuYWxzLk1vbmdvVGltZXN0YW1wID0gTW9uZ29EQi5UaW1lc3RhbXA7XG5cbk1vbmdvSW50ZXJuYWxzLkNvbm5lY3Rpb24gPSBNb25nb0Nvbm5lY3Rpb247XG4iLCJ2YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxuaW1wb3J0IHsgTnBtTW9kdWxlTW9uZ29kYiB9IGZyb20gXCJtZXRlb3IvbnBtLW1vbmdvXCI7XG5jb25zdCB7IExvbmcgfSA9IE5wbU1vZHVsZU1vbmdvZGI7XG5cbk9QTE9HX0NPTExFQ1RJT04gPSAnb3Bsb2cucnMnO1xuXG52YXIgVE9PX0ZBUl9CRUhJTkQgPSBwcm9jZXNzLmVudi5NRVRFT1JfT1BMT0dfVE9PX0ZBUl9CRUhJTkQgfHwgMjAwMDtcbnZhciBUQUlMX1RJTUVPVVQgPSArcHJvY2Vzcy5lbnYuTUVURU9SX09QTE9HX1RBSUxfVElNRU9VVCB8fCAzMDAwMDtcblxudmFyIHNob3dUUyA9IGZ1bmN0aW9uICh0cykge1xuICByZXR1cm4gXCJUaW1lc3RhbXAoXCIgKyB0cy5nZXRIaWdoQml0cygpICsgXCIsIFwiICsgdHMuZ2V0TG93Qml0cygpICsgXCIpXCI7XG59O1xuXG5pZEZvck9wID0gZnVuY3Rpb24gKG9wKSB7XG4gIGlmIChvcC5vcCA9PT0gJ2QnKVxuICAgIHJldHVybiBvcC5vLl9pZDtcbiAgZWxzZSBpZiAob3Aub3AgPT09ICdpJylcbiAgICByZXR1cm4gb3Auby5faWQ7XG4gIGVsc2UgaWYgKG9wLm9wID09PSAndScpXG4gICAgcmV0dXJuIG9wLm8yLl9pZDtcbiAgZWxzZSBpZiAob3Aub3AgPT09ICdjJylcbiAgICB0aHJvdyBFcnJvcihcIk9wZXJhdG9yICdjJyBkb2Vzbid0IHN1cHBseSBhbiBvYmplY3Qgd2l0aCBpZDogXCIgK1xuICAgICAgICAgICAgICAgIEVKU09OLnN0cmluZ2lmeShvcCkpO1xuICBlbHNlXG4gICAgdGhyb3cgRXJyb3IoXCJVbmtub3duIG9wOiBcIiArIEVKU09OLnN0cmluZ2lmeShvcCkpO1xufTtcblxuT3Bsb2dIYW5kbGUgPSBmdW5jdGlvbiAob3Bsb2dVcmwsIGRiTmFtZSkge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHNlbGYuX29wbG9nVXJsID0gb3Bsb2dVcmw7XG4gIHNlbGYuX2RiTmFtZSA9IGRiTmFtZTtcblxuICBzZWxmLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24gPSBudWxsO1xuICBzZWxmLl9vcGxvZ1RhaWxDb25uZWN0aW9uID0gbnVsbDtcbiAgc2VsZi5fc3RvcHBlZCA9IGZhbHNlO1xuICBzZWxmLl90YWlsSGFuZGxlID0gbnVsbDtcbiAgc2VsZi5fcmVhZHlGdXR1cmUgPSBuZXcgRnV0dXJlKCk7XG4gIHNlbGYuX2Nyb3NzYmFyID0gbmV3IEREUFNlcnZlci5fQ3Jvc3NiYXIoe1xuICAgIGZhY3RQYWNrYWdlOiBcIm1vbmdvLWxpdmVkYXRhXCIsIGZhY3ROYW1lOiBcIm9wbG9nLXdhdGNoZXJzXCJcbiAgfSk7XG4gIHNlbGYuX2Jhc2VPcGxvZ1NlbGVjdG9yID0ge1xuICAgIG5zOiBuZXcgUmVnRXhwKFwiXig/OlwiICsgW1xuICAgICAgTWV0ZW9yLl9lc2NhcGVSZWdFeHAoc2VsZi5fZGJOYW1lICsgXCIuXCIpLFxuICAgICAgTWV0ZW9yLl9lc2NhcGVSZWdFeHAoXCJhZG1pbi4kY21kXCIpLFxuICAgIF0uam9pbihcInxcIikgKyBcIilcIiksXG5cbiAgICAkb3I6IFtcbiAgICAgIHsgb3A6IHsgJGluOiBbJ2knLCAndScsICdkJ10gfSB9LFxuICAgICAgLy8gZHJvcCBjb2xsZWN0aW9uXG4gICAgICB7IG9wOiAnYycsICdvLmRyb3AnOiB7ICRleGlzdHM6IHRydWUgfSB9LFxuICAgICAgeyBvcDogJ2MnLCAnby5kcm9wRGF0YWJhc2UnOiAxIH0sXG4gICAgICB7IG9wOiAnYycsICdvLmFwcGx5T3BzJzogeyAkZXhpc3RzOiB0cnVlIH0gfSxcbiAgICBdXG4gIH07XG5cbiAgLy8gRGF0YSBzdHJ1Y3R1cmVzIHRvIHN1cHBvcnQgd2FpdFVudGlsQ2F1Z2h0VXAoKS4gRWFjaCBvcGxvZyBlbnRyeSBoYXMgYVxuICAvLyBNb25nb1RpbWVzdGFtcCBvYmplY3Qgb24gaXQgKHdoaWNoIGlzIG5vdCB0aGUgc2FtZSBhcyBhIERhdGUgLS0tIGl0J3MgYVxuICAvLyBjb21iaW5hdGlvbiBvZiB0aW1lIGFuZCBhbiBpbmNyZW1lbnRpbmcgY291bnRlcjsgc2VlXG4gIC8vIGh0dHA6Ly9kb2NzLm1vbmdvZGIub3JnL21hbnVhbC9yZWZlcmVuY2UvYnNvbi10eXBlcy8jdGltZXN0YW1wcykuXG4gIC8vXG4gIC8vIF9jYXRjaGluZ1VwRnV0dXJlcyBpcyBhbiBhcnJheSBvZiB7dHM6IE1vbmdvVGltZXN0YW1wLCBmdXR1cmU6IEZ1dHVyZX1cbiAgLy8gb2JqZWN0cywgc29ydGVkIGJ5IGFzY2VuZGluZyB0aW1lc3RhbXAuIF9sYXN0UHJvY2Vzc2VkVFMgaXMgdGhlXG4gIC8vIE1vbmdvVGltZXN0YW1wIG9mIHRoZSBsYXN0IG9wbG9nIGVudHJ5IHdlJ3ZlIHByb2Nlc3NlZC5cbiAgLy9cbiAgLy8gRWFjaCB0aW1lIHdlIGNhbGwgd2FpdFVudGlsQ2F1Z2h0VXAsIHdlIHRha2UgYSBwZWVrIGF0IHRoZSBmaW5hbCBvcGxvZ1xuICAvLyBlbnRyeSBpbiB0aGUgZGIuICBJZiB3ZSd2ZSBhbHJlYWR5IHByb2Nlc3NlZCBpdCAoaWUsIGl0IGlzIG5vdCBncmVhdGVyIHRoYW5cbiAgLy8gX2xhc3RQcm9jZXNzZWRUUyksIHdhaXRVbnRpbENhdWdodFVwIGltbWVkaWF0ZWx5IHJldHVybnMuIE90aGVyd2lzZSxcbiAgLy8gd2FpdFVudGlsQ2F1Z2h0VXAgbWFrZXMgYSBuZXcgRnV0dXJlIGFuZCBpbnNlcnRzIGl0IGFsb25nIHdpdGggdGhlIGZpbmFsXG4gIC8vIHRpbWVzdGFtcCBlbnRyeSB0aGF0IGl0IHJlYWQsIGludG8gX2NhdGNoaW5nVXBGdXR1cmVzLiB3YWl0VW50aWxDYXVnaHRVcFxuICAvLyB0aGVuIHdhaXRzIG9uIHRoYXQgZnV0dXJlLCB3aGljaCBpcyByZXNvbHZlZCBvbmNlIF9sYXN0UHJvY2Vzc2VkVFMgaXNcbiAgLy8gaW5jcmVtZW50ZWQgdG8gYmUgcGFzdCBpdHMgdGltZXN0YW1wIGJ5IHRoZSB3b3JrZXIgZmliZXIuXG4gIC8vXG4gIC8vIFhYWCB1c2UgYSBwcmlvcml0eSBxdWV1ZSBvciBzb21ldGhpbmcgZWxzZSB0aGF0J3MgZmFzdGVyIHRoYW4gYW4gYXJyYXlcbiAgc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXMgPSBbXTtcbiAgc2VsZi5fbGFzdFByb2Nlc3NlZFRTID0gbnVsbDtcblxuICBzZWxmLl9vblNraXBwZWRFbnRyaWVzSG9vayA9IG5ldyBIb29rKHtcbiAgICBkZWJ1Z1ByaW50RXhjZXB0aW9uczogXCJvblNraXBwZWRFbnRyaWVzIGNhbGxiYWNrXCJcbiAgfSk7XG5cbiAgc2VsZi5fZW50cnlRdWV1ZSA9IG5ldyBNZXRlb3IuX0RvdWJsZUVuZGVkUXVldWUoKTtcbiAgc2VsZi5fd29ya2VyQWN0aXZlID0gZmFsc2U7XG5cbiAgc2VsZi5fc3RhcnRUYWlsaW5nKCk7XG59O1xuXG5fLmV4dGVuZChPcGxvZ0hhbmRsZS5wcm90b3R5cGUsIHtcbiAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcbiAgICBzZWxmLl9zdG9wcGVkID0gdHJ1ZTtcbiAgICBpZiAoc2VsZi5fdGFpbEhhbmRsZSlcbiAgICAgIHNlbGYuX3RhaWxIYW5kbGUuc3RvcCgpO1xuICAgIC8vIFhYWCBzaG91bGQgY2xvc2UgY29ubmVjdGlvbnMgdG9vXG4gIH0sXG4gIG9uT3Bsb2dFbnRyeTogZnVuY3Rpb24gKHRyaWdnZXIsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FsbGVkIG9uT3Bsb2dFbnRyeSBvbiBzdG9wcGVkIGhhbmRsZSFcIik7XG5cbiAgICAvLyBDYWxsaW5nIG9uT3Bsb2dFbnRyeSByZXF1aXJlcyB1cyB0byB3YWl0IGZvciB0aGUgdGFpbGluZyB0byBiZSByZWFkeS5cbiAgICBzZWxmLl9yZWFkeUZ1dHVyZS53YWl0KCk7XG5cbiAgICB2YXIgb3JpZ2luYWxDYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIGNhbGxiYWNrID0gTWV0ZW9yLmJpbmRFbnZpcm9ubWVudChmdW5jdGlvbiAobm90aWZpY2F0aW9uKSB7XG4gICAgICBvcmlnaW5hbENhbGxiYWNrKG5vdGlmaWNhdGlvbik7XG4gICAgfSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIkVycm9yIGluIG9wbG9nIGNhbGxiYWNrXCIsIGVycik7XG4gICAgfSk7XG4gICAgdmFyIGxpc3RlbkhhbmRsZSA9IHNlbGYuX2Nyb3NzYmFyLmxpc3Rlbih0cmlnZ2VyLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbGlzdGVuSGFuZGxlLnN0b3AoKTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuICAvLyBSZWdpc3RlciBhIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgYW55IHRpbWUgd2Ugc2tpcCBvcGxvZyBlbnRyaWVzIChlZyxcbiAgLy8gYmVjYXVzZSB3ZSBhcmUgdG9vIGZhciBiZWhpbmQpLlxuICBvblNraXBwZWRFbnRyaWVzOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYWxsZWQgb25Ta2lwcGVkRW50cmllcyBvbiBzdG9wcGVkIGhhbmRsZSFcIik7XG4gICAgcmV0dXJuIHNlbGYuX29uU2tpcHBlZEVudHJpZXNIb29rLnJlZ2lzdGVyKGNhbGxiYWNrKTtcbiAgfSxcbiAgLy8gQ2FsbHMgYGNhbGxiYWNrYCBvbmNlIHRoZSBvcGxvZyBoYXMgYmVlbiBwcm9jZXNzZWQgdXAgdG8gYSBwb2ludCB0aGF0IGlzXG4gIC8vIHJvdWdobHkgXCJub3dcIjogc3BlY2lmaWNhbGx5LCBvbmNlIHdlJ3ZlIHByb2Nlc3NlZCBhbGwgb3BzIHRoYXQgYXJlXG4gIC8vIGN1cnJlbnRseSB2aXNpYmxlLlxuICAvLyBYWFggYmVjb21lIGNvbnZpbmNlZCB0aGF0IHRoaXMgaXMgYWN0dWFsbHkgc2FmZSBldmVuIGlmIG9wbG9nQ29ubmVjdGlvblxuICAvLyBpcyBzb21lIGtpbmQgb2YgcG9vbFxuICB3YWl0VW50aWxDYXVnaHRVcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbGxlZCB3YWl0VW50aWxDYXVnaHRVcCBvbiBzdG9wcGVkIGhhbmRsZSFcIik7XG5cbiAgICAvLyBDYWxsaW5nIHdhaXRVbnRpbENhdWdodFVwIHJlcXVyaWVzIHVzIHRvIHdhaXQgZm9yIHRoZSBvcGxvZyBjb25uZWN0aW9uIHRvXG4gICAgLy8gYmUgcmVhZHkuXG4gICAgc2VsZi5fcmVhZHlGdXR1cmUud2FpdCgpO1xuICAgIHZhciBsYXN0RW50cnk7XG5cbiAgICB3aGlsZSAoIXNlbGYuX3N0b3BwZWQpIHtcbiAgICAgIC8vIFdlIG5lZWQgdG8gbWFrZSB0aGUgc2VsZWN0b3IgYXQgbGVhc3QgYXMgcmVzdHJpY3RpdmUgYXMgdGhlIGFjdHVhbFxuICAgICAgLy8gdGFpbGluZyBzZWxlY3RvciAoaWUsIHdlIG5lZWQgdG8gc3BlY2lmeSB0aGUgREIgbmFtZSkgb3IgZWxzZSB3ZSBtaWdodFxuICAgICAgLy8gZmluZCBhIFRTIHRoYXQgd29uJ3Qgc2hvdyB1cCBpbiB0aGUgYWN0dWFsIHRhaWwgc3RyZWFtLlxuICAgICAgdHJ5IHtcbiAgICAgICAgbGFzdEVudHJ5ID0gc2VsZi5fb3Bsb2dMYXN0RW50cnlDb25uZWN0aW9uLmZpbmRPbmUoXG4gICAgICAgICAgT1BMT0dfQ09MTEVDVElPTiwgc2VsZi5fYmFzZU9wbG9nU2VsZWN0b3IsXG4gICAgICAgICAge2ZpZWxkczoge3RzOiAxfSwgc29ydDogeyRuYXR1cmFsOiAtMX19KTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIER1cmluZyBmYWlsb3ZlciAoZWcpIGlmIHdlIGdldCBhbiBleGNlcHRpb24gd2Ugc2hvdWxkIGxvZyBhbmQgcmV0cnlcbiAgICAgICAgLy8gaW5zdGVhZCBvZiBjcmFzaGluZy5cbiAgICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIkdvdCBleGNlcHRpb24gd2hpbGUgcmVhZGluZyBsYXN0IGVudHJ5XCIsIGUpO1xuICAgICAgICBNZXRlb3IuX3NsZWVwRm9yTXMoMTAwKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcblxuICAgIGlmICghbGFzdEVudHJ5KSB7XG4gICAgICAvLyBSZWFsbHksIG5vdGhpbmcgaW4gdGhlIG9wbG9nPyBXZWxsLCB3ZSd2ZSBwcm9jZXNzZWQgZXZlcnl0aGluZy5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgdHMgPSBsYXN0RW50cnkudHM7XG4gICAgaWYgKCF0cylcbiAgICAgIHRocm93IEVycm9yKFwib3Bsb2cgZW50cnkgd2l0aG91dCB0czogXCIgKyBFSlNPTi5zdHJpbmdpZnkobGFzdEVudHJ5KSk7XG5cbiAgICBpZiAoc2VsZi5fbGFzdFByb2Nlc3NlZFRTICYmIHRzLmxlc3NUaGFuT3JFcXVhbChzZWxmLl9sYXN0UHJvY2Vzc2VkVFMpKSB7XG4gICAgICAvLyBXZSd2ZSBhbHJlYWR5IGNhdWdodCB1cCB0byBoZXJlLlxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuXG4gICAgLy8gSW5zZXJ0IHRoZSBmdXR1cmUgaW50byBvdXIgbGlzdC4gQWxtb3N0IGFsd2F5cywgdGhpcyB3aWxsIGJlIGF0IHRoZSBlbmQsXG4gICAgLy8gYnV0IGl0J3MgY29uY2VpdmFibGUgdGhhdCBpZiB3ZSBmYWlsIG92ZXIgZnJvbSBvbmUgcHJpbWFyeSB0byBhbm90aGVyLFxuICAgIC8vIHRoZSBvcGxvZyBlbnRyaWVzIHdlIHNlZSB3aWxsIGdvIGJhY2t3YXJkcy5cbiAgICB2YXIgaW5zZXJ0QWZ0ZXIgPSBzZWxmLl9jYXRjaGluZ1VwRnV0dXJlcy5sZW5ndGg7XG4gICAgd2hpbGUgKGluc2VydEFmdGVyIC0gMSA+IDAgJiYgc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXNbaW5zZXJ0QWZ0ZXIgLSAxXS50cy5ncmVhdGVyVGhhbih0cykpIHtcbiAgICAgIGluc2VydEFmdGVyLS07XG4gICAgfVxuICAgIHZhciBmID0gbmV3IEZ1dHVyZTtcbiAgICBzZWxmLl9jYXRjaGluZ1VwRnV0dXJlcy5zcGxpY2UoaW5zZXJ0QWZ0ZXIsIDAsIHt0czogdHMsIGZ1dHVyZTogZn0pO1xuICAgIGYud2FpdCgpO1xuICB9LFxuICBfc3RhcnRUYWlsaW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIEZpcnN0LCBtYWtlIHN1cmUgdGhhdCB3ZSdyZSB0YWxraW5nIHRvIHRoZSBsb2NhbCBkYXRhYmFzZS5cbiAgICB2YXIgbW9uZ29kYlVyaSA9IE5wbS5yZXF1aXJlKCdtb25nb2RiLXVyaScpO1xuICAgIGlmIChtb25nb2RiVXJpLnBhcnNlKHNlbGYuX29wbG9nVXJsKS5kYXRhYmFzZSAhPT0gJ2xvY2FsJykge1xuICAgICAgdGhyb3cgRXJyb3IoXCIkTU9OR09fT1BMT0dfVVJMIG11c3QgYmUgc2V0IHRvIHRoZSAnbG9jYWwnIGRhdGFiYXNlIG9mIFwiICtcbiAgICAgICAgICAgICAgICAgIFwiYSBNb25nbyByZXBsaWNhIHNldFwiKTtcbiAgICB9XG5cbiAgICAvLyBXZSBtYWtlIHR3byBzZXBhcmF0ZSBjb25uZWN0aW9ucyB0byBNb25nby4gVGhlIE5vZGUgTW9uZ28gZHJpdmVyXG4gICAgLy8gaW1wbGVtZW50cyBhIG5haXZlIHJvdW5kLXJvYmluIGNvbm5lY3Rpb24gcG9vbDogZWFjaCBcImNvbm5lY3Rpb25cIiBpcyBhXG4gICAgLy8gcG9vbCBvZiBzZXZlcmFsICg1IGJ5IGRlZmF1bHQpIFRDUCBjb25uZWN0aW9ucywgYW5kIGVhY2ggcmVxdWVzdCBpc1xuICAgIC8vIHJvdGF0ZWQgdGhyb3VnaCB0aGUgcG9vbHMuIFRhaWxhYmxlIGN1cnNvciBxdWVyaWVzIGJsb2NrIG9uIHRoZSBzZXJ2ZXJcbiAgICAvLyB1bnRpbCB0aGVyZSBpcyBzb21lIGRhdGEgdG8gcmV0dXJuIChvciB1bnRpbCBhIGZldyBzZWNvbmRzIGhhdmVcbiAgICAvLyBwYXNzZWQpLiBTbyBpZiB0aGUgY29ubmVjdGlvbiBwb29sIHVzZWQgZm9yIHRhaWxpbmcgY3Vyc29ycyBpcyB0aGUgc2FtZVxuICAgIC8vIHBvb2wgdXNlZCBmb3Igb3RoZXIgcXVlcmllcywgdGhlIG90aGVyIHF1ZXJpZXMgd2lsbCBiZSBkZWxheWVkIGJ5IHNlY29uZHNcbiAgICAvLyAxLzUgb2YgdGhlIHRpbWUuXG4gICAgLy9cbiAgICAvLyBUaGUgdGFpbCBjb25uZWN0aW9uIHdpbGwgb25seSBldmVyIGJlIHJ1bm5pbmcgYSBzaW5nbGUgdGFpbCBjb21tYW5kLCBzb1xuICAgIC8vIGl0IG9ubHkgbmVlZHMgdG8gbWFrZSBvbmUgdW5kZXJseWluZyBUQ1AgY29ubmVjdGlvbi5cbiAgICBzZWxmLl9vcGxvZ1RhaWxDb25uZWN0aW9uID0gbmV3IE1vbmdvQ29ubmVjdGlvbihcbiAgICAgIHNlbGYuX29wbG9nVXJsLCB7cG9vbFNpemU6IDF9KTtcbiAgICAvLyBYWFggYmV0dGVyIGRvY3MsIGJ1dDogaXQncyB0byBnZXQgbW9ub3RvbmljIHJlc3VsdHNcbiAgICAvLyBYWFggaXMgaXQgc2FmZSB0byBzYXkgXCJpZiB0aGVyZSdzIGFuIGluIGZsaWdodCBxdWVyeSwganVzdCB1c2UgaXRzXG4gICAgLy8gICAgIHJlc3VsdHNcIj8gSSBkb24ndCB0aGluayBzbyBidXQgc2hvdWxkIGNvbnNpZGVyIHRoYXRcbiAgICBzZWxmLl9vcGxvZ0xhc3RFbnRyeUNvbm5lY3Rpb24gPSBuZXcgTW9uZ29Db25uZWN0aW9uKFxuICAgICAgc2VsZi5fb3Bsb2dVcmwsIHtwb29sU2l6ZTogMX0pO1xuXG4gICAgLy8gTm93LCBtYWtlIHN1cmUgdGhhdCB0aGVyZSBhY3R1YWxseSBpcyBhIHJlcGwgc2V0IGhlcmUuIElmIG5vdCwgb3Bsb2dcbiAgICAvLyB0YWlsaW5nIHdvbid0IGV2ZXIgZmluZCBhbnl0aGluZyFcbiAgICAvLyBNb3JlIG9uIHRoZSBpc01hc3RlckRvY1xuICAgIC8vIGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvcmVmZXJlbmNlL2NvbW1hbmQvaXNNYXN0ZXIvXG4gICAgdmFyIGYgPSBuZXcgRnV0dXJlO1xuICAgIHNlbGYuX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbi5kYi5hZG1pbigpLmNvbW1hbmQoXG4gICAgICB7IGlzbWFzdGVyOiAxIH0sIGYucmVzb2x2ZXIoKSk7XG4gICAgdmFyIGlzTWFzdGVyRG9jID0gZi53YWl0KCk7XG5cbiAgICBpZiAoIShpc01hc3RlckRvYyAmJiBpc01hc3RlckRvYy5zZXROYW1lKSkge1xuICAgICAgdGhyb3cgRXJyb3IoXCIkTU9OR09fT1BMT0dfVVJMIG11c3QgYmUgc2V0IHRvIHRoZSAnbG9jYWwnIGRhdGFiYXNlIG9mIFwiICtcbiAgICAgICAgICAgICAgICAgIFwiYSBNb25nbyByZXBsaWNhIHNldFwiKTtcbiAgICB9XG5cbiAgICAvLyBGaW5kIHRoZSBsYXN0IG9wbG9nIGVudHJ5LlxuICAgIHZhciBsYXN0T3Bsb2dFbnRyeSA9IHNlbGYuX29wbG9nTGFzdEVudHJ5Q29ubmVjdGlvbi5maW5kT25lKFxuICAgICAgT1BMT0dfQ09MTEVDVElPTiwge30sIHtzb3J0OiB7JG5hdHVyYWw6IC0xfSwgZmllbGRzOiB7dHM6IDF9fSk7XG5cbiAgICB2YXIgb3Bsb2dTZWxlY3RvciA9IF8uY2xvbmUoc2VsZi5fYmFzZU9wbG9nU2VsZWN0b3IpO1xuICAgIGlmIChsYXN0T3Bsb2dFbnRyeSkge1xuICAgICAgLy8gU3RhcnQgYWZ0ZXIgdGhlIGxhc3QgZW50cnkgdGhhdCBjdXJyZW50bHkgZXhpc3RzLlxuICAgICAgb3Bsb2dTZWxlY3Rvci50cyA9IHskZ3Q6IGxhc3RPcGxvZ0VudHJ5LnRzfTtcbiAgICAgIC8vIElmIHRoZXJlIGFyZSBhbnkgY2FsbHMgdG8gY2FsbFdoZW5Qcm9jZXNzZWRMYXRlc3QgYmVmb3JlIGFueSBvdGhlclxuICAgICAgLy8gb3Bsb2cgZW50cmllcyBzaG93IHVwLCBhbGxvdyBjYWxsV2hlblByb2Nlc3NlZExhdGVzdCB0byBjYWxsIGl0c1xuICAgICAgLy8gY2FsbGJhY2sgaW1tZWRpYXRlbHkuXG4gICAgICBzZWxmLl9sYXN0UHJvY2Vzc2VkVFMgPSBsYXN0T3Bsb2dFbnRyeS50cztcbiAgICB9XG5cbiAgICB2YXIgY3Vyc29yRGVzY3JpcHRpb24gPSBuZXcgQ3Vyc29yRGVzY3JpcHRpb24oXG4gICAgICBPUExPR19DT0xMRUNUSU9OLCBvcGxvZ1NlbGVjdG9yLCB7dGFpbGFibGU6IHRydWV9KTtcblxuICAgIC8vIFN0YXJ0IHRhaWxpbmcgdGhlIG9wbG9nLlxuICAgIC8vXG4gICAgLy8gV2UgcmVzdGFydCB0aGUgbG93LWxldmVsIG9wbG9nIHF1ZXJ5IGV2ZXJ5IDMwIHNlY29uZHMgaWYgd2UgZGlkbid0IGdldCBhXG4gICAgLy8gZG9jLiBUaGlzIGlzIGEgd29ya2Fyb3VuZCBmb3IgIzg1OTg6IHRoZSBOb2RlIE1vbmdvIGRyaXZlciBoYXMgYXQgbGVhc3RcbiAgICAvLyBvbmUgYnVnIHRoYXQgY2FuIGxlYWQgdG8gcXVlcnkgY2FsbGJhY2tzIG5ldmVyIGdldHRpbmcgY2FsbGVkIChldmVuIHdpdGhcbiAgICAvLyBhbiBlcnJvcikgd2hlbiBsZWFkZXJzaGlwIGZhaWxvdmVyIG9jY3VyLlxuICAgIHNlbGYuX3RhaWxIYW5kbGUgPSBzZWxmLl9vcGxvZ1RhaWxDb25uZWN0aW9uLnRhaWwoXG4gICAgICBjdXJzb3JEZXNjcmlwdGlvbixcbiAgICAgIGZ1bmN0aW9uIChkb2MpIHtcbiAgICAgICAgc2VsZi5fZW50cnlRdWV1ZS5wdXNoKGRvYyk7XG4gICAgICAgIHNlbGYuX21heWJlU3RhcnRXb3JrZXIoKTtcbiAgICAgIH0sXG4gICAgICBUQUlMX1RJTUVPVVRcbiAgICApO1xuICAgIHNlbGYuX3JlYWR5RnV0dXJlLnJldHVybigpO1xuICB9LFxuXG4gIF9tYXliZVN0YXJ0V29ya2VyOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl93b3JrZXJBY3RpdmUpIHJldHVybjtcbiAgICBzZWxmLl93b3JrZXJBY3RpdmUgPSB0cnVlO1xuXG4gICAgTWV0ZW9yLmRlZmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIE1heSBiZSBjYWxsZWQgcmVjdXJzaXZlbHkgaW4gY2FzZSBvZiB0cmFuc2FjdGlvbnMuXG4gICAgICBmdW5jdGlvbiBoYW5kbGVEb2MoZG9jKSB7XG4gICAgICAgIGlmIChkb2MubnMgPT09IFwiYWRtaW4uJGNtZFwiKSB7XG4gICAgICAgICAgaWYgKGRvYy5vLmFwcGx5T3BzKSB7XG4gICAgICAgICAgICAvLyBUaGlzIHdhcyBhIHN1Y2Nlc3NmdWwgdHJhbnNhY3Rpb24sIHNvIHdlIG5lZWQgdG8gYXBwbHkgdGhlXG4gICAgICAgICAgICAvLyBvcGVyYXRpb25zIHRoYXQgd2VyZSBpbnZvbHZlZC5cbiAgICAgICAgICAgIGxldCBuZXh0VGltZXN0YW1wID0gZG9jLnRzO1xuICAgICAgICAgICAgZG9jLm8uYXBwbHlPcHMuZm9yRWFjaChvcCA9PiB7XG4gICAgICAgICAgICAgIC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9pc3N1ZXMvMTA0MjAuXG4gICAgICAgICAgICAgIGlmICghb3AudHMpIHtcbiAgICAgICAgICAgICAgICBvcC50cyA9IG5leHRUaW1lc3RhbXA7XG4gICAgICAgICAgICAgICAgbmV4dFRpbWVzdGFtcCA9IG5leHRUaW1lc3RhbXAuYWRkKExvbmcuT05FKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBoYW5kbGVEb2Mob3ApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIlVua25vd24gY29tbWFuZCBcIiArIEVKU09OLnN0cmluZ2lmeShkb2MpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRyaWdnZXIgPSB7XG4gICAgICAgICAgZHJvcENvbGxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgIGRyb3BEYXRhYmFzZTogZmFsc2UsXG4gICAgICAgICAgb3A6IGRvYyxcbiAgICAgICAgfTtcblxuICAgICAgICBpZiAodHlwZW9mIGRvYy5ucyA9PT0gXCJzdHJpbmdcIiAmJlxuICAgICAgICAgICAgZG9jLm5zLnN0YXJ0c1dpdGgoc2VsZi5fZGJOYW1lICsgXCIuXCIpKSB7XG4gICAgICAgICAgdHJpZ2dlci5jb2xsZWN0aW9uID0gZG9jLm5zLnNsaWNlKHNlbGYuX2RiTmFtZS5sZW5ndGggKyAxKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElzIGl0IGEgc3BlY2lhbCBjb21tYW5kIGFuZCB0aGUgY29sbGVjdGlvbiBuYW1lIGlzIGhpZGRlblxuICAgICAgICAvLyBzb21ld2hlcmUgaW4gb3BlcmF0b3I/XG4gICAgICAgIGlmICh0cmlnZ2VyLmNvbGxlY3Rpb24gPT09IFwiJGNtZFwiKSB7XG4gICAgICAgICAgaWYgKGRvYy5vLmRyb3BEYXRhYmFzZSkge1xuICAgICAgICAgICAgZGVsZXRlIHRyaWdnZXIuY29sbGVjdGlvbjtcbiAgICAgICAgICAgIHRyaWdnZXIuZHJvcERhdGFiYXNlID0gdHJ1ZTtcbiAgICAgICAgICB9IGVsc2UgaWYgKF8uaGFzKGRvYy5vLCBcImRyb3BcIikpIHtcbiAgICAgICAgICAgIHRyaWdnZXIuY29sbGVjdGlvbiA9IGRvYy5vLmRyb3A7XG4gICAgICAgICAgICB0cmlnZ2VyLmRyb3BDb2xsZWN0aW9uID0gdHJ1ZTtcbiAgICAgICAgICAgIHRyaWdnZXIuaWQgPSBudWxsO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcIlVua25vd24gY29tbWFuZCBcIiArIEVKU09OLnN0cmluZ2lmeShkb2MpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBBbGwgb3RoZXIgb3BzIGhhdmUgYW4gaWQuXG4gICAgICAgICAgdHJpZ2dlci5pZCA9IGlkRm9yT3AoZG9jKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNlbGYuX2Nyb3NzYmFyLmZpcmUodHJpZ2dlcik7XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIHdoaWxlICghIHNlbGYuX3N0b3BwZWQgJiZcbiAgICAgICAgICAgICAgICEgc2VsZi5fZW50cnlRdWV1ZS5pc0VtcHR5KCkpIHtcbiAgICAgICAgICAvLyBBcmUgd2UgdG9vIGZhciBiZWhpbmQ/IEp1c3QgdGVsbCBvdXIgb2JzZXJ2ZXJzIHRoYXQgdGhleSBuZWVkIHRvXG4gICAgICAgICAgLy8gcmVwb2xsLCBhbmQgZHJvcCBvdXIgcXVldWUuXG4gICAgICAgICAgaWYgKHNlbGYuX2VudHJ5UXVldWUubGVuZ3RoID4gVE9PX0ZBUl9CRUhJTkQpIHtcbiAgICAgICAgICAgIHZhciBsYXN0RW50cnkgPSBzZWxmLl9lbnRyeVF1ZXVlLnBvcCgpO1xuICAgICAgICAgICAgc2VsZi5fZW50cnlRdWV1ZS5jbGVhcigpO1xuXG4gICAgICAgICAgICBzZWxmLl9vblNraXBwZWRFbnRyaWVzSG9vay5lYWNoKGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBGcmVlIGFueSB3YWl0VW50aWxDYXVnaHRVcCgpIGNhbGxzIHRoYXQgd2VyZSB3YWl0aW5nIGZvciB1cyB0b1xuICAgICAgICAgICAgLy8gcGFzcyBzb21ldGhpbmcgdGhhdCB3ZSBqdXN0IHNraXBwZWQuXG4gICAgICAgICAgICBzZWxmLl9zZXRMYXN0UHJvY2Vzc2VkVFMobGFzdEVudHJ5LnRzKTtcbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGNvbnN0IGRvYyA9IHNlbGYuX2VudHJ5UXVldWUuc2hpZnQoKTtcblxuICAgICAgICAgIC8vIEZpcmUgdHJpZ2dlcihzKSBmb3IgdGhpcyBkb2MuXG4gICAgICAgICAgaGFuZGxlRG9jKGRvYyk7XG5cbiAgICAgICAgICAvLyBOb3cgdGhhdCB3ZSd2ZSBwcm9jZXNzZWQgdGhpcyBvcGVyYXRpb24sIHByb2Nlc3MgcGVuZGluZ1xuICAgICAgICAgIC8vIHNlcXVlbmNlcnMuXG4gICAgICAgICAgaWYgKGRvYy50cykge1xuICAgICAgICAgICAgc2VsZi5fc2V0TGFzdFByb2Nlc3NlZFRTKGRvYy50cyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IEVycm9yKFwib3Bsb2cgZW50cnkgd2l0aG91dCB0czogXCIgKyBFSlNPTi5zdHJpbmdpZnkoZG9jKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICBzZWxmLl93b3JrZXJBY3RpdmUgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBfc2V0TGFzdFByb2Nlc3NlZFRTOiBmdW5jdGlvbiAodHMpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fbGFzdFByb2Nlc3NlZFRTID0gdHM7XG4gICAgd2hpbGUgKCFfLmlzRW1wdHkoc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXMpICYmIHNlbGYuX2NhdGNoaW5nVXBGdXR1cmVzWzBdLnRzLmxlc3NUaGFuT3JFcXVhbChzZWxmLl9sYXN0UHJvY2Vzc2VkVFMpKSB7XG4gICAgICB2YXIgc2VxdWVuY2VyID0gc2VsZi5fY2F0Y2hpbmdVcEZ1dHVyZXMuc2hpZnQoKTtcbiAgICAgIHNlcXVlbmNlci5mdXR1cmUucmV0dXJuKCk7XG4gICAgfVxuICB9LFxuXG4gIC8vTWV0aG9kcyB1c2VkIG9uIHRlc3RzIHRvIGRpbmFtaWNhbGx5IGNoYW5nZSBUT09fRkFSX0JFSElORFxuICBfZGVmaW5lVG9vRmFyQmVoaW5kOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIFRPT19GQVJfQkVISU5EID0gdmFsdWU7XG4gIH0sXG4gIF9yZXNldFRvb0ZhckJlaGluZDogZnVuY3Rpb24oKSB7XG4gICAgVE9PX0ZBUl9CRUhJTkQgPSBwcm9jZXNzLmVudi5NRVRFT1JfT1BMT0dfVE9PX0ZBUl9CRUhJTkQgfHwgMjAwMDtcbiAgfVxufSk7XG4iLCJ2YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxuT2JzZXJ2ZU11bHRpcGxleGVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIGlmICghb3B0aW9ucyB8fCAhXy5oYXMob3B0aW9ucywgJ29yZGVyZWQnKSlcbiAgICB0aHJvdyBFcnJvcihcIm11c3Qgc3BlY2lmaWVkIG9yZGVyZWRcIik7XG5cbiAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLW11bHRpcGxleGVyc1wiLCAxKTtcblxuICBzZWxmLl9vcmRlcmVkID0gb3B0aW9ucy5vcmRlcmVkO1xuICBzZWxmLl9vblN0b3AgPSBvcHRpb25zLm9uU3RvcCB8fCBmdW5jdGlvbiAoKSB7fTtcbiAgc2VsZi5fcXVldWUgPSBuZXcgTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlKCk7XG4gIHNlbGYuX2hhbmRsZXMgPSB7fTtcbiAgc2VsZi5fcmVhZHlGdXR1cmUgPSBuZXcgRnV0dXJlO1xuICBzZWxmLl9jYWNoZSA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0NhY2hpbmdDaGFuZ2VPYnNlcnZlcih7XG4gICAgb3JkZXJlZDogb3B0aW9ucy5vcmRlcmVkfSk7XG4gIC8vIE51bWJlciBvZiBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMgdGFza3Mgc2NoZWR1bGVkIGJ1dCBub3QgeWV0XG4gIC8vIHJ1bm5pbmcuIHJlbW92ZUhhbmRsZSB1c2VzIHRoaXMgdG8ga25vdyBpZiBpdCdzIHRpbWUgdG8gY2FsbCB0aGUgb25TdG9wXG4gIC8vIGNhbGxiYWNrLlxuICBzZWxmLl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZCA9IDA7XG5cbiAgXy5lYWNoKHNlbGYuY2FsbGJhY2tOYW1lcygpLCBmdW5jdGlvbiAoY2FsbGJhY2tOYW1lKSB7XG4gICAgc2VsZltjYWxsYmFja05hbWVdID0gZnVuY3Rpb24gKC8qIC4uLiAqLykge1xuICAgICAgc2VsZi5fYXBwbHlDYWxsYmFjayhjYWxsYmFja05hbWUsIF8udG9BcnJheShhcmd1bWVudHMpKTtcbiAgICB9O1xuICB9KTtcbn07XG5cbl8uZXh0ZW5kKE9ic2VydmVNdWx0aXBsZXhlci5wcm90b3R5cGUsIHtcbiAgYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzOiBmdW5jdGlvbiAoaGFuZGxlKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgLy8gQ2hlY2sgdGhpcyBiZWZvcmUgY2FsbGluZyBydW5UYXNrIChldmVuIHRob3VnaCBydW5UYXNrIGRvZXMgdGhlIHNhbWVcbiAgICAvLyBjaGVjaykgc28gdGhhdCB3ZSBkb24ndCBsZWFrIGFuIE9ic2VydmVNdWx0aXBsZXhlciBvbiBlcnJvciBieVxuICAgIC8vIGluY3JlbWVudGluZyBfYWRkSGFuZGxlVGFza3NTY2hlZHVsZWRCdXROb3RQZXJmb3JtZWQgYW5kIG5ldmVyXG4gICAgLy8gZGVjcmVtZW50aW5nIGl0LlxuICAgIGlmICghc2VsZi5fcXVldWUuc2FmZVRvUnVuVGFzaygpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgY2FsbCBvYnNlcnZlQ2hhbmdlcyBmcm9tIGFuIG9ic2VydmUgY2FsbGJhY2sgb24gdGhlIHNhbWUgcXVlcnlcIik7XG4gICAgKytzZWxmLl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZDtcblxuICAgIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWhhbmRsZXNcIiwgMSk7XG5cbiAgICBzZWxmLl9xdWV1ZS5ydW5UYXNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX2hhbmRsZXNbaGFuZGxlLl9pZF0gPSBoYW5kbGU7XG4gICAgICAvLyBTZW5kIG91dCB3aGF0ZXZlciBhZGRzIHdlIGhhdmUgc28gZmFyICh3aGV0aGVyIG9yIG5vdCB3ZSB0aGVcbiAgICAgIC8vIG11bHRpcGxleGVyIGlzIHJlYWR5KS5cbiAgICAgIHNlbGYuX3NlbmRBZGRzKGhhbmRsZSk7XG4gICAgICAtLXNlbGYuX2FkZEhhbmRsZVRhc2tzU2NoZWR1bGVkQnV0Tm90UGVyZm9ybWVkO1xuICAgIH0pO1xuICAgIC8vICpvdXRzaWRlKiB0aGUgdGFzaywgc2luY2Ugb3RoZXJ3aXNlIHdlJ2QgZGVhZGxvY2tcbiAgICBzZWxmLl9yZWFkeUZ1dHVyZS53YWl0KCk7XG4gIH0sXG5cbiAgLy8gUmVtb3ZlIGFuIG9ic2VydmUgaGFuZGxlLiBJZiBpdCB3YXMgdGhlIGxhc3Qgb2JzZXJ2ZSBoYW5kbGUsIGNhbGwgdGhlXG4gIC8vIG9uU3RvcCBjYWxsYmFjazsgeW91IGNhbm5vdCBhZGQgYW55IG1vcmUgb2JzZXJ2ZSBoYW5kbGVzIGFmdGVyIHRoaXMuXG4gIC8vXG4gIC8vIFRoaXMgaXMgbm90IHN5bmNocm9uaXplZCB3aXRoIHBvbGxzIGFuZCBoYW5kbGUgYWRkaXRpb25zOiB0aGlzIG1lYW5zIHRoYXRcbiAgLy8geW91IGNhbiBzYWZlbHkgY2FsbCBpdCBmcm9tIHdpdGhpbiBhbiBvYnNlcnZlIGNhbGxiYWNrLCBidXQgaXQgYWxzbyBtZWFuc1xuICAvLyB0aGF0IHdlIGhhdmUgdG8gYmUgY2FyZWZ1bCB3aGVuIHdlIGl0ZXJhdGUgb3ZlciBfaGFuZGxlcy5cbiAgcmVtb3ZlSGFuZGxlOiBmdW5jdGlvbiAoaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAvLyBUaGlzIHNob3VsZCBub3QgYmUgcG9zc2libGU6IHlvdSBjYW4gb25seSBjYWxsIHJlbW92ZUhhbmRsZSBieSBoYXZpbmdcbiAgICAvLyBhY2Nlc3MgdG8gdGhlIE9ic2VydmVIYW5kbGUsIHdoaWNoIGlzbid0IHJldHVybmVkIHRvIHVzZXIgY29kZSB1bnRpbCB0aGVcbiAgICAvLyBtdWx0aXBsZXggaXMgcmVhZHkuXG4gICAgaWYgKCFzZWxmLl9yZWFkeSgpKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgcmVtb3ZlIGhhbmRsZXMgdW50aWwgdGhlIG11bHRpcGxleCBpcyByZWFkeVwiKTtcblxuICAgIGRlbGV0ZSBzZWxmLl9oYW5kbGVzW2lkXTtcblxuICAgIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXSAmJiBQYWNrYWdlWydmYWN0cy1iYXNlJ10uRmFjdHMuaW5jcmVtZW50U2VydmVyRmFjdChcbiAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJvYnNlcnZlLWhhbmRsZXNcIiwgLTEpO1xuXG4gICAgaWYgKF8uaXNFbXB0eShzZWxmLl9oYW5kbGVzKSAmJlxuICAgICAgICBzZWxmLl9hZGRIYW5kbGVUYXNrc1NjaGVkdWxlZEJ1dE5vdFBlcmZvcm1lZCA9PT0gMCkge1xuICAgICAgc2VsZi5fc3RvcCgpO1xuICAgIH1cbiAgfSxcbiAgX3N0b3A6IGZ1bmN0aW9uIChvcHRpb25zKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgLy8gSXQgc2hvdWxkbid0IGJlIHBvc3NpYmxlIGZvciB1cyB0byBzdG9wIHdoZW4gYWxsIG91ciBoYW5kbGVzIHN0aWxsXG4gICAgLy8gaGF2ZW4ndCBiZWVuIHJldHVybmVkIGZyb20gb2JzZXJ2ZUNoYW5nZXMhXG4gICAgaWYgKCEgc2VsZi5fcmVhZHkoKSAmJiAhIG9wdGlvbnMuZnJvbVF1ZXJ5RXJyb3IpXG4gICAgICB0aHJvdyBFcnJvcihcInN1cnByaXNpbmcgX3N0b3A6IG5vdCByZWFkeVwiKTtcblxuICAgIC8vIENhbGwgc3RvcCBjYWxsYmFjayAod2hpY2gga2lsbHMgdGhlIHVuZGVybHlpbmcgcHJvY2VzcyB3aGljaCBzZW5kcyB1c1xuICAgIC8vIGNhbGxiYWNrcyBhbmQgcmVtb3ZlcyB1cyBmcm9tIHRoZSBjb25uZWN0aW9uJ3MgZGljdGlvbmFyeSkuXG4gICAgc2VsZi5fb25TdG9wKCk7XG4gICAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtbXVsdGlwbGV4ZXJzXCIsIC0xKTtcblxuICAgIC8vIENhdXNlIGZ1dHVyZSBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMgY2FsbHMgdG8gdGhyb3cgKGJ1dCB0aGUgb25TdG9wXG4gICAgLy8gY2FsbGJhY2sgc2hvdWxkIG1ha2Ugb3VyIGNvbm5lY3Rpb24gZm9yZ2V0IGFib3V0IHVzKS5cbiAgICBzZWxmLl9oYW5kbGVzID0gbnVsbDtcbiAgfSxcblxuICAvLyBBbGxvd3MgYWxsIGFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkcyBjYWxscyB0byByZXR1cm4sIG9uY2UgYWxsIHByZWNlZGluZ1xuICAvLyBhZGRzIGhhdmUgYmVlbiBwcm9jZXNzZWQuIERvZXMgbm90IGJsb2NrLlxuICByZWFkeTogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9xdWV1ZS5xdWV1ZVRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3JlYWR5KCkpXG4gICAgICAgIHRocm93IEVycm9yKFwiY2FuJ3QgbWFrZSBPYnNlcnZlTXVsdGlwbGV4IHJlYWR5IHR3aWNlIVwiKTtcbiAgICAgIHNlbGYuX3JlYWR5RnV0dXJlLnJldHVybigpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIElmIHRyeWluZyB0byBleGVjdXRlIHRoZSBxdWVyeSByZXN1bHRzIGluIGFuIGVycm9yLCBjYWxsIHRoaXMuIFRoaXMgaXNcbiAgLy8gaW50ZW5kZWQgZm9yIHBlcm1hbmVudCBlcnJvcnMsIG5vdCB0cmFuc2llbnQgbmV0d29yayBlcnJvcnMgdGhhdCBjb3VsZCBiZVxuICAvLyBmaXhlZC4gSXQgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIGJlZm9yZSByZWFkeSgpLCBiZWNhdXNlIGlmIHlvdSBjYWxsZWQgcmVhZHlcbiAgLy8gdGhhdCBtZWFudCB0aGF0IHlvdSBtYW5hZ2VkIHRvIHJ1biB0aGUgcXVlcnkgb25jZS4gSXQgd2lsbCBzdG9wIHRoaXNcbiAgLy8gT2JzZXJ2ZU11bHRpcGxleCBhbmQgY2F1c2UgYWRkSGFuZGxlQW5kU2VuZEluaXRpYWxBZGRzIGNhbGxzIChhbmQgdGh1c1xuICAvLyBvYnNlcnZlQ2hhbmdlcyBjYWxscykgdG8gdGhyb3cgdGhlIGVycm9yLlxuICBxdWVyeUVycm9yOiBmdW5jdGlvbiAoZXJyKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHNlbGYuX3F1ZXVlLnJ1blRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3JlYWR5KCkpXG4gICAgICAgIHRocm93IEVycm9yKFwiY2FuJ3QgY2xhaW0gcXVlcnkgaGFzIGFuIGVycm9yIGFmdGVyIGl0IHdvcmtlZCFcIik7XG4gICAgICBzZWxmLl9zdG9wKHtmcm9tUXVlcnlFcnJvcjogdHJ1ZX0pO1xuICAgICAgc2VsZi5fcmVhZHlGdXR1cmUudGhyb3coZXJyKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyBDYWxscyBcImNiXCIgb25jZSB0aGUgZWZmZWN0cyBvZiBhbGwgXCJyZWFkeVwiLCBcImFkZEhhbmRsZUFuZFNlbmRJbml0aWFsQWRkc1wiXG4gIC8vIGFuZCBvYnNlcnZlIGNhbGxiYWNrcyB3aGljaCBjYW1lIGJlZm9yZSB0aGlzIGNhbGwgaGF2ZSBiZWVuIHByb3BhZ2F0ZWQgdG9cbiAgLy8gYWxsIGhhbmRsZXMuIFwicmVhZHlcIiBtdXN0IGhhdmUgYWxyZWFkeSBiZWVuIGNhbGxlZCBvbiB0aGlzIG11bHRpcGxleGVyLlxuICBvbkZsdXNoOiBmdW5jdGlvbiAoY2IpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgc2VsZi5fcXVldWUucXVldWVUYXNrKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghc2VsZi5fcmVhZHkoKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJvbmx5IGNhbGwgb25GbHVzaCBvbiBhIG11bHRpcGxleGVyIHRoYXQgd2lsbCBiZSByZWFkeVwiKTtcbiAgICAgIGNiKCk7XG4gICAgfSk7XG4gIH0sXG4gIGNhbGxiYWNrTmFtZXM6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX29yZGVyZWQpXG4gICAgICByZXR1cm4gW1wiYWRkZWRCZWZvcmVcIiwgXCJjaGFuZ2VkXCIsIFwibW92ZWRCZWZvcmVcIiwgXCJyZW1vdmVkXCJdO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBbXCJhZGRlZFwiLCBcImNoYW5nZWRcIiwgXCJyZW1vdmVkXCJdO1xuICB9LFxuICBfcmVhZHk6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5fcmVhZHlGdXR1cmUuaXNSZXNvbHZlZCgpO1xuICB9LFxuICBfYXBwbHlDYWxsYmFjazogZnVuY3Rpb24gKGNhbGxiYWNrTmFtZSwgYXJncykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9xdWV1ZS5xdWV1ZVRhc2soZnVuY3Rpb24gKCkge1xuICAgICAgLy8gSWYgd2Ugc3RvcHBlZCBpbiB0aGUgbWVhbnRpbWUsIGRvIG5vdGhpbmcuXG4gICAgICBpZiAoIXNlbGYuX2hhbmRsZXMpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gRmlyc3QsIGFwcGx5IHRoZSBjaGFuZ2UgdG8gdGhlIGNhY2hlLlxuICAgICAgc2VsZi5fY2FjaGUuYXBwbHlDaGFuZ2VbY2FsbGJhY2tOYW1lXS5hcHBseShudWxsLCBhcmdzKTtcblxuICAgICAgLy8gSWYgd2UgaGF2ZW4ndCBmaW5pc2hlZCB0aGUgaW5pdGlhbCBhZGRzLCB0aGVuIHdlIHNob3VsZCBvbmx5IGJlIGdldHRpbmdcbiAgICAgIC8vIGFkZHMuXG4gICAgICBpZiAoIXNlbGYuX3JlYWR5KCkgJiZcbiAgICAgICAgICAoY2FsbGJhY2tOYW1lICE9PSAnYWRkZWQnICYmIGNhbGxiYWNrTmFtZSAhPT0gJ2FkZGVkQmVmb3JlJykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR290IFwiICsgY2FsbGJhY2tOYW1lICsgXCIgZHVyaW5nIGluaXRpYWwgYWRkc1wiKTtcbiAgICAgIH1cblxuICAgICAgLy8gTm93IG11bHRpcGxleCB0aGUgY2FsbGJhY2tzIG91dCB0byBhbGwgb2JzZXJ2ZSBoYW5kbGVzLiBJdCdzIE9LIGlmXG4gICAgICAvLyB0aGVzZSBjYWxscyB5aWVsZDsgc2luY2Ugd2UncmUgaW5zaWRlIGEgdGFzaywgbm8gb3RoZXIgdXNlIG9mIG91ciBxdWV1ZVxuICAgICAgLy8gY2FuIGNvbnRpbnVlIHVudGlsIHRoZXNlIGFyZSBkb25lLiAoQnV0IHdlIGRvIGhhdmUgdG8gYmUgY2FyZWZ1bCB0byBub3RcbiAgICAgIC8vIHVzZSBhIGhhbmRsZSB0aGF0IGdvdCByZW1vdmVkLCBiZWNhdXNlIHJlbW92ZUhhbmRsZSBkb2VzIG5vdCB1c2UgdGhlXG4gICAgICAvLyBxdWV1ZTsgdGh1cywgd2UgaXRlcmF0ZSBvdmVyIGFuIGFycmF5IG9mIGtleXMgdGhhdCB3ZSBjb250cm9sLilcbiAgICAgIF8uZWFjaChfLmtleXMoc2VsZi5faGFuZGxlcyksIGZ1bmN0aW9uIChoYW5kbGVJZCkge1xuICAgICAgICB2YXIgaGFuZGxlID0gc2VsZi5faGFuZGxlcyAmJiBzZWxmLl9oYW5kbGVzW2hhbmRsZUlkXTtcbiAgICAgICAgaWYgKCFoYW5kbGUpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB2YXIgY2FsbGJhY2sgPSBoYW5kbGVbJ18nICsgY2FsbGJhY2tOYW1lXTtcbiAgICAgICAgLy8gY2xvbmUgYXJndW1lbnRzIHNvIHRoYXQgY2FsbGJhY2tzIGNhbiBtdXRhdGUgdGhlaXIgYXJndW1lbnRzXG4gICAgICAgIGNhbGxiYWNrICYmIGNhbGxiYWNrLmFwcGx5KG51bGwsXG4gICAgICAgICAgaGFuZGxlLm5vbk11dGF0aW5nQ2FsbGJhY2tzID8gYXJncyA6IEVKU09OLmNsb25lKGFyZ3MpKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFNlbmRzIGluaXRpYWwgYWRkcyB0byBhIGhhbmRsZS4gSXQgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIGZyb20gd2l0aGluIGEgdGFza1xuICAvLyAodGhlIHRhc2sgdGhhdCBpcyBwcm9jZXNzaW5nIHRoZSBhZGRIYW5kbGVBbmRTZW5kSW5pdGlhbEFkZHMgY2FsbCkuIEl0XG4gIC8vIHN5bmNocm9ub3VzbHkgaW52b2tlcyB0aGUgaGFuZGxlJ3MgYWRkZWQgb3IgYWRkZWRCZWZvcmU7IHRoZXJlJ3Mgbm8gbmVlZCB0b1xuICAvLyBmbHVzaCB0aGUgcXVldWUgYWZ0ZXJ3YXJkcyB0byBlbnN1cmUgdGhhdCB0aGUgY2FsbGJhY2tzIGdldCBvdXQuXG4gIF9zZW5kQWRkczogZnVuY3Rpb24gKGhhbmRsZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoc2VsZi5fcXVldWUuc2FmZVRvUnVuVGFzaygpKVxuICAgICAgdGhyb3cgRXJyb3IoXCJfc2VuZEFkZHMgbWF5IG9ubHkgYmUgY2FsbGVkIGZyb20gd2l0aGluIGEgdGFzayFcIik7XG4gICAgdmFyIGFkZCA9IHNlbGYuX29yZGVyZWQgPyBoYW5kbGUuX2FkZGVkQmVmb3JlIDogaGFuZGxlLl9hZGRlZDtcbiAgICBpZiAoIWFkZClcbiAgICAgIHJldHVybjtcbiAgICAvLyBub3RlOiBkb2NzIG1heSBiZSBhbiBfSWRNYXAgb3IgYW4gT3JkZXJlZERpY3RcbiAgICBzZWxmLl9jYWNoZS5kb2NzLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgIGlmICghXy5oYXMoc2VsZi5faGFuZGxlcywgaGFuZGxlLl9pZCkpXG4gICAgICAgIHRocm93IEVycm9yKFwiaGFuZGxlIGdvdCByZW1vdmVkIGJlZm9yZSBzZW5kaW5nIGluaXRpYWwgYWRkcyFcIik7XG4gICAgICBjb25zdCB7IF9pZCwgLi4uZmllbGRzIH0gPSBoYW5kbGUubm9uTXV0YXRpbmdDYWxsYmFja3MgPyBkb2NcbiAgICAgICAgOiBFSlNPTi5jbG9uZShkb2MpO1xuICAgICAgaWYgKHNlbGYuX29yZGVyZWQpXG4gICAgICAgIGFkZChpZCwgZmllbGRzLCBudWxsKTsgLy8gd2UncmUgZ29pbmcgaW4gb3JkZXIsIHNvIGFkZCBhdCBlbmRcbiAgICAgIGVsc2VcbiAgICAgICAgYWRkKGlkLCBmaWVsZHMpO1xuICAgIH0pO1xuICB9XG59KTtcblxuXG52YXIgbmV4dE9ic2VydmVIYW5kbGVJZCA9IDE7XG5cbi8vIFdoZW4gdGhlIGNhbGxiYWNrcyBkbyBub3QgbXV0YXRlIHRoZSBhcmd1bWVudHMsIHdlIGNhbiBza2lwIGEgbG90IG9mIGRhdGEgY2xvbmVzXG5PYnNlcnZlSGFuZGxlID0gZnVuY3Rpb24gKG11bHRpcGxleGVyLCBjYWxsYmFja3MsIG5vbk11dGF0aW5nQ2FsbGJhY2tzID0gZmFsc2UpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICAvLyBUaGUgZW5kIHVzZXIgaXMgb25seSBzdXBwb3NlZCB0byBjYWxsIHN0b3AoKS4gIFRoZSBvdGhlciBmaWVsZHMgYXJlXG4gIC8vIGFjY2Vzc2libGUgdG8gdGhlIG11bHRpcGxleGVyLCB0aG91Z2guXG4gIHNlbGYuX211bHRpcGxleGVyID0gbXVsdGlwbGV4ZXI7XG4gIF8uZWFjaChtdWx0aXBsZXhlci5jYWxsYmFja05hbWVzKCksIGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgaWYgKGNhbGxiYWNrc1tuYW1lXSkge1xuICAgICAgc2VsZlsnXycgKyBuYW1lXSA9IGNhbGxiYWNrc1tuYW1lXTtcbiAgICB9IGVsc2UgaWYgKG5hbWUgPT09IFwiYWRkZWRCZWZvcmVcIiAmJiBjYWxsYmFja3MuYWRkZWQpIHtcbiAgICAgIC8vIFNwZWNpYWwgY2FzZTogaWYgeW91IHNwZWNpZnkgXCJhZGRlZFwiIGFuZCBcIm1vdmVkQmVmb3JlXCIsIHlvdSBnZXQgYW5cbiAgICAgIC8vIG9yZGVyZWQgb2JzZXJ2ZSB3aGVyZSBmb3Igc29tZSByZWFzb24geW91IGRvbid0IGdldCBvcmRlcmluZyBkYXRhIG9uXG4gICAgICAvLyB0aGUgYWRkcy4gIEkgZHVubm8sIHdlIHdyb3RlIHRlc3RzIGZvciBpdCwgdGhlcmUgbXVzdCBoYXZlIGJlZW4gYVxuICAgICAgLy8gcmVhc29uLlxuICAgICAgc2VsZi5fYWRkZWRCZWZvcmUgPSBmdW5jdGlvbiAoaWQsIGZpZWxkcywgYmVmb3JlKSB7XG4gICAgICAgIGNhbGxiYWNrcy5hZGRlZChpZCwgZmllbGRzKTtcbiAgICAgIH07XG4gICAgfVxuICB9KTtcbiAgc2VsZi5fc3RvcHBlZCA9IGZhbHNlO1xuICBzZWxmLl9pZCA9IG5leHRPYnNlcnZlSGFuZGxlSWQrKztcbiAgc2VsZi5ub25NdXRhdGluZ0NhbGxiYWNrcyA9IG5vbk11dGF0aW5nQ2FsbGJhY2tzO1xufTtcbk9ic2VydmVIYW5kbGUucHJvdG90eXBlLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgcmV0dXJuO1xuICBzZWxmLl9zdG9wcGVkID0gdHJ1ZTtcbiAgc2VsZi5fbXVsdGlwbGV4ZXIucmVtb3ZlSGFuZGxlKHNlbGYuX2lkKTtcbn07XG4iLCJ2YXIgRmliZXIgPSBOcG0ucmVxdWlyZSgnZmliZXJzJyk7XG5cbmV4cG9ydCBjbGFzcyBEb2NGZXRjaGVyIHtcbiAgY29uc3RydWN0b3IobW9uZ29Db25uZWN0aW9uKSB7XG4gICAgdGhpcy5fbW9uZ29Db25uZWN0aW9uID0gbW9uZ29Db25uZWN0aW9uO1xuICAgIC8vIE1hcCBmcm9tIG9wIC0+IFtjYWxsYmFja11cbiAgICB0aGlzLl9jYWxsYmFja3NGb3JPcCA9IG5ldyBNYXA7XG4gIH1cblxuICAvLyBGZXRjaGVzIGRvY3VtZW50IFwiaWRcIiBmcm9tIGNvbGxlY3Rpb25OYW1lLCByZXR1cm5pbmcgaXQgb3IgbnVsbCBpZiBub3RcbiAgLy8gZm91bmQuXG4gIC8vXG4gIC8vIElmIHlvdSBtYWtlIG11bHRpcGxlIGNhbGxzIHRvIGZldGNoKCkgd2l0aCB0aGUgc2FtZSBvcCByZWZlcmVuY2UsXG4gIC8vIERvY0ZldGNoZXIgbWF5IGFzc3VtZSB0aGF0IHRoZXkgYWxsIHJldHVybiB0aGUgc2FtZSBkb2N1bWVudC4gKEl0IGRvZXNcbiAgLy8gbm90IGNoZWNrIHRvIHNlZSBpZiBjb2xsZWN0aW9uTmFtZS9pZCBtYXRjaC4pXG4gIC8vXG4gIC8vIFlvdSBtYXkgYXNzdW1lIHRoYXQgY2FsbGJhY2sgaXMgbmV2ZXIgY2FsbGVkIHN5bmNocm9ub3VzbHkgKGFuZCBpbiBmYWN0XG4gIC8vIE9wbG9nT2JzZXJ2ZURyaXZlciBkb2VzIHNvKS5cbiAgZmV0Y2goY29sbGVjdGlvbk5hbWUsIGlkLCBvcCwgY2FsbGJhY2spIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcblxuICAgIGNoZWNrKGNvbGxlY3Rpb25OYW1lLCBTdHJpbmcpO1xuICAgIGNoZWNrKG9wLCBPYmplY3QpO1xuXG4gICAgLy8gSWYgdGhlcmUncyBhbHJlYWR5IGFuIGluLXByb2dyZXNzIGZldGNoIGZvciB0aGlzIGNhY2hlIGtleSwgeWllbGQgdW50aWxcbiAgICAvLyBpdCdzIGRvbmUgYW5kIHJldHVybiB3aGF0ZXZlciBpdCByZXR1cm5zLlxuICAgIGlmIChzZWxmLl9jYWxsYmFja3NGb3JPcC5oYXMob3ApKSB7XG4gICAgICBzZWxmLl9jYWxsYmFja3NGb3JPcC5nZXQob3ApLnB1c2goY2FsbGJhY2spO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGNhbGxiYWNrcyA9IFtjYWxsYmFja107XG4gICAgc2VsZi5fY2FsbGJhY2tzRm9yT3Auc2V0KG9wLCBjYWxsYmFja3MpO1xuXG4gICAgRmliZXIoZnVuY3Rpb24gKCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIGRvYyA9IHNlbGYuX21vbmdvQ29ubmVjdGlvbi5maW5kT25lKFxuICAgICAgICAgIGNvbGxlY3Rpb25OYW1lLCB7X2lkOiBpZH0pIHx8IG51bGw7XG4gICAgICAgIC8vIFJldHVybiBkb2MgdG8gYWxsIHJlbGV2YW50IGNhbGxiYWNrcy4gTm90ZSB0aGF0IHRoaXMgYXJyYXkgY2FuXG4gICAgICAgIC8vIGNvbnRpbnVlIHRvIGdyb3cgZHVyaW5nIGNhbGxiYWNrIGV4Y2VjdXRpb24uXG4gICAgICAgIHdoaWxlIChjYWxsYmFja3MubGVuZ3RoID4gMCkge1xuICAgICAgICAgIC8vIENsb25lIHRoZSBkb2N1bWVudCBzbyB0aGF0IHRoZSB2YXJpb3VzIGNhbGxzIHRvIGZldGNoIGRvbid0IHJldHVyblxuICAgICAgICAgIC8vIG9iamVjdHMgdGhhdCBhcmUgaW50ZXJ0d2luZ2xlZCB3aXRoIGVhY2ggb3RoZXIuIENsb25lIGJlZm9yZVxuICAgICAgICAgIC8vIHBvcHBpbmcgdGhlIGZ1dHVyZSwgc28gdGhhdCBpZiBjbG9uZSB0aHJvd3MsIHRoZSBlcnJvciBnZXRzIHBhc3NlZFxuICAgICAgICAgIC8vIHRvIHRoZSBuZXh0IGNhbGxiYWNrLlxuICAgICAgICAgIGNhbGxiYWNrcy5wb3AoKShudWxsLCBFSlNPTi5jbG9uZShkb2MpKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB3aGlsZSAoY2FsbGJhY2tzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjYWxsYmFja3MucG9wKCkoZSk7XG4gICAgICAgIH1cbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgIC8vIFhYWCBjb25zaWRlciBrZWVwaW5nIHRoZSBkb2MgYXJvdW5kIGZvciBhIHBlcmlvZCBvZiB0aW1lIGJlZm9yZVxuICAgICAgICAvLyByZW1vdmluZyBmcm9tIHRoZSBjYWNoZVxuICAgICAgICBzZWxmLl9jYWxsYmFja3NGb3JPcC5kZWxldGUob3ApO1xuICAgICAgfVxuICAgIH0pLnJ1bigpO1xuICB9XG59XG4iLCJ2YXIgUE9MTElOR19USFJPVFRMRV9NUyA9ICtwcm9jZXNzLmVudi5NRVRFT1JfUE9MTElOR19USFJPVFRMRV9NUyB8fCA1MDtcbnZhciBQT0xMSU5HX0lOVEVSVkFMX01TID0gK3Byb2Nlc3MuZW52Lk1FVEVPUl9QT0xMSU5HX0lOVEVSVkFMX01TIHx8IDEwICogMTAwMDtcblxuUG9sbGluZ09ic2VydmVEcml2ZXIgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24gPSBvcHRpb25zLmN1cnNvckRlc2NyaXB0aW9uO1xuICBzZWxmLl9tb25nb0hhbmRsZSA9IG9wdGlvbnMubW9uZ29IYW5kbGU7XG4gIHNlbGYuX29yZGVyZWQgPSBvcHRpb25zLm9yZGVyZWQ7XG4gIHNlbGYuX211bHRpcGxleGVyID0gb3B0aW9ucy5tdWx0aXBsZXhlcjtcbiAgc2VsZi5fc3RvcENhbGxiYWNrcyA9IFtdO1xuICBzZWxmLl9zdG9wcGVkID0gZmFsc2U7XG5cbiAgc2VsZi5fc3luY2hyb25vdXNDdXJzb3IgPSBzZWxmLl9tb25nb0hhbmRsZS5fY3JlYXRlU3luY2hyb25vdXNDdXJzb3IoXG4gICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24pO1xuXG4gIC8vIHByZXZpb3VzIHJlc3VsdHMgc25hcHNob3QuICBvbiBlYWNoIHBvbGwgY3ljbGUsIGRpZmZzIGFnYWluc3RcbiAgLy8gcmVzdWx0cyBkcml2ZXMgdGhlIGNhbGxiYWNrcy5cbiAgc2VsZi5fcmVzdWx0cyA9IG51bGw7XG5cbiAgLy8gVGhlIG51bWJlciBvZiBfcG9sbE1vbmdvIGNhbGxzIHRoYXQgaGF2ZSBiZWVuIGFkZGVkIHRvIHNlbGYuX3Rhc2tRdWV1ZSBidXRcbiAgLy8gaGF2ZSBub3Qgc3RhcnRlZCBydW5uaW5nLiBVc2VkIHRvIG1ha2Ugc3VyZSB3ZSBuZXZlciBzY2hlZHVsZSBtb3JlIHRoYW4gb25lXG4gIC8vIF9wb2xsTW9uZ28gKG90aGVyIHRoYW4gcG9zc2libHkgdGhlIG9uZSB0aGF0IGlzIGN1cnJlbnRseSBydW5uaW5nKS4gSXQnc1xuICAvLyBhbHNvIHVzZWQgYnkgX3N1c3BlbmRQb2xsaW5nIHRvIHByZXRlbmQgdGhlcmUncyBhIHBvbGwgc2NoZWR1bGVkLiBVc3VhbGx5LFxuICAvLyBpdCdzIGVpdGhlciAwIChmb3IgXCJubyBwb2xscyBzY2hlZHVsZWQgb3RoZXIgdGhhbiBtYXliZSBvbmUgY3VycmVudGx5XG4gIC8vIHJ1bm5pbmdcIikgb3IgMSAoZm9yIFwiYSBwb2xsIHNjaGVkdWxlZCB0aGF0IGlzbid0IHJ1bm5pbmcgeWV0XCIpLCBidXQgaXQgY2FuXG4gIC8vIGFsc28gYmUgMiBpZiBpbmNyZW1lbnRlZCBieSBfc3VzcGVuZFBvbGxpbmcuXG4gIHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCA9IDA7XG4gIHNlbGYuX3BlbmRpbmdXcml0ZXMgPSBbXTsgLy8gcGVvcGxlIHRvIG5vdGlmeSB3aGVuIHBvbGxpbmcgY29tcGxldGVzXG5cbiAgLy8gTWFrZSBzdXJlIHRvIGNyZWF0ZSBhIHNlcGFyYXRlbHkgdGhyb3R0bGVkIGZ1bmN0aW9uIGZvciBlYWNoXG4gIC8vIFBvbGxpbmdPYnNlcnZlRHJpdmVyIG9iamVjdC5cbiAgc2VsZi5fZW5zdXJlUG9sbElzU2NoZWR1bGVkID0gXy50aHJvdHRsZShcbiAgICBzZWxmLl91bnRocm90dGxlZEVuc3VyZVBvbGxJc1NjaGVkdWxlZCxcbiAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLnBvbGxpbmdUaHJvdHRsZU1zIHx8IFBPTExJTkdfVEhST1RUTEVfTVMgLyogbXMgKi8pO1xuXG4gIC8vIFhYWCBmaWd1cmUgb3V0IGlmIHdlIHN0aWxsIG5lZWQgYSBxdWV1ZVxuICBzZWxmLl90YXNrUXVldWUgPSBuZXcgTWV0ZW9yLl9TeW5jaHJvbm91c1F1ZXVlKCk7XG5cbiAgdmFyIGxpc3RlbmVyc0hhbmRsZSA9IGxpc3RlbkFsbChcbiAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiwgZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgLy8gV2hlbiBzb21lb25lIGRvZXMgYSB0cmFuc2FjdGlvbiB0aGF0IG1pZ2h0IGFmZmVjdCB1cywgc2NoZWR1bGUgYSBwb2xsXG4gICAgICAvLyBvZiB0aGUgZGF0YWJhc2UuIElmIHRoYXQgdHJhbnNhY3Rpb24gaGFwcGVucyBpbnNpZGUgb2YgYSB3cml0ZSBmZW5jZSxcbiAgICAgIC8vIGJsb2NrIHRoZSBmZW5jZSB1bnRpbCB3ZSd2ZSBwb2xsZWQgYW5kIG5vdGlmaWVkIG9ic2VydmVycy5cbiAgICAgIHZhciBmZW5jZSA9IEREUFNlcnZlci5fQ3VycmVudFdyaXRlRmVuY2UuZ2V0KCk7XG4gICAgICBpZiAoZmVuY2UpXG4gICAgICAgIHNlbGYuX3BlbmRpbmdXcml0ZXMucHVzaChmZW5jZS5iZWdpbldyaXRlKCkpO1xuICAgICAgLy8gRW5zdXJlIGEgcG9sbCBpcyBzY2hlZHVsZWQuLi4gYnV0IGlmIHdlIGFscmVhZHkga25vdyB0aGF0IG9uZSBpcyxcbiAgICAgIC8vIGRvbid0IGhpdCB0aGUgdGhyb3R0bGVkIF9lbnN1cmVQb2xsSXNTY2hlZHVsZWQgZnVuY3Rpb24gKHdoaWNoIG1pZ2h0XG4gICAgICAvLyBsZWFkIHRvIHVzIGNhbGxpbmcgaXQgdW5uZWNlc3NhcmlseSBpbiA8cG9sbGluZ1Rocm90dGxlTXM+IG1zKS5cbiAgICAgIGlmIChzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgPT09IDApXG4gICAgICAgIHNlbGYuX2Vuc3VyZVBvbGxJc1NjaGVkdWxlZCgpO1xuICAgIH1cbiAgKTtcbiAgc2VsZi5fc3RvcENhbGxiYWNrcy5wdXNoKGZ1bmN0aW9uICgpIHsgbGlzdGVuZXJzSGFuZGxlLnN0b3AoKTsgfSk7XG5cbiAgLy8gZXZlcnkgb25jZSBhbmQgYSB3aGlsZSwgcG9sbCBldmVuIGlmIHdlIGRvbid0IHRoaW5rIHdlJ3JlIGRpcnR5LCBmb3JcbiAgLy8gZXZlbnR1YWwgY29uc2lzdGVuY3kgd2l0aCBkYXRhYmFzZSB3cml0ZXMgZnJvbSBvdXRzaWRlIHRoZSBNZXRlb3JcbiAgLy8gdW5pdmVyc2UuXG4gIC8vXG4gIC8vIEZvciB0ZXN0aW5nLCB0aGVyZSdzIGFuIHVuZG9jdW1lbnRlZCBjYWxsYmFjayBhcmd1bWVudCB0byBvYnNlcnZlQ2hhbmdlc1xuICAvLyB3aGljaCBkaXNhYmxlcyB0aW1lLWJhc2VkIHBvbGxpbmcgYW5kIGdldHMgY2FsbGVkIGF0IHRoZSBiZWdpbm5pbmcgb2YgZWFjaFxuICAvLyBwb2xsLlxuICBpZiAob3B0aW9ucy5fdGVzdE9ubHlQb2xsQ2FsbGJhY2spIHtcbiAgICBzZWxmLl90ZXN0T25seVBvbGxDYWxsYmFjayA9IG9wdGlvbnMuX3Rlc3RPbmx5UG9sbENhbGxiYWNrO1xuICB9IGVsc2Uge1xuICAgIHZhciBwb2xsaW5nSW50ZXJ2YWwgPVxuICAgICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMucG9sbGluZ0ludGVydmFsTXMgfHxcbiAgICAgICAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLl9wb2xsaW5nSW50ZXJ2YWwgfHwgLy8gQ09NUEFUIHdpdGggMS4yXG4gICAgICAgICAgUE9MTElOR19JTlRFUlZBTF9NUztcbiAgICB2YXIgaW50ZXJ2YWxIYW5kbGUgPSBNZXRlb3Iuc2V0SW50ZXJ2YWwoXG4gICAgICBfLmJpbmQoc2VsZi5fZW5zdXJlUG9sbElzU2NoZWR1bGVkLCBzZWxmKSwgcG9sbGluZ0ludGVydmFsKTtcbiAgICBzZWxmLl9zdG9wQ2FsbGJhY2tzLnB1c2goZnVuY3Rpb24gKCkge1xuICAgICAgTWV0ZW9yLmNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxIYW5kbGUpO1xuICAgIH0pO1xuICB9XG5cbiAgLy8gTWFrZSBzdXJlIHdlIGFjdHVhbGx5IHBvbGwgc29vbiFcbiAgc2VsZi5fdW50aHJvdHRsZWRFbnN1cmVQb2xsSXNTY2hlZHVsZWQoKTtcblxuICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtZHJpdmVycy1wb2xsaW5nXCIsIDEpO1xufTtcblxuXy5leHRlbmQoUG9sbGluZ09ic2VydmVEcml2ZXIucHJvdG90eXBlLCB7XG4gIC8vIFRoaXMgaXMgYWx3YXlzIGNhbGxlZCB0aHJvdWdoIF8udGhyb3R0bGUgKGV4Y2VwdCBvbmNlIGF0IHN0YXJ0dXApLlxuICBfdW50aHJvdHRsZWRFbnN1cmVQb2xsSXNTY2hlZHVsZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCA+IDApXG4gICAgICByZXR1cm47XG4gICAgKytzZWxmLl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQ7XG4gICAgc2VsZi5fdGFza1F1ZXVlLnF1ZXVlVGFzayhmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9wb2xsTW9uZ28oKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyB0ZXN0LW9ubHkgaW50ZXJmYWNlIGZvciBjb250cm9sbGluZyBwb2xsaW5nLlxuICAvL1xuICAvLyBfc3VzcGVuZFBvbGxpbmcgYmxvY2tzIHVudGlsIGFueSBjdXJyZW50bHkgcnVubmluZyBhbmQgc2NoZWR1bGVkIHBvbGxzIGFyZVxuICAvLyBkb25lLCBhbmQgcHJldmVudHMgYW55IGZ1cnRoZXIgcG9sbHMgZnJvbSBiZWluZyBzY2hlZHVsZWQuIChuZXdcbiAgLy8gT2JzZXJ2ZUhhbmRsZXMgY2FuIGJlIGFkZGVkIGFuZCByZWNlaXZlIHRoZWlyIGluaXRpYWwgYWRkZWQgY2FsbGJhY2tzLFxuICAvLyB0aG91Z2guKVxuICAvL1xuICAvLyBfcmVzdW1lUG9sbGluZyBpbW1lZGlhdGVseSBwb2xscywgYW5kIGFsbG93cyBmdXJ0aGVyIHBvbGxzIHRvIG9jY3VyLlxuICBfc3VzcGVuZFBvbGxpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBQcmV0ZW5kIHRoYXQgdGhlcmUncyBhbm90aGVyIHBvbGwgc2NoZWR1bGVkICh3aGljaCB3aWxsIHByZXZlbnRcbiAgICAvLyBfZW5zdXJlUG9sbElzU2NoZWR1bGVkIGZyb20gcXVldWVpbmcgYW55IG1vcmUgcG9sbHMpLlxuICAgICsrc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkO1xuICAgIC8vIE5vdyBibG9jayB1bnRpbCBhbGwgY3VycmVudGx5IHJ1bm5pbmcgb3Igc2NoZWR1bGVkIHBvbGxzIGFyZSBkb25lLlxuICAgIHNlbGYuX3Rhc2tRdWV1ZS5ydW5UYXNrKGZ1bmN0aW9uKCkge30pO1xuXG4gICAgLy8gQ29uZmlybSB0aGF0IHRoZXJlIGlzIG9ubHkgb25lIFwicG9sbFwiICh0aGUgZmFrZSBvbmUgd2UncmUgcHJldGVuZGluZyB0b1xuICAgIC8vIGhhdmUpIHNjaGVkdWxlZC5cbiAgICBpZiAoc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkICE9PSAxKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCBpcyBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkKTtcbiAgfSxcbiAgX3Jlc3VtZVBvbGxpbmc6IGZ1bmN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBXZSBzaG91bGQgYmUgaW4gdGhlIHNhbWUgc3RhdGUgYXMgaW4gdGhlIGVuZCBvZiBfc3VzcGVuZFBvbGxpbmcuXG4gICAgaWYgKHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCAhPT0gMSlcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIl9wb2xsc1NjaGVkdWxlZEJ1dE5vdFN0YXJ0ZWQgaXMgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIHNlbGYuX3BvbGxzU2NoZWR1bGVkQnV0Tm90U3RhcnRlZCk7XG4gICAgLy8gUnVuIGEgcG9sbCBzeW5jaHJvbm91c2x5ICh3aGljaCB3aWxsIGNvdW50ZXJhY3QgdGhlXG4gICAgLy8gKytfcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkIGZyb20gX3N1c3BlbmRQb2xsaW5nKS5cbiAgICBzZWxmLl90YXNrUXVldWUucnVuVGFzayhmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9wb2xsTW9uZ28oKTtcbiAgICB9KTtcbiAgfSxcblxuICBfcG9sbE1vbmdvOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC0tc2VsZi5fcG9sbHNTY2hlZHVsZWRCdXROb3RTdGFydGVkO1xuXG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG5cbiAgICB2YXIgZmlyc3QgPSBmYWxzZTtcbiAgICB2YXIgbmV3UmVzdWx0cztcbiAgICB2YXIgb2xkUmVzdWx0cyA9IHNlbGYuX3Jlc3VsdHM7XG4gICAgaWYgKCFvbGRSZXN1bHRzKSB7XG4gICAgICBmaXJzdCA9IHRydWU7XG4gICAgICAvLyBYWFggbWF5YmUgdXNlIE9yZGVyZWREaWN0IGluc3RlYWQ/XG4gICAgICBvbGRSZXN1bHRzID0gc2VsZi5fb3JkZXJlZCA/IFtdIDogbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgfVxuXG4gICAgc2VsZi5fdGVzdE9ubHlQb2xsQ2FsbGJhY2sgJiYgc2VsZi5fdGVzdE9ubHlQb2xsQ2FsbGJhY2soKTtcblxuICAgIC8vIFNhdmUgdGhlIGxpc3Qgb2YgcGVuZGluZyB3cml0ZXMgd2hpY2ggdGhpcyByb3VuZCB3aWxsIGNvbW1pdC5cbiAgICB2YXIgd3JpdGVzRm9yQ3ljbGUgPSBzZWxmLl9wZW5kaW5nV3JpdGVzO1xuICAgIHNlbGYuX3BlbmRpbmdXcml0ZXMgPSBbXTtcblxuICAgIC8vIEdldCB0aGUgbmV3IHF1ZXJ5IHJlc3VsdHMuIChUaGlzIHlpZWxkcy4pXG4gICAgdHJ5IHtcbiAgICAgIG5ld1Jlc3VsdHMgPSBzZWxmLl9zeW5jaHJvbm91c0N1cnNvci5nZXRSYXdPYmplY3RzKHNlbGYuX29yZGVyZWQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChmaXJzdCAmJiB0eXBlb2YoZS5jb2RlKSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgLy8gVGhpcyBpcyBhbiBlcnJvciBkb2N1bWVudCBzZW50IHRvIHVzIGJ5IG1vbmdvZCwgbm90IGEgY29ubmVjdGlvblxuICAgICAgICAvLyBlcnJvciBnZW5lcmF0ZWQgYnkgdGhlIGNsaWVudC4gQW5kIHdlJ3ZlIG5ldmVyIHNlZW4gdGhpcyBxdWVyeSB3b3JrXG4gICAgICAgIC8vIHN1Y2Nlc3NmdWxseS4gUHJvYmFibHkgaXQncyBhIGJhZCBzZWxlY3RvciBvciBzb21ldGhpbmcsIHNvIHdlIHNob3VsZFxuICAgICAgICAvLyBOT1QgcmV0cnkuIEluc3RlYWQsIHdlIHNob3VsZCBoYWx0IHRoZSBvYnNlcnZlICh3aGljaCBlbmRzIHVwIGNhbGxpbmdcbiAgICAgICAgLy8gYHN0b3BgIG9uIHVzKS5cbiAgICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucXVlcnlFcnJvcihcbiAgICAgICAgICBuZXcgRXJyb3IoXG4gICAgICAgICAgICBcIkV4Y2VwdGlvbiB3aGlsZSBwb2xsaW5nIHF1ZXJ5IFwiICtcbiAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24pICsgXCI6IFwiICsgZS5tZXNzYWdlKSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gZ2V0UmF3T2JqZWN0cyBjYW4gdGhyb3cgaWYgd2UncmUgaGF2aW5nIHRyb3VibGUgdGFsa2luZyB0byB0aGVcbiAgICAgIC8vIGRhdGFiYXNlLiAgVGhhdCdzIGZpbmUgLS0tIHdlIHdpbGwgcmVwb2xsIGxhdGVyIGFueXdheS4gQnV0IHdlIHNob3VsZFxuICAgICAgLy8gbWFrZSBzdXJlIG5vdCB0byBsb3NlIHRyYWNrIG9mIHRoaXMgY3ljbGUncyB3cml0ZXMuXG4gICAgICAvLyAoSXQgYWxzbyBjYW4gdGhyb3cgaWYgdGhlcmUncyBqdXN0IHNvbWV0aGluZyBpbnZhbGlkIGFib3V0IHRoaXMgcXVlcnk7XG4gICAgICAvLyB1bmZvcnR1bmF0ZWx5IHRoZSBPYnNlcnZlRHJpdmVyIEFQSSBkb2Vzbid0IHByb3ZpZGUgYSBnb29kIHdheSB0b1xuICAgICAgLy8gXCJjYW5jZWxcIiB0aGUgb2JzZXJ2ZSBmcm9tIHRoZSBpbnNpZGUgaW4gdGhpcyBjYXNlLlxuICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoc2VsZi5fcGVuZGluZ1dyaXRlcywgd3JpdGVzRm9yQ3ljbGUpO1xuICAgICAgTWV0ZW9yLl9kZWJ1ZyhcIkV4Y2VwdGlvbiB3aGlsZSBwb2xsaW5nIHF1ZXJ5IFwiICtcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24pLCBlKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBSdW4gZGlmZnMuXG4gICAgaWYgKCFzZWxmLl9zdG9wcGVkKSB7XG4gICAgICBMb2NhbENvbGxlY3Rpb24uX2RpZmZRdWVyeUNoYW5nZXMoXG4gICAgICAgIHNlbGYuX29yZGVyZWQsIG9sZFJlc3VsdHMsIG5ld1Jlc3VsdHMsIHNlbGYuX211bHRpcGxleGVyKTtcbiAgICB9XG5cbiAgICAvLyBTaWduYWxzIHRoZSBtdWx0aXBsZXhlciB0byBhbGxvdyBhbGwgb2JzZXJ2ZUNoYW5nZXMgY2FsbHMgdGhhdCBzaGFyZSB0aGlzXG4gICAgLy8gbXVsdGlwbGV4ZXIgdG8gcmV0dXJuLiAoVGhpcyBoYXBwZW5zIGFzeW5jaHJvbm91c2x5LCB2aWEgdGhlXG4gICAgLy8gbXVsdGlwbGV4ZXIncyBxdWV1ZS4pXG4gICAgaWYgKGZpcnN0KVxuICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucmVhZHkoKTtcblxuICAgIC8vIFJlcGxhY2Ugc2VsZi5fcmVzdWx0cyBhdG9taWNhbGx5LiAgKFRoaXMgYXNzaWdubWVudCBpcyB3aGF0IG1ha2VzIGBmaXJzdGBcbiAgICAvLyBzdGF5IHRocm91Z2ggb24gdGhlIG5leHQgY3ljbGUsIHNvIHdlJ3ZlIHdhaXRlZCB1bnRpbCBhZnRlciB3ZSd2ZVxuICAgIC8vIGNvbW1pdHRlZCB0byByZWFkeS1pbmcgdGhlIG11bHRpcGxleGVyLilcbiAgICBzZWxmLl9yZXN1bHRzID0gbmV3UmVzdWx0cztcblxuICAgIC8vIE9uY2UgdGhlIE9ic2VydmVNdWx0aXBsZXhlciBoYXMgcHJvY2Vzc2VkIGV2ZXJ5dGhpbmcgd2UndmUgZG9uZSBpbiB0aGlzXG4gICAgLy8gcm91bmQsIG1hcmsgYWxsIHRoZSB3cml0ZXMgd2hpY2ggZXhpc3RlZCBiZWZvcmUgdGhpcyBjYWxsIGFzXG4gICAgLy8gY29tbW1pdHRlZC4gKElmIG5ldyB3cml0ZXMgaGF2ZSBzaG93biB1cCBpbiB0aGUgbWVhbnRpbWUsIHRoZXJlJ2xsXG4gICAgLy8gYWxyZWFkeSBiZSBhbm90aGVyIF9wb2xsTW9uZ28gdGFzayBzY2hlZHVsZWQuKVxuICAgIHNlbGYuX211bHRpcGxleGVyLm9uRmx1c2goZnVuY3Rpb24gKCkge1xuICAgICAgXy5lYWNoKHdyaXRlc0ZvckN5Y2xlLCBmdW5jdGlvbiAodykge1xuICAgICAgICB3LmNvbW1pdHRlZCgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgc3RvcDogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBzZWxmLl9zdG9wcGVkID0gdHJ1ZTtcbiAgICBfLmVhY2goc2VsZi5fc3RvcENhbGxiYWNrcywgZnVuY3Rpb24gKGMpIHsgYygpOyB9KTtcbiAgICAvLyBSZWxlYXNlIGFueSB3cml0ZSBmZW5jZXMgdGhhdCBhcmUgd2FpdGluZyBvbiB1cy5cbiAgICBfLmVhY2goc2VsZi5fcGVuZGluZ1dyaXRlcywgZnVuY3Rpb24gKHcpIHtcbiAgICAgIHcuY29tbWl0dGVkKCk7XG4gICAgfSk7XG4gICAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtZHJpdmVycy1wb2xsaW5nXCIsIC0xKTtcbiAgfVxufSk7XG4iLCJ2YXIgRnV0dXJlID0gTnBtLnJlcXVpcmUoJ2ZpYmVycy9mdXR1cmUnKTtcblxudmFyIFBIQVNFID0ge1xuICBRVUVSWUlORzogXCJRVUVSWUlOR1wiLFxuICBGRVRDSElORzogXCJGRVRDSElOR1wiLFxuICBTVEVBRFk6IFwiU1RFQURZXCJcbn07XG5cbi8vIEV4Y2VwdGlvbiB0aHJvd24gYnkgX25lZWRUb1BvbGxRdWVyeSB3aGljaCB1bnJvbGxzIHRoZSBzdGFjayB1cCB0byB0aGVcbi8vIGVuY2xvc2luZyBjYWxsIHRvIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5LlxudmFyIFN3aXRjaGVkVG9RdWVyeSA9IGZ1bmN0aW9uICgpIHt9O1xudmFyIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5ID0gZnVuY3Rpb24gKGYpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgZi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmICghKGUgaW5zdGFuY2VvZiBTd2l0Y2hlZFRvUXVlcnkpKVxuICAgICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfTtcbn07XG5cbnZhciBjdXJyZW50SWQgPSAwO1xuXG4vLyBPcGxvZ09ic2VydmVEcml2ZXIgaXMgYW4gYWx0ZXJuYXRpdmUgdG8gUG9sbGluZ09ic2VydmVEcml2ZXIgd2hpY2ggZm9sbG93c1xuLy8gdGhlIE1vbmdvIG9wZXJhdGlvbiBsb2cgaW5zdGVhZCBvZiBqdXN0IHJlLXBvbGxpbmcgdGhlIHF1ZXJ5LiBJdCBvYmV5cyB0aGVcbi8vIHNhbWUgc2ltcGxlIGludGVyZmFjZTogY29uc3RydWN0aW5nIGl0IHN0YXJ0cyBzZW5kaW5nIG9ic2VydmVDaGFuZ2VzXG4vLyBjYWxsYmFja3MgKGFuZCBhIHJlYWR5KCkgaW52b2NhdGlvbikgdG8gdGhlIE9ic2VydmVNdWx0aXBsZXhlciwgYW5kIHlvdSBzdG9wXG4vLyBpdCBieSBjYWxsaW5nIHRoZSBzdG9wKCkgbWV0aG9kLlxuT3Bsb2dPYnNlcnZlRHJpdmVyID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLl91c2VzT3Bsb2cgPSB0cnVlOyAgLy8gdGVzdHMgbG9vayBhdCB0aGlzXG5cbiAgc2VsZi5faWQgPSBjdXJyZW50SWQ7XG4gIGN1cnJlbnRJZCsrO1xuXG4gIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uID0gb3B0aW9ucy5jdXJzb3JEZXNjcmlwdGlvbjtcbiAgc2VsZi5fbW9uZ29IYW5kbGUgPSBvcHRpb25zLm1vbmdvSGFuZGxlO1xuICBzZWxmLl9tdWx0aXBsZXhlciA9IG9wdGlvbnMubXVsdGlwbGV4ZXI7XG5cbiAgaWYgKG9wdGlvbnMub3JkZXJlZCkge1xuICAgIHRocm93IEVycm9yKFwiT3Bsb2dPYnNlcnZlRHJpdmVyIG9ubHkgc3VwcG9ydHMgdW5vcmRlcmVkIG9ic2VydmVDaGFuZ2VzXCIpO1xuICB9XG5cbiAgdmFyIHNvcnRlciA9IG9wdGlvbnMuc29ydGVyO1xuICAvLyBXZSBkb24ndCBzdXBwb3J0ICRuZWFyIGFuZCBvdGhlciBnZW8tcXVlcmllcyBzbyBpdCdzIE9LIHRvIGluaXRpYWxpemUgdGhlXG4gIC8vIGNvbXBhcmF0b3Igb25seSBvbmNlIGluIHRoZSBjb25zdHJ1Y3Rvci5cbiAgdmFyIGNvbXBhcmF0b3IgPSBzb3J0ZXIgJiYgc29ydGVyLmdldENvbXBhcmF0b3IoKTtcblxuICBpZiAob3B0aW9ucy5jdXJzb3JEZXNjcmlwdGlvbi5vcHRpb25zLmxpbWl0KSB7XG4gICAgLy8gVGhlcmUgYXJlIHNldmVyYWwgcHJvcGVydGllcyBvcmRlcmVkIGRyaXZlciBpbXBsZW1lbnRzOlxuICAgIC8vIC0gX2xpbWl0IGlzIGEgcG9zaXRpdmUgbnVtYmVyXG4gICAgLy8gLSBfY29tcGFyYXRvciBpcyBhIGZ1bmN0aW9uLWNvbXBhcmF0b3IgYnkgd2hpY2ggdGhlIHF1ZXJ5IGlzIG9yZGVyZWRcbiAgICAvLyAtIF91bnB1Ymxpc2hlZEJ1ZmZlciBpcyBub24tbnVsbCBNaW4vTWF4IEhlYXAsXG4gICAgLy8gICAgICAgICAgICAgICAgICAgICAgdGhlIGVtcHR5IGJ1ZmZlciBpbiBTVEVBRFkgcGhhc2UgaW1wbGllcyB0aGF0IHRoZVxuICAgIC8vICAgICAgICAgICAgICAgICAgICAgIGV2ZXJ5dGhpbmcgdGhhdCBtYXRjaGVzIHRoZSBxdWVyaWVzIHNlbGVjdG9yIGZpdHNcbiAgICAvLyAgICAgICAgICAgICAgICAgICAgICBpbnRvIHB1Ymxpc2hlZCBzZXQuXG4gICAgLy8gLSBfcHVibGlzaGVkIC0gTWF4IEhlYXAgKGFsc28gaW1wbGVtZW50cyBJZE1hcCBtZXRob2RzKVxuXG4gICAgdmFyIGhlYXBPcHRpb25zID0geyBJZE1hcDogTG9jYWxDb2xsZWN0aW9uLl9JZE1hcCB9O1xuICAgIHNlbGYuX2xpbWl0ID0gc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24ub3B0aW9ucy5saW1pdDtcbiAgICBzZWxmLl9jb21wYXJhdG9yID0gY29tcGFyYXRvcjtcbiAgICBzZWxmLl9zb3J0ZXIgPSBzb3J0ZXI7XG4gICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIgPSBuZXcgTWluTWF4SGVhcChjb21wYXJhdG9yLCBoZWFwT3B0aW9ucyk7XG4gICAgLy8gV2UgbmVlZCBzb21ldGhpbmcgdGhhdCBjYW4gZmluZCBNYXggdmFsdWUgaW4gYWRkaXRpb24gdG8gSWRNYXAgaW50ZXJmYWNlXG4gICAgc2VsZi5fcHVibGlzaGVkID0gbmV3IE1heEhlYXAoY29tcGFyYXRvciwgaGVhcE9wdGlvbnMpO1xuICB9IGVsc2Uge1xuICAgIHNlbGYuX2xpbWl0ID0gMDtcbiAgICBzZWxmLl9jb21wYXJhdG9yID0gbnVsbDtcbiAgICBzZWxmLl9zb3J0ZXIgPSBudWxsO1xuICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyID0gbnVsbDtcbiAgICBzZWxmLl9wdWJsaXNoZWQgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgfVxuXG4gIC8vIEluZGljYXRlcyBpZiBpdCBpcyBzYWZlIHRvIGluc2VydCBhIG5ldyBkb2N1bWVudCBhdCB0aGUgZW5kIG9mIHRoZSBidWZmZXJcbiAgLy8gZm9yIHRoaXMgcXVlcnkuIGkuZS4gaXQgaXMga25vd24gdGhhdCB0aGVyZSBhcmUgbm8gZG9jdW1lbnRzIG1hdGNoaW5nIHRoZVxuICAvLyBzZWxlY3RvciB0aG9zZSBhcmUgbm90IGluIHB1Ymxpc2hlZCBvciBidWZmZXIuXG4gIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuXG4gIHNlbGYuX3N0b3BwZWQgPSBmYWxzZTtcbiAgc2VsZi5fc3RvcEhhbmRsZXMgPSBbXTtcblxuICBQYWNrYWdlWydmYWN0cy1iYXNlJ10gJiYgUGFja2FnZVsnZmFjdHMtYmFzZSddLkZhY3RzLmluY3JlbWVudFNlcnZlckZhY3QoXG4gICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtZHJpdmVycy1vcGxvZ1wiLCAxKTtcblxuICBzZWxmLl9yZWdpc3RlclBoYXNlQ2hhbmdlKFBIQVNFLlFVRVJZSU5HKTtcblxuICBzZWxmLl9tYXRjaGVyID0gb3B0aW9ucy5tYXRjaGVyO1xuICB2YXIgcHJvamVjdGlvbiA9IHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMuZmllbGRzIHx8IHt9O1xuICBzZWxmLl9wcm9qZWN0aW9uRm4gPSBMb2NhbENvbGxlY3Rpb24uX2NvbXBpbGVQcm9qZWN0aW9uKHByb2plY3Rpb24pO1xuICAvLyBQcm9qZWN0aW9uIGZ1bmN0aW9uLCByZXN1bHQgb2YgY29tYmluaW5nIGltcG9ydGFudCBmaWVsZHMgZm9yIHNlbGVjdG9yIGFuZFxuICAvLyBleGlzdGluZyBmaWVsZHMgcHJvamVjdGlvblxuICBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uID0gc2VsZi5fbWF0Y2hlci5jb21iaW5lSW50b1Byb2plY3Rpb24ocHJvamVjdGlvbik7XG4gIGlmIChzb3J0ZXIpXG4gICAgc2VsZi5fc2hhcmVkUHJvamVjdGlvbiA9IHNvcnRlci5jb21iaW5lSW50b1Byb2plY3Rpb24oc2VsZi5fc2hhcmVkUHJvamVjdGlvbik7XG4gIHNlbGYuX3NoYXJlZFByb2plY3Rpb25GbiA9IExvY2FsQ29sbGVjdGlvbi5fY29tcGlsZVByb2plY3Rpb24oXG4gICAgc2VsZi5fc2hhcmVkUHJvamVjdGlvbik7XG5cbiAgc2VsZi5fbmVlZFRvRmV0Y2ggPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcbiAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgPSBudWxsO1xuICBzZWxmLl9mZXRjaEdlbmVyYXRpb24gPSAwO1xuXG4gIHNlbGYuX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSA9IGZhbHNlO1xuICBzZWxmLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5ID0gW107XG5cbiAgLy8gSWYgdGhlIG9wbG9nIGhhbmRsZSB0ZWxscyB1cyB0aGF0IGl0IHNraXBwZWQgc29tZSBlbnRyaWVzIChiZWNhdXNlIGl0IGdvdFxuICAvLyBiZWhpbmQsIHNheSksIHJlLXBvbGwuXG4gIHNlbGYuX3N0b3BIYW5kbGVzLnB1c2goc2VsZi5fbW9uZ29IYW5kbGUuX29wbG9nSGFuZGxlLm9uU2tpcHBlZEVudHJpZXMoXG4gICAgZmluaXNoSWZOZWVkVG9Qb2xsUXVlcnkoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgfSlcbiAgKSk7XG5cbiAgZm9yRWFjaFRyaWdnZXIoc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24sIGZ1bmN0aW9uICh0cmlnZ2VyKSB7XG4gICAgc2VsZi5fc3RvcEhhbmRsZXMucHVzaChzZWxmLl9tb25nb0hhbmRsZS5fb3Bsb2dIYW5kbGUub25PcGxvZ0VudHJ5KFxuICAgICAgdHJpZ2dlciwgZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIG9wID0gbm90aWZpY2F0aW9uLm9wO1xuICAgICAgICAgIGlmIChub3RpZmljYXRpb24uZHJvcENvbGxlY3Rpb24gfHwgbm90aWZpY2F0aW9uLmRyb3BEYXRhYmFzZSkge1xuICAgICAgICAgICAgLy8gTm90ZTogdGhpcyBjYWxsIGlzIG5vdCBhbGxvd2VkIHRvIGJsb2NrIG9uIGFueXRoaW5nIChlc3BlY2lhbGx5XG4gICAgICAgICAgICAvLyBvbiB3YWl0aW5nIGZvciBvcGxvZyBlbnRyaWVzIHRvIGNhdGNoIHVwKSBiZWNhdXNlIHRoYXQgd2lsbCBibG9ja1xuICAgICAgICAgICAgLy8gb25PcGxvZ0VudHJ5IVxuICAgICAgICAgICAgc2VsZi5fbmVlZFRvUG9sbFF1ZXJ5KCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEFsbCBvdGhlciBvcGVyYXRvcnMgc2hvdWxkIGJlIGhhbmRsZWQgZGVwZW5kaW5nIG9uIHBoYXNlXG4gICAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlFVRVJZSU5HKSB7XG4gICAgICAgICAgICAgIHNlbGYuX2hhbmRsZU9wbG9nRW50cnlRdWVyeWluZyhvcCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBzZWxmLl9oYW5kbGVPcGxvZ0VudHJ5U3RlYWR5T3JGZXRjaGluZyhvcCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgKSk7XG4gIH0pO1xuXG4gIC8vIFhYWCBvcmRlcmluZyB3LnIudC4gZXZlcnl0aGluZyBlbHNlP1xuICBzZWxmLl9zdG9wSGFuZGxlcy5wdXNoKGxpc3RlbkFsbChcbiAgICBzZWxmLl9jdXJzb3JEZXNjcmlwdGlvbiwgZnVuY3Rpb24gKG5vdGlmaWNhdGlvbikge1xuICAgICAgLy8gSWYgd2UncmUgbm90IGluIGEgcHJlLWZpcmUgd3JpdGUgZmVuY2UsIHdlIGRvbid0IGhhdmUgdG8gZG8gYW55dGhpbmcuXG4gICAgICB2YXIgZmVuY2UgPSBERFBTZXJ2ZXIuX0N1cnJlbnRXcml0ZUZlbmNlLmdldCgpO1xuICAgICAgaWYgKCFmZW5jZSB8fCBmZW5jZS5maXJlZClcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICBpZiAoZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnMpIHtcbiAgICAgICAgZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnNbc2VsZi5faWRdID0gc2VsZjtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBmZW5jZS5fb3Bsb2dPYnNlcnZlRHJpdmVycyA9IHt9O1xuICAgICAgZmVuY2UuX29wbG9nT2JzZXJ2ZURyaXZlcnNbc2VsZi5faWRdID0gc2VsZjtcblxuICAgICAgZmVuY2Uub25CZWZvcmVGaXJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGRyaXZlcnMgPSBmZW5jZS5fb3Bsb2dPYnNlcnZlRHJpdmVycztcbiAgICAgICAgZGVsZXRlIGZlbmNlLl9vcGxvZ09ic2VydmVEcml2ZXJzO1xuXG4gICAgICAgIC8vIFRoaXMgZmVuY2UgY2Fubm90IGZpcmUgdW50aWwgd2UndmUgY2F1Z2h0IHVwIHRvIFwidGhpcyBwb2ludFwiIGluIHRoZVxuICAgICAgICAvLyBvcGxvZywgYW5kIGFsbCBvYnNlcnZlcnMgbWFkZSBpdCBiYWNrIHRvIHRoZSBzdGVhZHkgc3RhdGUuXG4gICAgICAgIHNlbGYuX21vbmdvSGFuZGxlLl9vcGxvZ0hhbmRsZS53YWl0VW50aWxDYXVnaHRVcCgpO1xuXG4gICAgICAgIF8uZWFjaChkcml2ZXJzLCBmdW5jdGlvbiAoZHJpdmVyKSB7XG4gICAgICAgICAgaWYgKGRyaXZlci5fc3RvcHBlZClcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICAgIHZhciB3cml0ZSA9IGZlbmNlLmJlZ2luV3JpdGUoKTtcbiAgICAgICAgICBpZiAoZHJpdmVyLl9waGFzZSA9PT0gUEhBU0UuU1RFQURZKSB7XG4gICAgICAgICAgICAvLyBNYWtlIHN1cmUgdGhhdCBhbGwgb2YgdGhlIGNhbGxiYWNrcyBoYXZlIG1hZGUgaXQgdGhyb3VnaCB0aGVcbiAgICAgICAgICAgIC8vIG11bHRpcGxleGVyIGFuZCBiZWVuIGRlbGl2ZXJlZCB0byBPYnNlcnZlSGFuZGxlcyBiZWZvcmUgY29tbWl0dGluZ1xuICAgICAgICAgICAgLy8gd3JpdGVzLlxuICAgICAgICAgICAgZHJpdmVyLl9tdWx0aXBsZXhlci5vbkZsdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgd3JpdGUuY29tbWl0dGVkKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZHJpdmVyLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5LnB1c2god3JpdGUpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICkpO1xuXG4gIC8vIFdoZW4gTW9uZ28gZmFpbHMgb3Zlciwgd2UgbmVlZCB0byByZXBvbGwgdGhlIHF1ZXJ5LCBpbiBjYXNlIHdlIHByb2Nlc3NlZCBhblxuICAvLyBvcGxvZyBlbnRyeSB0aGF0IGdvdCByb2xsZWQgYmFjay5cbiAgc2VsZi5fc3RvcEhhbmRsZXMucHVzaChzZWxmLl9tb25nb0hhbmRsZS5fb25GYWlsb3ZlcihmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShcbiAgICBmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICB9KSkpO1xuXG4gIC8vIEdpdmUgX29ic2VydmVDaGFuZ2VzIGEgY2hhbmNlIHRvIGFkZCB0aGUgbmV3IE9ic2VydmVIYW5kbGUgdG8gb3VyXG4gIC8vIG11bHRpcGxleGVyLCBzbyB0aGF0IHRoZSBhZGRlZCBjYWxscyBnZXQgc3RyZWFtZWQuXG4gIE1ldGVvci5kZWZlcihmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeShmdW5jdGlvbiAoKSB7XG4gICAgc2VsZi5fcnVuSW5pdGlhbFF1ZXJ5KCk7XG4gIH0pKTtcbn07XG5cbl8uZXh0ZW5kKE9wbG9nT2JzZXJ2ZURyaXZlci5wcm90b3R5cGUsIHtcbiAgX2FkZFB1Ymxpc2hlZDogZnVuY3Rpb24gKGlkLCBkb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIGZpZWxkcyA9IF8uY2xvbmUoZG9jKTtcbiAgICAgIGRlbGV0ZSBmaWVsZHMuX2lkO1xuICAgICAgc2VsZi5fcHVibGlzaGVkLnNldChpZCwgc2VsZi5fc2hhcmVkUHJvamVjdGlvbkZuKGRvYykpO1xuICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIuYWRkZWQoaWQsIHNlbGYuX3Byb2plY3Rpb25GbihmaWVsZHMpKTtcblxuICAgICAgLy8gQWZ0ZXIgYWRkaW5nIHRoaXMgZG9jdW1lbnQsIHRoZSBwdWJsaXNoZWQgc2V0IG1pZ2h0IGJlIG92ZXJmbG93ZWRcbiAgICAgIC8vIChleGNlZWRpbmcgY2FwYWNpdHkgc3BlY2lmaWVkIGJ5IGxpbWl0KS4gSWYgc28sIHB1c2ggdGhlIG1heGltdW1cbiAgICAgIC8vIGVsZW1lbnQgdG8gdGhlIGJ1ZmZlciwgd2UgbWlnaHQgd2FudCB0byBzYXZlIGl0IGluIG1lbW9yeSB0byByZWR1Y2UgdGhlXG4gICAgICAvLyBhbW91bnQgb2YgTW9uZ28gbG9va3VwcyBpbiB0aGUgZnV0dXJlLlxuICAgICAgaWYgKHNlbGYuX2xpbWl0ICYmIHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgPiBzZWxmLl9saW1pdCkge1xuICAgICAgICAvLyBYWFggaW4gdGhlb3J5IHRoZSBzaXplIG9mIHB1Ymxpc2hlZCBpcyBubyBtb3JlIHRoYW4gbGltaXQrMVxuICAgICAgICBpZiAoc2VsZi5fcHVibGlzaGVkLnNpemUoKSAhPT0gc2VsZi5fbGltaXQgKyAxKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQWZ0ZXIgYWRkaW5nIHRvIHB1Ymxpc2hlZCwgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAoc2VsZi5fcHVibGlzaGVkLnNpemUoKSAtIHNlbGYuX2xpbWl0KSArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiIGRvY3VtZW50cyBhcmUgb3ZlcmZsb3dpbmcgdGhlIHNldFwiKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBvdmVyZmxvd2luZ0RvY0lkID0gc2VsZi5fcHVibGlzaGVkLm1heEVsZW1lbnRJZCgpO1xuICAgICAgICB2YXIgb3ZlcmZsb3dpbmdEb2MgPSBzZWxmLl9wdWJsaXNoZWQuZ2V0KG92ZXJmbG93aW5nRG9jSWQpO1xuXG4gICAgICAgIGlmIChFSlNPTi5lcXVhbHMob3ZlcmZsb3dpbmdEb2NJZCwgaWQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhlIGRvY3VtZW50IGp1c3QgYWRkZWQgaXMgb3ZlcmZsb3dpbmcgdGhlIHB1Ymxpc2hlZCBzZXRcIik7XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLl9wdWJsaXNoZWQucmVtb3ZlKG92ZXJmbG93aW5nRG9jSWQpO1xuICAgICAgICBzZWxmLl9tdWx0aXBsZXhlci5yZW1vdmVkKG92ZXJmbG93aW5nRG9jSWQpO1xuICAgICAgICBzZWxmLl9hZGRCdWZmZXJlZChvdmVyZmxvd2luZ0RvY0lkLCBvdmVyZmxvd2luZ0RvYyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIF9yZW1vdmVQdWJsaXNoZWQ6IGZ1bmN0aW9uIChpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9wdWJsaXNoZWQucmVtb3ZlKGlkKTtcbiAgICAgIHNlbGYuX211bHRpcGxleGVyLnJlbW92ZWQoaWQpO1xuICAgICAgaWYgKCEgc2VsZi5fbGltaXQgfHwgc2VsZi5fcHVibGlzaGVkLnNpemUoKSA9PT0gc2VsZi5fbGltaXQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5zaXplKCkgPiBzZWxmLl9saW1pdClcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJzZWxmLl9wdWJsaXNoZWQgZ290IHRvbyBiaWdcIik7XG5cbiAgICAgIC8vIE9LLCB3ZSBhcmUgcHVibGlzaGluZyBsZXNzIHRoYW4gdGhlIGxpbWl0LiBNYXliZSB3ZSBzaG91bGQgbG9vayBpbiB0aGVcbiAgICAgIC8vIGJ1ZmZlciB0byBmaW5kIHRoZSBuZXh0IGVsZW1lbnQgcGFzdCB3aGF0IHdlIHdlcmUgcHVibGlzaGluZyBiZWZvcmUuXG5cbiAgICAgIGlmICghc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZW1wdHkoKSkge1xuICAgICAgICAvLyBUaGVyZSdzIHNvbWV0aGluZyBpbiB0aGUgYnVmZmVyOyBtb3ZlIHRoZSBmaXJzdCB0aGluZyBpbiBpdCB0b1xuICAgICAgICAvLyBfcHVibGlzaGVkLlxuICAgICAgICB2YXIgbmV3RG9jSWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5taW5FbGVtZW50SWQoKTtcbiAgICAgICAgdmFyIG5ld0RvYyA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChuZXdEb2NJZCk7XG4gICAgICAgIHNlbGYuX3JlbW92ZUJ1ZmZlcmVkKG5ld0RvY0lkKTtcbiAgICAgICAgc2VsZi5fYWRkUHVibGlzaGVkKG5ld0RvY0lkLCBuZXdEb2MpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFRoZXJlJ3Mgbm90aGluZyBpbiB0aGUgYnVmZmVyLiAgVGhpcyBjb3VsZCBtZWFuIG9uZSBvZiBhIGZldyB0aGluZ3MuXG5cbiAgICAgIC8vIChhKSBXZSBjb3VsZCBiZSBpbiB0aGUgbWlkZGxlIG9mIHJlLXJ1bm5pbmcgdGhlIHF1ZXJ5IChzcGVjaWZpY2FsbHksIHdlXG4gICAgICAvLyBjb3VsZCBiZSBpbiBfcHVibGlzaE5ld1Jlc3VsdHMpLiBJbiB0aGF0IGNhc2UsIF91bnB1Ymxpc2hlZEJ1ZmZlciBpc1xuICAgICAgLy8gZW1wdHkgYmVjYXVzZSB3ZSBjbGVhciBpdCBhdCB0aGUgYmVnaW5uaW5nIG9mIF9wdWJsaXNoTmV3UmVzdWx0cy4gSW5cbiAgICAgIC8vIHRoaXMgY2FzZSwgb3VyIGNhbGxlciBhbHJlYWR5IGtub3dzIHRoZSBlbnRpcmUgYW5zd2VyIHRvIHRoZSBxdWVyeSBhbmRcbiAgICAgIC8vIHdlIGRvbid0IG5lZWQgdG8gZG8gYW55dGhpbmcgZmFuY3kgaGVyZS4gIEp1c3QgcmV0dXJuLlxuICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5RVUVSWUlORylcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICAvLyAoYikgV2UncmUgcHJldHR5IGNvbmZpZGVudCB0aGF0IHRoZSB1bmlvbiBvZiBfcHVibGlzaGVkIGFuZFxuICAgICAgLy8gX3VucHVibGlzaGVkQnVmZmVyIGNvbnRhaW4gYWxsIGRvY3VtZW50cyB0aGF0IG1hdGNoIHNlbGVjdG9yLiBCZWNhdXNlXG4gICAgICAvLyBfdW5wdWJsaXNoZWRCdWZmZXIgaXMgZW1wdHksIHRoYXQgbWVhbnMgd2UncmUgY29uZmlkZW50IHRoYXQgX3B1Ymxpc2hlZFxuICAgICAgLy8gY29udGFpbnMgYWxsIGRvY3VtZW50cyB0aGF0IG1hdGNoIHNlbGVjdG9yLiBTbyB3ZSBoYXZlIG5vdGhpbmcgdG8gZG8uXG4gICAgICBpZiAoc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyKVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIC8vIChjKSBNYXliZSB0aGVyZSBhcmUgb3RoZXIgZG9jdW1lbnRzIG91dCB0aGVyZSB0aGF0IHNob3VsZCBiZSBpbiBvdXJcbiAgICAgIC8vIGJ1ZmZlci4gQnV0IGluIHRoYXQgY2FzZSwgd2hlbiB3ZSBlbXB0aWVkIF91bnB1Ymxpc2hlZEJ1ZmZlciBpblxuICAgICAgLy8gX3JlbW92ZUJ1ZmZlcmVkLCB3ZSBzaG91bGQgaGF2ZSBjYWxsZWQgX25lZWRUb1BvbGxRdWVyeSwgd2hpY2ggd2lsbFxuICAgICAgLy8gZWl0aGVyIHB1dCBzb21ldGhpbmcgaW4gX3VucHVibGlzaGVkQnVmZmVyIG9yIHNldCBfc2FmZUFwcGVuZFRvQnVmZmVyXG4gICAgICAvLyAob3IgYm90aCksIGFuZCBpdCB3aWxsIHB1dCB1cyBpbiBRVUVSWUlORyBmb3IgdGhhdCB3aG9sZSB0aW1lLiBTbyBpblxuICAgICAgLy8gZmFjdCwgd2Ugc2hvdWxkbid0IGJlIGFibGUgdG8gZ2V0IGhlcmUuXG5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkJ1ZmZlciBpbmV4cGxpY2FibHkgZW1wdHlcIik7XG4gICAgfSk7XG4gIH0sXG4gIF9jaGFuZ2VQdWJsaXNoZWQ6IGZ1bmN0aW9uIChpZCwgb2xkRG9jLCBuZXdEb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fcHVibGlzaGVkLnNldChpZCwgc2VsZi5fc2hhcmVkUHJvamVjdGlvbkZuKG5ld0RvYykpO1xuICAgICAgdmFyIHByb2plY3RlZE5ldyA9IHNlbGYuX3Byb2plY3Rpb25GbihuZXdEb2MpO1xuICAgICAgdmFyIHByb2plY3RlZE9sZCA9IHNlbGYuX3Byb2plY3Rpb25GbihvbGREb2MpO1xuICAgICAgdmFyIGNoYW5nZWQgPSBEaWZmU2VxdWVuY2UubWFrZUNoYW5nZWRGaWVsZHMoXG4gICAgICAgIHByb2plY3RlZE5ldywgcHJvamVjdGVkT2xkKTtcbiAgICAgIGlmICghXy5pc0VtcHR5KGNoYW5nZWQpKVxuICAgICAgICBzZWxmLl9tdWx0aXBsZXhlci5jaGFuZ2VkKGlkLCBjaGFuZ2VkKTtcbiAgICB9KTtcbiAgfSxcbiAgX2FkZEJ1ZmZlcmVkOiBmdW5jdGlvbiAoaWQsIGRvYykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zZXQoaWQsIHNlbGYuX3NoYXJlZFByb2plY3Rpb25Gbihkb2MpKTtcblxuICAgICAgLy8gSWYgc29tZXRoaW5nIGlzIG92ZXJmbG93aW5nIHRoZSBidWZmZXIsIHdlIGp1c3QgcmVtb3ZlIGl0IGZyb20gY2FjaGVcbiAgICAgIGlmIChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPiBzZWxmLl9saW1pdCkge1xuICAgICAgICB2YXIgbWF4QnVmZmVyZWRJZCA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1heEVsZW1lbnRJZCgpO1xuXG4gICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnJlbW92ZShtYXhCdWZmZXJlZElkKTtcblxuICAgICAgICAvLyBTaW5jZSBzb21ldGhpbmcgbWF0Y2hpbmcgaXMgcmVtb3ZlZCBmcm9tIGNhY2hlIChib3RoIHB1Ymxpc2hlZCBzZXQgYW5kXG4gICAgICAgIC8vIGJ1ZmZlciksIHNldCBmbGFnIHRvIGZhbHNlXG4gICAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICAvLyBJcyBjYWxsZWQgZWl0aGVyIHRvIHJlbW92ZSB0aGUgZG9jIGNvbXBsZXRlbHkgZnJvbSBtYXRjaGluZyBzZXQgb3IgdG8gbW92ZVxuICAvLyBpdCB0byB0aGUgcHVibGlzaGVkIHNldCBsYXRlci5cbiAgX3JlbW92ZUJ1ZmZlcmVkOiBmdW5jdGlvbiAoaWQpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIucmVtb3ZlKGlkKTtcbiAgICAgIC8vIFRvIGtlZXAgdGhlIGNvbnRyYWN0IFwiYnVmZmVyIGlzIG5ldmVyIGVtcHR5IGluIFNURUFEWSBwaGFzZSB1bmxlc3MgdGhlXG4gICAgICAvLyBldmVyeXRoaW5nIG1hdGNoaW5nIGZpdHMgaW50byBwdWJsaXNoZWRcIiB0cnVlLCB3ZSBwb2xsIGV2ZXJ5dGhpbmcgYXNcbiAgICAgIC8vIHNvb24gYXMgd2Ugc2VlIHRoZSBidWZmZXIgYmVjb21pbmcgZW1wdHkuXG4gICAgICBpZiAoISBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgJiYgISBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIpXG4gICAgICAgIHNlbGYuX25lZWRUb1BvbGxRdWVyeSgpO1xuICAgIH0pO1xuICB9LFxuICAvLyBDYWxsZWQgd2hlbiBhIGRvY3VtZW50IGhhcyBqb2luZWQgdGhlIFwiTWF0Y2hpbmdcIiByZXN1bHRzIHNldC5cbiAgLy8gVGFrZXMgcmVzcG9uc2liaWxpdHkgb2Yga2VlcGluZyBfdW5wdWJsaXNoZWRCdWZmZXIgaW4gc3luYyB3aXRoIF9wdWJsaXNoZWRcbiAgLy8gYW5kIHRoZSBlZmZlY3Qgb2YgbGltaXQgZW5mb3JjZWQuXG4gIF9hZGRNYXRjaGluZzogZnVuY3Rpb24gKGRvYykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaWQgPSBkb2MuX2lkO1xuICAgICAgaWYgKHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpKVxuICAgICAgICB0aHJvdyBFcnJvcihcInRyaWVkIHRvIGFkZCBzb21ldGhpbmcgYWxyZWFkeSBwdWJsaXNoZWQgXCIgKyBpZCk7XG4gICAgICBpZiAoc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKSlcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJ0cmllZCB0byBhZGQgc29tZXRoaW5nIGFscmVhZHkgZXhpc3RlZCBpbiBidWZmZXIgXCIgKyBpZCk7XG5cbiAgICAgIHZhciBsaW1pdCA9IHNlbGYuX2xpbWl0O1xuICAgICAgdmFyIGNvbXBhcmF0b3IgPSBzZWxmLl9jb21wYXJhdG9yO1xuICAgICAgdmFyIG1heFB1Ymxpc2hlZCA9IChsaW1pdCAmJiBzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpID4gMCkgP1xuICAgICAgICBzZWxmLl9wdWJsaXNoZWQuZ2V0KHNlbGYuX3B1Ymxpc2hlZC5tYXhFbGVtZW50SWQoKSkgOiBudWxsO1xuICAgICAgdmFyIG1heEJ1ZmZlcmVkID0gKGxpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSA+IDApXG4gICAgICAgID8gc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1heEVsZW1lbnRJZCgpKVxuICAgICAgICA6IG51bGw7XG4gICAgICAvLyBUaGUgcXVlcnkgaXMgdW5saW1pdGVkIG9yIGRpZG4ndCBwdWJsaXNoIGVub3VnaCBkb2N1bWVudHMgeWV0IG9yIHRoZVxuICAgICAgLy8gbmV3IGRvY3VtZW50IHdvdWxkIGZpdCBpbnRvIHB1Ymxpc2hlZCBzZXQgcHVzaGluZyB0aGUgbWF4aW11bSBlbGVtZW50XG4gICAgICAvLyBvdXQsIHRoZW4gd2UgbmVlZCB0byBwdWJsaXNoIHRoZSBkb2MuXG4gICAgICB2YXIgdG9QdWJsaXNoID0gISBsaW1pdCB8fCBzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpIDwgbGltaXQgfHxcbiAgICAgICAgY29tcGFyYXRvcihkb2MsIG1heFB1Ymxpc2hlZCkgPCAwO1xuXG4gICAgICAvLyBPdGhlcndpc2Ugd2UgbWlnaHQgbmVlZCB0byBidWZmZXIgaXQgKG9ubHkgaW4gY2FzZSBvZiBsaW1pdGVkIHF1ZXJ5KS5cbiAgICAgIC8vIEJ1ZmZlcmluZyBpcyBhbGxvd2VkIGlmIHRoZSBidWZmZXIgaXMgbm90IGZpbGxlZCB1cCB5ZXQgYW5kIGFsbFxuICAgICAgLy8gbWF0Y2hpbmcgZG9jcyBhcmUgZWl0aGVyIGluIHRoZSBwdWJsaXNoZWQgc2V0IG9yIGluIHRoZSBidWZmZXIuXG4gICAgICB2YXIgY2FuQXBwZW5kVG9CdWZmZXIgPSAhdG9QdWJsaXNoICYmIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciAmJlxuICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgPCBsaW1pdDtcblxuICAgICAgLy8gT3IgaWYgaXQgaXMgc21hbGwgZW5vdWdoIHRvIGJlIHNhZmVseSBpbnNlcnRlZCB0byB0aGUgbWlkZGxlIG9yIHRoZVxuICAgICAgLy8gYmVnaW5uaW5nIG9mIHRoZSBidWZmZXIuXG4gICAgICB2YXIgY2FuSW5zZXJ0SW50b0J1ZmZlciA9ICF0b1B1Ymxpc2ggJiYgbWF4QnVmZmVyZWQgJiZcbiAgICAgICAgY29tcGFyYXRvcihkb2MsIG1heEJ1ZmZlcmVkKSA8PSAwO1xuXG4gICAgICB2YXIgdG9CdWZmZXIgPSBjYW5BcHBlbmRUb0J1ZmZlciB8fCBjYW5JbnNlcnRJbnRvQnVmZmVyO1xuXG4gICAgICBpZiAodG9QdWJsaXNoKSB7XG4gICAgICAgIHNlbGYuX2FkZFB1Ymxpc2hlZChpZCwgZG9jKTtcbiAgICAgIH0gZWxzZSBpZiAodG9CdWZmZXIpIHtcbiAgICAgICAgc2VsZi5fYWRkQnVmZmVyZWQoaWQsIGRvYyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBkcm9wcGluZyBpdCBhbmQgbm90IHNhdmluZyB0byB0aGUgY2FjaGVcbiAgICAgICAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gZmFsc2U7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG4gIC8vIENhbGxlZCB3aGVuIGEgZG9jdW1lbnQgbGVhdmVzIHRoZSBcIk1hdGNoaW5nXCIgcmVzdWx0cyBzZXQuXG4gIC8vIFRha2VzIHJlc3BvbnNpYmlsaXR5IG9mIGtlZXBpbmcgX3VucHVibGlzaGVkQnVmZmVyIGluIHN5bmMgd2l0aCBfcHVibGlzaGVkXG4gIC8vIGFuZCB0aGUgZWZmZWN0IG9mIGxpbWl0IGVuZm9yY2VkLlxuICBfcmVtb3ZlTWF0Y2hpbmc6IGZ1bmN0aW9uIChpZCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoISBzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSAmJiAhIHNlbGYuX2xpbWl0KVxuICAgICAgICB0aHJvdyBFcnJvcihcInRyaWVkIHRvIHJlbW92ZSBzb21ldGhpbmcgbWF0Y2hpbmcgYnV0IG5vdCBjYWNoZWQgXCIgKyBpZCk7XG5cbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSkge1xuICAgICAgICBzZWxmLl9yZW1vdmVQdWJsaXNoZWQoaWQpO1xuICAgICAgfSBlbHNlIGlmIChzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5oYXMoaWQpKSB7XG4gICAgICAgIHNlbGYuX3JlbW92ZUJ1ZmZlcmVkKGlkKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgX2hhbmRsZURvYzogZnVuY3Rpb24gKGlkLCBuZXdEb2MpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG1hdGNoZXNOb3cgPSBuZXdEb2MgJiYgc2VsZi5fbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMobmV3RG9jKS5yZXN1bHQ7XG5cbiAgICAgIHZhciBwdWJsaXNoZWRCZWZvcmUgPSBzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKTtcbiAgICAgIHZhciBidWZmZXJlZEJlZm9yZSA9IHNlbGYuX2xpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCk7XG4gICAgICB2YXIgY2FjaGVkQmVmb3JlID0gcHVibGlzaGVkQmVmb3JlIHx8IGJ1ZmZlcmVkQmVmb3JlO1xuXG4gICAgICBpZiAobWF0Y2hlc05vdyAmJiAhY2FjaGVkQmVmb3JlKSB7XG4gICAgICAgIHNlbGYuX2FkZE1hdGNoaW5nKG5ld0RvYyk7XG4gICAgICB9IGVsc2UgaWYgKGNhY2hlZEJlZm9yZSAmJiAhbWF0Y2hlc05vdykge1xuICAgICAgICBzZWxmLl9yZW1vdmVNYXRjaGluZyhpZCk7XG4gICAgICB9IGVsc2UgaWYgKGNhY2hlZEJlZm9yZSAmJiBtYXRjaGVzTm93KSB7XG4gICAgICAgIHZhciBvbGREb2MgPSBzZWxmLl9wdWJsaXNoZWQuZ2V0KGlkKTtcbiAgICAgICAgdmFyIGNvbXBhcmF0b3IgPSBzZWxmLl9jb21wYXJhdG9yO1xuICAgICAgICB2YXIgbWluQnVmZmVyZWQgPSBzZWxmLl9saW1pdCAmJiBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgJiZcbiAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIubWluRWxlbWVudElkKCkpO1xuICAgICAgICB2YXIgbWF4QnVmZmVyZWQ7XG5cbiAgICAgICAgaWYgKHB1Ymxpc2hlZEJlZm9yZSkge1xuICAgICAgICAgIC8vIFVubGltaXRlZCBjYXNlIHdoZXJlIHRoZSBkb2N1bWVudCBzdGF5cyBpbiBwdWJsaXNoZWQgb25jZSBpdFxuICAgICAgICAgIC8vIG1hdGNoZXMgb3IgdGhlIGNhc2Ugd2hlbiB3ZSBkb24ndCBoYXZlIGVub3VnaCBtYXRjaGluZyBkb2NzIHRvXG4gICAgICAgICAgLy8gcHVibGlzaCBvciB0aGUgY2hhbmdlZCBidXQgbWF0Y2hpbmcgZG9jIHdpbGwgc3RheSBpbiBwdWJsaXNoZWRcbiAgICAgICAgICAvLyBhbnl3YXlzLlxuICAgICAgICAgIC8vXG4gICAgICAgICAgLy8gWFhYOiBXZSByZWx5IG9uIHRoZSBlbXB0aW5lc3Mgb2YgYnVmZmVyLiBCZSBzdXJlIHRvIG1haW50YWluIHRoZVxuICAgICAgICAgIC8vIGZhY3QgdGhhdCBidWZmZXIgY2FuJ3QgYmUgZW1wdHkgaWYgdGhlcmUgYXJlIG1hdGNoaW5nIGRvY3VtZW50cyBub3RcbiAgICAgICAgICAvLyBwdWJsaXNoZWQuIE5vdGFibHksIHdlIGRvbid0IHdhbnQgdG8gc2NoZWR1bGUgcmVwb2xsIGFuZCBjb250aW51ZVxuICAgICAgICAgIC8vIHJlbHlpbmcgb24gdGhpcyBwcm9wZXJ0eS5cbiAgICAgICAgICB2YXIgc3RheXNJblB1Ymxpc2hlZCA9ICEgc2VsZi5fbGltaXQgfHxcbiAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSA9PT0gMCB8fFxuICAgICAgICAgICAgY29tcGFyYXRvcihuZXdEb2MsIG1pbkJ1ZmZlcmVkKSA8PSAwO1xuXG4gICAgICAgICAgaWYgKHN0YXlzSW5QdWJsaXNoZWQpIHtcbiAgICAgICAgICAgIHNlbGYuX2NoYW5nZVB1Ymxpc2hlZChpZCwgb2xkRG9jLCBuZXdEb2MpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBhZnRlciB0aGUgY2hhbmdlIGRvYyBkb2Vzbid0IHN0YXkgaW4gdGhlIHB1Ymxpc2hlZCwgcmVtb3ZlIGl0XG4gICAgICAgICAgICBzZWxmLl9yZW1vdmVQdWJsaXNoZWQoaWQpO1xuICAgICAgICAgICAgLy8gYnV0IGl0IGNhbiBtb3ZlIGludG8gYnVmZmVyZWQgbm93LCBjaGVjayBpdFxuICAgICAgICAgICAgbWF4QnVmZmVyZWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoXG4gICAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLm1heEVsZW1lbnRJZCgpKTtcblxuICAgICAgICAgICAgdmFyIHRvQnVmZmVyID0gc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyIHx8XG4gICAgICAgICAgICAgICAgICAobWF4QnVmZmVyZWQgJiYgY29tcGFyYXRvcihuZXdEb2MsIG1heEJ1ZmZlcmVkKSA8PSAwKTtcblxuICAgICAgICAgICAgaWYgKHRvQnVmZmVyKSB7XG4gICAgICAgICAgICAgIHNlbGYuX2FkZEJ1ZmZlcmVkKGlkLCBuZXdEb2MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gVGhyb3cgYXdheSBmcm9tIGJvdGggcHVibGlzaGVkIHNldCBhbmQgYnVmZmVyXG4gICAgICAgICAgICAgIHNlbGYuX3NhZmVBcHBlbmRUb0J1ZmZlciA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChidWZmZXJlZEJlZm9yZSkge1xuICAgICAgICAgIG9sZERvYyA9IHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmdldChpZCk7XG4gICAgICAgICAgLy8gcmVtb3ZlIHRoZSBvbGQgdmVyc2lvbiBtYW51YWxseSBpbnN0ZWFkIG9mIHVzaW5nIF9yZW1vdmVCdWZmZXJlZCBzb1xuICAgICAgICAgIC8vIHdlIGRvbid0IHRyaWdnZXIgdGhlIHF1ZXJ5aW5nIGltbWVkaWF0ZWx5LiAgaWYgd2UgZW5kIHRoaXMgYmxvY2tcbiAgICAgICAgICAvLyB3aXRoIHRoZSBidWZmZXIgZW1wdHksIHdlIHdpbGwgbmVlZCB0byB0cmlnZ2VyIHRoZSBxdWVyeSBwb2xsXG4gICAgICAgICAgLy8gbWFudWFsbHkgdG9vLlxuICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnJlbW92ZShpZCk7XG5cbiAgICAgICAgICB2YXIgbWF4UHVibGlzaGVkID0gc2VsZi5fcHVibGlzaGVkLmdldChcbiAgICAgICAgICAgIHNlbGYuX3B1Ymxpc2hlZC5tYXhFbGVtZW50SWQoKSk7XG4gICAgICAgICAgbWF4QnVmZmVyZWQgPSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5zaXplKCkgJiZcbiAgICAgICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5nZXQoXG4gICAgICAgICAgICAgICAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlci5tYXhFbGVtZW50SWQoKSk7XG5cbiAgICAgICAgICAvLyB0aGUgYnVmZmVyZWQgZG9jIHdhcyB1cGRhdGVkLCBpdCBjb3VsZCBtb3ZlIHRvIHB1Ymxpc2hlZFxuICAgICAgICAgIHZhciB0b1B1Ymxpc2ggPSBjb21wYXJhdG9yKG5ld0RvYywgbWF4UHVibGlzaGVkKSA8IDA7XG5cbiAgICAgICAgICAvLyBvciBzdGF5cyBpbiBidWZmZXIgZXZlbiBhZnRlciB0aGUgY2hhbmdlXG4gICAgICAgICAgdmFyIHN0YXlzSW5CdWZmZXIgPSAoISB0b1B1Ymxpc2ggJiYgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyKSB8fFxuICAgICAgICAgICAgICAgICghdG9QdWJsaXNoICYmIG1heEJ1ZmZlcmVkICYmXG4gICAgICAgICAgICAgICAgIGNvbXBhcmF0b3IobmV3RG9jLCBtYXhCdWZmZXJlZCkgPD0gMCk7XG5cbiAgICAgICAgICBpZiAodG9QdWJsaXNoKSB7XG4gICAgICAgICAgICBzZWxmLl9hZGRQdWJsaXNoZWQoaWQsIG5ld0RvYyk7XG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF5c0luQnVmZmVyKSB7XG4gICAgICAgICAgICAvLyBzdGF5cyBpbiBidWZmZXIgYnV0IGNoYW5nZXNcbiAgICAgICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNldChpZCwgbmV3RG9jKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gVGhyb3cgYXdheSBmcm9tIGJvdGggcHVibGlzaGVkIHNldCBhbmQgYnVmZmVyXG4gICAgICAgICAgICBzZWxmLl9zYWZlQXBwZW5kVG9CdWZmZXIgPSBmYWxzZTtcbiAgICAgICAgICAgIC8vIE5vcm1hbGx5IHRoaXMgY2hlY2sgd291bGQgaGF2ZSBiZWVuIGRvbmUgaW4gX3JlbW92ZUJ1ZmZlcmVkIGJ1dFxuICAgICAgICAgICAgLy8gd2UgZGlkbid0IHVzZSBpdCwgc28gd2UgbmVlZCB0byBkbyBpdCBvdXJzZWxmIG5vdy5cbiAgICAgICAgICAgIGlmICghIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLnNpemUoKSkge1xuICAgICAgICAgICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY2FjaGVkQmVmb3JlIGltcGxpZXMgZWl0aGVyIG9mIHB1Ymxpc2hlZEJlZm9yZSBvciBidWZmZXJlZEJlZm9yZSBpcyB0cnVlLlwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuICBfZmV0Y2hNb2RpZmllZERvY3VtZW50czogZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBzZWxmLl9yZWdpc3RlclBoYXNlQ2hhbmdlKFBIQVNFLkZFVENISU5HKTtcbiAgICAgIC8vIERlZmVyLCBiZWNhdXNlIG5vdGhpbmcgY2FsbGVkIGZyb20gdGhlIG9wbG9nIGVudHJ5IGhhbmRsZXIgbWF5IHlpZWxkLFxuICAgICAgLy8gYnV0IGZldGNoKCkgeWllbGRzLlxuICAgICAgTWV0ZW9yLmRlZmVyKGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2hpbGUgKCFzZWxmLl9zdG9wcGVkICYmICFzZWxmLl9uZWVkVG9GZXRjaC5lbXB0eSgpKSB7XG4gICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5RVUVSWUlORykge1xuICAgICAgICAgICAgLy8gV2hpbGUgZmV0Y2hpbmcsIHdlIGRlY2lkZWQgdG8gZ28gaW50byBRVUVSWUlORyBtb2RlLCBhbmQgdGhlbiB3ZVxuICAgICAgICAgICAgLy8gc2F3IGFub3RoZXIgb3Bsb2cgZW50cnksIHNvIF9uZWVkVG9GZXRjaCBpcyBub3QgZW1wdHkuIEJ1dCB3ZVxuICAgICAgICAgICAgLy8gc2hvdWxkbid0IGZldGNoIHRoZXNlIGRvY3VtZW50cyB1bnRpbCBBRlRFUiB0aGUgcXVlcnkgaXMgZG9uZS5cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIEJlaW5nIGluIHN0ZWFkeSBwaGFzZSBoZXJlIHdvdWxkIGJlIHN1cnByaXNpbmcuXG4gICAgICAgICAgaWYgKHNlbGYuX3BoYXNlICE9PSBQSEFTRS5GRVRDSElORylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInBoYXNlIGluIGZldGNoTW9kaWZpZWREb2N1bWVudHM6IFwiICsgc2VsZi5fcGhhc2UpO1xuXG4gICAgICAgICAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgPSBzZWxmLl9uZWVkVG9GZXRjaDtcbiAgICAgICAgICB2YXIgdGhpc0dlbmVyYXRpb24gPSArK3NlbGYuX2ZldGNoR2VuZXJhdGlvbjtcbiAgICAgICAgICBzZWxmLl9uZWVkVG9GZXRjaCA9IG5ldyBMb2NhbENvbGxlY3Rpb24uX0lkTWFwO1xuICAgICAgICAgIHZhciB3YWl0aW5nID0gMDtcbiAgICAgICAgICB2YXIgZnV0ID0gbmV3IEZ1dHVyZTtcbiAgICAgICAgICAvLyBUaGlzIGxvb3AgaXMgc2FmZSwgYmVjYXVzZSBfY3VycmVudGx5RmV0Y2hpbmcgd2lsbCBub3QgYmUgdXBkYXRlZFxuICAgICAgICAgIC8vIGR1cmluZyB0aGlzIGxvb3AgKGluIGZhY3QsIGl0IGlzIG5ldmVyIG11dGF0ZWQpLlxuICAgICAgICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nLmZvckVhY2goZnVuY3Rpb24gKG9wLCBpZCkge1xuICAgICAgICAgICAgd2FpdGluZysrO1xuICAgICAgICAgICAgc2VsZi5fbW9uZ29IYW5kbGUuX2RvY0ZldGNoZXIuZmV0Y2goXG4gICAgICAgICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLmNvbGxlY3Rpb25OYW1lLCBpZCwgb3AsXG4gICAgICAgICAgICAgIGZpbmlzaElmTmVlZFRvUG9sbFF1ZXJ5KGZ1bmN0aW9uIChlcnIsIGRvYykge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIE1ldGVvci5fZGVidWcoXCJHb3QgZXhjZXB0aW9uIHdoaWxlIGZldGNoaW5nIGRvY3VtZW50c1wiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycik7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHdlIGdldCBhbiBlcnJvciBmcm9tIHRoZSBmZXRjaGVyIChlZywgdHJvdWJsZVxuICAgICAgICAgICAgICAgICAgICAvLyBjb25uZWN0aW5nIHRvIE1vbmdvKSwgbGV0J3MganVzdCBhYmFuZG9uIHRoZSBmZXRjaCBwaGFzZVxuICAgICAgICAgICAgICAgICAgICAvLyBhbHRvZ2V0aGVyIGFuZCBmYWxsIGJhY2sgdG8gcG9sbGluZy4gSXQncyBub3QgbGlrZSB3ZSdyZVxuICAgICAgICAgICAgICAgICAgICAvLyBnZXR0aW5nIGxpdmUgdXBkYXRlcyBhbnl3YXkuXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuUVVFUllJTkcpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzZWxmLl9uZWVkVG9Qb2xsUXVlcnkoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICghc2VsZi5fc3RvcHBlZCAmJiBzZWxmLl9waGFzZSA9PT0gUEhBU0UuRkVUQ0hJTkdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJiYgc2VsZi5fZmV0Y2hHZW5lcmF0aW9uID09PSB0aGlzR2VuZXJhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSByZS1jaGVjayB0aGUgZ2VuZXJhdGlvbiBpbiBjYXNlIHdlJ3ZlIGhhZCBhbiBleHBsaWNpdFxuICAgICAgICAgICAgICAgICAgICAvLyBfcG9sbFF1ZXJ5IGNhbGwgKGVnLCBpbiBhbm90aGVyIGZpYmVyKSB3aGljaCBzaG91bGRcbiAgICAgICAgICAgICAgICAgICAgLy8gZWZmZWN0aXZlbHkgY2FuY2VsIHRoaXMgcm91bmQgb2YgZmV0Y2hlcy4gIChfcG9sbFF1ZXJ5XG4gICAgICAgICAgICAgICAgICAgIC8vIGluY3JlbWVudHMgdGhlIGdlbmVyYXRpb24uKVxuICAgICAgICAgICAgICAgICAgICBzZWxmLl9oYW5kbGVEb2MoaWQsIGRvYyk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICAgICAgICAgIHdhaXRpbmctLTtcbiAgICAgICAgICAgICAgICAgIC8vIEJlY2F1c2UgZmV0Y2goKSBuZXZlciBjYWxscyBpdHMgY2FsbGJhY2sgc3luY2hyb25vdXNseSxcbiAgICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgc2FmZSAoaWUsIHdlIHdvbid0IGNhbGwgZnV0LnJldHVybigpIGJlZm9yZSB0aGVcbiAgICAgICAgICAgICAgICAgIC8vIGZvckVhY2ggaXMgZG9uZSkuXG4gICAgICAgICAgICAgICAgICBpZiAod2FpdGluZyA9PT0gMClcbiAgICAgICAgICAgICAgICAgICAgZnV0LnJldHVybigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGZ1dC53YWl0KCk7XG4gICAgICAgICAgLy8gRXhpdCBub3cgaWYgd2UndmUgaGFkIGEgX3BvbGxRdWVyeSBjYWxsIChoZXJlIG9yIGluIGFub3RoZXIgZmliZXIpLlxuICAgICAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuUVVFUllJTkcpXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgc2VsZi5fY3VycmVudGx5RmV0Y2hpbmcgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIC8vIFdlJ3JlIGRvbmUgZmV0Y2hpbmcsIHNvIHdlIGNhbiBiZSBzdGVhZHksIHVubGVzcyB3ZSd2ZSBoYWQgYVxuICAgICAgICAvLyBfcG9sbFF1ZXJ5IGNhbGwgKGhlcmUgb3IgaW4gYW5vdGhlciBmaWJlcikuXG4gICAgICAgIGlmIChzZWxmLl9waGFzZSAhPT0gUEhBU0UuUVVFUllJTkcpXG4gICAgICAgICAgc2VsZi5fYmVTdGVhZHkoKTtcbiAgICAgIH0pKTtcbiAgICB9KTtcbiAgfSxcbiAgX2JlU3RlYWR5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX3JlZ2lzdGVyUGhhc2VDaGFuZ2UoUEhBU0UuU1RFQURZKTtcbiAgICAgIHZhciB3cml0ZXMgPSBzZWxmLl93cml0ZXNUb0NvbW1pdFdoZW5XZVJlYWNoU3RlYWR5O1xuICAgICAgc2VsZi5fd3JpdGVzVG9Db21taXRXaGVuV2VSZWFjaFN0ZWFkeSA9IFtdO1xuICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIub25GbHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIF8uZWFjaCh3cml0ZXMsIGZ1bmN0aW9uICh3KSB7XG4gICAgICAgICAgdy5jb21taXR0ZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSxcbiAgX2hhbmRsZU9wbG9nRW50cnlRdWVyeWluZzogZnVuY3Rpb24gKG9wKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZEZvck9wKG9wKSwgb3ApO1xuICAgIH0pO1xuICB9LFxuICBfaGFuZGxlT3Bsb2dFbnRyeVN0ZWFkeU9yRmV0Y2hpbmc6IGZ1bmN0aW9uIChvcCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgaWQgPSBpZEZvck9wKG9wKTtcbiAgICAgIC8vIElmIHdlJ3JlIGFscmVhZHkgZmV0Y2hpbmcgdGhpcyBvbmUsIG9yIGFib3V0IHRvLCB3ZSBjYW4ndCBvcHRpbWl6ZTtcbiAgICAgIC8vIG1ha2Ugc3VyZSB0aGF0IHdlIGZldGNoIGl0IGFnYWluIGlmIG5lY2Vzc2FyeS5cbiAgICAgIGlmIChzZWxmLl9waGFzZSA9PT0gUEhBU0UuRkVUQ0hJTkcgJiZcbiAgICAgICAgICAoKHNlbGYuX2N1cnJlbnRseUZldGNoaW5nICYmIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nLmhhcyhpZCkpIHx8XG4gICAgICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLmhhcyhpZCkpKSB7XG4gICAgICAgIHNlbGYuX25lZWRUb0ZldGNoLnNldChpZCwgb3ApO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChvcC5vcCA9PT0gJ2QnKSB7XG4gICAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKSB8fFxuICAgICAgICAgICAgKHNlbGYuX2xpbWl0ICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCkpKVxuICAgICAgICAgIHNlbGYuX3JlbW92ZU1hdGNoaW5nKGlkKTtcbiAgICAgIH0gZWxzZSBpZiAob3Aub3AgPT09ICdpJykge1xuICAgICAgICBpZiAoc2VsZi5fcHVibGlzaGVkLmhhcyhpZCkpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaW5zZXJ0IGZvdW5kIGZvciBhbHJlYWR5LWV4aXN0aW5nIElEIGluIHB1Ymxpc2hlZFwiKTtcbiAgICAgICAgaWYgKHNlbGYuX3VucHVibGlzaGVkQnVmZmVyICYmIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmhhcyhpZCkpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiaW5zZXJ0IGZvdW5kIGZvciBhbHJlYWR5LWV4aXN0aW5nIElEIGluIGJ1ZmZlclwiKTtcblxuICAgICAgICAvLyBYWFggd2hhdCBpZiBzZWxlY3RvciB5aWVsZHM/ICBmb3Igbm93IGl0IGNhbid0IGJ1dCBsYXRlciBpdCBjb3VsZFxuICAgICAgICAvLyBoYXZlICR3aGVyZVxuICAgICAgICBpZiAoc2VsZi5fbWF0Y2hlci5kb2N1bWVudE1hdGNoZXMob3AubykucmVzdWx0KVxuICAgICAgICAgIHNlbGYuX2FkZE1hdGNoaW5nKG9wLm8pO1xuICAgICAgfSBlbHNlIGlmIChvcC5vcCA9PT0gJ3UnKSB7XG4gICAgICAgIC8vIElzIHRoaXMgYSBtb2RpZmllciAoJHNldC8kdW5zZXQsIHdoaWNoIG1heSByZXF1aXJlIHVzIHRvIHBvbGwgdGhlXG4gICAgICAgIC8vIGRhdGFiYXNlIHRvIGZpZ3VyZSBvdXQgaWYgdGhlIHdob2xlIGRvY3VtZW50IG1hdGNoZXMgdGhlIHNlbGVjdG9yKSBvclxuICAgICAgICAvLyBhIHJlcGxhY2VtZW50IChpbiB3aGljaCBjYXNlIHdlIGNhbiBqdXN0IGRpcmVjdGx5IHJlLWV2YWx1YXRlIHRoZVxuICAgICAgICAvLyBzZWxlY3Rvcik/XG4gICAgICAgIHZhciBpc1JlcGxhY2UgPSAhXy5oYXMob3AubywgJyRzZXQnKSAmJiAhXy5oYXMob3AubywgJyR1bnNldCcpO1xuICAgICAgICAvLyBJZiB0aGlzIG1vZGlmaWVyIG1vZGlmaWVzIHNvbWV0aGluZyBpbnNpZGUgYW4gRUpTT04gY3VzdG9tIHR5cGUgKGllLFxuICAgICAgICAvLyBhbnl0aGluZyB3aXRoIEVKU09OJCksIHRoZW4gd2UgY2FuJ3QgdHJ5IHRvIHVzZVxuICAgICAgICAvLyBMb2NhbENvbGxlY3Rpb24uX21vZGlmeSwgc2luY2UgdGhhdCBqdXN0IG11dGF0ZXMgdGhlIEVKU09OIGVuY29kaW5nLFxuICAgICAgICAvLyBub3QgdGhlIGFjdHVhbCBvYmplY3QuXG4gICAgICAgIHZhciBjYW5EaXJlY3RseU1vZGlmeURvYyA9XG4gICAgICAgICAgIWlzUmVwbGFjZSAmJiBtb2RpZmllckNhbkJlRGlyZWN0bHlBcHBsaWVkKG9wLm8pO1xuXG4gICAgICAgIHZhciBwdWJsaXNoZWRCZWZvcmUgPSBzZWxmLl9wdWJsaXNoZWQuaGFzKGlkKTtcbiAgICAgICAgdmFyIGJ1ZmZlcmVkQmVmb3JlID0gc2VsZi5fbGltaXQgJiYgc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuaGFzKGlkKTtcblxuICAgICAgICBpZiAoaXNSZXBsYWNlKSB7XG4gICAgICAgICAgc2VsZi5faGFuZGxlRG9jKGlkLCBfLmV4dGVuZCh7X2lkOiBpZH0sIG9wLm8pKTtcbiAgICAgICAgfSBlbHNlIGlmICgocHVibGlzaGVkQmVmb3JlIHx8IGJ1ZmZlcmVkQmVmb3JlKSAmJlxuICAgICAgICAgICAgICAgICAgIGNhbkRpcmVjdGx5TW9kaWZ5RG9jKSB7XG4gICAgICAgICAgLy8gT2ggZ3JlYXQsIHdlIGFjdHVhbGx5IGtub3cgd2hhdCB0aGUgZG9jdW1lbnQgaXMsIHNvIHdlIGNhbiBhcHBseVxuICAgICAgICAgIC8vIHRoaXMgZGlyZWN0bHkuXG4gICAgICAgICAgdmFyIG5ld0RvYyA9IHNlbGYuX3B1Ymxpc2hlZC5oYXMoaWQpXG4gICAgICAgICAgICA/IHNlbGYuX3B1Ymxpc2hlZC5nZXQoaWQpIDogc2VsZi5fdW5wdWJsaXNoZWRCdWZmZXIuZ2V0KGlkKTtcbiAgICAgICAgICBuZXdEb2MgPSBFSlNPTi5jbG9uZShuZXdEb2MpO1xuXG4gICAgICAgICAgbmV3RG9jLl9pZCA9IGlkO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBMb2NhbENvbGxlY3Rpb24uX21vZGlmeShuZXdEb2MsIG9wLm8pO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChlLm5hbWUgIT09IFwiTWluaW1vbmdvRXJyb3JcIilcbiAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgIC8vIFdlIGRpZG4ndCB1bmRlcnN0YW5kIHRoZSBtb2RpZmllci4gIFJlLWZldGNoLlxuICAgICAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2guc2V0KGlkLCBvcCk7XG4gICAgICAgICAgICBpZiAoc2VsZi5fcGhhc2UgPT09IFBIQVNFLlNURUFEWSkge1xuICAgICAgICAgICAgICBzZWxmLl9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHNlbGYuX2hhbmRsZURvYyhpZCwgc2VsZi5fc2hhcmVkUHJvamVjdGlvbkZuKG5ld0RvYykpO1xuICAgICAgICB9IGVsc2UgaWYgKCFjYW5EaXJlY3RseU1vZGlmeURvYyB8fFxuICAgICAgICAgICAgICAgICAgIHNlbGYuX21hdGNoZXIuY2FuQmVjb21lVHJ1ZUJ5TW9kaWZpZXIob3AubykgfHxcbiAgICAgICAgICAgICAgICAgICAoc2VsZi5fc29ydGVyICYmIHNlbGYuX3NvcnRlci5hZmZlY3RlZEJ5TW9kaWZpZXIob3AubykpKSB7XG4gICAgICAgICAgc2VsZi5fbmVlZFRvRmV0Y2guc2V0KGlkLCBvcCk7XG4gICAgICAgICAgaWYgKHNlbGYuX3BoYXNlID09PSBQSEFTRS5TVEVBRFkpXG4gICAgICAgICAgICBzZWxmLl9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzKCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IEVycm9yKFwiWFhYIFNVUlBSSVNJTkcgT1BFUkFUSU9OOiBcIiArIG9wKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcbiAgLy8gWWllbGRzIVxuICBfcnVuSW5pdGlhbFF1ZXJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwib3Bsb2cgc3RvcHBlZCBzdXJwcmlzaW5nbHkgZWFybHlcIik7XG5cbiAgICBzZWxmLl9ydW5RdWVyeSh7aW5pdGlhbDogdHJ1ZX0pOyAgLy8geWllbGRzXG5cbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjsgIC8vIGNhbiBoYXBwZW4gb24gcXVlcnlFcnJvclxuXG4gICAgLy8gQWxsb3cgb2JzZXJ2ZUNoYW5nZXMgY2FsbHMgdG8gcmV0dXJuLiAoQWZ0ZXIgdGhpcywgaXQncyBwb3NzaWJsZSBmb3JcbiAgICAvLyBzdG9wKCkgdG8gYmUgY2FsbGVkLilcbiAgICBzZWxmLl9tdWx0aXBsZXhlci5yZWFkeSgpO1xuXG4gICAgc2VsZi5fZG9uZVF1ZXJ5aW5nKCk7ICAvLyB5aWVsZHNcbiAgfSxcblxuICAvLyBJbiB2YXJpb3VzIGNpcmN1bXN0YW5jZXMsIHdlIG1heSBqdXN0IHdhbnQgdG8gc3RvcCBwcm9jZXNzaW5nIHRoZSBvcGxvZyBhbmRcbiAgLy8gcmUtcnVuIHRoZSBpbml0aWFsIHF1ZXJ5LCBqdXN0IGFzIGlmIHdlIHdlcmUgYSBQb2xsaW5nT2JzZXJ2ZURyaXZlci5cbiAgLy9cbiAgLy8gVGhpcyBmdW5jdGlvbiBtYXkgbm90IGJsb2NrLCBiZWNhdXNlIGl0IGlzIGNhbGxlZCBmcm9tIGFuIG9wbG9nIGVudHJ5XG4gIC8vIGhhbmRsZXIuXG4gIC8vXG4gIC8vIFhYWCBXZSBzaG91bGQgY2FsbCB0aGlzIHdoZW4gd2UgZGV0ZWN0IHRoYXQgd2UndmUgYmVlbiBpbiBGRVRDSElORyBmb3IgXCJ0b29cbiAgLy8gbG9uZ1wiLlxuICAvL1xuICAvLyBYWFggV2Ugc2hvdWxkIGNhbGwgdGhpcyB3aGVuIHdlIGRldGVjdCBNb25nbyBmYWlsb3ZlciAoc2luY2UgdGhhdCBtaWdodFxuICAvLyBtZWFuIHRoYXQgc29tZSBvZiB0aGUgb3Bsb2cgZW50cmllcyB3ZSBoYXZlIHByb2Nlc3NlZCBoYXZlIGJlZW4gcm9sbGVkXG4gIC8vIGJhY2spLiBUaGUgTm9kZSBNb25nbyBkcml2ZXIgaXMgaW4gdGhlIG1pZGRsZSBvZiBhIGJ1bmNoIG9mIGh1Z2VcbiAgLy8gcmVmYWN0b3JpbmdzLCBpbmNsdWRpbmcgdGhlIHdheSB0aGF0IGl0IG5vdGlmaWVzIHlvdSB3aGVuIHByaW1hcnlcbiAgLy8gY2hhbmdlcy4gV2lsbCBwdXQgb2ZmIGltcGxlbWVudGluZyB0aGlzIHVudGlsIGRyaXZlciAxLjQgaXMgb3V0LlxuICBfcG9sbFF1ZXJ5OiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgICByZXR1cm47XG5cbiAgICAgIC8vIFlheSwgd2UgZ2V0IHRvIGZvcmdldCBhYm91dCBhbGwgdGhlIHRoaW5ncyB3ZSB0aG91Z2h0IHdlIGhhZCB0byBmZXRjaC5cbiAgICAgIHNlbGYuX25lZWRUb0ZldGNoID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgICBzZWxmLl9jdXJyZW50bHlGZXRjaGluZyA9IG51bGw7XG4gICAgICArK3NlbGYuX2ZldGNoR2VuZXJhdGlvbjsgIC8vIGlnbm9yZSBhbnkgaW4tZmxpZ2h0IGZldGNoZXNcbiAgICAgIHNlbGYuX3JlZ2lzdGVyUGhhc2VDaGFuZ2UoUEhBU0UuUVVFUllJTkcpO1xuXG4gICAgICAvLyBEZWZlciBzbyB0aGF0IHdlIGRvbid0IHlpZWxkLiAgV2UgZG9uJ3QgbmVlZCBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeVxuICAgICAgLy8gaGVyZSBiZWNhdXNlIFN3aXRjaGVkVG9RdWVyeSBpcyBub3QgdGhyb3duIGluIFFVRVJZSU5HIG1vZGUuXG4gICAgICBNZXRlb3IuZGVmZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLl9ydW5RdWVyeSgpO1xuICAgICAgICBzZWxmLl9kb25lUXVlcnlpbmcoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFlpZWxkcyFcbiAgX3J1blF1ZXJ5OiBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgbmV3UmVzdWx0cywgbmV3QnVmZmVyO1xuXG4gICAgLy8gVGhpcyB3aGlsZSBsb29wIGlzIGp1c3QgdG8gcmV0cnkgZmFpbHVyZXMuXG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIC8vIElmIHdlJ3ZlIGJlZW4gc3RvcHBlZCwgd2UgZG9uJ3QgaGF2ZSB0byBydW4gYW55dGhpbmcgYW55IG1vcmUuXG4gICAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgICAgcmV0dXJuO1xuXG4gICAgICBuZXdSZXN1bHRzID0gbmV3IExvY2FsQ29sbGVjdGlvbi5fSWRNYXA7XG4gICAgICBuZXdCdWZmZXIgPSBuZXcgTG9jYWxDb2xsZWN0aW9uLl9JZE1hcDtcblxuICAgICAgLy8gUXVlcnkgMnggZG9jdW1lbnRzIGFzIHRoZSBoYWxmIGV4Y2x1ZGVkIGZyb20gdGhlIG9yaWdpbmFsIHF1ZXJ5IHdpbGwgZ29cbiAgICAgIC8vIGludG8gdW5wdWJsaXNoZWQgYnVmZmVyIHRvIHJlZHVjZSBhZGRpdGlvbmFsIE1vbmdvIGxvb2t1cHMgaW4gY2FzZXNcbiAgICAgIC8vIHdoZW4gZG9jdW1lbnRzIGFyZSByZW1vdmVkIGZyb20gdGhlIHB1Ymxpc2hlZCBzZXQgYW5kIG5lZWQgYVxuICAgICAgLy8gcmVwbGFjZW1lbnQuXG4gICAgICAvLyBYWFggbmVlZHMgbW9yZSB0aG91Z2h0IG9uIG5vbi16ZXJvIHNraXBcbiAgICAgIC8vIFhYWCAyIGlzIGEgXCJtYWdpYyBudW1iZXJcIiBtZWFuaW5nIHRoZXJlIGlzIGFuIGV4dHJhIGNodW5rIG9mIGRvY3MgZm9yXG4gICAgICAvLyBidWZmZXIgaWYgc3VjaCBpcyBuZWVkZWQuXG4gICAgICB2YXIgY3Vyc29yID0gc2VsZi5fY3Vyc29yRm9yUXVlcnkoeyBsaW1pdDogc2VsZi5fbGltaXQgKiAyIH0pO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY3Vyc29yLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaSkgeyAgLy8geWllbGRzXG4gICAgICAgICAgaWYgKCFzZWxmLl9saW1pdCB8fCBpIDwgc2VsZi5fbGltaXQpIHtcbiAgICAgICAgICAgIG5ld1Jlc3VsdHMuc2V0KGRvYy5faWQsIGRvYyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG5ld0J1ZmZlci5zZXQoZG9jLl9pZCwgZG9jKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKG9wdGlvbnMuaW5pdGlhbCAmJiB0eXBlb2YoZS5jb2RlKSA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAvLyBUaGlzIGlzIGFuIGVycm9yIGRvY3VtZW50IHNlbnQgdG8gdXMgYnkgbW9uZ29kLCBub3QgYSBjb25uZWN0aW9uXG4gICAgICAgICAgLy8gZXJyb3IgZ2VuZXJhdGVkIGJ5IHRoZSBjbGllbnQuIEFuZCB3ZSd2ZSBuZXZlciBzZWVuIHRoaXMgcXVlcnkgd29ya1xuICAgICAgICAgIC8vIHN1Y2Nlc3NmdWxseS4gUHJvYmFibHkgaXQncyBhIGJhZCBzZWxlY3RvciBvciBzb21ldGhpbmcsIHNvIHdlXG4gICAgICAgICAgLy8gc2hvdWxkIE5PVCByZXRyeS4gSW5zdGVhZCwgd2Ugc2hvdWxkIGhhbHQgdGhlIG9ic2VydmUgKHdoaWNoIGVuZHNcbiAgICAgICAgICAvLyB1cCBjYWxsaW5nIGBzdG9wYCBvbiB1cykuXG4gICAgICAgICAgc2VsZi5fbXVsdGlwbGV4ZXIucXVlcnlFcnJvcihlKTtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEdXJpbmcgZmFpbG92ZXIgKGVnKSBpZiB3ZSBnZXQgYW4gZXhjZXB0aW9uIHdlIHNob3VsZCBsb2cgYW5kIHJldHJ5XG4gICAgICAgIC8vIGluc3RlYWQgb2YgY3Jhc2hpbmcuXG4gICAgICAgIE1ldGVvci5fZGVidWcoXCJHb3QgZXhjZXB0aW9uIHdoaWxlIHBvbGxpbmcgcXVlcnlcIiwgZSk7XG4gICAgICAgIE1ldGVvci5fc2xlZXBGb3JNcygxMDApO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChzZWxmLl9zdG9wcGVkKVxuICAgICAgcmV0dXJuO1xuXG4gICAgc2VsZi5fcHVibGlzaE5ld1Jlc3VsdHMobmV3UmVzdWx0cywgbmV3QnVmZmVyKTtcbiAgfSxcblxuICAvLyBUcmFuc2l0aW9ucyB0byBRVUVSWUlORyBhbmQgcnVucyBhbm90aGVyIHF1ZXJ5LCBvciAoaWYgYWxyZWFkeSBpbiBRVUVSWUlORylcbiAgLy8gZW5zdXJlcyB0aGF0IHdlIHdpbGwgcXVlcnkgYWdhaW4gbGF0ZXIuXG4gIC8vXG4gIC8vIFRoaXMgZnVuY3Rpb24gbWF5IG5vdCBibG9jaywgYmVjYXVzZSBpdCBpcyBjYWxsZWQgZnJvbSBhbiBvcGxvZyBlbnRyeVxuICAvLyBoYW5kbGVyLiBIb3dldmVyLCBpZiB3ZSB3ZXJlIG5vdCBhbHJlYWR5IGluIHRoZSBRVUVSWUlORyBwaGFzZSwgaXQgdGhyb3dzXG4gIC8vIGFuIGV4Y2VwdGlvbiB0aGF0IGlzIGNhdWdodCBieSB0aGUgY2xvc2VzdCBzdXJyb3VuZGluZ1xuICAvLyBmaW5pc2hJZk5lZWRUb1BvbGxRdWVyeSBjYWxsOyB0aGlzIGVuc3VyZXMgdGhhdCB3ZSBkb24ndCBjb250aW51ZSBydW5uaW5nXG4gIC8vIGNsb3NlIHRoYXQgd2FzIGRlc2lnbmVkIGZvciBhbm90aGVyIHBoYXNlIGluc2lkZSBQSEFTRS5RVUVSWUlORy5cbiAgLy9cbiAgLy8gKEl0J3MgYWxzbyBuZWNlc3Nhcnkgd2hlbmV2ZXIgbG9naWMgaW4gdGhpcyBmaWxlIHlpZWxkcyB0byBjaGVjayB0aGF0IG90aGVyXG4gIC8vIHBoYXNlcyBoYXZlbid0IHB1dCB1cyBpbnRvIFFVRVJZSU5HIG1vZGUsIHRob3VnaDsgZWcsXG4gIC8vIF9mZXRjaE1vZGlmaWVkRG9jdW1lbnRzIGRvZXMgdGhpcy4pXG4gIF9uZWVkVG9Qb2xsUXVlcnk6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICAgIHJldHVybjtcblxuICAgICAgLy8gSWYgd2UncmUgbm90IGFscmVhZHkgaW4gdGhlIG1pZGRsZSBvZiBhIHF1ZXJ5LCB3ZSBjYW4gcXVlcnkgbm93XG4gICAgICAvLyAocG9zc2libHkgcGF1c2luZyBGRVRDSElORykuXG4gICAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKSB7XG4gICAgICAgIHNlbGYuX3BvbGxRdWVyeSgpO1xuICAgICAgICB0aHJvdyBuZXcgU3dpdGNoZWRUb1F1ZXJ5O1xuICAgICAgfVxuXG4gICAgICAvLyBXZSdyZSBjdXJyZW50bHkgaW4gUVVFUllJTkcuIFNldCBhIGZsYWcgdG8gZW5zdXJlIHRoYXQgd2UgcnVuIGFub3RoZXJcbiAgICAgIC8vIHF1ZXJ5IHdoZW4gd2UncmUgZG9uZS5cbiAgICAgIHNlbGYuX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSA9IHRydWU7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8gWWllbGRzIVxuICBfZG9uZVF1ZXJ5aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fbW9uZ29IYW5kbGUuX29wbG9nSGFuZGxlLndhaXRVbnRpbENhdWdodFVwKCk7ICAvLyB5aWVsZHNcbiAgICBpZiAoc2VsZi5fc3RvcHBlZClcbiAgICAgIHJldHVybjtcbiAgICBpZiAoc2VsZi5fcGhhc2UgIT09IFBIQVNFLlFVRVJZSU5HKVxuICAgICAgdGhyb3cgRXJyb3IoXCJQaGFzZSB1bmV4cGVjdGVkbHkgXCIgKyBzZWxmLl9waGFzZSk7XG5cbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoc2VsZi5fcmVxdWVyeVdoZW5Eb25lVGhpc1F1ZXJ5KSB7XG4gICAgICAgIHNlbGYuX3JlcXVlcnlXaGVuRG9uZVRoaXNRdWVyeSA9IGZhbHNlO1xuICAgICAgICBzZWxmLl9wb2xsUXVlcnkoKTtcbiAgICAgIH0gZWxzZSBpZiAoc2VsZi5fbmVlZFRvRmV0Y2guZW1wdHkoKSkge1xuICAgICAgICBzZWxmLl9iZVN0ZWFkeSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2VsZi5fZmV0Y2hNb2RpZmllZERvY3VtZW50cygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIF9jdXJzb3JGb3JRdWVyeTogZnVuY3Rpb24gKG9wdGlvbnNPdmVyd3JpdGUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcmV0dXJuIE1ldGVvci5fbm9ZaWVsZHNBbGxvd2VkKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIFRoZSBxdWVyeSB3ZSBydW4gaXMgYWxtb3N0IHRoZSBzYW1lIGFzIHRoZSBjdXJzb3Igd2UgYXJlIG9ic2VydmluZyxcbiAgICAgIC8vIHdpdGggYSBmZXcgY2hhbmdlcy4gV2UgbmVlZCB0byByZWFkIGFsbCB0aGUgZmllbGRzIHRoYXQgYXJlIHJlbGV2YW50IHRvXG4gICAgICAvLyB0aGUgc2VsZWN0b3IsIG5vdCBqdXN0IHRoZSBmaWVsZHMgd2UgYXJlIGdvaW5nIHRvIHB1Ymxpc2ggKHRoYXQncyB0aGVcbiAgICAgIC8vIFwic2hhcmVkXCIgcHJvamVjdGlvbikuIEFuZCB3ZSBkb24ndCB3YW50IHRvIGFwcGx5IGFueSB0cmFuc2Zvcm0gaW4gdGhlXG4gICAgICAvLyBjdXJzb3IsIGJlY2F1c2Ugb2JzZXJ2ZUNoYW5nZXMgc2hvdWxkbid0IHVzZSB0aGUgdHJhbnNmb3JtLlxuICAgICAgdmFyIG9wdGlvbnMgPSBfLmNsb25lKHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnMpO1xuXG4gICAgICAvLyBBbGxvdyB0aGUgY2FsbGVyIHRvIG1vZGlmeSB0aGUgb3B0aW9ucy4gVXNlZnVsIHRvIHNwZWNpZnkgZGlmZmVyZW50XG4gICAgICAvLyBza2lwIGFuZCBsaW1pdCB2YWx1ZXMuXG4gICAgICBfLmV4dGVuZChvcHRpb25zLCBvcHRpb25zT3ZlcndyaXRlKTtcblxuICAgICAgb3B0aW9ucy5maWVsZHMgPSBzZWxmLl9zaGFyZWRQcm9qZWN0aW9uO1xuICAgICAgZGVsZXRlIG9wdGlvbnMudHJhbnNmb3JtO1xuICAgICAgLy8gV2UgYXJlIE5PVCBkZWVwIGNsb25pbmcgZmllbGRzIG9yIHNlbGVjdG9yIGhlcmUsIHdoaWNoIHNob3VsZCBiZSBPSy5cbiAgICAgIHZhciBkZXNjcmlwdGlvbiA9IG5ldyBDdXJzb3JEZXNjcmlwdGlvbihcbiAgICAgICAgc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uY29sbGVjdGlvbk5hbWUsXG4gICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uLnNlbGVjdG9yLFxuICAgICAgICBvcHRpb25zKTtcbiAgICAgIHJldHVybiBuZXcgQ3Vyc29yKHNlbGYuX21vbmdvSGFuZGxlLCBkZXNjcmlwdGlvbik7XG4gICAgfSk7XG4gIH0sXG5cblxuICAvLyBSZXBsYWNlIHNlbGYuX3B1Ymxpc2hlZCB3aXRoIG5ld1Jlc3VsdHMgKGJvdGggYXJlIElkTWFwcyksIGludm9raW5nIG9ic2VydmVcbiAgLy8gY2FsbGJhY2tzIG9uIHRoZSBtdWx0aXBsZXhlci5cbiAgLy8gUmVwbGFjZSBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciB3aXRoIG5ld0J1ZmZlci5cbiAgLy9cbiAgLy8gWFhYIFRoaXMgaXMgdmVyeSBzaW1pbGFyIHRvIExvY2FsQ29sbGVjdGlvbi5fZGlmZlF1ZXJ5VW5vcmRlcmVkQ2hhbmdlcy4gV2VcbiAgLy8gc2hvdWxkIHJlYWxseTogKGEpIFVuaWZ5IElkTWFwIGFuZCBPcmRlcmVkRGljdCBpbnRvIFVub3JkZXJlZC9PcmRlcmVkRGljdFxuICAvLyAoYikgUmV3cml0ZSBkaWZmLmpzIHRvIHVzZSB0aGVzZSBjbGFzc2VzIGluc3RlYWQgb2YgYXJyYXlzIGFuZCBvYmplY3RzLlxuICBfcHVibGlzaE5ld1Jlc3VsdHM6IGZ1bmN0aW9uIChuZXdSZXN1bHRzLCBuZXdCdWZmZXIpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoZnVuY3Rpb24gKCkge1xuXG4gICAgICAvLyBJZiB0aGUgcXVlcnkgaXMgbGltaXRlZCBhbmQgdGhlcmUgaXMgYSBidWZmZXIsIHNodXQgZG93biBzbyBpdCBkb2Vzbid0XG4gICAgICAvLyBzdGF5IGluIGEgd2F5LlxuICAgICAgaWYgKHNlbGYuX2xpbWl0KSB7XG4gICAgICAgIHNlbGYuX3VucHVibGlzaGVkQnVmZmVyLmNsZWFyKCk7XG4gICAgICB9XG5cbiAgICAgIC8vIEZpcnN0IHJlbW92ZSBhbnl0aGluZyB0aGF0J3MgZ29uZS4gQmUgY2FyZWZ1bCBub3QgdG8gbW9kaWZ5XG4gICAgICAvLyBzZWxmLl9wdWJsaXNoZWQgd2hpbGUgaXRlcmF0aW5nIG92ZXIgaXQuXG4gICAgICB2YXIgaWRzVG9SZW1vdmUgPSBbXTtcbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5mb3JFYWNoKGZ1bmN0aW9uIChkb2MsIGlkKSB7XG4gICAgICAgIGlmICghbmV3UmVzdWx0cy5oYXMoaWQpKVxuICAgICAgICAgIGlkc1RvUmVtb3ZlLnB1c2goaWQpO1xuICAgICAgfSk7XG4gICAgICBfLmVhY2goaWRzVG9SZW1vdmUsIGZ1bmN0aW9uIChpZCkge1xuICAgICAgICBzZWxmLl9yZW1vdmVQdWJsaXNoZWQoaWQpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIE5vdyBkbyBhZGRzIGFuZCBjaGFuZ2VzLlxuICAgICAgLy8gSWYgc2VsZiBoYXMgYSBidWZmZXIgYW5kIGxpbWl0LCB0aGUgbmV3IGZldGNoZWQgcmVzdWx0IHdpbGwgYmVcbiAgICAgIC8vIGxpbWl0ZWQgY29ycmVjdGx5IGFzIHRoZSBxdWVyeSBoYXMgc29ydCBzcGVjaWZpZXIuXG4gICAgICBuZXdSZXN1bHRzLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgc2VsZi5faGFuZGxlRG9jKGlkLCBkb2MpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFNhbml0eS1jaGVjayB0aGF0IGV2ZXJ5dGhpbmcgd2UgdHJpZWQgdG8gcHV0IGludG8gX3B1Ymxpc2hlZCBlbmRlZCB1cFxuICAgICAgLy8gdGhlcmUuXG4gICAgICAvLyBYWFggaWYgdGhpcyBpcyBzbG93LCByZW1vdmUgaXQgbGF0ZXJcbiAgICAgIGlmIChzZWxmLl9wdWJsaXNoZWQuc2l6ZSgpICE9PSBuZXdSZXN1bHRzLnNpemUoKSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdUaGUgTW9uZ28gc2VydmVyIGFuZCB0aGUgTWV0ZW9yIHF1ZXJ5IGRpc2FncmVlIG9uIGhvdyAnICtcbiAgICAgICAgICAnbWFueSBkb2N1bWVudHMgbWF0Y2ggeW91ciBxdWVyeS4gQ3Vyc29yIGRlc2NyaXB0aW9uOiAnLFxuICAgICAgICAgIHNlbGYuX2N1cnNvckRlc2NyaXB0aW9uKTtcbiAgICAgICAgdGhyb3cgRXJyb3IoXG4gICAgICAgICAgXCJUaGUgTW9uZ28gc2VydmVyIGFuZCB0aGUgTWV0ZW9yIHF1ZXJ5IGRpc2FncmVlIG9uIGhvdyBcIiArXG4gICAgICAgICAgICBcIm1hbnkgZG9jdW1lbnRzIG1hdGNoIHlvdXIgcXVlcnkuIE1heWJlIGl0IGlzIGhpdHRpbmcgYSBNb25nbyBcIiArXG4gICAgICAgICAgICBcImVkZ2UgY2FzZT8gVGhlIHF1ZXJ5IGlzOiBcIiArXG4gICAgICAgICAgICBFSlNPTi5zdHJpbmdpZnkoc2VsZi5fY3Vyc29yRGVzY3JpcHRpb24uc2VsZWN0b3IpKTtcbiAgICAgIH1cbiAgICAgIHNlbGYuX3B1Ymxpc2hlZC5mb3JFYWNoKGZ1bmN0aW9uIChkb2MsIGlkKSB7XG4gICAgICAgIGlmICghbmV3UmVzdWx0cy5oYXMoaWQpKVxuICAgICAgICAgIHRocm93IEVycm9yKFwiX3B1Ymxpc2hlZCBoYXMgYSBkb2MgdGhhdCBuZXdSZXN1bHRzIGRvZXNuJ3Q7IFwiICsgaWQpO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIEZpbmFsbHksIHJlcGxhY2UgdGhlIGJ1ZmZlclxuICAgICAgbmV3QnVmZmVyLmZvckVhY2goZnVuY3Rpb24gKGRvYywgaWQpIHtcbiAgICAgICAgc2VsZi5fYWRkQnVmZmVyZWQoaWQsIGRvYyk7XG4gICAgICB9KTtcblxuICAgICAgc2VsZi5fc2FmZUFwcGVuZFRvQnVmZmVyID0gbmV3QnVmZmVyLnNpemUoKSA8IHNlbGYuX2xpbWl0O1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIFRoaXMgc3RvcCBmdW5jdGlvbiBpcyBpbnZva2VkIGZyb20gdGhlIG9uU3RvcCBvZiB0aGUgT2JzZXJ2ZU11bHRpcGxleGVyLCBzb1xuICAvLyBpdCBzaG91bGRuJ3QgYWN0dWFsbHkgYmUgcG9zc2libGUgdG8gY2FsbCBpdCB1bnRpbCB0aGUgbXVsdGlwbGV4ZXIgaXNcbiAgLy8gcmVhZHkuXG4gIC8vXG4gIC8vIEl0J3MgaW1wb3J0YW50IHRvIGNoZWNrIHNlbGYuX3N0b3BwZWQgYWZ0ZXIgZXZlcnkgY2FsbCBpbiB0aGlzIGZpbGUgdGhhdFxuICAvLyBjYW4geWllbGQhXG4gIHN0b3A6IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKHNlbGYuX3N0b3BwZWQpXG4gICAgICByZXR1cm47XG4gICAgc2VsZi5fc3RvcHBlZCA9IHRydWU7XG4gICAgXy5lYWNoKHNlbGYuX3N0b3BIYW5kbGVzLCBmdW5jdGlvbiAoaGFuZGxlKSB7XG4gICAgICBoYW5kbGUuc3RvcCgpO1xuICAgIH0pO1xuXG4gICAgLy8gTm90ZTogd2UgKmRvbid0KiB1c2UgbXVsdGlwbGV4ZXIub25GbHVzaCBoZXJlIGJlY2F1c2UgdGhpcyBzdG9wXG4gICAgLy8gY2FsbGJhY2sgaXMgYWN0dWFsbHkgaW52b2tlZCBieSB0aGUgbXVsdGlwbGV4ZXIgaXRzZWxmIHdoZW4gaXQgaGFzXG4gICAgLy8gZGV0ZXJtaW5lZCB0aGF0IHRoZXJlIGFyZSBubyBoYW5kbGVzIGxlZnQuIFNvIG5vdGhpbmcgaXMgYWN0dWFsbHkgZ29pbmdcbiAgICAvLyB0byBnZXQgZmx1c2hlZCAoYW5kIGl0J3MgcHJvYmFibHkgbm90IHZhbGlkIHRvIGNhbGwgbWV0aG9kcyBvbiB0aGVcbiAgICAvLyBkeWluZyBtdWx0aXBsZXhlcikuXG4gICAgXy5lYWNoKHNlbGYuX3dyaXRlc1RvQ29tbWl0V2hlbldlUmVhY2hTdGVhZHksIGZ1bmN0aW9uICh3KSB7XG4gICAgICB3LmNvbW1pdHRlZCgpOyAgLy8gbWF5YmUgeWllbGRzP1xuICAgIH0pO1xuICAgIHNlbGYuX3dyaXRlc1RvQ29tbWl0V2hlbldlUmVhY2hTdGVhZHkgPSBudWxsO1xuXG4gICAgLy8gUHJvYWN0aXZlbHkgZHJvcCByZWZlcmVuY2VzIHRvIHBvdGVudGlhbGx5IGJpZyB0aGluZ3MuXG4gICAgc2VsZi5fcHVibGlzaGVkID0gbnVsbDtcbiAgICBzZWxmLl91bnB1Ymxpc2hlZEJ1ZmZlciA9IG51bGw7XG4gICAgc2VsZi5fbmVlZFRvRmV0Y2ggPSBudWxsO1xuICAgIHNlbGYuX2N1cnJlbnRseUZldGNoaW5nID0gbnVsbDtcbiAgICBzZWxmLl9vcGxvZ0VudHJ5SGFuZGxlID0gbnVsbDtcbiAgICBzZWxmLl9saXN0ZW5lcnNIYW5kbGUgPSBudWxsO1xuXG4gICAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgXCJtb25nby1saXZlZGF0YVwiLCBcIm9ic2VydmUtZHJpdmVycy1vcGxvZ1wiLCAtMSk7XG4gIH0sXG5cbiAgX3JlZ2lzdGVyUGhhc2VDaGFuZ2U6IGZ1bmN0aW9uIChwaGFzZSkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBNZXRlb3IuX25vWWllbGRzQWxsb3dlZChmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbm93ID0gbmV3IERhdGU7XG5cbiAgICAgIGlmIChzZWxmLl9waGFzZSkge1xuICAgICAgICB2YXIgdGltZURpZmYgPSBub3cgLSBzZWxmLl9waGFzZVN0YXJ0VGltZTtcbiAgICAgICAgUGFja2FnZVsnZmFjdHMtYmFzZSddICYmIFBhY2thZ2VbJ2ZhY3RzLWJhc2UnXS5GYWN0cy5pbmNyZW1lbnRTZXJ2ZXJGYWN0KFxuICAgICAgICAgIFwibW9uZ28tbGl2ZWRhdGFcIiwgXCJ0aW1lLXNwZW50LWluLVwiICsgc2VsZi5fcGhhc2UgKyBcIi1waGFzZVwiLCB0aW1lRGlmZik7XG4gICAgICB9XG5cbiAgICAgIHNlbGYuX3BoYXNlID0gcGhhc2U7XG4gICAgICBzZWxmLl9waGFzZVN0YXJ0VGltZSA9IG5vdztcbiAgICB9KTtcbiAgfVxufSk7XG5cbi8vIERvZXMgb3VyIG9wbG9nIHRhaWxpbmcgY29kZSBzdXBwb3J0IHRoaXMgY3Vyc29yPyBGb3Igbm93LCB3ZSBhcmUgYmVpbmcgdmVyeVxuLy8gY29uc2VydmF0aXZlIGFuZCBhbGxvd2luZyBvbmx5IHNpbXBsZSBxdWVyaWVzIHdpdGggc2ltcGxlIG9wdGlvbnMuXG4vLyAoVGhpcyBpcyBhIFwic3RhdGljIG1ldGhvZFwiLilcbk9wbG9nT2JzZXJ2ZURyaXZlci5jdXJzb3JTdXBwb3J0ZWQgPSBmdW5jdGlvbiAoY3Vyc29yRGVzY3JpcHRpb24sIG1hdGNoZXIpIHtcbiAgLy8gRmlyc3QsIGNoZWNrIHRoZSBvcHRpb25zLlxuICB2YXIgb3B0aW9ucyA9IGN1cnNvckRlc2NyaXB0aW9uLm9wdGlvbnM7XG5cbiAgLy8gRGlkIHRoZSB1c2VyIHNheSBubyBleHBsaWNpdGx5P1xuICAvLyB1bmRlcnNjb3JlZCB2ZXJzaW9uIG9mIHRoZSBvcHRpb24gaXMgQ09NUEFUIHdpdGggMS4yXG4gIGlmIChvcHRpb25zLmRpc2FibGVPcGxvZyB8fCBvcHRpb25zLl9kaXNhYmxlT3Bsb2cpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIC8vIHNraXAgaXMgbm90IHN1cHBvcnRlZDogdG8gc3VwcG9ydCBpdCB3ZSB3b3VsZCBuZWVkIHRvIGtlZXAgdHJhY2sgb2YgYWxsXG4gIC8vIFwic2tpcHBlZFwiIGRvY3VtZW50cyBvciBhdCBsZWFzdCB0aGVpciBpZHMuXG4gIC8vIGxpbWl0IHcvbyBhIHNvcnQgc3BlY2lmaWVyIGlzIG5vdCBzdXBwb3J0ZWQ6IGN1cnJlbnQgaW1wbGVtZW50YXRpb24gbmVlZHMgYVxuICAvLyBkZXRlcm1pbmlzdGljIHdheSB0byBvcmRlciBkb2N1bWVudHMuXG4gIGlmIChvcHRpb25zLnNraXAgfHwgKG9wdGlvbnMubGltaXQgJiYgIW9wdGlvbnMuc29ydCkpIHJldHVybiBmYWxzZTtcblxuICAvLyBJZiBhIGZpZWxkcyBwcm9qZWN0aW9uIG9wdGlvbiBpcyBnaXZlbiBjaGVjayBpZiBpdCBpcyBzdXBwb3J0ZWQgYnlcbiAgLy8gbWluaW1vbmdvIChzb21lIG9wZXJhdG9ycyBhcmUgbm90IHN1cHBvcnRlZCkuXG4gIGlmIChvcHRpb25zLmZpZWxkcykge1xuICAgIHRyeSB7XG4gICAgICBMb2NhbENvbGxlY3Rpb24uX2NoZWNrU3VwcG9ydGVkUHJvamVjdGlvbihvcHRpb25zLmZpZWxkcyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGUubmFtZSA9PT0gXCJNaW5pbW9uZ29FcnJvclwiKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IGU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gV2UgZG9uJ3QgYWxsb3cgdGhlIGZvbGxvd2luZyBzZWxlY3RvcnM6XG4gIC8vICAgLSAkd2hlcmUgKG5vdCBjb25maWRlbnQgdGhhdCB3ZSBwcm92aWRlIHRoZSBzYW1lIEpTIGVudmlyb25tZW50XG4gIC8vICAgICAgICAgICAgIGFzIE1vbmdvLCBhbmQgY2FuIHlpZWxkISlcbiAgLy8gICAtICRuZWFyIChoYXMgXCJpbnRlcmVzdGluZ1wiIHByb3BlcnRpZXMgaW4gTW9uZ29EQiwgbGlrZSB0aGUgcG9zc2liaWxpdHlcbiAgLy8gICAgICAgICAgICBvZiByZXR1cm5pbmcgYW4gSUQgbXVsdGlwbGUgdGltZXMsIHRob3VnaCBldmVuIHBvbGxpbmcgbWF5YmVcbiAgLy8gICAgICAgICAgICBoYXZlIGEgYnVnIHRoZXJlKVxuICAvLyAgICAgICAgICAgWFhYOiBvbmNlIHdlIHN1cHBvcnQgaXQsIHdlIHdvdWxkIG5lZWQgdG8gdGhpbmsgbW9yZSBvbiBob3cgd2VcbiAgLy8gICAgICAgICAgIGluaXRpYWxpemUgdGhlIGNvbXBhcmF0b3JzIHdoZW4gd2UgY3JlYXRlIHRoZSBkcml2ZXIuXG4gIHJldHVybiAhbWF0Y2hlci5oYXNXaGVyZSgpICYmICFtYXRjaGVyLmhhc0dlb1F1ZXJ5KCk7XG59O1xuXG52YXIgbW9kaWZpZXJDYW5CZURpcmVjdGx5QXBwbGllZCA9IGZ1bmN0aW9uIChtb2RpZmllcikge1xuICByZXR1cm4gXy5hbGwobW9kaWZpZXIsIGZ1bmN0aW9uIChmaWVsZHMsIG9wZXJhdGlvbikge1xuICAgIHJldHVybiBfLmFsbChmaWVsZHMsIGZ1bmN0aW9uICh2YWx1ZSwgZmllbGQpIHtcbiAgICAgIHJldHVybiAhL0VKU09OXFwkLy50ZXN0KGZpZWxkKTtcbiAgICB9KTtcbiAgfSk7XG59O1xuXG5Nb25nb0ludGVybmFscy5PcGxvZ09ic2VydmVEcml2ZXIgPSBPcGxvZ09ic2VydmVEcml2ZXI7XG4iLCIvLyBzaW5nbGV0b25cbmV4cG9ydCBjb25zdCBMb2NhbENvbGxlY3Rpb25Ecml2ZXIgPSBuZXcgKGNsYXNzIExvY2FsQ29sbGVjdGlvbkRyaXZlciB7XG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMubm9Db25uQ29sbGVjdGlvbnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB9XG5cbiAgb3BlbihuYW1lLCBjb25uKSB7XG4gICAgaWYgKCEgbmFtZSkge1xuICAgICAgcmV0dXJuIG5ldyBMb2NhbENvbGxlY3Rpb247XG4gICAgfVxuXG4gICAgaWYgKCEgY29ubikge1xuICAgICAgcmV0dXJuIGVuc3VyZUNvbGxlY3Rpb24obmFtZSwgdGhpcy5ub0Nvbm5Db2xsZWN0aW9ucyk7XG4gICAgfVxuXG4gICAgaWYgKCEgY29ubi5fbW9uZ29fbGl2ZWRhdGFfY29sbGVjdGlvbnMpIHtcbiAgICAgIGNvbm4uX21vbmdvX2xpdmVkYXRhX2NvbGxlY3Rpb25zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB9XG5cbiAgICAvLyBYWFggaXMgdGhlcmUgYSB3YXkgdG8ga2VlcCB0cmFjayBvZiBhIGNvbm5lY3Rpb24ncyBjb2xsZWN0aW9ucyB3aXRob3V0XG4gICAgLy8gZGFuZ2xpbmcgaXQgb2ZmIHRoZSBjb25uZWN0aW9uIG9iamVjdD9cbiAgICByZXR1cm4gZW5zdXJlQ29sbGVjdGlvbihuYW1lLCBjb25uLl9tb25nb19saXZlZGF0YV9jb2xsZWN0aW9ucyk7XG4gIH1cbn0pO1xuXG5mdW5jdGlvbiBlbnN1cmVDb2xsZWN0aW9uKG5hbWUsIGNvbGxlY3Rpb25zKSB7XG4gIHJldHVybiAobmFtZSBpbiBjb2xsZWN0aW9ucylcbiAgICA/IGNvbGxlY3Rpb25zW25hbWVdXG4gICAgOiBjb2xsZWN0aW9uc1tuYW1lXSA9IG5ldyBMb2NhbENvbGxlY3Rpb24obmFtZSk7XG59XG4iLCJNb25nb0ludGVybmFscy5SZW1vdGVDb2xsZWN0aW9uRHJpdmVyID0gZnVuY3Rpb24gKFxuICBtb25nb191cmwsIG9wdGlvbnMpIHtcbiAgdmFyIHNlbGYgPSB0aGlzO1xuICBzZWxmLm1vbmdvID0gbmV3IE1vbmdvQ29ubmVjdGlvbihtb25nb191cmwsIG9wdGlvbnMpO1xufTtcblxuXy5leHRlbmQoTW9uZ29JbnRlcm5hbHMuUmVtb3RlQ29sbGVjdGlvbkRyaXZlci5wcm90b3R5cGUsIHtcbiAgb3BlbjogZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdmFyIHJldCA9IHt9O1xuICAgIF8uZWFjaChcbiAgICAgIFsnZmluZCcsICdmaW5kT25lJywgJ2luc2VydCcsICd1cGRhdGUnLCAndXBzZXJ0JyxcbiAgICAgICAncmVtb3ZlJywgJ19lbnN1cmVJbmRleCcsICdfZHJvcEluZGV4JywgJ19jcmVhdGVDYXBwZWRDb2xsZWN0aW9uJyxcbiAgICAgICAnZHJvcENvbGxlY3Rpb24nLCAncmF3Q29sbGVjdGlvbiddLFxuICAgICAgZnVuY3Rpb24gKG0pIHtcbiAgICAgICAgcmV0W21dID0gXy5iaW5kKHNlbGYubW9uZ29bbV0sIHNlbGYubW9uZ28sIG5hbWUpO1xuICAgICAgfSk7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxufSk7XG5cblxuLy8gQ3JlYXRlIHRoZSBzaW5nbGV0b24gUmVtb3RlQ29sbGVjdGlvbkRyaXZlciBvbmx5IG9uIGRlbWFuZCwgc28gd2Vcbi8vIG9ubHkgcmVxdWlyZSBNb25nbyBjb25maWd1cmF0aW9uIGlmIGl0J3MgYWN0dWFsbHkgdXNlZCAoZWcsIG5vdCBpZlxuLy8geW91J3JlIG9ubHkgdHJ5aW5nIHRvIHJlY2VpdmUgZGF0YSBmcm9tIGEgcmVtb3RlIEREUCBzZXJ2ZXIuKVxuTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIgPSBfLm9uY2UoZnVuY3Rpb24gKCkge1xuICB2YXIgY29ubmVjdGlvbk9wdGlvbnMgPSB7fTtcblxuICB2YXIgbW9uZ29VcmwgPSBwcm9jZXNzLmVudi5NT05HT19VUkw7XG5cbiAgaWYgKHByb2Nlc3MuZW52Lk1PTkdPX09QTE9HX1VSTCkge1xuICAgIGNvbm5lY3Rpb25PcHRpb25zLm9wbG9nVXJsID0gcHJvY2Vzcy5lbnYuTU9OR09fT1BMT0dfVVJMO1xuICB9XG5cbiAgaWYgKCEgbW9uZ29VcmwpXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTU9OR09fVVJMIG11c3QgYmUgc2V0IGluIGVudmlyb25tZW50XCIpO1xuXG4gIHJldHVybiBuZXcgTW9uZ29JbnRlcm5hbHMuUmVtb3RlQ29sbGVjdGlvbkRyaXZlcihtb25nb1VybCwgY29ubmVjdGlvbk9wdGlvbnMpO1xufSk7XG4iLCIvLyBvcHRpb25zLmNvbm5lY3Rpb24sIGlmIGdpdmVuLCBpcyBhIExpdmVkYXRhQ2xpZW50IG9yIExpdmVkYXRhU2VydmVyXG4vLyBYWFggcHJlc2VudGx5IHRoZXJlIGlzIG5vIHdheSB0byBkZXN0cm95L2NsZWFuIHVwIGEgQ29sbGVjdGlvblxuXG4vKipcbiAqIEBzdW1tYXJ5IE5hbWVzcGFjZSBmb3IgTW9uZ29EQi1yZWxhdGVkIGl0ZW1zXG4gKiBAbmFtZXNwYWNlXG4gKi9cbk1vbmdvID0ge307XG5cbi8qKlxuICogQHN1bW1hcnkgQ29uc3RydWN0b3IgZm9yIGEgQ29sbGVjdGlvblxuICogQGxvY3VzIEFueXdoZXJlXG4gKiBAaW5zdGFuY2VuYW1lIGNvbGxlY3Rpb25cbiAqIEBjbGFzc1xuICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGNvbGxlY3Rpb24uICBJZiBudWxsLCBjcmVhdGVzIGFuIHVubWFuYWdlZCAodW5zeW5jaHJvbml6ZWQpIGxvY2FsIGNvbGxlY3Rpb24uXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucy5jb25uZWN0aW9uIFRoZSBzZXJ2ZXIgY29ubmVjdGlvbiB0aGF0IHdpbGwgbWFuYWdlIHRoaXMgY29sbGVjdGlvbi4gVXNlcyB0aGUgZGVmYXVsdCBjb25uZWN0aW9uIGlmIG5vdCBzcGVjaWZpZWQuICBQYXNzIHRoZSByZXR1cm4gdmFsdWUgb2YgY2FsbGluZyBbYEREUC5jb25uZWN0YF0oI2RkcF9jb25uZWN0KSB0byBzcGVjaWZ5IGEgZGlmZmVyZW50IHNlcnZlci4gUGFzcyBgbnVsbGAgdG8gc3BlY2lmeSBubyBjb25uZWN0aW9uLiBVbm1hbmFnZWQgKGBuYW1lYCBpcyBudWxsKSBjb2xsZWN0aW9ucyBjYW5ub3Qgc3BlY2lmeSBhIGNvbm5lY3Rpb24uXG4gKiBAcGFyYW0ge1N0cmluZ30gb3B0aW9ucy5pZEdlbmVyYXRpb24gVGhlIG1ldGhvZCBvZiBnZW5lcmF0aW5nIHRoZSBgX2lkYCBmaWVsZHMgb2YgbmV3IGRvY3VtZW50cyBpbiB0aGlzIGNvbGxlY3Rpb24uICBQb3NzaWJsZSB2YWx1ZXM6XG5cbiAtICoqYCdTVFJJTkcnYCoqOiByYW5kb20gc3RyaW5nc1xuIC0gKipgJ01PTkdPJ2AqKjogIHJhbmRvbSBbYE1vbmdvLk9iamVjdElEYF0oI21vbmdvX29iamVjdF9pZCkgdmFsdWVzXG5cblRoZSBkZWZhdWx0IGlkIGdlbmVyYXRpb24gdGVjaG5pcXVlIGlzIGAnU1RSSU5HJ2AuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBvcHRpb25zLnRyYW5zZm9ybSBBbiBvcHRpb25hbCB0cmFuc2Zvcm1hdGlvbiBmdW5jdGlvbi4gRG9jdW1lbnRzIHdpbGwgYmUgcGFzc2VkIHRocm91Z2ggdGhpcyBmdW5jdGlvbiBiZWZvcmUgYmVpbmcgcmV0dXJuZWQgZnJvbSBgZmV0Y2hgIG9yIGBmaW5kT25lYCwgYW5kIGJlZm9yZSBiZWluZyBwYXNzZWQgdG8gY2FsbGJhY2tzIG9mIGBvYnNlcnZlYCwgYG1hcGAsIGBmb3JFYWNoYCwgYGFsbG93YCwgYW5kIGBkZW55YC4gVHJhbnNmb3JtcyBhcmUgKm5vdCogYXBwbGllZCBmb3IgdGhlIGNhbGxiYWNrcyBvZiBgb2JzZXJ2ZUNoYW5nZXNgIG9yIHRvIGN1cnNvcnMgcmV0dXJuZWQgZnJvbSBwdWJsaXNoIGZ1bmN0aW9ucy5cbiAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5kZWZpbmVNdXRhdGlvbk1ldGhvZHMgU2V0IHRvIGBmYWxzZWAgdG8gc2tpcCBzZXR0aW5nIHVwIHRoZSBtdXRhdGlvbiBtZXRob2RzIHRoYXQgZW5hYmxlIGluc2VydC91cGRhdGUvcmVtb3ZlIGZyb20gY2xpZW50IGNvZGUuIERlZmF1bHQgYHRydWVgLlxuICovXG5Nb25nby5Db2xsZWN0aW9uID0gZnVuY3Rpb24gQ29sbGVjdGlvbihuYW1lLCBvcHRpb25zKSB7XG4gIGlmICghbmFtZSAmJiAobmFtZSAhPT0gbnVsbCkpIHtcbiAgICBNZXRlb3IuX2RlYnVnKFwiV2FybmluZzogY3JlYXRpbmcgYW5vbnltb3VzIGNvbGxlY3Rpb24uIEl0IHdpbGwgbm90IGJlIFwiICtcbiAgICAgICAgICAgICAgICAgIFwic2F2ZWQgb3Igc3luY2hyb25pemVkIG92ZXIgdGhlIG5ldHdvcmsuIChQYXNzIG51bGwgZm9yIFwiICtcbiAgICAgICAgICAgICAgICAgIFwidGhlIGNvbGxlY3Rpb24gbmFtZSB0byB0dXJuIG9mZiB0aGlzIHdhcm5pbmcuKVwiKTtcbiAgICBuYW1lID0gbnVsbDtcbiAgfVxuXG4gIGlmIChuYW1lICE9PSBudWxsICYmIHR5cGVvZiBuYW1lICE9PSBcInN0cmluZ1wiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgXCJGaXJzdCBhcmd1bWVudCB0byBuZXcgTW9uZ28uQ29sbGVjdGlvbiBtdXN0IGJlIGEgc3RyaW5nIG9yIG51bGxcIik7XG4gIH1cblxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLm1ldGhvZHMpIHtcbiAgICAvLyBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eSBoYWNrIHdpdGggb3JpZ2luYWwgc2lnbmF0dXJlICh3aGljaCBwYXNzZWRcbiAgICAvLyBcImNvbm5lY3Rpb25cIiBkaXJlY3RseSBpbnN0ZWFkIG9mIGluIG9wdGlvbnMuIChDb25uZWN0aW9ucyBtdXN0IGhhdmUgYSBcIm1ldGhvZHNcIlxuICAgIC8vIG1ldGhvZC4pXG4gICAgLy8gWFhYIHJlbW92ZSBiZWZvcmUgMS4wXG4gICAgb3B0aW9ucyA9IHtjb25uZWN0aW9uOiBvcHRpb25zfTtcbiAgfVxuICAvLyBCYWNrd2FyZHMgY29tcGF0aWJpbGl0eTogXCJjb25uZWN0aW9uXCIgdXNlZCB0byBiZSBjYWxsZWQgXCJtYW5hZ2VyXCIuXG4gIGlmIChvcHRpb25zICYmIG9wdGlvbnMubWFuYWdlciAmJiAhb3B0aW9ucy5jb25uZWN0aW9uKSB7XG4gICAgb3B0aW9ucy5jb25uZWN0aW9uID0gb3B0aW9ucy5tYW5hZ2VyO1xuICB9XG5cbiAgb3B0aW9ucyA9IHtcbiAgICBjb25uZWN0aW9uOiB1bmRlZmluZWQsXG4gICAgaWRHZW5lcmF0aW9uOiAnU1RSSU5HJyxcbiAgICB0cmFuc2Zvcm06IG51bGwsXG4gICAgX2RyaXZlcjogdW5kZWZpbmVkLFxuICAgIF9wcmV2ZW50QXV0b3B1Ymxpc2g6IGZhbHNlLFxuICAgICAgLi4ub3B0aW9ucyxcbiAgfTtcblxuICBzd2l0Y2ggKG9wdGlvbnMuaWRHZW5lcmF0aW9uKSB7XG4gIGNhc2UgJ01PTkdPJzpcbiAgICB0aGlzLl9tYWtlTmV3SUQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgc3JjID0gbmFtZSA/IEREUC5yYW5kb21TdHJlYW0oJy9jb2xsZWN0aW9uLycgKyBuYW1lKSA6IFJhbmRvbS5pbnNlY3VyZTtcbiAgICAgIHJldHVybiBuZXcgTW9uZ28uT2JqZWN0SUQoc3JjLmhleFN0cmluZygyNCkpO1xuICAgIH07XG4gICAgYnJlYWs7XG4gIGNhc2UgJ1NUUklORyc6XG4gIGRlZmF1bHQ6XG4gICAgdGhpcy5fbWFrZU5ld0lEID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHNyYyA9IG5hbWUgPyBERFAucmFuZG9tU3RyZWFtKCcvY29sbGVjdGlvbi8nICsgbmFtZSkgOiBSYW5kb20uaW5zZWN1cmU7XG4gICAgICByZXR1cm4gc3JjLmlkKCk7XG4gICAgfTtcbiAgICBicmVhaztcbiAgfVxuXG4gIHRoaXMuX3RyYW5zZm9ybSA9IExvY2FsQ29sbGVjdGlvbi53cmFwVHJhbnNmb3JtKG9wdGlvbnMudHJhbnNmb3JtKTtcblxuICBpZiAoISBuYW1lIHx8IG9wdGlvbnMuY29ubmVjdGlvbiA9PT0gbnVsbClcbiAgICAvLyBub3RlOiBuYW1lbGVzcyBjb2xsZWN0aW9ucyBuZXZlciBoYXZlIGEgY29ubmVjdGlvblxuICAgIHRoaXMuX2Nvbm5lY3Rpb24gPSBudWxsO1xuICBlbHNlIGlmIChvcHRpb25zLmNvbm5lY3Rpb24pXG4gICAgdGhpcy5fY29ubmVjdGlvbiA9IG9wdGlvbnMuY29ubmVjdGlvbjtcbiAgZWxzZSBpZiAoTWV0ZW9yLmlzQ2xpZW50KVxuICAgIHRoaXMuX2Nvbm5lY3Rpb24gPSBNZXRlb3IuY29ubmVjdGlvbjtcbiAgZWxzZVxuICAgIHRoaXMuX2Nvbm5lY3Rpb24gPSBNZXRlb3Iuc2VydmVyO1xuXG4gIGlmICghb3B0aW9ucy5fZHJpdmVyKSB7XG4gICAgLy8gWFhYIFRoaXMgY2hlY2sgYXNzdW1lcyB0aGF0IHdlYmFwcCBpcyBsb2FkZWQgc28gdGhhdCBNZXRlb3Iuc2VydmVyICE9PVxuICAgIC8vIG51bGwuIFdlIHNob3VsZCBmdWxseSBzdXBwb3J0IHRoZSBjYXNlIG9mIFwid2FudCB0byB1c2UgYSBNb25nby1iYWNrZWRcbiAgICAvLyBjb2xsZWN0aW9uIGZyb20gTm9kZSBjb2RlIHdpdGhvdXQgd2ViYXBwXCIsIGJ1dCB3ZSBkb24ndCB5ZXQuXG4gICAgLy8gI01ldGVvclNlcnZlck51bGxcbiAgICBpZiAobmFtZSAmJiB0aGlzLl9jb25uZWN0aW9uID09PSBNZXRlb3Iuc2VydmVyICYmXG4gICAgICAgIHR5cGVvZiBNb25nb0ludGVybmFscyAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgICAgICBNb25nb0ludGVybmFscy5kZWZhdWx0UmVtb3RlQ29sbGVjdGlvbkRyaXZlcikge1xuICAgICAgb3B0aW9ucy5fZHJpdmVyID0gTW9uZ29JbnRlcm5hbHMuZGVmYXVsdFJlbW90ZUNvbGxlY3Rpb25Ecml2ZXIoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgeyBMb2NhbENvbGxlY3Rpb25Ecml2ZXIgfSA9XG4gICAgICAgIHJlcXVpcmUoXCIuL2xvY2FsX2NvbGxlY3Rpb25fZHJpdmVyLmpzXCIpO1xuICAgICAgb3B0aW9ucy5fZHJpdmVyID0gTG9jYWxDb2xsZWN0aW9uRHJpdmVyO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMuX2NvbGxlY3Rpb24gPSBvcHRpb25zLl9kcml2ZXIub3BlbihuYW1lLCB0aGlzLl9jb25uZWN0aW9uKTtcbiAgdGhpcy5fbmFtZSA9IG5hbWU7XG4gIHRoaXMuX2RyaXZlciA9IG9wdGlvbnMuX2RyaXZlcjtcblxuICB0aGlzLl9tYXliZVNldFVwUmVwbGljYXRpb24obmFtZSwgb3B0aW9ucyk7XG5cbiAgLy8gWFhYIGRvbid0IGRlZmluZSB0aGVzZSB1bnRpbCBhbGxvdyBvciBkZW55IGlzIGFjdHVhbGx5IHVzZWQgZm9yIHRoaXNcbiAgLy8gY29sbGVjdGlvbi4gQ291bGQgYmUgaGFyZCBpZiB0aGUgc2VjdXJpdHkgcnVsZXMgYXJlIG9ubHkgZGVmaW5lZCBvbiB0aGVcbiAgLy8gc2VydmVyLlxuICBpZiAob3B0aW9ucy5kZWZpbmVNdXRhdGlvbk1ldGhvZHMgIT09IGZhbHNlKSB7XG4gICAgdHJ5IHtcbiAgICAgIHRoaXMuX2RlZmluZU11dGF0aW9uTWV0aG9kcyh7XG4gICAgICAgIHVzZUV4aXN0aW5nOiBvcHRpb25zLl9zdXBwcmVzc1NhbWVOYW1lRXJyb3IgPT09IHRydWVcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBUaHJvdyBhIG1vcmUgdW5kZXJzdGFuZGFibGUgZXJyb3Igb24gdGhlIHNlcnZlciBmb3Igc2FtZSBjb2xsZWN0aW9uIG5hbWVcbiAgICAgIGlmIChlcnJvci5tZXNzYWdlID09PSBgQSBtZXRob2QgbmFtZWQgJy8ke25hbWV9L2luc2VydCcgaXMgYWxyZWFkeSBkZWZpbmVkYClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBUaGVyZSBpcyBhbHJlYWR5IGEgY29sbGVjdGlvbiBuYW1lZCBcIiR7bmFtZX1cImApO1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgLy8gYXV0b3B1Ymxpc2hcbiAgaWYgKFBhY2thZ2UuYXV0b3B1Ymxpc2ggJiZcbiAgICAgICEgb3B0aW9ucy5fcHJldmVudEF1dG9wdWJsaXNoICYmXG4gICAgICB0aGlzLl9jb25uZWN0aW9uICYmXG4gICAgICB0aGlzLl9jb25uZWN0aW9uLnB1Ymxpc2gpIHtcbiAgICB0aGlzLl9jb25uZWN0aW9uLnB1Ymxpc2gobnVsbCwgKCkgPT4gdGhpcy5maW5kKCksIHtcbiAgICAgIGlzX2F1dG86IHRydWUsXG4gICAgfSk7XG4gIH1cbn07XG5cbk9iamVjdC5hc3NpZ24oTW9uZ28uQ29sbGVjdGlvbi5wcm90b3R5cGUsIHtcbiAgX21heWJlU2V0VXBSZXBsaWNhdGlvbihuYW1lLCB7XG4gICAgX3N1cHByZXNzU2FtZU5hbWVFcnJvciA9IGZhbHNlXG4gIH0pIHtcbiAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICBpZiAoISAoc2VsZi5fY29ubmVjdGlvbiAmJlxuICAgICAgICAgICBzZWxmLl9jb25uZWN0aW9uLnJlZ2lzdGVyU3RvcmUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gT0ssIHdlJ3JlIGdvaW5nIHRvIGJlIGEgc2xhdmUsIHJlcGxpY2F0aW5nIHNvbWUgcmVtb3RlXG4gICAgLy8gZGF0YWJhc2UsIGV4Y2VwdCBwb3NzaWJseSB3aXRoIHNvbWUgdGVtcG9yYXJ5IGRpdmVyZ2VuY2Ugd2hpbGVcbiAgICAvLyB3ZSBoYXZlIHVuYWNrbm93bGVkZ2VkIFJQQydzLlxuICAgIGNvbnN0IG9rID0gc2VsZi5fY29ubmVjdGlvbi5yZWdpc3RlclN0b3JlKG5hbWUsIHtcbiAgICAgIC8vIENhbGxlZCBhdCB0aGUgYmVnaW5uaW5nIG9mIGEgYmF0Y2ggb2YgdXBkYXRlcy4gYmF0Y2hTaXplIGlzIHRoZSBudW1iZXJcbiAgICAgIC8vIG9mIHVwZGF0ZSBjYWxscyB0byBleHBlY3QuXG4gICAgICAvL1xuICAgICAgLy8gWFhYIFRoaXMgaW50ZXJmYWNlIGlzIHByZXR0eSBqYW5reS4gcmVzZXQgcHJvYmFibHkgb3VnaHQgdG8gZ28gYmFjayB0b1xuICAgICAgLy8gYmVpbmcgaXRzIG93biBmdW5jdGlvbiwgYW5kIGNhbGxlcnMgc2hvdWxkbid0IGhhdmUgdG8gY2FsY3VsYXRlXG4gICAgICAvLyBiYXRjaFNpemUuIFRoZSBvcHRpbWl6YXRpb24gb2Ygbm90IGNhbGxpbmcgcGF1c2UvcmVtb3ZlIHNob3VsZCBiZVxuICAgICAgLy8gZGVsYXllZCB1bnRpbCBsYXRlcjogdGhlIGZpcnN0IGNhbGwgdG8gdXBkYXRlKCkgc2hvdWxkIGJ1ZmZlciBpdHNcbiAgICAgIC8vIG1lc3NhZ2UsIGFuZCB0aGVuIHdlIGNhbiBlaXRoZXIgZGlyZWN0bHkgYXBwbHkgaXQgYXQgZW5kVXBkYXRlIHRpbWUgaWZcbiAgICAgIC8vIGl0IHdhcyB0aGUgb25seSB1cGRhdGUsIG9yIGRvIHBhdXNlT2JzZXJ2ZXJzL2FwcGx5L2FwcGx5IGF0IHRoZSBuZXh0XG4gICAgICAvLyB1cGRhdGUoKSBpZiB0aGVyZSdzIGFub3RoZXIgb25lLlxuICAgICAgYmVnaW5VcGRhdGUoYmF0Y2hTaXplLCByZXNldCkge1xuICAgICAgICAvLyBwYXVzZSBvYnNlcnZlcnMgc28gdXNlcnMgZG9uJ3Qgc2VlIGZsaWNrZXIgd2hlbiB1cGRhdGluZyBzZXZlcmFsXG4gICAgICAgIC8vIG9iamVjdHMgYXQgb25jZSAoaW5jbHVkaW5nIHRoZSBwb3N0LXJlY29ubmVjdCByZXNldC1hbmQtcmVhcHBseVxuICAgICAgICAvLyBzdGFnZSksIGFuZCBzbyB0aGF0IGEgcmUtc29ydGluZyBvZiBhIHF1ZXJ5IGNhbiB0YWtlIGFkdmFudGFnZSBvZiB0aGVcbiAgICAgICAgLy8gZnVsbCBfZGlmZlF1ZXJ5IG1vdmVkIGNhbGN1bGF0aW9uIGluc3RlYWQgb2YgYXBwbHlpbmcgY2hhbmdlIG9uZSBhdCBhXG4gICAgICAgIC8vIHRpbWUuXG4gICAgICAgIGlmIChiYXRjaFNpemUgPiAxIHx8IHJlc2V0KVxuICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24ucGF1c2VPYnNlcnZlcnMoKTtcblxuICAgICAgICBpZiAocmVzZXQpXG4gICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5yZW1vdmUoe30pO1xuICAgICAgfSxcblxuICAgICAgLy8gQXBwbHkgYW4gdXBkYXRlLlxuICAgICAgLy8gWFhYIGJldHRlciBzcGVjaWZ5IHRoaXMgaW50ZXJmYWNlIChub3QgaW4gdGVybXMgb2YgYSB3aXJlIG1lc3NhZ2UpP1xuICAgICAgdXBkYXRlKG1zZykge1xuICAgICAgICB2YXIgbW9uZ29JZCA9IE1vbmdvSUQuaWRQYXJzZShtc2cuaWQpO1xuICAgICAgICB2YXIgZG9jID0gc2VsZi5fY29sbGVjdGlvbi5fZG9jcy5nZXQobW9uZ29JZCk7XG5cbiAgICAgICAgLy8gSXMgdGhpcyBhIFwicmVwbGFjZSB0aGUgd2hvbGUgZG9jXCIgbWVzc2FnZSBjb21pbmcgZnJvbSB0aGUgcXVpZXNjZW5jZVxuICAgICAgICAvLyBvZiBtZXRob2Qgd3JpdGVzIHRvIGFuIG9iamVjdD8gKE5vdGUgdGhhdCAndW5kZWZpbmVkJyBpcyBhIHZhbGlkXG4gICAgICAgIC8vIHZhbHVlIG1lYW5pbmcgXCJyZW1vdmUgaXRcIi4pXG4gICAgICAgIGlmIChtc2cubXNnID09PSAncmVwbGFjZScpIHtcbiAgICAgICAgICB2YXIgcmVwbGFjZSA9IG1zZy5yZXBsYWNlO1xuICAgICAgICAgIGlmICghcmVwbGFjZSkge1xuICAgICAgICAgICAgaWYgKGRvYylcbiAgICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5yZW1vdmUobW9uZ29JZCk7XG4gICAgICAgICAgfSBlbHNlIGlmICghZG9jKSB7XG4gICAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLmluc2VydChyZXBsYWNlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gWFhYIGNoZWNrIHRoYXQgcmVwbGFjZSBoYXMgbm8gJCBvcHNcbiAgICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24udXBkYXRlKG1vbmdvSWQsIHJlcGxhY2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0gZWxzZSBpZiAobXNnLm1zZyA9PT0gJ2FkZGVkJykge1xuICAgICAgICAgIGlmIChkb2MpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIG5vdCB0byBmaW5kIGEgZG9jdW1lbnQgYWxyZWFkeSBwcmVzZW50IGZvciBhbiBhZGRcIik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHNlbGYuX2NvbGxlY3Rpb24uaW5zZXJ0KHsgX2lkOiBtb25nb0lkLCAuLi5tc2cuZmllbGRzIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKG1zZy5tc2cgPT09ICdyZW1vdmVkJykge1xuICAgICAgICAgIGlmICghZG9jKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRXhwZWN0ZWQgdG8gZmluZCBhIGRvY3VtZW50IGFscmVhZHkgcHJlc2VudCBmb3IgcmVtb3ZlZFwiKTtcbiAgICAgICAgICBzZWxmLl9jb2xsZWN0aW9uLnJlbW92ZShtb25nb0lkKTtcbiAgICAgICAgfSBlbHNlIGlmIChtc2cubXNnID09PSAnY2hhbmdlZCcpIHtcbiAgICAgICAgICBpZiAoIWRvYylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkV4cGVjdGVkIHRvIGZpbmQgYSBkb2N1bWVudCB0byBjaGFuZ2VcIik7XG4gICAgICAgICAgY29uc3Qga2V5cyA9IE9iamVjdC5rZXlzKG1zZy5maWVsZHMpO1xuICAgICAgICAgIGlmIChrZXlzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHZhciBtb2RpZmllciA9IHt9O1xuICAgICAgICAgICAga2V5cy5mb3JFYWNoKGtleSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gbXNnLmZpZWxkc1trZXldO1xuICAgICAgICAgICAgICBpZiAoRUpTT04uZXF1YWxzKGRvY1trZXldLCB2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgICAgIGlmICghbW9kaWZpZXIuJHVuc2V0KSB7XG4gICAgICAgICAgICAgICAgICBtb2RpZmllci4kdW5zZXQgPSB7fTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbW9kaWZpZXIuJHVuc2V0W2tleV0gPSAxO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmICghbW9kaWZpZXIuJHNldCkge1xuICAgICAgICAgICAgICAgICAgbW9kaWZpZXIuJHNldCA9IHt9O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBtb2RpZmllci4kc2V0W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMobW9kaWZpZXIpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgc2VsZi5fY29sbGVjdGlvbi51cGRhdGUobW9uZ29JZCwgbW9kaWZpZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJIGRvbid0IGtub3cgaG93IHRvIGRlYWwgd2l0aCB0aGlzIG1lc3NhZ2VcIik7XG4gICAgICAgIH1cbiAgICAgIH0sXG5cbiAgICAgIC8vIENhbGxlZCBhdCB0aGUgZW5kIG9mIGEgYmF0Y2ggb2YgdXBkYXRlcy5cbiAgICAgIGVuZFVwZGF0ZSgpIHtcbiAgICAgICAgc2VsZi5fY29sbGVjdGlvbi5yZXN1bWVPYnNlcnZlcnMoKTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIENhbGxlZCBhcm91bmQgbWV0aG9kIHN0dWIgaW52b2NhdGlvbnMgdG8gY2FwdHVyZSB0aGUgb3JpZ2luYWwgdmVyc2lvbnNcbiAgICAgIC8vIG9mIG1vZGlmaWVkIGRvY3VtZW50cy5cbiAgICAgIHNhdmVPcmlnaW5hbHMoKSB7XG4gICAgICAgIHNlbGYuX2NvbGxlY3Rpb24uc2F2ZU9yaWdpbmFscygpO1xuICAgICAgfSxcbiAgICAgIHJldHJpZXZlT3JpZ2luYWxzKCkge1xuICAgICAgICByZXR1cm4gc2VsZi5fY29sbGVjdGlvbi5yZXRyaWV2ZU9yaWdpbmFscygpO1xuICAgICAgfSxcblxuICAgICAgLy8gVXNlZCB0byBwcmVzZXJ2ZSBjdXJyZW50IHZlcnNpb25zIG9mIGRvY3VtZW50cyBhY3Jvc3MgYSBzdG9yZSByZXNldC5cbiAgICAgIGdldERvYyhpZCkge1xuICAgICAgICByZXR1cm4gc2VsZi5maW5kT25lKGlkKTtcbiAgICAgIH0sXG5cbiAgICAgIC8vIFRvIGJlIGFibGUgdG8gZ2V0IGJhY2sgdG8gdGhlIGNvbGxlY3Rpb24gZnJvbSB0aGUgc3RvcmUuXG4gICAgICBfZ2V0Q29sbGVjdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHNlbGY7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBpZiAoISBvaykge1xuICAgICAgY29uc3QgbWVzc2FnZSA9IGBUaGVyZSBpcyBhbHJlYWR5IGEgY29sbGVjdGlvbiBuYW1lZCBcIiR7bmFtZX1cImA7XG4gICAgICBpZiAoX3N1cHByZXNzU2FtZU5hbWVFcnJvciA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBYWFggSW4gdGhlb3J5IHdlIGRvIG5vdCBoYXZlIHRvIHRocm93IHdoZW4gYG9rYCBpcyBmYWxzeS4gVGhlXG4gICAgICAgIC8vIHN0b3JlIGlzIGFscmVhZHkgZGVmaW5lZCBmb3IgdGhpcyBjb2xsZWN0aW9uIG5hbWUsIGJ1dCB0aGlzXG4gICAgICAgIC8vIHdpbGwgc2ltcGx5IGJlIGFub3RoZXIgcmVmZXJlbmNlIHRvIGl0IGFuZCBldmVyeXRoaW5nIHNob3VsZFxuICAgICAgICAvLyB3b3JrLiBIb3dldmVyLCB3ZSBoYXZlIGhpc3RvcmljYWxseSB0aHJvd24gYW4gZXJyb3IgaGVyZSwgc29cbiAgICAgICAgLy8gZm9yIG5vdyB3ZSB3aWxsIHNraXAgdGhlIGVycm9yIG9ubHkgd2hlbiBfc3VwcHJlc3NTYW1lTmFtZUVycm9yXG4gICAgICAgIC8vIGlzIGB0cnVlYCwgYWxsb3dpbmcgcGVvcGxlIHRvIG9wdCBpbiBhbmQgZ2l2ZSB0aGlzIHNvbWUgcmVhbFxuICAgICAgICAvLyB3b3JsZCB0ZXN0aW5nLlxuICAgICAgICBjb25zb2xlLndhcm4gPyBjb25zb2xlLndhcm4obWVzc2FnZSkgOiBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgLy8vXG4gIC8vLyBNYWluIGNvbGxlY3Rpb24gQVBJXG4gIC8vL1xuXG4gIF9nZXRGaW5kU2VsZWN0b3IoYXJncykge1xuICAgIGlmIChhcmdzLmxlbmd0aCA9PSAwKVxuICAgICAgcmV0dXJuIHt9O1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBhcmdzWzBdO1xuICB9LFxuXG4gIF9nZXRGaW5kT3B0aW9ucyhhcmdzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmIChhcmdzLmxlbmd0aCA8IDIpIHtcbiAgICAgIHJldHVybiB7IHRyYW5zZm9ybTogc2VsZi5fdHJhbnNmb3JtIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNoZWNrKGFyZ3NbMV0sIE1hdGNoLk9wdGlvbmFsKE1hdGNoLk9iamVjdEluY2x1ZGluZyh7XG4gICAgICAgIGZpZWxkczogTWF0Y2guT3B0aW9uYWwoTWF0Y2guT25lT2YoT2JqZWN0LCB1bmRlZmluZWQpKSxcbiAgICAgICAgc29ydDogTWF0Y2guT3B0aW9uYWwoTWF0Y2guT25lT2YoT2JqZWN0LCBBcnJheSwgRnVuY3Rpb24sIHVuZGVmaW5lZCkpLFxuICAgICAgICBsaW1pdDogTWF0Y2guT3B0aW9uYWwoTWF0Y2guT25lT2YoTnVtYmVyLCB1bmRlZmluZWQpKSxcbiAgICAgICAgc2tpcDogTWF0Y2guT3B0aW9uYWwoTWF0Y2guT25lT2YoTnVtYmVyLCB1bmRlZmluZWQpKVxuICAgICAgfSkpKTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHJhbnNmb3JtOiBzZWxmLl90cmFuc2Zvcm0sXG4gICAgICAgIC4uLmFyZ3NbMV0sXG4gICAgICB9O1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgRmluZCB0aGUgZG9jdW1lbnRzIGluIGEgY29sbGVjdGlvbiB0aGF0IG1hdGNoIHRoZSBzZWxlY3Rvci5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgZmluZFxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBbc2VsZWN0b3JdIEEgcXVlcnkgZGVzY3JpYmluZyB0aGUgZG9jdW1lbnRzIHRvIGZpbmRcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge01vbmdvU29ydFNwZWNpZmllcn0gb3B0aW9ucy5zb3J0IFNvcnQgb3JkZXIgKGRlZmF1bHQ6IG5hdHVyYWwgb3JkZXIpXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnNraXAgTnVtYmVyIG9mIHJlc3VsdHMgdG8gc2tpcCBhdCB0aGUgYmVnaW5uaW5nXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLmxpbWl0IE1heGltdW0gbnVtYmVyIG9mIHJlc3VsdHMgdG8gcmV0dXJuXG4gICAqIEBwYXJhbSB7TW9uZ29GaWVsZFNwZWNpZmllcn0gb3B0aW9ucy5maWVsZHMgRGljdGlvbmFyeSBvZiBmaWVsZHMgdG8gcmV0dXJuIG9yIGV4Y2x1ZGUuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5yZWFjdGl2ZSAoQ2xpZW50IG9ubHkpIERlZmF1bHQgYHRydWVgOyBwYXNzIGBmYWxzZWAgdG8gZGlzYWJsZSByZWFjdGl2aXR5XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG9wdGlvbnMudHJhbnNmb3JtIE92ZXJyaWRlcyBgdHJhbnNmb3JtYCBvbiB0aGUgIFtgQ29sbGVjdGlvbmBdKCNjb2xsZWN0aW9ucykgZm9yIHRoaXMgY3Vyc29yLiAgUGFzcyBgbnVsbGAgdG8gZGlzYWJsZSB0cmFuc2Zvcm1hdGlvbi5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmRpc2FibGVPcGxvZyAoU2VydmVyIG9ubHkpIFBhc3MgdHJ1ZSB0byBkaXNhYmxlIG9wbG9nLXRhaWxpbmcgb24gdGhpcyBxdWVyeS4gVGhpcyBhZmZlY3RzIHRoZSB3YXkgc2VydmVyIHByb2Nlc3NlcyBjYWxscyB0byBgb2JzZXJ2ZWAgb24gdGhpcyBxdWVyeS4gRGlzYWJsaW5nIHRoZSBvcGxvZyBjYW4gYmUgdXNlZnVsIHdoZW4gd29ya2luZyB3aXRoIGRhdGEgdGhhdCB1cGRhdGVzIGluIGxhcmdlIGJhdGNoZXMuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnBvbGxpbmdJbnRlcnZhbE1zIChTZXJ2ZXIgb25seSkgV2hlbiBvcGxvZyBpcyBkaXNhYmxlZCAodGhyb3VnaCB0aGUgdXNlIG9mIGBkaXNhYmxlT3Bsb2dgIG9yIHdoZW4gb3RoZXJ3aXNlIG5vdCBhdmFpbGFibGUpLCB0aGUgZnJlcXVlbmN5IChpbiBtaWxsaXNlY29uZHMpIG9mIGhvdyBvZnRlbiB0byBwb2xsIHRoaXMgcXVlcnkgd2hlbiBvYnNlcnZpbmcgb24gdGhlIHNlcnZlci4gRGVmYXVsdHMgdG8gMTAwMDBtcyAoMTAgc2Vjb25kcykuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnBvbGxpbmdUaHJvdHRsZU1zIChTZXJ2ZXIgb25seSkgV2hlbiBvcGxvZyBpcyBkaXNhYmxlZCAodGhyb3VnaCB0aGUgdXNlIG9mIGBkaXNhYmxlT3Bsb2dgIG9yIHdoZW4gb3RoZXJ3aXNlIG5vdCBhdmFpbGFibGUpLCB0aGUgbWluaW11bSB0aW1lIChpbiBtaWxsaXNlY29uZHMpIHRvIGFsbG93IGJldHdlZW4gcmUtcG9sbGluZyB3aGVuIG9ic2VydmluZyBvbiB0aGUgc2VydmVyLiBJbmNyZWFzaW5nIHRoaXMgd2lsbCBzYXZlIENQVSBhbmQgbW9uZ28gbG9hZCBhdCB0aGUgZXhwZW5zZSBvZiBzbG93ZXIgdXBkYXRlcyB0byB1c2Vycy4gRGVjcmVhc2luZyB0aGlzIGlzIG5vdCByZWNvbW1lbmRlZC4gRGVmYXVsdHMgdG8gNTBtcy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMubWF4VGltZU1zIChTZXJ2ZXIgb25seSkgSWYgc2V0LCBpbnN0cnVjdHMgTW9uZ29EQiB0byBzZXQgYSB0aW1lIGxpbWl0IGZvciB0aGlzIGN1cnNvcidzIG9wZXJhdGlvbnMuIElmIHRoZSBvcGVyYXRpb24gcmVhY2hlcyB0aGUgc3BlY2lmaWVkIHRpbWUgbGltaXQgKGluIG1pbGxpc2Vjb25kcykgd2l0aG91dCB0aGUgaGF2aW5nIGJlZW4gY29tcGxldGVkLCBhbiBleGNlcHRpb24gd2lsbCBiZSB0aHJvd24uIFVzZWZ1bCB0byBwcmV2ZW50IGFuIChhY2NpZGVudGFsIG9yIG1hbGljaW91cykgdW5vcHRpbWl6ZWQgcXVlcnkgZnJvbSBjYXVzaW5nIGEgZnVsbCBjb2xsZWN0aW9uIHNjYW4gdGhhdCB3b3VsZCBkaXNydXB0IG90aGVyIGRhdGFiYXNlIHVzZXJzLCBhdCB0aGUgZXhwZW5zZSBvZiBuZWVkaW5nIHRvIGhhbmRsZSB0aGUgcmVzdWx0aW5nIGVycm9yLlxuICAgKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R9IG9wdGlvbnMuaGludCAoU2VydmVyIG9ubHkpIE92ZXJyaWRlcyBNb25nb0RCJ3MgZGVmYXVsdCBpbmRleCBzZWxlY3Rpb24gYW5kIHF1ZXJ5IG9wdGltaXphdGlvbiBwcm9jZXNzLiBTcGVjaWZ5IGFuIGluZGV4IHRvIGZvcmNlIGl0cyB1c2UsIGVpdGhlciBieSBpdHMgbmFtZSBvciBpbmRleCBzcGVjaWZpY2F0aW9uLiBZb3UgY2FuIGFsc28gc3BlY2lmeSBgeyAkbmF0dXJhbCA6IDEgfWAgdG8gZm9yY2UgYSBmb3J3YXJkcyBjb2xsZWN0aW9uIHNjYW4sIG9yIGB7ICRuYXR1cmFsIDogLTEgfWAgZm9yIGEgcmV2ZXJzZSBjb2xsZWN0aW9uIHNjYW4uIFNldHRpbmcgdGhpcyBpcyBvbmx5IHJlY29tbWVuZGVkIGZvciBhZHZhbmNlZCB1c2Vycy5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMucmVhZFByZWZlcmVuY2UgKFNlcnZlciBvbmx5KSBTcGVjaWZpZXMgYSBjdXN0b20gTW9uZ29EQiBbYHJlYWRQcmVmZXJlbmNlYF0oaHR0cHM6Ly9kb2NzLm1vbmdvZGIuY29tL21hbnVhbC9jb3JlL3JlYWQtcHJlZmVyZW5jZSkgZm9yIHRoaXMgcGFydGljdWxhciBjdXJzb3IuIFBvc3NpYmxlIHZhbHVlcyBhcmUgYHByaW1hcnlgLCBgcHJpbWFyeVByZWZlcnJlZGAsIGBzZWNvbmRhcnlgLCBgc2Vjb25kYXJ5UHJlZmVycmVkYCBhbmQgYG5lYXJlc3RgLlxuICAgKiBAcmV0dXJucyB7TW9uZ28uQ3Vyc29yfVxuICAgKi9cbiAgZmluZCguLi5hcmdzKSB7XG4gICAgLy8gQ29sbGVjdGlvbi5maW5kKCkgKHJldHVybiBhbGwgZG9jcykgYmVoYXZlcyBkaWZmZXJlbnRseVxuICAgIC8vIGZyb20gQ29sbGVjdGlvbi5maW5kKHVuZGVmaW5lZCkgKHJldHVybiAwIGRvY3MpLiAgc28gYmVcbiAgICAvLyBjYXJlZnVsIGFib3V0IHRoZSBsZW5ndGggb2YgYXJndW1lbnRzLlxuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0aW9uLmZpbmQoXG4gICAgICB0aGlzLl9nZXRGaW5kU2VsZWN0b3IoYXJncyksXG4gICAgICB0aGlzLl9nZXRGaW5kT3B0aW9ucyhhcmdzKVxuICAgICk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEZpbmRzIHRoZSBmaXJzdCBkb2N1bWVudCB0aGF0IG1hdGNoZXMgdGhlIHNlbGVjdG9yLCBhcyBvcmRlcmVkIGJ5IHNvcnQgYW5kIHNraXAgb3B0aW9ucy4gUmV0dXJucyBgdW5kZWZpbmVkYCBpZiBubyBtYXRjaGluZyBkb2N1bWVudCBpcyBmb3VuZC5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgZmluZE9uZVxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICogQHBhcmFtIHtNb25nb1NlbGVjdG9yfSBbc2VsZWN0b3JdIEEgcXVlcnkgZGVzY3JpYmluZyB0aGUgZG9jdW1lbnRzIHRvIGZpbmRcbiAgICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICAgKiBAcGFyYW0ge01vbmdvU29ydFNwZWNpZmllcn0gb3B0aW9ucy5zb3J0IFNvcnQgb3JkZXIgKGRlZmF1bHQ6IG5hdHVyYWwgb3JkZXIpXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnNraXAgTnVtYmVyIG9mIHJlc3VsdHMgdG8gc2tpcCBhdCB0aGUgYmVnaW5uaW5nXG4gICAqIEBwYXJhbSB7TW9uZ29GaWVsZFNwZWNpZmllcn0gb3B0aW9ucy5maWVsZHMgRGljdGlvbmFyeSBvZiBmaWVsZHMgdG8gcmV0dXJuIG9yIGV4Y2x1ZGUuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5yZWFjdGl2ZSAoQ2xpZW50IG9ubHkpIERlZmF1bHQgdHJ1ZTsgcGFzcyBmYWxzZSB0byBkaXNhYmxlIHJlYWN0aXZpdHlcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gb3B0aW9ucy50cmFuc2Zvcm0gT3ZlcnJpZGVzIGB0cmFuc2Zvcm1gIG9uIHRoZSBbYENvbGxlY3Rpb25gXSgjY29sbGVjdGlvbnMpIGZvciB0aGlzIGN1cnNvci4gIFBhc3MgYG51bGxgIHRvIGRpc2FibGUgdHJhbnNmb3JtYXRpb24uXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLnJlYWRQcmVmZXJlbmNlIChTZXJ2ZXIgb25seSkgU3BlY2lmaWVzIGEgY3VzdG9tIE1vbmdvREIgW2ByZWFkUHJlZmVyZW5jZWBdKGh0dHBzOi8vZG9jcy5tb25nb2RiLmNvbS9tYW51YWwvY29yZS9yZWFkLXByZWZlcmVuY2UpIGZvciBmZXRjaGluZyB0aGUgZG9jdW1lbnQuIFBvc3NpYmxlIHZhbHVlcyBhcmUgYHByaW1hcnlgLCBgcHJpbWFyeVByZWZlcnJlZGAsIGBzZWNvbmRhcnlgLCBgc2Vjb25kYXJ5UHJlZmVycmVkYCBhbmQgYG5lYXJlc3RgLlxuICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgKi9cbiAgZmluZE9uZSguLi5hcmdzKSB7XG4gICAgcmV0dXJuIHRoaXMuX2NvbGxlY3Rpb24uZmluZE9uZShcbiAgICAgIHRoaXMuX2dldEZpbmRTZWxlY3RvcihhcmdzKSxcbiAgICAgIHRoaXMuX2dldEZpbmRPcHRpb25zKGFyZ3MpXG4gICAgKTtcbiAgfVxufSk7XG5cbk9iamVjdC5hc3NpZ24oTW9uZ28uQ29sbGVjdGlvbiwge1xuICBfcHVibGlzaEN1cnNvcihjdXJzb3IsIHN1YiwgY29sbGVjdGlvbikge1xuICAgIHZhciBvYnNlcnZlSGFuZGxlID0gY3Vyc29yLm9ic2VydmVDaGFuZ2VzKHtcbiAgICAgIGFkZGVkOiBmdW5jdGlvbiAoaWQsIGZpZWxkcykge1xuICAgICAgICBzdWIuYWRkZWQoY29sbGVjdGlvbiwgaWQsIGZpZWxkcyk7XG4gICAgICB9LFxuICAgICAgY2hhbmdlZDogZnVuY3Rpb24gKGlkLCBmaWVsZHMpIHtcbiAgICAgICAgc3ViLmNoYW5nZWQoY29sbGVjdGlvbiwgaWQsIGZpZWxkcyk7XG4gICAgICB9LFxuICAgICAgcmVtb3ZlZDogZnVuY3Rpb24gKGlkKSB7XG4gICAgICAgIHN1Yi5yZW1vdmVkKGNvbGxlY3Rpb24sIGlkKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIC8vIFB1YmxpY2F0aW9ucyBkb24ndCBtdXRhdGUgdGhlIGRvY3VtZW50c1xuICAgIC8vIFRoaXMgaXMgdGVzdGVkIGJ5IHRoZSBgbGl2ZWRhdGEgLSBwdWJsaXNoIGNhbGxiYWNrcyBjbG9uZWAgdGVzdFxuICAgIHsgbm9uTXV0YXRpbmdDYWxsYmFja3M6IHRydWUgfSk7XG5cbiAgICAvLyBXZSBkb24ndCBjYWxsIHN1Yi5yZWFkeSgpIGhlcmU6IGl0IGdldHMgY2FsbGVkIGluIGxpdmVkYXRhX3NlcnZlciwgYWZ0ZXJcbiAgICAvLyBwb3NzaWJseSBjYWxsaW5nIF9wdWJsaXNoQ3Vyc29yIG9uIG11bHRpcGxlIHJldHVybmVkIGN1cnNvcnMuXG5cbiAgICAvLyByZWdpc3RlciBzdG9wIGNhbGxiYWNrIChleHBlY3RzIGxhbWJkYSB3LyBubyBhcmdzKS5cbiAgICBzdWIub25TdG9wKGZ1bmN0aW9uICgpIHtcbiAgICAgIG9ic2VydmVIYW5kbGUuc3RvcCgpO1xuICAgIH0pO1xuXG4gICAgLy8gcmV0dXJuIHRoZSBvYnNlcnZlSGFuZGxlIGluIGNhc2UgaXQgbmVlZHMgdG8gYmUgc3RvcHBlZCBlYXJseVxuICAgIHJldHVybiBvYnNlcnZlSGFuZGxlO1xuICB9LFxuXG4gIC8vIHByb3RlY3QgYWdhaW5zdCBkYW5nZXJvdXMgc2VsZWN0b3JzLiAgZmFsc2V5IGFuZCB7X2lkOiBmYWxzZXl9IGFyZSBib3RoXG4gIC8vIGxpa2VseSBwcm9ncmFtbWVyIGVycm9yLCBhbmQgbm90IHdoYXQgeW91IHdhbnQsIHBhcnRpY3VsYXJseSBmb3IgZGVzdHJ1Y3RpdmVcbiAgLy8gb3BlcmF0aW9ucy4gSWYgYSBmYWxzZXkgX2lkIGlzIHNlbnQgaW4sIGEgbmV3IHN0cmluZyBfaWQgd2lsbCBiZVxuICAvLyBnZW5lcmF0ZWQgYW5kIHJldHVybmVkOyBpZiBhIGZhbGxiYWNrSWQgaXMgcHJvdmlkZWQsIGl0IHdpbGwgYmUgcmV0dXJuZWRcbiAgLy8gaW5zdGVhZC5cbiAgX3Jld3JpdGVTZWxlY3RvcihzZWxlY3RvciwgeyBmYWxsYmFja0lkIH0gPSB7fSkge1xuICAgIC8vIHNob3J0aGFuZCAtLSBzY2FsYXJzIG1hdGNoIF9pZFxuICAgIGlmIChMb2NhbENvbGxlY3Rpb24uX3NlbGVjdG9ySXNJZChzZWxlY3RvcikpXG4gICAgICBzZWxlY3RvciA9IHtfaWQ6IHNlbGVjdG9yfTtcblxuICAgIGlmIChBcnJheS5pc0FycmF5KHNlbGVjdG9yKSkge1xuICAgICAgLy8gVGhpcyBpcyBjb25zaXN0ZW50IHdpdGggdGhlIE1vbmdvIGNvbnNvbGUgaXRzZWxmOyBpZiB3ZSBkb24ndCBkbyB0aGlzXG4gICAgICAvLyBjaGVjayBwYXNzaW5nIGFuIGVtcHR5IGFycmF5IGVuZHMgdXAgc2VsZWN0aW5nIGFsbCBpdGVtc1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTW9uZ28gc2VsZWN0b3IgY2FuJ3QgYmUgYW4gYXJyYXkuXCIpO1xuICAgIH1cblxuICAgIGlmICghc2VsZWN0b3IgfHwgKCgnX2lkJyBpbiBzZWxlY3RvcikgJiYgIXNlbGVjdG9yLl9pZCkpIHtcbiAgICAgIC8vIGNhbid0IG1hdGNoIGFueXRoaW5nXG4gICAgICByZXR1cm4geyBfaWQ6IGZhbGxiYWNrSWQgfHwgUmFuZG9tLmlkKCkgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gc2VsZWN0b3I7XG4gIH1cbn0pO1xuXG5PYmplY3QuYXNzaWduKE1vbmdvLkNvbGxlY3Rpb24ucHJvdG90eXBlLCB7XG4gIC8vICdpbnNlcnQnIGltbWVkaWF0ZWx5IHJldHVybnMgdGhlIGluc2VydGVkIGRvY3VtZW50J3MgbmV3IF9pZC5cbiAgLy8gVGhlIG90aGVycyByZXR1cm4gdmFsdWVzIGltbWVkaWF0ZWx5IGlmIHlvdSBhcmUgaW4gYSBzdHViLCBhbiBpbi1tZW1vcnlcbiAgLy8gdW5tYW5hZ2VkIGNvbGxlY3Rpb24sIG9yIGEgbW9uZ28tYmFja2VkIGNvbGxlY3Rpb24gYW5kIHlvdSBkb24ndCBwYXNzIGFcbiAgLy8gY2FsbGJhY2suICd1cGRhdGUnIGFuZCAncmVtb3ZlJyByZXR1cm4gdGhlIG51bWJlciBvZiBhZmZlY3RlZFxuICAvLyBkb2N1bWVudHMuICd1cHNlcnQnIHJldHVybnMgYW4gb2JqZWN0IHdpdGgga2V5cyAnbnVtYmVyQWZmZWN0ZWQnIGFuZCwgaWYgYW5cbiAgLy8gaW5zZXJ0IGhhcHBlbmVkLCAnaW5zZXJ0ZWRJZCcuXG4gIC8vXG4gIC8vIE90aGVyd2lzZSwgdGhlIHNlbWFudGljcyBhcmUgZXhhY3RseSBsaWtlIG90aGVyIG1ldGhvZHM6IHRoZXkgdGFrZVxuICAvLyBhIGNhbGxiYWNrIGFzIGFuIG9wdGlvbmFsIGxhc3QgYXJndW1lbnQ7IGlmIG5vIGNhbGxiYWNrIGlzXG4gIC8vIHByb3ZpZGVkLCB0aGV5IGJsb2NrIHVudGlsIHRoZSBvcGVyYXRpb24gaXMgY29tcGxldGUsIGFuZCB0aHJvdyBhblxuICAvLyBleGNlcHRpb24gaWYgaXQgZmFpbHM7IGlmIGEgY2FsbGJhY2sgaXMgcHJvdmlkZWQsIHRoZW4gdGhleSBkb24ndFxuICAvLyBuZWNlc3NhcmlseSBibG9jaywgYW5kIHRoZXkgY2FsbCB0aGUgY2FsbGJhY2sgd2hlbiB0aGV5IGZpbmlzaCB3aXRoIGVycm9yIGFuZFxuICAvLyByZXN1bHQgYXJndW1lbnRzLiAgKFRoZSBpbnNlcnQgbWV0aG9kIHByb3ZpZGVzIHRoZSBkb2N1bWVudCBJRCBhcyBpdHMgcmVzdWx0O1xuICAvLyB1cGRhdGUgYW5kIHJlbW92ZSBwcm92aWRlIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jcyBhcyB0aGUgcmVzdWx0OyB1cHNlcnRcbiAgLy8gcHJvdmlkZXMgYW4gb2JqZWN0IHdpdGggbnVtYmVyQWZmZWN0ZWQgYW5kIG1heWJlIGluc2VydGVkSWQuKVxuICAvL1xuICAvLyBPbiB0aGUgY2xpZW50LCBibG9ja2luZyBpcyBpbXBvc3NpYmxlLCBzbyBpZiBhIGNhbGxiYWNrXG4gIC8vIGlzbid0IHByb3ZpZGVkLCB0aGV5IGp1c3QgcmV0dXJuIGltbWVkaWF0ZWx5IGFuZCBhbnkgZXJyb3JcbiAgLy8gaW5mb3JtYXRpb24gaXMgbG9zdC5cbiAgLy9cbiAgLy8gVGhlcmUncyBvbmUgbW9yZSB0d2Vhay4gT24gdGhlIGNsaWVudCwgaWYgeW91IGRvbid0IHByb3ZpZGUgYVxuICAvLyBjYWxsYmFjaywgdGhlbiBpZiB0aGVyZSBpcyBhbiBlcnJvciwgYSBtZXNzYWdlIHdpbGwgYmUgbG9nZ2VkIHdpdGhcbiAgLy8gTWV0ZW9yLl9kZWJ1Zy5cbiAgLy9cbiAgLy8gVGhlIGludGVudCAodGhvdWdoIHRoaXMgaXMgYWN0dWFsbHkgZGV0ZXJtaW5lZCBieSB0aGUgdW5kZXJseWluZ1xuICAvLyBkcml2ZXJzKSBpcyB0aGF0IHRoZSBvcGVyYXRpb25zIHNob3VsZCBiZSBkb25lIHN5bmNocm9ub3VzbHksIG5vdFxuICAvLyBnZW5lcmF0aW5nIHRoZWlyIHJlc3VsdCB1bnRpbCB0aGUgZGF0YWJhc2UgaGFzIGFja25vd2xlZGdlZFxuICAvLyB0aGVtLiBJbiB0aGUgZnV0dXJlIG1heWJlIHdlIHNob3VsZCBwcm92aWRlIGEgZmxhZyB0byB0dXJuIHRoaXNcbiAgLy8gb2ZmLlxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBJbnNlcnQgYSBkb2N1bWVudCBpbiB0aGUgY29sbGVjdGlvbi4gIFJldHVybnMgaXRzIHVuaXF1ZSBfaWQuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAbWV0aG9kICBpbnNlcnRcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBkb2MgVGhlIGRvY3VtZW50IHRvIGluc2VydC4gTWF5IG5vdCB5ZXQgaGF2ZSBhbiBfaWQgYXR0cmlidXRlLCBpbiB3aGljaCBjYXNlIE1ldGVvciB3aWxsIGdlbmVyYXRlIG9uZSBmb3IgeW91LlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQsIGlmIG5vIGVycm9yLCB0aGUgX2lkIGFzIHRoZSBzZWNvbmQuXG4gICAqL1xuICBpbnNlcnQoZG9jLCBjYWxsYmFjaykge1xuICAgIC8vIE1ha2Ugc3VyZSB3ZSB3ZXJlIHBhc3NlZCBhIGRvY3VtZW50IHRvIGluc2VydFxuICAgIGlmICghZG9jKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnNlcnQgcmVxdWlyZXMgYW4gYXJndW1lbnRcIik7XG4gICAgfVxuXG4gICAgLy8gTWFrZSBhIHNoYWxsb3cgY2xvbmUgb2YgdGhlIGRvY3VtZW50LCBwcmVzZXJ2aW5nIGl0cyBwcm90b3R5cGUuXG4gICAgZG9jID0gT2JqZWN0LmNyZWF0ZShcbiAgICAgIE9iamVjdC5nZXRQcm90b3R5cGVPZihkb2MpLFxuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcnMoZG9jKVxuICAgICk7XG5cbiAgICBpZiAoJ19pZCcgaW4gZG9jKSB7XG4gICAgICBpZiAoISBkb2MuX2lkIHx8XG4gICAgICAgICAgISAodHlwZW9mIGRvYy5faWQgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICAgICAgZG9jLl9pZCBpbnN0YW5jZW9mIE1vbmdvLk9iamVjdElEKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgXCJNZXRlb3IgcmVxdWlyZXMgZG9jdW1lbnQgX2lkIGZpZWxkcyB0byBiZSBub24tZW1wdHkgc3RyaW5ncyBvciBPYmplY3RJRHNcIik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGxldCBnZW5lcmF0ZUlkID0gdHJ1ZTtcblxuICAgICAgLy8gRG9uJ3QgZ2VuZXJhdGUgdGhlIGlkIGlmIHdlJ3JlIHRoZSBjbGllbnQgYW5kIHRoZSAnb3V0ZXJtb3N0JyBjYWxsXG4gICAgICAvLyBUaGlzIG9wdGltaXphdGlvbiBzYXZlcyB1cyBwYXNzaW5nIGJvdGggdGhlIHJhbmRvbVNlZWQgYW5kIHRoZSBpZFxuICAgICAgLy8gUGFzc2luZyBib3RoIGlzIHJlZHVuZGFudC5cbiAgICAgIGlmICh0aGlzLl9pc1JlbW90ZUNvbGxlY3Rpb24oKSkge1xuICAgICAgICBjb25zdCBlbmNsb3NpbmcgPSBERFAuX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uLmdldCgpO1xuICAgICAgICBpZiAoIWVuY2xvc2luZykge1xuICAgICAgICAgIGdlbmVyYXRlSWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZ2VuZXJhdGVJZCkge1xuICAgICAgICBkb2MuX2lkID0gdGhpcy5fbWFrZU5ld0lEKCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gT24gaW5zZXJ0cywgYWx3YXlzIHJldHVybiB0aGUgaWQgdGhhdCB3ZSBnZW5lcmF0ZWQ7IG9uIGFsbCBvdGhlclxuICAgIC8vIG9wZXJhdGlvbnMsIGp1c3QgcmV0dXJuIHRoZSByZXN1bHQgZnJvbSB0aGUgY29sbGVjdGlvbi5cbiAgICB2YXIgY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdCA9IGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgIGlmIChkb2MuX2lkKSB7XG4gICAgICAgIHJldHVybiBkb2MuX2lkO1xuICAgICAgfVxuXG4gICAgICAvLyBYWFggd2hhdCBpcyB0aGlzIGZvcj8/XG4gICAgICAvLyBJdCdzIHNvbWUgaXRlcmFjdGlvbiBiZXR3ZWVuIHRoZSBjYWxsYmFjayB0byBfY2FsbE11dGF0b3JNZXRob2QgYW5kXG4gICAgICAvLyB0aGUgcmV0dXJuIHZhbHVlIGNvbnZlcnNpb25cbiAgICAgIGRvYy5faWQgPSByZXN1bHQ7XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcblxuICAgIGNvbnN0IHdyYXBwZWRDYWxsYmFjayA9IHdyYXBDYWxsYmFjayhcbiAgICAgIGNhbGxiYWNrLCBjaG9vc2VSZXR1cm5WYWx1ZUZyb21Db2xsZWN0aW9uUmVzdWx0KTtcblxuICAgIGlmICh0aGlzLl9pc1JlbW90ZUNvbGxlY3Rpb24oKSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fY2FsbE11dGF0b3JNZXRob2QoXCJpbnNlcnRcIiwgW2RvY10sIHdyYXBwZWRDYWxsYmFjayk7XG4gICAgICByZXR1cm4gY2hvb3NlUmV0dXJuVmFsdWVGcm9tQ29sbGVjdGlvblJlc3VsdChyZXN1bHQpO1xuICAgIH1cblxuICAgIC8vIGl0J3MgbXkgY29sbGVjdGlvbi4gIGRlc2NlbmQgaW50byB0aGUgY29sbGVjdGlvbiBvYmplY3RcbiAgICAvLyBhbmQgcHJvcGFnYXRlIGFueSBleGNlcHRpb24uXG4gICAgdHJ5IHtcbiAgICAgIC8vIElmIHRoZSB1c2VyIHByb3ZpZGVkIGEgY2FsbGJhY2sgYW5kIHRoZSBjb2xsZWN0aW9uIGltcGxlbWVudHMgdGhpc1xuICAgICAgLy8gb3BlcmF0aW9uIGFzeW5jaHJvbm91c2x5LCB0aGVuIHF1ZXJ5UmV0IHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAgICAvLyByZXN1bHQgd2lsbCBiZSByZXR1cm5lZCB0aHJvdWdoIHRoZSBjYWxsYmFjayBpbnN0ZWFkLlxuICAgICAgY29uc3QgcmVzdWx0ID0gdGhpcy5fY29sbGVjdGlvbi5pbnNlcnQoZG9jLCB3cmFwcGVkQ2FsbGJhY2spO1xuICAgICAgcmV0dXJuIGNob29zZVJldHVyblZhbHVlRnJvbUNvbGxlY3Rpb25SZXN1bHQocmVzdWx0KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2soZSk7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IE1vZGlmeSBvbmUgb3IgbW9yZSBkb2N1bWVudHMgaW4gdGhlIGNvbGxlY3Rpb24uIFJldHVybnMgdGhlIG51bWJlciBvZiBtYXRjaGVkIGRvY3VtZW50cy5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgdXBkYXRlXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gbW9kaWZ5XG4gICAqIEBwYXJhbSB7TW9uZ29Nb2RpZmllcn0gbW9kaWZpZXIgU3BlY2lmaWVzIGhvdyB0byBtb2RpZnkgdGhlIGRvY3VtZW50c1xuICAgKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5tdWx0aSBUcnVlIHRvIG1vZGlmeSBhbGwgbWF0Y2hpbmcgZG9jdW1lbnRzOyBmYWxzZSB0byBvbmx5IG1vZGlmeSBvbmUgb2YgdGhlIG1hdGNoaW5nIGRvY3VtZW50cyAodGhlIGRlZmF1bHQpLlxuICAgKiBAcGFyYW0ge0Jvb2xlYW59IG9wdGlvbnMudXBzZXJ0IFRydWUgdG8gaW5zZXJ0IGEgZG9jdW1lbnQgaWYgbm8gbWF0Y2hpbmcgZG9jdW1lbnRzIGFyZSBmb3VuZC5cbiAgICogQHBhcmFtIHtBcnJheX0gb3B0aW9ucy5hcnJheUZpbHRlcnMgT3B0aW9uYWwuIFVzZWQgaW4gY29tYmluYXRpb24gd2l0aCBNb25nb0RCIFtmaWx0ZXJlZCBwb3NpdGlvbmFsIG9wZXJhdG9yXShodHRwczovL2RvY3MubW9uZ29kYi5jb20vbWFudWFsL3JlZmVyZW5jZS9vcGVyYXRvci91cGRhdGUvcG9zaXRpb25hbC1maWx0ZXJlZC8pIHRvIHNwZWNpZnkgd2hpY2ggZWxlbWVudHMgdG8gbW9kaWZ5IGluIGFuIGFycmF5IGZpZWxkLlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBbY2FsbGJhY2tdIE9wdGlvbmFsLiAgSWYgcHJlc2VudCwgY2FsbGVkIHdpdGggYW4gZXJyb3Igb2JqZWN0IGFzIHRoZSBmaXJzdCBhcmd1bWVudCBhbmQsIGlmIG5vIGVycm9yLCB0aGUgbnVtYmVyIG9mIGFmZmVjdGVkIGRvY3VtZW50cyBhcyB0aGUgc2Vjb25kLlxuICAgKi9cbiAgdXBkYXRlKHNlbGVjdG9yLCBtb2RpZmllciwgLi4ub3B0aW9uc0FuZENhbGxiYWNrKSB7XG4gICAgY29uc3QgY2FsbGJhY2sgPSBwb3BDYWxsYmFja0Zyb21BcmdzKG9wdGlvbnNBbmRDYWxsYmFjayk7XG5cbiAgICAvLyBXZSd2ZSBhbHJlYWR5IHBvcHBlZCBvZmYgdGhlIGNhbGxiYWNrLCBzbyB3ZSBhcmUgbGVmdCB3aXRoIGFuIGFycmF5XG4gICAgLy8gb2Ygb25lIG9yIHplcm8gaXRlbXNcbiAgICBjb25zdCBvcHRpb25zID0geyAuLi4ob3B0aW9uc0FuZENhbGxiYWNrWzBdIHx8IG51bGwpIH07XG4gICAgbGV0IGluc2VydGVkSWQ7XG4gICAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy51cHNlcnQpIHtcbiAgICAgIC8vIHNldCBgaW5zZXJ0ZWRJZGAgaWYgYWJzZW50LiAgYGluc2VydGVkSWRgIGlzIGEgTWV0ZW9yIGV4dGVuc2lvbi5cbiAgICAgIGlmIChvcHRpb25zLmluc2VydGVkSWQpIHtcbiAgICAgICAgaWYgKCEodHlwZW9mIG9wdGlvbnMuaW5zZXJ0ZWRJZCA9PT0gJ3N0cmluZycgfHwgb3B0aW9ucy5pbnNlcnRlZElkIGluc3RhbmNlb2YgTW9uZ28uT2JqZWN0SUQpKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImluc2VydGVkSWQgbXVzdCBiZSBzdHJpbmcgb3IgT2JqZWN0SURcIik7XG4gICAgICAgIGluc2VydGVkSWQgPSBvcHRpb25zLmluc2VydGVkSWQ7XG4gICAgICB9IGVsc2UgaWYgKCFzZWxlY3RvciB8fCAhc2VsZWN0b3IuX2lkKSB7XG4gICAgICAgIGluc2VydGVkSWQgPSB0aGlzLl9tYWtlTmV3SUQoKTtcbiAgICAgICAgb3B0aW9ucy5nZW5lcmF0ZWRJZCA9IHRydWU7XG4gICAgICAgIG9wdGlvbnMuaW5zZXJ0ZWRJZCA9IGluc2VydGVkSWQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgc2VsZWN0b3IgPVxuICAgICAgTW9uZ28uQ29sbGVjdGlvbi5fcmV3cml0ZVNlbGVjdG9yKHNlbGVjdG9yLCB7IGZhbGxiYWNrSWQ6IGluc2VydGVkSWQgfSk7XG5cbiAgICBjb25zdCB3cmFwcGVkQ2FsbGJhY2sgPSB3cmFwQ2FsbGJhY2soY2FsbGJhY2spO1xuXG4gICAgaWYgKHRoaXMuX2lzUmVtb3RlQ29sbGVjdGlvbigpKSB7XG4gICAgICBjb25zdCBhcmdzID0gW1xuICAgICAgICBzZWxlY3RvcixcbiAgICAgICAgbW9kaWZpZXIsXG4gICAgICAgIG9wdGlvbnNcbiAgICAgIF07XG5cbiAgICAgIHJldHVybiB0aGlzLl9jYWxsTXV0YXRvck1ldGhvZChcInVwZGF0ZVwiLCBhcmdzLCB3cmFwcGVkQ2FsbGJhY2spO1xuICAgIH1cblxuICAgIC8vIGl0J3MgbXkgY29sbGVjdGlvbi4gIGRlc2NlbmQgaW50byB0aGUgY29sbGVjdGlvbiBvYmplY3RcbiAgICAvLyBhbmQgcHJvcGFnYXRlIGFueSBleGNlcHRpb24uXG4gICAgdHJ5IHtcbiAgICAgIC8vIElmIHRoZSB1c2VyIHByb3ZpZGVkIGEgY2FsbGJhY2sgYW5kIHRoZSBjb2xsZWN0aW9uIGltcGxlbWVudHMgdGhpc1xuICAgICAgLy8gb3BlcmF0aW9uIGFzeW5jaHJvbm91c2x5LCB0aGVuIHF1ZXJ5UmV0IHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAgICAvLyByZXN1bHQgd2lsbCBiZSByZXR1cm5lZCB0aHJvdWdoIHRoZSBjYWxsYmFjayBpbnN0ZWFkLlxuICAgICAgcmV0dXJuIHRoaXMuX2NvbGxlY3Rpb24udXBkYXRlKFxuICAgICAgICBzZWxlY3RvciwgbW9kaWZpZXIsIG9wdGlvbnMsIHdyYXBwZWRDYWxsYmFjayk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKGUpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZW1vdmUgZG9jdW1lbnRzIGZyb20gdGhlIGNvbGxlY3Rpb25cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBtZXRob2QgcmVtb3ZlXG4gICAqIEBtZW1iZXJvZiBNb25nby5Db2xsZWN0aW9uXG4gICAqIEBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge01vbmdvU2VsZWN0b3J9IHNlbGVjdG9yIFNwZWNpZmllcyB3aGljaCBkb2N1bWVudHMgdG8gcmVtb3ZlXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gT3B0aW9uYWwuICBJZiBwcmVzZW50LCBjYWxsZWQgd2l0aCBhbiBlcnJvciBvYmplY3QgYXMgaXRzIGFyZ3VtZW50LlxuICAgKi9cbiAgcmVtb3ZlKHNlbGVjdG9yLCBjYWxsYmFjaykge1xuICAgIHNlbGVjdG9yID0gTW9uZ28uQ29sbGVjdGlvbi5fcmV3cml0ZVNlbGVjdG9yKHNlbGVjdG9yKTtcblxuICAgIGNvbnN0IHdyYXBwZWRDYWxsYmFjayA9IHdyYXBDYWxsYmFjayhjYWxsYmFjayk7XG5cbiAgICBpZiAodGhpcy5faXNSZW1vdGVDb2xsZWN0aW9uKCkpIHtcbiAgICAgIHJldHVybiB0aGlzLl9jYWxsTXV0YXRvck1ldGhvZChcInJlbW92ZVwiLCBbc2VsZWN0b3JdLCB3cmFwcGVkQ2FsbGJhY2spO1xuICAgIH1cblxuICAgIC8vIGl0J3MgbXkgY29sbGVjdGlvbi4gIGRlc2NlbmQgaW50byB0aGUgY29sbGVjdGlvbiBvYmplY3RcbiAgICAvLyBhbmQgcHJvcGFnYXRlIGFueSBleGNlcHRpb24uXG4gICAgdHJ5IHtcbiAgICAgIC8vIElmIHRoZSB1c2VyIHByb3ZpZGVkIGEgY2FsbGJhY2sgYW5kIHRoZSBjb2xsZWN0aW9uIGltcGxlbWVudHMgdGhpc1xuICAgICAgLy8gb3BlcmF0aW9uIGFzeW5jaHJvbm91c2x5LCB0aGVuIHF1ZXJ5UmV0IHdpbGwgYmUgdW5kZWZpbmVkLCBhbmQgdGhlXG4gICAgICAvLyByZXN1bHQgd2lsbCBiZSByZXR1cm5lZCB0aHJvdWdoIHRoZSBjYWxsYmFjayBpbnN0ZWFkLlxuICAgICAgcmV0dXJuIHRoaXMuX2NvbGxlY3Rpb24ucmVtb3ZlKHNlbGVjdG9yLCB3cmFwcGVkQ2FsbGJhY2spO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBjYWxsYmFjayhlKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfSxcblxuICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBjb2xsZWN0aW9uIGlzIHNpbXBseSBhIG1pbmltb25nbyByZXByZXNlbnRhdGlvbiBvZiBhIHJlYWxcbiAgLy8gZGF0YWJhc2Ugb24gYW5vdGhlciBzZXJ2ZXJcbiAgX2lzUmVtb3RlQ29sbGVjdGlvbigpIHtcbiAgICAvLyBYWFggc2VlICNNZXRlb3JTZXJ2ZXJOdWxsXG4gICAgcmV0dXJuIHRoaXMuX2Nvbm5lY3Rpb24gJiYgdGhpcy5fY29ubmVjdGlvbiAhPT0gTWV0ZW9yLnNlcnZlcjtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgTW9kaWZ5IG9uZSBvciBtb3JlIGRvY3VtZW50cyBpbiB0aGUgY29sbGVjdGlvbiwgb3IgaW5zZXJ0IG9uZSBpZiBubyBtYXRjaGluZyBkb2N1bWVudHMgd2VyZSBmb3VuZC4gUmV0dXJucyBhbiBvYmplY3Qgd2l0aCBrZXlzIGBudW1iZXJBZmZlY3RlZGAgKHRoZSBudW1iZXIgb2YgZG9jdW1lbnRzIG1vZGlmaWVkKSAgYW5kIGBpbnNlcnRlZElkYCAodGhlIHVuaXF1ZSBfaWQgb2YgdGhlIGRvY3VtZW50IHRoYXQgd2FzIGluc2VydGVkLCBpZiBhbnkpLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQG1ldGhvZCB1cHNlcnRcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqIEBwYXJhbSB7TW9uZ29TZWxlY3Rvcn0gc2VsZWN0b3IgU3BlY2lmaWVzIHdoaWNoIGRvY3VtZW50cyB0byBtb2RpZnlcbiAgICogQHBhcmFtIHtNb25nb01vZGlmaWVyfSBtb2RpZmllciBTcGVjaWZpZXMgaG93IHRvIG1vZGlmeSB0aGUgZG9jdW1lbnRzXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLm11bHRpIFRydWUgdG8gbW9kaWZ5IGFsbCBtYXRjaGluZyBkb2N1bWVudHM7IGZhbHNlIHRvIG9ubHkgbW9kaWZ5IG9uZSBvZiB0aGUgbWF0Y2hpbmcgZG9jdW1lbnRzICh0aGUgZGVmYXVsdCkuXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IFtjYWxsYmFja10gT3B0aW9uYWwuICBJZiBwcmVzZW50LCBjYWxsZWQgd2l0aCBhbiBlcnJvciBvYmplY3QgYXMgdGhlIGZpcnN0IGFyZ3VtZW50IGFuZCwgaWYgbm8gZXJyb3IsIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZG9jdW1lbnRzIGFzIHRoZSBzZWNvbmQuXG4gICAqL1xuICB1cHNlcnQoc2VsZWN0b3IsIG1vZGlmaWVyLCBvcHRpb25zLCBjYWxsYmFjaykge1xuICAgIGlmICghIGNhbGxiYWNrICYmIHR5cGVvZiBvcHRpb25zID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIGNhbGxiYWNrID0gb3B0aW9ucztcbiAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy51cGRhdGUoc2VsZWN0b3IsIG1vZGlmaWVyLCB7XG4gICAgICAuLi5vcHRpb25zLFxuICAgICAgX3JldHVybk9iamVjdDogdHJ1ZSxcbiAgICAgIHVwc2VydDogdHJ1ZSxcbiAgICB9LCBjYWxsYmFjayk7XG4gIH0sXG5cbiAgLy8gV2UnbGwgYWN0dWFsbHkgZGVzaWduIGFuIGluZGV4IEFQSSBsYXRlci4gRm9yIG5vdywgd2UganVzdCBwYXNzIHRocm91Z2ggdG9cbiAgLy8gTW9uZ28ncywgYnV0IG1ha2UgaXQgc3luY2hyb25vdXMuXG4gIF9lbnN1cmVJbmRleChpbmRleCwgb3B0aW9ucykge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoIXNlbGYuX2NvbGxlY3Rpb24uX2Vuc3VyZUluZGV4KVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgY2FsbCBfZW5zdXJlSW5kZXggb24gc2VydmVyIGNvbGxlY3Rpb25zXCIpO1xuICAgIHNlbGYuX2NvbGxlY3Rpb24uX2Vuc3VyZUluZGV4KGluZGV4LCBvcHRpb25zKTtcbiAgfSxcblxuICBfZHJvcEluZGV4KGluZGV4KSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghc2VsZi5fY29sbGVjdGlvbi5fZHJvcEluZGV4KVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgY2FsbCBfZHJvcEluZGV4IG9uIHNlcnZlciBjb2xsZWN0aW9uc1wiKTtcbiAgICBzZWxmLl9jb2xsZWN0aW9uLl9kcm9wSW5kZXgoaW5kZXgpO1xuICB9LFxuXG4gIF9kcm9wQ29sbGVjdGlvbigpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgaWYgKCFzZWxmLl9jb2xsZWN0aW9uLmRyb3BDb2xsZWN0aW9uKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuIG9ubHkgY2FsbCBfZHJvcENvbGxlY3Rpb24gb24gc2VydmVyIGNvbGxlY3Rpb25zXCIpO1xuICAgIHNlbGYuX2NvbGxlY3Rpb24uZHJvcENvbGxlY3Rpb24oKTtcbiAgfSxcblxuICBfY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbihieXRlU2l6ZSwgbWF4RG9jdW1lbnRzKSB7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIGlmICghc2VsZi5fY29sbGVjdGlvbi5fY3JlYXRlQ2FwcGVkQ29sbGVjdGlvbilcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24gb24gc2VydmVyIGNvbGxlY3Rpb25zXCIpO1xuICAgIHNlbGYuX2NvbGxlY3Rpb24uX2NyZWF0ZUNhcHBlZENvbGxlY3Rpb24oYnl0ZVNpemUsIG1heERvY3VtZW50cyk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFJldHVybnMgdGhlIFtgQ29sbGVjdGlvbmBdKGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5pby9ub2RlLW1vbmdvZGItbmF0aXZlLzMuMC9hcGkvQ29sbGVjdGlvbi5odG1sKSBvYmplY3QgY29ycmVzcG9uZGluZyB0byB0aGlzIGNvbGxlY3Rpb24gZnJvbSB0aGUgW25wbSBgbW9uZ29kYmAgZHJpdmVyIG1vZHVsZV0oaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvbW9uZ29kYikgd2hpY2ggaXMgd3JhcHBlZCBieSBgTW9uZ28uQ29sbGVjdGlvbmAuXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQG1lbWJlcm9mIE1vbmdvLkNvbGxlY3Rpb25cbiAgICogQGluc3RhbmNlXG4gICAqL1xuICByYXdDb2xsZWN0aW9uKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoISBzZWxmLl9jb2xsZWN0aW9uLnJhd0NvbGxlY3Rpb24pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgcmF3Q29sbGVjdGlvbiBvbiBzZXJ2ZXIgY29sbGVjdGlvbnNcIik7XG4gICAgfVxuICAgIHJldHVybiBzZWxmLl9jb2xsZWN0aW9uLnJhd0NvbGxlY3Rpb24oKTtcbiAgfSxcblxuICAvKipcbiAgICogQHN1bW1hcnkgUmV0dXJucyB0aGUgW2BEYmBdKGh0dHA6Ly9tb25nb2RiLmdpdGh1Yi5pby9ub2RlLW1vbmdvZGItbmF0aXZlLzMuMC9hcGkvRGIuaHRtbCkgb2JqZWN0IGNvcnJlc3BvbmRpbmcgdG8gdGhpcyBjb2xsZWN0aW9uJ3MgZGF0YWJhc2UgY29ubmVjdGlvbiBmcm9tIHRoZSBbbnBtIGBtb25nb2RiYCBkcml2ZXIgbW9kdWxlXShodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9tb25nb2RiKSB3aGljaCBpcyB3cmFwcGVkIGJ5IGBNb25nby5Db2xsZWN0aW9uYC5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAbWVtYmVyb2YgTW9uZ28uQ29sbGVjdGlvblxuICAgKiBAaW5zdGFuY2VcbiAgICovXG4gIHJhd0RhdGFiYXNlKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBpZiAoISAoc2VsZi5fZHJpdmVyLm1vbmdvICYmIHNlbGYuX2RyaXZlci5tb25nby5kYikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgcmF3RGF0YWJhc2Ugb24gc2VydmVyIGNvbGxlY3Rpb25zXCIpO1xuICAgIH1cbiAgICByZXR1cm4gc2VsZi5fZHJpdmVyLm1vbmdvLmRiO1xuICB9XG59KTtcblxuLy8gQ29udmVydCB0aGUgY2FsbGJhY2sgdG8gbm90IHJldHVybiBhIHJlc3VsdCBpZiB0aGVyZSBpcyBhbiBlcnJvclxuZnVuY3Rpb24gd3JhcENhbGxiYWNrKGNhbGxiYWNrLCBjb252ZXJ0UmVzdWx0KSB7XG4gIHJldHVybiBjYWxsYmFjayAmJiBmdW5jdGlvbiAoZXJyb3IsIHJlc3VsdCkge1xuICAgIGlmIChlcnJvcikge1xuICAgICAgY2FsbGJhY2soZXJyb3IpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbnZlcnRSZXN1bHQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgY2FsbGJhY2soZXJyb3IsIGNvbnZlcnRSZXN1bHQocmVzdWx0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKGVycm9yLCByZXN1bHQpO1xuICAgIH1cbiAgfTtcbn1cblxuLyoqXG4gKiBAc3VtbWFyeSBDcmVhdGUgYSBNb25nby1zdHlsZSBgT2JqZWN0SURgLiAgSWYgeW91IGRvbid0IHNwZWNpZnkgYSBgaGV4U3RyaW5nYCwgdGhlIGBPYmplY3RJRGAgd2lsbCBnZW5lcmF0ZWQgcmFuZG9tbHkgKG5vdCB1c2luZyBNb25nb0RCJ3MgSUQgY29uc3RydWN0aW9uIHJ1bGVzKS5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGNsYXNzXG4gKiBAcGFyYW0ge1N0cmluZ30gW2hleFN0cmluZ10gT3B0aW9uYWwuICBUaGUgMjQtY2hhcmFjdGVyIGhleGFkZWNpbWFsIGNvbnRlbnRzIG9mIHRoZSBPYmplY3RJRCB0byBjcmVhdGVcbiAqL1xuTW9uZ28uT2JqZWN0SUQgPSBNb25nb0lELk9iamVjdElEO1xuXG4vKipcbiAqIEBzdW1tYXJ5IFRvIGNyZWF0ZSBhIGN1cnNvciwgdXNlIGZpbmQuIFRvIGFjY2VzcyB0aGUgZG9jdW1lbnRzIGluIGEgY3Vyc29yLCB1c2UgZm9yRWFjaCwgbWFwLCBvciBmZXRjaC5cbiAqIEBjbGFzc1xuICogQGluc3RhbmNlTmFtZSBjdXJzb3JcbiAqL1xuTW9uZ28uQ3Vyc29yID0gTG9jYWxDb2xsZWN0aW9uLkN1cnNvcjtcblxuLyoqXG4gKiBAZGVwcmVjYXRlZCBpbiAwLjkuMVxuICovXG5Nb25nby5Db2xsZWN0aW9uLkN1cnNvciA9IE1vbmdvLkN1cnNvcjtcblxuLyoqXG4gKiBAZGVwcmVjYXRlZCBpbiAwLjkuMVxuICovXG5Nb25nby5Db2xsZWN0aW9uLk9iamVjdElEID0gTW9uZ28uT2JqZWN0SUQ7XG5cbi8qKlxuICogQGRlcHJlY2F0ZWQgaW4gMC45LjFcbiAqL1xuTWV0ZW9yLkNvbGxlY3Rpb24gPSBNb25nby5Db2xsZWN0aW9uO1xuXG4vLyBBbGxvdyBkZW55IHN0dWZmIGlzIG5vdyBpbiB0aGUgYWxsb3ctZGVueSBwYWNrYWdlXG5PYmplY3QuYXNzaWduKFxuICBNZXRlb3IuQ29sbGVjdGlvbi5wcm90b3R5cGUsXG4gIEFsbG93RGVueS5Db2xsZWN0aW9uUHJvdG90eXBlXG4pO1xuXG5mdW5jdGlvbiBwb3BDYWxsYmFja0Zyb21BcmdzKGFyZ3MpIHtcbiAgLy8gUHVsbCBvZmYgYW55IGNhbGxiYWNrIChvciBwZXJoYXBzIGEgJ2NhbGxiYWNrJyB2YXJpYWJsZSB0aGF0IHdhcyBwYXNzZWRcbiAgLy8gaW4gdW5kZWZpbmVkLCBsaWtlIGhvdyAndXBzZXJ0JyBkb2VzIGl0KS5cbiAgaWYgKGFyZ3MubGVuZ3RoICYmXG4gICAgICAoYXJnc1thcmdzLmxlbmd0aCAtIDFdID09PSB1bmRlZmluZWQgfHxcbiAgICAgICBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICByZXR1cm4gYXJncy5wb3AoKTtcbiAgfVxufVxuIiwiLyoqXG4gKiBAc3VtbWFyeSBBbGxvd3MgZm9yIHVzZXIgc3BlY2lmaWVkIGNvbm5lY3Rpb24gb3B0aW9uc1xuICogQGV4YW1wbGUgaHR0cDovL21vbmdvZGIuZ2l0aHViLmlvL25vZGUtbW9uZ29kYi1uYXRpdmUvMy4wL3JlZmVyZW5jZS9jb25uZWN0aW5nL2Nvbm5lY3Rpb24tc2V0dGluZ3MvXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBVc2VyIHNwZWNpZmllZCBNb25nbyBjb25uZWN0aW9uIG9wdGlvbnNcbiAqL1xuTW9uZ28uc2V0Q29ubmVjdGlvbk9wdGlvbnMgPSBmdW5jdGlvbiBzZXRDb25uZWN0aW9uT3B0aW9ucyAob3B0aW9ucykge1xuICBjaGVjayhvcHRpb25zLCBPYmplY3QpO1xuICBNb25nby5fY29ubmVjdGlvbk9wdGlvbnMgPSBvcHRpb25zO1xufTsiXX0=
