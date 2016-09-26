var simplify = require('simplify-geojson');
var tilebelt = require('tilebelt');
var extent = require('geojson-extent');
var buffer = require('@turf/buffer');
var intersect = require('@turf/intersect');

module.exports = function (obj, maxTiles) {
  var size = JSON.stringify(obj.geometry).length;
  var bbox = extent(obj);
  var startTile = tilebelt.bboxToTile(bbox);
  while(startTile[2] > 20) {
    startTile = tilebelt.getParent(startTile);
  }
  if (obj.geometry === undefined || obj.geometry === null) throw new Error('Invalid feature, no geometry');

  var targets = obj.geometry.type.indexOf('Multi') !== 0 ? [obj.geometry] : obj.geometry.coordinates.map(function(coord) {
    return {
      coordinates: coord,
      type: obj.geometry.type.replace('Multi', '')
    };
  });
  targets = targets.map(function(geo) {
    var f = {
      type : 'Feature',
      geometry: geo,
      properties: {}
    };
    if (geo.type !== 'Point' && size / 10000 > 1) f = simplify(f, .001);      
    try {
      return  geo.type === 'Polygon' ? f : buffer(f, .001, 'miles');
    }
    catch (err) {
      throw new Error('Invalid GeoJSON');
    };
  })
  var tiles = [startTile];
  while(tiles.length < maxTiles) {
    if (tiles[0][2] >= 20) break; //dont go below zoom 20

    var startTile = tiles.splice(0,1)[0];
    var matchingTiles = 0;
    tilebelt.getChildren(startTile).filter(function(tile) {
       var geojson = tilebelt.tileToGeoJSON(tile);
       return targets.reduce(function(match, target) {
         if (match) return true;
         try {
           return intersect(target, geojson);
         }
         catch (err) {
           throw new Error('Failed to intersect');
         }
       }, false);
    }).forEach(function(tile) {
        matchingTiles++;
        tiles.push(tile);
    });

    if (matchingTiles === 0 && tiles.length === 0) {
        throw new Error('No matching tiles');
    }
    
  }
  return tiles.map(function(tile) {
    return tilebelt.tileToQuadkey(tile);
  });
};

