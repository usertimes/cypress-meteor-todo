(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var NpmModuleBcrypt = Package['npm-bcrypt'].NpmModuleBcrypt;
var Accounts = Package['accounts-base'].Accounts;
var SRP = Package.srp.SRP;
var SHA256 = Package.sha.SHA256;
var EJSON = Package.ejson.EJSON;
var DDP = Package['ddp-client'].DDP;
var DDPServer = Package['ddp-server'].DDPServer;
var Email = Package.email.Email;
var EmailInternals = Package.email.EmailInternals;
var Random = Package.random.Random;
var check = Package.check.check;
var Match = Package.check.Match;
var ECMAScript = Package.ecmascript.ECMAScript;
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

var require = meteorInstall({"node_modules":{"meteor":{"accounts-password":{"email_templates.js":function module(){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-password/email_templates.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
const greet = welcomeMsg => (user, url) => {
  const greeting = user.profile && user.profile.name ? "Hello ".concat(user.profile.name, ",") : "Hello,";
  return "".concat(greeting, "\n\n").concat(welcomeMsg, ", simply click the link below.\n\n").concat(url, "\n\nThanks.\n");
};
/**
 * @summary Options to customize emails sent from the Accounts system.
 * @locus Server
 * @importFromPackage accounts-base
 */


Accounts.emailTemplates = {
  from: "Accounts Example <no-reply@example.com>",
  siteName: Meteor.absoluteUrl().replace(/^https?:\/\//, '').replace(/\/$/, ''),
  resetPassword: {
    subject: () => "How to reset your password on ".concat(Accounts.emailTemplates.siteName),
    text: greet("To reset your password")
  },
  verifyEmail: {
    subject: () => "How to verify email address on ".concat(Accounts.emailTemplates.siteName),
    text: greet("To verify your account email")
  },
  enrollAccount: {
    subject: () => "An account has been created for you on ".concat(Accounts.emailTemplates.siteName),
    text: greet("To start using the service")
  }
};
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"password_server.js":function module(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/accounts-password/password_server.js                                                                       //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
let _objectSpread;

module.link("@babel/runtime/helpers/objectSpread2", {
  default(v) {
    _objectSpread = v;
  }

}, 0);
/// BCRYPT
const bcrypt = NpmModuleBcrypt;
const bcryptHash = Meteor.wrapAsync(bcrypt.hash);
const bcryptCompare = Meteor.wrapAsync(bcrypt.compare); // Utility for grabbing user

const getUserById = (id, options) => Meteor.users.findOne(id, Accounts._addDefaultFieldSelector(options)); // User records have a 'services.password.bcrypt' field on them to hold
// their hashed passwords (unless they have a 'services.password.srp'
// field, in which case they will be upgraded to bcrypt the next time
// they log in).
//
// When the client sends a password to the server, it can either be a
// string (the plaintext password) or an object with keys 'digest' and
// 'algorithm' (must be "sha-256" for now). The Meteor client always sends
// password objects { digest: *, algorithm: "sha-256" }, but DDP clients
// that don't have access to SHA can just send plaintext passwords as
// strings.
//
// When the server receives a plaintext password as a string, it always
// hashes it with SHA256 before passing it into bcrypt. When the server
// receives a password as an object, it asserts that the algorithm is
// "sha-256" and then passes the digest to bcrypt.


Accounts._bcryptRounds = () => Accounts._options.bcryptRounds || 10; // Given a 'password' from the client, extract the string that we should
// bcrypt. 'password' can be one of:
//  - String (the plaintext password)
//  - Object with 'digest' and 'algorithm' keys. 'algorithm' must be "sha-256".
//


const getPasswordString = password => {
  if (typeof password === "string") {
    password = SHA256(password);
  } else {
    // 'password' is an object
    if (password.algorithm !== "sha-256") {
      throw new Error("Invalid password hash algorithm. " + "Only 'sha-256' is allowed.");
    }

    password = password.digest;
  }

  return password;
}; // Use bcrypt to hash the password for storage in the database.
// `password` can be a string (in which case it will be run through
// SHA256 before bcrypt) or an object with properties `digest` and
// `algorithm` (in which case we bcrypt `password.digest`).
//


const hashPassword = password => {
  password = getPasswordString(password);
  return bcryptHash(password, Accounts._bcryptRounds());
}; // Extract the number of rounds used in the specified bcrypt hash.


const getRoundsFromBcryptHash = hash => {
  let rounds;

  if (hash) {
    const hashSegments = hash.split('$');

    if (hashSegments.length > 2) {
      rounds = parseInt(hashSegments[2], 10);
    }
  }

  return rounds;
}; // Check whether the provided password matches the bcrypt'ed password in
// the database user record. `password` can be a string (in which case
// it will be run through SHA256 before bcrypt) or an object with
// properties `digest` and `algorithm` (in which case we bcrypt
// `password.digest`).
//
// The user parameter needs at least user._id and user.services


Accounts._checkPasswordUserFields = {
  _id: 1,
  services: 1
}; //

Accounts._checkPassword = (user, password) => {
  const result = {
    userId: user._id
  };
  const formattedPassword = getPasswordString(password);
  const hash = user.services.password.bcrypt;
  const hashRounds = getRoundsFromBcryptHash(hash);

  if (!bcryptCompare(formattedPassword, hash)) {
    result.error = handleError("Incorrect password", false);
  } else if (hash && Accounts._bcryptRounds() != hashRounds) {
    // The password checks out, but the user's bcrypt hash needs to be updated.
    Meteor.defer(() => {
      Meteor.users.update({
        _id: user._id
      }, {
        $set: {
          'services.password.bcrypt': bcryptHash(formattedPassword, Accounts._bcryptRounds())
        }
      });
    });
  }

  return result;
};

const checkPassword = Accounts._checkPassword; ///
/// ERROR HANDLER
///

const handleError = function (msg) {
  let throwError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
  const error = new Meteor.Error(403, Accounts._options.ambiguousErrorMessages ? "Something went wrong. Please check your credentials." : msg);

  if (throwError) {
    throw error;
  }

  return error;
}; ///
/// LOGIN
///


Accounts._findUserByQuery = (query, options) => {
  let user = null;

  if (query.id) {
    // default field selector is added within getUserById()
    user = getUserById(query.id, options);
  } else {
    options = Accounts._addDefaultFieldSelector(options);
    let fieldName;
    let fieldValue;

    if (query.username) {
      fieldName = 'username';
      fieldValue = query.username;
    } else if (query.email) {
      fieldName = 'emails.address';
      fieldValue = query.email;
    } else {
      throw new Error("shouldn't happen (validation missed something)");
    }

    let selector = {};
    selector[fieldName] = fieldValue;
    user = Meteor.users.findOne(selector, options); // If user is not found, try a case insensitive lookup

    if (!user) {
      selector = selectorForFastCaseInsensitiveLookup(fieldName, fieldValue);
      const candidateUsers = Meteor.users.find(selector, options).fetch(); // No match if multiple candidates are found

      if (candidateUsers.length === 1) {
        user = candidateUsers[0];
      }
    }
  }

  return user;
};
/**
 * @summary Finds the user with the specified username.
 * First tries to match username case sensitively; if that fails, it
 * tries case insensitively; but if more than one user matches the case
 * insensitive search, it returns null.
 * @locus Server
 * @param {String} username The username to look for
 * @param {Object} [options]
 * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
 * @returns {Object} A user if found, else null
 * @importFromPackage accounts-base
 */


Accounts.findUserByUsername = (username, options) => Accounts._findUserByQuery({
  username
}, options);
/**
 * @summary Finds the user with the specified email.
 * First tries to match email case sensitively; if that fails, it
 * tries case insensitively; but if more than one user matches the case
 * insensitive search, it returns null.
 * @locus Server
 * @param {String} email The email address to look for
 * @param {Object} [options]
 * @param {MongoFieldSpecifier} options.fields Dictionary of fields to return or exclude.
 * @returns {Object} A user if found, else null
 * @importFromPackage accounts-base
 */


Accounts.findUserByEmail = (email, options) => Accounts._findUserByQuery({
  email
}, options); // Generates a MongoDB selector that can be used to perform a fast case
// insensitive lookup for the given fieldName and string. Since MongoDB does
// not support case insensitive indexes, and case insensitive regex queries
// are slow, we construct a set of prefix selectors for all permutations of
// the first 4 characters ourselves. We first attempt to matching against
// these, and because 'prefix expression' regex queries do use indexes (see
// http://docs.mongodb.org/v2.6/reference/operator/query/regex/#index-use),
// this has been found to greatly improve performance (from 1200ms to 5ms in a
// test with 1.000.000 users).


const selectorForFastCaseInsensitiveLookup = (fieldName, string) => {
  // Performance seems to improve up to 4 prefix characters
  const prefix = string.substring(0, Math.min(string.length, 4));
  const orClause = generateCasePermutationsForString(prefix).map(prefixPermutation => {
    const selector = {};
    selector[fieldName] = new RegExp("^".concat(Meteor._escapeRegExp(prefixPermutation)));
    return selector;
  });
  const caseInsensitiveClause = {};
  caseInsensitiveClause[fieldName] = new RegExp("^".concat(Meteor._escapeRegExp(string), "$"), 'i');
  return {
    $and: [{
      $or: orClause
    }, caseInsensitiveClause]
  };
}; // Generates permutations of all case variations of a given string.


const generateCasePermutationsForString = string => {
  let permutations = [''];

  for (let i = 0; i < string.length; i++) {
    const ch = string.charAt(i);
    permutations = [].concat(...permutations.map(prefix => {
      const lowerCaseChar = ch.toLowerCase();
      const upperCaseChar = ch.toUpperCase(); // Don't add unneccesary permutations when ch is not a letter

      if (lowerCaseChar === upperCaseChar) {
        return [prefix + ch];
      } else {
        return [prefix + lowerCaseChar, prefix + upperCaseChar];
      }
    }));
  }

  return permutations;
};

const checkForCaseInsensitiveDuplicates = (fieldName, displayName, fieldValue, ownUserId) => {
  // Some tests need the ability to add users with the same case insensitive
  // value, hence the _skipCaseInsensitiveChecksForTest check
  const skipCheck = Object.prototype.hasOwnProperty.call(Accounts._skipCaseInsensitiveChecksForTest, fieldValue);

  if (fieldValue && !skipCheck) {
    const matchedUsers = Meteor.users.find(selectorForFastCaseInsensitiveLookup(fieldName, fieldValue), {
      fields: {
        _id: 1
      },
      // we only need a maximum of 2 users for the logic below to work
      limit: 2
    }).fetch();

    if (matchedUsers.length > 0 && ( // If we don't have a userId yet, any match we find is a duplicate
    !ownUserId || // Otherwise, check to see if there are multiple matches or a match
    // that is not us
    matchedUsers.length > 1 || matchedUsers[0]._id !== ownUserId)) {
      handleError("".concat(displayName, " already exists."));
    }
  }
}; // XXX maybe this belongs in the check package


const NonEmptyString = Match.Where(x => {
  check(x, String);
  return x.length > 0;
});
const userQueryValidator = Match.Where(user => {
  check(user, {
    id: Match.Optional(NonEmptyString),
    username: Match.Optional(NonEmptyString),
    email: Match.Optional(NonEmptyString)
  });
  if (Object.keys(user).length !== 1) throw new Match.Error("User property must have exactly one field");
  return true;
});
const passwordValidator = Match.OneOf(Match.Where(str => {
  var _Meteor$settings, _Meteor$settings$pack, _Meteor$settings$pack2;

  return Match.test(str, String) && str.length <= ((_Meteor$settings = Meteor.settings) === null || _Meteor$settings === void 0 ? void 0 : (_Meteor$settings$pack = _Meteor$settings.packages) === null || _Meteor$settings$pack === void 0 ? void 0 : (_Meteor$settings$pack2 = _Meteor$settings$pack.accounts) === null || _Meteor$settings$pack2 === void 0 ? void 0 : _Meteor$settings$pack2.passwordMaxLength) || 256;
}), {
  digest: Match.Where(str => Match.test(str, String) && str.length === 64),
  algorithm: Match.OneOf('sha-256')
}); // Handler to login with a password.
//
// The Meteor client sets options.password to an object with keys
// 'digest' (set to SHA256(password)) and 'algorithm' ("sha-256").
//
// For other DDP clients which don't have access to SHA, the handler
// also accepts the plaintext password in options.password as a string.
//
// (It might be nice if servers could turn the plaintext password
// option off. Or maybe it should be opt-in, not opt-out?
// Accounts.config option?)
//
// Note that neither password option is secure without SSL.
//

Accounts.registerLoginHandler("password", options => {
  if (!options.password || options.srp) return undefined; // don't handle

  check(options, {
    user: userQueryValidator,
    password: passwordValidator
  });

  const user = Accounts._findUserByQuery(options.user, {
    fields: _objectSpread({
      services: 1
    }, Accounts._checkPasswordUserFields)
  });

  if (!user) {
    handleError("User not found");
  }

  if (!user.services || !user.services.password || !(user.services.password.bcrypt || user.services.password.srp)) {
    handleError("User has no password set");
  }

  if (!user.services.password.bcrypt) {
    if (typeof options.password === "string") {
      // The client has presented a plaintext password, and the user is
      // not upgraded to bcrypt yet. We don't attempt to tell the client
      // to upgrade to bcrypt, because it might be a standalone DDP
      // client doesn't know how to do such a thing.
      const verifier = user.services.password.srp;
      const newVerifier = SRP.generateVerifier(options.password, {
        identity: verifier.identity,
        salt: verifier.salt
      });

      if (verifier.verifier !== newVerifier.verifier) {
        return {
          userId: Accounts._options.ambiguousErrorMessages ? null : user._id,
          error: handleError("Incorrect password", false)
        };
      }

      return {
        userId: user._id
      };
    } else {
      // Tell the client to use the SRP upgrade process.
      throw new Meteor.Error(400, "old password format", EJSON.stringify({
        format: 'srp',
        identity: user.services.password.srp.identity
      }));
    }
  }

  return checkPassword(user, options.password);
}); // Handler to login using the SRP upgrade path. To use this login
// handler, the client must provide:
//   - srp: H(identity + ":" + password)
//   - password: a string or an object with properties 'digest' and 'algorithm'
//
// We use `options.srp` to verify that the client knows the correct
// password without doing a full SRP flow. Once we've checked that, we
// upgrade the user to bcrypt and remove the SRP information from the
// user document.
//
// The client ends up using this login handler after trying the normal
// login handler (above), which throws an error telling the client to
// try the SRP upgrade path.
//
// XXX COMPAT WITH 0.8.1.3

Accounts.registerLoginHandler("password", options => {
  if (!options.srp || !options.password) {
    return undefined; // don't handle
  }

  check(options, {
    user: userQueryValidator,
    srp: String,
    password: passwordValidator
  });

  const user = Accounts._findUserByQuery(options.user, {
    fields: _objectSpread({
      services: 1
    }, Accounts._checkPasswordUserFields)
  });

  if (!user) {
    handleError("User not found");
  } // Check to see if another simultaneous login has already upgraded
  // the user record to bcrypt.


  if (user.services && user.services.password && user.services.password.bcrypt) {
    return checkPassword(user, options.password);
  }

  if (!(user.services && user.services.password && user.services.password.srp)) {
    handleError("User has no password set");
  }

  const v1 = user.services.password.srp.verifier;
  const v2 = SRP.generateVerifier(null, {
    hashedIdentityAndPassword: options.srp,
    salt: user.services.password.srp.salt
  }).verifier;

  if (v1 !== v2) {
    return {
      userId: Accounts._options.ambiguousErrorMessages ? null : user._id,
      error: handleError("Incorrect password", false)
    };
  } // Upgrade to bcrypt on successful login.


  const salted = hashPassword(options.password);
  Meteor.users.update(user._id, {
    $unset: {
      'services.password.srp': 1
    },
    $set: {
      'services.password.bcrypt': salted
    }
  });
  return {
    userId: user._id
  };
}); ///
/// CHANGING
///

/**
 * @summary Change a user's username. Use this instead of updating the
 * database directly. The operation will fail if there is an existing user
 * with a username only differing in case.
 * @locus Server
 * @param {String} userId The ID of the user to update.
 * @param {String} newUsername A new username for the user.
 * @importFromPackage accounts-base
 */

Accounts.setUsername = (userId, newUsername) => {
  check(userId, NonEmptyString);
  check(newUsername, NonEmptyString);
  const user = getUserById(userId, {
    fields: {
      username: 1
    }
  });

  if (!user) {
    handleError("User not found");
  }

  const oldUsername = user.username; // Perform a case insensitive check for duplicates before update

  checkForCaseInsensitiveDuplicates('username', 'Username', newUsername, user._id);
  Meteor.users.update({
    _id: user._id
  }, {
    $set: {
      username: newUsername
    }
  }); // Perform another check after update, in case a matching user has been
  // inserted in the meantime

  try {
    checkForCaseInsensitiveDuplicates('username', 'Username', newUsername, user._id);
  } catch (ex) {
    // Undo update if the check fails
    Meteor.users.update({
      _id: user._id
    }, {
      $set: {
        username: oldUsername
      }
    });
    throw ex;
  }
}; // Let the user change their own password if they know the old
// password. `oldPassword` and `newPassword` should be objects with keys
// `digest` and `algorithm` (representing the SHA256 of the password).
//
// XXX COMPAT WITH 0.8.1.3
// Like the login method, if the user hasn't been upgraded from SRP to
// bcrypt yet, then this method will throw an 'old password format'
// error. The client should call the SRP upgrade login handler and then
// retry this method again.
//
// UNLIKE the login method, there is no way to avoid getting SRP upgrade
// errors thrown. The reasoning for this is that clients using this
// method directly will need to be updated anyway because we no longer
// support the SRP flow that they would have been doing to use this
// method previously.


Meteor.methods({
  changePassword: function (oldPassword, newPassword) {
    check(oldPassword, passwordValidator);
    check(newPassword, passwordValidator);

    if (!this.userId) {
      throw new Meteor.Error(401, "Must be logged in");
    }

    const user = getUserById(this.userId, {
      fields: _objectSpread({
        services: 1
      }, Accounts._checkPasswordUserFields)
    });

    if (!user) {
      handleError("User not found");
    }

    if (!user.services || !user.services.password || !user.services.password.bcrypt && !user.services.password.srp) {
      handleError("User has no password set");
    }

    if (!user.services.password.bcrypt) {
      throw new Meteor.Error(400, "old password format", EJSON.stringify({
        format: 'srp',
        identity: user.services.password.srp.identity
      }));
    }

    const result = checkPassword(user, oldPassword);

    if (result.error) {
      throw result.error;
    }

    const hashed = hashPassword(newPassword); // It would be better if this removed ALL existing tokens and replaced
    // the token for the current connection with a new one, but that would
    // be tricky, so we'll settle for just replacing all tokens other than
    // the one for the current connection.

    const currentToken = Accounts._getLoginToken(this.connection.id);

    Meteor.users.update({
      _id: this.userId
    }, {
      $set: {
        'services.password.bcrypt': hashed
      },
      $pull: {
        'services.resume.loginTokens': {
          hashedToken: {
            $ne: currentToken
          }
        }
      },
      $unset: {
        'services.password.reset': 1
      }
    });
    return {
      passwordChanged: true
    };
  }
}); // Force change the users password.

/**
 * @summary Forcibly change the password for a user.
 * @locus Server
 * @param {String} userId The id of the user to update.
 * @param {String} newPassword A new password for the user.
 * @param {Object} [options]
 * @param {Object} options.logout Logout all current connections with this userId (default: true)
 * @importFromPackage accounts-base
 */

Accounts.setPassword = (userId, newPlaintextPassword, options) => {
  options = _objectSpread({
    logout: true
  }, options);
  const user = getUserById(userId, {
    fields: {
      _id: 1
    }
  });

  if (!user) {
    throw new Meteor.Error(403, "User not found");
  }

  const update = {
    $unset: {
      'services.password.srp': 1,
      // XXX COMPAT WITH 0.8.1.3
      'services.password.reset': 1
    },
    $set: {
      'services.password.bcrypt': hashPassword(newPlaintextPassword)
    }
  };

  if (options.logout) {
    update.$unset['services.resume.loginTokens'] = 1;
  }

  Meteor.users.update({
    _id: user._id
  }, update);
}; ///
/// RESETTING VIA EMAIL
///
// Utility for plucking addresses from emails


const pluckAddresses = function () {
  let emails = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  return emails.map(email => email.address);
}; // Method called by a user to request a password reset email. This is
// the start of the reset process.


Meteor.methods({
  forgotPassword: options => {
    check(options, {
      email: String
    });
    const user = Accounts.findUserByEmail(options.email, {
      fields: {
        emails: 1
      }
    });

    if (!user) {
      handleError("User not found");
    }

    const emails = pluckAddresses(user.emails);
    const caseSensitiveEmail = emails.find(email => email.toLowerCase() === options.email.toLowerCase());
    Accounts.sendResetPasswordEmail(user._id, caseSensitiveEmail);
  }
});
/**
 * @summary Generates a reset token and saves it into the database.
 * @locus Server
 * @param {String} userId The id of the user to generate the reset token for.
 * @param {String} email Which address of the user to generate the reset token for. This address must be in the user's `emails` list. If `null`, defaults to the first email in the list.
 * @param {String} reason `resetPassword` or `enrollAccount`.
 * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
 * @returns {Object} Object with {email, user, token} values.
 * @importFromPackage accounts-base
 */

Accounts.generateResetToken = (userId, email, reason, extraTokenData) => {
  // Make sure the user exists, and email is one of their addresses.
  // Don't limit the fields in the user object since the user is returned
  // by the function and some other fields might be used elsewhere.
  const user = getUserById(userId);

  if (!user) {
    handleError("Can't find user");
  } // pick the first email if we weren't passed an email.


  if (!email && user.emails && user.emails[0]) {
    email = user.emails[0].address;
  } // make sure we have a valid email


  if (!email || !pluckAddresses(user.emails).includes(email)) {
    handleError("No such email for user.");
  }

  const token = Random.secret();
  const tokenRecord = {
    token,
    email,
    when: new Date()
  };

  if (reason === 'resetPassword') {
    tokenRecord.reason = 'reset';
  } else if (reason === 'enrollAccount') {
    tokenRecord.reason = 'enroll';
  } else if (reason) {
    // fallback so that this function can be used for unknown reasons as well
    tokenRecord.reason = reason;
  }

  if (extraTokenData) {
    Object.assign(tokenRecord, extraTokenData);
  }

  Meteor.users.update({
    _id: user._id
  }, {
    $set: {
      'services.password.reset': tokenRecord
    }
  }); // before passing to template, update user object with new token

  Meteor._ensure(user, 'services', 'password').reset = tokenRecord;
  return {
    email,
    user,
    token
  };
};
/**
 * @summary Generates an e-mail verification token and saves it into the database.
 * @locus Server
 * @param {String} userId The id of the user to generate the  e-mail verification token for.
 * @param {String} email Which address of the user to generate the e-mail verification token for. This address must be in the user's `emails` list. If `null`, defaults to the first unverified email in the list.
 * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
 * @returns {Object} Object with {email, user, token} values.
 * @importFromPackage accounts-base
 */


Accounts.generateVerificationToken = (userId, email, extraTokenData) => {
  // Make sure the user exists, and email is one of their addresses.
  // Don't limit the fields in the user object since the user is returned
  // by the function and some other fields might be used elsewhere.
  const user = getUserById(userId);

  if (!user) {
    handleError("Can't find user");
  } // pick the first unverified email if we weren't passed an email.


  if (!email) {
    const emailRecord = (user.emails || []).find(e => !e.verified);
    email = (emailRecord || {}).address;

    if (!email) {
      handleError("That user has no unverified email addresses.");
    }
  } // make sure we have a valid email


  if (!email || !pluckAddresses(user.emails).includes(email)) {
    handleError("No such email for user.");
  }

  const token = Random.secret();
  const tokenRecord = {
    token,
    // TODO: This should probably be renamed to "email" to match reset token record.
    address: email,
    when: new Date()
  };

  if (extraTokenData) {
    Object.assign(tokenRecord, extraTokenData);
  }

  Meteor.users.update({
    _id: user._id
  }, {
    $push: {
      'services.email.verificationTokens': tokenRecord
    }
  }); // before passing to template, update user object with new token

  Meteor._ensure(user, 'services', 'email');

  if (!user.services.email.verificationTokens) {
    user.services.email.verificationTokens = [];
  }

  user.services.email.verificationTokens.push(tokenRecord);
  return {
    email,
    user,
    token
  };
};
/**
 * @summary Creates options for email sending for reset password and enroll account emails.
 * You can use this function when customizing a reset password or enroll account email sending.
 * @locus Server
 * @param {Object} email Which address of the user's to send the email to.
 * @param {Object} user The user object to generate options for.
 * @param {String} url URL to which user is directed to confirm the email.
 * @param {String} reason `resetPassword` or `enrollAccount`.
 * @returns {Object} Options which can be passed to `Email.send`.
 * @importFromPackage accounts-base
 */


Accounts.generateOptionsForEmail = (email, user, url, reason) => {
  const options = {
    to: email,
    from: Accounts.emailTemplates[reason].from ? Accounts.emailTemplates[reason].from(user) : Accounts.emailTemplates.from,
    subject: Accounts.emailTemplates[reason].subject(user)
  };

  if (typeof Accounts.emailTemplates[reason].text === 'function') {
    options.text = Accounts.emailTemplates[reason].text(user, url);
  }

  if (typeof Accounts.emailTemplates[reason].html === 'function') {
    options.html = Accounts.emailTemplates[reason].html(user, url);
  }

  if (typeof Accounts.emailTemplates.headers === 'object') {
    options.headers = Accounts.emailTemplates.headers;
  }

  return options;
}; // send the user an email with a link that when opened allows the user
// to set a new password, without the old password.

/**
 * @summary Send an email with a link the user can use to reset their password.
 * @locus Server
 * @param {String} userId The id of the user to send email to.
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first email in the list.
 * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
 * @param {Object} [extraParams] Optional additional params to be added to the reset url.
 * @returns {Object} Object with {email, user, token, url, options} values.
 * @importFromPackage accounts-base
 */


Accounts.sendResetPasswordEmail = (userId, email, extraTokenData, extraParams) => {
  const {
    email: realEmail,
    user,
    token
  } = Accounts.generateResetToken(userId, email, 'resetPassword', extraTokenData);
  const url = Accounts.urls.resetPassword(token, extraParams);
  const options = Accounts.generateOptionsForEmail(realEmail, user, url, 'resetPassword');
  Email.send(options);

  if (Meteor.isDevelopment) {
    console.log("\nReset password URL: ".concat(url));
  }

  return {
    email: realEmail,
    user,
    token,
    url,
    options
  };
}; // send the user an email informing them that their account was created, with
// a link that when opened both marks their email as verified and forces them
// to choose their password. The email must be one of the addresses in the
// user's emails field, or undefined to pick the first email automatically.
//
// This is not called automatically. It must be called manually if you
// want to use enrollment emails.

/**
 * @summary Send an email with a link the user can use to set their initial password.
 * @locus Server
 * @param {String} userId The id of the user to send email to.
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first email in the list.
 * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
 * @param {Object} [extraParams] Optional additional params to be added to the enrollment url.
 * @returns {Object} Object with {email, user, token, url, options} values.
 * @importFromPackage accounts-base
 */


Accounts.sendEnrollmentEmail = (userId, email, extraTokenData, extraParams) => {
  const {
    email: realEmail,
    user,
    token
  } = Accounts.generateResetToken(userId, email, 'enrollAccount', extraTokenData);
  const url = Accounts.urls.enrollAccount(token, extraParams);
  const options = Accounts.generateOptionsForEmail(realEmail, user, url, 'enrollAccount');
  Email.send(options);

  if (Meteor.isDevelopment) {
    console.log("\nEnrollment email URL: ".concat(url));
  }

  return {
    email: realEmail,
    user,
    token,
    url,
    options
  };
}; // Take token from sendResetPasswordEmail or sendEnrollmentEmail, change
// the users password, and log them in.


Meteor.methods({
  resetPassword: function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    const token = args[0];
    const newPassword = args[1];
    return Accounts._loginMethod(this, "resetPassword", args, "password", () => {
      check(token, String);
      check(newPassword, passwordValidator);
      const user = Meteor.users.findOne({
        "services.password.reset.token": token
      }, {
        fields: {
          services: 1,
          emails: 1
        }
      });

      if (!user) {
        throw new Meteor.Error(403, "Token expired");
      }

      const {
        when,
        reason,
        email
      } = user.services.password.reset;

      let tokenLifetimeMs = Accounts._getPasswordResetTokenLifetimeMs();

      if (reason === "enroll") {
        tokenLifetimeMs = Accounts._getPasswordEnrollTokenLifetimeMs();
      }

      const currentTimeMs = Date.now();
      if (currentTimeMs - when > tokenLifetimeMs) throw new Meteor.Error(403, "Token expired");
      if (!pluckAddresses(user.emails).includes(email)) return {
        userId: user._id,
        error: new Meteor.Error(403, "Token has invalid email address")
      };
      const hashed = hashPassword(newPassword); // NOTE: We're about to invalidate tokens on the user, who we might be
      // logged in as. Make sure to avoid logging ourselves out if this
      // happens. But also make sure not to leave the connection in a state
      // of having a bad token set if things fail.

      const oldToken = Accounts._getLoginToken(this.connection.id);

      Accounts._setLoginToken(user._id, this.connection, null);

      const resetToOldToken = () => Accounts._setLoginToken(user._id, this.connection, oldToken);

      try {
        // Update the user record by:
        // - Changing the password to the new one
        // - Forgetting about the reset token that was just used
        // - Verifying their email, since they got the password reset via email.
        const affectedRecords = Meteor.users.update({
          _id: user._id,
          'emails.address': email,
          'services.password.reset.token': token
        }, {
          $set: {
            'services.password.bcrypt': hashed,
            'emails.$.verified': true
          },
          $unset: {
            'services.password.reset': 1,
            'services.password.srp': 1
          }
        });
        if (affectedRecords !== 1) return {
          userId: user._id,
          error: new Meteor.Error(403, "Invalid email")
        };
      } catch (err) {
        resetToOldToken();
        throw err;
      } // Replace all valid login tokens with new ones (changing
      // password should invalidate existing sessions).


      Accounts._clearAllLoginTokens(user._id);

      return {
        userId: user._id
      };
    });
  }
}); ///
/// EMAIL VERIFICATION
///
// send the user an email with a link that when opened marks that
// address as verified

/**
 * @summary Send an email with a link the user can use verify their email address.
 * @locus Server
 * @param {String} userId The id of the user to send email to.
 * @param {String} [email] Optional. Which address of the user's to send the email to. This address must be in the user's `emails` list. Defaults to the first unverified email in the list.
 * @param {Object} [extraTokenData] Optional additional data to be added into the token record.
 * @param {Object} [extraParams] Optional additional params to be added to the verification url.
 *
 * @returns {Object} Object with {email, user, token, url, options} values.
 * @importFromPackage accounts-base
 */

Accounts.sendVerificationEmail = (userId, email, extraTokenData, extraParams) => {
  // XXX Also generate a link using which someone can delete this
  // account if they own said address but weren't those who created
  // this account.
  const {
    email: realEmail,
    user,
    token
  } = Accounts.generateVerificationToken(userId, email, extraTokenData);
  const url = Accounts.urls.verifyEmail(token, extraParams);
  const options = Accounts.generateOptionsForEmail(realEmail, user, url, 'verifyEmail');
  Email.send(options);

  if (Meteor.isDevelopment) {
    console.log("\nVerification email URL: ".concat(url));
  }

  return {
    email: realEmail,
    user,
    token,
    url,
    options
  };
}; // Take token from sendVerificationEmail, mark the email as verified,
// and log them in.


Meteor.methods({
  verifyEmail: function () {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    const token = args[0];
    return Accounts._loginMethod(this, "verifyEmail", args, "password", () => {
      check(token, String);
      const user = Meteor.users.findOne({
        'services.email.verificationTokens.token': token
      }, {
        fields: {
          services: 1,
          emails: 1
        }
      });
      if (!user) throw new Meteor.Error(403, "Verify email link expired");
      const tokenRecord = user.services.email.verificationTokens.find(t => t.token == token);
      if (!tokenRecord) return {
        userId: user._id,
        error: new Meteor.Error(403, "Verify email link expired")
      };
      const emailsRecord = user.emails.find(e => e.address == tokenRecord.address);
      if (!emailsRecord) return {
        userId: user._id,
        error: new Meteor.Error(403, "Verify email link is for unknown address")
      }; // By including the address in the query, we can use 'emails.$' in the
      // modifier to get a reference to the specific object in the emails
      // array. See
      // http://www.mongodb.org/display/DOCS/Updating/#Updating-The%24positionaloperator)
      // http://www.mongodb.org/display/DOCS/Updating#Updating-%24pull

      Meteor.users.update({
        _id: user._id,
        'emails.address': tokenRecord.address
      }, {
        $set: {
          'emails.$.verified': true
        },
        $pull: {
          'services.email.verificationTokens': {
            address: tokenRecord.address
          }
        }
      });
      return {
        userId: user._id
      };
    });
  }
});
/**
 * @summary Add an email address for a user. Use this instead of directly
 * updating the database. The operation will fail if there is a different user
 * with an email only differing in case. If the specified user has an existing
 * email only differing in case however, we replace it.
 * @locus Server
 * @param {String} userId The ID of the user to update.
 * @param {String} newEmail A new email address for the user.
 * @param {Boolean} [verified] Optional - whether the new email address should
 * be marked as verified. Defaults to false.
 * @importFromPackage accounts-base
 */

Accounts.addEmail = (userId, newEmail, verified) => {
  check(userId, NonEmptyString);
  check(newEmail, NonEmptyString);
  check(verified, Match.Optional(Boolean));

  if (verified === void 0) {
    verified = false;
  }

  const user = getUserById(userId, {
    fields: {
      emails: 1
    }
  });
  if (!user) throw new Meteor.Error(403, "User not found"); // Allow users to change their own email to a version with a different case
  // We don't have to call checkForCaseInsensitiveDuplicates to do a case
  // insensitive check across all emails in the database here because: (1) if
  // there is no case-insensitive duplicate between this user and other users,
  // then we are OK and (2) if this would create a conflict with other users
  // then there would already be a case-insensitive duplicate and we can't fix
  // that in this code anyway.

  const caseInsensitiveRegExp = new RegExp("^".concat(Meteor._escapeRegExp(newEmail), "$"), 'i');
  const didUpdateOwnEmail = (user.emails || []).reduce((prev, email) => {
    if (caseInsensitiveRegExp.test(email.address)) {
      Meteor.users.update({
        _id: user._id,
        'emails.address': email.address
      }, {
        $set: {
          'emails.$.address': newEmail,
          'emails.$.verified': verified
        }
      });
      return true;
    } else {
      return prev;
    }
  }, false); // In the other updates below, we have to do another call to
  // checkForCaseInsensitiveDuplicates to make sure that no conflicting values
  // were added to the database in the meantime. We don't have to do this for
  // the case where the user is updating their email address to one that is the
  // same as before, but only different because of capitalization. Read the
  // big comment above to understand why.

  if (didUpdateOwnEmail) {
    return;
  } // Perform a case insensitive check for duplicates before update


  checkForCaseInsensitiveDuplicates('emails.address', 'Email', newEmail, user._id);
  Meteor.users.update({
    _id: user._id
  }, {
    $addToSet: {
      emails: {
        address: newEmail,
        verified: verified
      }
    }
  }); // Perform another check after update, in case a matching user has been
  // inserted in the meantime

  try {
    checkForCaseInsensitiveDuplicates('emails.address', 'Email', newEmail, user._id);
  } catch (ex) {
    // Undo update if the check fails
    Meteor.users.update({
      _id: user._id
    }, {
      $pull: {
        emails: {
          address: newEmail
        }
      }
    });
    throw ex;
  }
};
/**
 * @summary Remove an email address for a user. Use this instead of updating
 * the database directly.
 * @locus Server
 * @param {String} userId The ID of the user to update.
 * @param {String} email The email address to remove.
 * @importFromPackage accounts-base
 */


Accounts.removeEmail = (userId, email) => {
  check(userId, NonEmptyString);
  check(email, NonEmptyString);
  const user = getUserById(userId, {
    fields: {
      _id: 1
    }
  });
  if (!user) throw new Meteor.Error(403, "User not found");
  Meteor.users.update({
    _id: user._id
  }, {
    $pull: {
      emails: {
        address: email
      }
    }
  });
}; ///
/// CREATING USERS
///
// Shared createUser function called from the createUser method, both
// if originates in client or server code. Calls user provided hooks,
// does the actual user insertion.
//
// returns the user id


const createUser = options => {
  // Unknown keys allowed, because a onCreateUserHook can take arbitrary
  // options.
  check(options, Match.ObjectIncluding({
    username: Match.Optional(String),
    email: Match.Optional(String),
    password: Match.Optional(passwordValidator)
  }));
  const {
    username,
    email,
    password
  } = options;
  if (!username && !email) throw new Meteor.Error(400, "Need to set a username or email");
  const user = {
    services: {}
  };

  if (password) {
    const hashed = hashPassword(password);
    user.services.password = {
      bcrypt: hashed
    };
  }

  if (username) user.username = username;
  if (email) user.emails = [{
    address: email,
    verified: false
  }]; // Perform a case insensitive check before insert

  checkForCaseInsensitiveDuplicates('username', 'Username', username);
  checkForCaseInsensitiveDuplicates('emails.address', 'Email', email);
  const userId = Accounts.insertUserDoc(options, user); // Perform another check after insert, in case a matching user has been
  // inserted in the meantime

  try {
    checkForCaseInsensitiveDuplicates('username', 'Username', username, userId);
    checkForCaseInsensitiveDuplicates('emails.address', 'Email', email, userId);
  } catch (ex) {
    // Remove inserted user if the check fails
    Meteor.users.remove(userId);
    throw ex;
  }

  return userId;
}; // method for create user. Requests come from the client.


Meteor.methods({
  createUser: function () {
    for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
      args[_key3] = arguments[_key3];
    }

    const options = args[0];
    return Accounts._loginMethod(this, "createUser", args, "password", () => {
      // createUser() above does more checking.
      check(options, Object);
      if (Accounts._options.forbidClientAccountCreation) return {
        error: new Meteor.Error(403, "Signups forbidden")
      };
      const userId = Accounts.createUserVerifyingEmail(options); // client gets logged in as the new user afterwards.

      return {
        userId: userId
      };
    });
  }
});
/**
 * @summary Creates an user and sends an email if `options.email` is informed.
 * Then if the `sendVerificationEmail` option from the `Accounts` package is
 * enabled, you'll send a verification email if `options.password` is informed,
 * otherwise you'll send an enrollment email.
 * @locus Server
 * @param {Object} options The options object to be passed down when creating
 * the user
 * @param {String} options.username A unique name for this user.
 * @param {String} options.email The user's email address.
 * @param {String} options.password The user's password. This is __not__ sent in plain text over the wire.
 * @param {Object} options.profile The user's profile, typically including the `name` field.
 * @importFromPackage accounts-base
 * */

Accounts.createUserVerifyingEmail = options => {
  options = _objectSpread({}, options); // Create user. result contains id and token.

  const userId = createUser(options); // safety belt. createUser is supposed to throw on error. send 500 error
  // instead of sending a verification email with empty userid.

  if (!userId) throw new Error("createUser failed to insert new user"); // If `Accounts._options.sendVerificationEmail` is set, register
  // a token to verify the user's primary email, and send it to
  // that address.

  if (options.email && Accounts._options.sendVerificationEmail) {
    if (options.password) {
      Accounts.sendVerificationEmail(userId, options.email);
    } else {
      Accounts.sendEnrollmentEmail(userId, options.email);
    }
  }

  return userId;
}; // Create user directly on the server.
//
// Unlike the client version, this does not log you in as this user
// after creation.
//
// returns userId or throws an error if it can't create
//
// XXX add another argument ("server options") that gets sent to onCreateUser,
// which is always empty when called from the createUser method? eg, "admin:
// true", which we want to prevent the client from setting, but which a custom
// method calling Accounts.createUser could set?
//


Accounts.createUser = (options, callback) => {
  options = _objectSpread({}, options); // XXX allow an optional callback?

  if (callback) {
    throw new Error("Accounts.createUser with callback not supported on the server yet.");
  }

  return createUser(options);
}; ///
/// PASSWORD-SPECIFIC INDEXES ON USERS
///


Meteor.users._ensureIndex('services.email.verificationTokens.token', {
  unique: true,
  sparse: true
});

Meteor.users._ensureIndex('services.password.reset.token', {
  unique: true,
  sparse: true
});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

require("/node_modules/meteor/accounts-password/email_templates.js");
require("/node_modules/meteor/accounts-password/password_server.js");

/* Exports */
Package._define("accounts-password");

})();

//# sourceURL=meteor://💻app/packages/accounts-password.js
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1ldGVvcjovL/CfkrthcHAvcGFja2FnZXMvYWNjb3VudHMtcGFzc3dvcmQvZW1haWxfdGVtcGxhdGVzLmpzIiwibWV0ZW9yOi8v8J+Su2FwcC9wYWNrYWdlcy9hY2NvdW50cy1wYXNzd29yZC9wYXNzd29yZF9zZXJ2ZXIuanMiXSwibmFtZXMiOlsiZ3JlZXQiLCJ3ZWxjb21lTXNnIiwidXNlciIsInVybCIsImdyZWV0aW5nIiwicHJvZmlsZSIsIm5hbWUiLCJBY2NvdW50cyIsImVtYWlsVGVtcGxhdGVzIiwiZnJvbSIsInNpdGVOYW1lIiwiTWV0ZW9yIiwiYWJzb2x1dGVVcmwiLCJyZXBsYWNlIiwicmVzZXRQYXNzd29yZCIsInN1YmplY3QiLCJ0ZXh0IiwidmVyaWZ5RW1haWwiLCJlbnJvbGxBY2NvdW50IiwiX29iamVjdFNwcmVhZCIsIm1vZHVsZSIsImxpbmsiLCJkZWZhdWx0IiwidiIsImJjcnlwdCIsIk5wbU1vZHVsZUJjcnlwdCIsImJjcnlwdEhhc2giLCJ3cmFwQXN5bmMiLCJoYXNoIiwiYmNyeXB0Q29tcGFyZSIsImNvbXBhcmUiLCJnZXRVc2VyQnlJZCIsImlkIiwib3B0aW9ucyIsInVzZXJzIiwiZmluZE9uZSIsIl9hZGREZWZhdWx0RmllbGRTZWxlY3RvciIsIl9iY3J5cHRSb3VuZHMiLCJfb3B0aW9ucyIsImJjcnlwdFJvdW5kcyIsImdldFBhc3N3b3JkU3RyaW5nIiwicGFzc3dvcmQiLCJTSEEyNTYiLCJhbGdvcml0aG0iLCJFcnJvciIsImRpZ2VzdCIsImhhc2hQYXNzd29yZCIsImdldFJvdW5kc0Zyb21CY3J5cHRIYXNoIiwicm91bmRzIiwiaGFzaFNlZ21lbnRzIiwic3BsaXQiLCJsZW5ndGgiLCJwYXJzZUludCIsIl9jaGVja1Bhc3N3b3JkVXNlckZpZWxkcyIsIl9pZCIsInNlcnZpY2VzIiwiX2NoZWNrUGFzc3dvcmQiLCJyZXN1bHQiLCJ1c2VySWQiLCJmb3JtYXR0ZWRQYXNzd29yZCIsImhhc2hSb3VuZHMiLCJlcnJvciIsImhhbmRsZUVycm9yIiwiZGVmZXIiLCJ1cGRhdGUiLCIkc2V0IiwiY2hlY2tQYXNzd29yZCIsIm1zZyIsInRocm93RXJyb3IiLCJhbWJpZ3VvdXNFcnJvck1lc3NhZ2VzIiwiX2ZpbmRVc2VyQnlRdWVyeSIsInF1ZXJ5IiwiZmllbGROYW1lIiwiZmllbGRWYWx1ZSIsInVzZXJuYW1lIiwiZW1haWwiLCJzZWxlY3RvciIsInNlbGVjdG9yRm9yRmFzdENhc2VJbnNlbnNpdGl2ZUxvb2t1cCIsImNhbmRpZGF0ZVVzZXJzIiwiZmluZCIsImZldGNoIiwiZmluZFVzZXJCeVVzZXJuYW1lIiwiZmluZFVzZXJCeUVtYWlsIiwic3RyaW5nIiwicHJlZml4Iiwic3Vic3RyaW5nIiwiTWF0aCIsIm1pbiIsIm9yQ2xhdXNlIiwiZ2VuZXJhdGVDYXNlUGVybXV0YXRpb25zRm9yU3RyaW5nIiwibWFwIiwicHJlZml4UGVybXV0YXRpb24iLCJSZWdFeHAiLCJfZXNjYXBlUmVnRXhwIiwiY2FzZUluc2Vuc2l0aXZlQ2xhdXNlIiwiJGFuZCIsIiRvciIsInBlcm11dGF0aW9ucyIsImkiLCJjaCIsImNoYXJBdCIsImNvbmNhdCIsImxvd2VyQ2FzZUNoYXIiLCJ0b0xvd2VyQ2FzZSIsInVwcGVyQ2FzZUNoYXIiLCJ0b1VwcGVyQ2FzZSIsImNoZWNrRm9yQ2FzZUluc2Vuc2l0aXZlRHVwbGljYXRlcyIsImRpc3BsYXlOYW1lIiwib3duVXNlcklkIiwic2tpcENoZWNrIiwiT2JqZWN0IiwicHJvdG90eXBlIiwiaGFzT3duUHJvcGVydHkiLCJjYWxsIiwiX3NraXBDYXNlSW5zZW5zaXRpdmVDaGVja3NGb3JUZXN0IiwibWF0Y2hlZFVzZXJzIiwiZmllbGRzIiwibGltaXQiLCJOb25FbXB0eVN0cmluZyIsIk1hdGNoIiwiV2hlcmUiLCJ4IiwiY2hlY2siLCJTdHJpbmciLCJ1c2VyUXVlcnlWYWxpZGF0b3IiLCJPcHRpb25hbCIsImtleXMiLCJwYXNzd29yZFZhbGlkYXRvciIsIk9uZU9mIiwic3RyIiwidGVzdCIsInNldHRpbmdzIiwicGFja2FnZXMiLCJhY2NvdW50cyIsInBhc3N3b3JkTWF4TGVuZ3RoIiwicmVnaXN0ZXJMb2dpbkhhbmRsZXIiLCJzcnAiLCJ1bmRlZmluZWQiLCJ2ZXJpZmllciIsIm5ld1ZlcmlmaWVyIiwiU1JQIiwiZ2VuZXJhdGVWZXJpZmllciIsImlkZW50aXR5Iiwic2FsdCIsIkVKU09OIiwic3RyaW5naWZ5IiwiZm9ybWF0IiwidjEiLCJ2MiIsImhhc2hlZElkZW50aXR5QW5kUGFzc3dvcmQiLCJzYWx0ZWQiLCIkdW5zZXQiLCJzZXRVc2VybmFtZSIsIm5ld1VzZXJuYW1lIiwib2xkVXNlcm5hbWUiLCJleCIsIm1ldGhvZHMiLCJjaGFuZ2VQYXNzd29yZCIsIm9sZFBhc3N3b3JkIiwibmV3UGFzc3dvcmQiLCJoYXNoZWQiLCJjdXJyZW50VG9rZW4iLCJfZ2V0TG9naW5Ub2tlbiIsImNvbm5lY3Rpb24iLCIkcHVsbCIsImhhc2hlZFRva2VuIiwiJG5lIiwicGFzc3dvcmRDaGFuZ2VkIiwic2V0UGFzc3dvcmQiLCJuZXdQbGFpbnRleHRQYXNzd29yZCIsImxvZ291dCIsInBsdWNrQWRkcmVzc2VzIiwiZW1haWxzIiwiYWRkcmVzcyIsImZvcmdvdFBhc3N3b3JkIiwiY2FzZVNlbnNpdGl2ZUVtYWlsIiwic2VuZFJlc2V0UGFzc3dvcmRFbWFpbCIsImdlbmVyYXRlUmVzZXRUb2tlbiIsInJlYXNvbiIsImV4dHJhVG9rZW5EYXRhIiwiaW5jbHVkZXMiLCJ0b2tlbiIsIlJhbmRvbSIsInNlY3JldCIsInRva2VuUmVjb3JkIiwid2hlbiIsIkRhdGUiLCJhc3NpZ24iLCJfZW5zdXJlIiwicmVzZXQiLCJnZW5lcmF0ZVZlcmlmaWNhdGlvblRva2VuIiwiZW1haWxSZWNvcmQiLCJlIiwidmVyaWZpZWQiLCIkcHVzaCIsInZlcmlmaWNhdGlvblRva2VucyIsInB1c2giLCJnZW5lcmF0ZU9wdGlvbnNGb3JFbWFpbCIsInRvIiwiaHRtbCIsImhlYWRlcnMiLCJleHRyYVBhcmFtcyIsInJlYWxFbWFpbCIsInVybHMiLCJFbWFpbCIsInNlbmQiLCJpc0RldmVsb3BtZW50IiwiY29uc29sZSIsImxvZyIsInNlbmRFbnJvbGxtZW50RW1haWwiLCJhcmdzIiwiX2xvZ2luTWV0aG9kIiwidG9rZW5MaWZldGltZU1zIiwiX2dldFBhc3N3b3JkUmVzZXRUb2tlbkxpZmV0aW1lTXMiLCJfZ2V0UGFzc3dvcmRFbnJvbGxUb2tlbkxpZmV0aW1lTXMiLCJjdXJyZW50VGltZU1zIiwibm93Iiwib2xkVG9rZW4iLCJfc2V0TG9naW5Ub2tlbiIsInJlc2V0VG9PbGRUb2tlbiIsImFmZmVjdGVkUmVjb3JkcyIsImVyciIsIl9jbGVhckFsbExvZ2luVG9rZW5zIiwic2VuZFZlcmlmaWNhdGlvbkVtYWlsIiwidCIsImVtYWlsc1JlY29yZCIsImFkZEVtYWlsIiwibmV3RW1haWwiLCJCb29sZWFuIiwiY2FzZUluc2Vuc2l0aXZlUmVnRXhwIiwiZGlkVXBkYXRlT3duRW1haWwiLCJyZWR1Y2UiLCJwcmV2IiwiJGFkZFRvU2V0IiwicmVtb3ZlRW1haWwiLCJjcmVhdGVVc2VyIiwiT2JqZWN0SW5jbHVkaW5nIiwiaW5zZXJ0VXNlckRvYyIsInJlbW92ZSIsImZvcmJpZENsaWVudEFjY291bnRDcmVhdGlvbiIsImNyZWF0ZVVzZXJWZXJpZnlpbmdFbWFpbCIsImNhbGxiYWNrIiwiX2Vuc3VyZUluZGV4IiwidW5pcXVlIiwic3BhcnNlIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNQSxLQUFLLEdBQUdDLFVBQVUsSUFBSSxDQUFDQyxJQUFELEVBQU9DLEdBQVAsS0FBZTtBQUNyQyxRQUFNQyxRQUFRLEdBQUlGLElBQUksQ0FBQ0csT0FBTCxJQUFnQkgsSUFBSSxDQUFDRyxPQUFMLENBQWFDLElBQTlCLG1CQUNESixJQUFJLENBQUNHLE9BQUwsQ0FBYUMsSUFEWixTQUN1QixRQUR4QztBQUVBLG1CQUFVRixRQUFWLGlCQUVKSCxVQUZJLCtDQUlKRSxHQUpJO0FBUUwsQ0FYRDtBQWFBO0FBQ0E7QUFDQTtBQUNB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eUNBQTFCLEVBQzBCO0FBQUVDLFFBQU0sRUFBRSxJQUFWO0FBQWdCQyxRQUFNLEVBQUU7QUFBeEIsQ0FEMUI7O0FBRUF6TyxNQUFNLENBQUN1QixLQUFQLENBQWFnTixZQUFiLENBQTBCLCtCQUExQixFQUMwQjtBQUFFQyxRQUFNLEVBQUUsSUFBVjtBQUFnQkMsUUFBTSxFQUFFO0FBQXhCLENBRDFCLEUiLCJmaWxlIjoiL3BhY2thZ2VzL2FjY291bnRzLXBhc3N3b3JkLmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgZ3JlZXQgPSB3ZWxjb21lTXNnID0+ICh1c2VyLCB1cmwpID0+IHtcbiAgICAgIGNvbnN0IGdyZWV0aW5nID0gKHVzZXIucHJvZmlsZSAmJiB1c2VyLnByb2ZpbGUubmFtZSkgP1xuICAgICAgICAgICAgKGBIZWxsbyAke3VzZXIucHJvZmlsZS5uYW1lfSxgKSA6IFwiSGVsbG8sXCI7XG4gICAgICByZXR1cm4gYCR7Z3JlZXRpbmd9XG5cbiR7d2VsY29tZU1zZ30sIHNpbXBseSBjbGljayB0aGUgbGluayBiZWxvdy5cblxuJHt1cmx9XG5cblRoYW5rcy5cbmA7XG59O1xuXG4vKipcbiAqIEBzdW1tYXJ5IE9wdGlvbnMgdG8gY3VzdG9taXplIGVtYWlscyBzZW50IGZyb20gdGhlIEFjY291bnRzIHN5c3RlbS5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBpbXBvcnRGcm9tUGFja2FnZSBhY2NvdW50cy1iYXNlXG4gKi9cbkFjY291bnRzLmVtYWlsVGVtcGxhdGVzID0ge1xuICBmcm9tOiBcIkFjY291bnRzIEV4YW1wbGUgPG5vLXJlcGx5QGV4YW1wbGUuY29tPlwiLFxuICBzaXRlTmFtZTogTWV0ZW9yLmFic29sdXRlVXJsKCkucmVwbGFjZSgvXmh0dHBzPzpcXC9cXC8vLCAnJykucmVwbGFjZSgvXFwvJC8sICcnKSxcblxuICByZXNldFBhc3N3b3JkOiB7XG4gICAgc3ViamVjdDogKCkgPT4gYEhvdyB0byByZXNldCB5b3VyIHBhc3N3b3JkIG9uICR7QWNjb3VudHMuZW1haWxUZW1wbGF0ZXMuc2l0ZU5hbWV9YCxcbiAgICB0ZXh0OiBncmVldChcIlRvIHJlc2V0IHlvdXIgcGFzc3dvcmRcIiksXG4gIH0sXG4gIHZlcmlmeUVtYWlsOiB7XG4gICAgc3ViamVjdDogKCkgPT4gYEhvdyB0byB2ZXJpZnkgZW1haWwgYWRkcmVzcyBvbiAke0FjY291bnRzLmVtYWlsVGVtcGxhdGVzLnNpdGVOYW1lfWAsXG4gICAgdGV4dDogZ3JlZXQoXCJUbyB2ZXJpZnkgeW91ciBhY2NvdW50IGVtYWlsXCIpLFxuICB9LFxuICBlbnJvbGxBY2NvdW50OiB7XG4gICAgc3ViamVjdDogKCkgPT4gYEFuIGFjY291bnQgaGFzIGJlZW4gY3JlYXRlZCBmb3IgeW91IG9uICR7QWNjb3VudHMuZW1haWxUZW1wbGF0ZXMuc2l0ZU5hbWV9YCxcbiAgICB0ZXh0OiBncmVldChcIlRvIHN0YXJ0IHVzaW5nIHRoZSBzZXJ2aWNlXCIpLFxuICB9LFxufTtcbiIsIi8vLyBCQ1JZUFRcblxuY29uc3QgYmNyeXB0ID0gTnBtTW9kdWxlQmNyeXB0O1xuY29uc3QgYmNyeXB0SGFzaCA9IE1ldGVvci53cmFwQXN5bmMoYmNyeXB0Lmhhc2gpO1xuY29uc3QgYmNyeXB0Q29tcGFyZSA9IE1ldGVvci53cmFwQXN5bmMoYmNyeXB0LmNvbXBhcmUpO1xuXG4vLyBVdGlsaXR5IGZvciBncmFiYmluZyB1c2VyXG5jb25zdCBnZXRVc2VyQnlJZCA9IChpZCwgb3B0aW9ucykgPT4gTWV0ZW9yLnVzZXJzLmZpbmRPbmUoaWQsIEFjY291bnRzLl9hZGREZWZhdWx0RmllbGRTZWxlY3RvcihvcHRpb25zKSk7XG5cbi8vIFVzZXIgcmVjb3JkcyBoYXZlIGEgJ3NlcnZpY2VzLnBhc3N3b3JkLmJjcnlwdCcgZmllbGQgb24gdGhlbSB0byBob2xkXG4vLyB0aGVpciBoYXNoZWQgcGFzc3dvcmRzICh1bmxlc3MgdGhleSBoYXZlIGEgJ3NlcnZpY2VzLnBhc3N3b3JkLnNycCdcbi8vIGZpZWxkLCBpbiB3aGljaCBjYXNlIHRoZXkgd2lsbCBiZSB1cGdyYWRlZCB0byBiY3J5cHQgdGhlIG5leHQgdGltZVxuLy8gdGhleSBsb2cgaW4pLlxuLy9cbi8vIFdoZW4gdGhlIGNsaWVudCBzZW5kcyBhIHBhc3N3b3JkIHRvIHRoZSBzZXJ2ZXIsIGl0IGNhbiBlaXRoZXIgYmUgYVxuLy8gc3RyaW5nICh0aGUgcGxhaW50ZXh0IHBhc3N3b3JkKSBvciBhbiBvYmplY3Qgd2l0aCBrZXlzICdkaWdlc3QnIGFuZFxuLy8gJ2FsZ29yaXRobScgKG11c3QgYmUgXCJzaGEtMjU2XCIgZm9yIG5vdykuIFRoZSBNZXRlb3IgY2xpZW50IGFsd2F5cyBzZW5kc1xuLy8gcGFzc3dvcmQgb2JqZWN0cyB7IGRpZ2VzdDogKiwgYWxnb3JpdGhtOiBcInNoYS0yNTZcIiB9LCBidXQgRERQIGNsaWVudHNcbi8vIHRoYXQgZG9uJ3QgaGF2ZSBhY2Nlc3MgdG8gU0hBIGNhbiBqdXN0IHNlbmQgcGxhaW50ZXh0IHBhc3N3b3JkcyBhc1xuLy8gc3RyaW5ncy5cbi8vXG4vLyBXaGVuIHRoZSBzZXJ2ZXIgcmVjZWl2ZXMgYSBwbGFpbnRleHQgcGFzc3dvcmQgYXMgYSBzdHJpbmcsIGl0IGFsd2F5c1xuLy8gaGFzaGVzIGl0IHdpdGggU0hBMjU2IGJlZm9yZSBwYXNzaW5nIGl0IGludG8gYmNyeXB0LiBXaGVuIHRoZSBzZXJ2ZXJcbi8vIHJlY2VpdmVzIGEgcGFzc3dvcmQgYXMgYW4gb2JqZWN0LCBpdCBhc3NlcnRzIHRoYXQgdGhlIGFsZ29yaXRobSBpc1xuLy8gXCJzaGEtMjU2XCIgYW5kIHRoZW4gcGFzc2VzIHRoZSBkaWdlc3QgdG8gYmNyeXB0LlxuXG5cbkFjY291bnRzLl9iY3J5cHRSb3VuZHMgPSAoKSA9PiBBY2NvdW50cy5fb3B0aW9ucy5iY3J5cHRSb3VuZHMgfHwgMTA7XG5cbi8vIEdpdmVuIGEgJ3Bhc3N3b3JkJyBmcm9tIHRoZSBjbGllbnQsIGV4dHJhY3QgdGhlIHN0cmluZyB0aGF0IHdlIHNob3VsZFxuLy8gYmNyeXB0LiAncGFzc3dvcmQnIGNhbiBiZSBvbmUgb2Y6XG4vLyAgLSBTdHJpbmcgKHRoZSBwbGFpbnRleHQgcGFzc3dvcmQpXG4vLyAgLSBPYmplY3Qgd2l0aCAnZGlnZXN0JyBhbmQgJ2FsZ29yaXRobScga2V5cy4gJ2FsZ29yaXRobScgbXVzdCBiZSBcInNoYS0yNTZcIi5cbi8vXG5jb25zdCBnZXRQYXNzd29yZFN0cmluZyA9IHBhc3N3b3JkID0+IHtcbiAgaWYgKHR5cGVvZiBwYXNzd29yZCA9PT0gXCJzdHJpbmdcIikge1xuICAgIHBhc3N3b3JkID0gU0hBMjU2KHBhc3N3b3JkKTtcbiAgfSBlbHNlIHsgLy8gJ3Bhc3N3b3JkJyBpcyBhbiBvYmplY3RcbiAgICBpZiAocGFzc3dvcmQuYWxnb3JpdGhtICE9PSBcInNoYS0yNTZcIikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSW52YWxpZCBwYXNzd29yZCBoYXNoIGFsZ29yaXRobS4gXCIgK1xuICAgICAgICAgICAgICAgICAgICAgIFwiT25seSAnc2hhLTI1NicgaXMgYWxsb3dlZC5cIik7XG4gICAgfVxuICAgIHBhc3N3b3JkID0gcGFzc3dvcmQuZGlnZXN0O1xuICB9XG4gIHJldHVybiBwYXNzd29yZDtcbn07XG5cbi8vIFVzZSBiY3J5cHQgdG8gaGFzaCB0aGUgcGFzc3dvcmQgZm9yIHN0b3JhZ2UgaW4gdGhlIGRhdGFiYXNlLlxuLy8gYHBhc3N3b3JkYCBjYW4gYmUgYSBzdHJpbmcgKGluIHdoaWNoIGNhc2UgaXQgd2lsbCBiZSBydW4gdGhyb3VnaFxuLy8gU0hBMjU2IGJlZm9yZSBiY3J5cHQpIG9yIGFuIG9iamVjdCB3aXRoIHByb3BlcnRpZXMgYGRpZ2VzdGAgYW5kXG4vLyBgYWxnb3JpdGhtYCAoaW4gd2hpY2ggY2FzZSB3ZSBiY3J5cHQgYHBhc3N3b3JkLmRpZ2VzdGApLlxuLy9cbmNvbnN0IGhhc2hQYXNzd29yZCA9IHBhc3N3b3JkID0+IHtcbiAgcGFzc3dvcmQgPSBnZXRQYXNzd29yZFN0cmluZyhwYXNzd29yZCk7XG4gIHJldHVybiBiY3J5cHRIYXNoKHBhc3N3b3JkLCBBY2NvdW50cy5fYmNyeXB0Um91bmRzKCkpO1xufTtcblxuLy8gRXh0cmFjdCB0aGUgbnVtYmVyIG9mIHJvdW5kcyB1c2VkIGluIHRoZSBzcGVjaWZpZWQgYmNyeXB0IGhhc2guXG5jb25zdCBnZXRSb3VuZHNGcm9tQmNyeXB0SGFzaCA9IGhhc2ggPT4ge1xuICBsZXQgcm91bmRzO1xuICBpZiAoaGFzaCkge1xuICAgIGNvbnN0IGhhc2hTZWdtZW50cyA9IGhhc2guc3BsaXQoJyQnKTtcbiAgICBpZiAoaGFzaFNlZ21lbnRzLmxlbmd0aCA+IDIpIHtcbiAgICAgIHJvdW5kcyA9IHBhcnNlSW50KGhhc2hTZWdtZW50c1syXSwgMTApO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcm91bmRzO1xufTtcblxuLy8gQ2hlY2sgd2hldGhlciB0aGUgcHJvdmlkZWQgcGFzc3dvcmQgbWF0Y2hlcyB0aGUgYmNyeXB0J2VkIHBhc3N3b3JkIGluXG4vLyB0aGUgZGF0YWJhc2UgdXNlciByZWNvcmQuIGBwYXNzd29yZGAgY2FuIGJlIGEgc3RyaW5nIChpbiB3aGljaCBjYXNlXG4vLyBpdCB3aWxsIGJlIHJ1biB0aHJvdWdoIFNIQTI1NiBiZWZvcmUgYmNyeXB0KSBvciBhbiBvYmplY3Qgd2l0aFxuLy8gcHJvcGVydGllcyBgZGlnZXN0YCBhbmQgYGFsZ29yaXRobWAgKGluIHdoaWNoIGNhc2Ugd2UgYmNyeXB0XG4vLyBgcGFzc3dvcmQuZGlnZXN0YCkuXG4vL1xuLy8gVGhlIHVzZXIgcGFyYW1ldGVyIG5lZWRzIGF0IGxlYXN0IHVzZXIuX2lkIGFuZCB1c2VyLnNlcnZpY2VzXG5BY2NvdW50cy5fY2hlY2tQYXNzd29yZFVzZXJGaWVsZHMgPSB7X2lkOiAxLCBzZXJ2aWNlczogMX07XG4vL1xuQWNjb3VudHMuX2NoZWNrUGFzc3dvcmQgPSAodXNlciwgcGFzc3dvcmQpID0+IHtcbiAgY29uc3QgcmVzdWx0ID0ge1xuICAgIHVzZXJJZDogdXNlci5faWRcbiAgfTtcblxuICBjb25zdCBmb3JtYXR0ZWRQYXNzd29yZCA9IGdldFBhc3N3b3JkU3RyaW5nKHBhc3N3b3JkKTtcbiAgY29uc3QgaGFzaCA9IHVzZXIuc2VydmljZXMucGFzc3dvcmQuYmNyeXB0O1xuICBjb25zdCBoYXNoUm91bmRzID0gZ2V0Um91bmRzRnJvbUJjcnlwdEhhc2goaGFzaCk7XG5cbiAgaWYgKCEgYmNyeXB0Q29tcGFyZShmb3JtYXR0ZWRQYXNzd29yZCwgaGFzaCkpIHtcbiAgICByZXN1bHQuZXJyb3IgPSBoYW5kbGVFcnJvcihcIkluY29ycmVjdCBwYXNzd29yZFwiLCBmYWxzZSk7XG4gIH0gZWxzZSBpZiAoaGFzaCAmJiBBY2NvdW50cy5fYmNyeXB0Um91bmRzKCkgIT0gaGFzaFJvdW5kcykge1xuICAgIC8vIFRoZSBwYXNzd29yZCBjaGVja3Mgb3V0LCBidXQgdGhlIHVzZXIncyBiY3J5cHQgaGFzaCBuZWVkcyB0byBiZSB1cGRhdGVkLlxuICAgIE1ldGVvci5kZWZlcigoKSA9PiB7XG4gICAgICBNZXRlb3IudXNlcnMudXBkYXRlKHsgX2lkOiB1c2VyLl9pZCB9LCB7XG4gICAgICAgICRzZXQ6IHtcbiAgICAgICAgICAnc2VydmljZXMucGFzc3dvcmQuYmNyeXB0JzpcbiAgICAgICAgICAgIGJjcnlwdEhhc2goZm9ybWF0dGVkUGFzc3dvcmQsIEFjY291bnRzLl9iY3J5cHRSb3VuZHMoKSlcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufTtcbmNvbnN0IGNoZWNrUGFzc3dvcmQgPSBBY2NvdW50cy5fY2hlY2tQYXNzd29yZDtcblxuLy8vXG4vLy8gRVJST1IgSEFORExFUlxuLy8vXG5jb25zdCBoYW5kbGVFcnJvciA9IChtc2csIHRocm93RXJyb3IgPSB0cnVlKSA9PiB7XG4gIGNvbnN0IGVycm9yID0gbmV3IE1ldGVvci5FcnJvcihcbiAgICA0MDMsXG4gICAgQWNjb3VudHMuX29wdGlvbnMuYW1iaWd1b3VzRXJyb3JNZXNzYWdlc1xuICAgICAgPyBcIlNvbWV0aGluZyB3ZW50IHdyb25nLiBQbGVhc2UgY2hlY2sgeW91ciBjcmVkZW50aWFscy5cIlxuICAgICAgOiBtc2dcbiAgKTtcbiAgaWYgKHRocm93RXJyb3IpIHtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuICByZXR1cm4gZXJyb3I7XG59O1xuXG4vLy9cbi8vLyBMT0dJTlxuLy8vXG5cbkFjY291bnRzLl9maW5kVXNlckJ5UXVlcnkgPSAocXVlcnksIG9wdGlvbnMpID0+IHtcbiAgbGV0IHVzZXIgPSBudWxsO1xuXG4gIGlmIChxdWVyeS5pZCkge1xuICAgIC8vIGRlZmF1bHQgZmllbGQgc2VsZWN0b3IgaXMgYWRkZWQgd2l0aGluIGdldFVzZXJCeUlkKClcbiAgICB1c2VyID0gZ2V0VXNlckJ5SWQocXVlcnkuaWQsIG9wdGlvbnMpO1xuICB9IGVsc2Uge1xuICAgIG9wdGlvbnMgPSBBY2NvdW50cy5fYWRkRGVmYXVsdEZpZWxkU2VsZWN0b3Iob3B0aW9ucyk7XG4gICAgbGV0IGZpZWxkTmFtZTtcbiAgICBsZXQgZmllbGRWYWx1ZTtcbiAgICBpZiAocXVlcnkudXNlcm5hbWUpIHtcbiAgICAgIGZpZWxkTmFtZSA9ICd1c2VybmFtZSc7XG4gICAgICBmaWVsZFZhbHVlID0gcXVlcnkudXNlcm5hbWU7XG4gICAgfSBlbHNlIGlmIChxdWVyeS5lbWFpbCkge1xuICAgICAgZmllbGROYW1lID0gJ2VtYWlscy5hZGRyZXNzJztcbiAgICAgIGZpZWxkVmFsdWUgPSBxdWVyeS5lbWFpbDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwic2hvdWxkbid0IGhhcHBlbiAodmFsaWRhdGlvbiBtaXNzZWQgc29tZXRoaW5nKVwiKTtcbiAgICB9XG4gICAgbGV0IHNlbGVjdG9yID0ge307XG4gICAgc2VsZWN0b3JbZmllbGROYW1lXSA9IGZpZWxkVmFsdWU7XG4gICAgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKHNlbGVjdG9yLCBvcHRpb25zKTtcbiAgICAvLyBJZiB1c2VyIGlzIG5vdCBmb3VuZCwgdHJ5IGEgY2FzZSBpbnNlbnNpdGl2ZSBsb29rdXBcbiAgICBpZiAoIXVzZXIpIHtcbiAgICAgIHNlbGVjdG9yID0gc2VsZWN0b3JGb3JGYXN0Q2FzZUluc2Vuc2l0aXZlTG9va3VwKGZpZWxkTmFtZSwgZmllbGRWYWx1ZSk7XG4gICAgICBjb25zdCBjYW5kaWRhdGVVc2VycyA9IE1ldGVvci51c2Vycy5maW5kKHNlbGVjdG9yLCBvcHRpb25zKS5mZXRjaCgpO1xuICAgICAgLy8gTm8gbWF0Y2ggaWYgbXVsdGlwbGUgY2FuZGlkYXRlcyBhcmUgZm91bmRcbiAgICAgIGlmIChjYW5kaWRhdGVVc2Vycy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgdXNlciA9IGNhbmRpZGF0ZVVzZXJzWzBdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB1c2VyO1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBGaW5kcyB0aGUgdXNlciB3aXRoIHRoZSBzcGVjaWZpZWQgdXNlcm5hbWUuXG4gKiBGaXJzdCB0cmllcyB0byBtYXRjaCB1c2VybmFtZSBjYXNlIHNlbnNpdGl2ZWx5OyBpZiB0aGF0IGZhaWxzLCBpdFxuICogdHJpZXMgY2FzZSBpbnNlbnNpdGl2ZWx5OyBidXQgaWYgbW9yZSB0aGFuIG9uZSB1c2VyIG1hdGNoZXMgdGhlIGNhc2VcbiAqIGluc2Vuc2l0aXZlIHNlYXJjaCwgaXQgcmV0dXJucyBudWxsLlxuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJuYW1lIFRoZSB1c2VybmFtZSB0byBsb29rIGZvclxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHBhcmFtIHtNb25nb0ZpZWxkU3BlY2lmaWVyfSBvcHRpb25zLmZpZWxkcyBEaWN0aW9uYXJ5IG9mIGZpZWxkcyB0byByZXR1cm4gb3IgZXhjbHVkZS5cbiAqIEByZXR1cm5zIHtPYmplY3R9IEEgdXNlciBpZiBmb3VuZCwgZWxzZSBudWxsXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5maW5kVXNlckJ5VXNlcm5hbWUgPVxuICAodXNlcm5hbWUsIG9wdGlvbnMpID0+IEFjY291bnRzLl9maW5kVXNlckJ5UXVlcnkoeyB1c2VybmFtZSB9LCBvcHRpb25zKTtcblxuLyoqXG4gKiBAc3VtbWFyeSBGaW5kcyB0aGUgdXNlciB3aXRoIHRoZSBzcGVjaWZpZWQgZW1haWwuXG4gKiBGaXJzdCB0cmllcyB0byBtYXRjaCBlbWFpbCBjYXNlIHNlbnNpdGl2ZWx5OyBpZiB0aGF0IGZhaWxzLCBpdFxuICogdHJpZXMgY2FzZSBpbnNlbnNpdGl2ZWx5OyBidXQgaWYgbW9yZSB0aGFuIG9uZSB1c2VyIG1hdGNoZXMgdGhlIGNhc2VcbiAqIGluc2Vuc2l0aXZlIHNlYXJjaCwgaXQgcmV0dXJucyBudWxsLlxuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHtTdHJpbmd9IGVtYWlsIFRoZSBlbWFpbCBhZGRyZXNzIHRvIGxvb2sgZm9yXG4gKiBAcGFyYW0ge09iamVjdH0gW29wdGlvbnNdXG4gKiBAcGFyYW0ge01vbmdvRmllbGRTcGVjaWZpZXJ9IG9wdGlvbnMuZmllbGRzIERpY3Rpb25hcnkgb2YgZmllbGRzIHRvIHJldHVybiBvciBleGNsdWRlLlxuICogQHJldHVybnMge09iamVjdH0gQSB1c2VyIGlmIGZvdW5kLCBlbHNlIG51bGxcbiAqIEBpbXBvcnRGcm9tUGFja2FnZSBhY2NvdW50cy1iYXNlXG4gKi9cbkFjY291bnRzLmZpbmRVc2VyQnlFbWFpbCA9XG4gIChlbWFpbCwgb3B0aW9ucykgPT4gQWNjb3VudHMuX2ZpbmRVc2VyQnlRdWVyeSh7IGVtYWlsIH0sIG9wdGlvbnMpO1xuXG4vLyBHZW5lcmF0ZXMgYSBNb25nb0RCIHNlbGVjdG9yIHRoYXQgY2FuIGJlIHVzZWQgdG8gcGVyZm9ybSBhIGZhc3QgY2FzZVxuLy8gaW5zZW5zaXRpdmUgbG9va3VwIGZvciB0aGUgZ2l2ZW4gZmllbGROYW1lIGFuZCBzdHJpbmcuIFNpbmNlIE1vbmdvREIgZG9lc1xuLy8gbm90IHN1cHBvcnQgY2FzZSBpbnNlbnNpdGl2ZSBpbmRleGVzLCBhbmQgY2FzZSBpbnNlbnNpdGl2ZSByZWdleCBxdWVyaWVzXG4vLyBhcmUgc2xvdywgd2UgY29uc3RydWN0IGEgc2V0IG9mIHByZWZpeCBzZWxlY3RvcnMgZm9yIGFsbCBwZXJtdXRhdGlvbnMgb2Zcbi8vIHRoZSBmaXJzdCA0IGNoYXJhY3RlcnMgb3Vyc2VsdmVzLiBXZSBmaXJzdCBhdHRlbXB0IHRvIG1hdGNoaW5nIGFnYWluc3Rcbi8vIHRoZXNlLCBhbmQgYmVjYXVzZSAncHJlZml4IGV4cHJlc3Npb24nIHJlZ2V4IHF1ZXJpZXMgZG8gdXNlIGluZGV4ZXMgKHNlZVxuLy8gaHR0cDovL2RvY3MubW9uZ29kYi5vcmcvdjIuNi9yZWZlcmVuY2Uvb3BlcmF0b3IvcXVlcnkvcmVnZXgvI2luZGV4LXVzZSksXG4vLyB0aGlzIGhhcyBiZWVuIGZvdW5kIHRvIGdyZWF0bHkgaW1wcm92ZSBwZXJmb3JtYW5jZSAoZnJvbSAxMjAwbXMgdG8gNW1zIGluIGFcbi8vIHRlc3Qgd2l0aCAxLjAwMC4wMDAgdXNlcnMpLlxuY29uc3Qgc2VsZWN0b3JGb3JGYXN0Q2FzZUluc2Vuc2l0aXZlTG9va3VwID0gKGZpZWxkTmFtZSwgc3RyaW5nKSA9PiB7XG4gIC8vIFBlcmZvcm1hbmNlIHNlZW1zIHRvIGltcHJvdmUgdXAgdG8gNCBwcmVmaXggY2hhcmFjdGVyc1xuICBjb25zdCBwcmVmaXggPSBzdHJpbmcuc3Vic3RyaW5nKDAsIE1hdGgubWluKHN0cmluZy5sZW5ndGgsIDQpKTtcbiAgY29uc3Qgb3JDbGF1c2UgPSBnZW5lcmF0ZUNhc2VQZXJtdXRhdGlvbnNGb3JTdHJpbmcocHJlZml4KS5tYXAoXG4gICAgcHJlZml4UGVybXV0YXRpb24gPT4ge1xuICAgICAgY29uc3Qgc2VsZWN0b3IgPSB7fTtcbiAgICAgIHNlbGVjdG9yW2ZpZWxkTmFtZV0gPVxuICAgICAgICBuZXcgUmVnRXhwKGBeJHtNZXRlb3IuX2VzY2FwZVJlZ0V4cChwcmVmaXhQZXJtdXRhdGlvbil9YCk7XG4gICAgICByZXR1cm4gc2VsZWN0b3I7XG4gICAgfSk7XG4gIGNvbnN0IGNhc2VJbnNlbnNpdGl2ZUNsYXVzZSA9IHt9O1xuICBjYXNlSW5zZW5zaXRpdmVDbGF1c2VbZmllbGROYW1lXSA9XG4gICAgbmV3IFJlZ0V4cChgXiR7TWV0ZW9yLl9lc2NhcGVSZWdFeHAoc3RyaW5nKX0kYCwgJ2knKVxuICByZXR1cm4geyRhbmQ6IFt7JG9yOiBvckNsYXVzZX0sIGNhc2VJbnNlbnNpdGl2ZUNsYXVzZV19O1xufVxuXG4vLyBHZW5lcmF0ZXMgcGVybXV0YXRpb25zIG9mIGFsbCBjYXNlIHZhcmlhdGlvbnMgb2YgYSBnaXZlbiBzdHJpbmcuXG5jb25zdCBnZW5lcmF0ZUNhc2VQZXJtdXRhdGlvbnNGb3JTdHJpbmcgPSBzdHJpbmcgPT4ge1xuICBsZXQgcGVybXV0YXRpb25zID0gWycnXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBjaCA9IHN0cmluZy5jaGFyQXQoaSk7XG4gICAgcGVybXV0YXRpb25zID0gW10uY29uY2F0KC4uLihwZXJtdXRhdGlvbnMubWFwKHByZWZpeCA9PiB7XG4gICAgICBjb25zdCBsb3dlckNhc2VDaGFyID0gY2gudG9Mb3dlckNhc2UoKTtcbiAgICAgIGNvbnN0IHVwcGVyQ2FzZUNoYXIgPSBjaC50b1VwcGVyQ2FzZSgpO1xuICAgICAgLy8gRG9uJ3QgYWRkIHVubmVjY2VzYXJ5IHBlcm11dGF0aW9ucyB3aGVuIGNoIGlzIG5vdCBhIGxldHRlclxuICAgICAgaWYgKGxvd2VyQ2FzZUNoYXIgPT09IHVwcGVyQ2FzZUNoYXIpIHtcbiAgICAgICAgcmV0dXJuIFtwcmVmaXggKyBjaF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gW3ByZWZpeCArIGxvd2VyQ2FzZUNoYXIsIHByZWZpeCArIHVwcGVyQ2FzZUNoYXJdO1xuICAgICAgfVxuICAgIH0pKSk7XG4gIH1cbiAgcmV0dXJuIHBlcm11dGF0aW9ucztcbn1cblxuY29uc3QgY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzID0gKGZpZWxkTmFtZSwgZGlzcGxheU5hbWUsIGZpZWxkVmFsdWUsIG93blVzZXJJZCkgPT4ge1xuICAvLyBTb21lIHRlc3RzIG5lZWQgdGhlIGFiaWxpdHkgdG8gYWRkIHVzZXJzIHdpdGggdGhlIHNhbWUgY2FzZSBpbnNlbnNpdGl2ZVxuICAvLyB2YWx1ZSwgaGVuY2UgdGhlIF9za2lwQ2FzZUluc2Vuc2l0aXZlQ2hlY2tzRm9yVGVzdCBjaGVja1xuICBjb25zdCBza2lwQ2hlY2sgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoQWNjb3VudHMuX3NraXBDYXNlSW5zZW5zaXRpdmVDaGVja3NGb3JUZXN0LCBmaWVsZFZhbHVlKTtcblxuICBpZiAoZmllbGRWYWx1ZSAmJiAhc2tpcENoZWNrKSB7XG4gICAgY29uc3QgbWF0Y2hlZFVzZXJzID0gTWV0ZW9yLnVzZXJzLmZpbmQoXG4gICAgICBzZWxlY3RvckZvckZhc3RDYXNlSW5zZW5zaXRpdmVMb29rdXAoZmllbGROYW1lLCBmaWVsZFZhbHVlKSxcbiAgICAgIHtcbiAgICAgICAgZmllbGRzOiB7X2lkOiAxfSxcbiAgICAgICAgLy8gd2Ugb25seSBuZWVkIGEgbWF4aW11bSBvZiAyIHVzZXJzIGZvciB0aGUgbG9naWMgYmVsb3cgdG8gd29ya1xuICAgICAgICBsaW1pdDogMixcbiAgICAgIH1cbiAgICApLmZldGNoKCk7XG5cbiAgICBpZiAobWF0Y2hlZFVzZXJzLmxlbmd0aCA+IDAgJiZcbiAgICAgICAgLy8gSWYgd2UgZG9uJ3QgaGF2ZSBhIHVzZXJJZCB5ZXQsIGFueSBtYXRjaCB3ZSBmaW5kIGlzIGEgZHVwbGljYXRlXG4gICAgICAgICghb3duVXNlcklkIHx8XG4gICAgICAgIC8vIE90aGVyd2lzZSwgY2hlY2sgdG8gc2VlIGlmIHRoZXJlIGFyZSBtdWx0aXBsZSBtYXRjaGVzIG9yIGEgbWF0Y2hcbiAgICAgICAgLy8gdGhhdCBpcyBub3QgdXNcbiAgICAgICAgKG1hdGNoZWRVc2Vycy5sZW5ndGggPiAxIHx8IG1hdGNoZWRVc2Vyc1swXS5faWQgIT09IG93blVzZXJJZCkpKSB7XG4gICAgICBoYW5kbGVFcnJvcihgJHtkaXNwbGF5TmFtZX0gYWxyZWFkeSBleGlzdHMuYCk7XG4gICAgfVxuICB9XG59O1xuXG4vLyBYWFggbWF5YmUgdGhpcyBiZWxvbmdzIGluIHRoZSBjaGVjayBwYWNrYWdlXG5jb25zdCBOb25FbXB0eVN0cmluZyA9IE1hdGNoLldoZXJlKHggPT4ge1xuICBjaGVjayh4LCBTdHJpbmcpO1xuICByZXR1cm4geC5sZW5ndGggPiAwO1xufSk7XG5cbmNvbnN0IHVzZXJRdWVyeVZhbGlkYXRvciA9IE1hdGNoLldoZXJlKHVzZXIgPT4ge1xuICBjaGVjayh1c2VyLCB7XG4gICAgaWQ6IE1hdGNoLk9wdGlvbmFsKE5vbkVtcHR5U3RyaW5nKSxcbiAgICB1c2VybmFtZTogTWF0Y2guT3B0aW9uYWwoTm9uRW1wdHlTdHJpbmcpLFxuICAgIGVtYWlsOiBNYXRjaC5PcHRpb25hbChOb25FbXB0eVN0cmluZylcbiAgfSk7XG4gIGlmIChPYmplY3Qua2V5cyh1c2VyKS5sZW5ndGggIT09IDEpXG4gICAgdGhyb3cgbmV3IE1hdGNoLkVycm9yKFwiVXNlciBwcm9wZXJ0eSBtdXN0IGhhdmUgZXhhY3RseSBvbmUgZmllbGRcIik7XG4gIHJldHVybiB0cnVlO1xufSk7XG5cbmNvbnN0IHBhc3N3b3JkVmFsaWRhdG9yID0gTWF0Y2guT25lT2YoXG4gIE1hdGNoLldoZXJlKHN0ciA9PiBNYXRjaC50ZXN0KHN0ciwgU3RyaW5nKSAmJiBzdHIubGVuZ3RoIDw9IE1ldGVvci5zZXR0aW5ncz8ucGFja2FnZXM/LmFjY291bnRzPy5wYXNzd29yZE1heExlbmd0aCB8fCAyNTYpLCB7XG4gICAgZGlnZXN0OiBNYXRjaC5XaGVyZShzdHIgPT4gTWF0Y2gudGVzdChzdHIsIFN0cmluZykgJiYgc3RyLmxlbmd0aCA9PT0gNjQpLFxuICAgIGFsZ29yaXRobTogTWF0Y2guT25lT2YoJ3NoYS0yNTYnKVxuICB9XG4pO1xuXG4vLyBIYW5kbGVyIHRvIGxvZ2luIHdpdGggYSBwYXNzd29yZC5cbi8vXG4vLyBUaGUgTWV0ZW9yIGNsaWVudCBzZXRzIG9wdGlvbnMucGFzc3dvcmQgdG8gYW4gb2JqZWN0IHdpdGgga2V5c1xuLy8gJ2RpZ2VzdCcgKHNldCB0byBTSEEyNTYocGFzc3dvcmQpKSBhbmQgJ2FsZ29yaXRobScgKFwic2hhLTI1NlwiKS5cbi8vXG4vLyBGb3Igb3RoZXIgRERQIGNsaWVudHMgd2hpY2ggZG9uJ3QgaGF2ZSBhY2Nlc3MgdG8gU0hBLCB0aGUgaGFuZGxlclxuLy8gYWxzbyBhY2NlcHRzIHRoZSBwbGFpbnRleHQgcGFzc3dvcmQgaW4gb3B0aW9ucy5wYXNzd29yZCBhcyBhIHN0cmluZy5cbi8vXG4vLyAoSXQgbWlnaHQgYmUgbmljZSBpZiBzZXJ2ZXJzIGNvdWxkIHR1cm4gdGhlIHBsYWludGV4dCBwYXNzd29yZFxuLy8gb3B0aW9uIG9mZi4gT3IgbWF5YmUgaXQgc2hvdWxkIGJlIG9wdC1pbiwgbm90IG9wdC1vdXQ/XG4vLyBBY2NvdW50cy5jb25maWcgb3B0aW9uPylcbi8vXG4vLyBOb3RlIHRoYXQgbmVpdGhlciBwYXNzd29yZCBvcHRpb24gaXMgc2VjdXJlIHdpdGhvdXQgU1NMLlxuLy9cbkFjY291bnRzLnJlZ2lzdGVyTG9naW5IYW5kbGVyKFwicGFzc3dvcmRcIiwgb3B0aW9ucyA9PiB7XG4gIGlmICghIG9wdGlvbnMucGFzc3dvcmQgfHwgb3B0aW9ucy5zcnApXG4gICAgcmV0dXJuIHVuZGVmaW5lZDsgLy8gZG9uJ3QgaGFuZGxlXG5cbiAgY2hlY2sob3B0aW9ucywge1xuICAgIHVzZXI6IHVzZXJRdWVyeVZhbGlkYXRvcixcbiAgICBwYXNzd29yZDogcGFzc3dvcmRWYWxpZGF0b3JcbiAgfSk7XG5cblxuICBjb25zdCB1c2VyID0gQWNjb3VudHMuX2ZpbmRVc2VyQnlRdWVyeShvcHRpb25zLnVzZXIsIHtmaWVsZHM6IHtcbiAgICBzZXJ2aWNlczogMSxcbiAgICAuLi5BY2NvdW50cy5fY2hlY2tQYXNzd29yZFVzZXJGaWVsZHMsXG4gIH19KTtcbiAgaWYgKCF1c2VyKSB7XG4gICAgaGFuZGxlRXJyb3IoXCJVc2VyIG5vdCBmb3VuZFwiKTtcbiAgfVxuXG4gIGlmICghdXNlci5zZXJ2aWNlcyB8fCAhdXNlci5zZXJ2aWNlcy5wYXNzd29yZCB8fFxuICAgICAgISh1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLmJjcnlwdCB8fCB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnNycCkpIHtcbiAgICBoYW5kbGVFcnJvcihcIlVzZXIgaGFzIG5vIHBhc3N3b3JkIHNldFwiKTtcbiAgfVxuXG4gIGlmICghdXNlci5zZXJ2aWNlcy5wYXNzd29yZC5iY3J5cHQpIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMucGFzc3dvcmQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIC8vIFRoZSBjbGllbnQgaGFzIHByZXNlbnRlZCBhIHBsYWludGV4dCBwYXNzd29yZCwgYW5kIHRoZSB1c2VyIGlzXG4gICAgICAvLyBub3QgdXBncmFkZWQgdG8gYmNyeXB0IHlldC4gV2UgZG9uJ3QgYXR0ZW1wdCB0byB0ZWxsIHRoZSBjbGllbnRcbiAgICAgIC8vIHRvIHVwZ3JhZGUgdG8gYmNyeXB0LCBiZWNhdXNlIGl0IG1pZ2h0IGJlIGEgc3RhbmRhbG9uZSBERFBcbiAgICAgIC8vIGNsaWVudCBkb2Vzbid0IGtub3cgaG93IHRvIGRvIHN1Y2ggYSB0aGluZy5cbiAgICAgIGNvbnN0IHZlcmlmaWVyID0gdXNlci5zZXJ2aWNlcy5wYXNzd29yZC5zcnA7XG4gICAgICBjb25zdCBuZXdWZXJpZmllciA9IFNSUC5nZW5lcmF0ZVZlcmlmaWVyKG9wdGlvbnMucGFzc3dvcmQsIHtcbiAgICAgICAgaWRlbnRpdHk6IHZlcmlmaWVyLmlkZW50aXR5LCBzYWx0OiB2ZXJpZmllci5zYWx0fSk7XG5cbiAgICAgIGlmICh2ZXJpZmllci52ZXJpZmllciAhPT0gbmV3VmVyaWZpZXIudmVyaWZpZXIpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB1c2VySWQ6IEFjY291bnRzLl9vcHRpb25zLmFtYmlndW91c0Vycm9yTWVzc2FnZXMgPyBudWxsIDogdXNlci5faWQsXG4gICAgICAgICAgZXJyb3I6IGhhbmRsZUVycm9yKFwiSW5jb3JyZWN0IHBhc3N3b3JkXCIsIGZhbHNlKVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge3VzZXJJZDogdXNlci5faWR9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUZWxsIHRoZSBjbGllbnQgdG8gdXNlIHRoZSBTUlAgdXBncmFkZSBwcm9jZXNzLlxuICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsIFwib2xkIHBhc3N3b3JkIGZvcm1hdFwiLCBFSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBmb3JtYXQ6ICdzcnAnLFxuICAgICAgICBpZGVudGl0eTogdXNlci5zZXJ2aWNlcy5wYXNzd29yZC5zcnAuaWRlbnRpdHlcbiAgICAgIH0pKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gY2hlY2tQYXNzd29yZChcbiAgICB1c2VyLFxuICAgIG9wdGlvbnMucGFzc3dvcmRcbiAgKTtcbn0pO1xuXG4vLyBIYW5kbGVyIHRvIGxvZ2luIHVzaW5nIHRoZSBTUlAgdXBncmFkZSBwYXRoLiBUbyB1c2UgdGhpcyBsb2dpblxuLy8gaGFuZGxlciwgdGhlIGNsaWVudCBtdXN0IHByb3ZpZGU6XG4vLyAgIC0gc3JwOiBIKGlkZW50aXR5ICsgXCI6XCIgKyBwYXNzd29yZClcbi8vICAgLSBwYXNzd29yZDogYSBzdHJpbmcgb3IgYW4gb2JqZWN0IHdpdGggcHJvcGVydGllcyAnZGlnZXN0JyBhbmQgJ2FsZ29yaXRobSdcbi8vXG4vLyBXZSB1c2UgYG9wdGlvbnMuc3JwYCB0byB2ZXJpZnkgdGhhdCB0aGUgY2xpZW50IGtub3dzIHRoZSBjb3JyZWN0XG4vLyBwYXNzd29yZCB3aXRob3V0IGRvaW5nIGEgZnVsbCBTUlAgZmxvdy4gT25jZSB3ZSd2ZSBjaGVja2VkIHRoYXQsIHdlXG4vLyB1cGdyYWRlIHRoZSB1c2VyIHRvIGJjcnlwdCBhbmQgcmVtb3ZlIHRoZSBTUlAgaW5mb3JtYXRpb24gZnJvbSB0aGVcbi8vIHVzZXIgZG9jdW1lbnQuXG4vL1xuLy8gVGhlIGNsaWVudCBlbmRzIHVwIHVzaW5nIHRoaXMgbG9naW4gaGFuZGxlciBhZnRlciB0cnlpbmcgdGhlIG5vcm1hbFxuLy8gbG9naW4gaGFuZGxlciAoYWJvdmUpLCB3aGljaCB0aHJvd3MgYW4gZXJyb3IgdGVsbGluZyB0aGUgY2xpZW50IHRvXG4vLyB0cnkgdGhlIFNSUCB1cGdyYWRlIHBhdGguXG4vL1xuLy8gWFhYIENPTVBBVCBXSVRIIDAuOC4xLjNcbkFjY291bnRzLnJlZ2lzdGVyTG9naW5IYW5kbGVyKFwicGFzc3dvcmRcIiwgb3B0aW9ucyA9PiB7XG4gIGlmICghb3B0aW9ucy5zcnAgfHwgIW9wdGlvbnMucGFzc3dvcmQpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkOyAvLyBkb24ndCBoYW5kbGVcbiAgfVxuXG4gIGNoZWNrKG9wdGlvbnMsIHtcbiAgICB1c2VyOiB1c2VyUXVlcnlWYWxpZGF0b3IsXG4gICAgc3JwOiBTdHJpbmcsXG4gICAgcGFzc3dvcmQ6IHBhc3N3b3JkVmFsaWRhdG9yXG4gIH0pO1xuXG4gIGNvbnN0IHVzZXIgPSBBY2NvdW50cy5fZmluZFVzZXJCeVF1ZXJ5KG9wdGlvbnMudXNlciwge2ZpZWxkczoge1xuICAgIHNlcnZpY2VzOiAxLFxuICAgIC4uLkFjY291bnRzLl9jaGVja1Bhc3N3b3JkVXNlckZpZWxkcyxcbiAgfX0pO1xuICBpZiAoIXVzZXIpIHtcbiAgICBoYW5kbGVFcnJvcihcIlVzZXIgbm90IGZvdW5kXCIpO1xuICB9XG5cbiAgLy8gQ2hlY2sgdG8gc2VlIGlmIGFub3RoZXIgc2ltdWx0YW5lb3VzIGxvZ2luIGhhcyBhbHJlYWR5IHVwZ3JhZGVkXG4gIC8vIHRoZSB1c2VyIHJlY29yZCB0byBiY3J5cHQuXG4gIGlmICh1c2VyLnNlcnZpY2VzICYmIHVzZXIuc2VydmljZXMucGFzc3dvcmQgJiYgdXNlci5zZXJ2aWNlcy5wYXNzd29yZC5iY3J5cHQpIHtcbiAgICByZXR1cm4gY2hlY2tQYXNzd29yZCh1c2VyLCBvcHRpb25zLnBhc3N3b3JkKTtcbiAgfVxuXG4gIGlmICghKHVzZXIuc2VydmljZXMgJiYgdXNlci5zZXJ2aWNlcy5wYXNzd29yZCAmJiB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnNycCkpIHtcbiAgICBoYW5kbGVFcnJvcihcIlVzZXIgaGFzIG5vIHBhc3N3b3JkIHNldFwiKTtcbiAgfVxuXG4gIGNvbnN0IHYxID0gdXNlci5zZXJ2aWNlcy5wYXNzd29yZC5zcnAudmVyaWZpZXI7XG4gIGNvbnN0IHYyID0gU1JQLmdlbmVyYXRlVmVyaWZpZXIoXG4gICAgbnVsbCxcbiAgICB7XG4gICAgICBoYXNoZWRJZGVudGl0eUFuZFBhc3N3b3JkOiBvcHRpb25zLnNycCxcbiAgICAgIHNhbHQ6IHVzZXIuc2VydmljZXMucGFzc3dvcmQuc3JwLnNhbHRcbiAgICB9XG4gICkudmVyaWZpZXI7XG4gIGlmICh2MSAhPT0gdjIpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdXNlcklkOiBBY2NvdW50cy5fb3B0aW9ucy5hbWJpZ3VvdXNFcnJvck1lc3NhZ2VzID8gbnVsbCA6IHVzZXIuX2lkLFxuICAgICAgZXJyb3I6IGhhbmRsZUVycm9yKFwiSW5jb3JyZWN0IHBhc3N3b3JkXCIsIGZhbHNlKVxuICAgIH07XG4gIH1cblxuICAvLyBVcGdyYWRlIHRvIGJjcnlwdCBvbiBzdWNjZXNzZnVsIGxvZ2luLlxuICBjb25zdCBzYWx0ZWQgPSBoYXNoUGFzc3dvcmQob3B0aW9ucy5wYXNzd29yZCk7XG4gIE1ldGVvci51c2Vycy51cGRhdGUoXG4gICAgdXNlci5faWQsXG4gICAge1xuICAgICAgJHVuc2V0OiB7ICdzZXJ2aWNlcy5wYXNzd29yZC5zcnAnOiAxIH0sXG4gICAgICAkc2V0OiB7ICdzZXJ2aWNlcy5wYXNzd29yZC5iY3J5cHQnOiBzYWx0ZWQgfVxuICAgIH1cbiAgKTtcblxuICByZXR1cm4ge3VzZXJJZDogdXNlci5faWR9O1xufSk7XG5cblxuLy8vXG4vLy8gQ0hBTkdJTkdcbi8vL1xuXG4vKipcbiAqIEBzdW1tYXJ5IENoYW5nZSBhIHVzZXIncyB1c2VybmFtZS4gVXNlIHRoaXMgaW5zdGVhZCBvZiB1cGRhdGluZyB0aGVcbiAqIGRhdGFiYXNlIGRpcmVjdGx5LiBUaGUgb3BlcmF0aW9uIHdpbGwgZmFpbCBpZiB0aGVyZSBpcyBhbiBleGlzdGluZyB1c2VyXG4gKiB3aXRoIGEgdXNlcm5hbWUgb25seSBkaWZmZXJpbmcgaW4gY2FzZS5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSB1c2VySWQgVGhlIElEIG9mIHRoZSB1c2VyIHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB7U3RyaW5nfSBuZXdVc2VybmFtZSBBIG5ldyB1c2VybmFtZSBmb3IgdGhlIHVzZXIuXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5zZXRVc2VybmFtZSA9ICh1c2VySWQsIG5ld1VzZXJuYW1lKSA9PiB7XG4gIGNoZWNrKHVzZXJJZCwgTm9uRW1wdHlTdHJpbmcpO1xuICBjaGVjayhuZXdVc2VybmFtZSwgTm9uRW1wdHlTdHJpbmcpO1xuXG4gIGNvbnN0IHVzZXIgPSBnZXRVc2VyQnlJZCh1c2VySWQsIHtmaWVsZHM6IHtcbiAgICB1c2VybmFtZTogMSxcbiAgfX0pO1xuICBpZiAoIXVzZXIpIHtcbiAgICBoYW5kbGVFcnJvcihcIlVzZXIgbm90IGZvdW5kXCIpO1xuICB9XG5cbiAgY29uc3Qgb2xkVXNlcm5hbWUgPSB1c2VyLnVzZXJuYW1lO1xuXG4gIC8vIFBlcmZvcm0gYSBjYXNlIGluc2Vuc2l0aXZlIGNoZWNrIGZvciBkdXBsaWNhdGVzIGJlZm9yZSB1cGRhdGVcbiAgY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzKCd1c2VybmFtZScsICdVc2VybmFtZScsIG5ld1VzZXJuYW1lLCB1c2VyLl9pZCk7XG5cbiAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7X2lkOiB1c2VyLl9pZH0sIHskc2V0OiB7dXNlcm5hbWU6IG5ld1VzZXJuYW1lfX0pO1xuXG4gIC8vIFBlcmZvcm0gYW5vdGhlciBjaGVjayBhZnRlciB1cGRhdGUsIGluIGNhc2UgYSBtYXRjaGluZyB1c2VyIGhhcyBiZWVuXG4gIC8vIGluc2VydGVkIGluIHRoZSBtZWFudGltZVxuICB0cnkge1xuICAgIGNoZWNrRm9yQ2FzZUluc2Vuc2l0aXZlRHVwbGljYXRlcygndXNlcm5hbWUnLCAnVXNlcm5hbWUnLCBuZXdVc2VybmFtZSwgdXNlci5faWQpO1xuICB9IGNhdGNoIChleCkge1xuICAgIC8vIFVuZG8gdXBkYXRlIGlmIHRoZSBjaGVjayBmYWlsc1xuICAgIE1ldGVvci51c2Vycy51cGRhdGUoe19pZDogdXNlci5faWR9LCB7JHNldDoge3VzZXJuYW1lOiBvbGRVc2VybmFtZX19KTtcbiAgICB0aHJvdyBleDtcbiAgfVxufTtcblxuLy8gTGV0IHRoZSB1c2VyIGNoYW5nZSB0aGVpciBvd24gcGFzc3dvcmQgaWYgdGhleSBrbm93IHRoZSBvbGRcbi8vIHBhc3N3b3JkLiBgb2xkUGFzc3dvcmRgIGFuZCBgbmV3UGFzc3dvcmRgIHNob3VsZCBiZSBvYmplY3RzIHdpdGgga2V5c1xuLy8gYGRpZ2VzdGAgYW5kIGBhbGdvcml0aG1gIChyZXByZXNlbnRpbmcgdGhlIFNIQTI1NiBvZiB0aGUgcGFzc3dvcmQpLlxuLy9cbi8vIFhYWCBDT01QQVQgV0lUSCAwLjguMS4zXG4vLyBMaWtlIHRoZSBsb2dpbiBtZXRob2QsIGlmIHRoZSB1c2VyIGhhc24ndCBiZWVuIHVwZ3JhZGVkIGZyb20gU1JQIHRvXG4vLyBiY3J5cHQgeWV0LCB0aGVuIHRoaXMgbWV0aG9kIHdpbGwgdGhyb3cgYW4gJ29sZCBwYXNzd29yZCBmb3JtYXQnXG4vLyBlcnJvci4gVGhlIGNsaWVudCBzaG91bGQgY2FsbCB0aGUgU1JQIHVwZ3JhZGUgbG9naW4gaGFuZGxlciBhbmQgdGhlblxuLy8gcmV0cnkgdGhpcyBtZXRob2QgYWdhaW4uXG4vL1xuLy8gVU5MSUtFIHRoZSBsb2dpbiBtZXRob2QsIHRoZXJlIGlzIG5vIHdheSB0byBhdm9pZCBnZXR0aW5nIFNSUCB1cGdyYWRlXG4vLyBlcnJvcnMgdGhyb3duLiBUaGUgcmVhc29uaW5nIGZvciB0aGlzIGlzIHRoYXQgY2xpZW50cyB1c2luZyB0aGlzXG4vLyBtZXRob2QgZGlyZWN0bHkgd2lsbCBuZWVkIHRvIGJlIHVwZGF0ZWQgYW55d2F5IGJlY2F1c2Ugd2Ugbm8gbG9uZ2VyXG4vLyBzdXBwb3J0IHRoZSBTUlAgZmxvdyB0aGF0IHRoZXkgd291bGQgaGF2ZSBiZWVuIGRvaW5nIHRvIHVzZSB0aGlzXG4vLyBtZXRob2QgcHJldmlvdXNseS5cbk1ldGVvci5tZXRob2RzKHtjaGFuZ2VQYXNzd29yZDogZnVuY3Rpb24gKG9sZFBhc3N3b3JkLCBuZXdQYXNzd29yZCkge1xuICBjaGVjayhvbGRQYXNzd29yZCwgcGFzc3dvcmRWYWxpZGF0b3IpO1xuICBjaGVjayhuZXdQYXNzd29yZCwgcGFzc3dvcmRWYWxpZGF0b3IpO1xuXG4gIGlmICghdGhpcy51c2VySWQpIHtcbiAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMSwgXCJNdXN0IGJlIGxvZ2dlZCBpblwiKTtcbiAgfVxuXG4gIGNvbnN0IHVzZXIgPSBnZXRVc2VyQnlJZCh0aGlzLnVzZXJJZCwge2ZpZWxkczoge1xuICAgIHNlcnZpY2VzOiAxLFxuICAgIC4uLkFjY291bnRzLl9jaGVja1Bhc3N3b3JkVXNlckZpZWxkcyxcbiAgfX0pO1xuICBpZiAoIXVzZXIpIHtcbiAgICBoYW5kbGVFcnJvcihcIlVzZXIgbm90IGZvdW5kXCIpO1xuICB9XG5cbiAgaWYgKCF1c2VyLnNlcnZpY2VzIHx8ICF1c2VyLnNlcnZpY2VzLnBhc3N3b3JkIHx8XG4gICAgICAoIXVzZXIuc2VydmljZXMucGFzc3dvcmQuYmNyeXB0ICYmICF1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnNycCkpIHtcbiAgICBoYW5kbGVFcnJvcihcIlVzZXIgaGFzIG5vIHBhc3N3b3JkIHNldFwiKTtcbiAgfVxuXG4gIGlmICghIHVzZXIuc2VydmljZXMucGFzc3dvcmQuYmNyeXB0KSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsIFwib2xkIHBhc3N3b3JkIGZvcm1hdFwiLCBFSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgZm9ybWF0OiAnc3JwJyxcbiAgICAgIGlkZW50aXR5OiB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnNycC5pZGVudGl0eVxuICAgIH0pKTtcbiAgfVxuXG4gIGNvbnN0IHJlc3VsdCA9IGNoZWNrUGFzc3dvcmQodXNlciwgb2xkUGFzc3dvcmQpO1xuICBpZiAocmVzdWx0LmVycm9yKSB7XG4gICAgdGhyb3cgcmVzdWx0LmVycm9yO1xuICB9XG5cbiAgY29uc3QgaGFzaGVkID0gaGFzaFBhc3N3b3JkKG5ld1Bhc3N3b3JkKTtcblxuICAvLyBJdCB3b3VsZCBiZSBiZXR0ZXIgaWYgdGhpcyByZW1vdmVkIEFMTCBleGlzdGluZyB0b2tlbnMgYW5kIHJlcGxhY2VkXG4gIC8vIHRoZSB0b2tlbiBmb3IgdGhlIGN1cnJlbnQgY29ubmVjdGlvbiB3aXRoIGEgbmV3IG9uZSwgYnV0IHRoYXQgd291bGRcbiAgLy8gYmUgdHJpY2t5LCBzbyB3ZSdsbCBzZXR0bGUgZm9yIGp1c3QgcmVwbGFjaW5nIGFsbCB0b2tlbnMgb3RoZXIgdGhhblxuICAvLyB0aGUgb25lIGZvciB0aGUgY3VycmVudCBjb25uZWN0aW9uLlxuICBjb25zdCBjdXJyZW50VG9rZW4gPSBBY2NvdW50cy5fZ2V0TG9naW5Ub2tlbih0aGlzLmNvbm5lY3Rpb24uaWQpO1xuICBNZXRlb3IudXNlcnMudXBkYXRlKFxuICAgIHsgX2lkOiB0aGlzLnVzZXJJZCB9LFxuICAgIHtcbiAgICAgICRzZXQ6IHsgJ3NlcnZpY2VzLnBhc3N3b3JkLmJjcnlwdCc6IGhhc2hlZCB9LFxuICAgICAgJHB1bGw6IHtcbiAgICAgICAgJ3NlcnZpY2VzLnJlc3VtZS5sb2dpblRva2Vucyc6IHsgaGFzaGVkVG9rZW46IHsgJG5lOiBjdXJyZW50VG9rZW4gfSB9XG4gICAgICB9LFxuICAgICAgJHVuc2V0OiB7ICdzZXJ2aWNlcy5wYXNzd29yZC5yZXNldCc6IDEgfVxuICAgIH1cbiAgKTtcblxuICByZXR1cm4ge3Bhc3N3b3JkQ2hhbmdlZDogdHJ1ZX07XG59fSk7XG5cblxuLy8gRm9yY2UgY2hhbmdlIHRoZSB1c2VycyBwYXNzd29yZC5cblxuLyoqXG4gKiBAc3VtbWFyeSBGb3JjaWJseSBjaGFuZ2UgdGhlIHBhc3N3b3JkIGZvciBhIHVzZXIuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlcklkIFRoZSBpZCBvZiB0aGUgdXNlciB0byB1cGRhdGUuXG4gKiBAcGFyYW0ge1N0cmluZ30gbmV3UGFzc3dvcmQgQSBuZXcgcGFzc3dvcmQgZm9yIHRoZSB1c2VyLlxuICogQHBhcmFtIHtPYmplY3R9IFtvcHRpb25zXVxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnMubG9nb3V0IExvZ291dCBhbGwgY3VycmVudCBjb25uZWN0aW9ucyB3aXRoIHRoaXMgdXNlcklkIChkZWZhdWx0OiB0cnVlKVxuICogQGltcG9ydEZyb21QYWNrYWdlIGFjY291bnRzLWJhc2VcbiAqL1xuQWNjb3VudHMuc2V0UGFzc3dvcmQgPSAodXNlcklkLCBuZXdQbGFpbnRleHRQYXNzd29yZCwgb3B0aW9ucykgPT4ge1xuICBvcHRpb25zID0geyBsb2dvdXQ6IHRydWUgLCAuLi5vcHRpb25zIH07XG5cbiAgY29uc3QgdXNlciA9IGdldFVzZXJCeUlkKHVzZXJJZCwge2ZpZWxkczoge19pZDogMX19KTtcbiAgaWYgKCF1c2VyKSB7XG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVXNlciBub3QgZm91bmRcIik7XG4gIH1cblxuICBjb25zdCB1cGRhdGUgPSB7XG4gICAgJHVuc2V0OiB7XG4gICAgICAnc2VydmljZXMucGFzc3dvcmQuc3JwJzogMSwgLy8gWFhYIENPTVBBVCBXSVRIIDAuOC4xLjNcbiAgICAgICdzZXJ2aWNlcy5wYXNzd29yZC5yZXNldCc6IDFcbiAgICB9LFxuICAgICRzZXQ6IHsnc2VydmljZXMucGFzc3dvcmQuYmNyeXB0JzogaGFzaFBhc3N3b3JkKG5ld1BsYWludGV4dFBhc3N3b3JkKX1cbiAgfTtcblxuICBpZiAob3B0aW9ucy5sb2dvdXQpIHtcbiAgICB1cGRhdGUuJHVuc2V0WydzZXJ2aWNlcy5yZXN1bWUubG9naW5Ub2tlbnMnXSA9IDE7XG4gIH1cblxuICBNZXRlb3IudXNlcnMudXBkYXRlKHtfaWQ6IHVzZXIuX2lkfSwgdXBkYXRlKTtcbn07XG5cblxuLy8vXG4vLy8gUkVTRVRUSU5HIFZJQSBFTUFJTFxuLy8vXG5cbi8vIFV0aWxpdHkgZm9yIHBsdWNraW5nIGFkZHJlc3NlcyBmcm9tIGVtYWlsc1xuY29uc3QgcGx1Y2tBZGRyZXNzZXMgPSAoZW1haWxzID0gW10pID0+IGVtYWlscy5tYXAoZW1haWwgPT4gZW1haWwuYWRkcmVzcyk7XG5cbi8vIE1ldGhvZCBjYWxsZWQgYnkgYSB1c2VyIHRvIHJlcXVlc3QgYSBwYXNzd29yZCByZXNldCBlbWFpbC4gVGhpcyBpc1xuLy8gdGhlIHN0YXJ0IG9mIHRoZSByZXNldCBwcm9jZXNzLlxuTWV0ZW9yLm1ldGhvZHMoe2ZvcmdvdFBhc3N3b3JkOiBvcHRpb25zID0+IHtcbiAgY2hlY2sob3B0aW9ucywge2VtYWlsOiBTdHJpbmd9KTtcblxuICBjb25zdCB1c2VyID0gQWNjb3VudHMuZmluZFVzZXJCeUVtYWlsKG9wdGlvbnMuZW1haWwsIHtmaWVsZHM6IHtlbWFpbHM6IDF9fSk7XG4gIGlmICghdXNlcikge1xuICAgIGhhbmRsZUVycm9yKFwiVXNlciBub3QgZm91bmRcIik7XG4gIH1cblxuICBjb25zdCBlbWFpbHMgPSBwbHVja0FkZHJlc3Nlcyh1c2VyLmVtYWlscyk7XG4gIGNvbnN0IGNhc2VTZW5zaXRpdmVFbWFpbCA9IGVtYWlscy5maW5kKFxuICAgIGVtYWlsID0+IGVtYWlsLnRvTG93ZXJDYXNlKCkgPT09IG9wdGlvbnMuZW1haWwudG9Mb3dlckNhc2UoKVxuICApO1xuXG4gIEFjY291bnRzLnNlbmRSZXNldFBhc3N3b3JkRW1haWwodXNlci5faWQsIGNhc2VTZW5zaXRpdmVFbWFpbCk7XG59fSk7XG5cbi8qKlxuICogQHN1bW1hcnkgR2VuZXJhdGVzIGEgcmVzZXQgdG9rZW4gYW5kIHNhdmVzIGl0IGludG8gdGhlIGRhdGFiYXNlLlxuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJJZCBUaGUgaWQgb2YgdGhlIHVzZXIgdG8gZ2VuZXJhdGUgdGhlIHJlc2V0IHRva2VuIGZvci5cbiAqIEBwYXJhbSB7U3RyaW5nfSBlbWFpbCBXaGljaCBhZGRyZXNzIG9mIHRoZSB1c2VyIHRvIGdlbmVyYXRlIHRoZSByZXNldCB0b2tlbiBmb3IuIFRoaXMgYWRkcmVzcyBtdXN0IGJlIGluIHRoZSB1c2VyJ3MgYGVtYWlsc2AgbGlzdC4gSWYgYG51bGxgLCBkZWZhdWx0cyB0byB0aGUgZmlyc3QgZW1haWwgaW4gdGhlIGxpc3QuXG4gKiBAcGFyYW0ge1N0cmluZ30gcmVhc29uIGByZXNldFBhc3N3b3JkYCBvciBgZW5yb2xsQWNjb3VudGAuXG4gKiBAcGFyYW0ge09iamVjdH0gW2V4dHJhVG9rZW5EYXRhXSBPcHRpb25hbCBhZGRpdGlvbmFsIGRhdGEgdG8gYmUgYWRkZWQgaW50byB0aGUgdG9rZW4gcmVjb3JkLlxuICogQHJldHVybnMge09iamVjdH0gT2JqZWN0IHdpdGgge2VtYWlsLCB1c2VyLCB0b2tlbn0gdmFsdWVzLlxuICogQGltcG9ydEZyb21QYWNrYWdlIGFjY291bnRzLWJhc2VcbiAqL1xuQWNjb3VudHMuZ2VuZXJhdGVSZXNldFRva2VuID0gKHVzZXJJZCwgZW1haWwsIHJlYXNvbiwgZXh0cmFUb2tlbkRhdGEpID0+IHtcbiAgLy8gTWFrZSBzdXJlIHRoZSB1c2VyIGV4aXN0cywgYW5kIGVtYWlsIGlzIG9uZSBvZiB0aGVpciBhZGRyZXNzZXMuXG4gIC8vIERvbid0IGxpbWl0IHRoZSBmaWVsZHMgaW4gdGhlIHVzZXIgb2JqZWN0IHNpbmNlIHRoZSB1c2VyIGlzIHJldHVybmVkXG4gIC8vIGJ5IHRoZSBmdW5jdGlvbiBhbmQgc29tZSBvdGhlciBmaWVsZHMgbWlnaHQgYmUgdXNlZCBlbHNld2hlcmUuXG4gIGNvbnN0IHVzZXIgPSBnZXRVc2VyQnlJZCh1c2VySWQpO1xuICBpZiAoIXVzZXIpIHtcbiAgICBoYW5kbGVFcnJvcihcIkNhbid0IGZpbmQgdXNlclwiKTtcbiAgfVxuXG4gIC8vIHBpY2sgdGhlIGZpcnN0IGVtYWlsIGlmIHdlIHdlcmVuJ3QgcGFzc2VkIGFuIGVtYWlsLlxuICBpZiAoIWVtYWlsICYmIHVzZXIuZW1haWxzICYmIHVzZXIuZW1haWxzWzBdKSB7XG4gICAgZW1haWwgPSB1c2VyLmVtYWlsc1swXS5hZGRyZXNzO1xuICB9XG5cbiAgLy8gbWFrZSBzdXJlIHdlIGhhdmUgYSB2YWxpZCBlbWFpbFxuICBpZiAoIWVtYWlsIHx8XG4gICAgIShwbHVja0FkZHJlc3Nlcyh1c2VyLmVtYWlscykuaW5jbHVkZXMoZW1haWwpKSkge1xuICAgIGhhbmRsZUVycm9yKFwiTm8gc3VjaCBlbWFpbCBmb3IgdXNlci5cIik7XG4gIH1cblxuICBjb25zdCB0b2tlbiA9IFJhbmRvbS5zZWNyZXQoKTtcbiAgY29uc3QgdG9rZW5SZWNvcmQgPSB7XG4gICAgdG9rZW4sXG4gICAgZW1haWwsXG4gICAgd2hlbjogbmV3IERhdGUoKVxuICB9O1xuXG4gIGlmIChyZWFzb24gPT09ICdyZXNldFBhc3N3b3JkJykge1xuICAgIHRva2VuUmVjb3JkLnJlYXNvbiA9ICdyZXNldCc7XG4gIH0gZWxzZSBpZiAocmVhc29uID09PSAnZW5yb2xsQWNjb3VudCcpIHtcbiAgICB0b2tlblJlY29yZC5yZWFzb24gPSAnZW5yb2xsJztcbiAgfSBlbHNlIGlmIChyZWFzb24pIHtcbiAgICAvLyBmYWxsYmFjayBzbyB0aGF0IHRoaXMgZnVuY3Rpb24gY2FuIGJlIHVzZWQgZm9yIHVua25vd24gcmVhc29ucyBhcyB3ZWxsXG4gICAgdG9rZW5SZWNvcmQucmVhc29uID0gcmVhc29uO1xuICB9XG5cbiAgaWYgKGV4dHJhVG9rZW5EYXRhKSB7XG4gICAgT2JqZWN0LmFzc2lnbih0b2tlblJlY29yZCwgZXh0cmFUb2tlbkRhdGEpO1xuICB9XG5cbiAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7X2lkOiB1c2VyLl9pZH0sIHskc2V0OiB7XG4gICAgJ3NlcnZpY2VzLnBhc3N3b3JkLnJlc2V0JzogdG9rZW5SZWNvcmRcbiAgfX0pO1xuXG4gIC8vIGJlZm9yZSBwYXNzaW5nIHRvIHRlbXBsYXRlLCB1cGRhdGUgdXNlciBvYmplY3Qgd2l0aCBuZXcgdG9rZW5cbiAgTWV0ZW9yLl9lbnN1cmUodXNlciwgJ3NlcnZpY2VzJywgJ3Bhc3N3b3JkJykucmVzZXQgPSB0b2tlblJlY29yZDtcblxuICByZXR1cm4ge2VtYWlsLCB1c2VyLCB0b2tlbn07XG59O1xuXG4vKipcbiAqIEBzdW1tYXJ5IEdlbmVyYXRlcyBhbiBlLW1haWwgdmVyaWZpY2F0aW9uIHRva2VuIGFuZCBzYXZlcyBpdCBpbnRvIHRoZSBkYXRhYmFzZS5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSB1c2VySWQgVGhlIGlkIG9mIHRoZSB1c2VyIHRvIGdlbmVyYXRlIHRoZSAgZS1tYWlsIHZlcmlmaWNhdGlvbiB0b2tlbiBmb3IuXG4gKiBAcGFyYW0ge1N0cmluZ30gZW1haWwgV2hpY2ggYWRkcmVzcyBvZiB0aGUgdXNlciB0byBnZW5lcmF0ZSB0aGUgZS1tYWlsIHZlcmlmaWNhdGlvbiB0b2tlbiBmb3IuIFRoaXMgYWRkcmVzcyBtdXN0IGJlIGluIHRoZSB1c2VyJ3MgYGVtYWlsc2AgbGlzdC4gSWYgYG51bGxgLCBkZWZhdWx0cyB0byB0aGUgZmlyc3QgdW52ZXJpZmllZCBlbWFpbCBpbiB0aGUgbGlzdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbZXh0cmFUb2tlbkRhdGFdIE9wdGlvbmFsIGFkZGl0aW9uYWwgZGF0YSB0byBiZSBhZGRlZCBpbnRvIHRoZSB0b2tlbiByZWNvcmQuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBPYmplY3Qgd2l0aCB7ZW1haWwsIHVzZXIsIHRva2VufSB2YWx1ZXMuXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICovXG5BY2NvdW50cy5nZW5lcmF0ZVZlcmlmaWNhdGlvblRva2VuID0gKHVzZXJJZCwgZW1haWwsIGV4dHJhVG9rZW5EYXRhKSA9PiB7XG4gIC8vIE1ha2Ugc3VyZSB0aGUgdXNlciBleGlzdHMsIGFuZCBlbWFpbCBpcyBvbmUgb2YgdGhlaXIgYWRkcmVzc2VzLlxuICAvLyBEb24ndCBsaW1pdCB0aGUgZmllbGRzIGluIHRoZSB1c2VyIG9iamVjdCBzaW5jZSB0aGUgdXNlciBpcyByZXR1cm5lZFxuICAvLyBieSB0aGUgZnVuY3Rpb24gYW5kIHNvbWUgb3RoZXIgZmllbGRzIG1pZ2h0IGJlIHVzZWQgZWxzZXdoZXJlLlxuICBjb25zdCB1c2VyID0gZ2V0VXNlckJ5SWQodXNlcklkKTtcbiAgaWYgKCF1c2VyKSB7XG4gICAgaGFuZGxlRXJyb3IoXCJDYW4ndCBmaW5kIHVzZXJcIik7XG4gIH1cblxuICAvLyBwaWNrIHRoZSBmaXJzdCB1bnZlcmlmaWVkIGVtYWlsIGlmIHdlIHdlcmVuJ3QgcGFzc2VkIGFuIGVtYWlsLlxuICBpZiAoIWVtYWlsKSB7XG4gICAgY29uc3QgZW1haWxSZWNvcmQgPSAodXNlci5lbWFpbHMgfHwgW10pLmZpbmQoZSA9PiAhZS52ZXJpZmllZCk7XG4gICAgZW1haWwgPSAoZW1haWxSZWNvcmQgfHwge30pLmFkZHJlc3M7XG5cbiAgICBpZiAoIWVtYWlsKSB7XG4gICAgICBoYW5kbGVFcnJvcihcIlRoYXQgdXNlciBoYXMgbm8gdW52ZXJpZmllZCBlbWFpbCBhZGRyZXNzZXMuXCIpO1xuICAgIH1cbiAgfVxuXG4gIC8vIG1ha2Ugc3VyZSB3ZSBoYXZlIGEgdmFsaWQgZW1haWxcbiAgaWYgKCFlbWFpbCB8fFxuICAgICEocGx1Y2tBZGRyZXNzZXModXNlci5lbWFpbHMpLmluY2x1ZGVzKGVtYWlsKSkpIHtcbiAgICBoYW5kbGVFcnJvcihcIk5vIHN1Y2ggZW1haWwgZm9yIHVzZXIuXCIpO1xuICB9XG5cbiAgY29uc3QgdG9rZW4gPSBSYW5kb20uc2VjcmV0KCk7XG4gIGNvbnN0IHRva2VuUmVjb3JkID0ge1xuICAgIHRva2VuLFxuICAgIC8vIFRPRE86IFRoaXMgc2hvdWxkIHByb2JhYmx5IGJlIHJlbmFtZWQgdG8gXCJlbWFpbFwiIHRvIG1hdGNoIHJlc2V0IHRva2VuIHJlY29yZC5cbiAgICBhZGRyZXNzOiBlbWFpbCxcbiAgICB3aGVuOiBuZXcgRGF0ZSgpXG4gIH07XG5cbiAgaWYgKGV4dHJhVG9rZW5EYXRhKSB7XG4gICAgT2JqZWN0LmFzc2lnbih0b2tlblJlY29yZCwgZXh0cmFUb2tlbkRhdGEpO1xuICB9XG5cbiAgTWV0ZW9yLnVzZXJzLnVwZGF0ZSh7X2lkOiB1c2VyLl9pZH0sIHskcHVzaDoge1xuICAgICdzZXJ2aWNlcy5lbWFpbC52ZXJpZmljYXRpb25Ub2tlbnMnOiB0b2tlblJlY29yZFxuICB9fSk7XG5cbiAgLy8gYmVmb3JlIHBhc3NpbmcgdG8gdGVtcGxhdGUsIHVwZGF0ZSB1c2VyIG9iamVjdCB3aXRoIG5ldyB0b2tlblxuICBNZXRlb3IuX2Vuc3VyZSh1c2VyLCAnc2VydmljZXMnLCAnZW1haWwnKTtcbiAgaWYgKCF1c2VyLnNlcnZpY2VzLmVtYWlsLnZlcmlmaWNhdGlvblRva2Vucykge1xuICAgIHVzZXIuc2VydmljZXMuZW1haWwudmVyaWZpY2F0aW9uVG9rZW5zID0gW107XG4gIH1cbiAgdXNlci5zZXJ2aWNlcy5lbWFpbC52ZXJpZmljYXRpb25Ub2tlbnMucHVzaCh0b2tlblJlY29yZCk7XG5cbiAgcmV0dXJuIHtlbWFpbCwgdXNlciwgdG9rZW59O1xufTtcblxuLyoqXG4gKiBAc3VtbWFyeSBDcmVhdGVzIG9wdGlvbnMgZm9yIGVtYWlsIHNlbmRpbmcgZm9yIHJlc2V0IHBhc3N3b3JkIGFuZCBlbnJvbGwgYWNjb3VudCBlbWFpbHMuXG4gKiBZb3UgY2FuIHVzZSB0aGlzIGZ1bmN0aW9uIHdoZW4gY3VzdG9taXppbmcgYSByZXNldCBwYXNzd29yZCBvciBlbnJvbGwgYWNjb3VudCBlbWFpbCBzZW5kaW5nLlxuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHtPYmplY3R9IGVtYWlsIFdoaWNoIGFkZHJlc3Mgb2YgdGhlIHVzZXIncyB0byBzZW5kIHRoZSBlbWFpbCB0by5cbiAqIEBwYXJhbSB7T2JqZWN0fSB1c2VyIFRoZSB1c2VyIG9iamVjdCB0byBnZW5lcmF0ZSBvcHRpb25zIGZvci5cbiAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVVJMIHRvIHdoaWNoIHVzZXIgaXMgZGlyZWN0ZWQgdG8gY29uZmlybSB0aGUgZW1haWwuXG4gKiBAcGFyYW0ge1N0cmluZ30gcmVhc29uIGByZXNldFBhc3N3b3JkYCBvciBgZW5yb2xsQWNjb3VudGAuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBPcHRpb25zIHdoaWNoIGNhbiBiZSBwYXNzZWQgdG8gYEVtYWlsLnNlbmRgLlxuICogQGltcG9ydEZyb21QYWNrYWdlIGFjY291bnRzLWJhc2VcbiAqL1xuQWNjb3VudHMuZ2VuZXJhdGVPcHRpb25zRm9yRW1haWwgPSAoZW1haWwsIHVzZXIsIHVybCwgcmVhc29uKSA9PiB7XG4gIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgdG86IGVtYWlsLFxuICAgIGZyb206IEFjY291bnRzLmVtYWlsVGVtcGxhdGVzW3JlYXNvbl0uZnJvbVxuICAgICAgPyBBY2NvdW50cy5lbWFpbFRlbXBsYXRlc1tyZWFzb25dLmZyb20odXNlcilcbiAgICAgIDogQWNjb3VudHMuZW1haWxUZW1wbGF0ZXMuZnJvbSxcbiAgICBzdWJqZWN0OiBBY2NvdW50cy5lbWFpbFRlbXBsYXRlc1tyZWFzb25dLnN1YmplY3QodXNlcilcbiAgfTtcblxuICBpZiAodHlwZW9mIEFjY291bnRzLmVtYWlsVGVtcGxhdGVzW3JlYXNvbl0udGV4dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIG9wdGlvbnMudGV4dCA9IEFjY291bnRzLmVtYWlsVGVtcGxhdGVzW3JlYXNvbl0udGV4dCh1c2VyLCB1cmwpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBBY2NvdW50cy5lbWFpbFRlbXBsYXRlc1tyZWFzb25dLmh0bWwgPT09ICdmdW5jdGlvbicpIHtcbiAgICBvcHRpb25zLmh0bWwgPSBBY2NvdW50cy5lbWFpbFRlbXBsYXRlc1tyZWFzb25dLmh0bWwodXNlciwgdXJsKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgQWNjb3VudHMuZW1haWxUZW1wbGF0ZXMuaGVhZGVycyA9PT0gJ29iamVjdCcpIHtcbiAgICBvcHRpb25zLmhlYWRlcnMgPSBBY2NvdW50cy5lbWFpbFRlbXBsYXRlcy5oZWFkZXJzO1xuICB9XG5cbiAgcmV0dXJuIG9wdGlvbnM7XG59O1xuXG4vLyBzZW5kIHRoZSB1c2VyIGFuIGVtYWlsIHdpdGggYSBsaW5rIHRoYXQgd2hlbiBvcGVuZWQgYWxsb3dzIHRoZSB1c2VyXG4vLyB0byBzZXQgYSBuZXcgcGFzc3dvcmQsIHdpdGhvdXQgdGhlIG9sZCBwYXNzd29yZC5cblxuLyoqXG4gKiBAc3VtbWFyeSBTZW5kIGFuIGVtYWlsIHdpdGggYSBsaW5rIHRoZSB1c2VyIGNhbiB1c2UgdG8gcmVzZXQgdGhlaXIgcGFzc3dvcmQuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge1N0cmluZ30gdXNlcklkIFRoZSBpZCBvZiB0aGUgdXNlciB0byBzZW5kIGVtYWlsIHRvLlxuICogQHBhcmFtIHtTdHJpbmd9IFtlbWFpbF0gT3B0aW9uYWwuIFdoaWNoIGFkZHJlc3Mgb2YgdGhlIHVzZXIncyB0byBzZW5kIHRoZSBlbWFpbCB0by4gVGhpcyBhZGRyZXNzIG11c3QgYmUgaW4gdGhlIHVzZXIncyBgZW1haWxzYCBsaXN0LiBEZWZhdWx0cyB0byB0aGUgZmlyc3QgZW1haWwgaW4gdGhlIGxpc3QuXG4gKiBAcGFyYW0ge09iamVjdH0gW2V4dHJhVG9rZW5EYXRhXSBPcHRpb25hbCBhZGRpdGlvbmFsIGRhdGEgdG8gYmUgYWRkZWQgaW50byB0aGUgdG9rZW4gcmVjb3JkLlxuICogQHBhcmFtIHtPYmplY3R9IFtleHRyYVBhcmFtc10gT3B0aW9uYWwgYWRkaXRpb25hbCBwYXJhbXMgdG8gYmUgYWRkZWQgdG8gdGhlIHJlc2V0IHVybC5cbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHtlbWFpbCwgdXNlciwgdG9rZW4sIHVybCwgb3B0aW9uc30gdmFsdWVzLlxuICogQGltcG9ydEZyb21QYWNrYWdlIGFjY291bnRzLWJhc2VcbiAqL1xuQWNjb3VudHMuc2VuZFJlc2V0UGFzc3dvcmRFbWFpbCA9ICh1c2VySWQsIGVtYWlsLCBleHRyYVRva2VuRGF0YSwgZXh0cmFQYXJhbXMpID0+IHtcbiAgY29uc3Qge2VtYWlsOiByZWFsRW1haWwsIHVzZXIsIHRva2VufSA9XG4gICAgQWNjb3VudHMuZ2VuZXJhdGVSZXNldFRva2VuKHVzZXJJZCwgZW1haWwsICdyZXNldFBhc3N3b3JkJywgZXh0cmFUb2tlbkRhdGEpO1xuICBjb25zdCB1cmwgPSBBY2NvdW50cy51cmxzLnJlc2V0UGFzc3dvcmQodG9rZW4sIGV4dHJhUGFyYW1zKTtcbiAgY29uc3Qgb3B0aW9ucyA9IEFjY291bnRzLmdlbmVyYXRlT3B0aW9uc0ZvckVtYWlsKHJlYWxFbWFpbCwgdXNlciwgdXJsLCAncmVzZXRQYXNzd29yZCcpO1xuICBFbWFpbC5zZW5kKG9wdGlvbnMpO1xuICBpZiAoTWV0ZW9yLmlzRGV2ZWxvcG1lbnQpIHtcbiAgICBjb25zb2xlLmxvZyhgXFxuUmVzZXQgcGFzc3dvcmQgVVJMOiAke3VybH1gKTtcbiAgfVxuICByZXR1cm4ge2VtYWlsOiByZWFsRW1haWwsIHVzZXIsIHRva2VuLCB1cmwsIG9wdGlvbnN9O1xufTtcblxuLy8gc2VuZCB0aGUgdXNlciBhbiBlbWFpbCBpbmZvcm1pbmcgdGhlbSB0aGF0IHRoZWlyIGFjY291bnQgd2FzIGNyZWF0ZWQsIHdpdGhcbi8vIGEgbGluayB0aGF0IHdoZW4gb3BlbmVkIGJvdGggbWFya3MgdGhlaXIgZW1haWwgYXMgdmVyaWZpZWQgYW5kIGZvcmNlcyB0aGVtXG4vLyB0byBjaG9vc2UgdGhlaXIgcGFzc3dvcmQuIFRoZSBlbWFpbCBtdXN0IGJlIG9uZSBvZiB0aGUgYWRkcmVzc2VzIGluIHRoZVxuLy8gdXNlcidzIGVtYWlscyBmaWVsZCwgb3IgdW5kZWZpbmVkIHRvIHBpY2sgdGhlIGZpcnN0IGVtYWlsIGF1dG9tYXRpY2FsbHkuXG4vL1xuLy8gVGhpcyBpcyBub3QgY2FsbGVkIGF1dG9tYXRpY2FsbHkuIEl0IG11c3QgYmUgY2FsbGVkIG1hbnVhbGx5IGlmIHlvdVxuLy8gd2FudCB0byB1c2UgZW5yb2xsbWVudCBlbWFpbHMuXG5cbi8qKlxuICogQHN1bW1hcnkgU2VuZCBhbiBlbWFpbCB3aXRoIGEgbGluayB0aGUgdXNlciBjYW4gdXNlIHRvIHNldCB0aGVpciBpbml0aWFsIHBhc3N3b3JkLlxuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJJZCBUaGUgaWQgb2YgdGhlIHVzZXIgdG8gc2VuZCBlbWFpbCB0by5cbiAqIEBwYXJhbSB7U3RyaW5nfSBbZW1haWxdIE9wdGlvbmFsLiBXaGljaCBhZGRyZXNzIG9mIHRoZSB1c2VyJ3MgdG8gc2VuZCB0aGUgZW1haWwgdG8uIFRoaXMgYWRkcmVzcyBtdXN0IGJlIGluIHRoZSB1c2VyJ3MgYGVtYWlsc2AgbGlzdC4gRGVmYXVsdHMgdG8gdGhlIGZpcnN0IGVtYWlsIGluIHRoZSBsaXN0LlxuICogQHBhcmFtIHtPYmplY3R9IFtleHRyYVRva2VuRGF0YV0gT3B0aW9uYWwgYWRkaXRpb25hbCBkYXRhIHRvIGJlIGFkZGVkIGludG8gdGhlIHRva2VuIHJlY29yZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbZXh0cmFQYXJhbXNdIE9wdGlvbmFsIGFkZGl0aW9uYWwgcGFyYW1zIHRvIGJlIGFkZGVkIHRvIHRoZSBlbnJvbGxtZW50IHVybC5cbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHtlbWFpbCwgdXNlciwgdG9rZW4sIHVybCwgb3B0aW9uc30gdmFsdWVzLlxuICogQGltcG9ydEZyb21QYWNrYWdlIGFjY291bnRzLWJhc2VcbiAqL1xuQWNjb3VudHMuc2VuZEVucm9sbG1lbnRFbWFpbCA9ICh1c2VySWQsIGVtYWlsLCBleHRyYVRva2VuRGF0YSwgZXh0cmFQYXJhbXMpID0+IHtcbiAgY29uc3Qge2VtYWlsOiByZWFsRW1haWwsIHVzZXIsIHRva2VufSA9XG4gICAgQWNjb3VudHMuZ2VuZXJhdGVSZXNldFRva2VuKHVzZXJJZCwgZW1haWwsICdlbnJvbGxBY2NvdW50JywgZXh0cmFUb2tlbkRhdGEpO1xuICBjb25zdCB1cmwgPSBBY2NvdW50cy51cmxzLmVucm9sbEFjY291bnQodG9rZW4sIGV4dHJhUGFyYW1zKTtcbiAgY29uc3Qgb3B0aW9ucyA9IEFjY291bnRzLmdlbmVyYXRlT3B0aW9uc0ZvckVtYWlsKHJlYWxFbWFpbCwgdXNlciwgdXJsLCAnZW5yb2xsQWNjb3VudCcpO1xuICBFbWFpbC5zZW5kKG9wdGlvbnMpO1xuICBpZiAoTWV0ZW9yLmlzRGV2ZWxvcG1lbnQpIHtcbiAgICBjb25zb2xlLmxvZyhgXFxuRW5yb2xsbWVudCBlbWFpbCBVUkw6ICR7dXJsfWApO1xuICB9XG4gIHJldHVybiB7ZW1haWw6IHJlYWxFbWFpbCwgdXNlciwgdG9rZW4sIHVybCwgb3B0aW9uc307XG59O1xuXG5cbi8vIFRha2UgdG9rZW4gZnJvbSBzZW5kUmVzZXRQYXNzd29yZEVtYWlsIG9yIHNlbmRFbnJvbGxtZW50RW1haWwsIGNoYW5nZVxuLy8gdGhlIHVzZXJzIHBhc3N3b3JkLCBhbmQgbG9nIHRoZW0gaW4uXG5NZXRlb3IubWV0aG9kcyh7cmVzZXRQYXNzd29yZDogZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgY29uc3QgdG9rZW4gPSBhcmdzWzBdO1xuICBjb25zdCBuZXdQYXNzd29yZCA9IGFyZ3NbMV07XG4gIHJldHVybiBBY2NvdW50cy5fbG9naW5NZXRob2QoXG4gICAgdGhpcyxcbiAgICBcInJlc2V0UGFzc3dvcmRcIixcbiAgICBhcmdzLFxuICAgIFwicGFzc3dvcmRcIixcbiAgICAoKSA9PiB7XG4gICAgICBjaGVjayh0b2tlbiwgU3RyaW5nKTtcbiAgICAgIGNoZWNrKG5ld1Bhc3N3b3JkLCBwYXNzd29yZFZhbGlkYXRvcik7XG5cbiAgICAgIGNvbnN0IHVzZXIgPSBNZXRlb3IudXNlcnMuZmluZE9uZShcbiAgICAgICAge1wic2VydmljZXMucGFzc3dvcmQucmVzZXQudG9rZW5cIjogdG9rZW59LFxuICAgICAgICB7ZmllbGRzOiB7XG4gICAgICAgICAgc2VydmljZXM6IDEsXG4gICAgICAgICAgZW1haWxzOiAxLFxuICAgICAgICB9fVxuICAgICAgKTtcbiAgICAgIGlmICghdXNlcikge1xuICAgICAgICB0aHJvdyBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJUb2tlbiBleHBpcmVkXCIpO1xuICAgICAgfVxuICAgICAgY29uc3QgeyB3aGVuLCByZWFzb24sIGVtYWlsIH0gPSB1c2VyLnNlcnZpY2VzLnBhc3N3b3JkLnJlc2V0O1xuICAgICAgbGV0IHRva2VuTGlmZXRpbWVNcyA9IEFjY291bnRzLl9nZXRQYXNzd29yZFJlc2V0VG9rZW5MaWZldGltZU1zKCk7XG4gICAgICBpZiAocmVhc29uID09PSBcImVucm9sbFwiKSB7XG4gICAgICAgIHRva2VuTGlmZXRpbWVNcyA9IEFjY291bnRzLl9nZXRQYXNzd29yZEVucm9sbFRva2VuTGlmZXRpbWVNcygpO1xuICAgICAgfVxuICAgICAgY29uc3QgY3VycmVudFRpbWVNcyA9IERhdGUubm93KCk7XG4gICAgICBpZiAoKGN1cnJlbnRUaW1lTXMgLSB3aGVuKSA+IHRva2VuTGlmZXRpbWVNcylcbiAgICAgICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDMsIFwiVG9rZW4gZXhwaXJlZFwiKTtcbiAgICAgIGlmICghKHBsdWNrQWRkcmVzc2VzKHVzZXIuZW1haWxzKS5pbmNsdWRlcyhlbWFpbCkpKVxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHVzZXJJZDogdXNlci5faWQsXG4gICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIlRva2VuIGhhcyBpbnZhbGlkIGVtYWlsIGFkZHJlc3NcIilcbiAgICAgICAgfTtcblxuICAgICAgY29uc3QgaGFzaGVkID0gaGFzaFBhc3N3b3JkKG5ld1Bhc3N3b3JkKTtcblxuICAgICAgLy8gTk9URTogV2UncmUgYWJvdXQgdG8gaW52YWxpZGF0ZSB0b2tlbnMgb24gdGhlIHVzZXIsIHdobyB3ZSBtaWdodCBiZVxuICAgICAgLy8gbG9nZ2VkIGluIGFzLiBNYWtlIHN1cmUgdG8gYXZvaWQgbG9nZ2luZyBvdXJzZWx2ZXMgb3V0IGlmIHRoaXNcbiAgICAgIC8vIGhhcHBlbnMuIEJ1dCBhbHNvIG1ha2Ugc3VyZSBub3QgdG8gbGVhdmUgdGhlIGNvbm5lY3Rpb24gaW4gYSBzdGF0ZVxuICAgICAgLy8gb2YgaGF2aW5nIGEgYmFkIHRva2VuIHNldCBpZiB0aGluZ3MgZmFpbC5cbiAgICAgIGNvbnN0IG9sZFRva2VuID0gQWNjb3VudHMuX2dldExvZ2luVG9rZW4odGhpcy5jb25uZWN0aW9uLmlkKTtcbiAgICAgIEFjY291bnRzLl9zZXRMb2dpblRva2VuKHVzZXIuX2lkLCB0aGlzLmNvbm5lY3Rpb24sIG51bGwpO1xuICAgICAgY29uc3QgcmVzZXRUb09sZFRva2VuID0gKCkgPT5cbiAgICAgICAgQWNjb3VudHMuX3NldExvZ2luVG9rZW4odXNlci5faWQsIHRoaXMuY29ubmVjdGlvbiwgb2xkVG9rZW4pO1xuXG4gICAgICB0cnkge1xuICAgICAgICAvLyBVcGRhdGUgdGhlIHVzZXIgcmVjb3JkIGJ5OlxuICAgICAgICAvLyAtIENoYW5naW5nIHRoZSBwYXNzd29yZCB0byB0aGUgbmV3IG9uZVxuICAgICAgICAvLyAtIEZvcmdldHRpbmcgYWJvdXQgdGhlIHJlc2V0IHRva2VuIHRoYXQgd2FzIGp1c3QgdXNlZFxuICAgICAgICAvLyAtIFZlcmlmeWluZyB0aGVpciBlbWFpbCwgc2luY2UgdGhleSBnb3QgdGhlIHBhc3N3b3JkIHJlc2V0IHZpYSBlbWFpbC5cbiAgICAgICAgY29uc3QgYWZmZWN0ZWRSZWNvcmRzID0gTWV0ZW9yLnVzZXJzLnVwZGF0ZShcbiAgICAgICAgICB7XG4gICAgICAgICAgICBfaWQ6IHVzZXIuX2lkLFxuICAgICAgICAgICAgJ2VtYWlscy5hZGRyZXNzJzogZW1haWwsXG4gICAgICAgICAgICAnc2VydmljZXMucGFzc3dvcmQucmVzZXQudG9rZW4nOiB0b2tlblxuICAgICAgICAgIH0sXG4gICAgICAgICAgeyRzZXQ6IHsnc2VydmljZXMucGFzc3dvcmQuYmNyeXB0JzogaGFzaGVkLFxuICAgICAgICAgICAgICAgICAgJ2VtYWlscy4kLnZlcmlmaWVkJzogdHJ1ZX0sXG4gICAgICAgICAgICR1bnNldDogeydzZXJ2aWNlcy5wYXNzd29yZC5yZXNldCc6IDEsXG4gICAgICAgICAgICAgICAgICAgICdzZXJ2aWNlcy5wYXNzd29yZC5zcnAnOiAxfX0pO1xuICAgICAgICBpZiAoYWZmZWN0ZWRSZWNvcmRzICE9PSAxKVxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB1c2VySWQ6IHVzZXIuX2lkLFxuICAgICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIkludmFsaWQgZW1haWxcIilcbiAgICAgICAgICB9O1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJlc2V0VG9PbGRUb2tlbigpO1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG5cbiAgICAgIC8vIFJlcGxhY2UgYWxsIHZhbGlkIGxvZ2luIHRva2VucyB3aXRoIG5ldyBvbmVzIChjaGFuZ2luZ1xuICAgICAgLy8gcGFzc3dvcmQgc2hvdWxkIGludmFsaWRhdGUgZXhpc3Rpbmcgc2Vzc2lvbnMpLlxuICAgICAgQWNjb3VudHMuX2NsZWFyQWxsTG9naW5Ub2tlbnModXNlci5faWQpO1xuXG4gICAgICByZXR1cm4ge3VzZXJJZDogdXNlci5faWR9O1xuICAgIH1cbiAgKTtcbn19KTtcblxuLy8vXG4vLy8gRU1BSUwgVkVSSUZJQ0FUSU9OXG4vLy9cblxuXG4vLyBzZW5kIHRoZSB1c2VyIGFuIGVtYWlsIHdpdGggYSBsaW5rIHRoYXQgd2hlbiBvcGVuZWQgbWFya3MgdGhhdFxuLy8gYWRkcmVzcyBhcyB2ZXJpZmllZFxuXG4vKipcbiAqIEBzdW1tYXJ5IFNlbmQgYW4gZW1haWwgd2l0aCBhIGxpbmsgdGhlIHVzZXIgY2FuIHVzZSB2ZXJpZnkgdGhlaXIgZW1haWwgYWRkcmVzcy5cbiAqIEBsb2N1cyBTZXJ2ZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSB1c2VySWQgVGhlIGlkIG9mIHRoZSB1c2VyIHRvIHNlbmQgZW1haWwgdG8uXG4gKiBAcGFyYW0ge1N0cmluZ30gW2VtYWlsXSBPcHRpb25hbC4gV2hpY2ggYWRkcmVzcyBvZiB0aGUgdXNlcidzIHRvIHNlbmQgdGhlIGVtYWlsIHRvLiBUaGlzIGFkZHJlc3MgbXVzdCBiZSBpbiB0aGUgdXNlcidzIGBlbWFpbHNgIGxpc3QuIERlZmF1bHRzIHRvIHRoZSBmaXJzdCB1bnZlcmlmaWVkIGVtYWlsIGluIHRoZSBsaXN0LlxuICogQHBhcmFtIHtPYmplY3R9IFtleHRyYVRva2VuRGF0YV0gT3B0aW9uYWwgYWRkaXRpb25hbCBkYXRhIHRvIGJlIGFkZGVkIGludG8gdGhlIHRva2VuIHJlY29yZC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbZXh0cmFQYXJhbXNdIE9wdGlvbmFsIGFkZGl0aW9uYWwgcGFyYW1zIHRvIGJlIGFkZGVkIHRvIHRoZSB2ZXJpZmljYXRpb24gdXJsLlxuICpcbiAqIEByZXR1cm5zIHtPYmplY3R9IE9iamVjdCB3aXRoIHtlbWFpbCwgdXNlciwgdG9rZW4sIHVybCwgb3B0aW9uc30gdmFsdWVzLlxuICogQGltcG9ydEZyb21QYWNrYWdlIGFjY291bnRzLWJhc2VcbiAqL1xuQWNjb3VudHMuc2VuZFZlcmlmaWNhdGlvbkVtYWlsID0gKHVzZXJJZCwgZW1haWwsIGV4dHJhVG9rZW5EYXRhLCBleHRyYVBhcmFtcykgPT4ge1xuICAvLyBYWFggQWxzbyBnZW5lcmF0ZSBhIGxpbmsgdXNpbmcgd2hpY2ggc29tZW9uZSBjYW4gZGVsZXRlIHRoaXNcbiAgLy8gYWNjb3VudCBpZiB0aGV5IG93biBzYWlkIGFkZHJlc3MgYnV0IHdlcmVuJ3QgdGhvc2Ugd2hvIGNyZWF0ZWRcbiAgLy8gdGhpcyBhY2NvdW50LlxuXG4gIGNvbnN0IHtlbWFpbDogcmVhbEVtYWlsLCB1c2VyLCB0b2tlbn0gPVxuICAgIEFjY291bnRzLmdlbmVyYXRlVmVyaWZpY2F0aW9uVG9rZW4odXNlcklkLCBlbWFpbCwgZXh0cmFUb2tlbkRhdGEpO1xuICBjb25zdCB1cmwgPSBBY2NvdW50cy51cmxzLnZlcmlmeUVtYWlsKHRva2VuLCBleHRyYVBhcmFtcyk7XG4gIGNvbnN0IG9wdGlvbnMgPSBBY2NvdW50cy5nZW5lcmF0ZU9wdGlvbnNGb3JFbWFpbChyZWFsRW1haWwsIHVzZXIsIHVybCwgJ3ZlcmlmeUVtYWlsJyk7XG4gIEVtYWlsLnNlbmQob3B0aW9ucyk7XG4gIGlmIChNZXRlb3IuaXNEZXZlbG9wbWVudCkge1xuICAgIGNvbnNvbGUubG9nKGBcXG5WZXJpZmljYXRpb24gZW1haWwgVVJMOiAke3VybH1gKTtcbiAgfVxuICByZXR1cm4ge2VtYWlsOiByZWFsRW1haWwsIHVzZXIsIHRva2VuLCB1cmwsIG9wdGlvbnN9O1xufTtcblxuLy8gVGFrZSB0b2tlbiBmcm9tIHNlbmRWZXJpZmljYXRpb25FbWFpbCwgbWFyayB0aGUgZW1haWwgYXMgdmVyaWZpZWQsXG4vLyBhbmQgbG9nIHRoZW0gaW4uXG5NZXRlb3IubWV0aG9kcyh7dmVyaWZ5RW1haWw6IGZ1bmN0aW9uICguLi5hcmdzKSB7XG4gIGNvbnN0IHRva2VuID0gYXJnc1swXTtcbiAgcmV0dXJuIEFjY291bnRzLl9sb2dpbk1ldGhvZChcbiAgICB0aGlzLFxuICAgIFwidmVyaWZ5RW1haWxcIixcbiAgICBhcmdzLFxuICAgIFwicGFzc3dvcmRcIixcbiAgICAoKSA9PiB7XG4gICAgICBjaGVjayh0b2tlbiwgU3RyaW5nKTtcblxuICAgICAgY29uc3QgdXNlciA9IE1ldGVvci51c2Vycy5maW5kT25lKFxuICAgICAgICB7J3NlcnZpY2VzLmVtYWlsLnZlcmlmaWNhdGlvblRva2Vucy50b2tlbic6IHRva2VufSxcbiAgICAgICAge2ZpZWxkczoge1xuICAgICAgICAgIHNlcnZpY2VzOiAxLFxuICAgICAgICAgIGVtYWlsczogMSxcbiAgICAgICAgfX1cbiAgICAgICk7XG4gICAgICBpZiAoIXVzZXIpXG4gICAgICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIlZlcmlmeSBlbWFpbCBsaW5rIGV4cGlyZWRcIik7XG5cbiAgICAgICAgY29uc3QgdG9rZW5SZWNvcmQgPSB1c2VyLnNlcnZpY2VzLmVtYWlsLnZlcmlmaWNhdGlvblRva2Vucy5maW5kKFxuICAgICAgICAgIHQgPT4gdC50b2tlbiA9PSB0b2tlblxuICAgICAgICApO1xuICAgICAgaWYgKCF0b2tlblJlY29yZClcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB1c2VySWQ6IHVzZXIuX2lkLFxuICAgICAgICAgIGVycm9yOiBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJWZXJpZnkgZW1haWwgbGluayBleHBpcmVkXCIpXG4gICAgICAgIH07XG5cbiAgICAgIGNvbnN0IGVtYWlsc1JlY29yZCA9IHVzZXIuZW1haWxzLmZpbmQoXG4gICAgICAgIGUgPT4gZS5hZGRyZXNzID09IHRva2VuUmVjb3JkLmFkZHJlc3NcbiAgICAgICk7XG4gICAgICBpZiAoIWVtYWlsc1JlY29yZClcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB1c2VySWQ6IHVzZXIuX2lkLFxuICAgICAgICAgIGVycm9yOiBuZXcgTWV0ZW9yLkVycm9yKDQwMywgXCJWZXJpZnkgZW1haWwgbGluayBpcyBmb3IgdW5rbm93biBhZGRyZXNzXCIpXG4gICAgICAgIH07XG5cbiAgICAgIC8vIEJ5IGluY2x1ZGluZyB0aGUgYWRkcmVzcyBpbiB0aGUgcXVlcnksIHdlIGNhbiB1c2UgJ2VtYWlscy4kJyBpbiB0aGVcbiAgICAgIC8vIG1vZGlmaWVyIHRvIGdldCBhIHJlZmVyZW5jZSB0byB0aGUgc3BlY2lmaWMgb2JqZWN0IGluIHRoZSBlbWFpbHNcbiAgICAgIC8vIGFycmF5LiBTZWVcbiAgICAgIC8vIGh0dHA6Ly93d3cubW9uZ29kYi5vcmcvZGlzcGxheS9ET0NTL1VwZGF0aW5nLyNVcGRhdGluZy1UaGUlMjRwb3NpdGlvbmFsb3BlcmF0b3IpXG4gICAgICAvLyBodHRwOi8vd3d3Lm1vbmdvZGIub3JnL2Rpc3BsYXkvRE9DUy9VcGRhdGluZyNVcGRhdGluZy0lMjRwdWxsXG4gICAgICBNZXRlb3IudXNlcnMudXBkYXRlKFxuICAgICAgICB7X2lkOiB1c2VyLl9pZCxcbiAgICAgICAgICdlbWFpbHMuYWRkcmVzcyc6IHRva2VuUmVjb3JkLmFkZHJlc3N9LFxuICAgICAgICB7JHNldDogeydlbWFpbHMuJC52ZXJpZmllZCc6IHRydWV9LFxuICAgICAgICAgJHB1bGw6IHsnc2VydmljZXMuZW1haWwudmVyaWZpY2F0aW9uVG9rZW5zJzoge2FkZHJlc3M6IHRva2VuUmVjb3JkLmFkZHJlc3N9fX0pO1xuXG4gICAgICByZXR1cm4ge3VzZXJJZDogdXNlci5faWR9O1xuICAgIH1cbiAgKTtcbn19KTtcblxuLyoqXG4gKiBAc3VtbWFyeSBBZGQgYW4gZW1haWwgYWRkcmVzcyBmb3IgYSB1c2VyLiBVc2UgdGhpcyBpbnN0ZWFkIG9mIGRpcmVjdGx5XG4gKiB1cGRhdGluZyB0aGUgZGF0YWJhc2UuIFRoZSBvcGVyYXRpb24gd2lsbCBmYWlsIGlmIHRoZXJlIGlzIGEgZGlmZmVyZW50IHVzZXJcbiAqIHdpdGggYW4gZW1haWwgb25seSBkaWZmZXJpbmcgaW4gY2FzZS4gSWYgdGhlIHNwZWNpZmllZCB1c2VyIGhhcyBhbiBleGlzdGluZ1xuICogZW1haWwgb25seSBkaWZmZXJpbmcgaW4gY2FzZSBob3dldmVyLCB3ZSByZXBsYWNlIGl0LlxuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJJZCBUaGUgSUQgb2YgdGhlIHVzZXIgdG8gdXBkYXRlLlxuICogQHBhcmFtIHtTdHJpbmd9IG5ld0VtYWlsIEEgbmV3IGVtYWlsIGFkZHJlc3MgZm9yIHRoZSB1c2VyLlxuICogQHBhcmFtIHtCb29sZWFufSBbdmVyaWZpZWRdIE9wdGlvbmFsIC0gd2hldGhlciB0aGUgbmV3IGVtYWlsIGFkZHJlc3Mgc2hvdWxkXG4gKiBiZSBtYXJrZWQgYXMgdmVyaWZpZWQuIERlZmF1bHRzIHRvIGZhbHNlLlxuICogQGltcG9ydEZyb21QYWNrYWdlIGFjY291bnRzLWJhc2VcbiAqL1xuQWNjb3VudHMuYWRkRW1haWwgPSAodXNlcklkLCBuZXdFbWFpbCwgdmVyaWZpZWQpID0+IHtcbiAgY2hlY2sodXNlcklkLCBOb25FbXB0eVN0cmluZyk7XG4gIGNoZWNrKG5ld0VtYWlsLCBOb25FbXB0eVN0cmluZyk7XG4gIGNoZWNrKHZlcmlmaWVkLCBNYXRjaC5PcHRpb25hbChCb29sZWFuKSk7XG5cbiAgaWYgKHZlcmlmaWVkID09PSB2b2lkIDApIHtcbiAgICB2ZXJpZmllZCA9IGZhbHNlO1xuICB9XG5cbiAgY29uc3QgdXNlciA9IGdldFVzZXJCeUlkKHVzZXJJZCwge2ZpZWxkczoge2VtYWlsczogMX19KTtcbiAgaWYgKCF1c2VyKVxuICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIlVzZXIgbm90IGZvdW5kXCIpO1xuXG4gIC8vIEFsbG93IHVzZXJzIHRvIGNoYW5nZSB0aGVpciBvd24gZW1haWwgdG8gYSB2ZXJzaW9uIHdpdGggYSBkaWZmZXJlbnQgY2FzZVxuXG4gIC8vIFdlIGRvbid0IGhhdmUgdG8gY2FsbCBjaGVja0ZvckNhc2VJbnNlbnNpdGl2ZUR1cGxpY2F0ZXMgdG8gZG8gYSBjYXNlXG4gIC8vIGluc2Vuc2l0aXZlIGNoZWNrIGFjcm9zcyBhbGwgZW1haWxzIGluIHRoZSBkYXRhYmFzZSBoZXJlIGJlY2F1c2U6ICgxKSBpZlxuICAvLyB0aGVyZSBpcyBubyBjYXNlLWluc2Vuc2l0aXZlIGR1cGxpY2F0ZSBiZXR3ZWVuIHRoaXMgdXNlciBhbmQgb3RoZXIgdXNlcnMsXG4gIC8vIHRoZW4gd2UgYXJlIE9LIGFuZCAoMikgaWYgdGhpcyB3b3VsZCBjcmVhdGUgYSBjb25mbGljdCB3aXRoIG90aGVyIHVzZXJzXG4gIC8vIHRoZW4gdGhlcmUgd291bGQgYWxyZWFkeSBiZSBhIGNhc2UtaW5zZW5zaXRpdmUgZHVwbGljYXRlIGFuZCB3ZSBjYW4ndCBmaXhcbiAgLy8gdGhhdCBpbiB0aGlzIGNvZGUgYW55d2F5LlxuICBjb25zdCBjYXNlSW5zZW5zaXRpdmVSZWdFeHAgPVxuICAgIG5ldyBSZWdFeHAoYF4ke01ldGVvci5fZXNjYXBlUmVnRXhwKG5ld0VtYWlsKX0kYCwgJ2knKTtcblxuICBjb25zdCBkaWRVcGRhdGVPd25FbWFpbCA9ICh1c2VyLmVtYWlscyB8fCBbXSkucmVkdWNlKFxuICAgIChwcmV2LCBlbWFpbCkgPT4ge1xuICAgICAgaWYgKGNhc2VJbnNlbnNpdGl2ZVJlZ0V4cC50ZXN0KGVtYWlsLmFkZHJlc3MpKSB7XG4gICAgICAgIE1ldGVvci51c2Vycy51cGRhdGUoe1xuICAgICAgICAgIF9pZDogdXNlci5faWQsXG4gICAgICAgICAgJ2VtYWlscy5hZGRyZXNzJzogZW1haWwuYWRkcmVzc1xuICAgICAgICB9LCB7JHNldDoge1xuICAgICAgICAgICdlbWFpbHMuJC5hZGRyZXNzJzogbmV3RW1haWwsXG4gICAgICAgICAgJ2VtYWlscy4kLnZlcmlmaWVkJzogdmVyaWZpZWRcbiAgICAgICAgfX0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBwcmV2O1xuICAgICAgfVxuICAgIH0sXG4gICAgZmFsc2VcbiAgKTtcblxuICAvLyBJbiB0aGUgb3RoZXIgdXBkYXRlcyBiZWxvdywgd2UgaGF2ZSB0byBkbyBhbm90aGVyIGNhbGwgdG9cbiAgLy8gY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzIHRvIG1ha2Ugc3VyZSB0aGF0IG5vIGNvbmZsaWN0aW5nIHZhbHVlc1xuICAvLyB3ZXJlIGFkZGVkIHRvIHRoZSBkYXRhYmFzZSBpbiB0aGUgbWVhbnRpbWUuIFdlIGRvbid0IGhhdmUgdG8gZG8gdGhpcyBmb3JcbiAgLy8gdGhlIGNhc2Ugd2hlcmUgdGhlIHVzZXIgaXMgdXBkYXRpbmcgdGhlaXIgZW1haWwgYWRkcmVzcyB0byBvbmUgdGhhdCBpcyB0aGVcbiAgLy8gc2FtZSBhcyBiZWZvcmUsIGJ1dCBvbmx5IGRpZmZlcmVudCBiZWNhdXNlIG9mIGNhcGl0YWxpemF0aW9uLiBSZWFkIHRoZVxuICAvLyBiaWcgY29tbWVudCBhYm92ZSB0byB1bmRlcnN0YW5kIHdoeS5cblxuICBpZiAoZGlkVXBkYXRlT3duRW1haWwpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBQZXJmb3JtIGEgY2FzZSBpbnNlbnNpdGl2ZSBjaGVjayBmb3IgZHVwbGljYXRlcyBiZWZvcmUgdXBkYXRlXG4gIGNoZWNrRm9yQ2FzZUluc2Vuc2l0aXZlRHVwbGljYXRlcygnZW1haWxzLmFkZHJlc3MnLCAnRW1haWwnLCBuZXdFbWFpbCwgdXNlci5faWQpO1xuXG4gIE1ldGVvci51c2Vycy51cGRhdGUoe1xuICAgIF9pZDogdXNlci5faWRcbiAgfSwge1xuICAgICRhZGRUb1NldDoge1xuICAgICAgZW1haWxzOiB7XG4gICAgICAgIGFkZHJlc3M6IG5ld0VtYWlsLFxuICAgICAgICB2ZXJpZmllZDogdmVyaWZpZWRcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIC8vIFBlcmZvcm0gYW5vdGhlciBjaGVjayBhZnRlciB1cGRhdGUsIGluIGNhc2UgYSBtYXRjaGluZyB1c2VyIGhhcyBiZWVuXG4gIC8vIGluc2VydGVkIGluIHRoZSBtZWFudGltZVxuICB0cnkge1xuICAgIGNoZWNrRm9yQ2FzZUluc2Vuc2l0aXZlRHVwbGljYXRlcygnZW1haWxzLmFkZHJlc3MnLCAnRW1haWwnLCBuZXdFbWFpbCwgdXNlci5faWQpO1xuICB9IGNhdGNoIChleCkge1xuICAgIC8vIFVuZG8gdXBkYXRlIGlmIHRoZSBjaGVjayBmYWlsc1xuICAgIE1ldGVvci51c2Vycy51cGRhdGUoe19pZDogdXNlci5faWR9LFxuICAgICAgeyRwdWxsOiB7ZW1haWxzOiB7YWRkcmVzczogbmV3RW1haWx9fX0pO1xuICAgIHRocm93IGV4O1xuICB9XG59XG5cbi8qKlxuICogQHN1bW1hcnkgUmVtb3ZlIGFuIGVtYWlsIGFkZHJlc3MgZm9yIGEgdXNlci4gVXNlIHRoaXMgaW5zdGVhZCBvZiB1cGRhdGluZ1xuICogdGhlIGRhdGFiYXNlIGRpcmVjdGx5LlxuICogQGxvY3VzIFNlcnZlclxuICogQHBhcmFtIHtTdHJpbmd9IHVzZXJJZCBUaGUgSUQgb2YgdGhlIHVzZXIgdG8gdXBkYXRlLlxuICogQHBhcmFtIHtTdHJpbmd9IGVtYWlsIFRoZSBlbWFpbCBhZGRyZXNzIHRvIHJlbW92ZS5cbiAqIEBpbXBvcnRGcm9tUGFja2FnZSBhY2NvdW50cy1iYXNlXG4gKi9cbkFjY291bnRzLnJlbW92ZUVtYWlsID0gKHVzZXJJZCwgZW1haWwpID0+IHtcbiAgY2hlY2sodXNlcklkLCBOb25FbXB0eVN0cmluZyk7XG4gIGNoZWNrKGVtYWlsLCBOb25FbXB0eVN0cmluZyk7XG5cbiAgY29uc3QgdXNlciA9IGdldFVzZXJCeUlkKHVzZXJJZCwge2ZpZWxkczoge19pZDogMX19KTtcbiAgaWYgKCF1c2VyKVxuICAgIHRocm93IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIlVzZXIgbm90IGZvdW5kXCIpO1xuXG4gIE1ldGVvci51c2Vycy51cGRhdGUoe19pZDogdXNlci5faWR9LFxuICAgIHskcHVsbDoge2VtYWlsczoge2FkZHJlc3M6IGVtYWlsfX19KTtcbn1cblxuLy8vXG4vLy8gQ1JFQVRJTkcgVVNFUlNcbi8vL1xuXG4vLyBTaGFyZWQgY3JlYXRlVXNlciBmdW5jdGlvbiBjYWxsZWQgZnJvbSB0aGUgY3JlYXRlVXNlciBtZXRob2QsIGJvdGhcbi8vIGlmIG9yaWdpbmF0ZXMgaW4gY2xpZW50IG9yIHNlcnZlciBjb2RlLiBDYWxscyB1c2VyIHByb3ZpZGVkIGhvb2tzLFxuLy8gZG9lcyB0aGUgYWN0dWFsIHVzZXIgaW5zZXJ0aW9uLlxuLy9cbi8vIHJldHVybnMgdGhlIHVzZXIgaWRcbmNvbnN0IGNyZWF0ZVVzZXIgPSBvcHRpb25zID0+IHtcbiAgLy8gVW5rbm93biBrZXlzIGFsbG93ZWQsIGJlY2F1c2UgYSBvbkNyZWF0ZVVzZXJIb29rIGNhbiB0YWtlIGFyYml0cmFyeVxuICAvLyBvcHRpb25zLlxuICBjaGVjayhvcHRpb25zLCBNYXRjaC5PYmplY3RJbmNsdWRpbmcoe1xuICAgIHVzZXJuYW1lOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuICAgIGVtYWlsOiBNYXRjaC5PcHRpb25hbChTdHJpbmcpLFxuICAgIHBhc3N3b3JkOiBNYXRjaC5PcHRpb25hbChwYXNzd29yZFZhbGlkYXRvcilcbiAgfSkpO1xuXG4gIGNvbnN0IHsgdXNlcm5hbWUsIGVtYWlsLCBwYXNzd29yZCB9ID0gb3B0aW9ucztcbiAgaWYgKCF1c2VybmFtZSAmJiAhZW1haWwpXG4gICAgdGhyb3cgbmV3IE1ldGVvci5FcnJvcig0MDAsIFwiTmVlZCB0byBzZXQgYSB1c2VybmFtZSBvciBlbWFpbFwiKTtcblxuICBjb25zdCB1c2VyID0ge3NlcnZpY2VzOiB7fX07XG4gIGlmIChwYXNzd29yZCkge1xuICAgIGNvbnN0IGhhc2hlZCA9IGhhc2hQYXNzd29yZChwYXNzd29yZCk7XG4gICAgdXNlci5zZXJ2aWNlcy5wYXNzd29yZCA9IHsgYmNyeXB0OiBoYXNoZWQgfTtcbiAgfVxuXG4gIGlmICh1c2VybmFtZSlcbiAgICB1c2VyLnVzZXJuYW1lID0gdXNlcm5hbWU7XG4gIGlmIChlbWFpbClcbiAgICB1c2VyLmVtYWlscyA9IFt7YWRkcmVzczogZW1haWwsIHZlcmlmaWVkOiBmYWxzZX1dO1xuXG4gIC8vIFBlcmZvcm0gYSBjYXNlIGluc2Vuc2l0aXZlIGNoZWNrIGJlZm9yZSBpbnNlcnRcbiAgY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzKCd1c2VybmFtZScsICdVc2VybmFtZScsIHVzZXJuYW1lKTtcbiAgY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzKCdlbWFpbHMuYWRkcmVzcycsICdFbWFpbCcsIGVtYWlsKTtcblxuICBjb25zdCB1c2VySWQgPSBBY2NvdW50cy5pbnNlcnRVc2VyRG9jKG9wdGlvbnMsIHVzZXIpO1xuICAvLyBQZXJmb3JtIGFub3RoZXIgY2hlY2sgYWZ0ZXIgaW5zZXJ0LCBpbiBjYXNlIGEgbWF0Y2hpbmcgdXNlciBoYXMgYmVlblxuICAvLyBpbnNlcnRlZCBpbiB0aGUgbWVhbnRpbWVcbiAgdHJ5IHtcbiAgICBjaGVja0ZvckNhc2VJbnNlbnNpdGl2ZUR1cGxpY2F0ZXMoJ3VzZXJuYW1lJywgJ1VzZXJuYW1lJywgdXNlcm5hbWUsIHVzZXJJZCk7XG4gICAgY2hlY2tGb3JDYXNlSW5zZW5zaXRpdmVEdXBsaWNhdGVzKCdlbWFpbHMuYWRkcmVzcycsICdFbWFpbCcsIGVtYWlsLCB1c2VySWQpO1xuICB9IGNhdGNoIChleCkge1xuICAgIC8vIFJlbW92ZSBpbnNlcnRlZCB1c2VyIGlmIHRoZSBjaGVjayBmYWlsc1xuICAgIE1ldGVvci51c2Vycy5yZW1vdmUodXNlcklkKTtcbiAgICB0aHJvdyBleDtcbiAgfVxuICByZXR1cm4gdXNlcklkO1xufTtcblxuLy8gbWV0aG9kIGZvciBjcmVhdGUgdXNlci4gUmVxdWVzdHMgY29tZSBmcm9tIHRoZSBjbGllbnQuXG5NZXRlb3IubWV0aG9kcyh7Y3JlYXRlVXNlcjogZnVuY3Rpb24gKC4uLmFyZ3MpIHtcbiAgY29uc3Qgb3B0aW9ucyA9IGFyZ3NbMF07XG4gIHJldHVybiBBY2NvdW50cy5fbG9naW5NZXRob2QoXG4gICAgdGhpcyxcbiAgICBcImNyZWF0ZVVzZXJcIixcbiAgICBhcmdzLFxuICAgIFwicGFzc3dvcmRcIixcbiAgICAoKSA9PiB7XG4gICAgICAvLyBjcmVhdGVVc2VyKCkgYWJvdmUgZG9lcyBtb3JlIGNoZWNraW5nLlxuICAgICAgY2hlY2sob3B0aW9ucywgT2JqZWN0KTtcbiAgICAgIGlmIChBY2NvdW50cy5fb3B0aW9ucy5mb3JiaWRDbGllbnRBY2NvdW50Q3JlYXRpb24pXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZXJyb3I6IG5ldyBNZXRlb3IuRXJyb3IoNDAzLCBcIlNpZ251cHMgZm9yYmlkZGVuXCIpXG4gICAgICAgIH07XG5cbiAgICAgIGNvbnN0IHVzZXJJZCA9IEFjY291bnRzLmNyZWF0ZVVzZXJWZXJpZnlpbmdFbWFpbChvcHRpb25zKTtcblxuICAgICAgLy8gY2xpZW50IGdldHMgbG9nZ2VkIGluIGFzIHRoZSBuZXcgdXNlciBhZnRlcndhcmRzLlxuICAgICAgcmV0dXJuIHt1c2VySWQ6IHVzZXJJZH07XG4gICAgfVxuICApO1xufX0pO1xuXG4vKipcbiAqIEBzdW1tYXJ5IENyZWF0ZXMgYW4gdXNlciBhbmQgc2VuZHMgYW4gZW1haWwgaWYgYG9wdGlvbnMuZW1haWxgIGlzIGluZm9ybWVkLlxuICogVGhlbiBpZiB0aGUgYHNlbmRWZXJpZmljYXRpb25FbWFpbGAgb3B0aW9uIGZyb20gdGhlIGBBY2NvdW50c2AgcGFja2FnZSBpc1xuICogZW5hYmxlZCwgeW91J2xsIHNlbmQgYSB2ZXJpZmljYXRpb24gZW1haWwgaWYgYG9wdGlvbnMucGFzc3dvcmRgIGlzIGluZm9ybWVkLFxuICogb3RoZXJ3aXNlIHlvdSdsbCBzZW5kIGFuIGVucm9sbG1lbnQgZW1haWwuXG4gKiBAbG9jdXMgU2VydmVyXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0aW9ucyBUaGUgb3B0aW9ucyBvYmplY3QgdG8gYmUgcGFzc2VkIGRvd24gd2hlbiBjcmVhdGluZ1xuICogdGhlIHVzZXJcbiAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLnVzZXJuYW1lIEEgdW5pcXVlIG5hbWUgZm9yIHRoaXMgdXNlci5cbiAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLmVtYWlsIFRoZSB1c2VyJ3MgZW1haWwgYWRkcmVzcy5cbiAqIEBwYXJhbSB7U3RyaW5nfSBvcHRpb25zLnBhc3N3b3JkIFRoZSB1c2VyJ3MgcGFzc3dvcmQuIFRoaXMgaXMgX19ub3RfXyBzZW50IGluIHBsYWluIHRleHQgb3ZlciB0aGUgd2lyZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zLnByb2ZpbGUgVGhlIHVzZXIncyBwcm9maWxlLCB0eXBpY2FsbHkgaW5jbHVkaW5nIHRoZSBgbmFtZWAgZmllbGQuXG4gKiBAaW1wb3J0RnJvbVBhY2thZ2UgYWNjb3VudHMtYmFzZVxuICogKi9cbkFjY291bnRzLmNyZWF0ZVVzZXJWZXJpZnlpbmdFbWFpbCA9IChvcHRpb25zKSA9PiB7XG4gIG9wdGlvbnMgPSB7IC4uLm9wdGlvbnMgfTtcbiAgLy8gQ3JlYXRlIHVzZXIuIHJlc3VsdCBjb250YWlucyBpZCBhbmQgdG9rZW4uXG4gIGNvbnN0IHVzZXJJZCA9IGNyZWF0ZVVzZXIob3B0aW9ucyk7XG4gIC8vIHNhZmV0eSBiZWx0LiBjcmVhdGVVc2VyIGlzIHN1cHBvc2VkIHRvIHRocm93IG9uIGVycm9yLiBzZW5kIDUwMCBlcnJvclxuICAvLyBpbnN0ZWFkIG9mIHNlbmRpbmcgYSB2ZXJpZmljYXRpb24gZW1haWwgd2l0aCBlbXB0eSB1c2VyaWQuXG4gIGlmICghIHVzZXJJZClcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJjcmVhdGVVc2VyIGZhaWxlZCB0byBpbnNlcnQgbmV3IHVzZXJcIik7XG5cbiAgLy8gSWYgYEFjY291bnRzLl9vcHRpb25zLnNlbmRWZXJpZmljYXRpb25FbWFpbGAgaXMgc2V0LCByZWdpc3RlclxuICAvLyBhIHRva2VuIHRvIHZlcmlmeSB0aGUgdXNlcidzIHByaW1hcnkgZW1haWwsIGFuZCBzZW5kIGl0IHRvXG4gIC8vIHRoYXQgYWRkcmVzcy5cbiAgaWYgKG9wdGlvbnMuZW1haWwgJiYgQWNjb3VudHMuX29wdGlvbnMuc2VuZFZlcmlmaWNhdGlvbkVtYWlsKSB7XG4gICAgaWYgKG9wdGlvbnMucGFzc3dvcmQpIHtcbiAgICAgIEFjY291bnRzLnNlbmRWZXJpZmljYXRpb25FbWFpbCh1c2VySWQsIG9wdGlvbnMuZW1haWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBBY2NvdW50cy5zZW5kRW5yb2xsbWVudEVtYWlsKHVzZXJJZCwgb3B0aW9ucy5lbWFpbCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHVzZXJJZDtcbn07XG5cbi8vIENyZWF0ZSB1c2VyIGRpcmVjdGx5IG9uIHRoZSBzZXJ2ZXIuXG4vL1xuLy8gVW5saWtlIHRoZSBjbGllbnQgdmVyc2lvbiwgdGhpcyBkb2VzIG5vdCBsb2cgeW91IGluIGFzIHRoaXMgdXNlclxuLy8gYWZ0ZXIgY3JlYXRpb24uXG4vL1xuLy8gcmV0dXJucyB1c2VySWQgb3IgdGhyb3dzIGFuIGVycm9yIGlmIGl0IGNhbid0IGNyZWF0ZVxuLy9cbi8vIFhYWCBhZGQgYW5vdGhlciBhcmd1bWVudCAoXCJzZXJ2ZXIgb3B0aW9uc1wiKSB0aGF0IGdldHMgc2VudCB0byBvbkNyZWF0ZVVzZXIsXG4vLyB3aGljaCBpcyBhbHdheXMgZW1wdHkgd2hlbiBjYWxsZWQgZnJvbSB0aGUgY3JlYXRlVXNlciBtZXRob2Q/IGVnLCBcImFkbWluOlxuLy8gdHJ1ZVwiLCB3aGljaCB3ZSB3YW50IHRvIHByZXZlbnQgdGhlIGNsaWVudCBmcm9tIHNldHRpbmcsIGJ1dCB3aGljaCBhIGN1c3RvbVxuLy8gbWV0aG9kIGNhbGxpbmcgQWNjb3VudHMuY3JlYXRlVXNlciBjb3VsZCBzZXQ/XG4vL1xuQWNjb3VudHMuY3JlYXRlVXNlciA9IChvcHRpb25zLCBjYWxsYmFjaykgPT4ge1xuICBvcHRpb25zID0geyAuLi5vcHRpb25zIH07XG5cbiAgLy8gWFhYIGFsbG93IGFuIG9wdGlvbmFsIGNhbGxiYWNrP1xuICBpZiAoY2FsbGJhY2spIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBY2NvdW50cy5jcmVhdGVVc2VyIHdpdGggY2FsbGJhY2sgbm90IHN1cHBvcnRlZCBvbiB0aGUgc2VydmVyIHlldC5cIik7XG4gIH1cblxuICByZXR1cm4gY3JlYXRlVXNlcihvcHRpb25zKTtcbn07XG5cbi8vL1xuLy8vIFBBU1NXT1JELVNQRUNJRklDIElOREVYRVMgT04gVVNFUlNcbi8vL1xuTWV0ZW9yLnVzZXJzLl9lbnN1cmVJbmRleCgnc2VydmljZXMuZW1haWwudmVyaWZpY2F0aW9uVG9rZW5zLnRva2VuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgeyB1bmlxdWU6IHRydWUsIHNwYXJzZTogdHJ1ZSB9KTtcbk1ldGVvci51c2Vycy5fZW5zdXJlSW5kZXgoJ3NlcnZpY2VzLnBhc3N3b3JkLnJlc2V0LnRva2VuJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgeyB1bmlxdWU6IHRydWUsIHNwYXJzZTogdHJ1ZSB9KTtcbiJdfQ==
