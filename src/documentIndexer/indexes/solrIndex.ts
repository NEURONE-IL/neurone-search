import 'dotenv/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const solr = require('solr-client');
import axios from 'axios';
import { SolrClientParams, Client } from 'solr-client';
import { DocumentsModel } from '../../models/document';
import { IndexDocument } from '../../interfaces/indexDocInterface';
import { QueryObject } from '../../interfaces/queryInterface';
import { docInsideIndex } from '../../interfaces/docInsideIndexInterface';


export default class SolrIndex {

  static client: Client;

  /**
   * maps a db document into a index document for consistency and returns the object
   * @param doc document from database
   * @param customOptions overrides field from db document
   * @returns document for the index
   */
  private static mapDbDocToIndexDoc(
    doc: IndexDocument, 
    customOptions?: {
      relevant: boolean,
      title: string,
      searchSnippet: string[],
      indexedBody: string,
      keywords: string[],
      //task: string, TODO: remove when tags are done
      //domain: string,
      tags: string[],
      url: string
      }): docInsideIndex {

    return {
      id: doc.docName,
      docId_s: doc._id,
      locale_s: doc.locale,
      relevant_b: customOptions?.relevant || doc.relevant || false,
      title_t: customOptions?.title || doc.title || '',
      searchSnippet_t: customOptions?.searchSnippet || doc.searchSnippet || [], // Carlos: changed '' to []
      indexedBody_t: customOptions?.indexedBody || doc.indexedBody || '',
      keywords_t: customOptions?.keywords ||  doc.keywords || [],
      //task_s: customOptions?.task || doc.task || '',
      //domain_s: customOptions?.domain || doc.domain || '',
      tags_t: customOptions?.tags || doc.tags || [],
      url_t: customOptions?.url || doc.url || ''
      //type_t: doc.type || ' // TODO: implement type
    }
  }

  /**
   * starts up the solr index client with options in the env variables
   * @param reload set to true to request load even if the client is already loaded
   */
  static async load(reload?: boolean) {

    // simply return if the client is already loaded and it hasn't been asked to reaload
    if (this.client && !reload) {
      return;
    }

    console.log("Starting up solr-client...");

    // delete fields using axios and the the solr API directly for core schema cleanup
    const deleteFieldsConfig = {
      "delete-field": [
        {
          "name": "tags_t"
        },
        {           
          "name": "title_t"
        },
        {
          "name": "indexedBody_t"
        },
        {
          "name": "keywords_t"
        },
        {
          "name": "searchSnippet_t"
        }
      ]
    }

    try {
      console.log("Deleting fields from solr core for cleanup...");
      const solrResponse = await axios.post('http://localhost:' + (process.env.NEURONE_SOLR_PORT || 8983) +'/solr/neurone/schema/fields?wt=json', deleteFieldsConfig);
      console.log("Solr delete config response:", solrResponse.data);
    } catch (err) {
      console.error(err);
    }

    // add fields using axios and the solr API directly to properly configure schema
    const addFieldsConfig = {
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
          "termPositions": true,
          "termOffsets": true // to enable highlighting
        },
        {
          "name": "keywords_t",
          "type": "text_en",
          "indexed": true,
          "stored": true,
          "multiValued": true,
          "termVectors": true,
          "termPositions": true
        },
        {
          "name": "searchSnippet_t",
          "type": "text_en",
          "indexed": true,
          "stored": true,
          "multiValued": true,
          "termVectors": true,
          "termPositions": true
        }
      ]
    }

    try {
      console.log("Adding back deleted fields...");
      const solrResponse = await axios.post('http://localhost:' + (process.env.NEURONE_SOLR_PORT || 8983) +'/solr/neurone/schema/fields?wt=json', addFieldsConfig);
      console.log("Axios solr delete config response:", solrResponse.data);
    } catch (err) {
      console.error(err);
    }


    const options: SolrClientParams = {
      host: process.env.NEURONE_SOLR_HOST || 'localhost',
      port: process.env.NEURONE_SOLR_PORT || '8983',
      core: process.env.NEURONE_SOLR_CORE || 'neurone',
    }

    // startup solr client
    this.client = solr.createClient(options);

    // ping solr to ensure connection
    try {
      const mes = await this.client.ping()
      console.log("Loaded successfully! Details from solr:");
      console.log(mes);
      
    } catch (err) {
      console.error("Error in load method:\n", err);
    }
  }

  /**
   * generates the solr index from scratch from the database after finishing calling load() as a callback,
   * used when starting up or refreshing the server's index
   */
  static async generate() {
    if (!this.client) {
      try{
        await this.load();
      } catch (err) {
        console.error("Could not generate index because load() could not complete.");
        return;
      }
    }

    console.log("\n***Refreshing solr index from database***\n");



    let docs: IndexDocument[];
    try{
      docs = await DocumentsModel.find({});
    } catch (err) {
      console.error("Could not load documents from database.\n", err);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idxDocs: Record<string, any> = [];

    /*  
    //TODO: implement book, video, image
    const books = Book.find().fetch(),
    videos = Video.find().fetch(),
    images = ImageSearch.find().fetch();
    
    docs = docs.concat(books.concat(videos).concat(images));
    */

    docs.forEach((doc) => {
      // TODO: replace with indexDocument interface or create new interface
      const newDoc = this.mapDbDocToIndexDoc(doc);
      idxDocs.push(newDoc);
    });

    //console.log(idxDocs);

    console.log("Found " + idxDocs.length + " document(s) in database.");
    console.log('Deleting all documents currently in solr index... [solr-client delete()]');
    // dgacitua: Deleting old documents
    // Carlos: searchIndex from solr-node replaced with client from solr-client

    try {
      const res = await this.client.deleteAll();
      console.log("Deletion successful.\nDetails: ", res);
      console.log("Adding documents to solr index... [solr-client add()]");
      const obj = await this.client.add(idxDocs);
      console.log("Documents added to solr index successfully!\nDetails: ", obj);
      console.log("Commiting changes... [solr-client commit()]");
      await this.client.commit();
      console.log("Changes commited!");
      return;

    } catch (err) {
      console.error("Could not complete creation of new index.\n", err);
      return;
    }

  }

  /**
   * Index one document (indexDocument type) in solr
   * @param doc the document to index
   */
  static async index(doc: IndexDocument) {

    // load client
    try{
      await this.load();
    } catch (err) {
      console.error("index(): could not load client.");
      return;
    }

    const newDoc = this.mapDbDocToIndexDoc(doc);

    try{
      await this.client.add([newDoc]);
      console.log("Document added successfully.");
      await this.client.commit();
      console.log("Index commited successfully.");
      return null;
    } catch (err) {
      console.error("Error when indexing document:\n", err);
      return err;
    }
  }

  /**
   * search using the parameters in the loaded solr index
   * @param queryParam object with query info
   * @returns response from solr
   */
  static async searchDocuments(queryParam: QueryObject) {

    // load client if it hasn't started up
    if (!this.client) {
      try {
        await this.load();
      } catch (err) {
        console.error("searchDocument(): could not load client.");
        return;
      }
    }

    const queryString = queryParam.query,
          queryLocale = queryParam.locale ? queryParam.locale : null,
          queryTags   = queryParam.tags ? queryParam.tags : null
          //queryTask = queryParam.task ? queryParam.task : null, //TODO: remove once tags are done
          //queryDomain = queryParam.domain ? queryParam.domain : null;
          

    // query string to be passed to solr
    const q1 = `(title_t:${queryString} OR indexedBody_t: ${queryString} OR keywords_t: ${queryString})`,
          q2 = queryLocale ? ` AND locale_s:${queryLocale}` : '';
          //q3 = queryTask ? ` AND task_s:${queryTask}` : '',
          //q4 = queryDomain ? ` AND domain_s:${queryDomain}` : '';

    // q3 will be every tag that's requested in the tag arrays with an AND to exclude anything that's not in it
    let q3 = "";
    queryTags?.forEach( tagStr => {
      q3 = q3 + ` AND tags_t: ${tagStr}`;
    })          

    const mainQuery = `(${q1}${q2}${q3})`;

    // create main query object
    const query = this.client.query();

    // set the main query
    query.q(mainQuery);

    // query start (calculated offset for pagination)
    query.start(queryParam.page * queryParam.docAmount);

    // query rows
    query.rows(queryParam.docAmount);

    // query default field
    query.df("indexedBody_t");

    // query highlighting
    query.hl({
      on: true,
      q: queryString,
      fl: "indexedBody_t",
      fragsize: 5,
      snippets: 3,
      simplePre: "<em class=\"hl\">",
      simplePost: "</em>",
      fragmenter: "regex",
      regexSlop: 0.2,
      alternateField: "body_t",
      maxAlternateFieldLength: 300
    });

    try {

      console.log("\nExecuting query: " + queryParam.query);
      //console.log("Details: \n", query.parameters);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await this.client.search(query); // any type because search response is inconsistent 

      //console.log("RESPONSE:\n", res);
      //console.log("DOCS:\n", res.response.docs);
      //console.log("HIGHLIGHT:\n", res.highlighting);

      // add the highlights to the res in a cleaner way, each key will be an object id and the values are string arrays with the hls
      const highlights: Record<string, string[]> = {}
      for (const key in res.highlighting){
        highlights[key] = res.highlighting[key]["indexedBody_t"] ? res.highlighting[key]["indexedBody_t"] : []; // "?" avoids saving undefined
      }

      res.highlighting = highlights;
      
      res.route = {};
      // we find the route of the downloaded html file here, and add its id from the db as a key in the object (similar to highlights)
      for (const indexDoc of res.response.docs) {
        const dbDoc = await DocumentsModel.find({'docName': indexDoc.id}, "route").exec();

        // we add the route to the response, should be unique since docName is unique in the collection
        res.route[indexDoc.id] = dbDoc[0].route;
      }

      //console.log("Final response:\n", res);
      console.log("Search query done. Found " + res.response.docs.length + " document(s).");

      return res;

    } catch(err) {
      console.error("Error while processing search request. Try reindexing with reindex() in Document Retrieval file.\n", err);
      return {response: {}};
    }

  }

  /**
   * returns all documents in solr index
   */
  static async searchAllDocuments() {
    // load client if it hasn't started up
    if (!this.client) {
      try {
        await this.load();
      } catch (err) {
        console.error("searchAllDocuments(): could not load client.");
        return;
      }
    }

    return await this.client.searchAll();

  }

}