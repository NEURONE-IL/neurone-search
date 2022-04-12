// SIGUIENTE INTENTO: COPIAR CONFIGS DE OTROS PROYECTOS BACKEND Y HACER PRUEBAS DE A POQUITO








import 'dotenv/config'
import express from 'express';
import mongoose from 'mongoose'; 
import { IndexDocument } from './docDownloader/indexDocInterface';
import { DocumentDownloader } from './docDownloader/documentDownloader';


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


const obj2: IndexDocument = {
  docName: 'wiki-en', 
  url: 'https://en.wikipedia.org/',
  _id: '',
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


// DocumentDownloader.fetch(obj2, (err: unknown, res: any) => { if(!err) console.log('ok2') });

const cosa = new DocumentDownloader();
cosa.testConsoleLog();

const app = express();
const port = process.env.PORT || 3001;
app.get('/', (req, res) => {
    res.send(`This is the neurone-search backend on port ${port}!`);
});
app.listen(port, () => {
  return console.log(`server is listening on ${port}`);
});
