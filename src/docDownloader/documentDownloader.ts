import fs from 'fs-extra';
import path from 'path';

import DocumentParser from './documentParser';
//import Indexer from './indexer';

import ServerConfigs from './utils/serverConfigs';
import Utils from './utils/serverUtils';

import { DocumentsModel } from '../models/document';
//import { Documents } from '../../imports/database/documents/index'; // TODO: replace with local mongodb  
//import { ImageSearch } from '../database/definitions'; 
import { URL } from 'url';

import readdir from 'readdir-enhanced';
import scrape from 'website-scraper'; // TODO: Check if 5.0.0 can be made compatible with commonjs https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

import { IndexDocument } from './indexDocInterface'
import mongoose from 'mongoose';

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';
const errorObj = { msg: 'ERROR!' };

// dgacitua: Paths for indexable documents
const dirName = path.join('assets', 'downloadedDocs');
const downloadDir = path.join(Utils.getAssetPath(), 'downloadedDocs');

// dgacitua: Paths for preview documents
const previewName = path.join('assets', 'previewDocs');
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
      // Carlos: eliminada función meteor de error
      console.error(err);
      throw new Error('Cannot create download directories!');
    }
  }

  // dgacitua: Automatic document download from web
  static download(docName: string, documentUrl: any, isIndexable: boolean, callback: (arg0: Error | null, arg1?: {
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
    
    const options = {
      urls: [ documentUrl ],
      directory: downloadPath,
      filenameGenerator: 'bySiteStructure', //'byType',
      recursive: false,
      httpResponseHandler: (response: { headers: { [x: string]: string; }; body: any; }) => {
        const htmlBody = response.headers['content-type'].startsWith('text/html') && response.body;
        const re = /((https?:\/\/)(\w+)(.disqus.com))/;
        if (htmlBody && re.test(htmlBody)) {
          const updatedHtmlBody = htmlBody.replace(re, ''); 
          return Promise.resolve(updatedHtmlBody);
        }
        else {
          return Promise.resolve(response.body);
        }
      },
      request: {
        headers: { 'User-Agent': userAgent }
      }
    }

    fs.remove(downloadPath, (err) => {
      if (!err) {
        console.log("BEGIN SCRAPE")
        scrape(options, (err2, res2) => {
          if (!err2) {
            console.log("SCRAPE COMPLETE, ENTERING CALLBACK");
            const response = {
              docName: docName,
              pageUrl: res2 ? res2[0].url : '', // Carlos: added null ckeck
              route: path.join(queryPath, res2 ? res2[0].filename : ''),
              fullPath: path.join(downloadPath, res2 ? res2[0].filename : '')
            };

            callback(null, response);
          }
          else {
            console.error('Error while downloading document', documentUrl, err2);
            callback(err2);
          }
        });  
      }
      else {
        console.error('Error while deleting old document files', documentUrl, err);
        callback(err);
      }
    });
  }

  // TODO: DEFINIR BIEN ESTE PARAMETRO DE ENTRADA (docObj) PARA QUE SEA INDEXABLE POR STRINGS Y ARREGLAR ERROR DE TS, es indexedDocument basicamente
  // TODO: port to solr-client, commenting for now
  // dgacitua: Download and index downloaded document
  
  static index(docObj: IndexDocument, callback: any) {
    const indexedDocument: IndexDocument = { 
      docName: docObj.docName,
      
      title: docObj.title || 'New NEURONE Page',
      locale: docObj.locale || 'en',
      relevant: docObj.relevant || false,
      task: docObj.task || [ 'pilot' ],
      domain: docObj.domain || [ 'pilot' ],
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

        const check = DocumentParser.cleanDocument(res.fullPath, indexedDocument.url);
        const docInfo = DocumentParser.getDocumentInfo(res.fullPath);

        // Carlos: array emulates old behaviour without interface to avoid issues with TS types in indexes
        // TODO: Arreglar para agregar 
        /*
        for (const attrname of ['title', 'indexedBody', 'date', 'docName', 'name', 'route', 'hash']) {

          if (Utils.isEmpty(indexedDocument[attrname as keyof typeof indexedDocument])) {
            indexedDocument[attrname as keyof typeof indexedDocument] = docInfo[attrname as keyof typeof docInfo]
          }
        }
        */
        console.log("RUNNING findOneAndUpdate");
        const result = await DocumentsModel.findOneAndUpdate({ route: indexedDocument.route }, indexedDocument, { new: true, upsert: true });
        console.log("findOneAndUpdate SUCCESSFUL");

        // Carlos: original result, new uses mongoose
        //const result = Documents.upsert({ route: indexedDocument.route }, indexedDocument);

        const urlOrigin = new URL(docObj.url).origin.split('://')[1];
        let directory = path.join(res.fullPath,'../..'),
        currentFolder = path.basename(directory);
        

        while(currentFolder != docObj.docName){
          directory = path.join(directory, '../')
          currentFolder = path.basename(directory)
        }

        readdir(directory,{filter: getImg , deep: true}, function(err, files){
          if(err){
            return console.log(err)
          }
          files.forEach(function(file: string){
            const image = {
              docName: path.basename(file),
              title: path.basename(file, path.extname(file)),
              locale: docObj.locale || 'en',
              relevant: docObj.relevant || false,
              task: docObj.task ,
              domain: docObj.domain ,
              keywords: docObj.keywords || [],
              date: docObj.date || Utils.getDate(),
              url: urlOrigin,
              searchSnippet: docObj.searchSnippet || '',
              indexedBody: 'test',
              // Carlos: original that used meteor-mongodb
              //route: Documents.findOne({ route: indexedDocument.route })._id,
              route: DocumentsModel.findOne({ route: indexedDocument.route }),
              img: path.join(res.route,'../..')+'/'+file,
              type: 'image'
            }
            // TODO: reimplement ImageSearch
            // ImageSearch.upsert({ route: file }, image)
          })
        })

        // TODO: check if numberAffected works
        if (result.numberAffected > 0) { console.log("todo: delete this log ")} // <- TODO: delete closing brace when uncommenting
          // Carlos: original
          //const doc = Documents.findOne({ route: indexedDocument.route });
          const doc = DocumentsModel.findOne({ route: indexedDocument.route });
          /* TODO: port to solr-client
          Indexer.indexDocumentAsync(doc, (err2: any, res2: any) => {
            if (!err2) {
              callback(null, doc);  
            }
            else {
              console.error('Error while indexing document', docObj.url, err2);
              callback(err2);
            }
          });
        }
        else {
          console.error('Error while saving document to Database', docObj.url, errorObj);
          callback(errorObj);
        }*/
      }
      else {
        callback(err);
      }
    }));
  }

  static fetch(docObj: IndexDocument, callback: any) {
    console.log('Attempting to download document!');

    if (!Utils.isEmptyObject(docObj) && Utils.isString(docObj.docName) && Utils.isString(docObj.url)) {
      console.log('Document URL', docObj.url);

      DocumentDownloader.index(docObj, ((err: any, res: any) => {
        if (!err) {
          console.log('Document downloaded and indexed successfully!', docObj.url);
          callback(null, res);
        }
        else {
          callback(errorObj);
        }
      }));
    }
    else {
      console.error('Document object is invalid!', docObj.url, errorObj);
      callback(errorObj);
    }
  }

  static preview(docObj: { docName: string; url: any; title: any; locale: any; relevant: any; task: any; domain: any; keywords: any; date: any; maskedUrl: any; searchSnippet: any; }, callback: any) {
    console.log('Attempting to preview document!');

    if (!Utils.isEmptyObject(docObj) && Utils.isString(docObj.docName) && Utils.isString(docObj.url)) {
      console.log('Document URL', docObj.url);

      const document: IndexDocument = {
        //_id: '<preview>',
        docName: docObj.docName,
        title: docObj.title || 'New NEURONE Page',
        locale: docObj.locale || 'en',
        relevant: docObj.relevant || false,
        task: docObj.task || [ 'preview' ],
        domain: docObj.domain || [ 'preview' ],
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
        // Carlos: added res check to avoid undefine TS conficts
        if (!err && res) {
          document.route = res.route;

          const check = DocumentParser.cleanDocument(res.fullPath, document.url);
          const docInfo = DocumentParser.getDocumentInfo(res.fullPath);
  
          // Carlos: array emulates old behaviour without interface to avoid issues with TS types in indexes
          // Carlos: TODO: arreglar una vez que esté corriendo programa
          /*
          for (const attrname of ['title', 'indexedBody', 'date', 'docName', 'name', 'route', 'hash']) {

            if (Utils.isEmpty(document[attrname])) {
              document[attrname] = docInfo[attrname as keyof typeof docInfo]
            }
          }
          */
          console.log('Document downloaded for preview successfully!', docObj.url);

          callback(null, document);
        }
        else {
          callback(errorObj);
        }
      }));
    }
    else {
      console.error('Document object is invalid!', docObj.url, errorObj);
      callback(errorObj);
    }
  }
}
