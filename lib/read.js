var tilebelt = require('tilebelt');
var tilecover = require('tile-cover');
var Client = require('./client');
var queue = require('d3-queue').queue;
var polygonToTiles = require('./polygon_to_quadkeys');
module.exports = function(config) {
  var client = Client(config);

  var api = {};
 
  api.bboxOne = function(params, cb) {
    client.queryMatch(params, function(err, result) {
      if (err) return cb(err);
      var q = queue(10);
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
      var params = {
        dataset: dataset,
        search: search,
        start: next.start,
        limit: perPage !== Infinity ? perPage : 1000
      };
      api.bboxOne(params, function(err, result) {
        if (err) return cb(err);
        var items = result.items;
        var pageBuffer = next.start ? new Buffer(next.start.search, 'utf8') : null;
        items.forEach(function(item) {
          var featureId = item.id.split('!')[2];
          var skip = item.quadkeys.reduce(function(skip, qk) {
            if (skip) return true;
            //console.log(pageBuffer ? next.start.search : 'new-page', qk+'!'+featureId, pageBuffer ? pageBuffer.compare(new Buffer(qk+'!'+featureId, 'utf8')) : 'new-page');
            if (search.indexOf('!') === -1 && pageBuffer && pageBuffer.compare(new Buffer(qk+'!'+featureId, 'utf8')) !== -1) return true;
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
         if (result.next) {
           next.start = result.next;
         }
         else {
           seenKeys.push(search);
           next.idx++;
           next.start = null;
         }
         run();
      });
    }
  }

  return api;
}
