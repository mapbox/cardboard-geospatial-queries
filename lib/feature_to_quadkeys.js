var tilebelt = require('tilebelt');
var extent = require('geojson-extent');
var buffer = require('@turf/buffer');
var intersect = require('@turf/intersect');

module.exports = function (obj, maxTiles) {
  var bbox = extent(obj);
  var startTile = tilebelt.bboxToTile(bbox);

  var target = obj.geometry.type.indexOf('Polygon') !== -1 ? obj : buffer(obj, .001, 'miles');

  var tiles = [startTile];

  while(tiles.length < maxTiles) {
    if (tiles[0][2] === 20) break; //dont go below zoom 20
    
    var startTile = tiles.splice(0,1);

    tilebelt.getChildren(startTile).filter(function(tile) {
       var geojson = tilebelt.tileToGeoJSON(tile);
       return intersect(target, geojson);
    }).forEach(function(tile) {
        tiles.push(tile);
    });
  }

  return tiles.map(function(tile) {
    return tilebelt.tileToQuadkey(tile);
  });
}
