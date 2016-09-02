var featureToSearchResult = require('./feature_to_search_result');

module.exports = function(client, dataset, feature, cb) {
  var searchResult = featureToSearchResult(dataset, feature);
  client.put(searchResult, function(err) {
    if (err) return cb(err);
    cb(null, searchResult);
  });
}
