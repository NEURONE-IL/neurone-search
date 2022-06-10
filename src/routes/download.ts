import express from 'express';
import { DocumentDownloader } from '../docDownloader/documentDownloader';
import { IndexDocument } from '../interfaces/indexDocInterface';


const router = express.Router();

// download, save in db and index automatically rquested document, send back saved object in database
router.post('/download', (req, res) => {

  const indexedDocument: IndexDocument = { 
    docName: req.body.docName || 'no-name-provided',
    title: req.body.title,
    locale: req.body.locale || 'en',
    relevant: req.body.relevant || false,
    task: req.body.task || [ 'pilot' ],
    domain: req.body.domain || [ 'pilot' ],
    keywords: req.body.keywords || [],
    date: req.body.date || Date.now(),
    maskedUrl: req.body.maskedUrl || '',
    url: req.body.url || '',
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
    task: req.body.task || 'pilot',
    domain: req.body.domain || 'pilot',
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