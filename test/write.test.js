var intersect = require('@turf/intersect');
var should = require('should');
var tilebelt = require('tilebelt');

var write = require('../index').write;
var db = require('./utils/db');
var Client = require('../lib/client');
describe('write records', function() {
  before(db.setup);
  after(db.teardown);
  afterEach(db.purge);

  var handler = write({
    indexUri: db.indexUri
  });

  var client = Client({
    indexUri: db.indexUri
  });

  var addTest = function(feature, done) {
    handler('test', null, feature, function(err) {
      if (err) throw err;
      client.get('test', feature.id, function(err, json) {
         if (err) throw err;
         var data = JSON.parse(json);
         data.should.have.property('found', true);
         data.should.have.property('_source');
         data._source.should.have.property('quadkeys');
         data._source.quadkeys.forEach(function(quadkey) {
             var bbox = tilebelt.tileToGeoJSON(tilebelt.quadkeyToTile(quadkey));
             var intersection = intersect(feature, bbox);
             if (intersection === undefined) throw new Error('Invalid quadkey');
         });
         done();
      });
    });
  }

  it('add the village', function(done) {
    addTest(require('./fixtures/village.json'), done);
  });

  it('add the block', function(done) {
    addTest(require('./fixtures/block.json'), done);
  });

  it('add the building', function(done) {
    addTest(require('./fixtures/building.json'), done);
  });

  it('add the city', function(done) {
    addTest(require('./fixtures/city.json'), done);
  });

  it('add the country', function(done) {
    addTest(require('./fixtures/country.json'), done);
  });

  it('add the point', function(done) {
    addTest(require('./fixtures/point.json'), done);
  });

  it('add the road', function(done) {
    addTest(require('./fixtures/road.json'), done);
  });

  it('add the state', function(done) {
    addTest(require('./fixtures/state.json'), done);
  });
});
