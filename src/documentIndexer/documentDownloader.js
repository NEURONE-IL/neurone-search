import fs from 'fs-extra';
import path from 'path';
import scrape from 'website-scraper';

import DocumentParser from './documentParser';
import Indexer from './indexer';

import ServerConfigs from '../utils/serverConfigs';
import Utils from '../utils/serverUtils';

import { Documents } from '../../imports/database/documents/index';
import { ImageSearch } from '../database/definitions';
import { URL } from 'url';

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';
const errorObj = { msg: 'ERROR!' };

// dgacitua: Paths for indexable documents
const dirName = path.join('assets', 'downloadedDocs');
const downloadDir = path.join(Utils.getAssetPath(), 'downloadedDocs');

// dgacitua: Paths for preview documents
const previewName = path.join('assets', 'previewDocs');
const previewDir = path.join(Utils.getAssetPath(), 'previewDocs');

export default class DocumentDownloader {
  // dgacitua: Create download directory (on Asset path) for automatic document downloading
  static createDownloadDirs() {
    try {
      fs.ensureDirSync(downloadDir);
      fs.ensureDirSync(previewDir);
    }
    catch (err) {
      console.log(err);
      throw new Meteor.Error(500, 'Cannot create download directories!', err);
    }
  }

  // dgacitua: Automatic document download from web
  static download(docName, documentUrl, isIndexable, callback) {
    let downloadPath, queryPath;

    if (isIndexable) {
      downloadPath = path.join(downloadDir, docName);
      queryPath = path.join(dirName, docName);
    }
    else {
      downloadPath = path.join(previewDir, 'currentDocument');
      queryPath = path.join(previewName, 'currentDocument');
    }
    
    let options = {
      urls: [ documentUrl ],
      directory: downloadPath,
      filenameGenerator: 'bySiteStructure', //'byType',
      recursive: false,
      httpResponseHandler: (response) => {
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

    fs.remove(downloadPath, (err, res) => {
      if (!err) {
        scrape(options, (err2, res2) => {
          if (!err2) {
            let response = {
              docName: docName,
              pageUrl: res2[0].url,
              route: path.join(queryPath, res2[0].filename),
              fullPath: path.join(downloadPath, res2[0].filename)
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

  // dgacitua: Download and index downloaded document
  static index(docObj, callback) {
    let indexedDocument = {
      docName: docObj.docName,
      title: docObj.title || 'New NEURONE Page',
      locale: docObj.locale || 'en',
      relevant: docObj.relevant || false,
      task: docObj.task || [ 'pilot' ],
      domain: docObj.domain || [ 'pilot' ],
      keywords: docObj.keywords || [],
      date: docObj.date || Utils.getDate(),
      url: docObj.maskedUrl || docObj.url || '',
      searchSnippet: docObj.searchSnippet || '',
      indexedBody: ''
    };

    DocumentDownloader.download(docObj.docName, docObj.url, true, Meteor.bindEnvironment((err, res) => {
      if (!err) {
        indexedDocument.route = res.route;

        let check = DocumentParser.cleanDocument(res.fullPath, indexedDocument.url);
        let docInfo = DocumentParser.getDocumentInfo(res.fullPath);

        for (var attrname in docInfo) { if(Utils.isEmpty(indexedDocument[attrname])) indexedDocument[attrname] = docInfo[attrname]; }

        let result = Documents.upsert({ route: indexedDocument.route }, indexedDocument);

        var readdir = require('readdir-enhanced'),
        directory = path.join(res.fullPath,'../..'),
        currentFolder = path.basename(directory),
        urlOrigin = new URL(docObj.url).origin.split('://')[1];

        while(currentFolder != docObj.docName){
          directory = path.join(directory, '../')
          currentFolder = path.basename(directory)
        }

        function getImg(stats){
          return stats.isFile() && stats.size > 10240 && (stats.path.indexOf('.jpg') >= 0 || stats.path.indexOf('.png') >= 0 || stats.path.indexOf('.jpeg') >= 0)
        }

        readdir(directory,{filter: getImg , deep: true}, function(err, files){
          if(err){
            return console.log(err)
          }
          files.forEach(function(file){
            var image = {
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
              route: Documents.findOne({ route: indexedDocument.route })._id,
              img: path.join(res.route,'../..')+'/'+file,
              type: 'image'
            }
            ImageSearch.upsert({ route: file }, image)
          })
        })

        if (result.numberAffected > 0) {
          let doc = Documents.findOne({ route: indexedDocument.route });

          Indexer.indexDocumentAsync(doc, (err2, res2) => {
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
        }
      }
      else {
        callback(err);
      }
    }));
  }

  static fetch(docObj, callback) {
    console.log('Attempting to download document!');

    if (!Utils.isEmptyObject(docObj) && Utils.isString(docObj.docName) && Utils.isString(docObj.url)) {
      console.log('Document URL', docObj.url);

      DocumentDownloader.index(docObj, Meteor.bindEnvironment((err, res) => {
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

  static preview(docObj, callback) {
    console.log('Attempting to preview document!');

    if (!Utils.isEmptyObject(docObj) && Utils.isString(docObj.docName) && Utils.isString(docObj.url)) {
      console.log('Document URL', docObj.url);

      let document = {
        _id: '<preview>',
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
        indexedBody: ''
      };

      DocumentDownloader.download(docObj.docName, docObj.url, false, Meteor.bindEnvironment((err, res) => {
        if (!err) {
          document.route = res.route;

          let check = DocumentParser.cleanDocument(res.fullPath, document.url);
          let docInfo = DocumentParser.getDocumentInfo(res.fullPath);
  
          for (var attrname in docInfo) { if(Utils.isEmpty(document[attrname])) document[attrname] = docInfo[attrname]; }

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

// dgacitua: Minimal example of use
/*
let obj1 = { docName: 'techcrunch', url: 'https://techcrunch.com/' };
let obj2 = { docName: 'wiki-en', url: 'https://en.wikipedia.org/'};

DocumentDownloader.fetch(obj1, (err, res) => { if(!err) console.log('ok1') });
DocumentDownloader.fetch(obj2, (err, res) => { if(!err) console.log('ok2') });
*/