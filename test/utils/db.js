var queue = require('d3-queue').queue;
var Dyno = require('dyno');
var dynalite = require('dynalite');
var table = require('../../table.json');

var config = {
  table: 'cardboard-search',
  region: 'test',
  endpoint: 'http://localhost:4567'
};

var dyno = Dyno(config);

var server = null;

var DB = module.exports = {
  start: function(cb) {
    if (server) return DB.teardown(cb);

    server = dynalite({path: './server'});
    server.listen(4567, function(err) {
      if (err) return cb(err);
      dyno.createTable(table, cb);
    });
  },
  stop: function(cb) {
    server.close(cb);               
  },
  purge: function(cb) {
    var stream = dyno.scanStream({TableName: table.TableName});
    var q = queue(10);
    stream.on('data', function(data) {
      q.defer(function(done) {
        dyno.deleteItem({
          Key: {
            id: data.id,
            search: data.search
          }
        }, done);
      });
    });
    stream.on('end', function() {
        q.awaitAll(cb);
    });
  },
  dyno: dyno,
  config: config
}
