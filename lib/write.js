var Client = require('./client');
var add = require('./add');
var update = require('./update');
var remove = require('./remove');

module.exports = function(config) {
  var client = Client(config);
  return function(dataset, oldFeature, newFeature, cb) {
    if (oldFeature && newFeature) return update(client, dataset, oldFeature, newFeature, cb);
    if (oldFeature) return remove(client, dataset, oldFeature, cb);
    if (newFeature) return add(client, dataset, newFeature, cb);
  }
}
