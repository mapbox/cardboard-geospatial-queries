var tilebelt = require('tilebelt');
var Client = require('./client');
var queue = require('d3-queue').queue;
var polygonToQuadkeys = require('./polygon_to_quadkeys');
var manyRequests = require('./many_requests');


module.exports = function(config) {
  var client = Client(config);

  var api = {};

  api.client = client;

  api.bbox = function(params, cb) {
    var bbox = params.bbox;
    var dataset = params.dataset;
    var numResults = params.perPage || Infinity;

    var toSearch = params.next || polygonToQuadkeys(bbox).reduce(function(memo, key) {
      memo[key] = null;
      return memo;
    }, {});

    var bulkCache = {};

    var perRequest = numResults === Infinity ? 500 : numResults;

    var opts = {
      toSearch: toSearch,
      perPage: params.perPage,
      dataset: dataset,
      perRequest: perRequest,
      client: client
    };

    manyRequests(opts, function(err, results, next) {
      if (err) return cb(err);

      var left = Object.keys(next).filter(function(id) { return next[id] !== 'done'; });

      if (left.length === 0) next = null;
      cb(null, results, next);
    });
    
  };

  return api;
}
