var write = require('../index').write;
var db = require('./utils/db');
var village = require('./fixtures/village.json');

describe('write records', function() {
  before(db.setup);
  after(db.teardown);
  afterEach(db.purge);

  var handler = write({
    indexUri: db.indexUri
  });

  it('add the village', function(done) {
    handler('test', null, village, function(err) {
      if (err) throw err;
      done();
    });
  });
});
