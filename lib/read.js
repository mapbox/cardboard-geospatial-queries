var tilebelt = require('tilebelt');
var tilecover = require('tile-cover');
var Client = require('./client');
var queue = require('d3-queue').queue;
var polygonToTiles = require('./polygon_to_quadkeys');
module.exports = function(config) {
  var client = Client(config);

  var api = {};
  
  api.bbox = function(dataset, bbox, cb) {
    var quadkeys = polygonToTiles(bbox);

    var ignore = [];
    var results = [];

    var q = queue(10);

    var count = 0;
    quadkeys.prefix.forEach(function(quadkey) {
      q.defer(client.queryMatchPrefix, dataset, quadkey, [].concat(ignore));
      ignore.push(quadkey);
      count++;
    });

    quadkeys.match.forEach(function(quadkey) {
      q.defer(client.queryMatch, dataset, quadkey, [].concat(ignore));
      count++;
      ignore.push(quadkey);
    });

    q.awaitAll(function(err, results) {
      if (err) return cb(err);
      var hits = results.reduce(function(hits, result) {
         return hits.concat(result.hits.hits);
      }, []);
      cb(null, hits);
    })
  }

  return api;
}
