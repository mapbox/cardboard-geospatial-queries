var random = require('@turf/random');
var queue = require('d3-queue').queue;
var should = require('should');
var featureToBBox = require('@turf/bbox');
var db = require('./utils/db');
var CS = require('../');

describe('bbox records', function() {
  before(db.start);
  after(db.stop);
 
  var write = CS.write(db.config);
  var read = CS(db.config);
  
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
      var params = { dataset: 'test', bbox: bbox };
      read.bbox(params, function(err, features) {
        if (err) throw err;
        features.length.should.equal(1);
        features[0].should.have.property('id', 'test!bbox!'+feature.id);
        done();
      });
    });
    
    it('find a polygon bigger than the bbox', function(done) {
      var bbox = featureToBBox(require('./fixtures/city.json'));
      var params = { dataset: 'test', bbox: bbox };
      read.bbox(params, function(err, features) {
        if (err) throw err;
        features.length.should.equal(1);
        features[0].should.have.property('id', 'test!bbox!'+feature.id);
        features[0].should.have.property('search', 'feature');
        done();
      });
    });
    
    it('don\'t find a polygon covered by the tile but not the bbox');
  });
    
  var noDupes = function(features, seen) {
    seen = seen || {};
    for (var i=0; i<features.length; i++) {
      var id = features[i].id;
      seen.should.not.have.property(id);
      seen[id] = 0;
    }
  };

  describe('handle lots of points in the same location', function() {
    var city = featureToBBox(require('./fixtures/city.json'));
    var cityFeature = random('points', 1, {bbox: city}).features[0];
    var numFeatures = 2000;

    before(function(done) {
      this.timeout(300000);
      var json = JSON.stringify(cityFeature);
      var q = queue(10);
      var qks = {};
      var features = [];
      for(var i=0; i<numFeatures; i++) {
        var f = JSON.parse(json); 
        f.id = i.toString(16);
        features.push(f);
      }

      features.forEach(function(f) {
        q.defer(function(d) {
          write('test', null, f, d);
        });
      });
      q.awaitAll(function(err, results) {
        if (err) return done(err);
        results.length.should.equal(numFeatures);
        done();
      });
    });

    after(db.purge);

    it('all in one page', function(done) {
      this.timeout(30000);
      var params = { dataset: 'test', bbox: city }; 
      read.bbox(params, function(err, features) {
        if (err) return done(err);
        noDupes(features);
        features.length.should.equal(numFeatures);
        done();
      });
    });
  });

  describe('handle lots of features', function() {
    var country = featureToBBox(require('./fixtures/country.json'));
    var city = featureToBBox(require('./fixtures/city.json'));
    var cityFeature = random('points', 1, { bbox: city}).features[0];
    cityFeature.id = 'city';
    var anotherCity = featureToBBox(require('./fixtures/another_city.json'));
    var anotherCityFeature = random('points', 1, {bbox: anotherCity}).features[0];
    anotherCityFeature.id = 'another_city';

    before(function(done) {
      var numFeaturesPerType = 100;
      this.timeout(30000);
      var q = queue(10);
      random('points', numFeaturesPerType-2, {
        bbox: country      
      }).features.concat(random('polygons', numFeaturesPerType, {
        bbox: country
      }).features.concat([cityFeature, anotherCityFeature])).forEach(function(f, i) {
        f.id = f.id || i.toString(16);
        q.defer(function(d) {
          write('test', null, f, d);
        });
      });

      q.awaitAll(done);
    });

    after(db.purge);


    it('get them all', function(done) {
      var params = {dataset: 'test', bbox: country };
      read.bbox(params, function(err, features) {
        if (err) return done(err);
        features.length.should.equal(200);
        noDupes(features);
        done();
      });
    });

    it('get a subset of them', function(done) {
      var params = {dataset: 'test', bbox: city}; 

      read.bbox(params, function(err, features) {
        if (err) return done(err);
        noDupes(features);
        var ids = features.map(function(f) { return f.id.replace('test!bbox!', ''); });
        ids.should.containEql('city');
        ids.should.not.containEql('another_city');
        done();
      });
    });
    
    it('paginate through them all', function(done) {
      var params = { dataset: 'test', bbox: country, perPage: 50 };

      var seen = {};
      var count = 0;

      run(null);

      function run(next) {
        params.next = next;
        read.bbox(params, function(err, features, next) {
          noDupes(features, seen);
          count += features.length;

          if (next) {
            return run(next);
          }

          count.should.equal(200);
          done();
        });
      }
    });
  });

  it('find a point');
  it('find a line in the bbox');
  it('find a line that cross the bbox, but with no positions inside');
});
