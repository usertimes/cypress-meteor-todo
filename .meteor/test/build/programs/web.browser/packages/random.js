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
var meteorInstall = Package.modules.meteorInstall;
var Promise = Package.promise.Promise;

/* Package-scope variables */
var charsCount, Random;

var require = meteorInstall({"node_modules":{"meteor":{"random":{"main_client.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/random/main_client.js                                                                //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.export({
  Random: () => Random
});
let BrowserRandomGenerator;
module.link("./BrowserRandomGenerator", {
  default(v) {
    BrowserRandomGenerator = v;
  }

}, 0);
let createAleaGeneratorWithGeneratedSeed;
module.link("./createAleaGenerator", {
  default(v) {
    createAleaGeneratorWithGeneratedSeed = v;
  }

}, 1);
let createRandom;
module.link("./createRandom", {
  default(v) {
    createRandom = v;
  }

}, 2);
let generator;

if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
  generator = new BrowserRandomGenerator();
} else {
  // On IE 10 and below, there's no browser crypto API
  // available. Fall back to Alea
  //
  // XXX looks like at the moment, we use Alea in IE 11 as well,
  // which has `window.msCrypto` instead of `window.crypto`.
  generator = createAleaGeneratorWithGeneratedSeed();
}

const Random = createRandom(generator);
///////////////////////////////////////////////////////////////////////////////////////////////////

},"AbstractRandomGenerator.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/random/AbstractRandomGenerator.js                                                    //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.export({
  default: () => RandomGenerator
});
let Meteor;
module.link("meteor/meteor", {
  Meteor(v) {
    Meteor = v;
  }

}, 0);
const UNMISTAKABLE_CHARS = '23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz';
const BASE64_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' + '0123456789-_'; // `type` is one of `RandomGenerator.Type` as defined below.
//
// options:
// - seeds: (required, only for RandomGenerator.Type.ALEA) an array
//   whose items will be `toString`ed and used as the seed to the Alea
//   algorithm

class RandomGenerator {
  /**
   * @name Random.fraction
   * @summary Return a number between 0 and 1, like `Math.random`.
   * @locus Anywhere
   */
  fraction() {
    throw new Error("Unknown random generator type");
  }
  /**
   * @name Random.hexString
   * @summary Return a random string of `n` hexadecimal digits.
   * @locus Anywhere
   * @param {Number} n Length of the string
   */


  hexString(digits) {
    return this._randomString(digits, '0123456789abcdef');
  }

  _randomString(charsCount, alphabet) {
    let result = '';

    for (let i = 0; i < charsCount; i++) {
      result += this.choice(alphabet);
    }

    return result;
  }
  /**
   * @name Random.id
   * @summary Return a unique identifier, such as `"Jjwjg6gouWLXhMGKW"`, that is
   * likely to be unique in the whole world.
   * @locus Anywhere
   * @param {Number} [n] Optional length of the identifier in characters
   *   (defaults to 17)
   */


  id(charsCount) {
    // 17 characters is around 96 bits of entropy, which is the amount of
    // state in the Alea PRNG.
    if (charsCount === undefined) {
      charsCount = 17;
    }

    return this._randomString(charsCount, UNMISTAKABLE_CHARS);
  }
  /**
   * @name Random.secret
   * @summary Return a random string of printable characters with 6 bits of
   * entropy per character. Use `Random.secret` for security-critical secrets
   * that are intended for machine, rather than human, consumption.
   * @locus Anywhere
   * @param {Number} [n] Optional length of the secret string (defaults to 43
   *   characters, or 256 bits of entropy)
   */


  secret(charsCount) {
    // Default to 256 bits of entropy, or 43 characters at 6 bits per
    // character.
    if (charsCount === undefined) {
      charsCount = 43;
    }

    return this._randomString(charsCount, BASE64_CHARS);
  }
  /**
   * @name Random.choice
   * @summary Return a random element of the given array or string.
   * @locus Anywhere
   * @param {Array|String} arrayOrString Array or string to choose from
   */


  choice(arrayOrString) {
    const index = Math.floor(this.fraction() * arrayOrString.length);

    if (typeof arrayOrString === 'string') {
      return arrayOrString.substr(index, 1);
    }

    return arrayOrString[index];
  }

}
///////////////////////////////////////////////////////////////////////////////////////////////////

},"AleaRandomGenerator.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/random/AleaRandomGenerator.js                                                        //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.export({
  default: () => AleaRandomGenerator
});
let RandomGenerator;
module.link("./AbstractRandomGenerator", {
  default(v) {
    RandomGenerator = v;
  }

}, 0);

// Alea PRNG, which is not cryptographically strong
// see http://baagoe.org/en/wiki/Better_random_numbers_for_javascript
// for a full discussion and Alea implementation.
function Alea(seeds) {
  function Mash() {
    let n = 0xefc8249d;

    const mash = data => {
      data = data.toString();

      for (let i = 0; i < data.length; i++) {
        n += data.charCodeAt(i);
        let h = 0.02519603282416938 * n;
        n = h >>> 0;
        h -= n;
        h *= n;
        n = h >>> 0;
        h -= n;
        n += h * 0x100000000; // 2^32
      }

      return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
    };

    mash.version = 'Mash 0.9';
    return mash;
  }

  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let c = 1;

  if (seeds.length === 0) {
    seeds = [+new Date()];
  }

  let mash = Mash();
  s0 = mash(' ');
  s1 = mash(' ');
  s2 = mash(' ');

  for (let i = 0; i < seeds.length; i++) {
    s0 -= mash(seeds[i]);

    if (s0 < 0) {
      s0 += 1;
    }

    s1 -= mash(seeds[i]);

    if (s1 < 0) {
      s1 += 1;
    }

    s2 -= mash(seeds[i]);

    if (s2 < 0) {
      s2 += 1;
    }
  }

  mash = null;

  const random = () => {
    const t = 2091639 * s0 + c * 2.3283064365386963e-10; // 2^-32

    s0 = s1;
    s1 = s2;
    return s2 = t - (c = t | 0);
  };

  random.uint32 = () => random() * 0x100000000; // 2^32


  random.fract53 = () => random() + (random() * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53


  random.version = 'Alea 0.9';
  random.args = seeds;
  return random;
} // options:
// - seeds: an array
//   whose items will be `toString`ed and used as the seed to the Alea
//   algorithm


class AleaRandomGenerator extends RandomGenerator {
  constructor() {
    let {
      seeds = []
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    super();

    if (!seeds) {
      throw new Error('No seeds were provided for Alea PRNG');
    }

    this.alea = Alea(seeds);
  }
  /**
   * @name Random.fraction
   * @summary Return a number between 0 and 1, like `Math.random`.
   * @locus Anywhere
   */


  fraction() {
    return this.alea();
  }

}
///////////////////////////////////////////////////////////////////////////////////////////////////

},"BrowserRandomGenerator.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/random/BrowserRandomGenerator.js                                                     //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.export({
  default: () => BrowserRandomGenerator
});
let RandomGenerator;
module.link("./AbstractRandomGenerator", {
  default(v) {
    RandomGenerator = v;
  }

}, 0);

class BrowserRandomGenerator extends RandomGenerator {
  /**
   * @name Random.fraction
   * @summary Return a number between 0 and 1, like `Math.random`.
   * @locus Anywhere
   */
  fraction() {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] * 2.3283064365386963e-10; // 2^-32
  }

}
///////////////////////////////////////////////////////////////////////////////////////////////////

},"createAleaGenerator.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/random/createAleaGenerator.js                                                        //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.export({
  default: () => createAleaGenerator
});
let AleaRandomGenerator;
module.link("./AleaRandomGenerator", {
  default(v) {
    AleaRandomGenerator = v;
  }

}, 0);
// instantiate RNG.  Heuristically collect entropy from various sources when a
// cryptographic PRNG isn't available.
// client sources
const height = typeof window !== 'undefined' && window.innerHeight || typeof document !== 'undefined' && document.documentElement && document.documentElement.clientHeight || typeof document !== 'undefined' && document.body && document.body.clientHeight || 1;
const width = typeof window !== 'undefined' && window.innerWidth || typeof document !== 'undefined' && document.documentElement && document.documentElement.clientWidth || typeof document !== 'undefined' && document.body && document.body.clientWidth || 1;
const agent = typeof navigator !== 'undefined' && navigator.userAgent || '';

function createAleaGenerator() {
  return new AleaRandomGenerator({
    seeds: [new Date(), height, width, agent, Math.random()]
  });
}
///////////////////////////////////////////////////////////////////////////////////////////////////

},"createRandom.js":function module(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                               //
// packages/random/createRandom.js                                                               //
//                                                                                               //
///////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                 //
module.export({
  default: () => createRandom
});
let AleaRandomGenerator;
module.link("./AleaRandomGenerator", {
  default(v) {
    AleaRandomGenerator = v;
  }

}, 0);
let createAleaGeneratorWithGeneratedSeed;
module.link("./createAleaGenerator", {
  default(v) {
    createAleaGeneratorWithGeneratedSeed = v;
  }

}, 1);

function createRandom(generator) {
  // Create a non-cryptographically secure PRNG with a given seed (using
  // the Alea algorithm)
  generator.createWithSeeds = function () {
    for (var _len = arguments.length, seeds = new Array(_len), _key = 0; _key < _len; _key++) {
      seeds[_key] = arguments[_key];
    }

    if (seeds.length === 0) {
      throw new Error('No seeds were provided');
    }

    return new AleaRandomGenerator({
      seeds
    });
  }; // Used like `Random`, but much faster and not cryptographically
  // secure


  generator.insecure = createAleaGeneratorWithGeneratedSeed();
  return generator;
}
///////////////////////////////////////////////////////////////////////////////////////////////////

}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/random/main_client.js");

/* Exports */
Package._define("random", exports, {
  Random: Random
});

})();
