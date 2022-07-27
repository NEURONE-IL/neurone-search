import 'dotenv/config'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const axios = require('axios').default;
import express from 'express';


const router = express.Router();

// first time setup to make the solr schema work with neurone documents
router.get('/solr-schema-setup-first-time', async (req, res) => {
  try {

    // TODO: separate in different objects so that 1 add field failing doesn't block the others
    const configuration = {
      "add-field": [
        {
          "name": "tags_t",
          "type": "text_en",
          "multiValued": true,
          "indexed": true,
          "stored": true,
          "termVectors": true,
          "termPositions": true
        },
        {
          "name": "title_t",
          "type": "text_en",
          "indexed": true,
          "stored": true,
          "termVectors": true,
          "termPositions": true
        },
        {
          "name": "indexedBody_t",
          "type": "text_en",
          "indexed": true,
          "stored": true,
          "termVectors": true,
          "termPositions": true
        },
        {
          "name": "keywords_t",
          "type": "text_en",
          "indexed": true,
          "stored": true,
          "multiValued": true,
          "termVectors": true,
          "termPositions": true
        }
      ]
    }
    
    const solrResponse = await axios.post('http://localhost:' + (process.env.NEURONE_SOLR_PORT || 8983) +'/solr/neurone/schema/fields?wt=json', configuration);
    res.status(200).json({solrResponse: solrResponse, message: "Configuration successful"});
  } catch (err) {
    console.error(err);
    res.status(500).json({message: "Error sending the configuration request to Solr."})
  }
});

export default router;