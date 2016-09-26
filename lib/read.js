var tilebelt = require('tilebelt');
var Client = require('./client');
var queue = require('d3-queue').queue;
var polygonToTiles = require('./polygon_to_quadkeys');
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

    var quadkeys = polygonToTiles(bbox);

    var toSearch = quadkeys.prefix.concat(quadkeys.match.map(function(qk) { return qk+'!'; }));

    var results = [];
    var bulkCache = {};
    var q = queue();

    var limit = Math.ceil(500 / toSearch.length);

    toSearch.forEach(function(search, i) {
      q.defer(runner, search, limit, null); 
    });

    q.awaitAll(function(err) {
        if (err) return cb(err);
        cb(null, results.reduce(function(memo, id) {
          memo[0][id] = 1;
          return memo;
        }, [{}]).reduce(function(memo, v) { return Object.keys(v); }, []).map(function(id) {
          return {
            id: dataset+'!bbox!'+id,
            search: 'feature'
          }
        }));
    });

    function runner (search, limit, start, cb) {
      var params = {
        dataset: dataset,
        search: search,
        start: start,
        limit: limit
      };

      api.bboxOne(params, bulkCache, function(err, result) {
        if (err) return cb(err);
        console.log('next', result.next);
        result.items.forEach(function(item) {
          var featureId = item.id.split('!').slice(2).join('!');
          results.push(featureId);
        });
        if (result.next) return runner(search, limit, result.next, cb);
        return cb();
      });
    };
  };

  return api;
}
