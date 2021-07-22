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

/* Package-scope variables */
var URL, URLSearchParams;

var require = meteorInstall({"node_modules":{"meteor":{"url":{"modern.js":function module(require,exports){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/url/modern.js                                                      //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
URL = global.URL;
URLSearchParams = global.URLSearchParams;

exports.URL = URL;
exports.URLSearchParams = URLSearchParams;

// backwards compatability
Object.assign(URL, require('./bc/url_client'));

/////////////////////////////////////////////////////////////////////////////////

},"bc":{"url_client.js":function module(require,exports){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/url/bc/url_client.js                                               //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
var common = require("./url_common.js");

exports._constructUrl = function (url, query, params) {
  var query_match = /^(.*?)(\?.*)?$/.exec(url);
  return common.buildUrl(
    query_match[1],
    query_match[2],
    query,
    params
  );
};

exports._encodeParams = common._encodeParams;
/////////////////////////////////////////////////////////////////////////////////

},"url_common.js":function module(require,exports){

/////////////////////////////////////////////////////////////////////////////////
//                                                                             //
// packages/url/bc/url_common.js                                               //
//                                                                             //
/////////////////////////////////////////////////////////////////////////////////
                                                                               //
function encodeString(str) {
  return encodeURIComponent(str).replace(/\*/g, '%2A');
}

// Encode URL parameters into a query string, handling nested objects and
// arrays properly.
var _encodeParams = function (params, prefix) {
  var str = [];
  var isParamsArray = Array.isArray(params);
  for (var p in params) {
    if (Object.prototype.hasOwnProperty.call(params, p)) {
      var k = prefix ? prefix + '[' + (isParamsArray ? '' : p) + ']' : p;
      var v = params[p];
      if (typeof v === 'object') {
        str.push(_encodeParams(v, k));
      } else {
        var encodedKey =
          encodeString(k).replace('%5B', '[').replace('%5D', ']');
        str.push(encodedKey + '=' + encodeString(v));
      }
    }
  }
  return str.join('&').replace(/%20/g, '+');
};

exports._encodeParams = _encodeParams;

exports.buildUrl = function(before_qmark, from_qmark, opt_query, opt_params) {
  var url_without_query = before_qmark;
  var query = from_qmark ? from_qmark.slice(1) : null;

  if (typeof opt_query === "string")
    query = String(opt_query);

  if (opt_params) {
    query = query || "";
    var prms = _encodeParams(opt_params);
    if (query && prms)
      query += '&';
    query += prms;
  }

  var url = url_without_query;
  if (query !== null)
    url += ("?"+query);

  return url;
};

/////////////////////////////////////////////////////////////////////////////////

}}}}}},{
  "extensions": [
    ".js",
    ".json"
  ]
});

var exports = require("/node_modules/meteor/url/modern.js");

/* Exports */
Package._define("url", exports, {
  URL: URL,
  URLSearchParams: URLSearchParams
});

})();
