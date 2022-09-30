import path from 'path';
import 'dotenv/config';

const rootPath = path.resolve('.');

export default class ServerUtils {
  // dgacitua: Check if string is empty
  // http://stackoverflow.com/a/3261380
  static isEmpty(str: string) {
    return (!str || 0 === str.length);
  } 

  static getTimestamp() {
    return Date.now ? Date.now() : (new Date().getTime());  
  }

  static getDate() {
    const date = new Date();
    return date.toString();
  }

  static timestamp2datetime(timestamp: string | number | Date) {
    return new Date(timestamp);
  }
/*// Carlos: unused
  static timestamp2date(timestamp) {
    return moment(timestamp).format("YYYY-MM-DD");
  }

  static timestamp2time(timestamp) {
    return moment(timestamp).format("HH:mm:ss.SSS");
  }
*/

/* // trivial in TS: Object.keys(obj).length === 0
  static isEmptyObject(obj) {
    // Speed up calls to hasOwnProperty
    const hasOwnProperty = Object.prototype.hasOwnProperty;

    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    // If it isn't an object at this point
    // it is empty, but it can't be anything *but* empty
    // Is it empty?  Depends on your application.
    if (typeof obj !== "object") return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (const key in obj) {
      if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
  }
*/

  // dgacitua: Move element in array from one position to another
  // http://stackoverflow.com/a/5306832
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static moveInArray(array: any[], old_index: number, new_index: number) {
    while (old_index < 0) {
      old_index += array.length;
    }
    while (new_index < 0) {
      new_index += array.length;
    }
    if (new_index >= array.length) {
      let k = new_index - array.length;
      while ((k--) + 1) {
        array.push(undefined);
      }
    }
    
    array.splice(new_index, 0, array.splice(old_index, 1)[0]);

    return array;
  }

  // Carlos: irrelevant in TS
/*
  // dgacitua: Check if variable is a string
  // http://stackoverflow.com/a/9436948
  static isString(testStr: any) {
    return (typeof testStr === 'string' || testStr instanceof String);
  }
*/

  // dgacitua: Generate a random integer between two numbers
  // https://blog.tompawlak.org/generate-random-values-nodejs-javascript
  static randomInteger(low: number, high: number) {
    return Math.floor(Math.random() * (high - low + 1) + low);
  }

  
  static getAssetPath() {
    if (process.env.NEURONE_ASSET_PATH) {
      return process.env.NEURONE_ASSET_PATH;
    }
    else {
      return "./assets/";
    }
  }

  static getAssetSubfolder(newPath: string) {
    return path.join(this.getAssetPath(), newPath);
  }

  static getReferencePath(newPath: string) {
    return path.join('assets', path.normalize(path.relative(this.getAssetPath(), newPath)));
  }
/* Carlos: remade to ignore meteor checks
  static getPublicFolder() {
    if (Meteor.isProduction || Meteor.isDevelopment) {
      return path.join(rootPath, '../web.browser/app/');
    }
    else {
      return path.join(rootPath);
    }
  }
*/
  static getPublicFolder() {
    return path.join(rootPath);
  }

  static startsWith(fullString: string, startString: string) {
    const str = (fullString || '').toLowerCase(),
      start = (startString || '').toLowerCase();
    return str.startsWith(start);
  }

  static startsWithArray(fullString: string, startStringArray: string[]) {
    let flag = false;
    const str = (fullString || '').toLowerCase();

    startStringArray.forEach((el, /*idx, arr*/) => {
      const start = (el || '').toLowerCase();
      if (str.startsWith(start)) flag = true;
    });

    return flag;
  }
}