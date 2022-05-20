import express from 'express';
import DocumentRetrieval from '../docDownloader/documentRetrieval';


const router = express.Router();

// execute search query
router.get('/search/:query', async (req, res) => {
  try {
    const documents = await DocumentRetrieval.searchDocument({query: req.params.query});
    res.status(200).json({result: documents});
  } catch (err) {
    console.error("Error in API /search: \n", err);
    res.status(500).json({message: "Error executing the query."});
  }
});

// get one document
router.get('/document/:docName', async (req, res) => {
  try {
    const document = await DocumentRetrieval.getDocument(req.params.docName);
    res.status(200).json({document: document});
  } catch (err) {
    console.error("Error in API document/", err);
    res.status(500).json({message: "Error Searching for document."});
  }
});

// get all documents
router.get('/document', async (req, res) => {
  try {
    const docs = await DocumentRetrieval.listAllDocuments();
    res.status(200).json({documents: docs});
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