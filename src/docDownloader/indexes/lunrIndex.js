import lunr from 'lunr';
import sum from 'sum';

import 'array.prototype.move';

import Utils from '../../utils/serverUtils';

import { Documents } from '../../../imports/database/documents/index';
import { Indexes } from '../../../imports/database/indexes/index';

var searchIndex = {};

export default class LunrIndex {
  static generate() {
    console.log('Generating Inverted Index using Lunr...');

    var allDocs = Documents.find({});
    
    searchIndex = lunr(function() {
      this.field('title', { boost: 2 })
      this.field('indexedBody')
      this.ref('_id')
    });

    allDocs.forEach((doc) => {
      searchIndex.add(doc);
    });

    this.save();
  }

  static load() {
    var currentIndex = Indexes.findOne({ type: 'LunrIndex', version: 1 }, { sort: { serverTimestamp: -1 }});

    if (!Utils.isEmptyObject(currentIndex)) {
      console.log('Loading Lunr Inverted Index...');
      searchIndex = lunr.Index.load(JSON.parse(currentIndex.index));
    }
    else {
      this.generate();
    }
  }

  static save() {
    console.log('Saving Lunr Inverted Index...');

    var serializedIndex = { type: 'LunrIndex', version: 1, serverTimestamp: Utils.getTimestamp(),  index: JSON.stringify(searchIndex) };

    Indexes.upsert({ type: 'LunrIndex', version: 1 }, serializedIndex);
  }

  static index(docObj) {
    searchIndex.add(docObj);
    var serializedIndex = { type: 'LunrIndex', version: 1, serverTimestamp: Utils.getTimestamp(),  index: JSON.stringify(searchIndex) };
    Indexes.upsert({ type: 'LunrIndex', version: 1 }, serializedIndex);
  }

  static searchDocuments(query) {
    check(query, String);

    var search = [],
      respDocs = [];

    search = searchIndex.search(query);
    
    search.forEach((obj) => {
      var docId = obj.ref,
         docObj = Documents.findOne({_id: docId});

      docObj.searchSnippet = this.snippetGenerator(docObj.indexedBody, query);

      delete docObj.indexedBody;

      respDocs.push(docObj);
    });

    return respDocs;
  }

  static getDocument(documentName, callback) {
    check(documentName, String);

    var doc = Documents.findOne({ _id: documentName });

    if (doc && doc._id && doc.route) {
      doc.routeUrl = '/' + doc.route;
      callback(null, doc);
    }
    else {
      var err = 'Document not found!';
      callback(err);
    }
  }

  static snippetGenerator(text, keywords) {
    var opts = {
      corpus: text,
      nSentences: 3,
      nWords: 15,
      emphasise: keywords.split(' ')
    };

    var snippet = '';

    try {
      snippet = sum(opts).summary;
    }
    catch (err) {
      console.error('Error while generating search snippet!', err);
    }

    return snippet;
  }

  // dgacitua: Implemented Fisher-Yates Shuffle algorithm
  static shuffleArray(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;

      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }

    return array;
  }

  // dgacitua: http://stackoverflow.com/a/32238794
  static removeArrayDuplicates(keyFn, array) {
    var mySet = new Set();
    return array.filter(function(x) {
      var key = keyFn(x), isNew = !mySet.has(key);
      if (isNew) mySet.add(key);
      return isNew;
    });
  }
}