var tilebelt = require('tilebelt');
var extent = require('geojson-extent');
var tilecover = require('tile-cover');

module.exports = function(obj) {

  var bbox = extent(obj);

  var tile = tilebelt.bboxToTile(bbox);

  var baseZoom = tile[2];

  if (baseZoom > 15) {
    baseZoom = 15;
  }

  var limit = {
    min_zoom: baseZoom,
    max_zoom: baseZoom + 5
  };

  return tilecover.indexes(obj.geometry, limit);

};
