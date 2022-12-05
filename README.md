# About

Neurone-Search is a node project that is part of the NEURONE Framewok. It serves as part of the back-end that provides a REST API for To connect to the supported search platform, download webpages, index them, and make search queries on those webpages. For more inforation see https://github.com/NEURONE-IL/neurone-core

To read the local API docs, check `http://localhost:3001/api-docs/` while the back-end is running, note that the port can be changed using env variables.

# Running the back-end

* Install the dependencies with `npm install`
* Run in dev mode with `npm run dev:server`
* Build in productin mode with `npm run build`
* Run in production mode with `npm run start`

# Env variables
```js
PORT: 3001 // port of the localhost
DB: "mongodb://127.0.0.1:27017/neurone", // url to the Mongo database, this example is the default local database

NEURONE_SEARCH_ENGINE: "solr", // search engine/platform to be used, currently solr is supported
ENABLE_CUSTOM_AD_SORT: "true", // moves the first relevant result down, in a attempt to simulate ads in a real search engine

NEURONE_SOLR_HOST: "localhost", // base url to solr
NEURONE_SOLR_PORT: "8983", // solr port number
NEURONE_SOLR_CORE: "neurone" // name of the solr core
```