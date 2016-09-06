var request = require('request');

module.exports = function(config) {
  // setups how we interact with ES

  var api = {
    get: function(dataset, feature, cb) {
      request(config.indexUri+dataset+'/'+feature, function(err, resp, body) {
         if (err) return cb(err);
         cb(null, body);
      });
    },
    put: function(searchResult, cb) {
      request({
        uri: config.indexUri+searchResult.dataset+'/'+searchResult.feature,
        method: 'PUT',
        json: searchResult
      }, function(err, resp, body) {
        if (err) return cb(err);
        cb(null, body);
      })
    },
    queryMatch: function(dataset, quadkey, ignore, cb) {
      api.search(dataset, {
        "query": {
          "bool": {
            "must": [
              {
                "match": {
                  "quadkeys": quadkey
                }
              }
            ],
            "must_not": ignore.map(function(key) {
              return {"match": { "quadkeys": key}};
            })
          }
        }
      }, function(err, resp, body) {
        if (err) return cb(err);
        cb(null, body);
      });
    },
    queryMatchPrefix: function(dataset, quadkey, ignore, cb) {
      api.search(dataset, {
        "query": {
          "bool": {
            "must": [
              {
                "match_phrase_prefix": {
                  "quadkeys": quadkey
                }
              }
            ],
            "must_not": ignore.map(function(key) {
              return {"match_phrase_prefix": { "quadkeys": key}};
            })
          }
        }
      }, function(err, resp, body) {
        if (err) return cb(err);
        cb(null, body);
      });
    },
    search: function(dataset, search, cb) {
      request({
        uri: config.indexUri+dataset+'/_search',
        method: 'POST',
        json: search
      }, cb);
    }
  };
  return api;
}
