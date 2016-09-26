var queue = require('d3-queue').queue;
var Dyno = require('dyno');

module.exports = function(config) {
  // setups how we interact with ES

  var dyno = Dyno(config);

  var capacity = {
    read: [],
    write: [],
    clear: function() {
      capacity.read = [];
      capacity.write = [];
    },
    get: function(type) {
      var after = Date.now() - 1000;
      capacity[type] = capacity[type].filter(function(item) {
         return item[0] > after;     
      });

      return capacity[type].reduce(function(count, item) {
        return count + item[1];   
      }, 0);
    },
    add: function(type, result) {
      if (result.ConsumedCapacity === undefined) throw new Error('no ConsumedCapacity');
      capacity[type].push([Date.now(), result.ConsumedCapacity.CapacityUnits]);
    }
  }

  var api = {
    capacity: capacity,
    queryMatch: function(params, cb) {
      var opts = {
        ReturnConsumedCapacity: 'TOTAL',
        Limit: params.limit || 1000,
        ExpressionAttributeNames: {
          '#id': 'id',
          '#s': 'search'
        },
        ExpressionAttributeValues: {
          ':id': params.dataset+'!bbox',
          ':s': params.search
        },
        KeyConditionExpression: '#id = :id AND begins_with(#s, :s)' 
      };
      if (params.start) opts.ExclusiveStartKey = params.start;

      dyno.query(opts, function(err, result) {
        if (err) return cb(err);
        capacity.add('read', result);
        cb(null, result);
      });
    },
    getBatch: function(dataset, features, cb) {
      var keys = features.map(function(feature) {
        return {
          id: dataset+'!bbox!'+feature,
          search: 'feature'
        };
      });

      var params = { RequestItems: {} };
      params.RequestItems[config.table] = { Keys: keys };
      params.ReturnConsumedCapacity = 'TOTAL'; 
      dyno.batchGetAll(params, 3).sendAll(10, function(err, result) {
        if (err) return cb(err);
        //capacity.add('read', result);
        if (result.UnprocessedKeys && result.UnprocessedKeys.length) return cb(new Error('Failed to process all items'));
        cb(null, result.Responses[config.table]);
      });
    },
    get: function(dataset, feature, cb) {
      dyno.getItem({ ReturnConsumedCapacity: 'TOTAL', Key: {
        id: dataset+'!bbox!'+feature,
        search: 'feature'
      }}, function(err, data) {
        if (err) return cb(err);
        capacity.add('read', data);
        cb(null, data.Item);
      });
    },
    getQuadkey: function(dataset, feature, qk, cb) {
      dyno.getItem({
        ReturnConsumedCapacity: 'TOTAL',
        Key: {
          id: dataset+'!bbox',
          search: qk+'!'+feature
        }
      }, function(err, data) {
        if (err) return cb(err);
        capacity.add('read', result);
        cb(null, data.Item);
      });
    },
    put: function(searchResult, cb) {
        var q = queue(config.concurrency || 10);
        q.defer(function(done) {
          dyno.putItem({
            ReturnConsumedCapacity: 'TOTAL',
            Item: {
              id: searchResult.dataset+'!bbox!'+searchResult.feature,
              search: 'feature',
              quadkeys: searchResult.quadkeys
            }     
          }, function(err, result) {
            if (err) return done(err);
            capacity.add('write', result);
            done(null, result);
          });
        });
        searchResult.quadkeys.forEach(function(qk) {
          q.defer(function(done) {
            dyno.putItem({
              ReturnConsumedCapacity: 'TOTAL',
              Item: {
                id: searchResult.dataset+'!bbox',
                search: qk+'!'+searchResult.feature
              }     
            }, function(err, result) {
              if (err) return done(err);
              capacity.add('write', result);
              done(null, result);
            });
          });
        });
        q.awaitAll(cb);
    }
  };
  return api;
}
