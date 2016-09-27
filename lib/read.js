var tilebelt = require('tilebelt');
var Client = require('./client');
var queue = require('d3-queue').queue;
var polygonToQuadkeys = require('./polygon_to_quadkeys');
var manyRequests = require('./many_requests');


module.exports = function(config) {
  var client = Client(config);

  var api = {};

  api.bboxOne = function(params, cache, cb) {
    var start = Date.now();
    client.queryMatch(params, function(err, result) {
      if (err) return cb(err);
      var seen = {};
      var features = result.Items.map(function(item) {
        return item.search.split('!').slice(1).join('!');
      }).filter(function(feature) {
        seen[feature] = (seen[feature] || 0) + 1;
        return seen[feature] === 1;
      });

      var out = {
        items: [],
        next: result.LastEvaluatedKey
      };

      if (features.length === 0) return cb(null, out);
      var notInCache = features.filter(function(id) { return cache[id] === undefined; });
      if (notInCache.length === 0)  {
        out.items = features.map(function(id) { return cache[id]; });
        return cb(null, out);
      }
      client.getBatch(params.dataset, notInCache, function(err, items) {
        if (err) return cb(err);
        items.forEach(function(item) {
          var id = item.id.replace(params.dataset+'!bbox!', '');
          cache[id] = item;
        });
        out.items = features.map(function(id) { return cache[id]; });
        cb(null, out);
      });
    });
  };

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

    var perRequest = Math.ceil((numResults === Infinity ? 500 : numResults * 2) / Object.keys(toSearch).length);

    var opts = {
      toSearch: toSearch,
      perPage: params.perPage,
      concurrency: 10,
      action: action
    };

    manyRequests(opts, function(err, results, next) {
      if (err) return cb(err);

      var left = Object.keys(next).filter(function(id) { return next[id] !== 'done'; });

      if (left.length === 0) next = null;
      cb(null, results, next);
    });
    
    function action (search, start, cb) {
      var req = {
        dataset: dataset,
        search: search,
        start: start,
        limit: perRequest
      };
      api.bboxOne(req, bulkCache, function(err, result) {
        if (err) return cb(err);
        var items = result.items.map(function(item) {
          var featureId = item.id.split('!').slice(2).join('!');
          return {id: dataset+'!bbox!'+featureId, search: 'feature', quadkeys: item.quadkeys};
        });
       cb(null, items, result.next);
      });
    };
  };

  return api;
}
