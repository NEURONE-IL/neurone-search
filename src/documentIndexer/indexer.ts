import fs from 'fs';
import path from 'path';
import glob from 'glob';

//import Utils from './utils/serverUtils';
import SolrIndex from '../documentIndexer/indexes/solrIndex';
//import LunrIndex from './indexes/lunrIndex';
import DocumentParser from '../docDownloader/documentParser';
import { DocumentsModel } from '../models/document';
import { IndexDocument } from '../interfaces/indexDocInterface';

//import { Documents } from '../../imports/database/documents/index'; // TODO: define this import

export default class Indexer {
  static checkOldDocumentDefinitions(assetPath: string) {
    try {
      const files = glob.sync(path.join(assetPath, 'documents', '*.json')),
            total = files.length;

      if (total > 0) return true;
      else return false;
    }
    catch (err) {
      console.error(err);
      return false;
    }
  }

  static generateDocumentCollection(assetPath: string) {
    try {
      console.log('Generating Document Collection!');

      const files = glob.sync(path.join(assetPath, 'documents', '*.json')),
            total = files.length;

      files.forEach((file: string, idx: number) => {
        const fn = path.basename(file);
        console.log('Reading document list file!', '[' + (idx+1) + '/' + total + ']', fn);

        const documentList = JSON.parse(fs.readFileSync(file, 'utf-8')); // Carlos: added encoding
        const total2 = documentList.length;

        documentList.forEach((doc: { route: string; title: string; task: string[]; domain: string[]; locale: string; url: string; }, idx2: number) => {
          if (doc.route && doc.title && doc.task && doc.domain && doc.locale && doc.url) {
            const docRoute = path.join(assetPath, doc.route);
            const fn = path.basename(doc.route);

            if (fs.existsSync(docRoute)) {
              const check = DocumentParser.cleanDocument(docRoute, doc.url);

              if (!check) {
                console.log("Error in document cleaner! Called from generateDocumentCollection()");
              }
              
              const docInfo = DocumentParser.getDocumentInfo(docRoute);

              // dgacitua: http://stackoverflow.com/a/171256
              /*
              let docObj = {};
              for (const attrname in docInfo) { 
                docObj[attrname] = docInfo[attrname]; 
              }
              for (const attrname in doc) { if(!Utils.isEmpty(doc[attrname])) docObj[attrname] = doc[attrname]; }
              */

              // Carlos: TS way of merging 2 objects
              const docObj = { ...doc, ...docInfo  }

              //const result = Documents.upsert({ route: docObj.route }, docObj); Carlos: original upsert
              DocumentsModel.findOneAndUpdate({ route: docObj.route }, docObj, {new: true, upsert: true}).then( (result) => {
                // TODO: check this print and see if "numbersAffected" is a thing
                console.log("TODO: DOES numbersAffected EXIST IN THIS RESTULT VARIABLE?:");
                console.log(result);
                if (result.numberAffected > 0) console.log('Document indexed!', '[' + (idx2+1) + '/' + total2 + ']', fn);
                // Carlos: fixed apparent typo in "idx2" (it was id2x (?))
                else console.error('Document errored!', '[' + (idx2+1) + '/' + total2 + ']', fn);
              })
              
                

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
      throw new Error('Cannot index documents!:\n' + err);
    }
  }

  static deleteOrphanDocuments(assetPath: string) {
    try {
      console.log('Removing listed documents without HTML file from database...');

      const syncedList: string[] = [];
      const files = glob.sync(path.join(assetPath, 'documents', '*.json'));

      files.forEach((file: fs.PathOrFileDescriptor) => {
        const documentList = JSON.parse(fs.readFileSync(file, 'utf-8')); // Carlos: added utf-8 encoding

        documentList.forEach((doc: { route: string; }) => {
          const docRoute = path.join(assetPath, doc.route);
          if (fs.existsSync(docRoute)) syncedList.push(doc.route);
        });
      });

      //Documents.remove({ route: { $nin: syncedList }}); 
      DocumentsModel.remove({ route: { $nin: syncedList } });
      
      
      return true;
    }
    catch (err) {
      console.error(err);
      throw new Error('Cannot delete orphan documents! Error:\n' + err);
    }
  }

  static checkSolrIndex() {
    return (!!process.env.NEURONE_SOLR_HOST && !!process.env.NEURONE_SOLR_PORT && !!process.env.NEURONE_SOLR_CORE);
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

  static async indexDocumentAsync(docObj: IndexDocument, callback: (arg0: null, arg1?: boolean | undefined) => void) {
    if (Indexer.checkSolrIndex()) {
      await SolrIndex.index(docObj);
      callback(null, true);
    }
    else {
      //LunrIndex.index(docObj);
      callback(null, true);
    }
  }
}