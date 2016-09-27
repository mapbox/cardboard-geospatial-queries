var queue = require('d3-queue').queue;
module.exports = function(params, cb) {
  var toSearch = params.toSearch;
  var dataset = params.dataset;
  var perRequest = params.perRequest;
  var client = params.client;

  var q = queue();
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
  });
  
  var results = [];
  var count = 0;
  var pending = [];
  var running = false;
  var push = function(items, cb) {
    if (items && items.length === 0) return cb(null, true);
    if (items) pending.push([items, cb]);
    
    if (running || pending.length === 0) return;
    
    if (pending.length && count > params.perPage) return pending.forEach(function(job) {
      job[1](null, false);     
    });

    running = true;
    var toRun = pending;
    pending = [];

    var features = toRun.reduce(function(memo, job) {
      job[0].forEach(function(feature) {
        if (memo.indexOf(feature) === -1) memo.push(feature);     
      });
      return memo;
    }, []);

    client.getBatch(dataset, features, function(err, items) {
      if (err) return toRun.forEach(function(job) { job[1](err); });     
      items.filter(function(item) {
        var feature = item.id.split('!').slice(2).join('!');
        return item.quadkeys.every(function(qk) {
          return after.every(function(fn) {
            return fn(qk, feature);     
          });
        });
      }).forEach(function(item) {
        count++;
        results.push(item);
      });
      toRun.forEach(function(job) { job[1](null, true); });
      running = false;
      push();
    });
  }

  q.awaitAll(function(err) {
    if (err) return cb(err);
    cb(null, results, toSearch);
  });

  function runner(search, cb) {
    if (count >= params.perPage || toSearch[search] === 'done') return cb();
    var req = {
      dataset: dataset,
      search: search,
      start: toSearch[search],
      limit: perRequest
    };
    searcher(client, req, function(err, result) {
      if (err) return cb(err);
      push(result.items, function(err, added) {
        if (err) return cb(err);
        if (added === false) return cb();
        toSearch[search] = result.next || 'done';
        runner(search, cb);
      });
    });        
  }
}

function searcher(client, params, cb) {
  client.queryMatch(params, function(err, result) {
    if (err) return cb(err);
    var seen = {};
    var features = result.Items.map(function(item) {
      return item.search.split('!').slice(1).join('!');
    }).filter(function(feature) {
      seen[feature] = (seen[feature] || 0) + 1;
      return seen[feature] === 1;
    });

    return cb(null, {
      items: features,
      next: result.LastEvaluatedKey
    });
  });
};
