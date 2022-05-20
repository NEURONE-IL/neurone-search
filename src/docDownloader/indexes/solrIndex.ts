// eslint-disable-next-line @typescript-eslint/no-var-requires
const solr = require('solr-client');
import { SolrClientParams, Client } from 'solr-client';
import { SearchResponse } from 'solr-client/dist/lib/solr';
import { DocumentsModel } from '../../models/document';
import { IndexDocument } from '../indexDocInterface';

export default class SolrIndex {

  static client: Client;

  /**
   * starts up the solr index client with options in the env variables
   */
  private static async load(reload?: boolean) {

    // simply return if the client is already loaded and it hasn't been asked to reaload
    if (this.client && !reload) {
      return;
    }

    console.log("Starting up solr-client...");

    const options: SolrClientParams = {
      host: process.env.NEURONE_SOLR_HOST || 'localhost',
      port: process.env.NEURONE_SOLR_PORT || '8983',
      core: process.env.NEURONE_SOLR_CORE || 'neurone',
    }

    this.client = solr.createClient(options);

    try {
      const mess = await this.client.ping()
      console.log("Loaded successfully! ");
      console.log(mess);
      // callback("Loaded successfully", false);
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
        console.error("Could nor generate index because load() could not complete.");
        return;
      }
    }

    let docs: IndexDocument[];
    try{
      //const docs = Documents.find().fetch(); // Carlos: original neurone method
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
      console.log(doc);
      // TODO: replace with indexDocument interface or create new interface
      const newDoc = {
        id: doc.docName,
        docId_s: doc._id,
        locale_s: doc.locale,
        relevant_b: doc.relevant || false,
        title_t: doc.title || '',
        searchSnippet_t: doc.searchSnippet || [], // Carlos: changed '' to []
        indexedBody_t: doc.indexedBody || '',
        keywords_t: doc.keywords || [],
        task_s: doc.task || [],
        domain_s: doc.domain || [],
        url_t: doc.url || ''
        //type_t: doc.type || 'page' // TODO: is this to differentiate pages, books, videos, imgs?
      };
      idxDocs.push(newDoc);
    });
    
    console.log('entering delete()...');
    // dgacitua: Deleting old documents
    // Carlos: searchIndex from solr-node replaced with client from solr-client

    try {
      const res = await this.client.delete('id', '*');
      console.log("Deletion successful.\n", res);
      console.log("Entering solr-client add()...");
      const obj = await this.client.add(idxDocs);
      console.log("Documents added to solr index successfully! Details:\n", obj);

    } catch (err) {
      console.error("Could not complete creation of new index.\n", err);
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
      console.error("Could nor generate index because load() could not complete.");
      return;
    }

    const newDoc = {
      id: doc._id,
      docId_s: doc._id,
      locale_s: doc.locale,
      relevant_b: doc.relevant || false,
      title_t: doc.title || '',
      searchSnippet_t: doc.searchSnippet || [], // Carlos: changed '' to []
      indexedBody_t: doc.indexedBody || '',
      keywords_t: doc.keywords || [],
      task_s: doc.task || [],
      domain_s: doc.domain || [],
      url_t: doc.url || '',
      type_t: /*doc.type ||*/ 'page' // TODO: check or ask what it 'type'
    };

    try{
      await this.client.add([newDoc]);
      console.log("Document added successfully.");
    } catch (err) {
      console.error("Error when indexing document:\n", err);
    }
  }

  /**
   * search using the parameters in the loaded solr index
   * @param queryObject object with query info
   * @returns response from solr
   */
  static async searchDocuments(queryObject: {query: string, locale?: string, task?: string, domain?: string}): Promise<SearchResponse<unknown> | void> {

    // load client if it hasn't started up
    if (!this.client) {
      try{
        await this.load();
      } catch (err) {
        console.error("Could nor generate index because load() could not complete.");
        return;
      }
    }

    const queryString = queryObject.query,
          queryLocale = queryObject.locale ? queryObject.locale : null,
          queryTask = queryObject.task ? queryObject.task : null,
          queryDomain = queryObject.domain ? queryObject.domain : null;

    // query string to be passed to solr
    const q1 = `(title_t:${queryString} OR indexedBody_t: ${queryString} OR keywords_t: ${queryString})`,
          q2 = queryLocale ? ` AND locale_s:${queryLocale}` : '',
          q3 = queryTask ? ` AND task_s:${queryTask}` : '',
          q4 = queryDomain ? ` AND domain_s:${queryDomain}` : '',
          q5 = `start=0&rows=100`,
          q6 = `df=indexedBody_t`,
          q7 = `hl=on&hl.q=${queryString}&hl.fl=indexedBody_t&hl.snippets=3&hl.simple.pre=<em class="hl">&hl.simple.post=</em>`,
          q8 = `hl.fragmenter=regex&hl.regex.slop=0.2&hl.alternateField=body_t&hl.maxAlternateFieldLength=300`,
       query = `(${q1}${q2}${q3}${q4})&${q5}&${q6}&${q7}&${q8}`;

    // query to solr
    const queryObj = this.client.query().q(query);
    try {
      const res = await this.client.search(queryObj);
      console.log("queryObject:", res);
      return res;
    } catch(err) {
      console.error(err);
      return;
    }

  }

}