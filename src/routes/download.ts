import express from 'express';
import { DocumentDownloader } from '../docDownloader/documentDownloader';
import { IndexDocument } from '../interfaces/indexDocInterface';


const router = express.Router();

// download, save in db and index automatically rquested document, send back saved object in database
router.post('/download', (req, res) => {

  /* example of a payload for this route
  {
    "url": "https://imagine.gsfc.nasa.gov/science/objects/milkyway1.html",
    "docName": "milky-way",
    "title": "The Milky Way", // not required, can be generated automatically if not specified
    "searchSnippet": ["There are billions of other galaxies in the Universe. Only three galaxies outside our own Milky Way Galaxy can be seen without a telescope, and appear ", "but its getting closer, and researchers predict that in about 4 billion years it will collide with the Milky Way"],
    "tags": ["galaxy", "educational"],
    "keywords": ["galaxy", "milky", "astronomy"],
    "locale": "en",
    "relevant": true,
    "maskedUrl": "https://imagine.gsfc.nasa.gov/milky-way"
  }
  */

  const indexedDocument: IndexDocument = { 
    url: req.body.url || '',
    docName: req.body.docName || 'no-name-provided-' + Math.floor(Math.random()*1000), // recommended to always provide a unique name, rng for slight safety
    title: req.body.title, //  auto generated if not in req body
    locale: req.body.locale || 'en',
    relevant: req.body.relevant || false,
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

// download a webpage without saving to database/index to show a preview
router.get('/download/preview', (req, res) => {



  const indexedDocument: IndexDocument = { 
    docName: req.body.docName || 'no-name-provided',
    title: req.body.title || 'New NEURONE Page',
    locale: req.body.locale || 'en',
    relevant: req.body.relevant || false,
    //task: req.body.task || 'pilot', // TODO: remove once tags are done
    //domain: req.body.domain || 'pilot',
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

// delete a webpage, this is, delete it from the database then delete the local folder containing it
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