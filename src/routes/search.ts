import express from 'express';
import DocumentRetrieval from '../documentIndexer/documentRetrieval';
import { QueryObject } from '../interfaces/queryInterface';


const router = express.Router();

/**
 * parse a string as number, if it isn't one, send back a default value
 * @param stringToParse string to parse
 * @param def default value
 * @returns the parsed number or the default number
 */
function parseNumberOrUseDefault(stringToParse: string, def: number) {
  const result = parseInt(stringToParse)
  if (!isNaN(result)) {
    return result;
  } else {
    return def;
  }
}

// execute search query from index, highlights and downloaded files routes are part of the object
router.get('/search/:query/:page?/:amount?', async (req, res) => {
  try {

    // make sure that page and amount are number types properly, and assign a default value in case they aren't in the route
    let page = 0;
    let amount = 10;
    if (req.params.page){
      page = parseNumberOrUseDefault(req.params.page, page);
    }
    if (req.params.amount){
      amount = parseNumberOrUseDefault(req.params.amount, amount);
    }    

    const query: QueryObject = {
      query: req.params.query,
      page: page,
      docAmount: amount,
      locale: req.body.locale,
      task: req.body.task,
      domain: req.body.domain
    }

    const response = await DocumentRetrieval.searchDocument(query);
    // trim indexed body to save bandwidth, it's a large string
    for (const key of response.response.docs) {
      if (key.indexedBody_t && key.indexedBody_t.length > 100){
        key.indexedBody_t = key.indexedBody_t.slice(0, 100) + "... (text too long)";
      }
    }
    res.status(200).json({result: response});
  } catch (err) {
    console.error("Error in API /search: \n", err);
    res.status(500).json({message: "Error executing the query."});
  }
});

// get one document from database
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
        if (item.indexedBody && item.indexedBody.length > 100){
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