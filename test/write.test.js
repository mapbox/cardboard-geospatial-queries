var queue = require('d3-queue').queue;
var intersect = require('@turf/intersect');
var should = require('should');
var tilebelt = require('tilebelt');

var write = require('../index').write;
var db = require('./utils/db');
var Client = require('../lib/client');
describe('write records', function() {
  before(db.start);
  after(db.stop);
  afterEach(db.purge);

  var handler = write(db.config);

  var client = Client(db.config);

  var addTest = function(feature, done) {
    handler('test', null, feature, function(err) {
      if (err) throw err;
      client.get('test', feature.id, function(err, json) {
         if (err) throw err;
         json.should.have.property('quadkeys');
         json.should.have.property('id', 'test!bbox!'+feature.id);
         json.should.have.property('search', 'feature');
         var q = queue(10);
         json.quadkeys.forEach(function(quadkey) {
             var bbox = tilebelt.tileToGeoJSON(tilebelt.quadkeyToTile(quadkey));
             var intersection = intersect(feature, bbox);
             if (intersection === undefined) throw new Error('Invalid quadkey');
             q.defer(function(done) {
                 db.dyno.getItem({
                     Key: {
                         id: 'test!bbox',
                         search: quadkey+'!'+feature.id
                     }
                 }, done);
             });
         });
         q.awaitAll(function(err, data) {
             if (err) return done(err);
             data.forEach(function(item) {
                item.should.have.property('Item');     
             });
             done();
         })
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
