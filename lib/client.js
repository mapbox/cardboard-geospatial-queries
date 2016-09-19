var queue = require('d3-queue').queue;
var Dyno = require('dyno');

module.exports = function(config) {
  // setups how we interact with ES

  var dyno = Dyno(config);

  var api = {
    queryMatch: function(dataset, quadkey, ignore, cb) {
      dyno.query({
        ExpressionAttributeNames: {
          '#id': 'id',
          '#s': 'search'
        },
        ExpressionAttributeValues: {
          ':id': dataset+'!bbox',
          ':s': quadkey
        },
        KeyConditionExpression: '#id = :id AND begins_with(#s, :s)' 
      }, function(err, items) {
        if (err) return cb(err);
        cb(null, items);
      });
    },
    get: function(dataset, feature, cb) {
      dyno.getItem({ Key: {
        id: dataset+'!bbox!'+feature,
        search: 'feature'
      }}, function(err, data) {
        if (err) return cb(err);
        cb(null, data.Item);
      });
    },
    put: function(searchResult, cb) {
        var q = queue(10);
        q.defer(function(done) {
          dyno.putItem({
            Item: {
              id: searchResult.dataset+'!bbox!'+searchResult.feature,
              search: 'feature',
              quadkeys: searchResult.quadkeys
            }     
          }, done);
        });
        searchResult.quadkeys.forEach(function(qk) {
          q.defer(function(done) {
            dyno.putItem({
              Item: {
                id: searchResult.dataset+'!bbox',
                search: qk+'!'+searchResult.feature
              }     
            }, done);
          });
        });
        q.awaitAll(cb);
    }
  };
  return api;
}
