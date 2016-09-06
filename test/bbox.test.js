var should = require('should');
var featureToBBox = require('@turf/bbox');
var db = require('./utils/db');
var CS = require('../');

describe('bbox records', function() {
  before(db.setup);
  after(db.teardown);
 
  var write = CS.write({ indexUri: db.indexUri });
  var read = CS({ indexUri: db.indexUri });
  
  describe('polygon tests', function() {
    var feature = require('./fixtures/state.json');
    
    before(function(done) {
      write('test', null, feature, function(err) {
        if (err) throw err;
        setTimeout(done, 1000);
      });
    });     
    
    after(db.purge);

    it('find a polygon smaller than the bbox', function(done) {
      var bbox = featureToBBox(require('./fixtures/country.json'));
      read.bbox('test', bbox, function(err, features) {
        if (err) throw err;
        features.should.have.property('length', 1);
        features[0]._source.should.have.property('dataset', 'test');
        features[0]._source.should.have.property('feature', feature.id);
        done();
      });
    });
    
    it('find a polygon bigger than the bbox', function(done) {
      var bbox = featureToBBox(require('./fixtures/city.json'));
      read.bbox('test', bbox, function(err, features) {
        if (err) throw err;
        features.should.have.property('length', 1);
        features[0]._source.should.have.property('dataset', 'test');
        features[0]._source.should.have.property('feature', feature.id);
        done();
      });
    });
    
    it('don\'t find a polygon covered by the tile but not the bbox');
  });

  it('find a point');
  it('find a line in the bbox');
  it('find a line that cross the bbox, but with no positions inside');
});
