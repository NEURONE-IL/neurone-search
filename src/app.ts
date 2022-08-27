import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';

const app = express();
const port = process.env.PORT || 3001;
app.use(express.urlencoded({extended: true})); // Parse URL-encoded bodies
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS" );
  next();
});

import download from './routes/download.js';
import search from './routes/search.js';

app.use(download);
app.use(search);

// expose in the localhost router to see files in browser
app.use(express.static('assets'));

// Connect URL
const url = process.env.DB || 'mongodb://127.0.0.1:27017/test';

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