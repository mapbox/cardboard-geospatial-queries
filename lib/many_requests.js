var queue = require('d3-queue').queue;
module.exports = function(params, cb) {
  var toSearch = params.toSearch;

  var results = {};
  var count = 0;
  
  var q = queue(params.concurrency);
  Object.keys(toSearch).forEach(function(search) {
    q.defer(function(cb) {
        runner(search, cb);
    });
  });

  var after = Object.keys(toSearch).map(function(search) {
    return function(quadkey, feature) {
      if (toSearch[search] === null) return true;
      var target = quadkey+'!'+feature;
      if (target.indexOf(search) !== 0) return true;
      if (toSearch[search] === 'done') return false;
      var targetBuffer = new Buffer(target, 'utf8');
      var searchBuffer = new Buffer(toSearch[search].search, 'utf8');
      return targetBuffer.compare(searchBuffer) === 1;
    };
  })

  q.awaitAll(function(err) {
    if (err) return cb(err);
    var items = Object.keys(results).map(function(id) {
        return results[id];
    });
    cb(null, items, toSearch);
  });

  function runner(search, cb) {
    if (count >= params.perPage || toSearch[search] === 'done') return cb();
    params.action(search, toSearch[search], function(err, items, page) {
      if (err) return cb(err);
      items.filter(function(item) {
        return item.quadkeys.every(function(qk) {
          return after.every(function(fn) {
            return fn(qk, item.id.split('!').slice(2).join('!'));
          })
        }) 
      }).forEach(function(item) {
        if (results[item.id] === undefined) {
          results[item.id] = item;
          count++;
        }
      });
      toSearch[search] = page || 'done';
      runner(search, cb);
    });        
  }

}
