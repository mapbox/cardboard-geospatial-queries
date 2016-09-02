var featureToQuadkeys = require('./feature_to_quadkeys');

module.exports = function(dataset, feature) {
  return {
    dataset: dataset,
    feature: feature.id,
    quadkeys: featureToQuadkeys(feature)
  }
}
