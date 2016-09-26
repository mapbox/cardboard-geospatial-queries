var tilebelt = require('tilebelt');
var Client = require('./client');
var queue = require('d3-queue').queue;
var polygonToTiles = require('./polygon_to_quadkeys');
module.exports = function(config) {
  var client = Client(config);

  var api = {};

  api.bboxOne = function(params, cb) {
    var start = Date.now();
    client.queryMatch(params, function(err, result) {
      if (err) return cb(err);
      var seen = {};
      var features = result.Items.map(function(item) {
        return item.search.split('!')[1];
      }).filter(function(feature) {
        seen[feature] = (seen[feature] || 0) + 1;
        return seen[feature] === 1;
      });

      if (features.length === 0) return cb(null, {items:[]});

      client.getBatch(params.dataset, features, function(err, items) {
        if (err) return cb(err);
        cb(null, {
          items: items,
          next: result.LastEvaluatedKey
        });
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
    var q = queue();

    toSearch.forEach(function(search, i) {
      q.defer(runner, search, null); 
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

    function runner (search, start, cb) {
      var params = {
        dataset: dataset,
        search: search,
        start: start
      };

      api.bboxOne(params, function(err, result) {
        if (err) return cb(err);
        result.items.forEach(function(item) {
          var featureId = item.id.split('!')[2];
          results.push(featureId);
        });
        if (result.next) return runner(search, result.next, cb);
        return cb();
      });
    };
  };

  return api;
}
