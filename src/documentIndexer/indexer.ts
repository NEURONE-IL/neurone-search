//import Utils from './utils/serverUtils';
import SolrIndex from '../documentIndexer/indexes/solrIndex.js';
//import LunrIndex from './indexes/lunrIndex';
import { IndexDocument } from '../interfaces/indexDocInterface.js';

//import { Documents } from '../../imports/database/documents/index'; // TODO: define this import

export default class Indexer {

  static checkSolrIndex() {
    // for future proofing if another search engine is implemented
    //return process.env.NEURONE_SEARCH_ENGINE
    return (true);
  }

  // TODO: unnecesary under new structure?
  static loadInvertedIndex() {
    try {
      if (Indexer.checkSolrIndex()) {
        //SolrIndex.load();
        

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
        SolrIndex.generate();
        return true;
      }
      else {
        //LunrIndex.generate(); // TODO
        return true;
      }
    }
    catch (err) {
      console.error(err);
      throw new Error('Cannot generate document index! Error:\n' + err);
    }
  }

  static async indexDocumentAsync(docObj: any, callback: (arg0: unknown, arg1: unknown) => void) {
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