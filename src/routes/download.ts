import express from 'express';
import { DocumentDownloader } from '../docDownloader/documentDownloader.js';
import { IndexDocument } from '../interfaces/indexDocInterface.js';


const router = express.Router();

/**
 * @swagger
 * components:
 *  schemas:
 *    DownloadedDoc:
 *      type: object
 *      properties:
 *        _id:
 *          type: string
 *          description: The document ID of the webpage data in the database
 *        route:
 *          type: string
 *          description: "The webpage index location in the backend. To be accessed with http://localhost:{port}//{route}"
 *        __v:
 *          type: number
 *          description: "Mongoose version key https://mongoosejs.com/docs/guide.html#versionKey"
 *        date:
 *          type: string
 *          description: Date when the document was downloaded, uses the date format of Mongo
 *        docName:
 *          type: string
 *          description: A UNIQUE name that can be used to find the website in the database instead of the mongo ID
 *        hash:
 *          type: string
 *          description: A sha256 hash of the website
 *        indexedBody:
 *          type: string
 *          description: The plain text contents of the website, this is what the search engine loads into its system. May be trimmed in the search queries.
 *        keywords:
 *          type: array
 *          items:
 *            type: string
 *          description: Words that can be used as important for the website.
 *        locale:
 *          type: string
 *          description: The locale of the webpage, currently en and es have been tested
 *        maskedUrl:
 *          type: string
 *          description: Use this to have a dummy URL instead of the actual webpage's URL.
 *        searchSnippet:
 *          type: array
 *          items:
 *            type: string
 *          description: A placeholder snippet to appear on a SERP if the search engine could not generate one.
 *        tags:
 *          type: array
 *          items:
 *            type: string
 *          description: Tags that can filter the webpage in a search query
 *        title:
 *          type: string
 *          description: A title that can be given automatically by the back-end if not provided, to be used in a SERP title result
 *        url:
 *          type: string
 *          description: The original link to the webpage
 * 
 *          
 *    DownloadRequest:
 *      type: object
 *      properties:
 *        url:
 *          type: string
 *          description: The link to the webpage to download
 *        docName:
 *          type: string
 *          description: A Unique name to be given to the webpage in the database
 *        title:
 *          type: string
 *          description: A title that can be given automatically by the back-end if not provided, to be used in a SERP title result
 *        searchSnippet:
 *          type: array
 *          items:
 *            type: string
 *          description: A placeholder snippet to appear on a SERP if the search engine could not generate one.
 *        tags:
 *          type: array
 *          items:
 *            type: string
 *          description: tags that can filter the webpage in a search query
 *        keywords:
 *          type: array
 *          items:
 *            type: string
 *          description: Words that can be used as important for the website.
 *        locale:
 *          type: string
 *          description: The locale of the webpage, currently en and es have been tested
 *        relevant:
 *          type: boolean
 *          description: True if the website is relevant for the search activity. That is, if is it related to what is being searched for. True if missing.
 *        maskedUrl:
 *          type: string
 *          description: Use this to have a dummy URL instead of the actual webpage's URL.
 *      required:
 *        - url    
 *        - docName
 *      example: 
 *        url: "https://imagine.gsfc.nasa.gov/science/objects/milkyway1.html"
 *        "docName": "milky-way"
 *        "title": "The Milky Way"
 *        "searchSnippet": ["There are billions of other galaxies in the Universe.", "and researchers predict that in about 4 billion years"]
 *        "tags": ["galaxy", "educational"]
 *        "keywords": ["galaxy", "milky", "astronomy"]
 *        "locale": "en"
 *        "relevant": true,
 *        "maskedUrl": "https://imagine.gsfc.nasa.gov/milky-way"
 * 
 */

/**
 * @swagger
 * tags:
 *  name: Download
 *  description: Website download routes
 */


/**
 * @swagger
 * /download:
 *  post:
 *    summary: Download a website from the web, save its information on the database and add it to the search index
 *    description: It may take a few seconds to complete the request
 *    tags: [Download]
 *    requestBody:
 *      required: true
 *      content: 
 *        application/json:
 *          schema:
 *            $ref: '#components/schemas/DownloadRequest'
 *    responses:
 *      201:
 *        description: Website downloaded, saved to the database, and saved to the search index successfully
 *        content: 
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *               message:
 *                 type: string
 *                 description: A message describing the result of the request
 *               result:
 *                 $ref: '#components/schemas/DownloadedDoc'
 *      500:
 *        description: Error in the server while downloading the document
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  description: A message describing the error
 *                error:
 *                  type: string
 *                  description: The server error
 *               
 */
router.post('/download', (req, res) => {

  const indexedDocument: IndexDocument = { 
    url: req.body.url || '',
    docName: req.body.docName || 'no-name-provided-' + Math.floor(Math.random()*1000), // recommended to always provide a unique name, rng for slight safety
    title: req.body.title, //  auto generated if not in req body
    locale: req.body.locale || 'en',
    relevant: req.body.relevant || true,
    tags: req.body.tags || [],
    keywords: req.body.keywords || [],
    date: req.body.date || Date.now(),
    maskedUrl: req.body.maskedUrl || '',
    searchSnippet: req.body.searchSnippet || [],
    indexedBody: '',
    route: '',
    hash: '',
  };

  DocumentDownloader.fetch(
    indexedDocument, 
    (err: unknown, result: unknown) => {
      try{
        if(!err){      
          console.log('FETCH IS DONE');
          console.log(result);
          res.status(201).json({message: "Successful", result: result});
        }
        else {
          console.error("Error in downloader API (post):\n", err);
          res.status(500).json({message: "Could not download or index the document.", error: err});
        }
      } catch (err) {
        console.error("Error in downloader API (post):\n", err);
        res.status(500).json({message: "Error in the code of the document downloader."});
      }
    });

});

// 
/**
 * @swagger
 * /download/preview:
 *  post:
 *    summary: Download a webpage without saving to database/index, it can be accessed with the info from the response
 *    description: It may take a few seconds to complete the request
 *    tags: [Download]
 *    requestBody:
 *      required: true
 *      content: 
 *        application/json:
 *          schema:
 *            $ref: '#components/schemas/DownloadRequest'
 *    responses:
 *      200:
 *        description: Website downloaded, preview sent
 *        content: 
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *               message:
 *                 type: string
 *                 description: A message describing the result of the request
 *               result:
 *                 $ref: '#components/schemas/DownloadedDoc'
 *      500:
 *        description: Error in the server while downloading the document
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string
 *                  description: A message describing the error
 *                error:
 *                  type: string
 *                  description: The server error
 *               
 */
router.post('/download/preview', (req, res) => {

  const indexedDocument: IndexDocument = { 
    docName: req.body.docName || 'no-name-provided',
    title: req.body.title || 'New NEURONE Page',
    locale: req.body.locale || 'en',
    relevant: req.body.relevant || true,
    tags: req.body.tags || [],
    keywords: req.body.keywords || [],
    date: req.body.date || Date.now(),
    maskedUrl: req.body.maskedUrl || '',
    url: req.body.url || '',
    searchSnippet: req.body.searchSnippet || [],
    indexedBody: '',
    route: '',
    hash: '',
  };

  try {
    DocumentDownloader.preview(
      indexedDocument, 
      (err, result) => {
        try {
          if (!err) {
            console.log("Preview done!");
            res.status(200).json({message: "Successful", result: result});
          }
          else {
            console.error("Error in downloader API (post):\n", err);
            res.status(500).json({message: "Could not create the document preview.", error: err});
          }
        } catch (err) {
          console.error(err);
          res.status(500).json({message: "Error in the code of the document downloader."});
        }
      });
  } catch(err) {
    console.error(err);
    res.status(500).json({message: "Error while creating the preview"});
  }
});


/**
 * @swagger
 * /download/delete/{docName}:
 *  delete:
 *    summary: Delete a webpage by name
 *    description: >
 *      Delete a webpage from the database, then delete the local folder containing it.\n
 *      This uses the webpage's docName field in the database to find it.
 *    tags: [Download]
 *    parameters:
 *      - in: path
 *        name: docName
 *        schema:
 *          type: string
 *        required: true
 *        description: The webpage's docName saved in the database
 *    responses: 
 *      200:
 *        description: The webpage was deleted successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: array
 *                  items:
 *                    type: string
 *                  description: Message from the back-end about the deletion results
 *      500:
 *        description: There was a server error while deleting the webpage
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                message:
 *                  type: string   
 *                  description: A simple description of the error, look at the server console for details.
 *      
 *      
 *      
 */
router.delete('/download/delete/:docName', async (req, res) => {
  try {
    const deleteLog = await DocumentDownloader.delete(req.params.docName);
    res.status(200).json({message: deleteLog});
  } catch (err) {
    console.error(err);
    res.status(500).json({message: "Error when deleting document."});
  }
});

export default router;