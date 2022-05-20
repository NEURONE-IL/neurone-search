import express from 'express';
import { DocumentDownloader } from '../docDownloader/documentDownloader';
import { IndexDocument } from '../docDownloader/indexDocInterface';
import Indexer from '../docDownloader/indexer';


const router = express.Router();

// execute search query
router.get('/search', (req, res) => {
  console.log("DOCUMENT RETRIEVAL WIP");
  res.status(200);
});


export default router;