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
      result.Items.forEach(function(item) {
        q.defer(function(done) {
          client.get(dataset, item.search.split('!')[1], done);     
        });
      });
      q.awaitAll(cb);
    });
  }

  api.bbox = function(dataset, bbox, cb) {
    var quadkeys = polygonToTiles(bbox);

    var toSearch = quadkeys.prefix;

    quadkeys.match.forEach(function(quadkey) {
      toSearch.push(quadkey+'!');
    });

    toSearch.sort(function(a, b) {
       return a.length - b.length;     
    });

    var ignore = {};
    var results = [];
    run(0);

    function run(idx) {
      var search = toSearch[idx];
      if (search === undefined) return cb(null, results);
      api.bboxOne(dataset, search, function(err, items) {
         if (err) return cb(err);
         items.forEach(function(item) {
           var featureId = item.id.split('!')[2];
           if (ignore[featureId]) return;
           var skip = item.quadkeys.forEach(function(skip, qk) {
             if (skip) return true;
             return ignore[qk];
           }, false);
           
           if (skip !== true) {
             ignore[featureId] = true;
             results.push(item);
           }
         });
         ignore[search] = true;
         run(idx+1);
      });
    }
  }

  return api;
}
