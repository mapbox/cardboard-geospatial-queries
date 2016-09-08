var featureToQuadkeys = require('./feature_to_quadkeys');
var toBBox = require('@turf/bbox');

module.exports = function(dataset, feature) {
  var bbox = toBBox(feature).map(function(num) { return Math.abs(num); });
  if (bbox[0] > 180 || bbox[2] > 180 || bbox[1] > 90 || bbox[3] > 90) {
    return {
        dataset: dataset,
        feature: feature.id,
        quadkeys: []
    }
  }

  if (feature.geometry.type === 'Polygon') {
    var numPos = Object.keys(feature.geometry.coordinates.reduce(function(memo, coord) {
      function parse(coord) {
        if (typeof coord[0] === 'number') {
          memo[coord.join('|')] = 1;
        }
        else {
          coord.forEach(parse);
        }
      };

      parse(coord);
      return memo;
    }, {})).length;
    if (numPos === 1) {
      feature.geometry = {
        type: 'Point',
        coordinates: feature.geometry.coordinates[0][0]
      };
    }
  }

  return {
    dataset: dataset,
    feature: feature.id,
    quadkeys: featureToQuadkeys(feature)
  }
}
