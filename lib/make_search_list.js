var tilebelt = require('tilebelt');

module.exports = function(bbox) {

  var epsilon = 1E-8;

  var bboxes = [bbox];

  for (var i=0; i<bboxes.length; i++) {
    var bbox = bboxes[i];
    var splitBoxes = [];
    if (bbox[0] <= -180 && bbox[2] >= -180) {
      splitBoxes.push([-180 + epsilon, bbox[1], bbox[2], bbox[3]]);
      bbox = [bbox[0], bbox[1], -180 - epsilon, bbox[3]];
    }

    if (bbox[0] <= 180 && bbox[2] >= 180) {
      splitBoxes.push([180 + epsilon, bbox[1], bbox[2], bbox[3]]);
      bbox = [bbox[0], bbox[1], 180 - epsilon, bbox[3]];
    }

    if (bbox[0] <= 0 && bbox[2] >= 0) {
      splitBoxes.push([epsilon, bbox[1], bbox[2], bbox[3]]);
      bbox = [bbox[0], bbox[1], -epsilon, bbox[3]]
    }

    if (bbox[1] <= 0 && bbox[3] >= 0) {
      splitBoxes.push([bbox[0], epsilon, bbox[2], bbox[3]]);
      bbox = [bbox[0], bbox[1], bbox[2], -epsilon];
    }

    var args = [i, 1, bbox].concat(splitBoxes);
    bboxes.splice.apply(bboxes, args);
  }

  console.log('num bbox', bbox.length);

  var tiles = bboxes.map(function(bbox) {
    return tilebelt.bboxToTile(bbox);
  });

  var hasBeenFound = {};
  var matchTiles = tiles.map(function(tile) {
    return tilebelt.getParent(tile);
  }).filter(function(tile) {
    var quadKey = tilebelt.tileToQuadkey(tile);
    var found = hasBeenFound[quadKey] || false;
    hasBeenFound[quadKey] = true;
    return !found;
  });


  for(var i=0; i<matchTiles.length; i++) {
    var tile = matchTiles[i];
    var parent = tilebelt.getParent(tile);
    if (parent[2] > 0) {
      var quadKey = tilebelt.tileToQuadkey(parent);
      var found = hasBeenFound[quadKey] || false;
      hasBeenFound[quadKey] = true;
      if (!found) {
        matchTiles.push(parent);
      }
    }
  }

  return {
    prefix: tiles.map(function(tile) { return tilebelt.tileToQuadkey(tile); }),
    match: matchTiles.map(function(tile) { return tilebelt.tileToQuadkey(tile); })
  }
}
