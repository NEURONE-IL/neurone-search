import express from 'express';
import DocumentRetrieval from '../documentIndexer/documentRetrieval.js';
import { QueryObject } from '../interfaces/queryInterface.js';


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

/**
 * @swagger
 * components:
 *  schemas:
 *    searchResult:
 *      type: object
 *      properties:
 *        result:
 *          type: object
 *          description: The result returned from the search engine, currently adapted for Solr.
 *          properties:
 *            responseHeader:
 *              type: object
 *              description: The detailed response from the search engine with the query details
 *            response:
 *              type: object
 *              description: The detailed response from the search engine with the results of the query
 *              properties:
 *                numFound:
 *                  type: number
 *                  description: The number of documents found
 *                start:
 *                  type: number
 *                  description: The start of the element search
 *                numFoundExact:
 *                  type: boolean
 *                  description: A Solr variable indicating whether approximate results are returned (false) with the exact hit result
 *                docs:
 *                  type: array
 *                  items:
 *                    $ref: '#/components/schemas/IndexDoc'
 *            highlighting:
 *              type: object
 *              description: An object where the keys are docNames and the values are highlights of the webpages, saved in a array of string
 *            route:
 *              type: object
 *              description: >
 *                An object where the keys are docNames and the values are strings with the route of the documents in the backend to access.
 *                "Example: http://localhost:3001//downloadedDocs/milky-way/imagine.gsfc.nasa.gov/science/objects/milkyway1.html"
 *            
 *    IndexDoc:
 *      type: object
 *      description: A document saved inside the search engine. It has different field names from the database docs but the data is the same.
 *      properties:
 *        id: 
 *          type: string
 *          description: In the database saved as 'docName', a unique name id for the document
 *        docId_s:
 *          type: string
 *          description: The document ID in Mongo
 *        locale_s:
 *          type: string
 *          description: The locale of the document
 *        relevant_b:
 *          type: boolean
 *          description: Whether the document/website is relevant for the activity or not
 *        title_t:
 *          type: string
 *          description: The title of the webpage to be displayed on a SERP results list
 *        searchSnippet_t:
 *          type: array
 *          description: The search snippets to use as a description for the webpage on a SERP results list
 *          items:
 *            type: string
 *        keywords_t:
 *          type: array
 *          description: The keywords of the webpage
 *          items:
 *            type: string
 *        tags_t:
 *          type: array
 *          description: The tags of the webpage
 *          items:
 *            type: string
 *        url_t:
 *          type: string
 *          description: The original URL of the webpage
 *        _version_: 
 *          type: number
 *          description: Internal solr value
 * 
 */

/**
 * @swagger
 * tags:
 *  name: Search
 *  description: Search query execution routes
 */

/**
 * @swagger
 * /search/{query}/{page}/{ammount}/{tags}:
 *  get:
 *    summary: Make a search query on the indexed websites
 *    description: Execute a search query for the search system loaded, the highlights and the local webpage route are part of the response
 *    tags: [Search]
 *    parameters:
 *      - in: path
 *        name: query
 *        schema:
 *          type: string
 *        required: true
 *        description: The text representing the search query.
 *      - in: path
 *        name: page
 *        schema:
 *          type: number
 *        required: false
 *        description: >
 *          The search pagination of the query. 
 *          If {ammount} is not provided, it will be 10. 
 *          So a page parameter of 2 will ask for the 3rd page with 10 elements, in other words, the elements 21-30.
 *      - in: path
 *        name: ammount
 *        schema:
 *          type: number
 *        required: false
 *        description: The ammount of webpages to receive in the page.
 *      - in: path
 *        name: tags
 *        schema:
 *          type: string
 *        required: false
 *        description: The tag to filter the websites to receive, if not provided all the webpages will be searched.
 *    responses:
 *      200:
 *        description: Search complete
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/searchResult'
 *      500:
 *        description: Error in the search
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  description: A simple description of the error, see the back-end console for details.
 * 
 */
router.get('/search/:query/:page?/:amount?/:tags?', async (req, res) => {
  try {

    console.log(req.params);

    // make sure that page and amount are number types properly, and assign a default value in case they aren't in the route
    let page = 0;
    let amount = 10;
    if (req.params.page){
      page = parseNumberOrUseDefault(req.params.page, page);
    }
    if (req.params.amount){
      amount = parseNumberOrUseDefault(req.params.amount, amount);
    }

    // add tags fron url to an array, divided by hyphens
    const tags: string[] | undefined = req.params.tags? req.params.tags.split('-') : undefined;

    const query: QueryObject = {
      query: req.params.query,
      page: page,
      docAmount: amount,
      tags: tags
      //locale: req.body.locale, TODO: get from database instead, "get" in http doesn't have a body!
    }

    const response = await DocumentRetrieval.searchDocument(query);
    if (!response.response.docs) {
      console.log("GET search API: No docs found for '" + req.params.query + "'!");
      res.status(200).json({result: response});
      return;
    }
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

/**
 * @swagger
 * /document/{docName}:
 *  get:
 *    summary: Get one webpage document from database
 *    tags: [Search]
 *    parameters:
 *      - in: path
 *        name: docName
 *        schema:
 *          type: string
 *        required: true
 *        description: The unique docName field of the webpage
 *    responses:
 *      200:
 *        description: Search complete
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  description: A small description of the result.
 *                document:
 *                  $ref: '#/components/schemas/DownloadedDoc'
 *      500:
 *        description: Error in server
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:     
 *                message:
 *                  type: string
 *                  description: A small description of the error, see server console for details.
 *        
 */
router.get('/document/:docName', async (req, res) => {
  try {
    const document = await DocumentRetrieval.getDocument(req.params.docName);
    res.status(200).json({
      document: document,
      message: document ? "Found successfully" : "Not found."
    });
  } catch (err) {
    console.error("Error in API document/", err);
    res.status(500).json({message: "Error Searching for document."});
  }
});


/**
 * @swagger
 * /document/:
 *  get:
 *    summary: Get all the webpage documents from the database, indexed body shortened
 *    tags: [Search]
 *    responses:
 *      200:
 *        description: Search complete
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  description: A small description of the result.
 *                documents:
 *                  type: array
 *                  items:
 *                    $ref: '#/components/schemas/DownloadedDoc'
 *      500:
 *        description: Error in server
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:     
 *                message:
 *                  type: string
 *                  description: A small description of the error, see server console for details.
 *        
 */
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
    
    res.status(200).json({
      documents: response,
      message: "Completed."
    });
  } catch (err) {
    console.error("Error getting all documents:\n", err);
    res.status(500).json({message: "Error getting all documents."});
  }
});

/**
 * @swagger
 * /refresh/:
 *  get:
 *    summary: Refresh the search index from the database data
 *    tags: [Search]
 *    responses:
 *      200:
 *        description: Refresh complete
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  description: Small description of the result
 *      500:
 *        description: Error in server
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:     
 *                message:
 *                  type: string
 *                  description: A small description of the error, see server console for details.
 */
router.get('/refresh', async (req, res) => {
  try {
    if (await DocumentRetrieval.reindex()) {
      res.status(200).json({message: "Refresh Successful"});
    } else {
      console.error("Error refreshing the index")
      res.status(500).json({message: "Error while refreshing the index"});
    }
  } catch (err) {
    console.error("Error refreshing the index: ", err);
    res.status(500).json({message: "Error refreshing the index."});
  }
});

export default router;