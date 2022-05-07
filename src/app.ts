import 'dotenv/config'
import express from 'express';
import mongoose from 'mongoose';

import { IndexDocument } from './docDownloader/indexDocInterface';
import { DocumentDownloader } from './docDownloader/documentDownloader';

const app = express();
const port = process.env.PORT || 3001;
app.use(express.urlencoded({extended: true})); // Parse URL-encoded bodies
app.use(express.json()); // TODO: add form data support
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS" )
    next();
});

import download from './routes/download';
import SolrIndex from './docDownloader/indexes/solrIndex';
app.use(download);

/*
// Load dependency
import solr = require('solr-client');

// Create a client
const client = solr.createClient();

// Add a new document
client.add({ id : 12, title_t : 'Hello' })
.then((obj:any) => {console.log('Solr response:', obj)});
*/

// Connect URL
const url = 'mongodb://127.0.0.1:27017/test';

const options = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

function connectToDB(){
  // Connect to MongoDB
  mongoose.connect(url, options, async (err) => {

    if (err) {
      console.error(err);
    } else {
      console.log(`MongoDB Connected: ${url}`);
    }
  });
}

mongoose.connection.on('error', err => {
  console.error(err);
  console.log("Retrying connection with database...");
  connectToDB();
});

connectToDB(); 

/*
example of use in api
const obj2: IndexDocument = {
  docName: 'wiki-en', 
  url: 'https://en.wikipedia.org/',
  //_id: '1234',
  title: '',
  locale: '',
  task: [],
  domain: [],
  keywords: [],
  date: '',
  maskedUrl: '',
  searchSnippet: [],
  indexedBody: '',
  route: '',
  hash: ''
};

DocumentDownloader.fetch(obj2, (err: unknown, res: any) => { if(!err) console.log('ok2'); else {console.error("ERROR: \n" + err)} });
*/

app.get('/', (req, res) => {
    res.send(`This is the neurone-search backend on port ${port}!`);
});
app.listen(port, () => {
  return console.log(`server is listening on ${port}`);
});




// SOLR CLIENT TEST
SolrIndex.generate();