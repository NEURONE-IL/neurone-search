// Carlos: WIP - STARTING TO PORT

import SolrIndex from './indexes/solrIndex';
import LunrIndex from './indexes/lunrIndex';
import Indexer from './indexer';

import Utils from '../utils/serverUtils';

import { Documents } from '../../imports/database/documents/index';
import { Video, Book } from '../database/definitions';

export default class DocumentRetrieval {
  static getDocument(documentName, callback) {
    var doc = Documents.findOne({ _id: documentName });

    if (doc && doc._id && doc.route) {
      doc.routeUrl = '/' + doc.route;
      callback(null, doc);
    }
    else {
      doc = Book.findOne({ _id: documentName})
      if (doc && doc._id && doc.route) {
        doc.routeUrl = '/' + doc.route;
        callback(null, doc);
      }
      else{
        doc = Video.findOne({ _id: documentName})
        if (doc && doc._id && doc.route) {
          doc.routeUrl = '/' + doc.route;
          callback(null, doc);
        }
        else{
        var err = 'Document not found!';
        callback(err);
        }
      }
      
    }
  }

 

  // dgacitua: Custom sorting algorithm for iFuCo Project
  // PARAMS:  documentArray  Array with resulting documents from Lunr
  //          insertions     Algorithm will check from first to <insertions> position for relevant documents
  //          offset         Algorithm will insert a relevant document at this position (1 is first position)
  static iFuCoSort(documentArray, insertions, offset) {
    check(documentArray, Array);
    check(insertions, Number);
    check(offset, Number);

    //==============//
    // iFuCoSort v3 //
    //==============//
    var newArray = documentArray,
       insertNum = newArray.length < insertions ? newArray.length : insertions,
       offsetPos = newArray.length < offset ? newArray.length : offset;

    if (newArray.length >= 2 && newArray[0].relevant) {
      for (var k=0; k<newArray.length; k++) {
        if (!newArray[k].relevant) {
          newArray = Utils.moveInArray(newArray, k, 0);
          break;
        }
      }        
    }

    for (var i=0; i<insertNum; i++) {
      if (newArray[i].relevant) return newArray;
    }

    for (var j=0; j<newArray.length; j++) {
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

  // dgacitua: Search the current query object in one of the indexes available
  static searchDocument(queryObj) {
    if (Indexer.checkSolrIndex()) {
      var qo = queryObj,
        call = Meteor.wrapAsync(SolrIndex.searchDocuments),
         res = call(qo);

      if (res.length >= 1) return DocumentRetrieval.iFuCoSort(res, 3, 2);
      else return res;
    }
    else {
      var qo = queryObj,
        res1 = LunrIndex.searchDocuments(qo.query),
        res2 = res1.filter((d) => { return d.locale === qo.locale && d.task.indexOf(qo.task) !== -1 && d.domain.indexOf(qo.domain) !== -1 });

      if (res2.length >= 1) return DocumentRetrieval.iFuCoSort(res2, 3, 2);
      else return res2;
    }
  }

  // dgacitua: List all documents on database
  static listAllDocuments() {
    return Documents.find().fetch();
  }

  // dgacitua: Regenerate inverted index
  static reindex() {
    if (Indexer.checkSolrIndex()) {
      let asyncCall = Meteor.wrapAsync(SolrIndex.generate),
              fetch = asyncCall();

      return true;
    }
    else {
      LunrIndex.generate();
      return true;
    }
  }
}