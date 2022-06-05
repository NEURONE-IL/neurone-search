//import Utils from './utils/serverUtils';
import SolrIndex from '../documentIndexer/indexes/solrIndex';
//import LunrIndex from './indexes/lunrIndex';
import { IndexDocument } from '../interfaces/indexDocInterface';

//import { Documents } from '../../imports/database/documents/index'; // TODO: define this import

export default class Indexer {

  static checkSolrIndex() {
    return (process.env.NEURONE_SOLR_HOST && process.env.NEURONE_SOLR_PORT && process.env.NEURONE_SOLR_CORE);
  }

  // TODO: unnecesary under new structure?
  static loadInvertedIndex() {
    try {
      if (Indexer.checkSolrIndex()) {
        //SolrIndex.load(); // TODO: check if it's fixed with new solr implementation
        

        return true;
      }
      else {
        //LunrIndex.load();
        return true;
      }
    }
    catch (err) {
      console.error(err);
      throw new Error('Cannot load document index! Error:\n' + err);
    }
  }

  static generateInvertedIndex() {
    try {
      if (Indexer.checkSolrIndex()) {
        SolrIndex.generate(); // TODO: check if new solr implementation works
        // const res = fn(); // Carlos: unused?

        return true;
      }
      else {
        //LunrIndex.generate();
        return true;
      }
    }
    catch (err) {
      console.error(err);
      throw new Error('Cannot generate document index! Error:\n' + err);
    }
  }

  static async indexDocumentAsync(docObj: IndexDocument, callback: (arg0: any, arg1: any) => void) {
    if (Indexer.checkSolrIndex()) {
      const error = await SolrIndex.index(docObj);
      callback(error, true);
    }
    else {
      //LunrIndex.index(docObj);
      callback(null, true);
    }
  }
}