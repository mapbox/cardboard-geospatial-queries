var tilebelt = require('tilebelt');
var tilecover = require('tile-cover');
var Client = require('./client');
var queue = require('d3-queue').queue;
var polygonToTiles = require('./polygon_to_quadkeys');
module.exports = function(config) {
  var client = Client(config);

  var api = {};
 
  api.bboxOne = function(dataset, search, cb) {
    client.queryMatch(dataset, search, [], function(err, result) {
      if (err) return cb(err);
      var q = queue(10);
      var seen = {};
      result.Items.forEach(function(item) {
        var feature = item.search.split('!')[1];
        if (seen[feature]) return;
        seen[feature] = true;
        q.defer(function(done) {
          client.get(dataset, feature, done);     
        });
      });
      q.awaitAll(cb);
    });
  }

  api.bbox = function(params, cb) {
    var bbox = params.bbox;
    var dataset = params.dataset;
    var perPage = params.perPage || Infinity;
    var next = params.next || {};

    var quadkeys = polygonToTiles(bbox);

    var toSearch = quadkeys.prefix;

    quadkeys.match.forEach(function(quadkey) {
      toSearch.push(quadkey+'!');
    });

    toSearch.sort(function(a, b) {
      if (a === b) {
        return parseInt(a[a.length-1]) - parseInt(b[b.length-1]);
      }
      return a.length - b.length;     
    });


    var seenKeys = [];
    var results = [];
    next.idx = next.idx || 0;
    for (var i=0; i<next.idx; i++) {
      seenKeys.push(toSearch[i]);
    }
    run();

    function run() {
      var search = toSearch[next.idx];
      if (search === undefined) return cb(null, results);
      if (results.length >= perPage) {
        return cb(null, results, next);
      }
      api.bboxOne(dataset, search, function(err, items) {
        if (err) return cb(err);
        items.forEach(function(item) {
          var featureId = item.id.split('!')[2];
          var skip = seenKeys.reduce(function(skip, key) {
            if (skip) return true;
            var isPrefix = key.indexOf('!') === -1;
            return item.quadkeys.reduce(function(seen, qk) {
              if (seen) return true;
              if (isPrefix) {
                return qk.indexOf(key) === 0;
              }
              else {
                return qk === key;
              }
            }, false);
          }, false);
          var skip = item.quadkeys.reduce(function(skip, qk) {
            if (skip) return true;
            return seenKeys.reduce(function(seen, key) {
              if (seen) return true;
               seen = seen || key === qk+'!' || qk.indexOf(key) === 0;
               return seen;
             }, false);
           }, false);
           
           if (skip !== true) {
             results.push(item);
           }
         });
         seenKeys.push(search);
         next.idx++;
         run();
      });
    }
  }

  return api;
}
