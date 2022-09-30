import fs from 'fs-extra';
import path from 'path';

import DocumentParser from './documentParser.js';
import Indexer from '../documentIndexer/indexer.js';

import Utils from './utils/serverUtils.js';

import { DocumentsModel } from '../models/document.js';
//import { Documents } from '../../imports/database/documents/index'; // TODO: replace with local mongodb  
//import { ImageSearch } from '../database/definitions'; 
import { URL } from 'url';

import readdir from 'readdir-enhanced';
import scrape from 'website-scraper'; // https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

import { IndexDocument } from '../interfaces/indexDocInterface.js'

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';
const errorObj = { msg: 'ERROR!' };

// dgacitua: Paths for indexable documents
const dirName = path.join('downloadedDocs');
const downloadDir = path.join(Utils.getAssetPath(), 'downloadedDocs');

// dgacitua: Paths for preview documents
const previewName = path.join('previewDocs');
const previewDir = path.join(Utils.getAssetPath(), 'previewDocs');

// Carlos: moved from middle of class
function getImg(stats: { isFile: () => any; size: number; path: string | string[]; }){
  return stats.isFile() && stats.size > 10240 && (stats.path.indexOf('.jpg') >= 0 || stats.path.indexOf('.png') >= 0 || stats.path.indexOf('.jpeg') >= 0)
}

export class DocumentDownloader {

  static createDownloadDirs() {
    try {
      fs.ensureDirSync(downloadDir);
      fs.ensureDirSync(previewDir);
    }
    catch (err) {
      console.error(err);
      throw new Error('Cannot create download directories!');
    }
  }

  // dgacitua: Automatic document download from web
  static download(docName: string, documentUrl: string, isIndexable: boolean, callback: (arg0: Error | unknown | null, arg1?: {
        docName: string; pageUrl: string; // Carlos: added null ckeck
        route: string; fullPath: string;
      } | undefined) => void) {
    let downloadPath: string, queryPath: string;

    if (isIndexable) {
      downloadPath = path.join(downloadDir, docName);
      queryPath = path.join(dirName, docName);
    }
    else {
      downloadPath = path.join(previewDir, 'currentDocument');
      queryPath = path.join(previewName, 'currentDocument');
    }
    
    const options: scrape.Options = {
      urls: [ documentUrl ],
      directory: downloadPath,
      filenameGenerator: 'bySiteStructure', //'byType',
      recursive: false,
      request: {
        headers: { 'User-Agent': userAgent }
      }
    }

    fs.remove(downloadPath, async (err) => {
      if (!err) {
        console.log("Starting website download...");
        try {
          const res2 = await scrape(options);
            console.log("Download complete.");
              const response = {
                docName: docName,
                pageUrl: res2 ? res2[0].url : '',
                route: path.join(queryPath, res2 ? res2[0].filename : ''),
                fullPath: path.join(downloadPath, res2 ? res2[0].filename : '')
              };

              callback(null, response); 
        } catch (err: unknown) {
          console.error('Error while downloading document', documentUrl, err);
          callback(err);
        }
      }
      else {
        console.error('Error while deleting old document files', documentUrl, err);
        callback(err);
      }
    });
  }

  // dgacitua: Download and index downloaded document
  static index(docObj: IndexDocument, callback: any) {
    let indexedDocument: IndexDocument = { 
      docName: docObj.docName,
      title: docObj.title || '',
      locale: docObj.locale || 'en',
      relevant: docObj.relevant || false,
      tags: docObj.tags || [],
      keywords: docObj.keywords || [],
      date: docObj.date || Utils.getDate(),
      maskedUrl: docObj.maskedUrl,
      url: docObj.maskedUrl || docObj.url || '',
      searchSnippet: docObj.searchSnippet || '',
      indexedBody: '',
      route: '',
      hash: '',
    };

    DocumentDownloader.download(docObj.docName, docObj.url, true, (async (err, res) => {
      // Carlos: agregada verificación de existencia de res para evitar posibles conflictos con "undefined" en TS
      if (!err && res) {
        indexedDocument.route = res.route;
        console.log("FULL PATH\n", res.fullPath);

        if(!DocumentParser.cleanDocument(res.fullPath)){
          console.error("WARNING: Document " + res.fullPath + " has NOT been cleaned properly, it might have scripts, links and other things still active.");
        }

        indexedDocument = DocumentParser.getDocumentInfo(res.fullPath, indexedDocument);
        DocumentParser.attachNeuroneIframeLogger(res.fullPath);

        // save to database
        console.log("Saving document to database...");
        let result;
        try {
          result = await DocumentsModel.findOneAndUpdate({ route: indexedDocument.route }, indexedDocument, { new: true, upsert: true, rawResult: true });
        } catch (err) {
          console.error("Error saving document to database:\n", err);
          callback(err, null);
          return;
        }
        console.log("Done. Result:\n", result);


        const urlOrigin = new URL(docObj.url).origin.split('://')[1];
        let directory = path.join(res.fullPath,'../..'),
        currentFolder = path.basename(directory);
        

        while(currentFolder != docObj.docName){
          directory = path.join(directory, '../');
          currentFolder = path.basename(directory);
        }

        readdir.readdirAsync(directory,{filter: getImg , deep: true}, function(err, files){
          if(err){
            return console.log(err)
          }
          files.forEach(function(file: string){
            const image = {
              docName: path.basename(file),
              title: path.basename(file, path.extname(file)),
              locale: docObj.locale || 'en',
              relevant: docObj.relevant || false,
              tags: docObj.tags || [],
              keywords: docObj.keywords || [],
              date: docObj.date || Utils.getDate(),
              url: urlOrigin,
              searchSnippet: docObj.searchSnippet || '',
              indexedBody: 'test',
              route: DocumentsModel.findOne({ route: indexedDocument.route }),
              img: path.join(res.route,'../..')+'/'+file,
              type: 'image'
            }
            // TODO: reimplement ImageSearch
            // ImageSearch.upsert({ route: file }, image)
          })
        })

        // ok is 1 if there is no error
        if (result.ok === 1) {

          DocumentsModel.findOne({ route: indexedDocument.route }).then((doc) => {
            if (doc) {
              Indexer.indexDocumentAsync(doc, (err2) => {
                if (!err2) {
                  callback(null, doc);  
                }
                else {
                  console.error('Error while indexing document', docObj.url, err2);
                  callback(err2, null);
                }
              });
            }
          }).catch( (err: Error) => {
            console.error(err);
            callback(err, null);
          });

        }
        else {
          console.error('Error while saving document to Database', docObj.url, errorObj);
          callback(errorObj);
        }
      }
      else {
        callback(err);
      }
    }));
  }

  // fetch() -> index() -> download()
  static fetch(docObj: IndexDocument, callback: (err: any, res: any) => void) {
    console.log('Attempting to download document!');
    console.log('Document URL', docObj.url);

    DocumentDownloader.index(docObj, ((err: any, res: any) => {
      if (!err) {
        console.log('Document downloaded and indexed successfully!', docObj.url);
        callback(null, res);
      }
      else {
        callback(errorObj, null);
      }
    }));

  }

  // preview() -> download()
  static preview(docObj: IndexDocument, callback: (error: any, document?: any) => void) {
    console.log('Attempting to preview document!');
    console.log('Document URL', docObj.url);

    let document: IndexDocument = {
      //_id: '<preview>',
      docName: docObj.docName,
      title: docObj.title || 'New NEURONE Page',
      locale: docObj.locale || 'en',
      relevant: docObj.relevant || false,
      tags: docObj.tags || [],
      keywords: docObj.keywords || [],
      date: docObj.date || Utils.getDate(),
      url: docObj.maskedUrl || docObj.url || '',
      searchSnippet: docObj.searchSnippet || '',
      indexedBody: '',
      // Carlos: added to fit new interface
      route: '',
      maskedUrl: '',
      hash: '',
    };

    DocumentDownloader.download(docObj.docName, docObj.url, false, ((err, res) => {
      if (!err && res) {
        document.route = res.route;

        if (!DocumentParser.cleanDocument(res.fullPath)){
          console.error("WARNING: Document " + res.fullPath + " has NOT been cleaned properly, it might have scripts, links and other things still active.");
        }
        document = DocumentParser.getDocumentInfo(res.fullPath, document);

        console.log('Document downloaded for preview successfully!', docObj.url);

        callback(null, document);
      }
      else {
        callback(errorObj);
      }
    }));
    
  }

  /**
   * deletes the document in the database and its linked folder with webpage in local storage
   * @param docName name of the document in the database and folder name
   * @returns report of deletion of document in database and folder in local storage
   */
  static async delete(docName: string) {

    const log: string[] = [];

    // delete from database
    console.log("Deleting document: " + docName + "...");
    try {
      const deletedRes = await DocumentsModel.deleteOne({docName: docName});
      if (deletedRes.deletedCount === 1) {
        console.log("Deleted Successfully from database.");
        log.push("Deleted Successfully from database.");
      } else if (deletedRes.deletedCount === 0) {
        log.push("Document not found in database.")
        console.log("Document not found in database.");
      }
    } catch (e) {
      console.error(e);
    }

    // delete from folders
    console.log("Deleting folder with webpage: " + docName);
    try {
      fs.rmSync((process.env.NEURONE_ASSET_PATH || "./assets/") + dirName  + "/" + docName, {recursive: true} );
      console.log("Deleted successfully");
      log.push("Webpage deleted successfully from local storage.");
    } catch (err) {
      console.error("Error when deleting folder " + docName + "\n", err);
      log.push("Could not delete folder with webpage in storage. It may not exist.");
    }

    // reindex
    Indexer.generateInvertedIndex();
    
    return log;
  }
}