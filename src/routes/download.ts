import express from 'express';
import { DocumentDownloader } from '../docDownloader/documentDownloader';
import { IndexDocument } from '../docDownloader/indexDocInterface';


const router = express.Router();

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
    (err: unknown, res: any) => { 
      if(!err){      
        console.log('ok2');
      }
      else { 
        console.error("ERROR: \n");
        console.error(err);
      } 
    });

  res.status(200).json({message: "Successful"}); // TODO: react to the result of fetch in case of an error
});

export default router;