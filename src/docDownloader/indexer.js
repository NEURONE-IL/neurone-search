import fs from 'fs';
import path from 'path';
import glob from 'glob';

import Utils from './utils/serverUtils';
import SolrIndex from './indexes/solrIndex';
import LunrIndex from './indexes/lunrIndex';
import DocumentParser from './documentParser';

import { Documents } from '../../imports/database/documents/index';

export default class Indexer {
  static checkOldDocumentDefinitions(assetPath) {
    try {
      let files = glob.sync(path.join(assetPath, 'documents', '*.json')),
          total = files.length;

      if (total > 0) return true;
      else return false;
    }
    catch (err) {
      console.error(err);
      return false;
    }
  }

  static generateDocumentCollection(assetPath) {
    try {
      console.log('Generating Document Collection!');

      let files = glob.sync(path.join(assetPath, 'documents', '*.json')),
          total = files.length;

      files.forEach((file, idx, arr) => {
        var fn = path.basename(file);
        console.log('Reading document list file!', '[' + (idx+1) + '/' + total + ']', fn);

        var documentList = JSON.parse(fs.readFileSync(file));
        var total2 = documentList.length;

        documentList.forEach((doc, idx2, arr2) => {
          if (doc.route && doc.title && doc.task && doc.domain && doc.locale && doc.url) {
            var docRoute = path.join(assetPath, doc.route);
            var fn = path.basename(doc.route);

            if (fs.existsSync(docRoute)) {
              var check = DocumentParser.cleanDocument(docRoute, doc.url);

              var docObj = {};
              var docInfo = DocumentParser.getDocumentInfo(docRoute);

              // dgacitua: http://stackoverflow.com/a/171256
              for (var attrname in docInfo) { docObj[attrname] = docInfo[attrname]; }
              for (var attrname in doc) { if(!Utils.isEmpty(doc[attrname])) docObj[attrname] = doc[attrname]; }

              var result = Documents.upsert({ route: docObj.route }, docObj);
                
              if (result.numberAffected > 0) console.log('Document indexed!', '[' + (idx2+1) + '/' + total2 + ']', fn);
              else console.error('Document errored!', '[' + (id2x+1) + '/' + total2 + ']', fn);
            }
            else {
              console.warn('File doesn\'t exist! Skipping!', fn);
            }
          }
          else {
            console.warn('Wrong document format detected in list');
          }
        });
      });

      return true;
    }
    catch (err) {
      console.error(err);
      throw new Meteor.Error(523, 'Cannot index documents!', err);
    }
  }

  static deleteOrphanDocuments(assetPath) {
    try {
      console.log('Removing listed documents without HTML file from database...');

      let syncedList = [];
      let files = glob.sync(path.join(assetPath, 'documents', '*.json'));

      files.forEach((file, idx, arr) => {
        var documentList = JSON.parse(fs.readFileSync(file));

        documentList.forEach((doc, idx2, arr2) => {
          var docRoute = path.join(assetPath, doc.route);
          if (fs.existsSync(docRoute)) syncedList.push(doc.route);
        });
      });

      Documents.remove({ route: { $nin: syncedList }});
      
      return true;
    }
    catch (err) {
      console.error(err);
      throw new Meteor.Error(524, 'Cannot delete orphan documents!', err);
    }
  }

  static checkSolrIndex() {
    return (!!process.env.NEURONE_SOLR_HOST && !!process.env.NEURONE_SOLR_PORT && !!process.env.NEURONE_SOLR_CORE);
  }

  static loadInvertedIndex() {
    try {
      if (Indexer.checkSolrIndex()) {
        let fn = Meteor.wrapAsync(SolrIndex.load),
           res = fn();

        return true;
      }
      else {
        LunrIndex.load();
        return true;
      }
    }
    catch (err) {
      console.error(err);
      throw new Meteor.Error(525, 'Cannot load document index!', err);
    }
  }

  static generateInvertedIndex() {
    try {
      if (Indexer.checkSolrIndex()) {
        let fn = Meteor.wrapAsync(SolrIndex.generate),
           res = fn();

        return true;
      }
      else {
        LunrIndex.generate();
        return true;
      }
    }
    catch (err) {
      console.error(err);
      throw new Meteor.Error(526, 'Cannot generate document index!', err);
    }
  }

  static indexDocumentAsync(docObj, callback) {
    if (Indexer.checkSolrIndex()) {
      SolrIndex.index(docObj, (err, res) => {
        if (!err) {
          callback(null, true);
        }
        else {
          callback(err);
        }
      });
    }
    else {
      LunrIndex.index(docObj);
      callback(null, true);
    }
  }
}