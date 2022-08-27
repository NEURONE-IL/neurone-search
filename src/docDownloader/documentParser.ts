// Carlos: ported to TS
import fs from 'fs';
import { URL } from 'url'; // updated to use the WHATWG API
import path from 'path';
import iconv from 'iconv';
import charset from 'charset';
import sha from 'sha';
import { load } from 'cheerio';
import { htmlToText } from 'html-to-text';
import { pascalCase } from 'change-case';
import { IndexDocument } from '../interfaces/indexDocInterface.js';

export default class DocumentParser {
  static getHtmlAsText(documentPath: string) {
    try {
      const relPath = documentPath,
        htmlFile = this.readFile(relPath),
        htmlString = htmlFile.toString();

      const options = {
        wordwrap: false,
        uppercaseHeadings: false,
        ignoreHref: true,
        ignoreImage: true
      };

      const extractedText = htmlToText(htmlFile, options) || '';
      return this.escapeString(extractedText);
    }
    catch (e) {
      console.error(e);
      return '';
    }
  }

  static getHtmlTitle(documentPath: string, callback?: CallableFunction) {
    try {
      const relPath = documentPath,
         htmlFile = this.readFile(relPath),
       htmlString = htmlFile.toString(),
                $ = load(htmlString),
            title = $('head > title').text() || $('title').text() || $('h1').first().text() || 'Untitled Document';

      //console.log(relPath, title);
      return title;
    }
    catch (e) {
      console.error(e);
      return '';
    }
  }

  static getHtmlDocname(documentPath: string) {
    try {
      const relPath = documentPath,
            fileExt = path.extname(relPath),
            fileName = path.basename(relPath, fileExt),
            route = pascalCase(fileName) // old: uppercamelcase(fileName);

      //console.log(relPath, route);
      return route;
    }
    catch (e) {
      console.error(e);
      return '';
    }
  }

  static getHtmlRoute(documentPath: string) {
    try {
      const relPath = documentPath,
         fileName = path.basename(relPath);

      //console.log(relPath, fileName);
      return fileName;
    }
    catch (e) {
      console.error(e);
      return '';
    }
  }

  static getHash(documentPath: string) {
    try {
      return sha.getSync(documentPath, { algorithm: 'sha256' });
    }
    catch (e) {
      console.error(e);
      return '';
    }
  }

  static cleanDocument(documentPath: string) {
    try {
      const relPath = documentPath,
          fileDir = path.dirname(relPath),
          fileExt = path.extname(relPath),
         fileName = path.basename(relPath, fileExt),
      newFilename = fileName + fileExt;

      const htmlFile = this.readFile(relPath),
                 $ = load(htmlFile);

      // dgacitua: Remove onclick attribute from anchor tags
      $('a').each((i: any, elem: any) => {
        $(elem).removeAttr('onclick');
      });

      // dgacitua: Remove all external links
      $('a[href]').each((_i, elem: any) => {
        $(elem).attr('href', 'javascript:void(0)');
        $(elem).removeAttr('target');
      });

      // dgacitua: Remove all iframes and frames
      $('iframe,frame').each((_i, elem: any) => {
        $(elem).remove();
      });

      // dgacitua: Remove javascript
      $('script').each((_i, elem: any) => {
        $(elem).remove();
      });

      // dgacitua: Remove onclick attribute from all tags
      $('[onclick]').each((_i, elem: any) => {
        $(elem).removeAttr('onclick');
      });

      // dgacitua: Disable input elements
      $('input').each((_i, elem: any) => {
        $(elem).removeAttr('id');
        $(elem).attr('disabled', 'true');
      });

      // dgacitua: Disable button elements
      $('button').each((_i, elem: any) => {
        $(elem).removeAttr('id');
        $(elem).attr('disabled', 'true');
      });

      // dgacitua: Disable submit
      $('[type="submit"]').each((_i, elem: any) => {
        $(elem).removeAttr('type');
      });

      // dgacitua: Disable form action
      $('form').each((_i, elem: any) => {
        $(elem).removeAttr('action');
        $(elem).removeAttr('method');
      });

      const cleanedHtml = $.html();

      fs.writeFileSync(path.join(fileDir, newFilename), cleanedHtml);
    
      return true;

    }
    catch (e) {
      console.error("Error while downloading document:\n", e);
      return false;
    }
  }

  /**
   * attach the neurone utilities script to enable features inside iframes like logging mouse/keyboard/scroll movement and text snippets
   * @param path html main page route
   */
  static attachNeuroneIframeLogger(path: fs.PathOrFileDescriptor) {
    console.log("THE PATH OF THE HTML IS: ", path);

    let scriptRef = '\n<!--Neurone iframe utilities reference added by Neurone-Search-->\n';
    scriptRef = scriptRef + '<html><script src="/neurone-iframe-util.js"></script></html>\n';

    fs.appendFile(path, scriptRef, (err) => {
      if (err) {
        console.error("Error while attaching neurone utilities script to page:");
        console.error(err);
        return;
      }

      console.log("Successfully attached the utils script to: ", path);
      return;

    });

  } 

  static readFile(path: fs.PathOrFileDescriptor) {
    try {
      // dgacitua: http://stackoverflow.com/a/18711982
      const htmlBuffer = fs.readFileSync(path),
            htmlString = htmlBuffer.toString(),
            // Carlos: encoding changed to fit typescript's types (hope it still works)
            encoding = charset(htmlString, htmlBuffer);   // || jschardet.detect(htmlString).encoding.toLowerCase();

      if (encoding === 'utf-8' || encoding === 'utf8' || !encoding) {
        return htmlString;
      }
      else {
        const ic = new iconv.Iconv(encoding, 'UTF-8//TRANSLIT//IGNORE'),
              buf = ic.convert(htmlBuffer),
              str = buf.toString('utf-8');

        return str;
      }
    }
    catch (e) {
      console.error(e);
      return '';
    }
  }

  static escapeString(str: string) {
    // dgacitua: http://stackoverflow.com/a/9204218
    return str
      .replace(/[\\]/g, ' ')
      .replace(/["]/g, ' ')
      .replace(/[/]/g, ' ')
      .replace(/[\b]/g, ' ')
      .replace(/[\f]/g, ' ')
      .replace(/[\n]/g, ' ')
      .replace(/[\r]/g, ' ')
      .replace(/[\t]/g, ' ');
  }

  static getDomainUrl(originUrl: string) {
    //if (Utils.isString(originUrl)) return url.parse(originUrl).hostname.replace(/^(www\.)(.+)/i, '$2'); legacy url api
    //if (Utils.isString(originUrl)) return new URL(originUrl).hostname.replace(/^(www\.)(.+)/i, '$2');

    // Carlos: adapted from original 'Utils
    if (typeof originUrl === 'string') {
      console.log("[getDomainUrl:] originUrl is a string.");
      return new URL(originUrl).hostname.replace(/^(www\.)(.+)/i, '$2');
    } else {
      console.log("[getDomainUrl:] originUrl is NOT a string.");
      return '';
    }
  }

  static getDocumentInfo(documentPath: string, documentToUpdate: IndexDocument) {

    documentToUpdate.title = documentToUpdate.title === '' ? this.getHtmlTitle(documentPath) : documentToUpdate.title;
    documentToUpdate.indexedBody = this.getHtmlAsText(documentPath);
    documentToUpdate.hash = this.getHash(documentPath);
    documentToUpdate.date = (new Date()).toString();

    //console.log('Document Parsed!', obj.route);
    return documentToUpdate;
  }
}