// eslint-disable-next-line @typescript-eslint/no-var-requires
const solr = require('solr-client');
import { SolrClientParams, Client } from 'solr-client';
import { SearchResponse } from 'solr-client/dist/lib/solr';
import { JsonResponseData } from 'solr-client/dist/lib/types';
import { DocumentsModel } from '../../models/document';
import { IndexDocument } from '../indexDocInterface';

export default class SolrIndex {

  static client: Client;

  /**
   * starts up the solr index with options in the env variables, used by generate()
   * @param callback callback called after the function finishes loading, params are res: string and err: boolean
   */
  private static load(callback: (res: string, err: boolean) => void) {

    console.log("Starting up solr-client...");

    const options: SolrClientParams = {
      host: process.env.NEURONE_SOLR_HOST || 'localhost',
      port: process.env.NEURONE_SOLR_PORT || '8983',
      core: process.env.NEURONE_SOLR_CORE || 'neurone',
    }

    this.client = solr.createClient(options);

    this.client.ping().then( (mess: JsonResponseData) => {
      console.log("Loaded successfully! ");
      console.log(mess);
      callback("Loaded successfully", false);
    }).catch( (err: Error) => {
      console.error(err);
      callback("error: " + err, true);
    });
  }

  /**
   * generates the solr index from scratch from the database after finishing calling load() as a callback,
   * used when starting up or refreshing the server's index
   * @param callback 
   */
  static generate(callback: () => void) {
    this.load( (res, err) => {
      console.log("Entering load()...");
      if (!err) {
        //const docs = Documents.find().fetch(); // Carlos: original neurone method
        DocumentsModel.find({}).then( (docs: any[]) => {

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
              url_t: doc.url || '',
              type_t: doc.type || 'page'
            };
            idxDocs.push(newDoc);
          });
          
          console.log('entering delete()...');
          // dgacitua: Deleting old documents
          // Carlos: searchIndex from solr-node replaced with client from solr-client
          this.client.delete('id', '*').then((res: unknown) => {

            console.log('delete successful!!!!!!!\nResponse:');
            console.log(res)
            console.log("Entering add()...")
            // dgacitua: Adding new documents
            // Carlos: documents in idxDocs are added with solr-client's add method
            this.client.add(idxDocs).then((obj: unknown) => {

              console.log("Documents added to solr index! Details:");
              console.log(obj);

            }).catch((err: Error) => {
              console.error(err);
            });

          }).catch( (err: Error) => {
            console.error(err);
          });
        });
      }
    });
  }

  /**
   * Index one document (indexDocument type) in solr
   * @param docObj the document to index
   * @param callback function to run once it's done
   */
  static index(doc:IndexDocument, callback: (err: boolean) => void) {

    // TODO: test this method
    const newDoc = {
      id: doc.id,
      docId_s: doc.id,
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

    this.client.add([newDoc]).then(() => {
      console.log("Document indexed successfully");
      callback(false);
    }).catch((err: Error) => {
      console.error("Error when indexing document:");
      console.error(err);
      callback(true);
    })
  }

  /**
   * search using the parameters in the loaded solr index
   * @param queryObject object with query info
   * @returns response from solr
   */
  static searchDocuments(queryObject: {query: string, locale?: string, task?: string, domain?: string}): SearchResponse<unknown> | void {

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
    this.client.search(queryObj).then((res: SearchResponse<unknown>) => {
      console.log("queryObject:", res);
      console.log(res.response.docs);
      return res;
    }).catch( (err: Error) => {
      console.error(err);
      return {};
    });
    
    /* // test to get all docs
    this.client.searchAll().then((res:any) => {
      console.log(res);
      console.log(res.response.docs)
    })*/
  }

}