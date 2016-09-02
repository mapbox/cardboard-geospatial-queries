var request = require('request');

module.exports = function(config) {
  // setups how we interact with ES

  return {
    put: function(searchResult, cb) {
      request({
        uri: config.indexUri+searchResult.dataset+'/'+searchResult.feature,
        method: 'PUT',
        json: searchResult
      }, function(err, resp, body) {
        if (err) return cb(err);
        cb(null, body);
      })
    }
  }
}
