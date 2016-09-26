var tilebelt = require('tilebelt');
var Client = require('./client');
var queue = require('d3-queue').queue;
var polygonToTiles = require('./polygon_to_quadkeys');
module.exports = function(config) {
  var client = Client(config);

  var api = {};

  api.bboxOne = function(params, ddd) {
    var start = Date.now();
    var qt = null;
    var cb = function(err, result) {
      console.log('-- gt', Date.now() - start, qt);
      ddd(err, result);
    }
    client.queryMatch(params, function(err, result) {
      qt = Date.now() - start;
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

  api.bbox = function(params, ddd) {
    var start = Date.now();
    var cb = function(err, results, next) {
      ddd(err, results, next);
    }
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
      var aMatch = a.indexOf('!') !== -1;
      var bMatch = b.indexOf('!') !== -1;

      if (aMatch && !bMatch) return 1;
      if (bMatch && !aMatch) return -1;

      var aBuffer = new Buffer(a.replace('!', ''), 'utf8');
      var bBuffer = new Buffer(b.replace('!', ''), 'utf8');
      return aBuffer.compare(bBuffer);
    });
    var seenKeys = [];

    var seenBefore = function(item) {
      return item.quadkeys.reduce(function(seen, qk) {
        if (seen) return true;
        qk = qk +'!';
        return seenKeys.reduce(function(match, search) {
          if (match) return true;
          return qk.indexOf(search) === 0;
        }, false);
      }, false);
    };

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
        var sqk = next.start ? next.start.search.split('!')[0] : 'new-page';
        var sfi = next.start ? next.start.search.split('!')[1] : 'new-page';
        items.forEach(function(item) {
          var featureId = item.id.split('!')[2];

          if (seenBefore(item)) return; // skip, we've seen you before

          if (pageBuffer === null) return results.push(item); // first page, can't be a dupe

          // if any of the items quadkeys that match this search apper before
          // the current page than its a duplicate

          var skip = item.quadkeys.filter(function(qk) {
            return qk.indexOf(search) === 0;
          }).reduce(function(skip, qk) {
            if (skip) return true;
            return pageBuffer.compare(new Buffer(qk+'!'+featureId, 'utf8')) !== -1;
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
