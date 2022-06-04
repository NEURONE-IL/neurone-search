import express from 'express';
import DocumentRetrieval from '../documentIndexer/documentRetrieval';
import { QueryObject } from '../interfaces/queryInterface';


const router = express.Router();

// execute search query
router.get('/search/:query', async (req, res) => {
  try {

    const query: QueryObject = {
      query: req.params.query,
      locale: req.body.locale ? req.body.locale : null,
      task: req.body.task ? req.body.task : null,
      domain: req.body.domain ? req.body.domain : null
    }

    const response = await DocumentRetrieval.searchDocument(query);
    // trim indexed body to save bandwidth, it's a large string
    for (const key of response.response.docs) {
      if (key.indexedBody_t.length > 100){
        key.indexedBody_t = key.indexedBody_t.slice(0, 100) + "... (text too long)";
      }
    }
    res.status(200).json({result: response});
  } catch (err) {
    console.error("Error in API /search: \n", err);
    res.status(500).json({message: "Error executing the query."});
  }
});

// get one document from index, highlights and downloaded files routes are part of the object
router.get('/document/:docName', async (req, res) => {
  try {
    const document = await DocumentRetrieval.getDocument(req.params.docName);
    res.status(200).json({document: document});
  } catch (err) {
    console.error("Error in API document/", err);
    res.status(500).json({message: "Error Searching for document."});
  }
});

// get all documents from database, indexed body removed
router.get('/document', async (req, res) => {
  try {
    const response = await DocumentRetrieval.listAllDocuments();
    if (response){
      // trim indexed body to save bandwidth, it's a large string
      for (const item of response){
        if (item.indexedBody.length > 100){
          item.indexedBody = item.indexedBody.slice(0, 100) + "... (text too long)";
        }
      }
    }
    //console.log(response);
    res.status(200).json({documents: response});
  } catch (err) {
    console.error("Error getting all documents:\n", err);
    res.status(500).json({message: "Error getting all documents."});
  }
});

// refresh index based on database
router.get('/refresh', async (req, res) => {
  try {
    if (await DocumentRetrieval.reindex()) {
      res.status(200).json({message: "Refresh Successful"});
    } else {
      res.status(500).json({message: "Error while refreshing the index"});
    }
  } catch (err) {
    console.log("Error refreshing the index: ", err);
    res.status(500).json({message: "Error refreshing the index."});
  }
});

export default router;