import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';

import SolrIndex from './documentIndexer/indexes/solrIndex';
import Indexer from './documentIndexer/indexer';
import { IndexDocument } from './interfaces/indexDocInterface';
import { DocumentDownloader } from './docDownloader/documentDownloader';
import DocumentRetrieval from './documentIndexer/documentRetrieval';

const app = express();
const port = process.env.PORT || 3001;
app.use(express.urlencoded({extended: true})); // Parse URL-encoded bodies
app.use(express.json()); // TODO: add form data support
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS" );
  next();
});

import download from './routes/download';
import search from './routes/search';

app.use(download);
app.use(search);

// expose in the localhost router to see files in browser
app.use(express.static('assets'));

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

app.get('/', (req, res) => {
    res.send(`This is the neurone-search backend on port ${port}!`);
});
app.listen(port, () => {
  return console.log(`server is listening on ${port}`);
});


// DOC DOWNLOADER TEST
/*
//example of use in api
const obj2: IndexDocument = {
  docName: 'speedrun', 
  url: 'https://www.speedrun.com/',
  //_id: '1234',
  title: 'speedrun dot com',
  locale: 'en',
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

DocumentDownloader.fetch(obj2, (err: unknown, res: any) => { 
  if(!err) {
    console.log('TEST ok');
    SolrIndex.searchDocuments({query: "github"}).then((q: any)=>{
      console.log(q);
      console.log("DONE.");
    });
  }
  else {
    console.error("ERROR: \n", err)
  }
});
*/


//Indexer.generateDocumentCollection('test/test'); //TODO: this does nothing?????????
/*
// SOLR CLIENT TEST
try{
  //SolrIndex.generate();
  //SolrIndex.searchDocuments({query: 'value'});
  SolrIndex.index({
    docName: "TEST",
    title: "title",
    locale: "en",
    date: "today?",
    task: [''],
    domain: [''],
    keywords: ['key'],
    url: 'url',
    maskedUrl: 'url(masked)',
    searchSnippet: ['Hello'],
    indexedBody: 'hola este es un ejemplo',
    route: '',
    hash: ''
  })
} catch (err) {
  console.error(err);
}*/

/*
try {
  SolrIndex.searchDocuments({query: 'value'}).then((doc:any) => {
    console.log("\n\nRESPONSE:\n\n");
    console.log(doc);
  });
} catch (err) {
  console.error(err);
}
*/
/*
SolrIndex.searchAllDocuments().then((alldocs) => {
  console.log(alldocs?.response.docs);
})
*/

//SolrIndex.searchAllDocuments().then((res:any) => {console.log(res.response.docs)});

/*
DocumentRetrieval.getDocument("api-test-ps4", (error: any, doc: any) => {
  console.log("\n\nDONE\n\n");
  console.log(doc);
})*/
/*
DocumentRetrieval.searchDocument({query: "asd"});
*/