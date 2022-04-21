// Carlos: originally a JS file, updated to be TS

import fs from 'fs';
import { URL } from 'url'; // Carlos: updated to use the WHATWG API
import path from 'path';
import iconv from 'iconv';
import charset from 'charset';
import sha from 'sha';
import cheerio from 'cheerio';
import htmlToText from 'html-to-text';
import { pascalCase } from 'change-case'; // Carlos: replacing the older package 'uppercamelcase'
import { IndexDocument } from './indexDocInterface';

//import Utils from './utils/serverUtils';

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

      const extractedText = htmlToText.fromString(htmlFile, options) || '';
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
                $ = cheerio.load(htmlString),
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

  static cleanDocument(documentPath: string, originUrl: string) {
    try {
      const relPath = documentPath,
          fileDir = path.dirname(relPath),
          fileExt = path.extname(relPath),
         fileName = path.basename(relPath, fileExt),
      newFilename = fileName + fileExt,
       pageDomain = this.getDomainUrl(originUrl);

      const htmlFile = this.readFile(relPath),
        htmlString = htmlFile.toString(),
                 $ = cheerio.load(htmlFile);

      const parseClass = (classValue: string) => { return classValue.split(' ') };
      
      // dgacitua: Remove all elements with ad-like ids
      /*
      $('div[id],aside[id],section[id]').each((i, elem) => {
        blockedIds.some((id) => {
          if (!!id && $(elem).is(`#${id}`)) {
            console.log('blockedid', id);
            $(elem).remove();
            return true;
          }
        });          
      });
      */
      
      // dgacitua: Remove all elements with ad-like classes
      /*
      $('div[class],aside[class],section[class]').each((i, elem) => {
        blockedClasses.some((className) => {
          if (!!className && $(elem).is(`.${className}`)) {
            console.log('blockedclass', className);
            $(elem).remove();
            return true;
          }
        });
      });
      */

      // dgacitua: Remove onclick attribute from anchor tags
      $('a').each((_i: any, elem: any) => {
        $(elem).removeAttr('onclick');
      });

      // dgacitua: Remove all external links
      $('a[href]').each((i: any, elem: any) => {
        $(elem).attr('href', 'javascript:void(0)');
        $(elem).removeAttr('target');
      });

      // dgacitua: Remove all iframes and frames
      $('iframe,frame').each((i: any, elem: any) => {
        $(elem).remove();
      });

      // dgacitua: Remove javascript
      $('script').each((i: any, elem: any) => {
        $(elem).remove();
      });

      // dgacitua: Remove onclick attribute from all tags
      $('[onclick]').each((i: any, elem: any) => {
        $(elem).removeAttr('onclick');
      });

      // dgacitua: Disable input elements
      $('input').each((i: any, elem: any) => {
        $(elem).removeAttr('id');
        $(elem).attr('disabled', 'true');
      });

      // dgacitua: Disable button elements
      $('button').each((i: any, elem: any) => {
        $(elem).removeAttr('id');
        $(elem).attr('disabled', 'true');
      });

      // dgacitua: Disable submit
      $('[type="submit"]').each((i: any, elem: any) => {
        $(elem).removeAttr('type');
      });

      // dgacitua: Disable form action
      $('form').each((i: any, elem: any) => {
        $(elem).removeAttr('action');
        $(elem).removeAttr('method');
      });

      const cleanedHtml = $.html();

      fs.writeFileSync(path.join(fileDir, newFilename), cleanedHtml);
    
      return true;

      /*
      const blockedIds = [ 'disqus', 'taboola', 'cresta', 'pubexchange', 'newsletter', 'sociales' ];
      const blockedClasses = [ 'share', 'entry-share', 'textwidget', 'widget_ad', 'fb-comments', 'fb-social-plugin', 'fb-login-button', 'fb_iframe_widget', 'leikiwidget' ];
      const blockedElements = [ 'iframe', 'object' ];
      const adRemover = (elem) => {
        // dgacitua: Remove all onclick events
        $(elem).removeAttr('onclick');
        
        // dgacitua: Minimal ad filter by div id
        if (Utils.startsWithArray($(elem).attr('id'), blockedIds)) {
          $(elem).remove();
          return true;
        }
        // dgacitua: Minimal ad filter by div class
        blockedClasses.some((el, idx, arr) => {
          if ($(elem).is(`.${el}`)) {
            $(elem).remove();
            return true;
          }
        });
        return false;
      };
      const specialElementsRemover = (elementArray) => {
        elementArray.forEach((el, idx, arr) => {
          $(el).each((i, elem) => { $(elem).remove() });
        });
      };
      specialElementsRemover(blockedElements);
      
      // dgacitua: Remove onclick attribute from anchor tags
      $('a').each((i, elem) => {
        $(elem).removeAttr('onclick');
      });
      // dgacitua: Remove all external links
      $('a[href]').each((i, elem) => {
        $(elem).attr('href', 'javascript:void(0)');
        $(elem).removeAttr('target');
      });
      $('div').each((i, elem) => { adRemover(elem) });
      $('aside').each((i, elem) => { adRemover(elem) });
      $('p script').each((i, elem) => {
        if ($(elem).attr('type') === 'text/javascript') {
          $(elem).remove();
        }
      });
      $('select').each((i, elem) => {
        $(elem).removeAttr('id');
        $(elem).removeAttr('onchange');
      });
      // dgacitua: Remove javascript
      $('script').each((i, elem) => {
        $(elem).removeAttr('src');
        // if ($(elem).attr('type') === 'text/javascript' || $(elem).attr('type') === 'application/javascript') $(elem).remove();
      });
      // dgacitua: Disable input elements
      $('input').each((i, elem) => {
        $(elem).removeAttr('id');
        $(elem).attr('disabled', 'true');
      });
      // dgacitua: Disable button elements
      $('button').each((i, elem) => {
        $(elem).removeAttr('id');
        $(elem).attr('disabled', 'true');
      });
      // dgacitua: Disable submit
      $('input[type="submit"]').each((i, elem) => {
        $(elem).removeAttr('type');
      });
      $('button[type="submit"]').each((i, elem) => {
        $(elem).removeAttr('type');
      });
      // dgacitua: Disable form action
      $('form').each((i, elem) => {
        $(elem).removeAttr('action');
        $(elem).removeAttr('method');
      });
      */
    }
    catch (e) {
      console.error(e);
      return false;
    }
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

  static getDocumentInfo(documentPath: string) {
    const obj: IndexDocument = {
      //_id: '',
      title: this.getHtmlTitle(documentPath),
      indexedBody: this.getHtmlAsText(documentPath),
      date: (new Date()).toString(), // Carlos: changed to be used from here and not serverUtils
      docName: this.getHtmlDocname(documentPath),
      route: this.getHtmlRoute(documentPath),
      hash: this.getHash(documentPath),
      // Carlos: added to fit new obj interface
      locale: '',
      relevant: undefined,
      task: [],
      domain: [],
      keywords: [],
      url: '',
      maskedUrl: '',
      searchSnippet: ['']
    };

    //console.log('Document Parsed!', obj.route);
    return obj;
  }
}