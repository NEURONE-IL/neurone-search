import SolrIndex from './indexes/solrIndex';
//import LunrIndex from './indexes/lunrIndex';
import Indexer from './indexer';

import Utils from '../docDownloader/utils/serverUtils';

//import { Documents } from '../../imports/database/documents/index';
//import { Video, Book } from '../database/definitions';
import { DocumentsModel } from '../models/document';
import { QueryObject } from '../interfaces/queryInterface';


export default class DocumentRetrieval {

  /**
   * gets the document with the matching document name" in the database (set to be unique)
   * @param documentName the field "docName" of the document in the database
   * @returns document in database
   */
  static async getDocument(documentName: string) {

    try{
      const doc = await DocumentsModel.findOne({ docName: documentName });
      if (doc && doc._id && doc.route) {
        doc.routeUrl = '/' + doc.route;
        return doc;
      }
      /* //TODO: port books
      doc = Book.findOne({ _id: documentName})
      if (doc && doc._id && doc.route) {
        doc.routeUrl = '/' + doc.route;
        callback(null, doc);
        return;
      }
      // TODO: port videos
      doc = Video.findOne({ _id: documentName})
      if (doc && doc._id && doc.route) {
        doc.routeUrl = '/' + doc.route;
        callback(null, doc);
        return;
      }
      */
      else{
        console.log("documentRetrieval - getDocument(): Document not found: " + documentName);
        return doc;
      }
    } catch(err) {
      console.error("documentRetrieval - getDocument(): Error getting document from database: \n", err);
      return {};
    }

      
  }

 
  /**
   * dgacitua: Custom sorting algorithm for iFuCo Project
   * @param documentArray Array with resulting documents from Indexer
   * @param insertions Algorithm will check from first to <insertions> position for relevant documents
   * @param offset Algorithm will insert a relevant document at this position (1 is first position)
   * @returns sorted array
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static iFuCoSort(documentArray: any[], insertions: number, offset: number) {

    /*
    // TS makes this redundant
    check(documentArray, Array);
    check(insertions, Number);
    check(offset, Number);
    */

    //==============//
    // iFuCoSort v3 //
    //==============//
    // Carlos: adapted code a bit to modern TS/JS, algorithm unchanged
    let newArray = documentArray;
    const insertNum = newArray.length < insertions ? newArray.length : insertions
    const offsetPos = newArray.length < offset ? newArray.length : offset;

    if (newArray.length >= 2 && newArray[0].relevant) {
      for (let k=0; k<newArray.length; k++) {
        if (!newArray[k].relevant) {
          newArray = Utils.moveInArray(newArray, k, 0);
          break;
        }
      }
    }

    for (let i=0; i<insertNum; i++) {
      if (newArray[i].relevant) return newArray;
    }

    for (let j=0; j<newArray.length; j++) {
      if (newArray[j].relevant) {
        newArray = Utils.moveInArray(newArray, j, offsetPos-1);
        return newArray;  
      }
    }

    return newArray;

    // dgacitua: Old iFuCoSort algorithms are kept for reference

    //==============//
    // iFuCoSort v2 //
    //==============//
    /*
    var insertNum = documentArray.length < insertions ? documentArray.length : insertions,
        offsetPos = documentArray.length < offset ? documentArray.length : offset;

    for (var i=0; i<insertNum; i++) {
      if (documentArray[i].relevant === true) return documentArray;
    }

    for (var j=0; j<documentArray.length; j++) {
      if (documentArray[j].relevant === true) {
        documentArray.move(j, offsetPos-1);
        return documentArray;  
      }
    }

    return documentArray;
    */

    //==============//
    // iFuCoSort v1 //
    //==============//
    /*
    var relevantDocs = this.shuffleArray(Documents.find({ relevant: true }).fetch()),
           insertNum = relevantDocs.length < insertions ? relevantDocs.length : insertions,
           offsetNum = (documentArray.length < offset ? documentArray.length : offset) - 1;

    for (i=0; i<insertNum; i++) {
      var index = documentArray.indexOf(relevantDocs[i]);

      if (index != -1) {
        documentArray.move(index, offsetNum);
      }
      else {
        documentArray.splice(offsetNum, 0, relevantDocs[i]);
      }
    }

    return this.removeArrayDuplicates(a => a._id, documentArray);
    */
  }

  /**
   * dgacitua: Search the current query object in one of the indexes available
   * @param queryObj the query object with the parameters of the query
   * @returns array of documents found
   */
  static async searchDocument(queryObj: QueryObject) {
    if (Indexer.checkSolrIndex()) {
      const res = await SolrIndex.searchDocuments(queryObj);

      if (res && res.response.docs.length >= 1) return this.iFuCoSort(res.response.docs, 3, 2);
      else return res;
    }/*
    else {
      // TODO: replace lunr
      const qo = queryObj,
        res1 = LunrIndex.searchDocuments(qo.query),
        res2 = res1.filter((d) => { return d.locale === qo.locale && d.task.indexOf(qo.task) !== -1 && d.domain.indexOf(qo.domain) !== -1 });

      if (res2.length >= 1) return DocumentRetrieval.iFuCoSort(res2, 3, 2);
      else return res2;
    }*/
  }

  /**
   * dgacitua: List all documents on database
   * @returns array of documents in database
   */
  static async listAllDocuments() {
    try{
      return await DocumentsModel.find({});
    } catch (err) {
      console.error(err);
      return;
    }
  }

  /**
   * dgacitua: Regenerate inverted index
   * @returns boolean representing success or failure
   */
  static async reindex() {
    if (Indexer.checkSolrIndex()) {
      try{
        await SolrIndex.generate();
        return true;
      } catch (err){
        console.error(err)
        return false;
      }
    }/*
    else {
      // TODO: replace lunr
      LunrIndex.generate();
      return true;
    }*/
  }
}