var indexUri = 'http://localhost:9200/features/';
var request = require('request');

var DB = module.exports = {
  setup: function(cb) {
    request({
      uri: indexUri,
      method: 'POST'
    }, cb);
  },
  teardown: function(cb) {
    request({
      uri: indexUri,
      method: 'DELETE'
    }, cb);
  },
  purge: function(cb) {
    DB.teardown(function(err) {
      if (err) return cb(err);
      DB.setup(cb);
    });
  },
  indexUri: indexUri
}
