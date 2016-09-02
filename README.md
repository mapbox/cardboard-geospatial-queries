# Cardboard Search

This is a proof of concept. It might be a bad idea.

This is a search utility for [cardboard](https://github.com/mapbox/cardboard). It works by creating a derivative record for each feature added to cardboard and stores those records in an Elastic Search dataset. This utility also exposes an API to query feature ids out of Elastic Search to be used to retrieve features from the main cardboard table.

## API

**CardboardSearch(config)** - creates a search client.

**SearchClient.bbox([west, south, east, north])** - gets a list of feature ids that are covered by the bbox.

**CardboardSearch.write(config)** creates the write client.

**WriteClient(oldFeature, newFeature, callback)** - adds, updates or removes a feature from ES. This is designed to work with LambdaStreams.
