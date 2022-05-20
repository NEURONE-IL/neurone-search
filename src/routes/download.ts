import express from 'express';
import { DocumentDownloader } from '../docDownloader/documentDownloader';
import { IndexDocument } from '../docDownloader/indexDocInterface';


const router = express.Router();

// download, save in db and index automatically rquested document, send back saved object in database
router.post('/download', (req, res) => {
  console.log("URL!!!!!!!!!!!!: ", req.body.url);

  const indexedDocument: IndexDocument = { 
    docName: req.body.docName || 'no-name-provided',
    title: req.body.title || 'New NEURONE Page',
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
          res.status(200).json({message: "Successful", result: result});
        }
        else {
          console.error("Error in downloader API (post):\n", err);
          res.status(500).json({message: "Could not download or index the document.", error: err});
        }
      } catch (err) {
        console.error("Error in downloader API (post):\n", err);
        res.status(500).json({message: "Error in the code of the document downloader."})
      }
    });

});

export default router;