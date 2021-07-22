(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var ECMAScript = Package.ecmascript.ECMAScript;
var DDPRateLimiter = Package['ddp-rate-limiter'].DDPRateLimiter;
var check = Package.check.check;
var Match = Package.check.Match;
var Random = Package.random.Random;
var EJSON = Package.ejson.EJSON;
var Hook = Package['callback-hook'].Hook;
var URL = Package.url.URL;
var URLSearchParams = Package.url.URLSearchParams;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var MongoInternals = Package.mongo.MongoInternals;
var Mongo = Package.mongo.Mongo;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var Accounts, options, stampedLoginToken, handler, name, query, oldestValidDate, user;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-base":{"server_main.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/accounts-base/server_main.js                                                                            //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
!function (module1) {
  module1.export({
    AccountsServer: () => AccountsServer
  });
  let AccountsServer;
  module1.link("./accounts_server.js", {
    AccountsServer(v) {
      AccountsServer = v;
    }

  }, 0);

  /**
   * @namespace Accounts
   * @summary The namespace for all server-side accounts-related methods.
   */
  Accounts = new AccountsServer(Meteor.server); // Users table. Don't use the normal autopublish, since we want to hide
  // some fields. Code to autopublish this is in accounts_server.js.
  // XXX Allow users to configure this collection name.

  /**
   * @summary A [Mongo.Collection](#collections) containing user documents.
   * @locus Anywhere
   * @type {Mongo.Collection}
   * @importFromPackage meteor
  */

  Meteor.users = Accounts.users;
}.call(this, module);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"accounts_common.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/accounts-base/accounts_common.js                                                                        //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let _objectSpread;

module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }

}, 0);
module.export({
  AccountsCommon: () => AccountsCommon,
  EXPIRE_TOKENS_INTERVAL_MS: () => EXPIRE_TOKENS_INTERVAL_MS,
  CONNECTION_CLOSE_DELAY_MS: () => CONNECTION_CLOSE_DELAY_MS
});

class AccountsCommon {
  constructor(options) {
    // Currently this is read directly by packages like accounts-password
    // and accounts-ui-unstyled.
    this._options = {}; // Note that setting this.connection = null causes this.users to be a
    // LocalCollection, which is not what we want.

    this.connection = undefined;

    this._initConnection(options || {}); // There is an allow call in accounts_server.js that restricts writes to
    // this collection.


    this.users = new Mongo.Collection("users", {
      _preventAutopublish: true,
      connection: this.connection
    }); // Callback exceptions are printed with Meteor._debug and ignored.

    this._onLoginHook = new Hook({
      bindEnvironment: false,
      debugPrintExceptions: "onLogin callback"
    });
    this._onLoginFailureHook = new Hook({
      bindEnvironment: false,
      debugPrintExceptions: "onLoginFailure callback"
    });
    this._onLogoutHook = new Hook({
      bindEnvironment: false,
      debugPrintExceptions: "onLogout callback"
    }); // Expose for testing.

    this.DEFAULT_LOGIN_EXPIRATION_DAYS = DEFAULT_LOGIN_EXPIRATION_DAYS;
    this.LOGIN_UNEXPIRING_TOKEN_DAYS = LOGIN_UNEXPIRING_TOKEN_DAYS; // Thrown when the user cancels the login process (eg, closes an oauth
    // popup, declines retina scan, etc)

    const lceName = 'Accounts.LoginCancelledError';
    this.LoginCancelledError = Meteor.makeErrorType(lceName, function (description) {
      this.message = description;
    });
    this.LoginCancelledError.prototype.name = lceName; // This is used to transmit specific subclass errors over the wire. We
    // should come up with a more generic way to do this (eg, with some sort of
    // symbolic error code rather than a number).

    this.LoginCancelledError.numericError = 0x8acdc2f; // loginServiceConfiguration and ConfigError are maintained for backwards compatibility

    Meteor.startup(() => {
      const {
        ServiceConfiguration
      } = Package['service-configuration'];
      this.loginServiceConfiguration = ServiceConfiguration.configurations;
      this.ConfigError = ServiceConfiguration.ConfigError;
    });
  }
  /**
   * @summary Get the current user id, or `null` if no user is logged in. A reactive data source.
   * @locus Anywhere
   */


  userId() {
    throw new Error("userId method not implemented");
  } // merge the defaultFieldSelector with an existing options object


  _addDefaultFieldSelector() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    // this will be the most common case for most people, so make it quick
    if (!this._options.defaultFieldSelector) return options; // if no field selector then just use defaultFieldSelector

    if (!options.fields) return _objectSpread(_objectSpread({}, options), {}, {
      fields: this._options.defaultFieldSelector
    }); // if empty field selector then the full user object is explicitly requested, so obey

    const keys = Object.keys(options.fields);
    if (!keys.length) return options; // if the requested fields are +ve then ignore defaultFieldSelector
    // assume they are all either +ve or -ve because Mongo doesn't like mixed

    if (!!options.fields[keys[0]]) return options; // The requested fields are -ve.
    // If the defaultFieldSelector is +ve then use requested fields, otherwise merge them

    const keys2 = Object.keys(this._options.defaultFieldSelector);
    return this._options.defaultFieldSelector[keys2[0]] ? options : _objectSpread(_objectSpread({}, options), {}, {
      fields: _objectSpread(_objectSpread({}, options.fields), this._options.defaultFieldSelector)
    });
  }
  /**
   * @summary Get the current user record, or `null` if no user is logged in. A reactive data source.
   * @locus Anywhere
   * @param {Object} [options]
   * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
   */


  user(options) {
    const userId = this.userId();
    return userId ? this.users.findOne(userId, this._addDefaultFieldSelector(options)) : null;
  } // Set up config for the accounts system. Call this on both the client
  // and the server.
  //
  // Note that this method gets overridden on AccountsServer.prototype, but
  // the overriding method calls the overridden method.
  //
  // XXX we should add some enforcement that this is called on both the
  // client and the server. Otherwise, a user can
  // 'forbidClientAccountCreation' only on the client and while it looks
  // like their app is secure, the server will still accept createUser
  // calls. https://github.com/meteor/meteor/issues/828
  //
  // @param options {Object} an object with fields:
  // - sendVerificationEmail {Boolean}
  //     Send email address verification emails to new users created from
  //     client signups.
  // - forbidClientAccountCreation {Boolean}
  //     Do not allow clients to create accounts directly.
  // - restrictCreationByEmailDomain {Function or String}
  //     Require created users to have an email matching the function or
  //     having the string as domain.
  // - loginExpirationInDays {Number}
  //     Number of days since login until a user is logged out (login token
  //     expires).
  // - passwordResetTokenExpirationInDays {Number}
  //     Number of days since password reset token creation until the
  //     token cannt be used any longer (password reset token expires).
  // - ambiguousErrorMessages {Boolean}
  //     Return ambiguous error messages from login failures to prevent
  //     user enumeration.
  // - bcryptRounds {Number}
  //     Allows override of number of bcrypt rounds (aka work factor) used
  //     to store passwords.

  /**
   * @summary Set global accounts options.
   * @locus Anywhere
   * @param {Object} options
   * @param {Boolean} options.sendVerificationEmail New users with an email address will receive an address verification email.
   * @param {Boolean} options.forbidClientAccountCreation Calls to [`createUser`](#accounts_createuser) from the client will be rejected. In addition, if you are using [accounts-ui](#accountsui), the "Create account" link will not be available.
   * @param {String | Function} options.restrictCreationByEmailDomain If set to a string, only allows new users if the domain part of their email address matches the string. If set to a function, only allows new users if the function returns true.  The function is passed the full email address of the proposed new user.  Works with password-based sign-in and external services that expose email addresses (Google, Facebook, GitHub). All existing users still can log in after enabling this option. Example: `Accounts.config({ restrictCreationByEmailDomain: 'school.edu' })`.
   * @param {Number} options.loginExpirationInDays The number of days from when a user logs in until their token expires and they are logged out. Defaults to 90. Set to `null` to disable login expiration.
   * @param {Number} options.loginExpiration The number of milliseconds from when a user logs in until their token expires and they are logged out, for a more granular control. If `loginExpirationInDays` is set, it takes precedent.
   * @param {String} options.oauthSecretKey When using the `oauth-encryption` package, the 16 byte key using to encrypt sensitive account credentials in the database, encoded in base64.  This option may only be specified on the server.  See packages/oauth-encryption/README.md for details.
   * @param {Number} options.passwordResetTokenExpirationInDays The number of days from when a link to reset password is sent until token expires and user can't reset password with the link anymore. Defaults to 3.
   * @param {Number} options.passwordResetTokenExpiration The number of milliseconds from when a link to reset password is sent until token expires and user can't reset password with the link anymore. If `passwordResetTokenExpirationInDays` is set, it takes precedent.
   * @param {Number} options.passwordEnrollTokenExpirationInDays The number of days from when a link to set initial password is sent until token expires and user can't set password with the link anymore. Defaults to 30.
   * @param {Number} options.passwordEnrollTokenExpiration The number of milliseconds from when a link to set initial password is sent until token expires and user can't set password with the link anymore. If `passwordEnrollTokenExpirationInDays` is set, it takes precedent.
   * @param {Boolean} options.ambiguousErrorMessages Return ambiguous error messages from login failures to prevent user enumeration. Defaults to false.
   * @param {MongoFieldSpecifier} options.defaultFieldSelector To exclude by default large custom fields from `Meteor.user()` and `Meteor.findUserBy...()` functions when called without a field selector, and all `onLogin`, `onLoginFailure` and `onLogout` callbacks.  Example: `Accounts.config({ defaultFieldSelector: { myBigArray: 0 }})`.
   */


  config(options) {
    // We don't want users to accidentally only call Accounts.config on the
    // client, where some of the options will have partial effects (eg removing
    // the "create account" button from accounts-ui if forbidClientAccountCreation
    // is set, or redirecting Google login to a specific-domain page) without
    // having their full effects.
    if (Meteor.isServer) {
      __meteor_runtime_config__.accountsConfigCalled = true;
    } else if (!__meteor_runtime_config__.accountsConfigCalled) {
      // XXX would be nice to "crash" the client and replace the UI with an error
      // message, but there's no trivial way to do this.
      Meteor._debug("Accounts.config was called on the client but not on the " + "server; some configuration options may not take effect.");
    } // We need to validate the oauthSecretKey option at the time
    // Accounts.config is called. We also deliberately don't store the
    // oauthSecretKey in Accounts._options.


    if (Object.prototype.hasOwnProperty.call(options, 'oauthSecretKey')) {
      if (Meteor.isClient) {
        throw new Error("The oauthSecretKey option may only be specified on the server");
      }

      if (!Package["oauth-encryption"]) {
        throw new Error("The oauth-encryption package must be loaded to set oauthSecretKey");
      }

      Package["oauth-encryption"].OAuthEncryption.loadKey(options.oauthSecretKey);
      options = _objectSpread({}, options);
      delete options.oauthSecretKey;
    } // validate option keys


    const VALID_KEYS = ["sendVerificationEmail", "forbidClientAccountCreation", "passwordEnrollTokenExpiration", "passwordEnrollTokenExpirationInDays", "restrictCreationByEmailDomain", "loginExpirationInDays", "loginExpiration", "passwordResetTokenExpirationInDays", "passwordResetTokenExpiration", "ambiguousErrorMessages", "bcryptRounds", "defaultFieldSelector"];
    Object.keys(options).forEach(key => {
      if (!VALID_KEYS.includes(key)) {
        throw new Error("Accounts.config: Invalid key: ".concat(key));
      }
    }); // set values in Accounts._options

    VALID_KEYS.forEach(key => {
      if (key in options) {
        if (key in this._options) {
          throw new Error("Can't set `".concat(key, "` more than once"));
        }

        this._options[key] = options[key];
      }
    });
  }
  /**
   * @summary Register a callback to be called after a login attempt succeeds.
   * @locus Anywhere
   * @param {Function} func The callback to be called when login is successful.
   *                        The callback receives a single object that
   *                        holds login details. This object contains the login
   *                        result type (password, resume, etc.) on both the
   *                        client and server. `onLogin` callbacks registered
   *                        on the server also receive extra data, such
   *                        as user details, connection information, etc.
   */


  onLogin(func) {
    let ret = this._onLoginHook.register(func); // call the just registered callback if already logged in


    this._startupCallback(ret.callback);

    return ret;
  }
  /**
   * @summary Register a callback to be called after a login attempt fails.
   * @locus Anywhere
   * @param {Function} func The callback to be called after the login has failed.
   */


  onLoginFailure(func) {
    return this._onLoginFailureHook.register(func);
  }
  /**
   * @summary Register a callback to be called after a logout attempt succeeds.
   * @locus Anywhere
   * @param {Function} func The callback to be called when logout is successful.
   */


  onLogout(func) {
    return this._onLogoutHook.register(func);
  }

  _initConnection(options) {
    if (!Meteor.isClient) {
      return;
    } // The connection used by the Accounts system. This is the connection
    // that will get logged in by Meteor.login(), and this is the
    // connection whose login state will be reflected by Meteor.userId().
    //
    // It would be much preferable for this to be in accounts_client.js,
    // but it has to be here because it's needed to create the
    // Meteor.users collection.


    if (options.connection) {
      this.connection = options.connection;
    } else if (options.ddpUrl) {
      this.connection = DDP.connect(options.ddpUrl);
    } else if (typeof __meteor_runtime_config__ !== "undefined" && __meteor_runtime_config__.ACCOUNTS_CONNECTION_URL) {
      // Temporary, internal hook to allow the server to point the client
      // to a different authentication server. This is for a very
      // particular use case that comes up when implementing a oauth
      // server. Unsupported and may go away at any point in time.
      //
      // We will eventually provide a general way to use account-base
      // against any DDP connection, not just one special one.
      this.connection = DDP.connect(__meteor_runtime_config__.ACCOUNTS_CONNECTION_URL);
    } else {
      this.connection = Meteor.connection;
    }
  }

  _getTokenLifetimeMs() {
    // When loginExpirationInDays is set to null, we'll use a really high
    // number of days (LOGIN_UNEXPIRABLE_TOKEN_DAYS) to simulate an
    // unexpiring token.
    const loginExpirationInDays = this._options.loginExpirationInDays === null ? LOGIN_UNEXPIRING_TOKEN_DAYS : this._options.loginExpirationInDays;
    return this._options.loginExpiration || (loginExpirationInDays || DEFAULT_LOGIN_EXPIRATION_DAYS) * 86400000;
  }

  _getPasswordResetTokenLifetimeMs() {
    return this._options.passwordResetTokenExpiration || (this._options.passwordResetTokenExpirationInDays || DEFAULT_PASSWORD_RESET_TOKEN_EXPIRATION_DAYS) * 86400000;
  }

  _getPasswordEnrollTokenLifetimeMs() {
    return this._options.passwordEnrollTokenExpiration || (this._options.passwordEnrollTokenExpirationInDays || DEFAULT_PASSWORD_ENROLL_TOKEN_EXPIRATION_DAYS) * 86400000;
  }

  _tokenExpiration(when) {
    // We pass when through the Date constructor for backwards compatibility;
    // `when` used to be a number.
    return new Date(new Date(when).getTime() + this._getTokenLifetimeMs());
  }

  _tokenExpiresSoon(when) {
    let minLifetimeMs = .1 * this._getTokenLifetimeMs();

    const minLifetimeCapMs = MIN_TOKEN_LIFETIME_CAP_SECS * 1000;

    if (minLifetimeMs > minLifetimeCapMs) {
      minLifetimeMs = minLifetimeCapMs;
    }

    return new Date() > new Date(when) - minLifetimeMs;
  } // No-op on the server, overridden on the client.


  _startupCallback(callback) {}

}

// Note that Accounts is defined separately in accounts_client.js and
// accounts_server.js.

/**
 * @summary Get the current user id, or `null` if no user is logged in. A reactive data source.
 * @locus Anywhere but publish functions
 * @importFromPackage meteor
 */
Meteor.userId = () => Accounts.userId();
/**
 * @summary Get the current user record, or `null` if no user is logged in. A reactive data source.
 * @locus Anywhere but publish functions
 * @importFromPackage meteor
 * @param {Object} [options]
 * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
 */


Meteor.user = options => Accounts.user(options); // how long (in days) until a login token expires


const DEFAULT_LOGIN_EXPIRATION_DAYS = 90; // how long (in days) until reset password token expires

const DEFAULT_PASSWORD_RESET_TOKEN_EXPIRATION_DAYS = 3; // how long (in days) until enrol password token expires

const DEFAULT_PASSWORD_ENROLL_TOKEN_EXPIRATION_DAYS = 30; // Clients don't try to auto-login with a token that is going to expire within
// .1 * DEFAULT_LOGIN_EXPIRATION_DAYS, capped at MIN_TOKEN_LIFETIME_CAP_SECS.
// Tries to avoid abrupt disconnects from expiring tokens.

const MIN_TOKEN_LIFETIME_CAP_SECS = 3600; // one hour
// how often (in milliseconds) we check for expired tokens

const EXPIRE_TOKENS_INTERVAL_MS = 600 * 1000;
const CONNECTION_CLOSE_DELAY_MS = 10 * 1000;
// A large number of expiration days (approximately 100 years worth) that is
// used when creating unexpiring tokens.
const LOGIN_UNEXPIRING_TOKEN_DAYS = 365 * 100;
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"accounts_server.js":function module(require,exports,module){

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                  //
// packages/accounts-base/accounts_server.js                                                                        //
//                                                                                                                  //
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                    //
let _objectWithoutProperties;

module.link("@babel/runtime/helpers/objectWithoutProperties", {
  default(v) {
    _objectWithoutProperties = v;
  }

}, 0);

let _objectSpread;

module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }

}, 1);
module.export({
  AccountsServer: () => AccountsServer
});
let crypto;
module.link("crypto", {
  default(v) {
    crypto = v;
  }

}, 0);
let AccountsCommon, EXPIRE_TOKENS_INTERVAL_MS, CONNECTION_CLOSE_DELAY_MS;
module.link("./accounts_common.js", {
  AccountsCommon(v) {
    AccountsCommon = v;
  },

  EXPIRE_TOKENS_INTERVAL_MS(v) {
    EXPIRE_TOKENS_INTERVAL_MS = v;
  },

  CONNECTION_CLOSE_DELAY_MS(v) {
    CONNECTION_CLOSE_DELAY_MS = v;
  }

}, 1);
let URL;
module.link("meteor/url", {
  URL(v) {
    URL = v;
  }

}, 2);
const hasOwn = Object.prototype.hasOwnProperty;
/**
 * @summary Constructor for the `Accounts` namespace on the server.
 * @locus Server
 * @class AccountsServer
 * @extends AccountsCommon
 * @instancename accountsServer
 * @param {Object} server A server object such as `Meteor.server`.
 */

class AccountsServer extends AccountsCommon {
  // Note that this constructor is less likely to be instantiated multiple
  // times than the `AccountsClient` constructor, because a single server
  // can provide only one set of methods.
  constructor(server) {
    super();
    this._server = server || Meteor.server; // Set up the server's methods, as if by calling Meteor.methods.

    this._initServerMethods();

    this._initAccountDataHooks(); // If autopublish is on, publish these user fields. Login service
    // packages (eg accounts-google) add to these by calling
    // addAutopublishFields.  Notably, this isn't implemented with multiple
    // publishes since DDP only merges only across top-level fields, not
    // subfields (such as 'services.facebook.accessToken')


    this._autopublishFields = {
      loggedInUser: ['profile', 'username', 'emails'],
      otherUsers: ['profile', 'username']
    }; // use object to keep the reference when used in functions
    // where _defaultPublishFields is destructured into lexical scope
    // for publish callbacks that need `this`

    this._defaultPublishFields = {
      projection: {
        profile: 1,
        username: 1,
        emails: 1
      }
    };

    this._initServerPublications(); // connectionId -> {connection, loginToken}


    this._accountData = {}; // connection id -> observe handle for the login token that this connection is
    // currently associated with, or a number. The number indicates that we are in
    // the process of setting up the observe (using a number instead of a single
    // sentinel allows multiple attempts to set up the observe to identify which
    // one was theirs).

    this._userObservesForConnections = {};
    this._nextUserObserveNumber = 1; // for the number described above.
    // list of all registered handlers.

    this._loginHandlers = [];
    setupUsersCollection(this.users);
    setupDefaultLoginHandlers(this);
    setExpireTokensInterval(this);
    this._validateLoginHook = new Hook({
      bindEnvironment: false
    });
    this._validateNewUserHooks = [defaultValidateNewUserHook.bind(this)];

    this._deleteSavedTokensForAllUsersOnStartup();

    this._skipCaseInsensitiveChecksForTest = {};
    this.urls = {
      resetPassword: (token, extraParams) => this.buildEmailUrl("#/reset-password/".concat(token), extraParams),
      verifyEmail: (token, extraParams) => this.buildEmailUrl("#/verify-email/".concat(token), extraParams),
      enrollAccount: (token, extraParams) => this.buildEmailUrl("#/enroll-account/".concat(token), extraParams)
    };
    this.addDefaultRateLimit();

    this.buildEmailUrl = function (path) {
      let extraParams = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      const url = new URL(Meteor.absoluteUrl(path));
      const params = Object.entries(extraParams);

      if (params.length > 0) {
        // Add additional parameters to the url
        for (const [key, value] of params) {
          url.searchParams.append(key, value);
        }
      }

      return url.toString();
    };
  } ///
  /// CURRENT USER
  ///
  // @override of "abstract" non-implementation in accounts_common.js


  userId() {
    // This function only works if called inside a method or a pubication.
    // Using any of the infomation from Meteor.user() in a method or
    // publish function will always use the value from when the function first
    // runs. This is likely not what the user expects. The way to make this work
    // in a method or publish function is to do Meteor.find(this.userId).observe
    // and recompute when the user record changes.
    const currentInvocation = DDP._CurrentMethodInvocation.get() || DDP._CurrentPublicationInvocation.get();

    if (!currentInvocation) throw new Error("Meteor.userId can only be invoked in method calls or publications.");
    return currentInvocation.userId;
  } ///
  /// LOGIN HOOKS
  ///

  /**
   * @summary Validate login attempts.
   * @locus Server
   * @param {Function} func Called whenever a login is attempted (either successful or unsuccessful).  A login can be aborted by returning a falsy value or throwing an exception.
   */


  validateLoginAttempt(func) {
    // Exceptions inside the hook callback are passed up to us.
    return this._validateLoginHook.register(func);
  }
  /**
   * @summary Set restrictions on new user creation.
   * @locus Server
   * @param {Function} func Called whenever a new user is created. Takes the new user object, and returns true to allow the creation or false to abort.
   */


  validateNewUser(func) {
    this._validateNewUserHooks.push(func);
  }
  /**
   * @summary Validate login from external service
   * @locus Server
   * @param {Function} func Called whenever login/user creation from external service is attempted. Login or user creation based on this login can be aborted by passing a falsy value or throwing an exception.
   */


  beforeExternalLogin(func) {
    if (this._beforeExternalLoginHook) {
      throw new Error("Can only call beforeExternalLogin once");
    }

    this._beforeExternalLoginHook = func;
  } ///
  /// CREATE USER HOOKS
  ///

  /**
   * @summary Customize new user creation.
   * @locus Server
   * @param {Function} func Called whenever a new user is created. Return the new user object, or throw an `Error` to abort the creation.
   */


  onCreateUser(func) {
    if (this._onCreateUserHook) {
      throw new Error("Can only call onCreateUser once");
    }

    this._onCreateUserHook = func;
  }
  /**
   * @summary Customize oauth user profile updates
   * @locus Server
   * @param {Function} func Called whenever a user is logged in via oauth. Return the profile object to be merged, or throw an `Error` to abort the creation.
   */


  onExternalLogin(func) {
    if (this._onExternalLoginHook) {
      throw new Error("Can only call onExternalLogin once");
    }

    this._onExternalLoginHook = func;
  }

  _validateLogin(connection, attempt) {
    this._validateLoginHook.each(callback => {
      let ret;

      try {
        ret = callback(cloneAttemptWithConnection(connection, attempt));
      } catch (e) {
        attempt.allowed = false; // XXX this means the last thrown error overrides previous error
        // messages. Maybe this is surprising to users and we should make
        // overriding errors more explicit. (see
        // https://github.com/meteor/meteor/issues/1960)

        attempt.error = e;
        return true;
      }

      if (!ret) {
        attempt.allowed = false; // don't override a specific error provided by a previous
        // validator or the initial attempt (eg "incorrect password").

        if (!attempt.error) attempt.error = new Meteor.Error(403, "Login forbidden");
      }

      return true;
    });
  }

  _successfulLogin(connection, attempt) {
    this._onLoginHook.each(callback => {
      callback(cloneAttemptWithConnection(connection, attempt));
      return true;
    });
  }

  _failedLogin(connection, attempt) {
    this._onLoginFailureHook.each(callback => {
      callback(cloneAttemptWithConnection(connection, attempt));
      return true;
    });
  }

  _successfulLogout(connection, userId) {
    // don't fetch the user object unless there are some callbacks registered
    let user;

    this._onLogoutHook.each(callback => {
      if (!user && userId) user = this.users.findOne(userId, {
        fields: this._options.defaultFieldSelector
      });
      callback({
        user,
        connection
      });
      return true;
    });
  }

  ///
  /// LOGIN METHODS
  ///
  // Login methods return to the client an object containing these
  // fields when the user was logged in successfully:
  //
  //   id: userId
  //   token: *
  //   tokenExpires: *
  //
  // tokenExpires is optional and intends to provide a hint to the
  // client as to when the token will expire. If not provided, the
  // client will call Accounts._tokenExpiration, passing it the date
  // that it received the token.
  //
  // The login method will throw an error back to the client if the user
  // failed to log in.
  //
  //
  // Login handlers and service specific login methods such as
  // `createUser` internally return a `result` object containing these
  // fields:
  //
  //   type:
  //     optional string; the service name, overrides the handler
  //     default if present.
  //
  //   error:
  //     exception; if the user is not allowed to login, the reason why.
  //
  //   userId:
  //     string; the user id of the user attempting to login (if
  //     known), required for an allowed login.
  //
  //   options:
  //     optional object merged into the result returned by the login
  //     method; used by HAMK from SRP.
  //
  //   stampedLoginToken:
  //     optional object with `token` and `when` indicating the login
  //     token is already present in the database, returned by the
  //     "resume" login handler.
  //
  // For convenience, login methods can also throw an exception, which
  // is converted into an {error} result.  However, if the id of the
  // user attempting the login is known, a {userId, error} result should
  // be returned instead since the user id is not captured when an
  // exception is thrown.
  //
  // This internal `result` object is automatically converted into the
  // public {id, token, tokenExpires} object returned to the client.
  // Try a login method, converting thrown exceptions into an {error}
  // result.  The `type` argument is a default, inserted into the result
  // object if not explicitly returned.
  //
  // Log in a user on a connection.
  //
  // We use the method invocation to set the user id on the connection,
  // not the connection object directly. setUserId is tied to methods to
  // enforce clear ordering of method application (using wait methods on
  // the client, and a no setUserId after unblock restriction on the
  // server)
  //
  // The `stampedLoginToken` parameter is optional.  When present, it
  // indicates that the login token has already been inserted into the
  // database and doesn't need to be inserted again.  (It's used by the
  // "resume" login handler).
  _loginUser(methodInvocation, userId, stampedLoginToken) {
    if (!stampedLoginToken) {
      stampedLoginToken = this._generateStampedLoginToken();

      this._insertLoginToken(userId, stampedLoginToken);
    } // This order (and the avoidance of yields) is important to make
    // sure that when publish functions are rerun, they see a
    // consistent view of the world: the userId is set and matches
    // the login token on the connection (not that there is
    // currently a public API for reading the login token on a
    // connection).


    Meteor._noYieldsAllowed(() => this._setLoginToken(userId, methodInvocation.connection, this._hashLoginToken(stampedLoginToken.token)));

    methodInvocation.setUserId(userId);
    return {
      id: userId,
      token: stampedLoginToken.token,
      tokenExpires: this._tokenExpiration(stampedLoginToken.when)
    };
  }

  // After a login method has completed, call the login hooks.  Note
  // that `attemptLogin` is called for *all* login attempts, even ones
  // which aren't successful (such as an invalid password, etc).
  //
  // If the login is allowed and isn't aborted by a validate login hook
  // callback, log in the user.
  //
  _attemptLogin(methodInvocation, methodName, methodArgs, result) {
    if (!result) throw new Error("result is required"); // XXX A programming error in a login handler can lead to this occuring, and
    // then we don't call onLogin or onLoginFailure callbacks. Should
    // tryLoginMethod catch this case and turn it into an error?

    if (!result.userId && !result.error) throw new Error("A login method must specify a userId or an error");
    let user;
    if (result.userId) user = this.users.findOne(result.userId, {
      fields: this._options.defaultFieldSelector
    });
    const attempt = {
      type: result.type || "unknown",
      allowed: !!(result.userId && !result.error),
      methodName: methodName,
      methodArguments: Array.from(methodArgs)
    };

    if (result.error) {
      attempt.error = result.error;
    }

    if (user) {
      attempt.user = user;
    } // _validateLogin may mutate `attempt` by adding an error and changing allowed
    // to false, but that's the only change it can make (and the user's callbacks
    // only get a clone of `attempt`).


    this._validateLogin(methodInvocation.connection, attempt);

    if (attempt.allowed) {
      const ret = _objectSpread(_objectSpread({}, this._loginUser(methodInvocation, result.userId, result.stampedLoginToken)), result.options);

      ret.type = attempt.type;

      this._successfulLogin(methodInvocation.connection, attempt);

      return ret;
    } else {
      this._failedLogin(methodInvocation.connection, attempt);

      throw attempt.error;
    }
  }

  // All service specific login methods should go through this function.
  // Ensure that thrown exceptions are caught and that login hook
  // callbacks are still called.
  //
  _loginMethod(methodInvocation, methodName, methodArgs, type, fn) {
    return this._attemptLogin(methodInvocation, methodName, methodArgs, tryLoginMethod(type, fn));
  }

  // Report a login attempt failed outside the context of a normal login
  // method. This is for use in the case where there is a multi-step login
  // procedure (eg SRP based password login). If a method early in the
  // chain fails, it should call this function to report a failure. There
  // is no corresponding method for a successful login; methods that can
  // succeed at logging a user in should always be actual login methods
  // (using either Accounts._loginMethod or Accounts.registerLoginHandler).
  _reportLoginFailure(methodInvocation, methodName, methodArgs, result) {
    const attempt = {
      type: result.type || "unknown",
      allowed: false,
      error: result.error,
      methodName: methodName,
      methodArguments: Array.from(methodArgs)
    };

    if (result.userId) {
      attempt.user = this.users.findOne(result.userId, {
        fields: this._options.defaultFieldSelector
      });
    }

    this._validateLogin(methodInvocation.connection, attempt);

    this._failedLogin(methodInvocation.connection, attempt); // _validateLogin may mutate attempt to set a new error message. Return
    // the modified version.


    return attempt;
  }

  ///
  /// LOGIN HANDLERS
  ///
  // The main entry point for auth packages to hook in to login.
  //
  // A login handler is a login method which can return `undefined` to
  // indicate that the login request is not handled by this handler.
  //
  // @param name {String} Optional.  The service name, used by default
  // if a specific service name isn't returned in the result.
  //
  // @param handler {Function} A function that receives an options object
  // (as passed as an argument to the `login` method) and returns one of:
  // - `undefined`, meaning don't handle;
  // - a login method result object
  registerLoginHandler(name, handler) {
    if (!handler) {
      handler = name;
      name = null;
    }

    this._loginHandlers.push({
      name: name,
      handler: handler
    });
  }

  // Checks a user's credentials against all the registered login
  // handlers, and returns a login token if the credentials are valid. It
  // is like the login method, except that it doesn't set the logged-in
  // user on the connection. Throws a Meteor.Error if logging in fails,
  // including the case where none of the login handlers handled the login
  // request. Otherwise, returns {id: userId, token: *, tokenExpires: *}.
  //
  // For example, if you want to login with a plaintext password, `options` could be
  //   { user: { username: <username> }, password: <password> }, or
  //   { user: { email: <email> }, password: <password> }.
  // Try all of the registered login handlers until one of them doesn't
  // return `undefined`, meaning it handled this call to `login`. Return
  // that return value.
  _runLoginHandlers(methodInvocation, options) {
    for (let handler of this._loginHandlers) {
      const result = tryLoginMethod(handler.name, () => handler.handler.call(methodInvocation, options));

      if (result) {
        return result;
      }

      if (result !== undefined) {
        throw new Meteor.Error(400, "A login handler should return a result or undefined");
      }
    }

    return {
      type: null,
      error: new Meteor.Error(400, "Unrecognized options for login request")
    };
  }

  // Deletes the given loginToken from the database.
  //
  // For new-style hashed token, this will cause all connections
  // associated with the token to be closed.
  //
  // Any connections associated with old-style unhashed tokens will be
  // in the process of becoming associated with hashed tokens and then
  // they'll get closed.
  destroyToken(userId, loginToken) {
    this.users.update(userId, {
      $pull: {
        "services.resume.loginTokens": {
          $or: [{
            hashedToken: loginToken
          }, {
            token: loginToken
          }]
        }
      }
    });
  }

  _initServerMethods() {
    // The methods created in this function need to be created here so that
    // this variable is available in their scope.
    const accounts = this; // This object will be populated with methods and then passed to
    // accounts._server.methods further below.

    const methods = {}; // @returns {Object|null}
    //   If successful, returns {token: reconnectToken, id: userId}
    //   If unsuccessful (for example, if the user closed the oauth login popup),
    //     throws an error describing the reason

    methods.login = function (options) {
      // Login handlers should really also check whatever field they look at in
      // options, but we don't enforce it.
      check(options, Object);

      const result = accounts._runLoginHandlers(this, options);

      return accounts._attemptLogin(this, "login", arguments, result);
    };

    methods.logout = function () {
      const token = accounts._getLoginToken(this.connection.id);

      accounts._setLoginToken(this.userId, this.connection, null);

      if (token && this.userId) {
        accounts.destroyToken(this.userId, token);
      }

      accounts._successfulLogout(this.connection, this.userId);

      this.setUserId(null);
    }; // Delete all the current user's tokens and close all open connections logged
    // in as this user. Returns a fresh new login token that this client can
    // use. Tests set Accounts._noConnectionCloseDelayForTest to delete tokens
    // immediately instead of using a delay.
    //
    // XXX COMPAT WITH 0.7.2
    // This single `logoutOtherClients` method has been replaced with two
    // methods, one that you call to get a new token, and another that you
    // call to remove all tokens except your own. The new design allows
    // clients to know when other clients have actually been logged
    // out. (The `logoutOtherClients` method guarantees the caller that
    // the other clients will be logged out at some point, but makes no
    // guarantees about when.) This method is left in for backwards
    // compatibility, especially since application code might be calling
    // this method directly.
    //
    // @returns {Object} Object with token and tokenExpires keys.


    methods.logoutOtherClients = function () {
      const user = accounts.users.findOne(this.userId, {
        fields: {
          "services.resume.loginTokens": true
        }
      });

      if (user) {
        // Save the current tokens in the database to be deleted in
        // CONNECTION_CLOSE_DELAY_MS ms. This gives other connections in the
        // caller's browser time to find the fresh token in localStorage. We save
        // the tokens in the database in case we crash before actually deleting
        // them.
        const tokens = user.services.resume.loginTokens;

        const newToken = accounts._generateStampedLoginToken();

        accounts.users.update(this.userId, {
          $set: {
            "services.resume.loginTokensToDelete": tokens,
            "services.resume.haveLoginTokensToDelete": true
          },
          $push: {
            "services.resume.loginTokens": accounts._hashStampedToken(newToken)
          }
        });
        Meteor.setTimeout(() => {
          // The observe on Meteor.users will take care of closing the connections
          // associated with `tokens`.
          accounts._deleteSavedTokensForUser(this.userId, tokens);
        }, accounts._noConnectionCloseDelayForTest ? 0 : CONNECTION_CLOSE_DELAY_MS); // We do not set the login token on this connection, but instead the
        // observe closes the connection and the client will reconnect with the
        // new token.

        return {
          token: newToken.token,
          tokenExpires: accounts._tokenExpiration(newToken.when)
        };
      } else {
        throw new Meteor.Error("You are not logged in.");
      }
    }; // Generates a new login token with the same expiration as the
    // connection's current token and saves it to the database. Associates
    // the connection with this new token and returns it. Throws an error
    // if called on a connection that isn't logged in.
    //
    // @returns Object
    //   If successful, returns { token: <new token>, id: <user id>,
    //   tokenExpires: <expiration date> }.


    methods.getNewToken = function () {
      const user = accounts.users.findOne(this.userId, {
        fields: {
          "services.resume.loginTokens": 1
        }
      });

      if (!this.userId || !user) {
        throw new Meteor.Error("You are not logged in.");
      } // Be careful not to generate a new token that has a later
      // expiration than the curren token. Otherwise, a bad guy with a
      // stolen token could use this method to stop his stolen token from
      // ever expiring.


      const currentHashedToken = accounts._getLoginToken(this.connection.id);

      const currentStampedToken = user.services.resume.loginTokens.find(stampedToken => stampedToken.hashedToken === currentHashedToken);

      if (!currentStampedToken) {
        // safety belt: this should never happen
        throw new Meteor.Error("Invalid login token");
      }

      const newStampedToken = accounts._generateStampedLoginToken();

      newStampedToken.when = currentStampedToken.when;

      accounts._insertLoginToken(this.userId, newStampedToken);

      return accounts._loginUser(this, this.userId, newStampedToken);
    }; // Removes all tokens except the token associated with the current
    // connection. Throws an error if the connection is not logged
    // in. Returns nothing on success.


    methods.removeOtherTokens = function () {
      if (!this.userId) {
        throw new Meteor.Error("You are not logged in.");
      }

      const currentToken = accounts._getLoginToken(this.connection.id);

      accounts.users.update(this.userId, {
        $pull: {
          "services.resume.loginTokens": {
            hashedToken: {
              $ne: currentToken
            }
          }
        }
      });
    }; // Allow a one-time configuration for a login service. Modifications
    // to this collection are also allowed in insecure mode.


    methods.configureLoginService = options => {
      check(options, Match.ObjectIncluding({
        service: String
      })); // Don't let random users configure a service we haven't added yet (so
      // that when we do later add it, it's set up with their configuration
      // instead of ours).
      // XXX if service configuration is oauth-specific then this code should
      //     be in accounts-oauth; if it's not then the registry should be
      //     in this package

      if (!(accounts.oauth && accounts.oauth.serviceNames().includes(options.service))) {
        throw new Meteor.Error(403, "Service unknown");
      }

      const {
        ServiceConfiguration
      } = Package['service-configuration'];
      if (ServiceConfiguration.configurations.findOne({
        service: options.service
      })) throw new Meteor.Error(403, "Service ".concat(options.service, " already configured"));
      if (hasOwn.call(options, 'secret') && usingOAuthEncryption()) options.secret = OAuthEncryption.seal(options.secret);
      ServiceConfiguration.configurations.insert(options);
    };

    accounts._server.methods(methods);
  }

  _initAccountDataHooks() {
    this._server.onConnection(connection => {
      this._accountData[connection.id] = {
        connection: connection
      };
      connection.onClose(() => {
        this._removeTokenFromConnection(connection.id);

        delete this._accountData[connection.id];
      });
    });
  }

  _initServerPublications() {
    // Bring into lexical scope for publish callbacks that need `this`
    const {
      users,
      _autopublishFields,
      _defaultPublishFields
    } = this; // Publish all login service configuration fields other than secret.

    this._server.publish("meteor.loginServiceConfiguration", () => {
      const {
        ServiceConfiguration
      } = Package['service-configuration'];
      return ServiceConfiguration.configurations.find({}, {
        fields: {
          secret: 0
        }
      });
    }, {
      is_auto: true
    }); // not techincally autopublish, but stops the warning.
    // Use Meteor.startup to give other packages a chance to call
    // setDefaultPublishFields.


    Meteor.startup(() => {
      // Publish the current user's record to the client.
      this._server.publish(null, function () {
        if (this.userId) {
          return users.find({
            _id: this.userId
          }, {
            fields: _defaultPublishFields.projection
          });
        } else {
          return null;
        }
      },
      /*suppress autopublish warning*/
      {
        is_auto: true
      });
    }); // Use Meteor.startup to give other packages a chance to call
    // addAutopublishFields.

    Package.autopublish && Meteor.startup(() => {
      // ['profile', 'username'] -> {profile: 1, username: 1}
      const toFieldSelector = fields => fields.reduce((prev, field) => _objectSpread(_objectSpread({}, prev), {}, {
        [field]: 1
      }), {});

      this._server.publish(null, function () {
        if (this.userId) {
          return users.find({
            _id: this.userId
          }, {
            fields: toFieldSelector(_autopublishFields.loggedInUser)
          });
        } else {
          return null;
        }
      },
      /*suppress autopublish warning*/
      {
        is_auto: true
      }); // XXX this publish is neither dedup-able nor is it optimized by our special
      // treatment of queries on a specific _id. Therefore this will have O(n^2)
      // run-time performance every time a user document is changed (eg someone
      // logging in). If this is a problem, we can instead write a manual publish
      // function which filters out fields based on 'this.userId'.


      this._server.publish(null, function () {
        const selector = this.userId ? {
          _id: {
            $ne: this.userId
          }
        } : {};
        return users.find(selector, {
          fields: toFieldSelector(_autopublishFields.otherUsers)
        });
      },
      /*suppress autopublish warning*/
      {
        is_auto: true
      });
    });
  }

  // Add to the list of fields or subfields to be automatically
  // published if autopublish is on. Must be called from top-level
  // code (ie, before Meteor.startup hooks run).
  //
  // @param opts {Object} with:
  //   - forLoggedInUser {Array} Array of fields published to the logged-in user
  //   - forOtherUsers {Array} Array of fields published to users that aren't logged in
  addAutopublishFields(opts) {
    this._autopublishFields.loggedInUser.push.apply(this._autopublishFields.loggedInUser, opts.forLoggedInUser);

    this._autopublishFields.otherUsers.push.apply(this._autopublishFields.otherUsers, opts.forOtherUsers);
  }

  // Replaces the fields to be automatically
  // published when the user logs in
  //
  // @param {MongoFieldSpecifier} fields Dictionary of fields to return or exclude.
  setDefaultPublishFields(fields) {
    this._defaultPublishFields.projection = fields;
  }

  ///
  /// ACCOUNT DATA
  ///
  // HACK: This is used by 'meteor-accounts' to get the loginToken for a
  // connection. Maybe there should be a public way to do that.
  _getAccountData(connectionId, field) {
    const data = this._accountData[connectionId];
    return data && data[field];
  }

  _setAccountData(connectionId, field, value) {
    const data = this._accountData[connectionId]; // safety belt. shouldn't happen. accountData is set in onConnection,
    // we don't have a connectionId until it is set.

    if (!data) return;
    if (value === undefined) delete data[field];else data[field] = value;
  }

  ///
  /// RECONNECT TOKENS
  ///
  /// support reconnecting using a meteor login token
  _hashLoginToken(loginToken) {
    const hash = crypto.createHash('sha256');
    hash.update(loginToken);
    return hash.digest('base64');
  }

  // {token, when} => {hashedToken, when}
  _hashStampedToken(stampedToken) {
    const {
      token
    } = stampedToken,
          hashedStampedToken = _objectWithoutProperties(stampedToken, ["token"]);

    return _objectSpread(_objectSpread({}, hashedStampedToken), {}, {
      hashedToken: this._hashLoginToken(token)
    });
  }

  // Using $addToSet avoids getting an index error if another client
  // logging in simultaneously has already inserted the new hashed
  // token.
  _insertHashedLoginToken(userId, hashedToken, query) {
    query = query ? _objectSpread({}, query) : {};
    query._id = userId;
    this.users.update(query, {
      $addToSet: {
        "services.resume.loginTokens": hashedToken
      }
    });
  }

  // Exported for tests.
  _insertLoginToken(userId, stampedToken, query) {
    this._insertHashedLoginToken(userId, this._hashStampedToken(stampedToken), query);
  }

  _clearAllLoginTokens(userId) {
    this.users.update(userId, {
      $set: {
        'services.resume.loginTokens': []
      }
    });
  }

  // test hook
  _getUserObserve(connectionId) {
    return this._userObservesForConnections[connectionId];
  }

  // Clean up this connection's association with the token: that is, stop
  // the observe that we started when we associated the connection with
  // this token.
  _removeTokenFromConnection(connectionId) {
    if (hasOwn.call(this._userObservesForConnections, connectionId)) {
      const observe = this._userObservesForConnections[connectionId];

      if (typeof observe === 'number') {
        // We're in the process of setting up an observe for this connection. We
        // can't clean up that observe yet, but if we delete the placeholder for
        // this connection, then the observe will get cleaned up as soon as it has
        // been set up.
        delete this._userObservesForConnections[connectionId];
      } else {
        delete this._userObservesForConnections[connectionId];
        observe.stop();
      }
    }
  }

  _getLoginToken(connectionId) {
    return this._getAccountData(connectionId, 'loginToken');
  }

  // newToken is a hashed token.
  _setLoginToken(userId, connection, newToken) {
    this._removeTokenFromConnection(connection.id);

    this._setAccountData(connection.id, 'loginToken', newToken);

    if (newToken) {
      // Set up an observe for this token. If the token goes away, we need
      // to close the connection.  We defer the observe because there's
      // no need for it to be on the critical path for login; we just need
      // to ensure that the connection will get closed at some point if
      // the token gets deleted.
      //
      // Initially, we set the observe for this connection to a number; this
      // signifies to other code (which might run while we yield) that we are in
      // the process of setting up an observe for this connection. Once the
      // observe is ready to go, we replace the number with the real observe
      // handle (unless the placeholder has been deleted or replaced by a
      // different placehold number, signifying that the connection was closed
      // already -- in this case we just clean up the observe that we started).
      const myObserveNumber = ++this._nextUserObserveNumber;
      this._userObservesForConnections[connection.id] = myObserveNumber;
      Meteor.defer(() => {
        // If something else happened on this connection in the meantime (it got
        // closed, or another call to _setLoginToken happened), just do
        // nothing. We don't need to start an observe for an old connection or old
        // token.
        if (this._userObservesForConnections[connection.id] !== myObserveNumber) {
          return;
        }

        let foundMatchingUser; // Because we upgrade unhashed login tokens to hashed tokens at
        // login time, sessions will only be logged in with a hashed
        // token. Thus we only need to observe hashed tokens here.

        const observe = this.users.find({
          _id: userId,
          'services.resume.loginTokens.hashedToken': newToken
        }, {
          fields: {
            _id: 1
          }
        }).observeChanges({
          added: () => {
            foundMatchingUser = true;
          },
          removed: connection.close // The onClose callback for the connection takes care of
          // cleaning up the observe handle and any other state we have
          // lying around.

        }, {
          nonMutatingCallbacks: true
        }); // If the user ran another login or logout command we were waiting for the
        // defer or added to fire (ie, another call to _setLoginToken occurred),
        // then we let the later one win (start an observe, etc) and just stop our
        // observe now.
        //
        // Similarly, if the connection was already closed, then the onClose
        // callback would have called _removeTokenFromConnection and there won't
        // be an entry in _userObservesForConnections. We can stop the observe.

        if (this._userObservesForConnections[connection.id] !== myObserveNumber) {
          observe.stop();
          return;
        }

        this._userObservesForConnections[connection.id] = observe;

        if (!foundMatchingUser) {
          // We've set up an observe on the user associated with `newToken`,
          // so if the new token is removed from the database, we'll close
          // the connection. But the token might have already been deleted
          // before we set up the observe, which wouldn't have closed the
          // connection because the observe wasn't running yet.
          connection.close();
        }
      });
    }
  }

  // (Also used by Meteor Accounts server and tests).
  //
  _generateStampedLoginToken() {
    return {
      token: Random.secret(),
      when: new Date()
    };
  }

  ///
  /// TOKEN EXPIRATION
  ///
  // Deletes expired password reset tokens from the database.
  //
  // Exported for tests. Also, the arguments are only used by
  // tests. oldestValidDate is simulate expiring tokens without waiting
  // for them to actually expire. userId is used by tests to only expire
  // tokens for the test user.
  _expirePasswordResetTokens(oldestValidDate, userId) {
    const tokenLifetimeMs = this._getPasswordResetTokenLifetimeMs(); // when calling from a test with extra arguments, you must specify both!


    if (oldestValidDate && !userId || !oldestValidDate && userId) {
      throw new Error("Bad test. Must specify both oldestValidDate and userId.");
    }

    oldestValidDate = oldestValidDate || new Date(new Date() - tokenLifetimeMs);
    const tokenFilter = {
      $or: [{
        "services.password.reset.reason": "reset"
      }, {
        "services.password.reset.reason": {
          $exists: false
        }
      }]
    };
    expirePasswordToken(this, oldestValidDate, tokenFilter, userId);
  } // Deletes expired password enroll tokens from the database.
  //
  // Exported for tests. Also, the arguments are only used by
  // tests. oldestValidDate is simulate expiring tokens without waiting
  // for them to actually expire. userId is used by tests to only expire
  // tokens for the test user.


  _expirePasswordEnrollTokens(oldestValidDate, userId) {
    const tokenLifetimeMs = this._getPasswordEnrollTokenLifetimeMs(); // when calling from a test with extra arguments, you must specify both!


    if (oldestValidDate && !userId || !oldestValidDate && userId) {
      throw new Error("Bad test. Must specify both oldestValidDate and userId.");
    }

    oldestValidDate = oldestValidDate || new Date(new Date() - tokenLifetimeMs);
    const tokenFilter = {
      "services.password.reset.reason": "enroll"
    };
    expirePasswordToken(this, oldestValidDate, tokenFilter, userId);
  } // Deletes expired tokens from the database and closes all open connections
  // associated with these tokens.
  //
  // Exported for tests. Also, the arguments are only used by
  // tests. oldestValidDate is simulate expiring tokens without waiting
  // for them to actually expire. userId is used by tests to only expire
  // tokens for the test user.


  _expireTokens(oldestValidDate, userId) {
    const tokenLifetimeMs = this._getTokenLifetimeMs(); // when calling from a test with extra arguments, you must specify both!


    if (oldestValidDate && !userId || !oldestValidDate && userId) {
      throw new Error("Bad test. Must specify both oldestValidDate and userId.");
    }

    oldestValidDate = oldestValidDate || new Date(new Date() - tokenLifetimeMs);
    const userFilter = userId ? {
      _id: userId
    } : {}; // Backwards compatible with older versions of meteor that stored login token
    // timestamps as numbers.

    this.users.update(_objectSpread(_objectSpread({}, userFilter), {}, {
      $or: [{
        "services.resume.loginTokens.when": {
          $lt: oldestValidDate
        }
      }, {
        "services.resume.loginTokens.when": {
          $lt: +oldestValidDate
        }
      }]
    }), {
      $pull: {
        "services.resume.loginTokens": {
          $or: [{
            when: {
              $lt: oldestValidDate
            }
          }, {
            when: {
              $lt: +oldestValidDate
            }
          }]
        }
      }
    }, {
      multi: true
    }); // The observe on Meteor.users will take care of closing connections for
    // expired tokens.
  }

  // @override from accounts_common.js
  config(options) {
    // Call the overridden implementation of the method.
    const superResult = AccountsCommon.prototype.config.apply(this, arguments); // If the user set loginExpirationInDays to null, then we need to clear the
    // timer that periodically expires tokens.

    if (hasOwn.call(this._options, 'loginExpirationInDays') && this._options.loginExpirationInDays === null && this.expireTokenInterval) {
      Meteor.clearInterval(this.expireTokenInterval);
      this.expireTokenInterval = null;
    }

    return superResult;
  }

  // Called by accounts-password
  insertUserDoc(options, user) {
    // - clone user document, to protect from modification
    // - add createdAt timestamp
    // - prepare an _id, so that you can modify other collections (eg
    // create a first task for every new user)
    //
    // XXX If the onCreateUser or validateNewUser hooks fail, we might
    // end up having modified some other collection
    // inappropriately. The solution is probably to have onCreateUser
    // accept two callbacks - one that gets called before inserting
    // the user document (in which you can modify its contents), and
    // one that gets called after (in which you should change other
    // collections)
    user = _objectSpread({
      createdAt: new Date(),
      _id: Random.id()
    }, user);

    if (user.services) {
      Object.keys(user.services).forEach(service => pinEncryptedFieldsToUser(user.services[service], user._id));
    }

    let fullUser;

    if (this._onCreateUserHook) {
      fullUser = this._onCreateUserHook(options, user); // This is *not* part of the API. We need this because we can't isolate
      // the global server environment between tests, meaning we can't test
      // both having a create user hook set and not having one set.

      if (fullUser === 'TEST DEFAULT HOOK') fullUser = defaultCreateUserHook(options, user);
    } else {
      fullUser = defaultCreateUserHook(options, user);
    }

    this._validateNewUserHooks.forEach(hook => {
      if (!hook(fullUser)) throw new Meteor.Error(403, "User validation failed");
    });

    let userId;

    try {
      userId = this.users.insert(fullUser);
    } catch (e) {
      // XXX string parsing sucks, maybe
      // https://jira.mongodb.org/browse/SERVER-3069 will get fixed one day
      if (!e.errmsg) throw e;
      if (e.errmsg.includes('emails.address')) throw new Meteor.Error(403, "Email already exists.");
      if (e.errmsg.includes('username')) throw new Meteor.Error(403, "Username already exists.");
      throw e;
    }

    return userId;
  }

  // Helper function: returns false if email does not match company domain from
  // the configuration.
  _testEmailDomain(email) {
    const domain = this._options.restrictCreationByEmailDomain;
    return !domain || typeof domain === 'function' && domain(email) || typeof domain === 'string' && new RegExp("@".concat(Meteor._escapeRegExp(domain), "$"), 'i').test(email);
  }

  ///
  /// CLEAN UP FOR `logoutOtherClients`
  ///
  _deleteSavedTokensForUser(userId, tokensToDelete) {
    if (tokensToDelete) {
      this.users.update(userId, {
        $unset: {
          "services.resume.haveLoginTokensToDelete": 1,
          "services.resume.loginTokensToDelete": 1
        },
        $pullAll: {
          "services.resume.loginTokens": tokensToDelete
        }
      });
    }
  }

  _deleteSavedTokensForAllUsersOnStartup() {
    // If we find users who have saved tokens to delete on startup, delete
    // them now. It's possible that the server could have crashed and come
    // back up before new tokens are found in localStorage, but this
    // shouldn't happen very often. We shouldn't put a delay here because
    // that would give a lot of power to an attacker with a stolen login
    // token and the ability to crash the server.
    Meteor.startup(() => {
      this.users.find({
        "services.resume.haveLoginTokensToDelete": true
      }, {
        fields: {
          "services.resume.loginTokensToDelete": 1
        }
      }).forEach(user => {
        this._deleteSavedTokensForUser(user._id, user.services.resume.loginTokensToDelete);
      });
    });
  }

  ///
  /// MANAGING USER OBJECTS
  ///
  // Updates or creates a user after we authenticate with a 3rd party.
  //
  // @param serviceName {String} Service name (eg, twitter).
  // @param serviceData {Object} Data to store in the user's record
  //        under services[serviceName]. Must include an "id" field
  //        which is a unique identifier for the user in the service.
  // @param options {Object, optional} Other options to pass to insertUserDoc
  //        (eg, profile)
  // @returns {Object} Object with token and id keys, like the result
  //        of the "login" method.
  //
  updateOrCreateUserFromExternalService(serviceName, serviceData, options) {
    options = _objectSpread({}, options);

    if (serviceName === "password" || serviceName === "resume") {
      throw new Error("Can't use updateOrCreateUserFromExternalService with internal service " + serviceName);
    }

    if (!hasOwn.call(serviceData, 'id')) {
      throw new Error("Service data for service ".concat(serviceName, " must include id"));
    } // Look for a user with the appropriate service user id.


    const selector = {};
    const serviceIdKey = "services.".concat(serviceName, ".id"); // XXX Temporary special case for Twitter. (Issue #629)
    //   The serviceData.id will be a string representation of an integer.
    //   We want it to match either a stored string or int representation.
    //   This is to cater to earlier versions of Meteor storing twitter
    //   user IDs in number form, and recent versions storing them as strings.
    //   This can be removed once migration technology is in place, and twitter
    //   users stored with integer IDs have been migrated to string IDs.

    if (serviceName === "twitter" && !isNaN(serviceData.id)) {
      selector["$or"] = [{}, {}];
      selector["$or"][0][serviceIdKey] = serviceData.id;
      selector["$or"][1][serviceIdKey] = parseInt(serviceData.id, 10);
    } else {
      selector[serviceIdKey] = serviceData.id;
    }

    let user = this.users.findOne(selector, {
      fields: this._options.defaultFieldSelector
    }); // Before continuing, run user hook to see if we should continue

    if (this._beforeExternalLoginHook && !this._beforeExternalLoginHook(serviceName, serviceData, user)) {
      throw new Meteor.Error(403, "Login forbidden");
    } // When creating a new user we pass through all options. When updating an
    // existing user, by default we only process/pass through the serviceData
    // (eg, so that we keep an unexpired access token and don't cache old email
    // addresses in serviceData.email). The onExternalLogin hook can be used when
    // creating or updating a user, to modify or pass through more options as
    // needed.


    let opts = user ? {} : options;

    if (this._onExternalLoginHook) {
      opts = this._onExternalLoginHook(options, user);
    }

    if (user) {
      pinEncryptedFieldsToUser(serviceData, user._id);
      let setAttrs = {};
      Object.keys(serviceData).forEach(key => setAttrs["services.".concat(serviceName, ".").concat(key)] = serviceData[key]); // XXX Maybe we should re-use the selector above and notice if the update
      //     touches nothing?

      setAttrs = _objectSpread(_objectSpread({}, setAttrs), opts);
      this.users.update(user._id, {
        $set: setAttrs
      });
      return {
        type: serviceName,
        userId: user._id
      };
    } else {
      // Create a new user with the service data.
      user = {
        services: {}
      };
      user.services[serviceName] = serviceData;
      return {
        type: serviceName,
        userId: this.insertUserDoc(opts, user)
      };
    }
  }

  // Removes default rate limiting rule
  removeDefaultRateLimit() {
    const resp = DDPRateLimiter.removeRule(this.defaultRateLimiterRuleId);
    this.defaultRateLimiterRuleId = null;
    return resp;
  }

  // Add a default rule of limiting logins, creating new users and password reset
  // to 5 times every 10 seconds per connection.
  addDefaultRateLimit() {
    if (!this.defaultRateLimiterRuleId) {
      this.defaultRateLimiterRuleId = DDPRateLimiter.addRule({
        userId: null,
        clientAddress: null,
        type: 'method',
        name: name => ['login', 'createUser', 'resetPassword', 'forgotPassword'].includes(name),
        connectionId: connectionId => true
      }, 5, 10000);
    }
  }

}

// Give each login hook callback a fresh cloned copy of the attempt
// object, but don't clone the connection.
//
const cloneAttemptWithConnection = (connection, attempt) => {
  const clonedAttempt = EJSON.clone(attempt);
  clonedAttempt.connection = connection;
  return clonedAttempt;
};

const tryLoginMethod = (type, fn) => {
  let result;

  try {
    result = fn();
  } catch (e) {
    result = {
      error: e
    };
  }

  if (result && !result.type && type) result.type = type;
  return result;
};

const setupDefaultLoginHandlers = accounts => {
  accounts.registerLoginHandler("resume", function (options) {
    return defaultResumeLoginHandler.call(this, accounts, options);
  });
}; // Login handler for resume tokens.


const defaultResumeLoginHandler = (accounts, options) => {
  if (!options.resume) return undefined;
  check(options.resume, String);

  const hashedToken = accounts._hashLoginToken(options.resume); // First look for just the new-style hashed login token, to avoid
  // sending the unhashed token to the database in a query if we don't
  // need to.


  let user = accounts.users.findOne({
    "services.resume.loginTokens.hashedToken": hashedToken
  }, {
    fields: {
      "services.resume.loginTokens.$": 1
    }
  });

  if (!user) {
    // If we didn't find the hashed login token, try also looking for
    // the old-style unhashed token.  But we need to look for either
    // the old-style token OR the new-style token, because another
    // client connection logging in simultaneously might have already
    // converted the token.
    user = accounts.users.findOne({
      $or: [{
        "services.resume.loginTokens.hashedToken": hashedToken
      }, {
        "services.resume.loginTokens.token": options.resume
      }]
    }, // Note: Cannot use ...loginTokens.$ positional operator with $or query.
    {
      fields: {
        "services.resume.loginTokens": 1
      }
    });
  }

  if (!user) return {
    error: new Meteor.Error(403, "You've been logged out by the server. Please log in again.")
  }; // Find the token, which will either be an object with fields
  // {hashedToken, when} for a hashed token or {token, when} for an
  // unhashed token.

  let oldUnhashedStyleToken;
  let token = user.services.resume.loginTokens.find(token => token.hashedToken === hashedToken);

  if (token) {
    oldUnhashedStyleToken = false;
  } else {
    token = user.services.resume.loginTokens.find(token => token.token === options.resume);
    oldUnhashedStyleToken = true;
  }

  const tokenExpires = accounts._tokenExpiration(token.when);

  if (new Date() >= tokenExpires) return {
    userId: user._id,
    error: new Meteor.Error(403, "Your session has expired. Please log in again.")
  }; // Update to a hashed token when an unhashed token is encountered.

  if (oldUnhashedStyleToken) {
    // Only add the new hashed token if the old unhashed token still
    // exists (this avoids resurrecting the token if it was deleted
    // after we read it).  Using $addToSet avoids getting an index
    // error if another client logging in simultaneously has already
    // inserted the new hashed token.
    accounts.users.update({
      _id: user._id,
      "services.resume.loginTokens.token": options.resume
    }, {
      $addToSet: {
        "services.resume.loginTokens": {
          "hashedToken": hashedToken,
          "when": token.when
        }
      }
    }); // Remove the old token *after* adding the new, since otherwise
    // another client trying to login between our removing the old and
    // adding the new wouldn't find a token to login with.

    accounts.users.update(user._id, {
      $pull: {
        "services.resume.loginTokens": {
          "token": options.resume
        }
      }
    });
  }

  return {
    userId: user._id,
    stampedLoginToken: {
      token: options.resume,
      when: token.when
    }
  };
};

const expirePasswordToken = (accounts, oldestValidDate, tokenFilter, userId) => {
  const userFilter = userId ? {
    _id: userId
  } : {};
  const resetRangeOr = {
    $or: [{
      "services.password.reset.when": {
        $lt: oldestValidDate
      }
    }, {
      "services.password.reset.when": {
        $lt: +oldestValidDate
      }
    }]
  };
  const expireFilter = {
    $and: [tokenFilter, resetRangeOr]
  };
  accounts.users.update(_objectSpread(_objectSpread({}, userFilter), expireFilter), {
    $unset: {
      "services.password.reset": ""
    }
  }, {
    multi: true
  });
};

const setExpireTokensInterval = accounts => {
  accounts.expireTokenInterval = Meteor.setInterval(() => {
    accounts._expireTokens();

    accounts._expirePasswordResetTokens();

    accounts._expirePasswordEnrollTokens();
  }, EXPIRE_TOKENS_INTERVAL_MS);
}; ///
/// OAuth Encryption Support
///


const OAuthEncryption = Package["oauth-encryption"] && Package["oauth-encryption"].OAuthEncryption;

const usingOAuthEncryption = () => {
  return OAuthEncryption && OAuthEncryption.keyIsLoaded();
}; // OAuth service data is temporarily stored in the pending credentials
// collection during the oauth authentication process.  Sensitive data
// such as access tokens are encrypted without the user id because
// we don't know the user id yet.  We re-encrypt these fields with the
// user id included when storing the service data permanently in
// the users collection.
//


const pinEncryptedFieldsToUser = (serviceData, userId) => {
  Object.keys(serviceData).forEach(key => {
    let value = serviceData[key];
    if (OAuthEncryption && OAuthEncryption.isSealed(value)) value = OAuthEncryption.seal(OAuthEncryption.open(value), userId);
    serviceData[key] = value;
  });
}; // Encrypt unencrypted login service secrets when oauth-encryption is
// added.
//
// XXX For the oauthSecretKey to be available here at startup, the
// developer must call Accounts.config({oauthSecretKey: ...}) at load
// time, instead of in a Meteor.startup block, because the startup
// block in the app code will run after this accounts-base startup
// block.  Perhaps we need a post-startup callback?


Meteor.startup(() => {
  if (!usingOAuthEncryption()) {
    return;
  }

  const {
    ServiceConfiguration
  } = Package['service-configuration'];
  ServiceConfiguration.configurations.find({
    $and: [{
      secret: {
        $exists: true
      }
    }, {
      "secret.algorithm": {
        $exists: false
      }
    }]
  }).forEach(config => {
    ServiceConfiguration.configurations.update(config._id, {
      $set: {
        secret: OAuthEncryption.seal(config.secret)
      }
    });
  });
}); // XXX see comment on Accounts.createUser in passwords_server about adding a
// second "server options" argument.

const defaultCreateUserHook = (options, user) => {
  if (options.profile) user.profile = options.profile;
  return user;
}; // Validate new user's email or Google/Facebook/GitHub account's email


function defaultValidateNewUserHook(user) {
  const domain = this._options.restrictCreationByEmailDomain;

  if (!domain) {
    return true;
  }

  let emailIsGood = false;

  if (user.emails && user.emails.length > 0) {
    emailIsGood = user.emails.reduce((prev, email) => prev || this._testEmailDomain(email.address), false);
  } else if (user.services && Object.values(user.services).length > 0) {
    // Find any email of any service and check it
    emailIsGood = Object.values(user.services).reduce((prev, service) => service.email && this._testEmailDomain(service.email), false);
  }

  if (emailIsGood) {
    return true;
  }

  if (typeof domain === 'string') {
    throw new Meteor.Error(403, "@".concat(domain, " email required"));
  } else {
    throw new Meteor.Error(403, "Email doesn't match the criteria.");
  }
}

const setupUsersCollection = users => {
  ///
  /// RESTRICTING WRITES TO USER OBJECTS
  ///
  users.allow({
    // clients can modify the profile field of their own document, and
    // nothing else.
    update: (userId, user, fields, modifier) => {
      // make sure it is our record
      if (user._id !== userId) {
        return false;
      } // user can only modify the 'profile' field. sets to multiple
      // sub-keys (eg profile.foo and profile.bar) are merged into entry
      // in the fields list.


      if (fields.length !== 1 || fields[0] !== 'profile') {
        return false;
      }

      return true;
    },
    fetch: ['_id'] // we only look at _id.

  }); /// DEFAULT INDEXES ON USERS

  users._ensureIndex('username', {
    unique: true,
    sparse: true
  });

  users._ensureIndex('emails.address', {
    unique: true,
    sparse: true
  });

  users._ensureIndex('services.resume.loginTokens.hashedToken', {
    unique: true,
    sparse: true
  });

  users._ensureIndex('services.resume.loginTokens.token', {
    unique: true,
    sparse: true
  }); // For taking care of logoutOtherClients calls that crashed before the
  // tokens were deleted.


  users._ensureIndex('services.resume.haveLoginTokensToDelete', {
    sparse: true
  }); // For expiring login tokens


  users._ensureIndex("services.resume.loginTokens.when", {
    sparse: true
  }); // For expiring password tokens


  users._ensureIndex('services.password.reset.when', {
    sparse: true
  });
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/accounts-base/server_main.js");

/* Exports */
Package._define("accounts-base", exports, {
  Accounts: Accounts
});

})();

//# sourceURL=meteor://💻app/packages/accounts-base.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtYmFzZS9zZXJ2ZXJfbWFpbi5qcyIsIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtYmFzZS9hY2NvdW50c19jb21tb24uanMiLCJtZXRlb3I6Ly/wn5K7YXBwL3BhY2thZ2VzL2FjY291bnRzLWJhc2UvYWNjb3VudHNfc2VydmVyLmpzIl0sIm5hbWVzIjpbIm1vZHVsZTEiLCJleHBvcnQiLCJBY2NvdW50c1NlcnZlciIsImxpbmsiLCJ2IiwiQWNjb3VudHMiLCJNZXRlb3IiLCJzZXJ2ZXIiLCJ1c2VycyIsIl9vYmplY3RTcHJlYWQiLCJtb2R1bGUiLCJkZWZhdWx0IiwiQWNjb3VudHNDb21tb24iLCJFWFBJUkVfVE9LRU5TX0lOVEVSVkFMX01TIiwiQ09OTkVDVElPTl9DTE9TRV9ERUxBWV9NUyIsImNvbnN0cnVjdG9yIiwib3B0aW9ucyIsIl9vcHRpb25zIiwiY29ubmVjdGlvbiIsInVuZGVmaW5lZCIsIl9pbml0Q29ubmVjdGlvbiIsIk1vbmdvIiwiQ29sbGVjdGlvbiIsIl9wcmV2ZW50QXV0b3B1Ymxpc2giLCJfb25Mb2dpbkhvb2siLCJIb29rIiwiYmluZEVudmlyb25tZW50IiwiZGVidWdQcmludEV4Y2VwdGlvbnMiLCJfb25Mb2dpbkZhaWx1cmVIb29rIiwiX29uTG9nb3V0SG9vayIsIkRFRkFVTFRfTE9HSU5fRVhQSVJBVElPTl9EQVlTIiwiTE9HSU5fVU5FWFBJUklOR19UT0tFTl9EQVlTIiwibGNlTmFtZSIsIkxvZ2luQ2FuY2VsbGVkRXJyb3IiLCJtYWtlRXJyb3JUeXBlIiwiZGVzY3JpcHRpb24iLCJtZXNzYWdlIiwicHJvdG90eXBlIiwibmFtZSIsIm51bWVyaWNFcnJvciIsInN0YXJ0dXAiLCJTZXJ2aWNlQ29uZmlndXJhdGlvbiIsIlBhY2thZ2UiLCJsb2dpblNlcnZpY2VDb25maWd1cmF0aW9uIiwiY29uZmlndXJhdGlvbnMiLCJDb25maWdFcnJvciIsInVzZXJJZCIsIkVycm9yIiwiX2FkZERlZmF1bHRGaWVsZFNlbGVjdG9yIiwiZGVmYXVsdEZpZWxkU2VsZWN0b3IiLCJmaWVsZHMiLCJrZXlzIiwiT2JqZWN0IiwibGVuZ3RoIiwia2V5czIiLCJ1c2VyIiwiZmluZE9uZSIsImNvbmZpZyIsImlzU2VydmVyIiwiX19tZXRlb3JfcnVudGltZV9jb25maWdfXyIsImFjY291bnRzQ29uZmlnQ2FsbGVkIiwiX2RlYnVnIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiaXNDbGllbnQiLCJPQXV0aEVuY3J5cHRpb24iLCJsb2FkS2V5Iiwib2F1dGhTZWNyZXRLZXkiLCJWQUxJRF9LRVlTIiwiZm9yRWFjaCIsImtleSIsImluY2x1ZGVzIiwib25Mb2dpbiIsImZ1bmMiLCJyZXQiLCJyZWdpc3RlciIsIl9zdGFydHVwQ2FsbGJhY2siLCJjYWxsYmFjayIsIm9uTG9naW5GYWlsdXJlIiwib25Mb2dvdXQiLCJkZHBVcmwiLCJERFAiLCJjb25uZWN0IiwiQUNDT1VOVFNfQ09OTkVDVElPTl9VUkwiLCJfZ2V0VG9rZW5MaWZldGltZU1zIiwibG9naW5FeHBpcmF0aW9uSW5EYXlzIiwibG9naW5FeHBpcmF0aW9uIiwiX2dldFBhc3N3b3JkUmVzZXRUb2tlbkxpZmV0aW1lTXMiLCJwYXNzd29yZFJlc2V0VG9rZW5FeHBpcmF0aW9uIiwicGFzc3dvcmRSZXNldFRva2VuRXhwaXJhdGlvbkluRGF5cyIsIkRFRkFVTFRfUEFTU1dPUkRfUkVTRVRfVE9LRU5fRVhQSVJBVElPTl9EQVlTIiwiX2dldFBhc3N3b3JkRW5yb2xsVG9rZW5MaWZldGltZU1zIiwicGFzc3dvcmRFbnJvbGxUb2tlbkV4cGlyYXRpb24iLCJwYXNzd29yZEVucm9sbFRva2VuRXhwaXJhdGlvbkluRGF5cyIsIkRFRkFVTFRfUEFTU1dPUkRfRU5ST0xMX1RPS0VOX0VYUElSQVRJT05fREFZUyIsIl90b2tlbkV4cGlyYXRpb24iLCJ3aGVuIiwiRGF0ZSIsImdldFRpbWUiLCJfdG9rZW5FeHBpcmVzU29vbiIsIm1pbkxpZmV0aW1lTXMiLCJtaW5MaWZldGltZUNhcE1zIiwiTUlOX1RPS0VOX0xJRkVUSU1FX0NBUF9TRUNTIiwiX29iamVjdFdpdGhvdXRQcm9wZXJ0aWVzIiwiY3J5cHRvIiwiVVJMIiwiaGFzT3duIiwiX3NlcnZlciIsIl9pbml0U2VydmVyTWV0aG9kcyIsIl9pbml0QWNjb3VudERhdGFIb29rcyIsIl9hdXRvcHVibGlzaEZpZWxkcyIsImxvZ2dlZEluVXNlciIsIm90aGVyVXNlcnMiLCJfZGVmYXVsdFB1Ymxpc2hGaWVsZHMiLCJwcm9qZWN0aW9uIiwicHJvZmlsZSIsInVzZXJuYW1lIiwiZW1haWxzIiwiX2luaXRTZXJ2ZXJQdWJsaWNhdGlvbnMiLCJfYWNjb3VudERhdGEiLCJfdXNlck9ic2VydmVzRm9yQ29ubmVjdGlvbnMiLCJfbmV4dFVzZXJPYnNlcnZlTnVtYmVyIiwiX2xvZ2luSGFuZGxlcnMiLCJzZXR1cFVzZXJzQ29sbGVjdGlvbiIsInNldHVwRGVmYXVsdExvZ2luSGFuZGxlcnMiLCJzZXRFeHBpcmVUb2tlbnNJbnRlcnZhbCIsIl92YWxpZGF0ZUxvZ2luSG9vayIsIl92YWxpZGF0ZU5ld1VzZXJIb29rcyIsImRlZmF1bHRWYWxpZGF0ZU5ld1VzZXJIb29rIiwiYmluZCIsIl9kZWxldGVTYXZlZFRva2Vuc0ZvckFsbFVzZXJzT25TdGFydHVwIiwiX3NraXBDYXNlSW5zZW5zaXRpdmVDaGVja3NGb3JUZXN0IiwidXJscyIsInJlc2V0UGFzc3dvcmQiLCJ0b2tlbiIsImV4dHJhUGFyYW1zIiwiYnVpbGRFbWFpbFVybCIsInZlcmlmeUVtYWlsIiwiZW5yb2xsQWNjb3VudCIsImFkZERlZmF1bHRSYXRlTGltaXQiLCJwYXRoIiwidXJsIiwiYWJzb2x1dGVVcmwiLCJwYXJhbXMiLCJlbnRyaWVzIiwidmFsdWUiLCJzZWFyY2hQYXJhbXMiLCJhcHBlbmQiLCJ0b1N0cmluZyIsImN1cnJlbnRJbnZvY2F0aW9uIiwiX0N1cnJlbnRNZXRob2RJbnZvY2F0aW9uIiwiZ2V0IiwiX0N1cnJlbnRQdWJsaWNhdGlvbkludm9jYXRpb24iLCJ2YWxpZGF0ZUxvZ2luQXR0ZW1wdCIsInZhbGlkYXRlTmV3VXNlciIsInB1c2giLCJiZWZvcmVFeHRlcm5hbExvZ2luIiwiX2JlZm9yZUV4dGVybmFsTG9naW5Ib29rIiwib25DcmVhdGVVc2VyIiwiX29uQ3JlYXRlVXNlckhvb2siLCJvbkV4dGVybmFsTG9naW4iLCJfb25FeHRlcm5hbExvZ2luSG9vayIsIl92YWxpZGF0ZUxvZ2luIiwiYXR0ZW1wdCIsImVhY2giLCJjbG9uZUF0dGVtcHRXaXRoQ29ubmVjdGlvbiIsImUiLCJhbGxvd2VkIiwiZXJyb3IiLCJfc3VjY2Vzc2Z1bExvZ2luIiwiX2ZhaWxlZExvZ2luIiwiX3N1Y2Nlc3NmdWxMb2dvdXQiLCJfbG9naW5Vc2VyIiwibWV0aG9kSW52b2NhdGlvbiIsInN0YW1wZWRMb2dpblRva2VuIiwiX2dlbmVyYXRlU3RhbXBlZExvZ2luVG9rZW4iLCJfaW5zZXJ0TG9naW5Ub2tlbiIsIl9ub1lpZWxkc0FsbG93ZWQiLCJfc2V0TG9naW5Ub2tlbiIsIl9oYXNoTG9naW5Ub2tlbiIsInNldFVzZXJJZCIsImlkIiwidG9rZW5FeHBpcmVzIiwiX2F0dGVtcHRMb2dpbiIsIm1ldGhvZE5hbWUiLCJtZXRob2RBcmdzIiwicmVzdWx0IiwidHlwZSIsIm1ldGhvZEFyZ3VtZW50cyIsIkFycmF5IiwiZnJvbSIsIl9sb2dpbk1ldGhvZCIsImZuIiwidHJ5TG9naW5NZXRob2QiLCJfcmVwb3J0TG9naW5GYWlsdXJlIiwicmVnaXN0ZXJMb2dpbkhhbmRsZXIiLCJoYW5kbGVyIiwiX3J1bkxvZ2luSGFuZGxlcnMiLCJkZXN0cm95VG9rZW4iLCJsb2dpblRva2VuIiwidXBkYXRlIiwiJHB1bGwiLCIkb3IiLCJoYXNoZWRUb2tlbiIsImFjY291bnRzIiwibWV0aG9kcyIsImxvZ2luIiwiY2hlY2siLCJhcmd1bWVudHMiLCJsb2dvdXQiLCJfZ2V0TG9naW5Ub2tlbiIsImxvZ291dE90aGVyQ2xpZW50cyIsInRva2VucyIsInNlcnZpY2VzIiwicmVzdW1lIiwibG9naW5Ub2tlbnMiLCJuZXdUb2tlbiIsIiRzZXQiLCIkcHVzaCIsIl9oYXNoU3RhbXBlZFRva2VuIiwic2V0VGltZW91dCIsIl9kZWxldGVTYXZlZFRva2Vuc0ZvclVzZXIiLCJfbm9Db25uZWN0aW9uQ2xvc2VEZWxheUZvclRlc3QiLCJnZXROZXdUb2tlbiIsImN1cnJlbnRIYXNoZWRUb2tlbiIsImN1cnJlbnRTdGFtcGVkVG9rZW4iLCJmaW5kIiwic3RhbXBlZFRva2VuIiwibmV3U3RhbXBlZFRva2VuIiwicmVtb3ZlT3RoZXJUb2tlbnMiLCJjdXJyZW50VG9rZW4iLCIkbmUiLCJjb25maWd1cmVMb2dpblNlcnZpY2UiLCJNYXRjaCIsIk9iamVjdEluY2x1ZGluZyIsInNlcnZpY2UiLCJTdHJpbmciLCJvYXV0aCIsInNlcnZpY2VOYW1lcyIsInVzaW5nT0F1dGhFbmNyeXB0aW9uIiwic2VjcmV0Iiwic2VhbCIsImluc2VydCIsIm9uQ29ubmVjdGlvbiIsIm9uQ2xvc2UiLCJfcmVtb3ZlVG9rZW5Gcm9tQ29ubmVjdGlvbiIsInB1Ymxpc2giLCJpc19hdXRvIiwiX2lkIiwiYXV0b3B1Ymxpc2giLCJ0b0ZpZWxkU2VsZWN0b3IiLCJyZWR1Y2UiLCJwcmV2IiwiZmllbGQiLCJzZWxlY3RvciIsImFkZEF1dG9wdWJsaXNoRmllbGRzIiwib3B0cyIsImFwcGx5IiwiZm9yTG9nZ2VkSW5Vc2VyIiwiZm9yT3RoZXJVc2VycyIsInNldERlZmF1bHRQdWJsaXNoRmllbGRzIiwiX2dldEFjY291bnREYXRhIiwiY29ubmVjdGlvbklkIiwiZGF0YSIsIl9zZXRBY2NvdW50RGF0YSIsImhhc2giLCJjcmVhdGVIYXNoIiwiZGlnZXN0IiwiaGFzaGVkU3RhbXBlZFRva2VuIiwiX2luc2VydEhhc2hlZExvZ2luVG9rZW4iLCJxdWVyeSIsIiRhZGRUb1NldCIsIl9jbGVhckFsbExvZ2luVG9rZW5zIiwiX2dldFVzZXJPYnNlcnZlIiwib2JzZXJ2ZSIsInN0b3AiLCJteU9ic2VydmVOdW1iZXIiLCJkZWZlciIsImZvdW5kTWF0Y2hpbmdVc2VyIiwib2JzZXJ2ZUNoYW5nZXMiLCJhZGRlZCIsInJlbW92ZWQiLCJjbG9zZSIsIm5vbk11dGF0aW5nQ2FsbGJhY2tzIiwiUmFuZG9tIiwiX2V4cGlyZVBhc3N3b3JkUmVzZXRUb2tlbnMiLCJvbGRlc3RWYWxpZERhdGUiLCJ0b2tlbkxpZmV0aW1lTXMiLCJ0b2tlbkZpbHRlciIsIiRleGlzdHMiLCJleHBpcmVQYXNzd29yZFRva2VuIiwiX2V4cGlyZVBhc3N3b3JkRW5yb2xsVG9rZW5zIiwiX2V4cGlyZVRva2VucyIsInVzZXJGaWx0ZXIiLCIkbHQiLCJtdWx0aSIsInN1cGVyUmVzdWx0IiwiZXhwaXJlVG9rZW5JbnRlcnZhbCIsImNsZWFySW50ZXJ2YWwiLCJpbnNlcnRVc2VyRG9jIiwiY3JlYXRlZEF0IiwicGluRW5jcnlwdGVkRmllbGRzVG9Vc2VyIiwiZnVsbFVzZXIiLCJkZWZhdWx0Q3JlYXRlVXNlckhvb2siLCJob29rIiwiZXJybXNnIiwiX3Rlc3RFbWFpbERvbWFpbiIsImVtYWlsIiwiZG9tYWluIiwicmVzdHJpY3RDcmVhdGlvbkJ5RW1haWxEb21haW4iLCJSZWdFeHAiLCJfZXNjYXBlUmVnRXhwIiwidGVzdCIsInRva2Vuc1RvRGVsZXRlIiwiJHVuc2V0IiwiJHB1bGxBbGwiLCJsb2dpblRva2Vuc1RvRGVsZXRlIiwidXBkYXRlT3JDcmVhdGVVc2VyRnJvbUV4dGVybmFsU2VydmljZSIsInNlcnZpY2VOYW1lIiwic2VydmljZURhdGEiLCJzZXJ2aWNlSWRLZXkiLCJpc05hTiIsInBhcnNlSW50Iiwic2V0QXR0cnMiLCJyZW1vdmVEZWZhdWx0UmF0ZUxpbWl0IiwicmVzcCIsIkREUFJhdGVMaW1pdGVyIiwicmVtb3ZlUnVsZSIsImRlZmF1bHRSYXRlTGltaXRlclJ1bGVJZCIsImFkZFJ1bGUiLCJjbGllbnRBZGRyZXNzIiwiY2xvbmVkQXR0ZW1wdCIsIkVKU09OIiwiY2xvbmUiLCJkZWZhdWx0UmVzdW1lTG9naW5IYW5kbGVyIiwib2xkVW5oYXNoZWRTdHlsZVRva2VuIiwicmVzZXRSYW5nZU9yIiwiZXhwaXJlRmlsdGVyIiwiJGFuZCIsInNldEludGVydmFsIiwia2V5SXNMb2FkZWQiLCJpc1NlYWxlZCIsIm9wZW4iLCJlbWFpbElzR29vZCIsImFkZHJlc3MiLCJ2YWx1ZXMiLCJhbGxvdyIsIm1vZGlmaWVyIiwiZmV0Y2giLCJfZW5zdXJlSW5kZXgiLCJ1bmlxdWUiLCJzcGFyc2UiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQUEsU0FBTyxDQUFDQyxNQUFSLENBQWU7QUFBQ0Msa0JBQWMsRUFBQyxNQUFJQTtBQUFwQixHQUFmO0FBQW9ELE1BQUlBLGNBQUo7QUFBbUJGLFNBQU8sQ0FBQ0csSUFBUixDQUFhLHNCQUFiLEVBQW9DO0FBQUNELGtCQUFjLENBQUNFLENBQUQsRUFBRztBQUFDRixvQkFBYyxHQUFDRSxDQUFmO0FBQWlCOztBQUFwQyxHQUFwQyxFQUEwRSxDQUExRTs7QUFFdkU7QUFDQTtBQUNBO0FBQ0E7QUFDQUMsVUFBUSxHQUFHLElBQUlILGNBQUosQ0FBbUJJLE1BQU0sQ0FBQ0MsTUFBMUIsQ0FBWCxDLENBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQUQsUUFBTSxDQUFDRSxLQUFQLEdBQWVILFFBQVEsQ0FBQ0csS0FBeEI7Ozs7Ozs7Ozs7OztBQ2xCQSxJQUFJQyxhQUFKOztBQUFrQkMsTUFBTSxDQUFDUCxJQUFQLENBQVksc0NBQVosRUFBbUQ7QUFBQ1EsU0FBTyxDQUFDUCxDQUFELEVBQUc7QUFBQ0ssaUJBQWEsR0FBQ0wsQ0FBZDtBQUFnQjs7QUFBNUIsQ0FBbkQsRUFBaUYsQ0FBakY7QUFBbEJNLE1BQU0sQ0FBQ1QsTUFBUCxDQUFjO0FBQUNXLGdCQUFjLEVBQUMsTUFBSUEsY0FBcEI7QUFBbUNDLDJCQUF5QixFQUFDLE1BQUlBLHlCQUFqRTtBQUEyRkMsMkJBQXlCLEVBQUMsTUFBSUE7QUFBekgsQ0FBZDs7QUFTTyxNQUFNRixjQUFO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LEVBQ0U7QUFBRUMsVUFBTSxFQUFFLElBQVY7QUFBZ0JDLFVBQU0sRUFBRTtBQUF4QixHQURGOztBQUVBdlYsT0FBSyxDQUFDcVYsWUFBTixDQUFtQixtQ0FBbkIsRUFDRTtBQUFFQyxVQUFNLEVBQUUsSUFBVjtBQUFnQkMsVUFBTSxFQUFFO0FBQXhCLEdBREYsRUE5Qm9DLENBZ0NwQztBQUNBOzs7QUFDQXZWLE9BQUssQ0FBQ3FWLFlBQU4sQ0FBbUIseUNBQW5CLEVBQ0U7QUFBRUUsVUFBTSxFQUFFO0FBQVYsR0FERixFQWxDb0MsQ0FvQ3BDOzs7QUFDQXZWLE9BQUssQ0FBQ3FWLFlBQU4sQ0FBbUIsa0NBQW5CLEVBQXVEO0FBQUVFLFVBQU0sRUFBRTtBQUFWLEdBQXZELEVBckNvQyxDQXNDcEM7OztBQUNBdlYsT0FBSyxDQUFDcVYsWUFBTixDQUFtQiw4QkFBbkIsRUFBbUQ7QUFBRUUsVUFBTSxFQUFFO0FBQVYsR0FBbkQ7QUFDRCxDQXhDRCxDIiwiZmlsZSI6Ii9wYWNrYWdlcy9hY2NvdW50cy1iYXNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQWNjb3VudHNTZXJ2ZXIgfSBmcm9tIFwiLi9hY2NvdW50c19zZXJ2ZXIuanNcIjtcblxuLyoqXG4gKiBAbmFtZXNwYWNlIEFjY291bnRzXG4gKiBAc3VtbWFyeSBUaGUgbmFtZXNwYWNlIGZvciBhbGwgc2VydmVyLXNpZGUgYWNjb3VudHMtcmVsYXRlZCBtZXRob2RzLlxuICovXG5BY2NvdW50cyA9IG5ldyBBY2NvdW50c1NlcnZlcihNZXRlb3Iuc2VydmVyKTtcblxuLy8gVXNlcnMgdGFibGUuIERvbid0IHVzZSB0aGUgbm9ybWFsIGF1dG9wdWJsaXNoLCBzaW5jZSB3ZSB3YW50IHRvIGhpZGVcbi8vIHNvbWUgZmllbGRzLiBDb2RlIHRvIGF1dG9wdWJsaXNoIHRoaXMgaXMgaW4gYWNjb3VudHNfc2VydmVyLmpzLlxuLy8gWFhYIEFsbG93IHVzZXJzIHRvIGNvbmZpZ3VyZSB0aGlzIGNvbGxlY3Rpb24gbmFtZS5cblxuLyoqXG4gKiBAc3VtbWFyeSBBIFtNb25nby5Db2xsZWN0aW9uXSgjY29sbGVjdGlvbnMpIGNvbnRhaW5pbmcgdXNlciBkb2N1bWVudHMuXG4gKiBAbG9jdXMgQW55d2hlcmVcbiAqIEB0eXBlIHtNb25nby5Db2xsZWN0aW9ufVxuICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuKi9cbk1ldGVvci51c2VycyA9IEFjY291bnRzLnVzZXJzO1xuXG5leHBvcnQge1xuICAvLyBTaW5jZSB0aGlzIGZpbGUgaXMgdGhlIG1haW4gbW9kdWxlIGZvciB0aGUgc2VydmVyIHZlcnNpb24gb2YgdGhlXG4gIC8vIGFjY291bnRzLWJhc2UgcGFja2FnZSwgcHJvcGVydGllcyBvZiBub24tZW50cnktcG9pbnQgbW9kdWxlcyBuZWVkIHRvXG4gIC8vIGJlIHJlLWV4cG9ydGVkIGluIG9yZGVyIHRvIGJlIGFjY2Vzc2libGUgdG8gbW9kdWxlcyB0aGF0IGltcG9ydCB0aGVcbiAgLy8gYWNjb3VudHMtYmFzZSBwYWNrYWdlLlxuICBBY2NvdW50c1NlcnZlclxufTtcbiIsIi8qKlxuICogQHN1bW1hcnkgU3VwZXItY29uc3RydWN0b3IgZm9yIEFjY291bnRzQ2xpZW50IGFuZCBBY2NvdW50c1NlcnZlci5cbiAqIEBsb2N1cyBBbnl3aGVyZVxuICogQGNsYXNzIEFjY291bnRzQ29tbW9uXG4gKiBAaW5zdGFuY2VuYW1lIGFjY291bnRzQ2xpZW50T3JTZXJ2ZXJcbiAqIEBwYXJhbSBvcHRpb25zIHtPYmplY3R9IGFuIG9iamVjdCB3aXRoIGZpZWxkczpcbiAqIC0gY29ubmVjdGlvbiB7T2JqZWN0fSBPcHRpb25hbCBERFAgY29ubmVjdGlvbiB0byByZXVzZS5cbiAqIC0gZGRwVXJsIHtTdHJpbmd9IE9wdGlvbmFsIFVSTCBmb3IgY3JlYXRpbmcgYSBuZXcgRERQIGNvbm5lY3Rpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBBY2NvdW50c0NvbW1vbiB7XG4gIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcbiAgICAvLyBDdXJyZW50bHkgdGhpcyBpcyByZWFkIGRpcmVjdGx5IGJ5IHBhY2thZ2VzIGxpa2UgYWNjb3VudHMtcGFzc3dvcmRcbiAgICAvLyBhbmQgYWNjb3VudHMtdWktdW5zdHlsZWQuXG4gICAgdGhpcy5fb3B0aW9ucyA9IHt9O1xuXG4gICAgLy8gTm90ZSB0aGF0IHNldHRpbmcgdGhpcy5jb25uZWN0aW9uID0gbnVsbCBjYXVzZXMgdGhpcy51c2VycyB0byBiZSBhXG4gICAgLy8gTG9jYWxDb2xsZWN0aW9uLCB3aGljaCBpcyBub3Qgd2hhdCB3ZSB3YW50LlxuICAgIHRoaXMuY29ubmVjdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9pbml0Q29ubmVjdGlvbihvcHRpb25zIHx8IHt9KTtcblxuICAgIC8vIFRoZXJlIGlzIGFuIGFsbG93IGNhbGwgaW4gYWNjb3VudHNfc2VydmVyLmpzIHRoYXQgcmVzdHJpY3RzIHdyaXRlcyB0b1xuICAgIC8vIHRoaXMgY29sbGVjdGlvbi5cbiAgICB0aGlzLnVzZXJzID0gbmV3IE1vbmdvLkNvbGxlY3Rpb24oXCJ1c2Vyc1wiLCB7XG4gICAgICBfcHJldmVudEF1dG9wdWJsaXNoOiB0cnVlLFxuICAgICAgY29ubmVjdGlvbjogdGhpcy5jb25uZWN0aW9uXG4gICAgfSk7XG5cbiAgICAvLyBDYWxsYmFjayBleGNlcHRpb25zIGFyZSBwcmludGVkIHdpdGggTWV0ZW9yLl9kZWJ1ZyBhbmQgaWdub3JlZC5cbiAgICB0aGlzLl9vbkxvZ2luSG9vayA9IG5ldyBIb29rKHtcbiAgICAgIGJpbmRFbnZpcm9ubWVudDogZmFsc2UsXG4gICAgICBkZWJ1Z1ByaW50RXhjZXB0aW9uczogXCJvbkxvZ2luIGNhbGxiYWNrXCJcbiAgICB9KTtcblxuICAgIHRoaXMuX29uTG9naW5GYWlsdXJlSG9vayA9IG5ldyBIb29rKHtcbiAgICAgIGJpbmRFbnZpcm9ubWVudDogZmFsc2UsXG4gICAgICBkZWJ1Z1ByaW50RXhjZXB0aW9uczogXCJvbkxvZ2luRmFpbHVyZSBjYWxsYmFja1wiXG4gICAgfSk7XG5cbiAgICB0aGlzLl9vbkxvZ291dEhvb2sgPSBuZXcgSG9vayh7XG4gICAgICBiaW5kRW52aXJvbm1lbnQ6IGZhbHNlLFxuICAgICAgZGVidWdQcmludEV4Y2VwdGlvbnM6IFwib25Mb2dvdXQgY2FsbGJhY2tcIlxuICAgIH0pO1xuXG4gICAgLy8gRXhwb3NlIGZvciB0ZXN0aW5nLlxuICAgIHRoaXMuREVGQVVMVF9MT0dJTl9FWFBJUkFUSU9OX0RBWVMgPSBERUZBVUxUX0xPR0lOX0VYUElSQVRJT05fREFZUztcbiAgICB0aGlzLkxPR0lOX1VORVhQSVJJTkdfVE9LRU5fREFZUyA9IExPR0lOX1VORVhQSVJJTkdfVE9LRU5fREFZUztcblxuICAgIC8vIFRocm93biB3aGVuIHRoZSB1c2VyIGNhbmNlbHMgdGhlIGxvZ2luIHByb2Nlc3MgKGVnLCBjbG9zZXMgYW4gb2F1dGhcbiAgICAvLyBwb3B1cCwgZGVjbGluZXMgcmV0aW5hIHNjYW4sIGV0YylcbiAgICBjb25zdCBsY2VOYW1lID0gJ0FjY291bnRzLkxvZ2luQ2FuY2VsbGVkRXJyb3InO1xuICAgIHRoaXMuTG9naW5DYW5jZWxsZWRFcnJvciA9IE1ldGVvci5tYWtlRXJyb3JUeXBlKFxuICAgICAgbGNlTmFtZSxcbiAgICAgIGZ1bmN0aW9uIChkZXNjcmlwdGlvbikge1xuICAgICAgICB0aGlzLm1lc3NhZ2UgPSBkZXNjcmlwdGlvbjtcbiAgICAgIH1cbiAgICApO1xuICAgIHRoaXMuTG9naW5DYW5jZWxsZWRFcnJvci5wcm90b3R5cGUubmFtZSA9IGxjZU5hbWU7XG5cbiAgICAvLyBUaGlzIGlzIHVzZWQgdG8gdHJhbnNtaXQgc3BlY2lmaWMgc3ViY2xhc3MgZXJyb3JzIG92ZXIgdGhlIHdpcmUuIFdlXG4gICAgLy8gc2hvdWxkIGNvbWUgdXAgd2l0aCBhIG1vcmUgZ2VuZXJpYyB3YXkgdG8gZG8gdGhpcyAoZWcsIHdpdGggc29tZSBzb3J0IG9mXG4gICAgLy8gc3ltYm9saWMgZXJyb3IgY29kZSByYXRoZXIgdGhhbiBhIG51bWJlcikuXG4gICAgdGhpcy5Mb2dpbkNhbmNlbGxlZEVycm9yLm51bWVyaWNFcnJvciA9IDB4OGFjZGMyZjtcblxuICAgIC8vIGxvZ2luU2VydmljZUNvbmZpZ3VyYXRpb24gYW5kIENvbmZpZ0Vycm9yIGFyZSBtYWludGFpbmVkIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eVxuICAgIE1ldGVvci5zdGFydHVwKCgpID0+IHtcbiAgICAgIGNvbnN0IHsgU2VydmljZUNvbmZpZ3VyYXRpb24gfSA9IFBhY2thZ2VbJ3NlcnZpY2UtY29uZmlndXJhdGlvbiddO1xuICAgICAgdGhpcy5sb2dpblNlcnZpY2VDb25maWd1cmF0aW9uID0gU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnM7XG4gICAgICB0aGlzLkNvbmZpZ0Vycm9yID0gU2VydmljZUNvbmZpZ3VyYXRpb24uQ29uZmlnRXJyb3I7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgR2V0IHRoZSBjdXJyZW50IHVzZXIgaWQsIG9yIGBudWxsYCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbi4gQSByZWFjdGl2ZSBkYXRhIHNvdXJjZS5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqL1xuICB1c2VySWQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwidXNlcklkIG1ldGhvZCBub3QgaW1wbGVtZW50ZWRcIik7XG4gIH1cblxuICAvLyBtZXJnZSB0aGUgZGVmYXVsdEZpZWxkU2VsZWN0b3Igd2l0aCBhbiBleGlzdGluZyBvcHRpb25zIG9iamVjdFxuICBfYWRkRGVmYXVsdEZpZWxkU2VsZWN0b3Iob3B0aW9ucyA9IHt9KSB7XG4gICAgLy8gdGhpcyB3aWxsIGJlIHRoZSBtb3N0IGNvbW1vbiBjYXNlIGZvciBtb3N0IHBlb3BsZSwgc28gbWFrZSBpdCBxdWlja1xuICAgIGlmICghdGhpcy5fb3B0aW9ucy5kZWZhdWx0RmllbGRTZWxlY3RvcikgcmV0dXJuIG9wdGlvbnM7XG5cbiAgICAvLyBpZiBubyBmaWVsZCBzZWxlY3RvciB0aGVuIGp1c3QgdXNlIGRlZmF1bHRGaWVsZFNlbGVjdG9yXG4gICAgaWYgKCFvcHRpb25zLmZpZWxkcykgcmV0dXJuIHtcbiAgICAgIC4uLm9wdGlvbnMsXG4gICAgICBmaWVsZHM6IHRoaXMuX29wdGlvbnMuZGVmYXVsdEZpZWxkU2VsZWN0b3IsXG4gICAgfTtcblxuICAgIC8vIGlmIGVtcHR5IGZpZWxkIHNlbGVjdG9yIHRoZW4gdGhlIGZ1bGwgdXNlciBvYmplY3QgaXMgZXhwbGljaXRseSByZXF1ZXN0ZWQsIHNvIG9iZXlcbiAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMob3B0aW9ucy5maWVsZHMpO1xuICAgIGlmICgha2V5cy5sZW5ndGgpIHJldHVybiBvcHRpb25zO1xuXG4gICAgLy8gaWYgdGhlIHJlcXVlc3RlZCBmaWVsZHMgYXJlICt2ZSB0aGVuIGlnbm9yZSBkZWZhdWx0RmllbGRTZWxlY3RvclxuICAgIC8vIGFzc3VtZSB0aGV5IGFyZSBhbGwgZWl0aGVyICt2ZSBvciAtdmUgYmVjYXVzZSBNb25nbyBkb2Vzbid0IGxpa2UgbWl4ZWRcbiAgICBpZiAoISFvcHRpb25zLmZpZWxkc1trZXlzWzBdXSkgcmV0dXJuIG9wdGlvbnM7XG5cbiAgICAvLyBUaGUgcmVxdWVzdGVkIGZpZWxkcyBhcmUgLXZlLlxuICAgIC8vIElmIHRoZSBkZWZhdWx0RmllbGRTZWxlY3RvciBpcyArdmUgdGhlbiB1c2UgcmVxdWVzdGVkIGZpZWxkcywgb3RoZXJ3aXNlIG1lcmdlIHRoZW1cbiAgICBjb25zdCBrZXlzMiA9IE9iamVjdC5rZXlzKHRoaXMuX29wdGlvbnMuZGVmYXVsdEZpZWxkU2VsZWN0b3IpO1xuICAgIHJldHVybiB0aGlzLl9vcHRpb25zLmRlZmF1bHRGaWVsZFNlbGVjdG9yW2tleXMyWzBdXSA/IG9wdGlvbnMgOiB7XG4gICAgICAuLi5vcHRpb25zLFxuICAgICAgZmllbGRzOiB7XG4gICAgICAgIC4uLm9wdGlvbnMuZmllbGRzLFxuICAgICAgICAuLi50aGlzLl9vcHRpb25zLmRlZmF1bHRGaWVsZFNlbGVjdG9yLFxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBHZXQgdGhlIGN1cnJlbnQgdXNlciByZWNvcmQsIG9yIGBudWxsYCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbi4gQSByZWFjdGl2ZSBkYXRhIHNvdXJjZS5cbiAgICogQGxvY3VzIEFueXdoZXJlXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBbb3B0aW9uc11cbiAgICogQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBvcHRpb25zLmZpZWxkcyBEaWN0aW9uYXJ5IG9mIGZpZWxkcyB0byByZXR1cm4gb3IgZXhjbHVkZS5cbiAgICovXG4gIHVzZXIob3B0aW9ucykge1xuICAgIGNvbnN0IHVzZXJJZCA9IHRoaXMudXNlcklkKCk7XG4gICAgcmV0dXJuIHVzZXJJZCA/IHRoaXMudXNlcnMuZmluZE9uZSh1c2VySWQsIHRoaXMuX2FkZERlZmF1bHRGaWVsZFNlbGVjdG9yKG9wdGlvbnMpKSA6IG51bGw7XG4gIH1cblxuICAvLyBTZXQgdXAgY29uZmlnIGZvciB0aGUgYWNjb3VudHMgc3lzdGVtLiBDYWxsIHRoaXMgb24gYm90aCB0aGUgY2xpZW50XG4gIC8vIGFuZCB0aGUgc2VydmVyLlxuICAvL1xuICAvLyBOb3RlIHRoYXQgdGhpcyBtZXRob2QgZ2V0cyBvdmVycmlkZGVuIG9uIEFjY291bnRzU2VydmVyLnByb3RvdHlwZSwgYnV0XG4gIC8vIHRoZSBvdmVycmlkaW5nIG1ldGhvZCBjYWxscyB0aGUgb3ZlcnJpZGRlbiBtZXRob2QuXG4gIC8vXG4gIC8vIFhYWCB3ZSBzaG91bGQgYWRkIHNvbWUgZW5mb3JjZW1lbnQgdGhhdCB0aGlzIGlzIGNhbGxlZCBvbiBib3RoIHRoZVxuICAvLyBjbGllbnQgYW5kIHRoZSBzZXJ2ZXIuIE90aGVyd2lzZSwgYSB1c2VyIGNhblxuICAvLyAnZm9yYmlkQ2xpZW50QWNjb3VudENyZWF0aW9uJyBvbmx5IG9uIHRoZSBjbGllbnQgYW5kIHdoaWxlIGl0IGxvb2tzXG4gIC8vIGxpa2UgdGhlaXIgYXBwIGlzIHNlY3VyZSwgdGhlIHNlcnZlciB3aWxsIHN0aWxsIGFjY2VwdCBjcmVhdGVVc2VyXG4gIC8vIGNhbGxzLiBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9pc3N1ZXMvODI4XG4gIC8vXG4gIC8vIEBwYXJhbSBvcHRpb25zIHtPYmplY3R9IGFuIG9iamVjdCB3aXRoIGZpZWxkczpcbiAgLy8gLSBzZW5kVmVyaWZpY2F0aW9uRW1haWwge0Jvb2xlYW59XG4gIC8vICAgICBTZW5kIGVtYWlsIGFkZHJlc3MgdmVyaWZpY2F0aW9uIGVtYWlscyB0byBuZXcgdXNlcnMgY3JlYXRlZCBmcm9tXG4gIC8vICAgICBjbGllbnQgc2lnbnVwcy5cbiAgLy8gLSBmb3JiaWRDbGllbnRBY2NvdW50Q3JlYXRpb24ge0Jvb2xlYW59XG4gIC8vICAgICBEbyBub3QgYWxsb3cgY2xpZW50cyB0byBjcmVhdGUgYWNjb3VudHMgZGlyZWN0bHkuXG4gIC8vIC0gcmVzdHJpY3RDcmVhdGlvbkJ5RW1haWxEb21haW4ge0Z1bmN0aW9uIG9yIFN0cmluZ31cbiAgLy8gICAgIFJlcXVpcmUgY3JlYXRlZCB1c2VycyB0byBoYXZlIGFuIGVtYWlsIG1hdGNoaW5nIHRoZSBmdW5jdGlvbiBvclxuICAvLyAgICAgaGF2aW5nIHRoZSBzdHJpbmcgYXMgZG9tYWluLlxuICAvLyAtIGxvZ2luRXhwaXJhdGlvbkluRGF5cyB7TnVtYmVyfVxuICAvLyAgICAgTnVtYmVyIG9mIGRheXMgc2luY2UgbG9naW4gdW50aWwgYSB1c2VyIGlzIGxvZ2dlZCBvdXQgKGxvZ2luIHRva2VuXG4gIC8vICAgICBleHBpcmVzKS5cbiAgLy8gLSBwYXNzd29yZFJlc2V0VG9rZW5FeHBpcmF0aW9uSW5EYXlzIHtOdW1iZXJ9XG4gIC8vICAgICBOdW1iZXIgb2YgZGF5cyBzaW5jZSBwYXNzd29yZCByZXNldCB0b2tlbiBjcmVhdGlvbiB1bnRpbCB0aGVcbiAgLy8gICAgIHRva2VuIGNhbm50IGJlIHVzZWQgYW55IGxvbmdlciAocGFzc3dvcmQgcmVzZXQgdG9rZW4gZXhwaXJlcykuXG4gIC8vIC0gYW1iaWd1b3VzRXJyb3JNZXNzYWdlcyB7Qm9vbGVhbn1cbiAgLy8gICAgIFJldHVybiBhbWJpZ3VvdXMgZXJyb3IgbWVzc2FnZXMgZnJvbSBsb2dpbiBmYWlsdXJlcyB0byBwcmV2ZW50XG4gIC8vICAgICB1c2VyIGVudW1lcmF0aW9uLlxuICAvLyAtIGJjcnlwdFJvdW5kcyB7TnVtYmVyfVxuICAvLyAgICAgQWxsb3dzIG92ZXJyaWRlIG9mIG51bWJlciBvZiBiY3J5cHQgcm91bmRzIChha2Egd29yayBmYWN0b3IpIHVzZWRcbiAgLy8gICAgIHRvIHN0b3JlIHBhc3N3b3Jkcy5cblxuICAvKipcbiAgICogQHN1bW1hcnkgU2V0IGdsb2JhbCBhY2NvdW50cyBvcHRpb25zLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLnNlbmRWZXJpZmljYXRpb25FbWFpbCBOZXcgdXNlcnMgd2l0aCBhbiBlbWFpbCBhZGRyZXNzIHdpbGwgcmVjZWl2ZSBhbiBhZGRyZXNzIHZlcmlmaWNhdGlvbiBlbWFpbC5cbiAgICogQHBhcmFtIHtCb29sZWFufSBvcHRpb25zLmZvcmJpZENsaWVudEFjY291bnRDcmVhdGlvbiBDYWxscyB0byBbYGNyZWF0ZVVzZXJgXSgjYWNjb3VudHNfY3JlYXRldXNlcikgZnJvbSB0aGUgY2xpZW50IHdpbGwgYmUgcmVqZWN0ZWQuIEluIGFkZGl0aW9uLCBpZiB5b3UgYXJlIHVzaW5nIFthY2NvdW50cy11aV0oI2FjY291bnRzdWkpLCB0aGUgXCJDcmVhdGUgYWNjb3VudFwiIGxpbmsgd2lsbCBub3QgYmUgYXZhaWxhYmxlLlxuICAgKiBAcGFyYW0ge1N0cmluZyB8IEZ1bmN0aW9ufSBvcHRpb25zLnJlc3RyaWN0Q3JlYXRpb25CeUVtYWlsRG9tYWluIElmIHNldCB0byBhIHN0cmluZywgb25seSBhbGxvd3MgbmV3IHVzZXJzIGlmIHRoZSBkb21haW4gcGFydCBvZiB0aGVpciBlbWFpbCBhZGRyZXNzIG1hdGNoZXMgdGhlIHN0cmluZy4gSWYgc2V0IHRvIGEgZnVuY3Rpb24sIG9ubHkgYWxsb3dzIG5ldyB1c2VycyBpZiB0aGUgZnVuY3Rpb24gcmV0dXJucyB0cnVlLiAgVGhlIGZ1bmN0aW9uIGlzIHBhc3NlZCB0aGUgZnVsbCBlbWFpbCBhZGRyZXNzIG9mIHRoZSBwcm9wb3NlZCBuZXcgdXNlci4gIFdvcmtzIHdpdGggcGFzc3dvcmQtYmFzZWQgc2lnbi1pbiBhbmQgZXh0ZXJuYWwgc2VydmljZXMgdGhhdCBleHBvc2UgZW1haWwgYWRkcmVzc2VzIChHb29nbGUsIEZhY2Vib29rLCBHaXRIdWIpLiBBbGwgZXhpc3RpbmcgdXNlcnMgc3RpbGwgY2FuIGxvZyBpbiBhZnRlciBlbmFibGluZyB0aGlzIG9wdGlvbi4gRXhhbXBsZTogYEFjY291bnRzLmNvbmZpZyh7IHJlc3RyaWN0Q3JlYXRpb25CeUVtYWlsRG9tYWluOiAnc2Nob29sLmVkdScgfSlgLlxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5sb2dpbkV4cGlyYXRpb25JbkRheXMgVGhlIG51bWJlciBvZiBkYXlzIGZyb20gd2hlbiBhIHVzZXIgbG9ncyBpbiB1bnRpbCB0aGVpciB0b2tlbiBleHBpcmVzIGFuZCB0aGV5IGFyZSBsb2dnZWQgb3V0LiBEZWZhdWx0cyB0byA5MC4gU2V0IHRvIGBudWxsYCB0byBkaXNhYmxlIGxvZ2luIGV4cGlyYXRpb24uXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLmxvZ2luRXhwaXJhdGlvbiBUaGUgbnVtYmVyIG9mIG1pbGxpc2Vjb25kcyBmcm9tIHdoZW4gYSB1c2VyIGxvZ3MgaW4gdW50aWwgdGhlaXIgdG9rZW4gZXhwaXJlcyBhbmQgdGhleSBhcmUgbG9nZ2VkIG91dCwgZm9yIGEgbW9yZSBncmFudWxhciBjb250cm9sLiBJZiBgbG9naW5FeHBpcmF0aW9uSW5EYXlzYCBpcyBzZXQsIGl0IHRha2VzIHByZWNlZGVudC5cbiAgICogQHBhcmFtIHtTdHJpbmd9IG9wdGlvbnMub2F1dGhTZWNyZXRLZXkgV2hlbiB1c2luZyB0aGUgYG9hdXRoLWVuY3J5cHRpb25gIHBhY2thZ2UsIHRoZSAxNiBieXRlIGtleSB1c2luZyB0byBlbmNyeXB0IHNlbnNpdGl2ZSBhY2NvdW50IGNyZWRlbnRpYWxzIGluIHRoZSBkYXRhYmFzZSwgZW5jb2RlZCBpbiBiYXNlNjQuICBUaGlzIG9wdGlvbiBtYXkgb25seSBiZSBzcGVjaWZpZWQgb24gdGhlIHNlcnZlci4gIFNlZSBwYWNrYWdlcy9vYXV0aC1lbmNyeXB0aW9uL1JFQURNRS5tZCBmb3IgZGV0YWlscy5cbiAgICogQHBhcmFtIHtOdW1iZXJ9IG9wdGlvbnMucGFzc3dvcmRSZXNldFRva2VuRXhwaXJhdGlvbkluRGF5cyBUaGUgbnVtYmVyIG9mIGRheXMgZnJvbSB3aGVuIGEgbGluayB0byByZXNldCBwYXNzd29yZCBpcyBzZW50IHVudGlsIHRva2VuIGV4cGlyZXMgYW5kIHVzZXIgY2FuJ3QgcmVzZXQgcGFzc3dvcmQgd2l0aCB0aGUgbGluayBhbnltb3JlLiBEZWZhdWx0cyB0byAzLlxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5wYXNzd29yZFJlc2V0VG9rZW5FeHBpcmF0aW9uIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGZyb20gd2hlbiBhIGxpbmsgdG8gcmVzZXQgcGFzc3dvcmQgaXMgc2VudCB1bnRpbCB0b2tlbiBleHBpcmVzIGFuZCB1c2VyIGNhbid0IHJlc2V0IHBhc3N3b3JkIHdpdGggdGhlIGxpbmsgYW55bW9yZS4gSWYgYHBhc3N3b3JkUmVzZXRUb2tlbkV4cGlyYXRpb25JbkRheXNgIGlzIHNldCwgaXQgdGFrZXMgcHJlY2VkZW50LlxuICAgKiBAcGFyYW0ge051bWJlcn0gb3B0aW9ucy5wYXNzd29yZEVucm9sbFRva2VuRXhwaXJhdGlvbkluRGF5cyBUaGUgbnVtYmVyIG9mIGRheXMgZnJvbSB3aGVuIGEgbGluayB0byBzZXQgaW5pdGlhbCBwYXNzd29yZCBpcyBzZW50IHVudGlsIHRva2VuIGV4cGlyZXMgYW5kIHVzZXIgY2FuJ3Qgc2V0IHBhc3N3b3JkIHdpdGggdGhlIGxpbmsgYW55bW9yZS4gRGVmYXVsdHMgdG8gMzAuXG4gICAqIEBwYXJhbSB7TnVtYmVyfSBvcHRpb25zLnBhc3N3b3JkRW5yb2xsVG9rZW5FeHBpcmF0aW9uIFRoZSBudW1iZXIgb2YgbWlsbGlzZWNvbmRzIGZyb20gd2hlbiBhIGxpbmsgdG8gc2V0IGluaXRpYWwgcGFzc3dvcmQgaXMgc2VudCB1bnRpbCB0b2tlbiBleHBpcmVzIGFuZCB1c2VyIGNhbid0IHNldCBwYXNzd29yZCB3aXRoIHRoZSBsaW5rIGFueW1vcmUuIElmIGBwYXNzd29yZEVucm9sbFRva2VuRXhwaXJhdGlvbkluRGF5c2AgaXMgc2V0LCBpdCB0YWtlcyBwcmVjZWRlbnQuXG4gICAqIEBwYXJhbSB7Qm9vbGVhbn0gb3B0aW9ucy5hbWJpZ3VvdXNFcnJvck1lc3NhZ2VzIFJldHVybiBhbWJpZ3VvdXMgZXJyb3IgbWVzc2FnZXMgZnJvbSBsb2dpbiBmYWlsdXJlcyB0byBwcmV2ZW50IHVzZXIgZW51bWVyYXRpb24uIERlZmF1bHRzIHRvIGZhbHNlLlxuICAgKiBAcGFyYW0ge01vbmdvRmllbGRTcGVjaWZpZXJ9IG9wdGlvbnMuZGVmYXVsdEZpZWxkU2VsZWN0b3IgVG8gZXhjbHVkZSBieSBkZWZhdWx0IGxhcmdlIGN1c3RvbSBmaWVsZHMgZnJvbSBgTWV0ZW9yLnVzZXIoKWAgYW5kIGBNZXRlb3IuZmluZFVzZXJCeS4uLigpYCBmdW5jdGlvbnMgd2hlbiBjYWxsZWQgd2l0aG91dCBhIGZpZWxkIHNlbGVjdG9yLCBhbmQgYWxsIGBvbkxvZ2luYCwgYG9uTG9naW5GYWlsdXJlYCBhbmQgYG9uTG9nb3V0YCBjYWxsYmFja3MuICBFeGFtcGxlOiBgQWNjb3VudHMuY29uZmlnKHsgZGVmYXVsdEZpZWxkU2VsZWN0b3I6IHsgbXlCaWdBcnJheTogMCB9fSlgLlxuICAgKi9cbiAgY29uZmlnKG9wdGlvbnMpIHtcbiAgICAvLyBXZSBkb24ndCB3YW50IHVzZXJzIHRvIGFjY2lkZW50YWxseSBvbmx5IGNhbGwgQWNjb3VudHMuY29uZmlnIG9uIHRoZVxuICAgIC8vIGNsaWVudCwgd2hlcmUgc29tZSBvZiB0aGUgb3B0aW9ucyB3aWxsIGhhdmUgcGFydGlhbCBlZmZlY3RzIChlZyByZW1vdmluZ1xuICAgIC8vIHRoZSBcImNyZWF0ZSBhY2NvdW50XCIgYnV0dG9uIGZyb20gYWNjb3VudHMtdWkgaWYgZm9yYmlkQ2xpZW50QWNjb3VudENyZWF0aW9uXG4gICAgLy8gaXMgc2V0LCBvciByZWRpcmVjdGluZyBHb29nbGUgbG9naW4gdG8gYSBzcGVjaWZpYy1kb21haW4gcGFnZSkgd2l0aG91dFxuICAgIC8vIGhhdmluZyB0aGVpciBmdWxsIGVmZmVjdHMuXG4gICAgaWYgKE1ldGVvci5pc1NlcnZlcikge1xuICAgICAgX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5hY2NvdW50c0NvbmZpZ0NhbGxlZCA9IHRydWU7XG4gICAgfSBlbHNlIGlmICghX19tZXRlb3JfcnVudGltZV9jb25maWdfXy5hY2NvdW50c0NvbmZpZ0NhbGxlZCkge1xuICAgICAgLy8gWFhYIHdvdWxkIGJlIG5pY2UgdG8gXCJjcmFzaFwiIHRoZSBjbGllbnQgYW5kIHJlcGxhY2UgdGhlIFVJIHdpdGggYW4gZXJyb3JcbiAgICAgIC8vIG1lc3NhZ2UsIGJ1dCB0aGVyZSdzIG5vIHRyaXZpYWwgd2F5IHRvIGRvIHRoaXMuXG4gICAgICBNZXRlb3IuX2RlYnVnKFwiQWNjb3VudHMuY29uZmlnIHdhcyBjYWxsZWQgb24gdGhlIGNsaWVudCBidXQgbm90IG9uIHRoZSBcIiArXG4gICAgICAgICAgICAgICAgICAgIFwic2VydmVyOyBzb21lIGNvbmZpZ3VyYXRpb24gb3B0aW9ucyBtYXkgbm90IHRha2UgZWZmZWN0LlwiKTtcbiAgICB9XG5cbiAgICAvLyBXZSBuZWVkIHRvIHZhbGlkYXRlIHRoZSBvYXV0aFNlY3JldEtleSBvcHRpb24gYXQgdGhlIHRpbWVcbiAgICAvLyBBY2NvdW50cy5jb25maWcgaXMgY2FsbGVkLiBXZSBhbHNvIGRlbGliZXJhdGVseSBkb24ndCBzdG9yZSB0aGVcbiAgICAvLyBvYXV0aFNlY3JldEtleSBpbiBBY2NvdW50cy5fb3B0aW9ucy5cbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9wdGlvbnMsICdvYXV0aFNlY3JldEtleScpKSB7XG4gICAgICBpZiAoTWV0ZW9yLmlzQ2xpZW50KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoZSBvYXV0aFNlY3JldEtleSBvcHRpb24gbWF5IG9ubHkgYmUgc3BlY2lmaWVkIG9uIHRoZSBzZXJ2ZXJcIik7XG4gICAgICB9XG4gICAgICBpZiAoISBQYWNrYWdlW1wib2F1dGgtZW5jcnlwdGlvblwiXSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGUgb2F1dGgtZW5jcnlwdGlvbiBwYWNrYWdlIG11c3QgYmUgbG9hZGVkIHRvIHNldCBvYXV0aFNlY3JldEtleVwiKTtcbiAgICAgIH1cbiAgICAgIFBhY2thZ2VbXCJvYXV0aC1lbmNyeXB0aW9uXCJdLk9BdXRoRW5jcnlwdGlvbi5sb2FkS2V5KG9wdGlvbnMub2F1dGhTZWNyZXRLZXkpO1xuICAgICAgb3B0aW9ucyA9IHsgLi4ub3B0aW9ucyB9O1xuICAgICAgZGVsZXRlIG9wdGlvbnMub2F1dGhTZWNyZXRLZXk7XG4gICAgfVxuXG4gICAgLy8gdmFsaWRhdGUgb3B0aW9uIGtleXNcbiAgICBjb25zdCBWQUxJRF9LRVlTID0gW1wic2VuZFZlcmlmaWNhdGlvbkVtYWlsXCIsIFwiZm9yYmlkQ2xpZW50QWNjb3VudENyZWF0aW9uXCIsIFwicGFzc3dvcmRFbnJvbGxUb2tlbkV4cGlyYXRpb25cIixcbiAgICAgICAgICAgICAgICAgICAgICBcInBhc3N3b3JkRW5yb2xsVG9rZW5FeHBpcmF0aW9uSW5EYXlzXCIsIFwicmVzdHJpY3RDcmVhdGlvbkJ5RW1haWxEb21haW5cIiwgXCJsb2dpbkV4cGlyYXRpb25JbkRheXNcIixcbiAgICAgICAgICAgICAgICAgICAgICBcImxvZ2luRXhwaXJhdGlvblwiLCBcInBhc3N3b3JkUmVzZXRUb2tlbkV4cGlyYXRpb25JbkRheXNcIiwgXCJwYXNzd29yZFJlc2V0VG9rZW5FeHBpcmF0aW9uXCIsXG4gICAgICAgICAgICAgICAgICAgICAgXCJhbWJpZ3VvdXNFcnJvck1lc3NhZ2VzXCIsIFwiYmNyeXB0Um91bmRzXCIsIFwiZGVmYXVsdEZpZWxkU2VsZWN0b3JcIl07XG5cbiAgICBPYmplY3Qua2V5cyhvcHRpb25zKS5mb3JFYWNoKGtleSA9PiB7XG4gICAgICBpZiAoIVZBTElEX0tFWVMuaW5jbHVkZXMoa2V5KSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEFjY291bnRzLmNvbmZpZzogSW52YWxpZCBrZXk6ICR7a2V5fWApO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gc2V0IHZhbHVlcyBpbiBBY2NvdW50cy5fb3B0aW9uc1xuICAgIFZBTElEX0tFWVMuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgaWYgKGtleSBpbiBvcHRpb25zKSB7XG4gICAgICAgIGlmIChrZXkgaW4gdGhpcy5fb3B0aW9ucykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2FuJ3Qgc2V0IFxcYCR7a2V5fVxcYCBtb3JlIHRoYW4gb25jZWApO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX29wdGlvbnNba2V5XSA9IG9wdGlvbnNba2V5XTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZWdpc3RlciBhIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCBhZnRlciBhIGxvZ2luIGF0dGVtcHQgc3VjY2VlZHMuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBjYWxsYmFjayB0byBiZSBjYWxsZWQgd2hlbiBsb2dpbiBpcyBzdWNjZXNzZnVsLlxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIFRoZSBjYWxsYmFjayByZWNlaXZlcyBhIHNpbmdsZSBvYmplY3QgdGhhdFxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIGhvbGRzIGxvZ2luIGRldGFpbHMuIFRoaXMgb2JqZWN0IGNvbnRhaW5zIHRoZSBsb2dpblxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCB0eXBlIChwYXNzd29yZCwgcmVzdW1lLCBldGMuKSBvbiBib3RoIHRoZVxuICAgKiAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudCBhbmQgc2VydmVyLiBgb25Mb2dpbmAgY2FsbGJhY2tzIHJlZ2lzdGVyZWRcbiAgICogICAgICAgICAgICAgICAgICAgICAgICBvbiB0aGUgc2VydmVyIGFsc28gcmVjZWl2ZSBleHRyYSBkYXRhLCBzdWNoXG4gICAqICAgICAgICAgICAgICAgICAgICAgICAgYXMgdXNlciBkZXRhaWxzLCBjb25uZWN0aW9uIGluZm9ybWF0aW9uLCBldGMuXG4gICAqL1xuICBvbkxvZ2luKGZ1bmMpIHtcbiAgICBsZXQgcmV0ID0gdGhpcy5fb25Mb2dpbkhvb2sucmVnaXN0ZXIoZnVuYyk7XG4gICAgLy8gY2FsbCB0aGUganVzdCByZWdpc3RlcmVkIGNhbGxiYWNrIGlmIGFscmVhZHkgbG9nZ2VkIGluXG4gICAgdGhpcy5fc3RhcnR1cENhbGxiYWNrKHJldC5jYWxsYmFjayk7XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZWdpc3RlciBhIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCBhZnRlciBhIGxvZ2luIGF0dGVtcHQgZmFpbHMuXG4gICAqIEBsb2N1cyBBbnl3aGVyZVxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIFRoZSBjYWxsYmFjayB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGxvZ2luIGhhcyBmYWlsZWQuXG4gICAqL1xuICBvbkxvZ2luRmFpbHVyZShmdW5jKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uTG9naW5GYWlsdXJlSG9vay5yZWdpc3RlcihmdW5jKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAc3VtbWFyeSBSZWdpc3RlciBhIGNhbGxiYWNrIHRvIGJlIGNhbGxlZCBhZnRlciBhIGxvZ291dCBhdHRlbXB0IHN1Y2NlZWRzLlxuICAgKiBAbG9jdXMgQW55d2hlcmVcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgY2FsbGJhY2sgdG8gYmUgY2FsbGVkIHdoZW4gbG9nb3V0IGlzIHN1Y2Nlc3NmdWwuXG4gICAqL1xuICBvbkxvZ291dChmdW5jKSB7XG4gICAgcmV0dXJuIHRoaXMuX29uTG9nb3V0SG9vay5yZWdpc3RlcihmdW5jKTtcbiAgfVxuXG4gIF9pbml0Q29ubmVjdGlvbihvcHRpb25zKSB7XG4gICAgaWYgKCEgTWV0ZW9yLmlzQ2xpZW50KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVGhlIGNvbm5lY3Rpb24gdXNlZCBieSB0aGUgQWNjb3VudHMgc3lzdGVtLiBUaGlzIGlzIHRoZSBjb25uZWN0aW9uXG4gICAgLy8gdGhhdCB3aWxsIGdldCBsb2dnZWQgaW4gYnkgTWV0ZW9yLmxvZ2luKCksIGFuZCB0aGlzIGlzIHRoZVxuICAgIC8vIGNvbm5lY3Rpb24gd2hvc2UgbG9naW4gc3RhdGUgd2lsbCBiZSByZWZsZWN0ZWQgYnkgTWV0ZW9yLnVzZXJJZCgpLlxuICAgIC8vXG4gICAgLy8gSXQgd291bGQgYmUgbXVjaCBwcmVmZXJhYmxlIGZvciB0aGlzIHRvIGJlIGluIGFjY291bnRzX2NsaWVudC5qcyxcbiAgICAvLyBidXQgaXQgaGFzIHRvIGJlIGhlcmUgYmVjYXVzZSBpdCdzIG5lZWRlZCB0byBjcmVhdGUgdGhlXG4gICAgLy8gTWV0ZW9yLnVzZXJzIGNvbGxlY3Rpb24uXG4gICAgaWYgKG9wdGlvbnMuY29ubmVjdGlvbikge1xuICAgICAgdGhpcy5jb25uZWN0aW9uID0gb3B0aW9ucy5jb25uZWN0aW9uO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5kZHBVcmwpIHtcbiAgICAgIHRoaXMuY29ubmVjdGlvbiA9IEREUC5jb25uZWN0KG9wdGlvbnMuZGRwVXJsKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgICAgICAgICAgICBfX21ldGVvcl9ydW50aW1lX2NvbmZpZ19fLkFDQ09VTlRTX0NPTk5FQ1RJT05fVVJMKSB7XG4gICAgICAvLyBUZW1wb3JhcnksIGludGVybmFsIGhvb2sgdG8gYWxsb3cgdGhlIHNlcnZlciB0byBwb2ludCB0aGUgY2xpZW50XG4gICAgICAvLyB0byBhIGRpZmZlcmVudCBhdXRoZW50aWNhdGlvbiBzZXJ2ZXIuIFRoaXMgaXMgZm9yIGEgdmVyeVxuICAgICAgLy8gcGFydGljdWxhciB1c2UgY2FzZSB0aGF0IGNvbWVzIHVwIHdoZW4gaW1wbGVtZW50aW5nIGEgb2F1dGhcbiAgICAgIC8vIHNlcnZlci4gVW5zdXBwb3J0ZWQgYW5kIG1heSBnbyBhd2F5IGF0IGFueSBwb2ludCBpbiB0aW1lLlxuICAgICAgLy9cbiAgICAgIC8vIFdlIHdpbGwgZXZlbnR1YWxseSBwcm92aWRlIGEgZ2VuZXJhbCB3YXkgdG8gdXNlIGFjY291bnQtYmFzZVxuICAgICAgLy8gYWdhaW5zdCBhbnkgRERQIGNvbm5lY3Rpb24sIG5vdCBqdXN0IG9uZSBzcGVjaWFsIG9uZS5cbiAgICAgIHRoaXMuY29ubmVjdGlvbiA9XG4gICAgICAgIEREUC5jb25uZWN0KF9fbWV0ZW9yX3J1bnRpbWVfY29uZmlnX18uQUNDT1VOVFNfQ09OTkVDVElPTl9VUkwpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmNvbm5lY3Rpb24gPSBNZXRlb3IuY29ubmVjdGlvbjtcbiAgICB9XG4gIH1cblxuICBfZ2V0VG9rZW5MaWZldGltZU1zKCkge1xuICAgIC8vIFdoZW4gbG9naW5FeHBpcmF0aW9uSW5EYXlzIGlzIHNldCB0byBudWxsLCB3ZSdsbCB1c2UgYSByZWFsbHkgaGlnaFxuICAgIC8vIG51bWJlciBvZiBkYXlzIChMT0dJTl9VTkVYUElSQUJMRV9UT0tFTl9EQVlTKSB0byBzaW11bGF0ZSBhblxuICAgIC8vIHVuZXhwaXJpbmcgdG9rZW4uXG4gICAgY29uc3QgbG9naW5FeHBpcmF0aW9uSW5EYXlzID1cbiAgICAgICh0aGlzLl9vcHRpb25zLmxvZ2luRXhwaXJhdGlvbkluRGF5cyA9PT0gbnVsbClcbiAgICAgICAgPyBMT0dJTl9VTkVYUElSSU5HX1RPS0VOX0RBWVNcbiAgICAgICAgOiB0aGlzLl9vcHRpb25zLmxvZ2luRXhwaXJhdGlvbkluRGF5cztcbiAgICByZXR1cm4gdGhpcy5fb3B0aW9ucy5sb2dpbkV4cGlyYXRpb24gfHwgKGxvZ2luRXhwaXJhdGlvbkluRGF5c1xuICAgICAgICB8fCBERUZBVUxUX0xPR0lOX0VYUElSQVRJT05fREFZUykgKiA4NjQwMDAwMDtcbiAgfVxuXG4gIF9nZXRQYXNzd29yZFJlc2V0VG9rZW5MaWZldGltZU1zKCkge1xuICAgIHJldHVybiB0aGlzLl9vcHRpb25zLnBhc3N3b3JkUmVzZXRUb2tlbkV4cGlyYXRpb24gfHwgKHRoaXMuX29wdGlvbnMucGFzc3dvcmRSZXNldFRva2VuRXhwaXJhdGlvbkluRGF5cyB8fFxuICAgICAgICAgICAgREVGQVVMVF9QQVNTV09SRF9SRVNFVF9UT0tFTl9FWFBJUkFUSU9OX0RBWVMpICogODY0MDAwMDA7XG4gIH1cblxuICBfZ2V0UGFzc3dvcmRFbnJvbGxUb2tlbkxpZmV0aW1lTXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuX29wdGlvbnMucGFzc3dvcmRFbnJvbGxUb2tlbkV4cGlyYXRpb24gfHwgKHRoaXMuX29wdGlvbnMucGFzc3dvcmRFbnJvbGxUb2tlbkV4cGlyYXRpb25JbkRheXMgfHxcbiAgICAgICAgREVGQVVMVF9QQVNTV09SRF9FTlJPTExfVE9LRU5fRVhQSVJBVElPTl9EQVlTKSAqIDg2NDAwMDAwO1xuICB9XG5cbiAgX3Rva2VuRXhwaXJhdGlvbih3aGVuKSB7XG4gICAgLy8gV2UgcGFzcyB3aGVuIHRocm91Z2ggdGhlIERhdGUgY29uc3RydWN0b3IgZm9yIGJhY2t3YXJkcyBjb21wYXRpYmlsaXR5O1xuICAgIC8vIGB3aGVuYCB1c2VkIHRvIGJlIGEgbnVtYmVyLlxuICAgIHJldHVybiBuZXcgRGF0ZSgobmV3IERhdGUod2hlbikpLmdldFRpbWUoKSArIHRoaXMuX2dldFRva2VuTGlmZXRpbWVNcygpKTtcbiAgfVxuXG4gIF90b2tlbkV4cGlyZXNTb29uKHdoZW4pIHtcbiAgICBsZXQgbWluTGlmZXRpbWVNcyA9IC4xICogdGhpcy5fZ2V0VG9rZW5MaWZldGltZU1zKCk7XG4gICAgY29uc3QgbWluTGlmZXRpbWVDYXBNcyA9IE1JTl9UT0tFTl9MSUZFVElNRV9DQVBfU0VDUyAqIDEwMDA7XG4gICAgaWYgKG1pbkxpZmV0aW1lTXMgPiBtaW5MaWZldGltZUNhcE1zKSB7XG4gICAgICBtaW5MaWZldGltZU1zID0gbWluTGlmZXRpbWVDYXBNcztcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBEYXRlKCkgPiAobmV3IERhdGUod2hlbikgLSBtaW5MaWZldGltZU1zKTtcbiAgfVxuXG4gIC8vIE5vLW9wIG9uIHRoZSBzZXJ2ZXIsIG92ZXJyaWRkZW4gb24gdGhlIGNsaWVudC5cbiAgX3N0YXJ0dXBDYWxsYmFjayhjYWxsYmFjaykge31cbn1cblxuLy8gTm90ZSB0aGF0IEFjY291bnRzIGlzIGRlZmluZWQgc2VwYXJhdGVseSBpbiBhY2NvdW50c19jbGllbnQuanMgYW5kXG4vLyBhY2NvdW50c19zZXJ2ZXIuanMuXG5cbi8qKlxuICogQHN1bW1hcnkgR2V0IHRoZSBjdXJyZW50IHVzZXIgaWQsIG9yIGBudWxsYCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbi4gQSByZWFjdGl2ZSBkYXRhIHNvdXJjZS5cbiAqIEBsb2N1cyBBbnl3aGVyZSBidXQgcHVibGlzaCBmdW5jdGlvbnNcbiAqIEBpbXBvcnRGcm9tUGFja2FnZSBtZXRlb3JcbiAqL1xuTWV0ZW9yLnVzZXJJZCA9ICgpID0+IEFjY291bnRzLnVzZXJJZCgpO1xuXG4vKipcbiAqIEBzdW1tYXJ5IEdldCB0aGUgY3VycmVudCB1c2VyIHJlY29yZCwgb3IgYG51bGxgIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLiBBIHJlYWN0aXZlIGRhdGEgc291cmNlLlxuICogQGxvY3VzIEFueXdoZXJlIGJ1dCBwdWJsaXNoIGZ1bmN0aW9uc1xuICogQGltcG9ydEZyb21QYWNrYWdlIG1ldGVvclxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBvcHRpb25zLmZpZWxkcyBEaWN0aW9uYXJ5IG9mIGZpZWxkcyB0byByZXR1cm4gb3IgZXhjbHVkZS5cbiAqL1xuTWV0ZW9yLnVzZXIgPSAob3B0aW9ucykgPT4gQWNjb3VudHMudXNlcihvcHRpb25zKTtcblxuLy8gaG93IGxvbmcgKGluIGRheXMpIHVudGlsIGEgbG9naW4gdG9rZW4gZXhwaXJlc1xuY29uc3QgREVGQVVMVF9MT0dJTl9FWFBJUkFUSU9OX0RBWVMgPSA5MDtcbi8vIGhvdyBsb25nIChpbiBkYXlzKSB1bnRpbCByZXNldCBwYXNzd29yZCB0b2tlbiBleHBpcmVzXG5jb25zdCBERUZBVUxUX1BBU1NXT1JEX1JFU0VUX1RPS0VOX0VYUElSQVRJT05fREFZUyA9IDM7XG4vLyBob3cgbG9uZyAoaW4gZGF5cykgdW50aWwgZW5yb2wgcGFzc3dvcmQgdG9rZW4gZXhwaXJlc1xuY29uc3QgREVGQVVMVF9QQVNTV09SRF9FTlJPTExfVE9LRU5fRVhQSVJBVElPTl9EQVlTID0gMzA7XG4vLyBDbGllbnRzIGRvbid0IHRyeSB0byBhdXRvLWxvZ2luIHdpdGggYSB0b2tlbiB0aGF0IGlzIGdvaW5nIHRvIGV4cGlyZSB3aXRoaW5cbi8vIC4xICogREVGQVVMVF9MT0dJTl9FWFBJUkFUSU9OX0RBWVMsIGNhcHBlZCBhdCBNSU5fVE9LRU5fTElGRVRJTUVfQ0FQX1NFQ1MuXG4vLyBUcmllcyB0byBhdm9pZCBhYnJ1cHQgZGlzY29ubmVjdHMgZnJvbSBleHBpcmluZyB0b2tlbnMuXG5jb25zdCBNSU5fVE9LRU5fTElGRVRJTUVfQ0FQX1NFQ1MgPSAzNjAwOyAvLyBvbmUgaG91clxuLy8gaG93IG9mdGVuIChpbiBtaWxsaXNlY29uZHMpIHdlIGNoZWNrIGZvciBleHBpcmVkIHRva2Vuc1xuZXhwb3J0IGNvbnN0IEVYUElSRV9UT0tFTlNfSU5URVJWQUxfTVMgPSA2MDAgKiAxMDAwOyAvLyAxMCBtaW51dGVzXG4vLyBob3cgbG9uZyB3ZSB3YWl0IGJlZm9yZSBsb2dnaW5nIG91dCBjbGllbnRzIHdoZW4gTWV0ZW9yLmxvZ291dE90aGVyQ2xpZW50cyBpc1xuLy8gY2FsbGVkXG5leHBvcnQgY29uc3QgQ09OTkVDVElPTl9DTE9TRV9ERUxBWV9NUyA9IDEwICogMTAwMDtcbi8vIEEgbGFyZ2UgbnVtYmVyIG9mIGV4cGlyYXRpb24gZGF5cyAoYXBwcm94aW1hdGVseSAxMDAgeWVhcnMgd29ydGgpIHRoYXQgaXNcbi8vIHVzZWQgd2hlbiBjcmVhdGluZyB1bmV4cGlyaW5nIHRva2Vucy5cbmNvbnN0IExPR0lOX1VORVhQSVJJTkdfVE9LRU5fREFZUyA9IDM2NSAqIDEwMDtcbiIsImltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbmltcG9ydCB7XG4gIEFjY291bnRzQ29tbW9uLFxuICBFWFBJUkVfVE9LRU5TX0lOVEVSVkFMX01TLFxuICBDT05ORUNUSU9OX0NMT1NFX0RFTEFZX01TXG59IGZyb20gJy4vYWNjb3VudHNfY29tbW9uLmpzJztcbmltcG9ydCB7IFVSTCB9IGZyb20gJ21ldGVvci91cmwnO1xuXG5jb25zdCBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vKipcbiAqIEBzdW1tYXJ5IENvbnN0cnVjdG9yIGZvciB0aGUgYEFjY291bnRzYCBuYW1lc3BhY2Ugb24gdGhlIHNlcnZlci5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBjbGFzcyBBY2NvdW50c1NlcnZlclxuICogQGV4dGVuZHMgQWNjb3VudHNDb21tb25cbiAqIEBpbnN0YW5jZW5hbWUgYWNjb3VudHNTZXJ2ZXJcbiAqIEBwYXJhbSB7T2JqZWN0fSBzZXJ2ZXIgQSBzZXJ2ZXIgb2JqZWN0IHN1Y2ggYXMgYE1ldGVvci5zZXJ2ZXJgLlxuICovXG5leHBvcnQgY2xhc3MgQWNjb3VudHNTZXJ2ZXIgZXh0ZW5kcyBBY2NvdW50c0NvbW1vbiB7XG4gIC8vIE5vdGUgdGhhdCB0aGlzIGNvbnN0cnVjdG9yIGlzIGxlc3MgbGlrZWx5IHRvIGJlIGluc3RhbnRpYXRlZCBtdWx0aXBsZVxuICAvLyB0aW1lcyB0aGFuIHRoZSBgQWNjb3VudHNDbGllbnRgIGNvbnN0cnVjdG9yLCBiZWNhdXNlIGEgc2luZ2xlIHNlcnZlclxuICAvLyBjYW4gcHJvdmlkZSBvbmx5IG9uZSBzZXQgb2YgbWV0aG9kcy5cbiAgY29uc3RydWN0b3Ioc2VydmVyKSB7XG4gICAgc3VwZXIoKTtcblxuICAgIHRoaXMuX3NlcnZlciA9IHNlcnZlciB8fCBNZXRlb3Iuc2VydmVyO1xuICAgIC8vIFNldCB1cCB0aGUgc2VydmVyJ3MgbWV0aG9kcywgYXMgaWYgYnkgY2FsbGluZyBNZXRlb3IubWV0aG9kcy5cbiAgICB0aGlzLl9pbml0U2VydmVyTWV0aG9kcygpO1xuXG4gICAgdGhpcy5faW5pdEFjY291bnREYXRhSG9va3MoKTtcblxuICAgIC8vIElmIGF1dG9wdWJsaXNoIGlzIG9uLCBwdWJsaXNoIHRoZXNlIHVzZXIgZmllbGRzLiBMb2dpbiBzZXJ2aWNlXG4gICAgLy8gcGFja2FnZXMgKGVnIGFjY291bnRzLWdvb2dsZSkgYWRkIHRvIHRoZXNlIGJ5IGNhbGxpbmdcbiAgICAvLyBhZGRBdXRvcHVibGlzaEZpZWxkcy4gIE5vdGFibHksIHRoaXMgaXNuJ3QgaW1wbGVtZW50ZWQgd2l0aCBtdWx0aXBsZVxuICAgIC8vIHB1Ymxpc2hlcyBzaW5jZSBERFAgb25seSBtZXJnZXMgb25seSBhY3Jvc3MgdG9wLWxldmVsIGZpZWxkcywgbm90XG4gICAgLy8gc3ViZmllbGRzIChzdWNoIGFzICdzZXJ2aWNlcy5mYWNlYm9vay5hY2Nlc3NUb2tlbicpXG4gICAgdGhpcy5fYXV0b3B1Ymxpc2hGaWVsZHMgPSB7XG4gICAgICBsb2dnZWRJblVzZXI6IFsncHJvZmlsZScsICd1c2VybmFtZScsICdlbWFpbHMnXSxcbiAgICAgIG90aGVyVXNlcnM6IFsncHJvZmlsZScsICd1c2VybmFtZSddXG4gICAgfTtcblxuICAgIC8vIHVzZSBvYmplY3QgdG8ga2VlcCB0aGUgcmVmZXJlbmNlIHdoZW4gdXNlZCBpbiBmdW5jdGlvbnNcbiAgICAvLyB3aGVyZSBfZGVmYXVsdFB1Ymxpc2hGaWVsZHMgaXMgZGVzdHJ1Y3R1cmVkIGludG8gbGV4aWNhbCBzY29wZVxuICAgIC8vIGZvciBwdWJsaXNoIGNhbGxiYWNrcyB0aGF0IG5lZWQgYHRoaXNgXG4gICAgdGhpcy5fZGVmYXVsdFB1Ymxpc2hGaWVsZHMgPSB7XG4gICAgICBwcm9qZWN0aW9uOiB7XG4gICAgICAgIHByb2ZpbGU6IDEsXG4gICAgICAgIHVzZXJuYW1lOiAxLFxuICAgICAgICBlbWFpbHM6IDEsXG4gICAgICB9XG4gICAgfTtcblxuICAgIHRoaXMuX2luaXRTZXJ2ZXJQdWJsaWNhdGlvbnMoKTtcblxuICAgIC8vIGNvbm5lY3Rpb25JZCAtPiB7Y29ubmVjdGlvbiwgbG9naW5Ub2tlbn1cbiAgICB0aGlzLl9hY2NvdW50RGF0YSA9IHt9O1xuXG4gICAgLy8gY29ubmVjdGlvbiBpZCAtPiBvYnNlcnZlIGhhbmRsZSBmb3IgdGhlIGxvZ2luIHRva2VuIHRoYXQgdGhpcyBjb25uZWN0aW9uIGlzXG4gICAgLy8gY3VycmVudGx5IGFzc29jaWF0ZWQgd2l0aCwgb3IgYSBudW1iZXIuIFRoZSBudW1iZXIgaW5kaWNhdGVzIHRoYXQgd2UgYXJlIGluXG4gICAgLy8gdGhlIHByb2Nlc3Mgb2Ygc2V0dGluZyB1cCB0aGUgb2JzZXJ2ZSAodXNpbmcgYSBudW1iZXIgaW5zdGVhZCBvZiBhIHNpbmdsZVxuICAgIC8vIHNlbnRpbmVsIGFsbG93cyBtdWx0aXBsZSBhdHRlbXB0cyB0byBzZXQgdXAgdGhlIG9ic2VydmUgdG8gaWRlbnRpZnkgd2hpY2hcbiAgICAvLyBvbmUgd2FzIHRoZWlycykuXG4gICAgdGhpcy5fdXNlck9ic2VydmVzRm9yQ29ubmVjdGlvbnMgPSB7fTtcbiAgICB0aGlzLl9uZXh0VXNlck9ic2VydmVOdW1iZXIgPSAxOyAgLy8gZm9yIHRoZSBudW1iZXIgZGVzY3JpYmVkIGFib3ZlLlxuXG4gICAgLy8gbGlzdCBvZiBhbGwgcmVnaXN0ZXJlZCBoYW5kbGVycy5cbiAgICB0aGlzLl9sb2dpbkhhbmRsZXJzID0gW107XG5cbiAgICBzZXR1cFVzZXJzQ29sbGVjdGlvbih0aGlzLnVzZXJzKTtcbiAgICBzZXR1cERlZmF1bHRMb2dpbkhhbmRsZXJzKHRoaXMpO1xuICAgIHNldEV4cGlyZVRva2Vuc0ludGVydmFsKHRoaXMpO1xuXG4gICAgdGhpcy5fdmFsaWRhdGVMb2dpbkhvb2sgPSBuZXcgSG9vayh7IGJpbmRFbnZpcm9ubWVudDogZmFsc2UgfSk7XG4gICAgdGhpcy5fdmFsaWRhdGVOZXdVc2VySG9va3MgPSBbXG4gICAgICBkZWZhdWx0VmFsaWRhdGVOZXdVc2VySG9vay5iaW5kKHRoaXMpXG4gICAgXTtcblxuICAgIHRoaXMuX2RlbGV0ZVNhdmVkVG9rZW5zRm9yQWxsVXNlcnNPblN0YXJ0dXAoKTtcblxuICAgIHRoaXMuX3NraXBDYXNlSW5zZW5zaXRpdmVDaGVja3NGb3JUZXN0ID0ge307XG5cbiAgICB0aGlzLnVybHMgPSB7XG4gICAgICByZXNldFBhc3N3b3JkOiAodG9rZW4sIGV4dHJhUGFyYW1zKSA9PiB0aGlzLmJ1aWxkRW1haWxVcmwoYCMvcmVzZXQtcGFzc3dvcmQvJHt0b2tlbn1gLCBleHRyYVBhcmFtcyksXG4gICAgICB2ZXJpZnlFbWFpbDogKHRva2VuLCBleHRyYVBhcmFtcykgPT4gdGhpcy5idWlsZEVtYWlsVXJsKGAjL3ZlcmlmeS1lbWFpbC8ke3Rva2VufWAsIGV4dHJhUGFyYW1zKSxcbiAgICAgIGVucm9sbEFjY291bnQ6ICh0b2tlbiwgZXh0cmFQYXJhbXMpID0+IHRoaXMuYnVpbGRFbWFpbFVybChgIy9lbnJvbGwtYWNjb3VudC8ke3Rva2VufWAsIGV4dHJhUGFyYW1zKSxcbiAgICB9O1xuXG4gICAgdGhpcy5hZGREZWZhdWx0UmF0ZUxpbWl0KCk7XG5cbiAgICB0aGlzLmJ1aWxkRW1haWxVcmwgPSAocGF0aCwgZXh0cmFQYXJhbXMgPSB7fSkgPT4ge1xuICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChNZXRlb3IuYWJzb2x1dGVVcmwocGF0aCkpO1xuICAgICAgY29uc3QgcGFyYW1zID0gT2JqZWN0LmVudHJpZXMoZXh0cmFQYXJhbXMpO1xuICAgICAgaWYgKHBhcmFtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIHBhcmFtZXRlcnMgdG8gdGhlIHVybFxuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBwYXJhbXMpIHtcbiAgICAgICAgICB1cmwuc2VhcmNoUGFyYW1zLmFwcGVuZChrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHVybC50b1N0cmluZygpO1xuICAgIH07XG4gIH1cblxuICAvLy9cbiAgLy8vIENVUlJFTlQgVVNFUlxuICAvLy9cblxuICAvLyBAb3ZlcnJpZGUgb2YgXCJhYnN0cmFjdFwiIG5vbi1pbXBsZW1lbnRhdGlvbiBpbiBhY2NvdW50c19jb21tb24uanNcbiAgdXNlcklkKCkge1xuICAgIC8vIFRoaXMgZnVuY3Rpb24gb25seSB3b3JrcyBpZiBjYWxsZWQgaW5zaWRlIGEgbWV0aG9kIG9yIGEgcHViaWNhdGlvbi5cbiAgICAvLyBVc2luZyBhbnkgb2YgdGhlIGluZm9tYXRpb24gZnJvbSBNZXRlb3IudXNlcigpIGluIGEgbWV0aG9kIG9yXG4gICAgLy8gcHVibGlzaCBmdW5jdGlvbiB3aWxsIGFsd2F5cyB1c2UgdGhlIHZhbHVlIGZyb20gd2hlbiB0aGUgZnVuY3Rpb24gZmlyc3RcbiAgICAvLyBydW5zLiBUaGlzIGlzIGxpa2VseSBub3Qgd2hhdCB0aGUgdXNlciBleHBlY3RzLiBUaGUgd2F5IHRvIG1ha2UgdGhpcyB3b3JrXG4gICAgLy8gaW4gYSBtZXRob2Qgb3IgcHVibGlzaCBmdW5jdGlvbiBpcyB0byBkbyBNZXRlb3IuZmluZCh0aGlzLnVzZXJJZCkub2JzZXJ2ZVxuICAgIC8vIGFuZCByZWNvbXB1dGUgd2hlbiB0aGUgdXNlciByZWNvcmQgY2hhbmdlcy5cbiAgICBjb25zdCBjdXJyZW50SW52b2NhdGlvbiA9IEREUC5fQ3VycmVudE1ldGhvZEludm9jYXRpb24uZ2V0KCkgfHwgRERQLl9DdXJyZW50UHVibGljYXRpb25JbnZvY2F0aW9uLmdldCgpO1xuICAgIGlmICghY3VycmVudEludm9jYXRpb24pXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNZXRlb3IudXNlcklkIGNhbiBvbmx5IGJlIGludm9rZWQgaW4gbWV0aG9kIGNhbGxzIG9yIHB1YmxpY2F0aW9ucy5cIik7XG4gICAgcmV0dXJuIGN1cnJlbnRJbnZvY2F0aW9uLnVzZXJJZDtcbiAgfVxuXG4gIC8vL1xuICAvLy8gTE9HSU4gSE9PS1NcbiAgLy8vXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFZhbGlkYXRlIGxvZ2luIGF0dGVtcHRzLlxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgQ2FsbGVkIHdoZW5ldmVyIGEgbG9naW4gaXMgYXR0ZW1wdGVkIChlaXRoZXIgc3VjY2Vzc2Z1bCBvciB1bnN1Y2Nlc3NmdWwpLiAgQSBsb2dpbiBjYW4gYmUgYWJvcnRlZCBieSByZXR1cm5pbmcgYSBmYWxzeSB2YWx1ZSBvciB0aHJvd2luZyBhbiBleGNlcHRpb24uXG4gICAqL1xuICB2YWxpZGF0ZUxvZ2luQXR0ZW1wdChmdW5jKSB7XG4gICAgLy8gRXhjZXB0aW9ucyBpbnNpZGUgdGhlIGhvb2sgY2FsbGJhY2sgYXJlIHBhc3NlZCB1cCB0byB1cy5cbiAgICByZXR1cm4gdGhpcy5fdmFsaWRhdGVMb2dpbkhvb2sucmVnaXN0ZXIoZnVuYyk7XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgU2V0IHJlc3RyaWN0aW9ucyBvbiBuZXcgdXNlciBjcmVhdGlvbi5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIENhbGxlZCB3aGVuZXZlciBhIG5ldyB1c2VyIGlzIGNyZWF0ZWQuIFRha2VzIHRoZSBuZXcgdXNlciBvYmplY3QsIGFuZCByZXR1cm5zIHRydWUgdG8gYWxsb3cgdGhlIGNyZWF0aW9uIG9yIGZhbHNlIHRvIGFib3J0LlxuICAgKi9cbiAgdmFsaWRhdGVOZXdVc2VyKGZ1bmMpIHtcbiAgICB0aGlzLl92YWxpZGF0ZU5ld1VzZXJIb29rcy5wdXNoKGZ1bmMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IFZhbGlkYXRlIGxvZ2luIGZyb20gZXh0ZXJuYWwgc2VydmljZVxuICAgKiBAbG9jdXMgU2VydmVyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgQ2FsbGVkIHdoZW5ldmVyIGxvZ2luL3VzZXIgY3JlYXRpb24gZnJvbSBleHRlcm5hbCBzZXJ2aWNlIGlzIGF0dGVtcHRlZC4gTG9naW4gb3IgdXNlciBjcmVhdGlvbiBiYXNlZCBvbiB0aGlzIGxvZ2luIGNhbiBiZSBhYm9ydGVkIGJ5IHBhc3NpbmcgYSBmYWxzeSB2YWx1ZSBvciB0aHJvd2luZyBhbiBleGNlcHRpb24uXG4gICAqL1xuICBiZWZvcmVFeHRlcm5hbExvZ2luKGZ1bmMpIHtcbiAgICBpZiAodGhpcy5fYmVmb3JlRXh0ZXJuYWxMb2dpbkhvb2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgYmVmb3JlRXh0ZXJuYWxMb2dpbiBvbmNlXCIpO1xuICAgIH1cblxuICAgIHRoaXMuX2JlZm9yZUV4dGVybmFsTG9naW5Ib29rID0gZnVuYztcbiAgfVxuXG4gIC8vL1xuICAvLy8gQ1JFQVRFIFVTRVIgSE9PS1NcbiAgLy8vXG5cbiAgLyoqXG4gICAqIEBzdW1tYXJ5IEN1c3RvbWl6ZSBuZXcgdXNlciBjcmVhdGlvbi5cbiAgICogQGxvY3VzIFNlcnZlclxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmdW5jIENhbGxlZCB3aGVuZXZlciBhIG5ldyB1c2VyIGlzIGNyZWF0ZWQuIFJldHVybiB0aGUgbmV3IHVzZXIgb2JqZWN0LCBvciB0aHJvdyBhbiBgRXJyb3JgIHRvIGFib3J0IHRoZSBjcmVhdGlvbi5cbiAgICovXG4gIG9uQ3JlYXRlVXNlcihmdW5jKSB7XG4gICAgaWYgKHRoaXMuX29uQ3JlYXRlVXNlckhvb2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgb25DcmVhdGVVc2VyIG9uY2VcIik7XG4gICAgfVxuXG4gICAgdGhpcy5fb25DcmVhdGVVc2VySG9vayA9IGZ1bmM7XG4gIH1cblxuICAvKipcbiAgICogQHN1bW1hcnkgQ3VzdG9taXplIG9hdXRoIHVzZXIgcHJvZmlsZSB1cGRhdGVzXG4gICAqIEBsb2N1cyBTZXJ2ZXJcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBDYWxsZWQgd2hlbmV2ZXIgYSB1c2VyIGlzIGxvZ2dlZCBpbiB2aWEgb2F1dGguIFJldHVybiB0aGUgcHJvZmlsZSBvYmplY3QgdG8gYmUgbWVyZ2VkLCBvciB0aHJvdyBhbiBgRXJyb3JgIHRvIGFib3J0IHRoZSBjcmVhdGlvbi5cbiAgICovXG4gIG9uRXh0ZXJuYWxMb2dpbihmdW5jKSB7XG4gICAgaWYgKHRoaXMuX29uRXh0ZXJuYWxMb2dpbkhvb2spIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbiBvbmx5IGNhbGwgb25FeHRlcm5hbExvZ2luIG9uY2VcIik7XG4gICAgfVxuXG4gICAgdGhpcy5fb25FeHRlcm5hbExvZ2luSG9vayA9IGZ1bmM7XG4gIH1cblxuICBfdmFsaWRhdGVMb2dpbihjb25uZWN0aW9uLCBhdHRlbXB0KSB7XG4gICAgdGhpcy5fdmFsaWRhdGVMb2dpbkhvb2suZWFjaChjYWxsYmFjayA9PiB7XG4gICAgICBsZXQgcmV0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0ID0gY2FsbGJhY2soY2xvbmVBdHRlbXB0V2l0aENvbm5lY3Rpb24oY29ubmVjdGlvbiwgYXR0ZW1wdCkpO1xuICAgICAgfVxuICAgICAgY2F0Y2ggKGUpIHtcbiAgICAgICAgYXR0ZW1wdC5hbGxvd2VkID0gZmFsc2U7XG4gICAgICAgIC8vIFhYWCB0aGlzIG1lYW5zIHRoZSBsYXN0IHRocm93biBlcnJvciBvdmVycmlkZXMgcHJldmlvdXMgZXJyb3JcbiAgICAgICAgLy8gbWVzc2FnZXMuIE1heWJlIHRoaXMgaXMgc3VycHJpc2luZyB0byB1c2VycyBhbmQgd2Ugc2hvdWxkIG1ha2VcbiAgICAgICAgLy8gb3ZlcnJpZGluZyBlcnJvcnMgbW9yZSBleHBsaWNpdC4gKHNlZVxuICAgICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vbWV0ZW9yL21ldGVvci9pc3N1ZXMvMTk2MClcbiAgICAgICAgYXR0ZW1wdC5lcnJvciA9IGU7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKCEgcmV0KSB7XG4gICAgICAgIGF0dGVtcHQuYWxsb3dlZCA9IGZhbHNlO1xuICAgICAgICAvLyBkb24ndCBvdmVycmlkZSBhIHNwZWNpZmljIGVycm9yIHByb3ZpZGVkIGJ5IGEgcHJldmlvdXNcbiAgICAgICAgLy8gdmFsaWRhdG9yIG9yIHRoZSBpbml0aWFsIGF0dGVtcHQgKGVnIFwiaW5jb3JyZWN0IHBhc3N3b3JkXCIpLlxuICAgICAgICBpZiAoIWF0dGVtcHQuZXJyb3IpXG4gICAgICAgICAgYXR0ZW1wdC5lcnJvciA9IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIkxvZ2luIGZvcmJpZGRlblwiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9O1xuXG4gIF9zdWNjZXNzZnVsTG9naW4oY29ubmVjdGlvbiwgYXR0ZW1wdCkge1xuICAgIHRoaXMuX29uTG9naW5Ib29rLmVhY2goY2FsbGJhY2sgPT4ge1xuICAgICAgY2FsbGJhY2soY2xvbmVBdHRlbXB0V2l0aENvbm5lY3Rpb24oY29ubmVjdGlvbiwgYXR0ZW1wdCkpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSk7XG4gIH07XG5cbiAgX2ZhaWxlZExvZ2luKGNvbm5lY3Rpb24sIGF0dGVtcHQpIHtcbiAgICB0aGlzLl9vbkxvZ2luRmFpbHVyZUhvb2suZWFjaChjYWxsYmFjayA9PiB7XG4gICAgICBjYWxsYmFjayhjbG9uZUF0dGVtcHRXaXRoQ29ubmVjdGlvbihjb25uZWN0aW9uLCBhdHRlbXB0KSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbiAgfTtcblxuICBfc3VjY2Vzc2Z1bExvZ291dChjb25uZWN0aW9uLCB1c2VySWQpIHtcbiAgICAvLyBkb24ndCBmZXRjaCB0aGUgdXNlciBvYmplY3QgdW5sZXNzIHRoZXJlIGFyZSBzb21lIGNhbGxiYWNrcyByZWdpc3RlcmVkXG4gICAgbGV0IHVzZXI7XG4gICAgdGhpcy5fb25Mb2dvdXRIb29rLmVhY2goY2FsbGJhY2sgPT4ge1xuICAgICAgaWYgKCF1c2VyICYmIHVzZXJJZCkgdXNlciA9IHRoaXMudXNlcnMuZmluZE9uZSh1c2VySWQsIHtmaWVsZHM6IHRoaXMuX29wdGlvbnMuZGVmYXVsdEZpZWxkU2VsZWN0b3J9KTtcbiAgICAgIGNhbGxiYWNrKHsgdXNlciwgY29ubmVjdGlvbiB9KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vL1xuICAvLy8gTE9HSU4gTUVUSE9EU1xuICAvLy9cblxuICAvLyBMb2dpbiBtZXRob2RzIHJldHVybiB0byB0aGUgY2xpZW50IGFuIG9iamVjdCBjb250YWluaW5nIHRoZXNlXG4gIC8vIGZpZWxkcyB3aGVuIHRoZSB1c2VyIHdhcyBsb2dnZWQgaW4gc3VjY2Vzc2Z1bGx5OlxuICAvL1xuICAvLyAgIGlkOiB1c2VySWRcbiAgLy8gICB0b2tlbjogKlxuICAvLyAgIHRva2VuRXhwaXJlczogKlxuICAvL1xuICAvLyB0b2tlbkV4cGlyZXMgaXMgb3B0aW9uYWwgYW5kIGludGVuZHMgdG8gcHJvdmlkZSBhIGhpbnQgdG8gdGhlXG4gIC8vIGNsaWVudCBhcyB0byB3aGVuIHRoZSB0b2tlbiB3aWxsIGV4cGlyZS4gSWYgbm90IHByb3ZpZGVkLCB0aGVcbiAgLy8gY2xpZW50IHdpbGwgY2FsbCBBY2NvdW50cy5fdG9rZW5FeHBpcmF0aW9uLCBwYXNzaW5nIGl0IHRoZSBkYXRlXG4gIC8vIHRoYXQgaXQgcmVjZWl2ZWQgdGhlIHRva2VuLlxuICAvL1xuICAvLyBUaGUgbG9naW4gbWV0aG9kIHdpbGwgdGhyb3cgYW4gZXJyb3IgYmFjayB0byB0aGUgY2xpZW50IGlmIHRoZSB1c2VyXG4gIC8vIGZhaWxlZCB0byBsb2cgaW4uXG4gIC8vXG4gIC8vXG4gIC8vIExvZ2luIGhhbmRsZXJzIGFuZCBzZXJ2aWNlIHNwZWNpZmljIGxvZ2luIG1ldGhvZHMgc3VjaCBhc1xuICAvLyBgY3JlYXRlVXNlcmAgaW50ZXJuYWxseSByZXR1cm4gYSBgcmVzdWx0YCBvYmplY3QgY29udGFpbmluZyB0aGVzZVxuICAvLyBmaWVsZHM6XG4gIC8vXG4gIC8vICAgdHlwZTpcbiAgLy8gICAgIG9wdGlvbmFsIHN0cmluZzsgdGhlIHNlcnZpY2UgbmFtZSwgb3ZlcnJpZGVzIHRoZSBoYW5kbGVyXG4gIC8vICAgICBkZWZhdWx0IGlmIHByZXNlbnQuXG4gIC8vXG4gIC8vICAgZXJyb3I6XG4gIC8vICAgICBleGNlcHRpb247IGlmIHRoZSB1c2VyIGlzIG5vdCBhbGxvd2VkIHRvIGxvZ2luLCB0aGUgcmVhc29uIHdoeS5cbiAgLy9cbiAgLy8gICB1c2VySWQ6XG4gIC8vICAgICBzdHJpbmc7IHRoZSB1c2VyIGlkIG9mIHRoZSB1c2VyIGF0dGVtcHRpbmcgdG8gbG9naW4gKGlmXG4gIC8vICAgICBrbm93biksIHJlcXVpcmVkIGZvciBhbiBhbGxvd2VkIGxvZ2luLlxuICAvL1xuICAvLyAgIG9wdGlvbnM6XG4gIC8vICAgICBvcHRpb25hbCBvYmplY3QgbWVyZ2VkIGludG8gdGhlIHJlc3VsdCByZXR1cm5lZCBieSB0aGUgbG9naW5cbiAgLy8gICAgIG1ldGhvZDsgdXNlZCBieSBIQU1LIGZyb20gU1JQLlxuICAvL1xuICAvLyAgIHN0YW1wZWRMb2dpblRva2VuOlxuICAvLyAgICAgb3B0aW9uYWwgb2JqZWN0IHdpdGggYHRva2VuYCBhbmQgYHdoZW5gIGluZGljYXRpbmcgdGhlIGxvZ2luXG4gIC8vICAgICB0b2tlbiBpcyBhbHJlYWR5IHByZXNlbnQgaW4gdGhlIGRhdGFiYXNlLCByZXR1cm5lZCBieSB0aGVcbiAgLy8gICAgIFwicmVzdW1lXCIgbG9naW4gaGFuZGxlci5cbiAgLy9cbiAgLy8gRm9yIGNvbnZlbmllbmNlLCBsb2dpbiBtZXRob2RzIGNhbiBhbHNvIHRocm93IGFuIGV4Y2VwdGlvbiwgd2hpY2hcbiAgLy8gaXMgY29udmVydGVkIGludG8gYW4ge2Vycm9yfSByZXN1bHQuICBIb3dldmVyLCBpZiB0aGUgaWQgb2YgdGhlXG4gIC8vIHVzZXIgYXR0ZW1wdGluZyB0aGUgbG9naW4gaXMga25vd24sIGEge3VzZXJJZCwgZXJyb3J9IHJlc3VsdCBzaG91bGRcbiAgLy8gYmUgcmV0dXJuZWQgaW5zdGVhZCBzaW5jZSB0aGUgdXNlciBpZCBpcyBub3QgY2FwdHVyZWQgd2hlbiBhblxuICAvLyBleGNlcHRpb24gaXMgdGhyb3duLlxuICAvL1xuICAvLyBUaGlzIGludGVybmFsIGByZXN1bHRgIG9iamVjdCBpcyBhdXRvbWF0aWNhbGx5IGNvbnZlcnRlZCBpbnRvIHRoZVxuICAvLyBwdWJsaWMge2lkLCB0b2tlbiwgdG9rZW5FeHBpcmVzfSBvYmplY3QgcmV0dXJuZWQgdG8gdGhlIGNsaWVudC5cblxuICAvLyBUcnkgYSBsb2dpbiBtZXRob2QsIGNvbnZlcnRpbmcgdGhyb3duIGV4Y2VwdGlvbnMgaW50byBhbiB7ZXJyb3J9XG4gIC8vIHJlc3VsdC4gIFRoZSBgdHlwZWAgYXJndW1lbnQgaXMgYSBkZWZhdWx0LCBpbnNlcnRlZCBpbnRvIHRoZSByZXN1bHRcbiAgLy8gb2JqZWN0IGlmIG5vdCBleHBsaWNpdGx5IHJldHVybmVkLlxuICAvL1xuICAvLyBMb2cgaW4gYSB1c2VyIG9uIGEgY29ubmVjdGlvbi5cbiAgLy9cbiAgLy8gV2UgdXNlIHRoZSBtZXRob2QgaW52b2NhdGlvbiB0byBzZXQgdGhlIHVzZXIgaWQgb24gdGhlIGNvbm5lY3Rpb24sXG4gIC8vIG5vdCB0aGUgY29ubmVjdGlvbiBvYmplY3QgZGlyZWN0bHkuIHNldFVzZXJJZCBpcyB0aWVkIHRvIG1ldGhvZHMgdG9cbiAgLy8gZW5mb3JjZSBjbGVhciBvcmRlcmluZyBvZiBtZXRob2QgYXBwbGljYXRpb24gKHVzaW5nIHdhaXQgbWV0aG9kcyBvblxuICAvLyB0aGUgY2xpZW50LCBhbmQgYSBubyBzZXRVc2VySWQgYWZ0ZXIgdW5ibG9jayByZXN0cmljdGlvbiBvbiB0aGVcbiAgLy8gc2VydmVyKVxuICAvL1xuICAvLyBUaGUgYHN0YW1wZWRMb2dpblRva2VuYCBwYXJhbWV0ZXIgaXMgb3B0aW9uYWwuICBXaGVuIHByZXNlbnQsIGl0XG4gIC8vIGluZGljYXRlcyB0aGF0IHRoZSBsb2dpbiB0b2tlbiBoYXMgYWxyZWFkeSBiZWVuIGluc2VydGVkIGludG8gdGhlXG4gIC8vIGRhdGFiYXNlIGFuZCBkb2Vzbid0IG5lZWQgdG8gYmUgaW5zZXJ0ZWQgYWdhaW4uICAoSXQncyB1c2VkIGJ5IHRoZVxuICAvLyBcInJlc3VtZVwiIGxvZ2luIGhhbmRsZXIpLlxuICBfbG9naW5Vc2VyKG1ldGhvZEludm9jYXRpb24sIHVzZXJJZCwgc3RhbXBlZExvZ2luVG9rZW4pIHtcbiAgICBpZiAoISBzdGFtcGVkTG9naW5Ub2tlbikge1xuICAgICAgc3RhbXBlZExvZ2luVG9rZW4gPSB0aGlzLl9nZW5lcmF0ZVN0YW1wZWRMb2dpblRva2VuKCk7XG4gICAgICB0aGlzLl9pbnNlcnRMb2dpblRva2VuKHVzZXJJZCwgc3RhbXBlZExvZ2luVG9rZW4pO1xuICAgIH1cblxuICAgIC8vIFRoaXMgb3JkZXIgKGFuZCB0aGUgYXZvaWRhbmNlIG9mIHlpZWxkcykgaXMgaW1wb3J0YW50IHRvIG1ha2VcbiAgICAvLyBzdXJlIHRoYXQgd2hlbiBwdWJsaXNoIGZ1bmN0aW9ucyBhcmUgcmVydW4sIHRoZXkgc2VlIGFcbiAgICAvLyBjb25zaXN0ZW50IHZpZXcgb2YgdGhlIHdvcmxkOiB0aGUgdXNlcklkIGlzIHNldCBhbmQgbWF0Y2hlc1xuICAgIC8vIHRoZSBsb2dpbiB0b2tlbiBvbiB0aGUgY29ubmVjdGlvbiAobm90IHRoYXQgdGhlcmUgaXNcbiAgICAvLyBjdXJyZW50bHkgYSBwdWJsaWMgQVBJIGZvciByZWFkaW5nIHRoZSBsb2dpbiB0b2tlbiBvbiBhXG4gICAgLy8gY29ubmVjdGlvbikuXG4gICAgTWV0ZW9yLl9ub1lpZWxkc0FsbG93ZWQoKCkgPT5cbiAgICAgIHRoaXMuX3NldExvZ2luVG9rZW4oXG4gICAgICAgIHVzZXJJZCxcbiAgICAgICAgbWV0aG9kSW52b2NhdGlvbi5jb25uZWN0aW9uLFxuICAgICAgICB0aGlzLl9oYXNoTG9naW5Ub2tlbihzdGFtcGVkTG9naW5Ub2tlbi50b2tlbilcbiAgICAgIClcbiAgICApO1xuXG4gICAgbWV0aG9kSW52b2NhdGlvbi5zZXRVc2VySWQodXNlcklkKTtcblxuICAgIHJldHVybiB7XG4gICAgICBpZDogdXNlcklkLFxuICAgICAgdG9rZW46IHN0YW1wZWRMb2dpblRva2VuLnRva2VuLFxuICAgICAgdG9rZW5FeHBpcmVzOiB0aGlzLl90b2tlbkV4cGlyYXRpb24oc3RhbXBlZExvZ2luVG9rZW4ud2hlbilcbiAgICB9O1xuICB9O1xuXG4gIC8vIEFmdGVyIGEgbG9naW4gbWV0aG9kIGhhcyBjb21wbGV0ZWQsIGNhbGwgdGhlIGxvZ2luIGhvb2tzLiAgTm90ZVxuICAvLyB0aGF0IGBhdHRlbXB0TG9naW5gIGlzIGNhbGxlZCBmb3IgKmFsbCogbG9naW4gYXR0ZW1wdHMsIGV2ZW4gb25lc1xuICAvLyB3aGljaCBhcmVuJ3Qgc3VjY2Vzc2Z1bCAoc3VjaCBhcyBhbiBpbnZhbGlkIHBhc3N3b3JkLCBldGMpLlxuICAvL1xuICAvLyBJZiB0aGUgbG9naW4gaXMgYWxsb3dlZCBhbmQgaXNuJ3QgYWJvcnRlZCBieSBhIHZhbGlkYXRlIGxvZ2luIGhvb2tcbiAgLy8gY2FsbGJhY2ssIGxvZyBpbiB0aGUgdXNlci5cbiAgLy9cbiAgX2F0dGVtcHRMb2dpbihcbiAgICBtZXRob2RJbnZvY2F0aW9uLFxuICAgIG1ldGhvZE5hbWUsXG4gICAgbWV0aG9kQXJncyxcbiAgICByZXN1bHRcbiAgKSB7XG4gICAgaWYgKCFyZXN1bHQpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJyZXN1bHQgaXMgcmVxdWlyZWRcIik7XG5cbiAgICAvLyBYWFggQSBwcm9ncmFtbWluZyBlcnJvciBpbiBhIGxvZ2luIGhhbmRsZXIgY2FuIGxlYWQgdG8gdGhpcyBvY2N1cmluZywgYW5kXG4gICAgLy8gdGhlbiB3ZSBkb24ndCBjYWxsIG9uTG9naW4gb3Igb25Mb2dpbkZhaWx1cmUgY2FsbGJhY2tzLiBTaG91bGRcbiAgICAvLyB0cnlMb2dpbk1ldGhvZCBjYXRjaCB0aGlzIGNhc2UgYW5kIHR1cm4gaXQgaW50byBhbiBlcnJvcj9cbiAgICBpZiAoIXJlc3VsdC51c2VySWQgJiYgIXJlc3VsdC5lcnJvcilcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkEgbG9naW4gbWV0aG9kIG11c3Qgc3BlY2lmeSBhIHVzZXJJZCBvciBhbiBlcnJvclwiKTtcblxuICAgIGxldCB1c2VyO1xuICAgIGlmIChyZXN1bHQudXNlcklkKVxuICAgICAgdXNlciA9IHRoaXMudXNlcnMuZmluZE9uZShyZXN1bHQudXNlcklkLCB7ZmllbGRzOiB0aGlzLl9vcHRpb25zLmRlZmF1bHRGaWVsZFNlbGVjdG9yfSk7XG5cbiAgICBjb25zdCBhdHRlbXB0ID0ge1xuICAgICAgdHlwZTogcmVzdWx0LnR5cGUgfHwgXCJ1bmtub3duXCIsXG4gICAgICBhbGxvd2VkOiAhISAocmVzdWx0LnVzZXJJZCAmJiAhcmVzdWx0LmVycm9yKSxcbiAgICAgIG1ldGhvZE5hbWU6IG1ldGhvZE5hbWUsXG4gICAgICBtZXRob2RBcmd1bWVudHM6IEFycmF5LmZyb20obWV0aG9kQXJncylcbiAgICB9O1xuICAgIGlmIChyZXN1bHQuZXJyb3IpIHtcbiAgICAgIGF0dGVtcHQuZXJyb3IgPSByZXN1bHQuZXJyb3I7XG4gICAgfVxuICAgIGlmICh1c2VyKSB7XG4gICAgICBhdHRlbXB0LnVzZXIgPSB1c2VyO1xuICAgIH1cblxuICAgIC8vIF92YWxpZGF0ZUxvZ2luIG1heSBtdXRhdGUgYGF0dGVtcHRgIGJ5IGFkZGluZyBhbiBlcnJvciBhbmQgY2hhbmdpbmcgYWxsb3dlZFxuICAgIC8vIHRvIGZhbHNlLCBidXQgdGhhdCdzIHRoZSBvbmx5IGNoYW5nZSBpdCBjYW4gbWFrZSAoYW5kIHRoZSB1c2VyJ3MgY2FsbGJhY2tzXG4gICAgLy8gb25seSBnZXQgYSBjbG9uZSBvZiBgYXR0ZW1wdGApLlxuICAgIHRoaXMuX3ZhbGlkYXRlTG9naW4obWV0aG9kSW52b2NhdGlvbi5jb25uZWN0aW9uLCBhdHRlbXB0KTtcblxuICAgIGlmIChhdHRlbXB0LmFsbG93ZWQpIHtcbiAgICAgIGNvbnN0IHJldCA9IHtcbiAgICAgICAgLi4udGhpcy5fbG9naW5Vc2VyKFxuICAgICAgICAgIG1ldGhvZEludm9jYXRpb24sXG4gICAgICAgICAgcmVzdWx0LnVzZXJJZCxcbiAgICAgICAgICByZXN1bHQuc3RhbXBlZExvZ2luVG9rZW5cbiAgICAgICAgKSxcbiAgICAgICAgLi4ucmVzdWx0Lm9wdGlvbnNcbiAgICAgIH07XG4gICAgICByZXQudHlwZSA9IGF0dGVtcHQudHlwZTtcbiAgICAgIHRoaXMuX3N1Y2Nlc3NmdWxMb2dpbihtZXRob2RJbnZvY2F0aW9uLmNvbm5lY3Rpb24sIGF0dGVtcHQpO1xuICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICB0aGlzLl9mYWlsZWRMb2dpbihtZXRob2RJbnZvY2F0aW9uLmNvbm5lY3Rpb24sIGF0dGVtcHQpO1xuICAgICAgdGhyb3cgYXR0ZW1wdC5lcnJvcjtcbiAgICB9XG4gIH07XG5cbiAgLy8gQWxsIHNlcnZpY2Ugc3BlY2lmaWMgbG9naW4gbWV0aG9kcyBzaG91bGQgZ28gdGhyb3VnaCB0aGlzIGZ1bmN0aW9uLlxuICAvLyBFbnN1cmUgdGhhdCB0aHJvd24gZXhjZXB0aW9ucyBhcmUgY2F1Z2h0IGFuZCB0aGF0IGxvZ2luIGhvb2tcbiAgLy8gY2FsbGJhY2tzIGFyZSBzdGlsbCBjYWxsZWQuXG4gIC8vXG4gIF9sb2dpbk1ldGhvZChcbiAgICBtZXRob2RJbnZvY2F0aW9uLFxuICAgIG1ldGhvZE5hbWUsXG4gICAgbWV0aG9kQXJncyxcbiAgICB0eXBlLFxuICAgIGZuXG4gICkge1xuICAgIHJldHVybiB0aGlzLl9hdHRlbXB0TG9naW4oXG4gICAgICBtZXRob2RJbnZvY2F0aW9uLFxuICAgICAgbWV0aG9kTmFtZSxcbiAgICAgIG1ldGhvZEFyZ3MsXG4gICAgICB0cnlMb2dpbk1ldGhvZCh0eXBlLCBmbilcbiAgICApO1xuICB9O1xuXG5cbiAgLy8gUmVwb3J0IGEgbG9naW4gYXR0ZW1wdCBmYWlsZWQgb3V0c2lkZSB0aGUgY29udGV4dCBvZiBhIG5vcm1hbCBsb2dpblxuICAvLyBtZXRob2QuIFRoaXMgaXMgZm9yIHVzZSBpbiB0aGUgY2FzZSB3aGVyZSB0aGVyZSBpcyBhIG11bHRpLXN0ZXAgbG9naW5cbiAgLy8gcHJvY2VkdXJlIChlZyBTUlAgYmFzZWQgcGFzc3dvcmQgbG9naW4pLiBJZiBhIG1ldGhvZCBlYXJseSBpbiB0aGVcbiAgLy8gY2hhaW4gZmFpbHMsIGl0IHNob3VsZCBjYWxsIHRoaXMgZnVuY3Rpb24gdG8gcmVwb3J0IGEgZmFpbHVyZS4gVGhlcmVcbiAgLy8gaXMgbm8gY29ycmVzcG9uZGluZyBtZXRob2QgZm9yIGEgc3VjY2Vzc2Z1bCBsb2dpbjsgbWV0aG9kcyB0aGF0IGNhblxuICAvLyBzdWNjZWVkIGF0IGxvZ2dpbmcgYSB1c2VyIGluIHNob3VsZCBhbHdheXMgYmUgYWN0dWFsIGxvZ2luIG1ldGhvZHNcbiAgLy8gKHVzaW5nIGVpdGhlciBBY2NvdW50cy5fbG9naW5NZXRob2Qgb3IgQWNjb3VudHMucmVnaXN0ZXJMb2dpbkhhbmRsZXIpLlxuICBfcmVwb3J0TG9naW5GYWlsdXJlKFxuICAgIG1ldGhvZEludm9jYXRpb24sXG4gICAgbWV0aG9kTmFtZSxcbiAgICBtZXRob2RBcmdzLFxuICAgIHJlc3VsdFxuICApIHtcbiAgICBjb25zdCBhdHRlbXB0ID0ge1xuICAgICAgdHlwZTogcmVzdWx0LnR5cGUgfHwgXCJ1bmtub3duXCIsXG4gICAgICBhbGxvd2VkOiBmYWxzZSxcbiAgICAgIGVycm9yOiByZXN1bHQuZXJyb3IsXG4gICAgICBtZXRob2ROYW1lOiBtZXRob2ROYW1lLFxuICAgICAgbWV0aG9kQXJndW1lbnRzOiBBcnJheS5mcm9tKG1ldGhvZEFyZ3MpXG4gICAgfTtcblxuICAgIGlmIChyZXN1bHQudXNlcklkKSB7XG4gICAgICBhdHRlbXB0LnVzZXIgPSB0aGlzLnVzZXJzLmZpbmRPbmUocmVzdWx0LnVzZXJJZCwge2ZpZWxkczogdGhpcy5fb3B0aW9ucy5kZWZhdWx0RmllbGRTZWxlY3Rvcn0pO1xuICAgIH1cblxuICAgIHRoaXMuX3ZhbGlkYXRlTG9naW4obWV0aG9kSW52b2NhdGlvbi5jb25uZWN0aW9uLCBhdHRlbXB0KTtcbiAgICB0aGlzLl9mYWlsZWRMb2dpbihtZXRob2RJbnZvY2F0aW9uLmNvbm5lY3Rpb24sIGF0dGVtcHQpO1xuXG4gICAgLy8gX3ZhbGlkYXRlTG9naW4gbWF5IG11dGF0ZSBhdHRlbXB0IHRvIHNldCBhIG5ldyBlcnJvciBtZXNzYWdlLiBSZXR1cm5cbiAgICAvLyB0aGUgbW9kaWZpZWQgdmVyc2lvbi5cbiAgICByZXR1cm4gYXR0ZW1wdDtcbiAgfTtcblxuICAvLy9cbiAgLy8vIExPR0lOIEhBTkRMRVJTXG4gIC8vL1xuXG4gIC8vIFRoZSBtYWluIGVudHJ5IHBvaW50IGZvciBhdXRoIHBhY2thZ2VzIHRvIGhvb2sgaW4gdG8gbG9naW4uXG4gIC8vXG4gIC8vIEEgbG9naW4gaGFuZGxlciBpcyBhIGxvZ2luIG1ldGhvZCB3aGljaCBjYW4gcmV0dXJuIGB1bmRlZmluZWRgIHRvXG4gIC8vIGluZGljYXRlIHRoYXQgdGhlIGxvZ2luIHJlcXVlc3QgaXMgbm90IGhhbmRsZWQgYnkgdGhpcyBoYW5kbGVyLlxuICAvL1xuICAvLyBAcGFyYW0gbmFtZSB7U3RyaW5nfSBPcHRpb25hbC4gIFRoZSBzZXJ2aWNlIG5hbWUsIHVzZWQgYnkgZGVmYXVsdFxuICAvLyBpZiBhIHNwZWNpZmljIHNlcnZpY2UgbmFtZSBpc24ndCByZXR1cm5lZCBpbiB0aGUgcmVzdWx0LlxuICAvL1xuICAvLyBAcGFyYW0gaGFuZGxlciB7RnVuY3Rpb259IEEgZnVuY3Rpb24gdGhhdCByZWNlaXZlcyBhbiBvcHRpb25zIG9iamVjdFxuICAvLyAoYXMgcGFzc2VkIGFzIGFuIGFyZ3VtZW50IHRvIHRoZSBgbG9naW5gIG1ldGhvZCkgYW5kIHJldHVybnMgb25lIG9mOlxuICAvLyAtIGB1bmRlZmluZWRgLCBtZWFuaW5nIGRvbid0IGhhbmRsZTtcbiAgLy8gLSBhIGxvZ2luIG1ldGhvZCByZXN1bHQgb2JqZWN0XG5cbiAgcmVnaXN0ZXJMb2dpbkhhbmRsZXIobmFtZSwgaGFuZGxlcikge1xuICAgIGlmICghIGhhbmRsZXIpIHtcbiAgICAgIGhhbmRsZXIgPSBuYW1lO1xuICAgICAgbmFtZSA9IG51bGw7XG4gICAgfVxuXG4gICAgdGhpcy5fbG9naW5IYW5kbGVycy5wdXNoKHtcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICBoYW5kbGVyOiBoYW5kbGVyXG4gICAgfSk7XG4gIH07XG5cblxuICAvLyBDaGVja3MgYSB1c2VyJ3MgY3JlZGVudGlhbHMgYWdhaW5zdCBhbGwgdGhlIHJlZ2lzdGVyZWQgbG9naW5cbiAgLy8gaGFuZGxlcnMsIGFuZCByZXR1cm5zIGEgbG9naW4gdG9rZW4gaWYgdGhlIGNyZWRlbnRpYWxzIGFyZSB2YWxpZC4gSXRcbiAgLy8gaXMgbGlrZSB0aGUgbG9naW4gbWV0aG9kLCBleGNlcHQgdGhhdCBpdCBkb2Vzbid0IHNldCB0aGUgbG9nZ2VkLWluXG4gIC8vIHVzZXIgb24gdGhlIGNvbm5lY3Rpb24uIFRocm93cyBhIE1ldGVvci5FcnJvciBpZiBsb2dnaW5nIGluIGZhaWxzLFxuICAvLyBpbmNsdWRpbmcgdGhlIGNhc2Ugd2hlcmUgbm9uZSBvZiB0aGUgbG9naW4gaGFuZGxlcnMgaGFuZGxlZCB0aGUgbG9naW5cbiAgLy8gcmVxdWVzdC4gT3RoZXJ3aXNlLCByZXR1cm5zIHtpZDogdXNlcklkLCB0b2tlbjogKiwgdG9rZW5FeHBpcmVzOiAqfS5cbiAgLy9cbiAgLy8gRm9yIGV4YW1wbGUsIGlmIHlvdSB3YW50IHRvIGxvZ2luIHdpdGggYSBwbGFpbnRleHQgcGFzc3dvcmQsIGBvcHRpb25zYCBjb3VsZCBiZVxuICAvLyAgIHsgdXNlcjogeyB1c2VybmFtZTogPHVzZXJuYW1lPiB9LCBwYXNzd29yZDogPHBhc3N3b3JkPiB9LCBvclxuICAvLyAgIHsgdXNlcjogeyBlbWFpbDogPGVtYWlsPiB9LCBwYXNzd29yZDogPHBhc3N3b3JkPiB9LlxuXG4gIC8vIFRyeSBhbGwgb2YgdGhlIHJlZ2lzdGVyZWQgbG9naW4gaGFuZGxlcnMgdW50aWwgb25lIG9mIHRoZW0gZG9lc24ndFxuICAvLyByZXR1cm4gYHVuZGVmaW5lZGAsIG1lYW5pbmcgaXQgaGFuZGxlZCB0aGlzIGNhbGwgdG8gYGxvZ2luYC4gUmV0dXJuXG4gIC8vIHRoYXQgcmV0dXJuIHZhbHVlLlxuICBfcnVuTG9naW5IYW5kbGVycyhtZXRob2RJbnZvY2F0aW9uLCBvcHRpb25zKSB7XG4gICAgZm9yIChsZXQgaGFuZGxlciBvZiB0aGlzLl9sb2dpbkhhbmRsZXJzKSB7XG4gICAgICBjb25zdCByZXN1bHQgPSB0cnlMb2dpbk1ldGhvZChcbiAgICAgICAgaGFuZGxlci5uYW1lLFxuICAgICAgICAoKSA9PiBoYW5kbGVyLmhhbmRsZXIuY2FsbChtZXRob2RJbnZvY2F0aW9uLCBvcHRpb25zKVxuICAgICAgKTtcblxuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfVxuXG4gICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsIFwiQSBsb2dpbiBoYW5kbGVyIHNob3VsZCByZXR1cm4gYSByZXN1bHQgb3IgdW5kZWZpbmVkXCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiBudWxsLFxuICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoNDAwLCBcIlVucmVjb2duaXplZCBvcHRpb25zIGZvciBsb2dpbiByZXF1ZXN0XCIpXG4gICAgfTtcbiAgfTtcblxuICAvLyBEZWxldGVzIHRoZSBnaXZlbiBsb2dpblRva2VuIGZyb20gdGhlIGRhdGFiYXNlLlxuICAvL1xuICAvLyBGb3IgbmV3LXN0eWxlIGhhc2hlZCB0b2tlbiwgdGhpcyB3aWxsIGNhdXNlIGFsbCBjb25uZWN0aW9uc1xuICAvLyBhc3NvY2lhdGVkIHdpdGggdGhlIHRva2VuIHRvIGJlIGNsb3NlZC5cbiAgLy9cbiAgLy8gQW55IGNvbm5lY3Rpb25zIGFzc29jaWF0ZWQgd2l0aCBvbGQtc3R5bGUgdW5oYXNoZWQgdG9rZW5zIHdpbGwgYmVcbiAgLy8gaW4gdGhlIHByb2Nlc3Mgb2YgYmVjb21pbmcgYXNzb2NpYXRlZCB3aXRoIGhhc2hlZCB0b2tlbnMgYW5kIHRoZW5cbiAgLy8gdGhleSdsbCBnZXQgY2xvc2VkLlxuICBkZXN0cm95VG9rZW4odXNlcklkLCBsb2dpblRva2VuKSB7XG4gICAgdGhpcy51c2Vycy51cGRhdGUodXNlcklkLCB7XG4gICAgICAkcHVsbDoge1xuICAgICAgICBcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vuc1wiOiB7XG4gICAgICAgICAgJG9yOiBbXG4gICAgICAgICAgICB7IGhhc2hlZFRva2VuOiBsb2dpblRva2VuIH0sXG4gICAgICAgICAgICB7IHRva2VuOiBsb2dpblRva2VuIH1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICBfaW5pdFNlcnZlck1ldGhvZHMoKSB7XG4gICAgLy8gVGhlIG1ldGhvZHMgY3JlYXRlZCBpbiB0aGlzIGZ1bmN0aW9uIG5lZWQgdG8gYmUgY3JlYXRlZCBoZXJlIHNvIHRoYXRcbiAgICAvLyB0aGlzIHZhcmlhYmxlIGlzIGF2YWlsYWJsZSBpbiB0aGVpciBzY29wZS5cbiAgICBjb25zdCBhY2NvdW50cyA9IHRoaXM7XG5cblxuICAgIC8vIFRoaXMgb2JqZWN0IHdpbGwgYmUgcG9wdWxhdGVkIHdpdGggbWV0aG9kcyBhbmQgdGhlbiBwYXNzZWQgdG9cbiAgICAvLyBhY2NvdW50cy5fc2VydmVyLm1ldGhvZHMgZnVydGhlciBiZWxvdy5cbiAgICBjb25zdCBtZXRob2RzID0ge307XG5cbiAgICAvLyBAcmV0dXJucyB7T2JqZWN0fG51bGx9XG4gICAgLy8gICBJZiBzdWNjZXNzZnVsLCByZXR1cm5zIHt0b2tlbjogcmVjb25uZWN0VG9rZW4sIGlkOiB1c2VySWR9XG4gICAgLy8gICBJZiB1bnN1Y2Nlc3NmdWwgKGZvciBleGFtcGxlLCBpZiB0aGUgdXNlciBjbG9zZWQgdGhlIG9hdXRoIGxvZ2luIHBvcHVwKSxcbiAgICAvLyAgICAgdGhyb3dzIGFuIGVycm9yIGRlc2NyaWJpbmcgdGhlIHJlYXNvblxuICAgIG1ldGhvZHMubG9naW4gPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgICAgLy8gTG9naW4gaGFuZGxlcnMgc2hvdWxkIHJlYWxseSBhbHNvIGNoZWNrIHdoYXRldmVyIGZpZWxkIHRoZXkgbG9vayBhdCBpblxuICAgICAgLy8gb3B0aW9ucywgYnV0IHdlIGRvbid0IGVuZm9yY2UgaXQuXG4gICAgICBjaGVjayhvcHRpb25zLCBPYmplY3QpO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhY2NvdW50cy5fcnVuTG9naW5IYW5kbGVycyh0aGlzLCBvcHRpb25zKTtcblxuICAgICAgcmV0dXJuIGFjY291bnRzLl9hdHRlbXB0TG9naW4odGhpcywgXCJsb2dpblwiLCBhcmd1bWVudHMsIHJlc3VsdCk7XG4gICAgfTtcblxuICAgIG1ldGhvZHMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgY29uc3QgdG9rZW4gPSBhY2NvdW50cy5fZ2V0TG9naW5Ub2tlbih0aGlzLmNvbm5lY3Rpb24uaWQpO1xuICAgICAgYWNjb3VudHMuX3NldExvZ2luVG9rZW4odGhpcy51c2VySWQsIHRoaXMuY29ubmVjdGlvbiwgbnVsbCk7XG4gICAgICBpZiAodG9rZW4gJiYgdGhpcy51c2VySWQpIHtcbiAgICAgICAgYWNjb3VudHMuZGVzdHJveVRva2VuKHRoaXMudXNlcklkLCB0b2tlbik7XG4gICAgICB9XG4gICAgICBhY2NvdW50cy5fc3VjY2Vzc2Z1bExvZ291dCh0aGlzLmNvbm5lY3Rpb24sIHRoaXMudXNlcklkKTtcbiAgICAgIHRoaXMuc2V0VXNlcklkKG51bGwpO1xuICAgIH07XG5cbiAgICAvLyBEZWxldGUgYWxsIHRoZSBjdXJyZW50IHVzZXIncyB0b2tlbnMgYW5kIGNsb3NlIGFsbCBvcGVuIGNvbm5lY3Rpb25zIGxvZ2dlZFxuICAgIC8vIGluIGFzIHRoaXMgdXNlci4gUmV0dXJucyBhIGZyZXNoIG5ldyBsb2dpbiB0b2tlbiB0aGF0IHRoaXMgY2xpZW50IGNhblxuICAgIC8vIHVzZS4gVGVzdHMgc2V0IEFjY291bnRzLl9ub0Nvbm5lY3Rpb25DbG9zZURlbGF5Rm9yVGVzdCB0byBkZWxldGUgdG9rZW5zXG4gICAgLy8gaW1tZWRpYXRlbHkgaW5zdGVhZCBvZiB1c2luZyBhIGRlbGF5LlxuICAgIC8vXG4gICAgLy8gWFhYIENPTVBBVCBXSVRIIDAuNy4yXG4gICAgLy8gVGhpcyBzaW5nbGUgYGxvZ291dE90aGVyQ2xpZW50c2AgbWV0aG9kIGhhcyBiZWVuIHJlcGxhY2VkIHdpdGggdHdvXG4gICAgLy8gbWV0aG9kcywgb25lIHRoYXQgeW91IGNhbGwgdG8gZ2V0IGEgbmV3IHRva2VuLCBhbmQgYW5vdGhlciB0aGF0IHlvdVxuICAgIC8vIGNhbGwgdG8gcmVtb3ZlIGFsbCB0b2tlbnMgZXhjZXB0IHlvdXIgb3duLiBUaGUgbmV3IGRlc2lnbiBhbGxvd3NcbiAgICAvLyBjbGllbnRzIHRvIGtub3cgd2hlbiBvdGhlciBjbGllbnRzIGhhdmUgYWN0dWFsbHkgYmVlbiBsb2dnZWRcbiAgICAvLyBvdXQuIChUaGUgYGxvZ291dE90aGVyQ2xpZW50c2AgbWV0aG9kIGd1YXJhbnRlZXMgdGhlIGNhbGxlciB0aGF0XG4gICAgLy8gdGhlIG90aGVyIGNsaWVudHMgd2lsbCBiZSBsb2dnZWQgb3V0IGF0IHNvbWUgcG9pbnQsIGJ1dCBtYWtlcyBub1xuICAgIC8vIGd1YXJhbnRlZXMgYWJvdXQgd2hlbi4pIFRoaXMgbWV0aG9kIGlzIGxlZnQgaW4gZm9yIGJhY2t3YXJkc1xuICAgIC8vIGNvbXBhdGliaWxpdHksIGVzcGVjaWFsbHkgc2luY2UgYXBwbGljYXRpb24gY29kZSBtaWdodCBiZSBjYWxsaW5nXG4gICAgLy8gdGhpcyBtZXRob2QgZGlyZWN0bHkuXG4gICAgLy9cbiAgICAvLyBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCB0b2tlbiBhbmQgdG9rZW5FeHBpcmVzIGtleXMuXG4gICAgbWV0aG9kcy5sb2dvdXRPdGhlckNsaWVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBjb25zdCB1c2VyID0gYWNjb3VudHMudXNlcnMuZmluZE9uZSh0aGlzLnVzZXJJZCwge1xuICAgICAgICBmaWVsZHM6IHtcbiAgICAgICAgICBcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vuc1wiOiB0cnVlXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgLy8gU2F2ZSB0aGUgY3VycmVudCB0b2tlbnMgaW4gdGhlIGRhdGFiYXNlIHRvIGJlIGRlbGV0ZWQgaW5cbiAgICAgICAgLy8gQ09OTkVDVElPTl9DTE9TRV9ERUxBWV9NUyBtcy4gVGhpcyBnaXZlcyBvdGhlciBjb25uZWN0aW9ucyBpbiB0aGVcbiAgICAgICAgLy8gY2FsbGVyJ3MgYnJvd3NlciB0aW1lIHRvIGZpbmQgdGhlIGZyZXNoIHRva2VuIGluIGxvY2FsU3RvcmFnZS4gV2Ugc2F2ZVxuICAgICAgICAvLyB0aGUgdG9rZW5zIGluIHRoZSBkYXRhYmFzZSBpbiBjYXNlIHdlIGNyYXNoIGJlZm9yZSBhY3R1YWxseSBkZWxldGluZ1xuICAgICAgICAvLyB0aGVtLlxuICAgICAgICBjb25zdCB0b2tlbnMgPSB1c2VyLnNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2VucztcbiAgICAgICAgY29uc3QgbmV3VG9rZW4gPSBhY2NvdW50cy5fZ2VuZXJhdGVTdGFtcGVkTG9naW5Ub2tlbigpO1xuICAgICAgICBhY2NvdW50cy51c2Vycy51cGRhdGUodGhpcy51c2VySWQsIHtcbiAgICAgICAgICAkc2V0OiB7XG4gICAgICAgICAgICBcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vuc1RvRGVsZXRlXCI6IHRva2VucyxcbiAgICAgICAgICAgIFwic2VydmljZXMucmVzdW1lLmhhdmVMb2dpblRva2Vuc1RvRGVsZXRlXCI6IHRydWVcbiAgICAgICAgICB9LFxuICAgICAgICAgICRwdXNoOiB7IFwic2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zXCI6IGFjY291bnRzLl9oYXNoU3RhbXBlZFRva2VuKG5ld1Rva2VuKSB9XG4gICAgICAgIH0pO1xuICAgICAgICBNZXRlb3Iuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgLy8gVGhlIG9ic2VydmUgb24gTWV0ZW9yLnVzZXJzIHdpbGwgdGFrZSBjYXJlIG9mIGNsb3NpbmcgdGhlIGNvbm5lY3Rpb25zXG4gICAgICAgICAgLy8gYXNzb2NpYXRlZCB3aXRoIGB0b2tlbnNgLlxuICAgICAgICAgIGFjY291bnRzLl9kZWxldGVTYXZlZFRva2Vuc0ZvclVzZXIodGhpcy51c2VySWQsIHRva2Vucyk7XG4gICAgICAgIH0sIGFjY291bnRzLl9ub0Nvbm5lY3Rpb25DbG9zZURlbGF5Rm9yVGVzdCA/IDAgOlxuICAgICAgICAgIENPTk5FQ1RJT05fQ0xPU0VfREVMQVlfTVMpO1xuICAgICAgICAvLyBXZSBkbyBub3Qgc2V0IHRoZSBsb2dpbiB0b2tlbiBvbiB0aGlzIGNvbm5lY3Rpb24sIGJ1dCBpbnN0ZWFkIHRoZVxuICAgICAgICAvLyBvYnNlcnZlIGNsb3NlcyB0aGUgY29ubmVjdGlvbiBhbmQgdGhlIGNsaWVudCB3aWxsIHJlY29ubmVjdCB3aXRoIHRoZVxuICAgICAgICAvLyBuZXcgdG9rZW4uXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdG9rZW46IG5ld1Rva2VuLnRva2VuLFxuICAgICAgICAgIHRva2VuRXhwaXJlczogYWNjb3VudHMuX3Rva2VuRXhwaXJhdGlvbihuZXdUb2tlbi53aGVuKVxuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcihcIllvdSBhcmUgbm90IGxvZ2dlZCBpbi5cIik7XG4gICAgICB9XG4gICAgfTtcblxuICAgIC8vIEdlbmVyYXRlcyBhIG5ldyBsb2dpbiB0b2tlbiB3aXRoIHRoZSBzYW1lIGV4cGlyYXRpb24gYXMgdGhlXG4gICAgLy8gY29ubmVjdGlvbidzIGN1cnJlbnQgdG9rZW4gYW5kIHNhdmVzIGl0IHRvIHRoZSBkYXRhYmFzZS4gQXNzb2NpYXRlc1xuICAgIC8vIHRoZSBjb25uZWN0aW9uIHdpdGggdGhpcyBuZXcgdG9rZW4gYW5kIHJldHVybnMgaXQuIFRocm93cyBhbiBlcnJvclxuICAgIC8vIGlmIGNhbGxlZCBvbiBhIGNvbm5lY3Rpb24gdGhhdCBpc24ndCBsb2dnZWQgaW4uXG4gICAgLy9cbiAgICAvLyBAcmV0dXJucyBPYmplY3RcbiAgICAvLyAgIElmIHN1Y2Nlc3NmdWwsIHJldHVybnMgeyB0b2tlbjogPG5ldyB0b2tlbj4sIGlkOiA8dXNlciBpZD4sXG4gICAgLy8gICB0b2tlbkV4cGlyZXM6IDxleHBpcmF0aW9uIGRhdGU+IH0uXG4gICAgbWV0aG9kcy5nZXROZXdUb2tlbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGNvbnN0IHVzZXIgPSBhY2NvdW50cy51c2Vycy5maW5kT25lKHRoaXMudXNlcklkLCB7XG4gICAgICAgIGZpZWxkczogeyBcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vuc1wiOiAxIH1cbiAgICAgIH0pO1xuICAgICAgaWYgKCEgdGhpcy51c2VySWQgfHwgISB1c2VyKSB7XG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoXCJZb3UgYXJlIG5vdCBsb2dnZWQgaW4uXCIpO1xuICAgICAgfVxuICAgICAgLy8gQmUgY2FyZWZ1bCBub3QgdG8gZ2VuZXJhdGUgYSBuZXcgdG9rZW4gdGhhdCBoYXMgYSBsYXRlclxuICAgICAgLy8gZXhwaXJhdGlvbiB0aGFuIHRoZSBjdXJyZW4gdG9rZW4uIE90aGVyd2lzZSwgYSBiYWQgZ3V5IHdpdGggYVxuICAgICAgLy8gc3RvbGVuIHRva2VuIGNvdWxkIHVzZSB0aGlzIG1ldGhvZCB0byBzdG9wIGhpcyBzdG9sZW4gdG9rZW4gZnJvbVxuICAgICAgLy8gZXZlciBleHBpcmluZy5cbiAgICAgIGNvbnN0IGN1cnJlbnRIYXNoZWRUb2tlbiA9IGFjY291bnRzLl9nZXRMb2dpblRva2VuKHRoaXMuY29ubmVjdGlvbi5pZCk7XG4gICAgICBjb25zdCBjdXJyZW50U3RhbXBlZFRva2VuID0gdXNlci5zZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMuZmluZChcbiAgICAgICAgc3RhbXBlZFRva2VuID0+IHN0YW1wZWRUb2tlbi5oYXNoZWRUb2tlbiA9PT0gY3VycmVudEhhc2hlZFRva2VuXG4gICAgICApO1xuICAgICAgaWYgKCEgY3VycmVudFN0YW1wZWRUb2tlbikgeyAvLyBzYWZldHkgYmVsdDogdGhpcyBzaG91bGQgbmV2ZXIgaGFwcGVuXG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoXCJJbnZhbGlkIGxvZ2luIHRva2VuXCIpO1xuICAgICAgfVxuICAgICAgY29uc3QgbmV3U3RhbXBlZFRva2VuID0gYWNjb3VudHMuX2dlbmVyYXRlU3RhbXBlZExvZ2luVG9rZW4oKTtcbiAgICAgIG5ld1N0YW1wZWRUb2tlbi53aGVuID0gY3VycmVudFN0YW1wZWRUb2tlbi53aGVuO1xuICAgICAgYWNjb3VudHMuX2luc2VydExvZ2luVG9rZW4odGhpcy51c2VySWQsIG5ld1N0YW1wZWRUb2tlbik7XG4gICAgICByZXR1cm4gYWNjb3VudHMuX2xvZ2luVXNlcih0aGlzLCB0aGlzLnVzZXJJZCwgbmV3U3RhbXBlZFRva2VuKTtcbiAgICB9O1xuXG4gICAgLy8gUmVtb3ZlcyBhbGwgdG9rZW5zIGV4Y2VwdCB0aGUgdG9rZW4gYXNzb2NpYXRlZCB3aXRoIHRoZSBjdXJyZW50XG4gICAgLy8gY29ubmVjdGlvbi4gVGhyb3dzIGFuIGVycm9yIGlmIHRoZSBjb25uZWN0aW9uIGlzIG5vdCBsb2dnZWRcbiAgICAvLyBpbi4gUmV0dXJucyBub3RoaW5nIG9uIHN1Y2Nlc3MuXG4gICAgbWV0aG9kcy5yZW1vdmVPdGhlclRva2VucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICghIHRoaXMudXNlcklkKSB7XG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoXCJZb3UgYXJlIG5vdCBsb2dnZWQgaW4uXCIpO1xuICAgICAgfVxuICAgICAgY29uc3QgY3VycmVudFRva2VuID0gYWNjb3VudHMuX2dldExvZ2luVG9rZW4odGhpcy5jb25uZWN0aW9uLmlkKTtcbiAgICAgIGFjY291bnRzLnVzZXJzLnVwZGF0ZSh0aGlzLnVzZXJJZCwge1xuICAgICAgICAkcHVsbDoge1xuICAgICAgICAgIFwic2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zXCI6IHsgaGFzaGVkVG9rZW46IHsgJG5lOiBjdXJyZW50VG9rZW4gfSB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICAvLyBBbGxvdyBhIG9uZS10aW1lIGNvbmZpZ3VyYXRpb24gZm9yIGEgbG9naW4gc2VydmljZS4gTW9kaWZpY2F0aW9uc1xuICAgIC8vIHRvIHRoaXMgY29sbGVjdGlvbiBhcmUgYWxzbyBhbGxvd2VkIGluIGluc2VjdXJlIG1vZGUuXG4gICAgbWV0aG9kcy5jb25maWd1cmVMb2dpblNlcnZpY2UgPSAob3B0aW9ucykgPT4ge1xuICAgICAgY2hlY2sob3B0aW9ucywgTWF0Y2guT2JqZWN0SW5jbHVkaW5nKHtzZXJ2aWNlOiBTdHJpbmd9KSk7XG4gICAgICAvLyBEb24ndCBsZXQgcmFuZG9tIHVzZXJzIGNvbmZpZ3VyZSBhIHNlcnZpY2Ugd2UgaGF2ZW4ndCBhZGRlZCB5ZXQgKHNvXG4gICAgICAvLyB0aGF0IHdoZW4gd2UgZG8gbGF0ZXIgYWRkIGl0LCBpdCdzIHNldCB1cCB3aXRoIHRoZWlyIGNvbmZpZ3VyYXRpb25cbiAgICAgIC8vIGluc3RlYWQgb2Ygb3VycykuXG4gICAgICAvLyBYWFggaWYgc2VydmljZSBjb25maWd1cmF0aW9uIGlzIG9hdXRoLXNwZWNpZmljIHRoZW4gdGhpcyBjb2RlIHNob3VsZFxuICAgICAgLy8gICAgIGJlIGluIGFjY291bnRzLW9hdXRoOyBpZiBpdCdzIG5vdCB0aGVuIHRoZSByZWdpc3RyeSBzaG91bGQgYmVcbiAgICAgIC8vICAgICBpbiB0aGlzIHBhY2thZ2VcbiAgICAgIGlmICghKGFjY291bnRzLm9hdXRoXG4gICAgICAgICYmIGFjY291bnRzLm9hdXRoLnNlcnZpY2VOYW1lcygpLmluY2x1ZGVzKG9wdGlvbnMuc2VydmljZSkpKSB7XG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIlNlcnZpY2UgdW5rbm93blwiKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgeyBTZXJ2aWNlQ29uZmlndXJhdGlvbiB9ID0gUGFja2FnZVsnc2VydmljZS1jb25maWd1cmF0aW9uJ107XG4gICAgICBpZiAoU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMuZmluZE9uZSh7c2VydmljZTogb3B0aW9ucy5zZXJ2aWNlfSkpXG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBgU2VydmljZSAke29wdGlvbnMuc2VydmljZX0gYWxyZWFkeSBjb25maWd1cmVkYCk7XG5cbiAgICAgIGlmIChoYXNPd24uY2FsbChvcHRpb25zLCAnc2VjcmV0JykgJiYgdXNpbmdPQXV0aEVuY3J5cHRpb24oKSlcbiAgICAgICAgb3B0aW9ucy5zZWNyZXQgPSBPQXV0aEVuY3J5cHRpb24uc2VhbChvcHRpb25zLnNlY3JldCk7XG5cbiAgICAgIFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLmluc2VydChvcHRpb25zKTtcbiAgICB9O1xuXG4gICAgYWNjb3VudHMuX3NlcnZlci5tZXRob2RzKG1ldGhvZHMpO1xuICB9O1xuXG4gIF9pbml0QWNjb3VudERhdGFIb29rcygpIHtcbiAgICB0aGlzLl9zZXJ2ZXIub25Db25uZWN0aW9uKGNvbm5lY3Rpb24gPT4ge1xuICAgICAgdGhpcy5fYWNjb3VudERhdGFbY29ubmVjdGlvbi5pZF0gPSB7XG4gICAgICAgIGNvbm5lY3Rpb246IGNvbm5lY3Rpb25cbiAgICAgIH07XG5cbiAgICAgIGNvbm5lY3Rpb24ub25DbG9zZSgoKSA9PiB7XG4gICAgICAgIHRoaXMuX3JlbW92ZVRva2VuRnJvbUNvbm5lY3Rpb24oY29ubmVjdGlvbi5pZCk7XG4gICAgICAgIGRlbGV0ZSB0aGlzLl9hY2NvdW50RGF0YVtjb25uZWN0aW9uLmlkXTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9O1xuXG4gIF9pbml0U2VydmVyUHVibGljYXRpb25zKCkge1xuICAgIC8vIEJyaW5nIGludG8gbGV4aWNhbCBzY29wZSBmb3IgcHVibGlzaCBjYWxsYmFja3MgdGhhdCBuZWVkIGB0aGlzYFxuICAgIGNvbnN0IHsgdXNlcnMsIF9hdXRvcHVibGlzaEZpZWxkcywgX2RlZmF1bHRQdWJsaXNoRmllbGRzIH0gPSB0aGlzO1xuXG4gICAgLy8gUHVibGlzaCBhbGwgbG9naW4gc2VydmljZSBjb25maWd1cmF0aW9uIGZpZWxkcyBvdGhlciB0aGFuIHNlY3JldC5cbiAgICB0aGlzLl9zZXJ2ZXIucHVibGlzaChcIm1ldGVvci5sb2dpblNlcnZpY2VDb25maWd1cmF0aW9uXCIsICgpID0+IHtcbiAgICAgIGNvbnN0IHsgU2VydmljZUNvbmZpZ3VyYXRpb24gfSA9IFBhY2thZ2VbJ3NlcnZpY2UtY29uZmlndXJhdGlvbiddO1xuICAgICAgcmV0dXJuIFNlcnZpY2VDb25maWd1cmF0aW9uLmNvbmZpZ3VyYXRpb25zLmZpbmQoe30sIHtmaWVsZHM6IHtzZWNyZXQ6IDB9fSk7XG4gICAgfSwge2lzX2F1dG86IHRydWV9KTsgLy8gbm90IHRlY2hpbmNhbGx5IGF1dG9wdWJsaXNoLCBidXQgc3RvcHMgdGhlIHdhcm5pbmcuXG5cbiAgICAvLyBVc2UgTWV0ZW9yLnN0YXJ0dXAgdG8gZ2l2ZSBvdGhlciBwYWNrYWdlcyBhIGNoYW5jZSB0byBjYWxsXG4gICAgLy8gc2V0RGVmYXVsdFB1Ymxpc2hGaWVsZHMuXG4gICAgTWV0ZW9yLnN0YXJ0dXAoKCkgPT4ge1xuICAgICAgLy8gUHVibGlzaCB0aGUgY3VycmVudCB1c2VyJ3MgcmVjb3JkIHRvIHRoZSBjbGllbnQuXG4gICAgICB0aGlzLl9zZXJ2ZXIucHVibGlzaChudWxsLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLnVzZXJJZCkge1xuICAgICAgICAgIHJldHVybiB1c2Vycy5maW5kKHtcbiAgICAgICAgICAgIF9pZDogdGhpcy51c2VySWRcbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICBmaWVsZHM6IF9kZWZhdWx0UHVibGlzaEZpZWxkcy5wcm9qZWN0aW9uLFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICB9LCAvKnN1cHByZXNzIGF1dG9wdWJsaXNoIHdhcm5pbmcqL3tpc19hdXRvOiB0cnVlfSk7XG4gICAgfSk7XG5cbiAgICAvLyBVc2UgTWV0ZW9yLnN0YXJ0dXAgdG8gZ2l2ZSBvdGhlciBwYWNrYWdlcyBhIGNoYW5jZSB0byBjYWxsXG4gICAgLy8gYWRkQXV0b3B1Ymxpc2hGaWVsZHMuXG4gICAgUGFja2FnZS5hdXRvcHVibGlzaCAmJiBNZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG4gICAgICAvLyBbJ3Byb2ZpbGUnLCAndXNlcm5hbWUnXSAtPiB7cHJvZmlsZTogMSwgdXNlcm5hbWU6IDF9XG4gICAgICBjb25zdCB0b0ZpZWxkU2VsZWN0b3IgPSBmaWVsZHMgPT4gZmllbGRzLnJlZHVjZSgocHJldiwgZmllbGQpID0+IChcbiAgICAgICAgICB7IC4uLnByZXYsIFtmaWVsZF06IDEgfSksXG4gICAgICAgIHt9XG4gICAgICApO1xuICAgICAgdGhpcy5fc2VydmVyLnB1Ymxpc2gobnVsbCwgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy51c2VySWQpIHtcbiAgICAgICAgICByZXR1cm4gdXNlcnMuZmluZCh7IF9pZDogdGhpcy51c2VySWQgfSwge1xuICAgICAgICAgICAgZmllbGRzOiB0b0ZpZWxkU2VsZWN0b3IoX2F1dG9wdWJsaXNoRmllbGRzLmxvZ2dlZEluVXNlciksXG4gICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgfSwgLypzdXBwcmVzcyBhdXRvcHVibGlzaCB3YXJuaW5nKi97aXNfYXV0bzogdHJ1ZX0pO1xuXG4gICAgICAvLyBYWFggdGhpcyBwdWJsaXNoIGlzIG5laXRoZXIgZGVkdXAtYWJsZSBub3IgaXMgaXQgb3B0aW1pemVkIGJ5IG91ciBzcGVjaWFsXG4gICAgICAvLyB0cmVhdG1lbnQgb2YgcXVlcmllcyBvbiBhIHNwZWNpZmljIF9pZC4gVGhlcmVmb3JlIHRoaXMgd2lsbCBoYXZlIE8obl4yKVxuICAgICAgLy8gcnVuLXRpbWUgcGVyZm9ybWFuY2UgZXZlcnkgdGltZSBhIHVzZXIgZG9jdW1lbnQgaXMgY2hhbmdlZCAoZWcgc29tZW9uZVxuICAgICAgLy8gbG9nZ2luZyBpbikuIElmIHRoaXMgaXMgYSBwcm9ibGVtLCB3ZSBjYW4gaW5zdGVhZCB3cml0ZSBhIG1hbnVhbCBwdWJsaXNoXG4gICAgICAvLyBmdW5jdGlvbiB3aGljaCBmaWx0ZXJzIG91dCBmaWVsZHMgYmFzZWQgb24gJ3RoaXMudXNlcklkJy5cbiAgICAgIHRoaXMuX3NlcnZlci5wdWJsaXNoKG51bGwsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc3Qgc2VsZWN0b3IgPSB0aGlzLnVzZXJJZCA/IHsgX2lkOiB7ICRuZTogdGhpcy51c2VySWQgfSB9IDoge307XG4gICAgICAgIHJldHVybiB1c2Vycy5maW5kKHNlbGVjdG9yLCB7XG4gICAgICAgICAgZmllbGRzOiB0b0ZpZWxkU2VsZWN0b3IoX2F1dG9wdWJsaXNoRmllbGRzLm90aGVyVXNlcnMpLFxuICAgICAgICB9KVxuICAgICAgfSwgLypzdXBwcmVzcyBhdXRvcHVibGlzaCB3YXJuaW5nKi97aXNfYXV0bzogdHJ1ZX0pO1xuICAgIH0pO1xuICB9O1xuXG4gIC8vIEFkZCB0byB0aGUgbGlzdCBvZiBmaWVsZHMgb3Igc3ViZmllbGRzIHRvIGJlIGF1dG9tYXRpY2FsbHlcbiAgLy8gcHVibGlzaGVkIGlmIGF1dG9wdWJsaXNoIGlzIG9uLiBNdXN0IGJlIGNhbGxlZCBmcm9tIHRvcC1sZXZlbFxuICAvLyBjb2RlIChpZSwgYmVmb3JlIE1ldGVvci5zdGFydHVwIGhvb2tzIHJ1bikuXG4gIC8vXG4gIC8vIEBwYXJhbSBvcHRzIHtPYmplY3R9IHdpdGg6XG4gIC8vICAgLSBmb3JMb2dnZWRJblVzZXIge0FycmF5fSBBcnJheSBvZiBmaWVsZHMgcHVibGlzaGVkIHRvIHRoZSBsb2dnZWQtaW4gdXNlclxuICAvLyAgIC0gZm9yT3RoZXJVc2VycyB7QXJyYXl9IEFycmF5IG9mIGZpZWxkcyBwdWJsaXNoZWQgdG8gdXNlcnMgdGhhdCBhcmVuJ3QgbG9nZ2VkIGluXG4gIGFkZEF1dG9wdWJsaXNoRmllbGRzKG9wdHMpIHtcbiAgICB0aGlzLl9hdXRvcHVibGlzaEZpZWxkcy5sb2dnZWRJblVzZXIucHVzaC5hcHBseShcbiAgICAgIHRoaXMuX2F1dG9wdWJsaXNoRmllbGRzLmxvZ2dlZEluVXNlciwgb3B0cy5mb3JMb2dnZWRJblVzZXIpO1xuICAgIHRoaXMuX2F1dG9wdWJsaXNoRmllbGRzLm90aGVyVXNlcnMucHVzaC5hcHBseShcbiAgICAgIHRoaXMuX2F1dG9wdWJsaXNoRmllbGRzLm90aGVyVXNlcnMsIG9wdHMuZm9yT3RoZXJVc2Vycyk7XG4gIH07XG5cbiAgLy8gUmVwbGFjZXMgdGhlIGZpZWxkcyB0byBiZSBhdXRvbWF0aWNhbGx5XG4gIC8vIHB1Ymxpc2hlZCB3aGVuIHRoZSB1c2VyIGxvZ3MgaW5cbiAgLy9cbiAgLy8gQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBmaWVsZHMgRGljdGlvbmFyeSBvZiBmaWVsZHMgdG8gcmV0dXJuIG9yIGV4Y2x1ZGUuXG4gIHNldERlZmF1bHRQdWJsaXNoRmllbGRzKGZpZWxkcykge1xuICAgIHRoaXMuX2RlZmF1bHRQdWJsaXNoRmllbGRzLnByb2plY3Rpb24gPSBmaWVsZHM7XG4gIH07XG5cbiAgLy8vXG4gIC8vLyBBQ0NPVU5UIERBVEFcbiAgLy8vXG5cbiAgLy8gSEFDSzogVGhpcyBpcyB1c2VkIGJ5ICdtZXRlb3ItYWNjb3VudHMnIHRvIGdldCB0aGUgbG9naW5Ub2tlbiBmb3IgYVxuICAvLyBjb25uZWN0aW9uLiBNYXliZSB0aGVyZSBzaG91bGQgYmUgYSBwdWJsaWMgd2F5IHRvIGRvIHRoYXQuXG4gIF9nZXRBY2NvdW50RGF0YShjb25uZWN0aW9uSWQsIGZpZWxkKSB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuX2FjY291bnREYXRhW2Nvbm5lY3Rpb25JZF07XG4gICAgcmV0dXJuIGRhdGEgJiYgZGF0YVtmaWVsZF07XG4gIH07XG5cbiAgX3NldEFjY291bnREYXRhKGNvbm5lY3Rpb25JZCwgZmllbGQsIHZhbHVlKSB7XG4gICAgY29uc3QgZGF0YSA9IHRoaXMuX2FjY291bnREYXRhW2Nvbm5lY3Rpb25JZF07XG5cbiAgICAvLyBzYWZldHkgYmVsdC4gc2hvdWxkbid0IGhhcHBlbi4gYWNjb3VudERhdGEgaXMgc2V0IGluIG9uQ29ubmVjdGlvbixcbiAgICAvLyB3ZSBkb24ndCBoYXZlIGEgY29ubmVjdGlvbklkIHVudGlsIGl0IGlzIHNldC5cbiAgICBpZiAoIWRhdGEpXG4gICAgICByZXR1cm47XG5cbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZClcbiAgICAgIGRlbGV0ZSBkYXRhW2ZpZWxkXTtcbiAgICBlbHNlXG4gICAgICBkYXRhW2ZpZWxkXSA9IHZhbHVlO1xuICB9O1xuXG4gIC8vL1xuICAvLy8gUkVDT05ORUNUIFRPS0VOU1xuICAvLy9cbiAgLy8vIHN1cHBvcnQgcmVjb25uZWN0aW5nIHVzaW5nIGEgbWV0ZW9yIGxvZ2luIHRva2VuXG5cbiAgX2hhc2hMb2dpblRva2VuKGxvZ2luVG9rZW4pIHtcbiAgICBjb25zdCBoYXNoID0gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpO1xuICAgIGhhc2gudXBkYXRlKGxvZ2luVG9rZW4pO1xuICAgIHJldHVybiBoYXNoLmRpZ2VzdCgnYmFzZTY0Jyk7XG4gIH07XG5cbiAgLy8ge3Rva2VuLCB3aGVufSA9PiB7aGFzaGVkVG9rZW4sIHdoZW59XG4gIF9oYXNoU3RhbXBlZFRva2VuKHN0YW1wZWRUb2tlbikge1xuICAgIGNvbnN0IHsgdG9rZW4sIC4uLmhhc2hlZFN0YW1wZWRUb2tlbiB9ID0gc3RhbXBlZFRva2VuO1xuICAgIHJldHVybiB7XG4gICAgICAuLi5oYXNoZWRTdGFtcGVkVG9rZW4sXG4gICAgICBoYXNoZWRUb2tlbjogdGhpcy5faGFzaExvZ2luVG9rZW4odG9rZW4pXG4gICAgfTtcbiAgfTtcblxuICAvLyBVc2luZyAkYWRkVG9TZXQgYXZvaWRzIGdldHRpbmcgYW4gaW5kZXggZXJyb3IgaWYgYW5vdGhlciBjbGllbnRcbiAgLy8gbG9nZ2luZyBpbiBzaW11bHRhbmVvdXNseSBoYXMgYWxyZWFkeSBpbnNlcnRlZCB0aGUgbmV3IGhhc2hlZFxuICAvLyB0b2tlbi5cbiAgX2luc2VydEhhc2hlZExvZ2luVG9rZW4odXNlcklkLCBoYXNoZWRUb2tlbiwgcXVlcnkpIHtcbiAgICBxdWVyeSA9IHF1ZXJ5ID8geyAuLi5xdWVyeSB9IDoge307XG4gICAgcXVlcnkuX2lkID0gdXNlcklkO1xuICAgIHRoaXMudXNlcnMudXBkYXRlKHF1ZXJ5LCB7XG4gICAgICAkYWRkVG9TZXQ6IHtcbiAgICAgICAgXCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnNcIjogaGFzaGVkVG9rZW5cbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcblxuICAvLyBFeHBvcnRlZCBmb3IgdGVzdHMuXG4gIF9pbnNlcnRMb2dpblRva2VuKHVzZXJJZCwgc3RhbXBlZFRva2VuLCBxdWVyeSkge1xuICAgIHRoaXMuX2luc2VydEhhc2hlZExvZ2luVG9rZW4oXG4gICAgICB1c2VySWQsXG4gICAgICB0aGlzLl9oYXNoU3RhbXBlZFRva2VuKHN0YW1wZWRUb2tlbiksXG4gICAgICBxdWVyeVxuICAgICk7XG4gIH07XG5cbiAgX2NsZWFyQWxsTG9naW5Ub2tlbnModXNlcklkKSB7XG4gICAgdGhpcy51c2Vycy51cGRhdGUodXNlcklkLCB7XG4gICAgICAkc2V0OiB7XG4gICAgICAgICdzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMnOiBbXVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xuXG4gIC8vIHRlc3QgaG9va1xuICBfZ2V0VXNlck9ic2VydmUoY29ubmVjdGlvbklkKSB7XG4gICAgcmV0dXJuIHRoaXMuX3VzZXJPYnNlcnZlc0ZvckNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF07XG4gIH07XG5cbiAgLy8gQ2xlYW4gdXAgdGhpcyBjb25uZWN0aW9uJ3MgYXNzb2NpYXRpb24gd2l0aCB0aGUgdG9rZW46IHRoYXQgaXMsIHN0b3BcbiAgLy8gdGhlIG9ic2VydmUgdGhhdCB3ZSBzdGFydGVkIHdoZW4gd2UgYXNzb2NpYXRlZCB0aGUgY29ubmVjdGlvbiB3aXRoXG4gIC8vIHRoaXMgdG9rZW4uXG4gIF9yZW1vdmVUb2tlbkZyb21Db25uZWN0aW9uKGNvbm5lY3Rpb25JZCkge1xuICAgIGlmIChoYXNPd24uY2FsbCh0aGlzLl91c2VyT2JzZXJ2ZXNGb3JDb25uZWN0aW9ucywgY29ubmVjdGlvbklkKSkge1xuICAgICAgY29uc3Qgb2JzZXJ2ZSA9IHRoaXMuX3VzZXJPYnNlcnZlc0ZvckNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF07XG4gICAgICBpZiAodHlwZW9mIG9ic2VydmUgPT09ICdudW1iZXInKSB7XG4gICAgICAgIC8vIFdlJ3JlIGluIHRoZSBwcm9jZXNzIG9mIHNldHRpbmcgdXAgYW4gb2JzZXJ2ZSBmb3IgdGhpcyBjb25uZWN0aW9uLiBXZVxuICAgICAgICAvLyBjYW4ndCBjbGVhbiB1cCB0aGF0IG9ic2VydmUgeWV0LCBidXQgaWYgd2UgZGVsZXRlIHRoZSBwbGFjZWhvbGRlciBmb3JcbiAgICAgICAgLy8gdGhpcyBjb25uZWN0aW9uLCB0aGVuIHRoZSBvYnNlcnZlIHdpbGwgZ2V0IGNsZWFuZWQgdXAgYXMgc29vbiBhcyBpdCBoYXNcbiAgICAgICAgLy8gYmVlbiBzZXQgdXAuXG4gICAgICAgIGRlbGV0ZSB0aGlzLl91c2VyT2JzZXJ2ZXNGb3JDb25uZWN0aW9uc1tjb25uZWN0aW9uSWRdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuX3VzZXJPYnNlcnZlc0ZvckNvbm5lY3Rpb25zW2Nvbm5lY3Rpb25JZF07XG4gICAgICAgIG9ic2VydmUuc3RvcCgpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcblxuICBfZ2V0TG9naW5Ub2tlbihjb25uZWN0aW9uSWQpIHtcbiAgICByZXR1cm4gdGhpcy5fZ2V0QWNjb3VudERhdGEoY29ubmVjdGlvbklkLCAnbG9naW5Ub2tlbicpO1xuICB9O1xuXG4gIC8vIG5ld1Rva2VuIGlzIGEgaGFzaGVkIHRva2VuLlxuICBfc2V0TG9naW5Ub2tlbih1c2VySWQsIGNvbm5lY3Rpb24sIG5ld1Rva2VuKSB7XG4gICAgdGhpcy5fcmVtb3ZlVG9rZW5Gcm9tQ29ubmVjdGlvbihjb25uZWN0aW9uLmlkKTtcbiAgICB0aGlzLl9zZXRBY2NvdW50RGF0YShjb25uZWN0aW9uLmlkLCAnbG9naW5Ub2tlbicsIG5ld1Rva2VuKTtcblxuICAgIGlmIChuZXdUb2tlbikge1xuICAgICAgLy8gU2V0IHVwIGFuIG9ic2VydmUgZm9yIHRoaXMgdG9rZW4uIElmIHRoZSB0b2tlbiBnb2VzIGF3YXksIHdlIG5lZWRcbiAgICAgIC8vIHRvIGNsb3NlIHRoZSBjb25uZWN0aW9uLiAgV2UgZGVmZXIgdGhlIG9ic2VydmUgYmVjYXVzZSB0aGVyZSdzXG4gICAgICAvLyBubyBuZWVkIGZvciBpdCB0byBiZSBvbiB0aGUgY3JpdGljYWwgcGF0aCBmb3IgbG9naW47IHdlIGp1c3QgbmVlZFxuICAgICAgLy8gdG8gZW5zdXJlIHRoYXQgdGhlIGNvbm5lY3Rpb24gd2lsbCBnZXQgY2xvc2VkIGF0IHNvbWUgcG9pbnQgaWZcbiAgICAgIC8vIHRoZSB0b2tlbiBnZXRzIGRlbGV0ZWQuXG4gICAgICAvL1xuICAgICAgLy8gSW5pdGlhbGx5LCB3ZSBzZXQgdGhlIG9ic2VydmUgZm9yIHRoaXMgY29ubmVjdGlvbiB0byBhIG51bWJlcjsgdGhpc1xuICAgICAgLy8gc2lnbmlmaWVzIHRvIG90aGVyIGNvZGUgKHdoaWNoIG1pZ2h0IHJ1biB3aGlsZSB3ZSB5aWVsZCkgdGhhdCB3ZSBhcmUgaW5cbiAgICAgIC8vIHRoZSBwcm9jZXNzIG9mIHNldHRpbmcgdXAgYW4gb2JzZXJ2ZSBmb3IgdGhpcyBjb25uZWN0aW9uLiBPbmNlIHRoZVxuICAgICAgLy8gb2JzZXJ2ZSBpcyByZWFkeSB0byBnbywgd2UgcmVwbGFjZSB0aGUgbnVtYmVyIHdpdGggdGhlIHJlYWwgb2JzZXJ2ZVxuICAgICAgLy8gaGFuZGxlICh1bmxlc3MgdGhlIHBsYWNlaG9sZGVyIGhhcyBiZWVuIGRlbGV0ZWQgb3IgcmVwbGFjZWQgYnkgYVxuICAgICAgLy8gZGlmZmVyZW50IHBsYWNlaG9sZCBudW1iZXIsIHNpZ25pZnlpbmcgdGhhdCB0aGUgY29ubmVjdGlvbiB3YXMgY2xvc2VkXG4gICAgICAvLyBhbHJlYWR5IC0tIGluIHRoaXMgY2FzZSB3ZSBqdXN0IGNsZWFuIHVwIHRoZSBvYnNlcnZlIHRoYXQgd2Ugc3RhcnRlZCkuXG4gICAgICBjb25zdCBteU9ic2VydmVOdW1iZXIgPSArK3RoaXMuX25leHRVc2VyT2JzZXJ2ZU51bWJlcjtcbiAgICAgIHRoaXMuX3VzZXJPYnNlcnZlc0ZvckNvbm5lY3Rpb25zW2Nvbm5lY3Rpb24uaWRdID0gbXlPYnNlcnZlTnVtYmVyO1xuICAgICAgTWV0ZW9yLmRlZmVyKCgpID0+IHtcbiAgICAgICAgLy8gSWYgc29tZXRoaW5nIGVsc2UgaGFwcGVuZWQgb24gdGhpcyBjb25uZWN0aW9uIGluIHRoZSBtZWFudGltZSAoaXQgZ290XG4gICAgICAgIC8vIGNsb3NlZCwgb3IgYW5vdGhlciBjYWxsIHRvIF9zZXRMb2dpblRva2VuIGhhcHBlbmVkKSwganVzdCBkb1xuICAgICAgICAvLyBub3RoaW5nLiBXZSBkb24ndCBuZWVkIHRvIHN0YXJ0IGFuIG9ic2VydmUgZm9yIGFuIG9sZCBjb25uZWN0aW9uIG9yIG9sZFxuICAgICAgICAvLyB0b2tlbi5cbiAgICAgICAgaWYgKHRoaXMuX3VzZXJPYnNlcnZlc0ZvckNvbm5lY3Rpb25zW2Nvbm5lY3Rpb24uaWRdICE9PSBteU9ic2VydmVOdW1iZXIpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgZm91bmRNYXRjaGluZ1VzZXI7XG4gICAgICAgIC8vIEJlY2F1c2Ugd2UgdXBncmFkZSB1bmhhc2hlZCBsb2dpbiB0b2tlbnMgdG8gaGFzaGVkIHRva2VucyBhdFxuICAgICAgICAvLyBsb2dpbiB0aW1lLCBzZXNzaW9ucyB3aWxsIG9ubHkgYmUgbG9nZ2VkIGluIHdpdGggYSBoYXNoZWRcbiAgICAgICAgLy8gdG9rZW4uIFRodXMgd2Ugb25seSBuZWVkIHRvIG9ic2VydmUgaGFzaGVkIHRva2VucyBoZXJlLlxuICAgICAgICBjb25zdCBvYnNlcnZlID0gdGhpcy51c2Vycy5maW5kKHtcbiAgICAgICAgICBfaWQ6IHVzZXJJZCxcbiAgICAgICAgICAnc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zLmhhc2hlZFRva2VuJzogbmV3VG9rZW5cbiAgICAgICAgfSwgeyBmaWVsZHM6IHsgX2lkOiAxIH0gfSkub2JzZXJ2ZUNoYW5nZXMoe1xuICAgICAgICAgIGFkZGVkOiAoKSA9PiB7XG4gICAgICAgICAgICBmb3VuZE1hdGNoaW5nVXNlciA9IHRydWU7XG4gICAgICAgICAgfSxcbiAgICAgICAgICByZW1vdmVkOiBjb25uZWN0aW9uLmNsb3NlLFxuICAgICAgICAgIC8vIFRoZSBvbkNsb3NlIGNhbGxiYWNrIGZvciB0aGUgY29ubmVjdGlvbiB0YWtlcyBjYXJlIG9mXG4gICAgICAgICAgLy8gY2xlYW5pbmcgdXAgdGhlIG9ic2VydmUgaGFuZGxlIGFuZCBhbnkgb3RoZXIgc3RhdGUgd2UgaGF2ZVxuICAgICAgICAgIC8vIGx5aW5nIGFyb3VuZC5cbiAgICAgICAgfSwgeyBub25NdXRhdGluZ0NhbGxiYWNrczogdHJ1ZSB9KTtcblxuICAgICAgICAvLyBJZiB0aGUgdXNlciByYW4gYW5vdGhlciBsb2dpbiBvciBsb2dvdXQgY29tbWFuZCB3ZSB3ZXJlIHdhaXRpbmcgZm9yIHRoZVxuICAgICAgICAvLyBkZWZlciBvciBhZGRlZCB0byBmaXJlIChpZSwgYW5vdGhlciBjYWxsIHRvIF9zZXRMb2dpblRva2VuIG9jY3VycmVkKSxcbiAgICAgICAgLy8gdGhlbiB3ZSBsZXQgdGhlIGxhdGVyIG9uZSB3aW4gKHN0YXJ0IGFuIG9ic2VydmUsIGV0YykgYW5kIGp1c3Qgc3RvcCBvdXJcbiAgICAgICAgLy8gb2JzZXJ2ZSBub3cuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFNpbWlsYXJseSwgaWYgdGhlIGNvbm5lY3Rpb24gd2FzIGFscmVhZHkgY2xvc2VkLCB0aGVuIHRoZSBvbkNsb3NlXG4gICAgICAgIC8vIGNhbGxiYWNrIHdvdWxkIGhhdmUgY2FsbGVkIF9yZW1vdmVUb2tlbkZyb21Db25uZWN0aW9uIGFuZCB0aGVyZSB3b24ndFxuICAgICAgICAvLyBiZSBhbiBlbnRyeSBpbiBfdXNlck9ic2VydmVzRm9yQ29ubmVjdGlvbnMuIFdlIGNhbiBzdG9wIHRoZSBvYnNlcnZlLlxuICAgICAgICBpZiAodGhpcy5fdXNlck9ic2VydmVzRm9yQ29ubmVjdGlvbnNbY29ubmVjdGlvbi5pZF0gIT09IG15T2JzZXJ2ZU51bWJlcikge1xuICAgICAgICAgIG9ic2VydmUuc3RvcCgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX3VzZXJPYnNlcnZlc0ZvckNvbm5lY3Rpb25zW2Nvbm5lY3Rpb24uaWRdID0gb2JzZXJ2ZTtcblxuICAgICAgICBpZiAoISBmb3VuZE1hdGNoaW5nVXNlcikge1xuICAgICAgICAgIC8vIFdlJ3ZlIHNldCB1cCBhbiBvYnNlcnZlIG9uIHRoZSB1c2VyIGFzc29jaWF0ZWQgd2l0aCBgbmV3VG9rZW5gLFxuICAgICAgICAgIC8vIHNvIGlmIHRoZSBuZXcgdG9rZW4gaXMgcmVtb3ZlZCBmcm9tIHRoZSBkYXRhYmFzZSwgd2UnbGwgY2xvc2VcbiAgICAgICAgICAvLyB0aGUgY29ubmVjdGlvbi4gQnV0IHRoZSB0b2tlbiBtaWdodCBoYXZlIGFscmVhZHkgYmVlbiBkZWxldGVkXG4gICAgICAgICAgLy8gYmVmb3JlIHdlIHNldCB1cCB0aGUgb2JzZXJ2ZSwgd2hpY2ggd291bGRuJ3QgaGF2ZSBjbG9zZWQgdGhlXG4gICAgICAgICAgLy8gY29ubmVjdGlvbiBiZWNhdXNlIHRoZSBvYnNlcnZlIHdhc24ndCBydW5uaW5nIHlldC5cbiAgICAgICAgICBjb25uZWN0aW9uLmNsb3NlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICAvLyAoQWxzbyB1c2VkIGJ5IE1ldGVvciBBY2NvdW50cyBzZXJ2ZXIgYW5kIHRlc3RzKS5cbiAgLy9cbiAgX2dlbmVyYXRlU3RhbXBlZExvZ2luVG9rZW4oKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRva2VuOiBSYW5kb20uc2VjcmV0KCksXG4gICAgICB3aGVuOiBuZXcgRGF0ZVxuICAgIH07XG4gIH07XG5cbiAgLy8vXG4gIC8vLyBUT0tFTiBFWFBJUkFUSU9OXG4gIC8vL1xuXG4gIC8vIERlbGV0ZXMgZXhwaXJlZCBwYXNzd29yZCByZXNldCB0b2tlbnMgZnJvbSB0aGUgZGF0YWJhc2UuXG4gIC8vXG4gIC8vIEV4cG9ydGVkIGZvciB0ZXN0cy4gQWxzbywgdGhlIGFyZ3VtZW50cyBhcmUgb25seSB1c2VkIGJ5XG4gIC8vIHRlc3RzLiBvbGRlc3RWYWxpZERhdGUgaXMgc2ltdWxhdGUgZXhwaXJpbmcgdG9rZW5zIHdpdGhvdXQgd2FpdGluZ1xuICAvLyBmb3IgdGhlbSB0byBhY3R1YWxseSBleHBpcmUuIHVzZXJJZCBpcyB1c2VkIGJ5IHRlc3RzIHRvIG9ubHkgZXhwaXJlXG4gIC8vIHRva2VucyBmb3IgdGhlIHRlc3QgdXNlci5cbiAgX2V4cGlyZVBhc3N3b3JkUmVzZXRUb2tlbnMob2xkZXN0VmFsaWREYXRlLCB1c2VySWQpIHtcbiAgICBjb25zdCB0b2tlbkxpZmV0aW1lTXMgPSB0aGlzLl9nZXRQYXNzd29yZFJlc2V0VG9rZW5MaWZldGltZU1zKCk7XG5cbiAgICAvLyB3aGVuIGNhbGxpbmcgZnJvbSBhIHRlc3Qgd2l0aCBleHRyYSBhcmd1bWVudHMsIHlvdSBtdXN0IHNwZWNpZnkgYm90aCFcbiAgICBpZiAoKG9sZGVzdFZhbGlkRGF0ZSAmJiAhdXNlcklkKSB8fCAoIW9sZGVzdFZhbGlkRGF0ZSAmJiB1c2VySWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCYWQgdGVzdC4gTXVzdCBzcGVjaWZ5IGJvdGggb2xkZXN0VmFsaWREYXRlIGFuZCB1c2VySWQuXCIpO1xuICAgIH1cblxuICAgIG9sZGVzdFZhbGlkRGF0ZSA9IG9sZGVzdFZhbGlkRGF0ZSB8fFxuICAgICAgKG5ldyBEYXRlKG5ldyBEYXRlKCkgLSB0b2tlbkxpZmV0aW1lTXMpKTtcblxuICAgIGNvbnN0IHRva2VuRmlsdGVyID0ge1xuICAgICAgJG9yOiBbXG4gICAgICAgIHsgXCJzZXJ2aWNlcy5wYXNzd29yZC5yZXNldC5yZWFzb25cIjogXCJyZXNldFwifSxcbiAgICAgICAgeyBcInNlcnZpY2VzLnBhc3N3b3JkLnJlc2V0LnJlYXNvblwiOiB7JGV4aXN0czogZmFsc2V9fVxuICAgICAgXVxuICAgIH07XG5cbiAgICBleHBpcmVQYXNzd29yZFRva2VuKHRoaXMsIG9sZGVzdFZhbGlkRGF0ZSwgdG9rZW5GaWx0ZXIsIHVzZXJJZCk7XG4gIH1cblxuICAvLyBEZWxldGVzIGV4cGlyZWQgcGFzc3dvcmQgZW5yb2xsIHRva2VucyBmcm9tIHRoZSBkYXRhYmFzZS5cbiAgLy9cbiAgLy8gRXhwb3J0ZWQgZm9yIHRlc3RzLiBBbHNvLCB0aGUgYXJndW1lbnRzIGFyZSBvbmx5IHVzZWQgYnlcbiAgLy8gdGVzdHMuIG9sZGVzdFZhbGlkRGF0ZSBpcyBzaW11bGF0ZSBleHBpcmluZyB0b2tlbnMgd2l0aG91dCB3YWl0aW5nXG4gIC8vIGZvciB0aGVtIHRvIGFjdHVhbGx5IGV4cGlyZS4gdXNlcklkIGlzIHVzZWQgYnkgdGVzdHMgdG8gb25seSBleHBpcmVcbiAgLy8gdG9rZW5zIGZvciB0aGUgdGVzdCB1c2VyLlxuICBfZXhwaXJlUGFzc3dvcmRFbnJvbGxUb2tlbnMob2xkZXN0VmFsaWREYXRlLCB1c2VySWQpIHtcbiAgICBjb25zdCB0b2tlbkxpZmV0aW1lTXMgPSB0aGlzLl9nZXRQYXNzd29yZEVucm9sbFRva2VuTGlmZXRpbWVNcygpO1xuXG4gICAgLy8gd2hlbiBjYWxsaW5nIGZyb20gYSB0ZXN0IHdpdGggZXh0cmEgYXJndW1lbnRzLCB5b3UgbXVzdCBzcGVjaWZ5IGJvdGghXG4gICAgaWYgKChvbGRlc3RWYWxpZERhdGUgJiYgIXVzZXJJZCkgfHwgKCFvbGRlc3RWYWxpZERhdGUgJiYgdXNlcklkKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQmFkIHRlc3QuIE11c3Qgc3BlY2lmeSBib3RoIG9sZGVzdFZhbGlkRGF0ZSBhbmQgdXNlcklkLlwiKTtcbiAgICB9XG5cbiAgICBvbGRlc3RWYWxpZERhdGUgPSBvbGRlc3RWYWxpZERhdGUgfHxcbiAgICAgIChuZXcgRGF0ZShuZXcgRGF0ZSgpIC0gdG9rZW5MaWZldGltZU1zKSk7XG5cbiAgICBjb25zdCB0b2tlbkZpbHRlciA9IHtcbiAgICAgIFwic2VydmljZXMucGFzc3dvcmQucmVzZXQucmVhc29uXCI6IFwiZW5yb2xsXCJcbiAgICB9O1xuXG4gICAgZXhwaXJlUGFzc3dvcmRUb2tlbih0aGlzLCBvbGRlc3RWYWxpZERhdGUsIHRva2VuRmlsdGVyLCB1c2VySWQpO1xuICB9XG5cbiAgLy8gRGVsZXRlcyBleHBpcmVkIHRva2VucyBmcm9tIHRoZSBkYXRhYmFzZSBhbmQgY2xvc2VzIGFsbCBvcGVuIGNvbm5lY3Rpb25zXG4gIC8vIGFzc29jaWF0ZWQgd2l0aCB0aGVzZSB0b2tlbnMuXG4gIC8vXG4gIC8vIEV4cG9ydGVkIGZvciB0ZXN0cy4gQWxzbywgdGhlIGFyZ3VtZW50cyBhcmUgb25seSB1c2VkIGJ5XG4gIC8vIHRlc3RzLiBvbGRlc3RWYWxpZERhdGUgaXMgc2ltdWxhdGUgZXhwaXJpbmcgdG9rZW5zIHdpdGhvdXQgd2FpdGluZ1xuICAvLyBmb3IgdGhlbSB0byBhY3R1YWxseSBleHBpcmUuIHVzZXJJZCBpcyB1c2VkIGJ5IHRlc3RzIHRvIG9ubHkgZXhwaXJlXG4gIC8vIHRva2VucyBmb3IgdGhlIHRlc3QgdXNlci5cbiAgX2V4cGlyZVRva2VucyhvbGRlc3RWYWxpZERhdGUsIHVzZXJJZCkge1xuICAgIGNvbnN0IHRva2VuTGlmZXRpbWVNcyA9IHRoaXMuX2dldFRva2VuTGlmZXRpbWVNcygpO1xuXG4gICAgLy8gd2hlbiBjYWxsaW5nIGZyb20gYSB0ZXN0IHdpdGggZXh0cmEgYXJndW1lbnRzLCB5b3UgbXVzdCBzcGVjaWZ5IGJvdGghXG4gICAgaWYgKChvbGRlc3RWYWxpZERhdGUgJiYgIXVzZXJJZCkgfHwgKCFvbGRlc3RWYWxpZERhdGUgJiYgdXNlcklkKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQmFkIHRlc3QuIE11c3Qgc3BlY2lmeSBib3RoIG9sZGVzdFZhbGlkRGF0ZSBhbmQgdXNlcklkLlwiKTtcbiAgICB9XG5cbiAgICBvbGRlc3RWYWxpZERhdGUgPSBvbGRlc3RWYWxpZERhdGUgfHxcbiAgICAgIChuZXcgRGF0ZShuZXcgRGF0ZSgpIC0gdG9rZW5MaWZldGltZU1zKSk7XG4gICAgY29uc3QgdXNlckZpbHRlciA9IHVzZXJJZCA/IHtfaWQ6IHVzZXJJZH0gOiB7fTtcblxuXG4gICAgLy8gQmFja3dhcmRzIGNvbXBhdGlibGUgd2l0aCBvbGRlciB2ZXJzaW9ucyBvZiBtZXRlb3IgdGhhdCBzdG9yZWQgbG9naW4gdG9rZW5cbiAgICAvLyB0aW1lc3RhbXBzIGFzIG51bWJlcnMuXG4gICAgdGhpcy51c2Vycy51cGRhdGUoeyAuLi51c2VyRmlsdGVyLFxuICAgICAgJG9yOiBbXG4gICAgICAgIHsgXCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMud2hlblwiOiB7ICRsdDogb2xkZXN0VmFsaWREYXRlIH0gfSxcbiAgICAgICAgeyBcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy53aGVuXCI6IHsgJGx0OiArb2xkZXN0VmFsaWREYXRlIH0gfVxuICAgICAgXVxuICAgIH0sIHtcbiAgICAgICRwdWxsOiB7XG4gICAgICAgIFwic2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zXCI6IHtcbiAgICAgICAgICAkb3I6IFtcbiAgICAgICAgICAgIHsgd2hlbjogeyAkbHQ6IG9sZGVzdFZhbGlkRGF0ZSB9IH0sXG4gICAgICAgICAgICB7IHdoZW46IHsgJGx0OiArb2xkZXN0VmFsaWREYXRlIH0gfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sIHsgbXVsdGk6IHRydWUgfSk7XG4gICAgLy8gVGhlIG9ic2VydmUgb24gTWV0ZW9yLnVzZXJzIHdpbGwgdGFrZSBjYXJlIG9mIGNsb3NpbmcgY29ubmVjdGlvbnMgZm9yXG4gICAgLy8gZXhwaXJlZCB0b2tlbnMuXG4gIH07XG5cbiAgLy8gQG92ZXJyaWRlIGZyb20gYWNjb3VudHNfY29tbW9uLmpzXG4gIGNvbmZpZyhvcHRpb25zKSB7XG4gICAgLy8gQ2FsbCB0aGUgb3ZlcnJpZGRlbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgbWV0aG9kLlxuICAgIGNvbnN0IHN1cGVyUmVzdWx0ID0gQWNjb3VudHNDb21tb24ucHJvdG90eXBlLmNvbmZpZy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gICAgLy8gSWYgdGhlIHVzZXIgc2V0IGxvZ2luRXhwaXJhdGlvbkluRGF5cyB0byBudWxsLCB0aGVuIHdlIG5lZWQgdG8gY2xlYXIgdGhlXG4gICAgLy8gdGltZXIgdGhhdCBwZXJpb2RpY2FsbHkgZXhwaXJlcyB0b2tlbnMuXG4gICAgaWYgKGhhc093bi5jYWxsKHRoaXMuX29wdGlvbnMsICdsb2dpbkV4cGlyYXRpb25JbkRheXMnKSAmJlxuICAgICAgdGhpcy5fb3B0aW9ucy5sb2dpbkV4cGlyYXRpb25JbkRheXMgPT09IG51bGwgJiZcbiAgICAgIHRoaXMuZXhwaXJlVG9rZW5JbnRlcnZhbCkge1xuICAgICAgTWV0ZW9yLmNsZWFySW50ZXJ2YWwodGhpcy5leHBpcmVUb2tlbkludGVydmFsKTtcbiAgICAgIHRoaXMuZXhwaXJlVG9rZW5JbnRlcnZhbCA9IG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1cGVyUmVzdWx0O1xuICB9O1xuXG4gIC8vIENhbGxlZCBieSBhY2NvdW50cy1wYXNzd29yZFxuICBpbnNlcnRVc2VyRG9jKG9wdGlvbnMsIHVzZXIpIHtcbiAgICAvLyAtIGNsb25lIHVzZXIgZG9jdW1lbnQsIHRvIHByb3RlY3QgZnJvbSBtb2RpZmljYXRpb25cbiAgICAvLyAtIGFkZCBjcmVhdGVkQXQgdGltZXN0YW1wXG4gICAgLy8gLSBwcmVwYXJlIGFuIF9pZCwgc28gdGhhdCB5b3UgY2FuIG1vZGlmeSBvdGhlciBjb2xsZWN0aW9ucyAoZWdcbiAgICAvLyBjcmVhdGUgYSBmaXJzdCB0YXNrIGZvciBldmVyeSBuZXcgdXNlcilcbiAgICAvL1xuICAgIC8vIFhYWCBJZiB0aGUgb25DcmVhdGVVc2VyIG9yIHZhbGlkYXRlTmV3VXNlciBob29rcyBmYWlsLCB3ZSBtaWdodFxuICAgIC8vIGVuZCB1cCBoYXZpbmcgbW9kaWZpZWQgc29tZSBvdGhlciBjb2xsZWN0aW9uXG4gICAgLy8gaW5hcHByb3ByaWF0ZWx5LiBUaGUgc29sdXRpb24gaXMgcHJvYmFibHkgdG8gaGF2ZSBvbkNyZWF0ZVVzZXJcbiAgICAvLyBhY2NlcHQgdHdvIGNhbGxiYWNrcyAtIG9uZSB0aGF0IGdldHMgY2FsbGVkIGJlZm9yZSBpbnNlcnRpbmdcbiAgICAvLyB0aGUgdXNlciBkb2N1bWVudCAoaW4gd2hpY2ggeW91IGNhbiBtb2RpZnkgaXRzIGNvbnRlbnRzKSwgYW5kXG4gICAgLy8gb25lIHRoYXQgZ2V0cyBjYWxsZWQgYWZ0ZXIgKGluIHdoaWNoIHlvdSBzaG91bGQgY2hhbmdlIG90aGVyXG4gICAgLy8gY29sbGVjdGlvbnMpXG4gICAgdXNlciA9IHtcbiAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcbiAgICAgIF9pZDogUmFuZG9tLmlkKCksXG4gICAgICAuLi51c2VyLFxuICAgIH07XG5cbiAgICBpZiAodXNlci5zZXJ2aWNlcykge1xuICAgICAgT2JqZWN0LmtleXModXNlci5zZXJ2aWNlcykuZm9yRWFjaChzZXJ2aWNlID0+XG4gICAgICAgIHBpbkVuY3J5cHRlZEZpZWxkc1RvVXNlcih1c2VyLnNlcnZpY2VzW3NlcnZpY2VdLCB1c2VyLl9pZClcbiAgICAgICk7XG4gICAgfVxuXG4gICAgbGV0IGZ1bGxVc2VyO1xuICAgIGlmICh0aGlzLl9vbkNyZWF0ZVVzZXJIb29rKSB7XG4gICAgICBmdWxsVXNlciA9IHRoaXMuX29uQ3JlYXRlVXNlckhvb2sob3B0aW9ucywgdXNlcik7XG5cbiAgICAgIC8vIFRoaXMgaXMgKm5vdCogcGFydCBvZiB0aGUgQVBJLiBXZSBuZWVkIHRoaXMgYmVjYXVzZSB3ZSBjYW4ndCBpc29sYXRlXG4gICAgICAvLyB0aGUgZ2xvYmFsIHNlcnZlciBlbnZpcm9ubWVudCBiZXR3ZWVuIHRlc3RzLCBtZWFuaW5nIHdlIGNhbid0IHRlc3RcbiAgICAgIC8vIGJvdGggaGF2aW5nIGEgY3JlYXRlIHVzZXIgaG9vayBzZXQgYW5kIG5vdCBoYXZpbmcgb25lIHNldC5cbiAgICAgIGlmIChmdWxsVXNlciA9PT0gJ1RFU1QgREVGQVVMVCBIT09LJylcbiAgICAgICAgZnVsbFVzZXIgPSBkZWZhdWx0Q3JlYXRlVXNlckhvb2sob3B0aW9ucywgdXNlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgIGZ1bGxVc2VyID0gZGVmYXVsdENyZWF0ZVVzZXJIb29rKG9wdGlvbnMsIHVzZXIpO1xuICAgIH1cblxuICAgIHRoaXMuX3ZhbGlkYXRlTmV3VXNlckhvb2tzLmZvckVhY2goaG9vayA9PiB7XG4gICAgICBpZiAoISBob29rKGZ1bGxVc2VyKSlcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVXNlciB2YWxpZGF0aW9uIGZhaWxlZFwiKTtcbiAgICB9KTtcblxuICAgIGxldCB1c2VySWQ7XG4gICAgdHJ5IHtcbiAgICAgIHVzZXJJZCA9IHRoaXMudXNlcnMuaW5zZXJ0KGZ1bGxVc2VyKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAvLyBYWFggc3RyaW5nIHBhcnNpbmcgc3Vja3MsIG1heWJlXG4gICAgICAvLyBodHRwczovL2ppcmEubW9uZ29kYi5vcmcvYnJvd3NlL1NFUlZFUi0zMDY5IHdpbGwgZ2V0IGZpeGVkIG9uZSBkYXlcbiAgICAgIGlmICghZS5lcnJtc2cpIHRocm93IGU7XG4gICAgICBpZiAoZS5lcnJtc2cuaW5jbHVkZXMoJ2VtYWlscy5hZGRyZXNzJykpXG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIkVtYWlsIGFscmVhZHkgZXhpc3RzLlwiKTtcbiAgICAgIGlmIChlLmVycm1zZy5pbmNsdWRlcygndXNlcm5hbWUnKSlcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVXNlcm5hbWUgYWxyZWFkeSBleGlzdHMuXCIpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG4gICAgcmV0dXJuIHVzZXJJZDtcbiAgfTtcblxuICAvLyBIZWxwZXIgZnVuY3Rpb246IHJldHVybnMgZmFsc2UgaWYgZW1haWwgZG9lcyBub3QgbWF0Y2ggY29tcGFueSBkb21haW4gZnJvbVxuICAvLyB0aGUgY29uZmlndXJhdGlvbi5cbiAgX3Rlc3RFbWFpbERvbWFpbihlbWFpbCkge1xuICAgIGNvbnN0IGRvbWFpbiA9IHRoaXMuX29wdGlvbnMucmVzdHJpY3RDcmVhdGlvbkJ5RW1haWxEb21haW47XG5cbiAgICByZXR1cm4gIWRvbWFpbiB8fFxuICAgICAgKHR5cGVvZiBkb21haW4gPT09ICdmdW5jdGlvbicgJiYgZG9tYWluKGVtYWlsKSkgfHxcbiAgICAgICh0eXBlb2YgZG9tYWluID09PSAnc3RyaW5nJyAmJlxuICAgICAgICAobmV3IFJlZ0V4cChgQCR7TWV0ZW9yLl9lc2NhcGVSZWdFeHAoZG9tYWluKX0kYCwgJ2knKSkudGVzdChlbWFpbCkpO1xuICB9O1xuXG4gIC8vL1xuICAvLy8gQ0xFQU4gVVAgRk9SIGBsb2dvdXRPdGhlckNsaWVudHNgXG4gIC8vL1xuXG4gIF9kZWxldGVTYXZlZFRva2Vuc0ZvclVzZXIodXNlcklkLCB0b2tlbnNUb0RlbGV0ZSkge1xuICAgIGlmICh0b2tlbnNUb0RlbGV0ZSkge1xuICAgICAgdGhpcy51c2Vycy51cGRhdGUodXNlcklkLCB7XG4gICAgICAgICR1bnNldDoge1xuICAgICAgICAgIFwic2VydmljZXMucmVzdW1lLmhhdmVMb2dpblRva2Vuc1RvRGVsZXRlXCI6IDEsXG4gICAgICAgICAgXCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnNUb0RlbGV0ZVwiOiAxXG4gICAgICAgIH0sXG4gICAgICAgICRwdWxsQWxsOiB7XG4gICAgICAgICAgXCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnNcIjogdG9rZW5zVG9EZWxldGVcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIF9kZWxldGVTYXZlZFRva2Vuc0ZvckFsbFVzZXJzT25TdGFydHVwKCkge1xuICAgIC8vIElmIHdlIGZpbmQgdXNlcnMgd2hvIGhhdmUgc2F2ZWQgdG9rZW5zIHRvIGRlbGV0ZSBvbiBzdGFydHVwLCBkZWxldGVcbiAgICAvLyB0aGVtIG5vdy4gSXQncyBwb3NzaWJsZSB0aGF0IHRoZSBzZXJ2ZXIgY291bGQgaGF2ZSBjcmFzaGVkIGFuZCBjb21lXG4gICAgLy8gYmFjayB1cCBiZWZvcmUgbmV3IHRva2VucyBhcmUgZm91bmQgaW4gbG9jYWxTdG9yYWdlLCBidXQgdGhpc1xuICAgIC8vIHNob3VsZG4ndCBoYXBwZW4gdmVyeSBvZnRlbi4gV2Ugc2hvdWxkbid0IHB1dCBhIGRlbGF5IGhlcmUgYmVjYXVzZVxuICAgIC8vIHRoYXQgd291bGQgZ2l2ZSBhIGxvdCBvZiBwb3dlciB0byBhbiBhdHRhY2tlciB3aXRoIGEgc3RvbGVuIGxvZ2luXG4gICAgLy8gdG9rZW4gYW5kIHRoZSBhYmlsaXR5IHRvIGNyYXNoIHRoZSBzZXJ2ZXIuXG4gICAgTWV0ZW9yLnN0YXJ0dXAoKCkgPT4ge1xuICAgICAgdGhpcy51c2Vycy5maW5kKHtcbiAgICAgICAgXCJzZXJ2aWNlcy5yZXN1bWUuaGF2ZUxvZ2luVG9rZW5zVG9EZWxldGVcIjogdHJ1ZVxuICAgICAgfSwge2ZpZWxkczoge1xuICAgICAgICBcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vuc1RvRGVsZXRlXCI6IDFcbiAgICAgIH19KS5mb3JFYWNoKHVzZXIgPT4ge1xuICAgICAgICB0aGlzLl9kZWxldGVTYXZlZFRva2Vuc0ZvclVzZXIoXG4gICAgICAgICAgdXNlci5faWQsXG4gICAgICAgICAgdXNlci5zZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnNUb0RlbGV0ZVxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH07XG5cbiAgLy8vXG4gIC8vLyBNQU5BR0lORyBVU0VSIE9CSkVDVFNcbiAgLy8vXG5cbiAgLy8gVXBkYXRlcyBvciBjcmVhdGVzIGEgdXNlciBhZnRlciB3ZSBhdXRoZW50aWNhdGUgd2l0aCBhIDNyZCBwYXJ0eS5cbiAgLy9cbiAgLy8gQHBhcmFtIHNlcnZpY2VOYW1lIHtTdHJpbmd9IFNlcnZpY2UgbmFtZSAoZWcsIHR3aXR0ZXIpLlxuICAvLyBAcGFyYW0gc2VydmljZURhdGEge09iamVjdH0gRGF0YSB0byBzdG9yZSBpbiB0aGUgdXNlcidzIHJlY29yZFxuICAvLyAgICAgICAgdW5kZXIgc2VydmljZXNbc2VydmljZU5hbWVdLiBNdXN0IGluY2x1ZGUgYW4gXCJpZFwiIGZpZWxkXG4gIC8vICAgICAgICB3aGljaCBpcyBhIHVuaXF1ZSBpZGVudGlmaWVyIGZvciB0aGUgdXNlciBpbiB0aGUgc2VydmljZS5cbiAgLy8gQHBhcmFtIG9wdGlvbnMge09iamVjdCwgb3B0aW9uYWx9IE90aGVyIG9wdGlvbnMgdG8gcGFzcyB0byBpbnNlcnRVc2VyRG9jXG4gIC8vICAgICAgICAoZWcsIHByb2ZpbGUpXG4gIC8vIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHRva2VuIGFuZCBpZCBrZXlzLCBsaWtlIHRoZSByZXN1bHRcbiAgLy8gICAgICAgIG9mIHRoZSBcImxvZ2luXCIgbWV0aG9kLlxuICAvL1xuICB1cGRhdGVPckNyZWF0ZVVzZXJGcm9tRXh0ZXJuYWxTZXJ2aWNlKFxuICAgIHNlcnZpY2VOYW1lLFxuICAgIHNlcnZpY2VEYXRhLFxuICAgIG9wdGlvbnNcbiAgKSB7XG4gICAgb3B0aW9ucyA9IHsgLi4ub3B0aW9ucyB9O1xuXG4gICAgaWYgKHNlcnZpY2VOYW1lID09PSBcInBhc3N3b3JkXCIgfHwgc2VydmljZU5hbWUgPT09IFwicmVzdW1lXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgXCJDYW4ndCB1c2UgdXBkYXRlT3JDcmVhdGVVc2VyRnJvbUV4dGVybmFsU2VydmljZSB3aXRoIGludGVybmFsIHNlcnZpY2UgXCJcbiAgICAgICAgKyBzZXJ2aWNlTmFtZSk7XG4gICAgfVxuICAgIGlmICghaGFzT3duLmNhbGwoc2VydmljZURhdGEsICdpZCcpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBTZXJ2aWNlIGRhdGEgZm9yIHNlcnZpY2UgJHtzZXJ2aWNlTmFtZX0gbXVzdCBpbmNsdWRlIGlkYCk7XG4gICAgfVxuXG4gICAgLy8gTG9vayBmb3IgYSB1c2VyIHdpdGggdGhlIGFwcHJvcHJpYXRlIHNlcnZpY2UgdXNlciBpZC5cbiAgICBjb25zdCBzZWxlY3RvciA9IHt9O1xuICAgIGNvbnN0IHNlcnZpY2VJZEtleSA9IGBzZXJ2aWNlcy4ke3NlcnZpY2VOYW1lfS5pZGA7XG5cbiAgICAvLyBYWFggVGVtcG9yYXJ5IHNwZWNpYWwgY2FzZSBmb3IgVHdpdHRlci4gKElzc3VlICM2MjkpXG4gICAgLy8gICBUaGUgc2VydmljZURhdGEuaWQgd2lsbCBiZSBhIHN0cmluZyByZXByZXNlbnRhdGlvbiBvZiBhbiBpbnRlZ2VyLlxuICAgIC8vICAgV2Ugd2FudCBpdCB0byBtYXRjaCBlaXRoZXIgYSBzdG9yZWQgc3RyaW5nIG9yIGludCByZXByZXNlbnRhdGlvbi5cbiAgICAvLyAgIFRoaXMgaXMgdG8gY2F0ZXIgdG8gZWFybGllciB2ZXJzaW9ucyBvZiBNZXRlb3Igc3RvcmluZyB0d2l0dGVyXG4gICAgLy8gICB1c2VyIElEcyBpbiBudW1iZXIgZm9ybSwgYW5kIHJlY2VudCB2ZXJzaW9ucyBzdG9yaW5nIHRoZW0gYXMgc3RyaW5ncy5cbiAgICAvLyAgIFRoaXMgY2FuIGJlIHJlbW92ZWQgb25jZSBtaWdyYXRpb24gdGVjaG5vbG9neSBpcyBpbiBwbGFjZSwgYW5kIHR3aXR0ZXJcbiAgICAvLyAgIHVzZXJzIHN0b3JlZCB3aXRoIGludGVnZXIgSURzIGhhdmUgYmVlbiBtaWdyYXRlZCB0byBzdHJpbmcgSURzLlxuICAgIGlmIChzZXJ2aWNlTmFtZSA9PT0gXCJ0d2l0dGVyXCIgJiYgIWlzTmFOKHNlcnZpY2VEYXRhLmlkKSkge1xuICAgICAgc2VsZWN0b3JbXCIkb3JcIl0gPSBbe30se31dO1xuICAgICAgc2VsZWN0b3JbXCIkb3JcIl1bMF1bc2VydmljZUlkS2V5XSA9IHNlcnZpY2VEYXRhLmlkO1xuICAgICAgc2VsZWN0b3JbXCIkb3JcIl1bMV1bc2VydmljZUlkS2V5XSA9IHBhcnNlSW50KHNlcnZpY2VEYXRhLmlkLCAxMCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNlbGVjdG9yW3NlcnZpY2VJZEtleV0gPSBzZXJ2aWNlRGF0YS5pZDtcbiAgICB9XG5cbiAgICBsZXQgdXNlciA9IHRoaXMudXNlcnMuZmluZE9uZShzZWxlY3Rvciwge2ZpZWxkczogdGhpcy5fb3B0aW9ucy5kZWZhdWx0RmllbGRTZWxlY3Rvcn0pO1xuXG4gICAgLy8gQmVmb3JlIGNvbnRpbnVpbmcsIHJ1biB1c2VyIGhvb2sgdG8gc2VlIGlmIHdlIHNob3VsZCBjb250aW51ZVxuICAgIGlmICh0aGlzLl9iZWZvcmVFeHRlcm5hbExvZ2luSG9vayAmJiAhdGhpcy5fYmVmb3JlRXh0ZXJuYWxMb2dpbkhvb2soc2VydmljZU5hbWUsIHNlcnZpY2VEYXRhLCB1c2VyKSkge1xuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiTG9naW4gZm9yYmlkZGVuXCIpO1xuICAgIH1cblxuICAgIC8vIFdoZW4gY3JlYXRpbmcgYSBuZXcgdXNlciB3ZSBwYXNzIHRocm91Z2ggYWxsIG9wdGlvbnMuIFdoZW4gdXBkYXRpbmcgYW5cbiAgICAvLyBleGlzdGluZyB1c2VyLCBieSBkZWZhdWx0IHdlIG9ubHkgcHJvY2Vzcy9wYXNzIHRocm91Z2ggdGhlIHNlcnZpY2VEYXRhXG4gICAgLy8gKGVnLCBzbyB0aGF0IHdlIGtlZXAgYW4gdW5leHBpcmVkIGFjY2VzcyB0b2tlbiBhbmQgZG9uJ3QgY2FjaGUgb2xkIGVtYWlsXG4gICAgLy8gYWRkcmVzc2VzIGluIHNlcnZpY2VEYXRhLmVtYWlsKS4gVGhlIG9uRXh0ZXJuYWxMb2dpbiBob29rIGNhbiBiZSB1c2VkIHdoZW5cbiAgICAvLyBjcmVhdGluZyBvciB1cGRhdGluZyBhIHVzZXIsIHRvIG1vZGlmeSBvciBwYXNzIHRocm91Z2ggbW9yZSBvcHRpb25zIGFzXG4gICAgLy8gbmVlZGVkLlxuICAgIGxldCBvcHRzID0gdXNlciA/IHt9IDogb3B0aW9ucztcbiAgICBpZiAodGhpcy5fb25FeHRlcm5hbExvZ2luSG9vaykge1xuICAgICAgb3B0cyA9IHRoaXMuX29uRXh0ZXJuYWxMb2dpbkhvb2sob3B0aW9ucywgdXNlcik7XG4gICAgfVxuXG4gICAgaWYgKHVzZXIpIHtcbiAgICAgIHBpbkVuY3J5cHRlZEZpZWxkc1RvVXNlcihzZXJ2aWNlRGF0YSwgdXNlci5faWQpO1xuXG4gICAgICBsZXQgc2V0QXR0cnMgPSB7fTtcbiAgICAgIE9iamVjdC5rZXlzKHNlcnZpY2VEYXRhKS5mb3JFYWNoKGtleSA9PlxuICAgICAgICBzZXRBdHRyc1tgc2VydmljZXMuJHtzZXJ2aWNlTmFtZX0uJHtrZXl9YF0gPSBzZXJ2aWNlRGF0YVtrZXldXG4gICAgICApO1xuXG4gICAgICAvLyBYWFggTWF5YmUgd2Ugc2hvdWxkIHJlLXVzZSB0aGUgc2VsZWN0b3IgYWJvdmUgYW5kIG5vdGljZSBpZiB0aGUgdXBkYXRlXG4gICAgICAvLyAgICAgdG91Y2hlcyBub3RoaW5nP1xuICAgICAgc2V0QXR0cnMgPSB7IC4uLnNldEF0dHJzLCAuLi5vcHRzIH07XG4gICAgICB0aGlzLnVzZXJzLnVwZGF0ZSh1c2VyLl9pZCwge1xuICAgICAgICAkc2V0OiBzZXRBdHRyc1xuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHR5cGU6IHNlcnZpY2VOYW1lLFxuICAgICAgICB1c2VySWQ6IHVzZXIuX2lkXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBDcmVhdGUgYSBuZXcgdXNlciB3aXRoIHRoZSBzZXJ2aWNlIGRhdGEuXG4gICAgICB1c2VyID0ge3NlcnZpY2VzOiB7fX07XG4gICAgICB1c2VyLnNlcnZpY2VzW3NlcnZpY2VOYW1lXSA9IHNlcnZpY2VEYXRhO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdHlwZTogc2VydmljZU5hbWUsXG4gICAgICAgIHVzZXJJZDogdGhpcy5pbnNlcnRVc2VyRG9jKG9wdHMsIHVzZXIpXG4gICAgICB9O1xuICAgIH1cbiAgfTtcblxuICAvLyBSZW1vdmVzIGRlZmF1bHQgcmF0ZSBsaW1pdGluZyBydWxlXG4gIHJlbW92ZURlZmF1bHRSYXRlTGltaXQoKSB7XG4gICAgY29uc3QgcmVzcCA9IEREUFJhdGVMaW1pdGVyLnJlbW92ZVJ1bGUodGhpcy5kZWZhdWx0UmF0ZUxpbWl0ZXJSdWxlSWQpO1xuICAgIHRoaXMuZGVmYXVsdFJhdGVMaW1pdGVyUnVsZUlkID0gbnVsbDtcbiAgICByZXR1cm4gcmVzcDtcbiAgfTtcblxuICAvLyBBZGQgYSBkZWZhdWx0IHJ1bGUgb2YgbGltaXRpbmcgbG9naW5zLCBjcmVhdGluZyBuZXcgdXNlcnMgYW5kIHBhc3N3b3JkIHJlc2V0XG4gIC8vIHRvIDUgdGltZXMgZXZlcnkgMTAgc2Vjb25kcyBwZXIgY29ubmVjdGlvbi5cbiAgYWRkRGVmYXVsdFJhdGVMaW1pdCgpIHtcbiAgICBpZiAoIXRoaXMuZGVmYXVsdFJhdGVMaW1pdGVyUnVsZUlkKSB7XG4gICAgICB0aGlzLmRlZmF1bHRSYXRlTGltaXRlclJ1bGVJZCA9IEREUFJhdGVMaW1pdGVyLmFkZFJ1bGUoe1xuICAgICAgICB1c2VySWQ6IG51bGwsXG4gICAgICAgIGNsaWVudEFkZHJlc3M6IG51bGwsXG4gICAgICAgIHR5cGU6ICdtZXRob2QnLFxuICAgICAgICBuYW1lOiBuYW1lID0+IFsnbG9naW4nLCAnY3JlYXRlVXNlcicsICdyZXNldFBhc3N3b3JkJywgJ2ZvcmdvdFBhc3N3b3JkJ11cbiAgICAgICAgICAuaW5jbHVkZXMobmFtZSksXG4gICAgICAgIGNvbm5lY3Rpb25JZDogKGNvbm5lY3Rpb25JZCkgPT4gdHJ1ZSxcbiAgICAgIH0sIDUsIDEwMDAwKTtcbiAgICB9XG4gIH07XG5cbn1cblxuLy8gR2l2ZSBlYWNoIGxvZ2luIGhvb2sgY2FsbGJhY2sgYSBmcmVzaCBjbG9uZWQgY29weSBvZiB0aGUgYXR0ZW1wdFxuLy8gb2JqZWN0LCBidXQgZG9uJ3QgY2xvbmUgdGhlIGNvbm5lY3Rpb24uXG4vL1xuY29uc3QgY2xvbmVBdHRlbXB0V2l0aENvbm5lY3Rpb24gPSAoY29ubmVjdGlvbiwgYXR0ZW1wdCkgPT4ge1xuICBjb25zdCBjbG9uZWRBdHRlbXB0ID0gRUpTT04uY2xvbmUoYXR0ZW1wdCk7XG4gIGNsb25lZEF0dGVtcHQuY29ubmVjdGlvbiA9IGNvbm5lY3Rpb247XG4gIHJldHVybiBjbG9uZWRBdHRlbXB0O1xufTtcblxuY29uc3QgdHJ5TG9naW5NZXRob2QgPSAodHlwZSwgZm4pID0+IHtcbiAgbGV0IHJlc3VsdDtcbiAgdHJ5IHtcbiAgICByZXN1bHQgPSBmbigpO1xuICB9XG4gIGNhdGNoIChlKSB7XG4gICAgcmVzdWx0ID0ge2Vycm9yOiBlfTtcbiAgfVxuXG4gIGlmIChyZXN1bHQgJiYgIXJlc3VsdC50eXBlICYmIHR5cGUpXG4gICAgcmVzdWx0LnR5cGUgPSB0eXBlO1xuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5jb25zdCBzZXR1cERlZmF1bHRMb2dpbkhhbmRsZXJzID0gYWNjb3VudHMgPT4ge1xuICBhY2NvdW50cy5yZWdpc3RlckxvZ2luSGFuZGxlcihcInJlc3VtZVwiLCBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIHJldHVybiBkZWZhdWx0UmVzdW1lTG9naW5IYW5kbGVyLmNhbGwodGhpcywgYWNjb3VudHMsIG9wdGlvbnMpO1xuICB9KTtcbn07XG5cbi8vIExvZ2luIGhhbmRsZXIgZm9yIHJlc3VtZSB0b2tlbnMuXG5jb25zdCBkZWZhdWx0UmVzdW1lTG9naW5IYW5kbGVyID0gKGFjY291bnRzLCBvcHRpb25zKSA9PiB7XG4gIGlmICghb3B0aW9ucy5yZXN1bWUpXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcblxuICBjaGVjayhvcHRpb25zLnJlc3VtZSwgU3RyaW5nKTtcblxuICBjb25zdCBoYXNoZWRUb2tlbiA9IGFjY291bnRzLl9oYXNoTG9naW5Ub2tlbihvcHRpb25zLnJlc3VtZSk7XG5cbiAgLy8gRmlyc3QgbG9vayBmb3IganVzdCB0aGUgbmV3LXN0eWxlIGhhc2hlZCBsb2dpbiB0b2tlbiwgdG8gYXZvaWRcbiAgLy8gc2VuZGluZyB0aGUgdW5oYXNoZWQgdG9rZW4gdG8gdGhlIGRhdGFiYXNlIGluIGEgcXVlcnkgaWYgd2UgZG9uJ3RcbiAgLy8gbmVlZCB0by5cbiAgbGV0IHVzZXIgPSBhY2NvdW50cy51c2Vycy5maW5kT25lKFxuICAgIHtcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy5oYXNoZWRUb2tlblwiOiBoYXNoZWRUb2tlbn0sXG4gICAge2ZpZWxkczoge1wic2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zLiRcIjogMX19KTtcblxuICBpZiAoISB1c2VyKSB7XG4gICAgLy8gSWYgd2UgZGlkbid0IGZpbmQgdGhlIGhhc2hlZCBsb2dpbiB0b2tlbiwgdHJ5IGFsc28gbG9va2luZyBmb3JcbiAgICAvLyB0aGUgb2xkLXN0eWxlIHVuaGFzaGVkIHRva2VuLiAgQnV0IHdlIG5lZWQgdG8gbG9vayBmb3IgZWl0aGVyXG4gICAgLy8gdGhlIG9sZC1zdHlsZSB0b2tlbiBPUiB0aGUgbmV3LXN0eWxlIHRva2VuLCBiZWNhdXNlIGFub3RoZXJcbiAgICAvLyBjbGllbnQgY29ubmVjdGlvbiBsb2dnaW5nIGluIHNpbXVsdGFuZW91c2x5IG1pZ2h0IGhhdmUgYWxyZWFkeVxuICAgIC8vIGNvbnZlcnRlZCB0aGUgdG9rZW4uXG4gICAgdXNlciA9IGFjY291bnRzLnVzZXJzLmZpbmRPbmUoe1xuICAgICAgJG9yOiBbXG4gICAgICAgIHtcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy5oYXNoZWRUb2tlblwiOiBoYXNoZWRUb2tlbn0sXG4gICAgICAgIHtcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy50b2tlblwiOiBvcHRpb25zLnJlc3VtZX1cbiAgICAgIF1cbiAgICB9LFxuICAgIC8vIE5vdGU6IENhbm5vdCB1c2UgLi4ubG9naW5Ub2tlbnMuJCBwb3NpdGlvbmFsIG9wZXJhdG9yIHdpdGggJG9yIHF1ZXJ5LlxuICAgIHtmaWVsZHM6IHtcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vuc1wiOiAxfX0pO1xuICB9XG5cbiAgaWYgKCEgdXNlcilcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIllvdSd2ZSBiZWVuIGxvZ2dlZCBvdXQgYnkgdGhlIHNlcnZlci4gUGxlYXNlIGxvZyBpbiBhZ2Fpbi5cIilcbiAgICB9O1xuXG4gIC8vIEZpbmQgdGhlIHRva2VuLCB3aGljaCB3aWxsIGVpdGhlciBiZSBhbiBvYmplY3Qgd2l0aCBmaWVsZHNcbiAgLy8ge2hhc2hlZFRva2VuLCB3aGVufSBmb3IgYSBoYXNoZWQgdG9rZW4gb3Ige3Rva2VuLCB3aGVufSBmb3IgYW5cbiAgLy8gdW5oYXNoZWQgdG9rZW4uXG4gIGxldCBvbGRVbmhhc2hlZFN0eWxlVG9rZW47XG4gIGxldCB0b2tlbiA9IHVzZXIuc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zLmZpbmQodG9rZW4gPT5cbiAgICB0b2tlbi5oYXNoZWRUb2tlbiA9PT0gaGFzaGVkVG9rZW5cbiAgKTtcbiAgaWYgKHRva2VuKSB7XG4gICAgb2xkVW5oYXNoZWRTdHlsZVRva2VuID0gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgdG9rZW4gPSB1c2VyLnNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy5maW5kKHRva2VuID0+XG4gICAgICB0b2tlbi50b2tlbiA9PT0gb3B0aW9ucy5yZXN1bWVcbiAgICApO1xuICAgIG9sZFVuaGFzaGVkU3R5bGVUb2tlbiA9IHRydWU7XG4gIH1cblxuICBjb25zdCB0b2tlbkV4cGlyZXMgPSBhY2NvdW50cy5fdG9rZW5FeHBpcmF0aW9uKHRva2VuLndoZW4pO1xuICBpZiAobmV3IERhdGUoKSA+PSB0b2tlbkV4cGlyZXMpXG4gICAgcmV0dXJuIHtcbiAgICAgIHVzZXJJZDogdXNlci5faWQsXG4gICAgICBlcnJvcjogbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiWW91ciBzZXNzaW9uIGhhcyBleHBpcmVkLiBQbGVhc2UgbG9nIGluIGFnYWluLlwiKVxuICAgIH07XG5cbiAgLy8gVXBkYXRlIHRvIGEgaGFzaGVkIHRva2VuIHdoZW4gYW4gdW5oYXNoZWQgdG9rZW4gaXMgZW5jb3VudGVyZWQuXG4gIGlmIChvbGRVbmhhc2hlZFN0eWxlVG9rZW4pIHtcbiAgICAvLyBPbmx5IGFkZCB0aGUgbmV3IGhhc2hlZCB0b2tlbiBpZiB0aGUgb2xkIHVuaGFzaGVkIHRva2VuIHN0aWxsXG4gICAgLy8gZXhpc3RzICh0aGlzIGF2b2lkcyByZXN1cnJlY3RpbmcgdGhlIHRva2VuIGlmIGl0IHdhcyBkZWxldGVkXG4gICAgLy8gYWZ0ZXIgd2UgcmVhZCBpdCkuICBVc2luZyAkYWRkVG9TZXQgYXZvaWRzIGdldHRpbmcgYW4gaW5kZXhcbiAgICAvLyBlcnJvciBpZiBhbm90aGVyIGNsaWVudCBsb2dnaW5nIGluIHNpbXVsdGFuZW91c2x5IGhhcyBhbHJlYWR5XG4gICAgLy8gaW5zZXJ0ZWQgdGhlIG5ldyBoYXNoZWQgdG9rZW4uXG4gICAgYWNjb3VudHMudXNlcnMudXBkYXRlKFxuICAgICAge1xuICAgICAgICBfaWQ6IHVzZXIuX2lkLFxuICAgICAgICBcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucy50b2tlblwiOiBvcHRpb25zLnJlc3VtZVxuICAgICAgfSxcbiAgICAgIHskYWRkVG9TZXQ6IHtcbiAgICAgICAgICBcInNlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vuc1wiOiB7XG4gICAgICAgICAgICBcImhhc2hlZFRva2VuXCI6IGhhc2hlZFRva2VuLFxuICAgICAgICAgICAgXCJ3aGVuXCI6IHRva2VuLndoZW5cbiAgICAgICAgICB9XG4gICAgICAgIH19XG4gICAgKTtcblxuICAgIC8vIFJlbW92ZSB0aGUgb2xkIHRva2VuICphZnRlciogYWRkaW5nIHRoZSBuZXcsIHNpbmNlIG90aGVyd2lzZVxuICAgIC8vIGFub3RoZXIgY2xpZW50IHRyeWluZyB0byBsb2dpbiBiZXR3ZWVuIG91ciByZW1vdmluZyB0aGUgb2xkIGFuZFxuICAgIC8vIGFkZGluZyB0aGUgbmV3IHdvdWxkbid0IGZpbmQgYSB0b2tlbiB0byBsb2dpbiB3aXRoLlxuICAgIGFjY291bnRzLnVzZXJzLnVwZGF0ZSh1c2VyLl9pZCwge1xuICAgICAgJHB1bGw6IHtcbiAgICAgICAgXCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnNcIjogeyBcInRva2VuXCI6IG9wdGlvbnMucmVzdW1lIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgdXNlcklkOiB1c2VyLl9pZCxcbiAgICBzdGFtcGVkTG9naW5Ub2tlbjoge1xuICAgICAgdG9rZW46IG9wdGlvbnMucmVzdW1lLFxuICAgICAgd2hlbjogdG9rZW4ud2hlblxuICAgIH1cbiAgfTtcbn07XG5cbmNvbnN0IGV4cGlyZVBhc3N3b3JkVG9rZW4gPSAoXG4gIGFjY291bnRzLFxuICBvbGRlc3RWYWxpZERhdGUsXG4gIHRva2VuRmlsdGVyLFxuICB1c2VySWRcbikgPT4ge1xuICBjb25zdCB1c2VyRmlsdGVyID0gdXNlcklkID8ge19pZDogdXNlcklkfSA6IHt9O1xuICBjb25zdCByZXNldFJhbmdlT3IgPSB7XG4gICAgJG9yOiBbXG4gICAgICB7IFwic2VydmljZXMucGFzc3dvcmQucmVzZXQud2hlblwiOiB7ICRsdDogb2xkZXN0VmFsaWREYXRlIH0gfSxcbiAgICAgIHsgXCJzZXJ2aWNlcy5wYXNzd29yZC5yZXNldC53aGVuXCI6IHsgJGx0OiArb2xkZXN0VmFsaWREYXRlIH0gfVxuICAgIF1cbiAgfTtcbiAgY29uc3QgZXhwaXJlRmlsdGVyID0geyAkYW5kOiBbdG9rZW5GaWx0ZXIsIHJlc2V0UmFuZ2VPcl0gfTtcblxuICBhY2NvdW50cy51c2Vycy51cGRhdGUoey4uLnVzZXJGaWx0ZXIsIC4uLmV4cGlyZUZpbHRlcn0sIHtcbiAgICAkdW5zZXQ6IHtcbiAgICAgIFwic2VydmljZXMucGFzc3dvcmQucmVzZXRcIjogXCJcIlxuICAgIH1cbiAgfSwgeyBtdWx0aTogdHJ1ZSB9KTtcbn07XG5cbmNvbnN0IHNldEV4cGlyZVRva2Vuc0ludGVydmFsID0gYWNjb3VudHMgPT4ge1xuICBhY2NvdW50cy5leHBpcmVUb2tlbkludGVydmFsID0gTWV0ZW9yLnNldEludGVydmFsKCgpID0+IHtcbiAgICBhY2NvdW50cy5fZXhwaXJlVG9rZW5zKCk7XG4gICAgYWNjb3VudHMuX2V4cGlyZVBhc3N3b3JkUmVzZXRUb2tlbnMoKTtcbiAgICBhY2NvdW50cy5fZXhwaXJlUGFzc3dvcmRFbnJvbGxUb2tlbnMoKTtcbiAgfSwgRVhQSVJFX1RPS0VOU19JTlRFUlZBTF9NUyk7XG59O1xuXG4vLy9cbi8vLyBPQXV0aCBFbmNyeXB0aW9uIFN1cHBvcnRcbi8vL1xuXG5jb25zdCBPQXV0aEVuY3J5cHRpb24gPVxuICBQYWNrYWdlW1wib2F1dGgtZW5jcnlwdGlvblwiXSAmJlxuICBQYWNrYWdlW1wib2F1dGgtZW5jcnlwdGlvblwiXS5PQXV0aEVuY3J5cHRpb247XG5cbmNvbnN0IHVzaW5nT0F1dGhFbmNyeXB0aW9uID0gKCkgPT4ge1xuICByZXR1cm4gT0F1dGhFbmNyeXB0aW9uICYmIE9BdXRoRW5jcnlwdGlvbi5rZXlJc0xvYWRlZCgpO1xufTtcblxuLy8gT0F1dGggc2VydmljZSBkYXRhIGlzIHRlbXBvcmFyaWx5IHN0b3JlZCBpbiB0aGUgcGVuZGluZyBjcmVkZW50aWFsc1xuLy8gY29sbGVjdGlvbiBkdXJpbmcgdGhlIG9hdXRoIGF1dGhlbnRpY2F0aW9uIHByb2Nlc3MuICBTZW5zaXRpdmUgZGF0YVxuLy8gc3VjaCBhcyBhY2Nlc3MgdG9rZW5zIGFyZSBlbmNyeXB0ZWQgd2l0aG91dCB0aGUgdXNlciBpZCBiZWNhdXNlXG4vLyB3ZSBkb24ndCBrbm93IHRoZSB1c2VyIGlkIHlldC4gIFdlIHJlLWVuY3J5cHQgdGhlc2UgZmllbGRzIHdpdGggdGhlXG4vLyB1c2VyIGlkIGluY2x1ZGVkIHdoZW4gc3RvcmluZyB0aGUgc2VydmljZSBkYXRhIHBlcm1hbmVudGx5IGluXG4vLyB0aGUgdXNlcnMgY29sbGVjdGlvbi5cbi8vXG5jb25zdCBwaW5FbmNyeXB0ZWRGaWVsZHNUb1VzZXIgPSAoc2VydmljZURhdGEsIHVzZXJJZCkgPT4ge1xuICBPYmplY3Qua2V5cyhzZXJ2aWNlRGF0YSkuZm9yRWFjaChrZXkgPT4ge1xuICAgIGxldCB2YWx1ZSA9IHNlcnZpY2VEYXRhW2tleV07XG4gICAgaWYgKE9BdXRoRW5jcnlwdGlvbiAmJiBPQXV0aEVuY3J5cHRpb24uaXNTZWFsZWQodmFsdWUpKVxuICAgICAgdmFsdWUgPSBPQXV0aEVuY3J5cHRpb24uc2VhbChPQXV0aEVuY3J5cHRpb24ub3Blbih2YWx1ZSksIHVzZXJJZCk7XG4gICAgc2VydmljZURhdGFba2V5XSA9IHZhbHVlO1xuICB9KTtcbn07XG5cblxuLy8gRW5jcnlwdCB1bmVuY3J5cHRlZCBsb2dpbiBzZXJ2aWNlIHNlY3JldHMgd2hlbiBvYXV0aC1lbmNyeXB0aW9uIGlzXG4vLyBhZGRlZC5cbi8vXG4vLyBYWFggRm9yIHRoZSBvYXV0aFNlY3JldEtleSB0byBiZSBhdmFpbGFibGUgaGVyZSBhdCBzdGFydHVwLCB0aGVcbi8vIGRldmVsb3BlciBtdXN0IGNhbGwgQWNjb3VudHMuY29uZmlnKHtvYXV0aFNlY3JldEtleTogLi4ufSkgYXQgbG9hZFxuLy8gdGltZSwgaW5zdGVhZCBvZiBpbiBhIE1ldGVvci5zdGFydHVwIGJsb2NrLCBiZWNhdXNlIHRoZSBzdGFydHVwXG4vLyBibG9jayBpbiB0aGUgYXBwIGNvZGUgd2lsbCBydW4gYWZ0ZXIgdGhpcyBhY2NvdW50cy1iYXNlIHN0YXJ0dXBcbi8vIGJsb2NrLiAgUGVyaGFwcyB3ZSBuZWVkIGEgcG9zdC1zdGFydHVwIGNhbGxiYWNrP1xuXG5NZXRlb3Iuc3RhcnR1cCgoKSA9PiB7XG4gIGlmICghIHVzaW5nT0F1dGhFbmNyeXB0aW9uKCkpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB7IFNlcnZpY2VDb25maWd1cmF0aW9uIH0gPSBQYWNrYWdlWydzZXJ2aWNlLWNvbmZpZ3VyYXRpb24nXTtcblxuICBTZXJ2aWNlQ29uZmlndXJhdGlvbi5jb25maWd1cmF0aW9ucy5maW5kKHtcbiAgICAkYW5kOiBbe1xuICAgICAgc2VjcmV0OiB7ICRleGlzdHM6IHRydWUgfVxuICAgIH0sIHtcbiAgICAgIFwic2VjcmV0LmFsZ29yaXRobVwiOiB7ICRleGlzdHM6IGZhbHNlIH1cbiAgICB9XVxuICB9KS5mb3JFYWNoKGNvbmZpZyA9PiB7XG4gICAgU2VydmljZUNvbmZpZ3VyYXRpb24uY29uZmlndXJhdGlvbnMudXBkYXRlKGNvbmZpZy5faWQsIHtcbiAgICAgICRzZXQ6IHtcbiAgICAgICAgc2VjcmV0OiBPQXV0aEVuY3J5cHRpb24uc2VhbChjb25maWcuc2VjcmV0KVxuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn0pO1xuXG4vLyBYWFggc2VlIGNvbW1lbnQgb24gQWNjb3VudHMuY3JlYXRlVXNlciBpbiBwYXNzd29yZHNfc2VydmVyIGFib3V0IGFkZGluZyBhXG4vLyBzZWNvbmQgXCJzZXJ2ZXIgb3B0aW9uc1wiIGFyZ3VtZW50LlxuY29uc3QgZGVmYXVsdENyZWF0ZVVzZXJIb29rID0gKG9wdGlvbnMsIHVzZXIpID0+IHtcbiAgaWYgKG9wdGlvbnMucHJvZmlsZSlcbiAgICB1c2VyLnByb2ZpbGUgPSBvcHRpb25zLnByb2ZpbGU7XG4gIHJldHVybiB1c2VyO1xufTtcblxuLy8gVmFsaWRhdGUgbmV3IHVzZXIncyBlbWFpbCBvciBHb29nbGUvRmFjZWJvb2svR2l0SHViIGFjY291bnQncyBlbWFpbFxuZnVuY3Rpb24gZGVmYXVsdFZhbGlkYXRlTmV3VXNlckhvb2sodXNlcikge1xuICBjb25zdCBkb21haW4gPSB0aGlzLl9vcHRpb25zLnJlc3RyaWN0Q3JlYXRpb25CeUVtYWlsRG9tYWluO1xuICBpZiAoIWRvbWFpbikge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgbGV0IGVtYWlsSXNHb29kID0gZmFsc2U7XG4gIGlmICh1c2VyLmVtYWlscyAmJiB1c2VyLmVtYWlscy5sZW5ndGggPiAwKSB7XG4gICAgZW1haWxJc0dvb2QgPSB1c2VyLmVtYWlscy5yZWR1Y2UoXG4gICAgICAocHJldiwgZW1haWwpID0+IHByZXYgfHwgdGhpcy5fdGVzdEVtYWlsRG9tYWluKGVtYWlsLmFkZHJlc3MpLCBmYWxzZVxuICAgICk7XG4gIH0gZWxzZSBpZiAodXNlci5zZXJ2aWNlcyAmJiBPYmplY3QudmFsdWVzKHVzZXIuc2VydmljZXMpLmxlbmd0aCA+IDApIHtcbiAgICAvLyBGaW5kIGFueSBlbWFpbCBvZiBhbnkgc2VydmljZSBhbmQgY2hlY2sgaXRcbiAgICBlbWFpbElzR29vZCA9IE9iamVjdC52YWx1ZXModXNlci5zZXJ2aWNlcykucmVkdWNlKFxuICAgICAgKHByZXYsIHNlcnZpY2UpID0+IHNlcnZpY2UuZW1haWwgJiYgdGhpcy5fdGVzdEVtYWlsRG9tYWluKHNlcnZpY2UuZW1haWwpLFxuICAgICAgZmFsc2UsXG4gICAgKTtcbiAgfVxuXG4gIGlmIChlbWFpbElzR29vZCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBkb21haW4gPT09ICdzdHJpbmcnKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIGBAJHtkb21haW59IGVtYWlsIHJlcXVpcmVkYCk7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiRW1haWwgZG9lc24ndCBtYXRjaCB0aGUgY3JpdGVyaWEuXCIpO1xuICB9XG59XG5cbmNvbnN0IHNldHVwVXNlcnNDb2xsZWN0aW9uID0gdXNlcnMgPT4ge1xuICAvLy9cbiAgLy8vIFJFU1RSSUNUSU5HIFdSSVRFUyBUTyBVU0VSIE9CSkVDVFNcbiAgLy8vXG4gIHVzZXJzLmFsbG93KHtcbiAgICAvLyBjbGllbnRzIGNhbiBtb2RpZnkgdGhlIHByb2ZpbGUgZmllbGQgb2YgdGhlaXIgb3duIGRvY3VtZW50LCBhbmRcbiAgICAvLyBub3RoaW5nIGVsc2UuXG4gICAgdXBkYXRlOiAodXNlcklkLCB1c2VyLCBmaWVsZHMsIG1vZGlmaWVyKSA9PiB7XG4gICAgICAvLyBtYWtlIHN1cmUgaXQgaXMgb3VyIHJlY29yZFxuICAgICAgaWYgKHVzZXIuX2lkICE9PSB1c2VySWQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuXG4gICAgICAvLyB1c2VyIGNhbiBvbmx5IG1vZGlmeSB0aGUgJ3Byb2ZpbGUnIGZpZWxkLiBzZXRzIHRvIG11bHRpcGxlXG4gICAgICAvLyBzdWIta2V5cyAoZWcgcHJvZmlsZS5mb28gYW5kIHByb2ZpbGUuYmFyKSBhcmUgbWVyZ2VkIGludG8gZW50cnlcbiAgICAgIC8vIGluIHRoZSBmaWVsZHMgbGlzdC5cbiAgICAgIGlmIChmaWVsZHMubGVuZ3RoICE9PSAxIHx8IGZpZWxkc1swXSAhPT0gJ3Byb2ZpbGUnKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcbiAgICBmZXRjaDogWydfaWQnXSAvLyB3ZSBvbmx5IGxvb2sgYXQgX2lkLlxuICB9KTtcblxuICAvLy8gREVGQVVMVCBJTkRFWEVTIE9OIFVTRVJTXG4gIHVzZXJzLl9lbnN1cmVJbmRleCgndXNlcm5hbWUnLCB7IHVuaXF1ZTogdHJ1ZSwgc3BhcnNlOiB0cnVlIH0pO1xuICB1c2Vycy5fZW5zdXJlSW5kZXgoJ2VtYWlscy5hZGRyZXNzJywgeyB1bmlxdWU6IHRydWUsIHNwYXJzZTogdHJ1ZSB9KTtcbiAgdXNlcnMuX2Vuc3VyZUluZGV4KCdzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMuaGFzaGVkVG9rZW4nLFxuICAgIHsgdW5pcXVlOiB0cnVlLCBzcGFyc2U6IHRydWUgfSk7XG4gIHVzZXJzLl9lbnN1cmVJbmRleCgnc2VydmljZXMucmVzdW1lLmxvZ2luVG9rZW5zLnRva2VuJyxcbiAgICB7IHVuaXF1ZTogdHJ1ZSwgc3BhcnNlOiB0cnVlIH0pO1xuICAvLyBGb3IgdGFraW5nIGNhcmUgb2YgbG9nb3V0T3RoZXJDbGllbnRzIGNhbGxzIHRoYXQgY3Jhc2hlZCBiZWZvcmUgdGhlXG4gIC8vIHRva2VucyB3ZXJlIGRlbGV0ZWQuXG4gIHVzZXJzLl9lbnN1cmVJbmRleCgnc2VydmljZXMucmVzdW1lLmhhdmVMb2dpblRva2Vuc1RvRGVsZXRlJyxcbiAgICB7IHNwYXJzZTogdHJ1ZSB9KTtcbiAgLy8gRm9yIGV4cGlyaW5nIGxvZ2luIHRva2Vuc1xuICB1c2Vycy5fZW5zdXJlSW5kZXgoXCJzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMud2hlblwiLCB7IHNwYXJzZTogdHJ1ZSB9KTtcbiAgLy8gRm9yIGV4cGlyaW5nIHBhc3N3b3JkIHRva2Vuc1xuICB1c2Vycy5fZW5zdXJlSW5kZXgoJ3NlcnZpY2VzLnBhc3N3b3JkLnJlc2V0LndoZW4nLCB7IHNwYXJzZTogdHJ1ZSB9KTtcbn07XG4iXX0=
