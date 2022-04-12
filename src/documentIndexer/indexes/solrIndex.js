import SolrNode from 'solr-node';

import Utils from '../../utils/serverUtils';
import RemoveDiacritics from '../../utils/removeDiacritics';

import { Documents } from '../../../imports/database/documents/index';
import { Book, Video, ImageSearch } from '../../database/definitions';

let searchIndex;

export default class SolrIndex {
  static load(callback) {
    let options = {
      host: process.env.NEURONE_SOLR_HOST || 'localhost',
      port: process.env.NEURONE_SOLR_PORT || '8983',
      core: process.env.NEURONE_SOLR_CORE || 'neurone',
      debugLevel: 'ERROR'
    }

    searchIndex = new SolrNode(options);

    searchIndex.ping((err, res) => {
      if (!err) {
        console.log('Solr index loaded successfully');
        callback(null, true);
      }
      else {
        callback(err);
      }
    });
  }

  static generate(callback) {
    SolrIndex.load(Meteor.bindEnvironment((err, res) => {
      if (!err) {
        let docs = Documents.find().fetch(),
         idxDocs = [],
          idxCnt = 0,
          idxErr = 0;
        let books = Book.find().fetch(),
            videos = Video.find().fetch(),
            images = ImageSearch.find().fetch();
            
            docs = docs.concat(books.concat(videos).concat(images));

        docs.forEach((doc, idx) => {
          let newDoc = {
            id: doc._id,
            docId_s: doc._id,
            locale_s: doc.locale,
            relevant_b: doc.relevant || false,
            title_t: doc.title || '',
            searchSnippet_t: doc.searchSnippet || '',
            indexedBody_t: doc.indexedBody || '',
            keywords_t: doc.keywords || [],
            task_s: doc.task || [],
            domain_s: doc.domain || [],
            url_t: doc.url || '',
            type_t: doc.type || 'page'
          };

          idxDocs.push(newDoc);
        });

        // dgacitua: Deleting old documents
        searchIndex.delete({ '*':'*' }, (err2, res2) => {
          if (!err2) {
            // dgacitua: Adding new documents
            searchIndex._requestPost('update?commit=true', idxDocs, {}, (err3, res3) => {
              if (!err3) {
                console.log('Documents added to Solr Index!');
                callback(null, true);
              }
              else {
                console.error('Error while adding documents to Solr Index', err3);
                callback(err3);
              }
            });
          }
          else {
            console.error('Error while removing old documents from Solr Index', err2);
            callback(err2);
          }
        });
      }
      else {
        callback(err);
      }
    }));
  }

  static index(docObj, callback) {
    let newDoc = {
      id: docObj._id,
      docId_s: docObj._id,
      locale_s: docObj.locale,
      relevant_b: docObj.relevant || false,
      title_t: docObj.title || '',
      searchSnippet_t: docObj.searchSnippet || '',
      indexedBody_t: docObj.indexedBody || '',
      keywords_t: docObj.keywords || [],
      task_s: docObj.task || [],
      domain_s: docObj.domain || [],
      url_t: docObj.url || '',
      type_t: docObj.type || 'page'
    };

    let arrDocs = [ newDoc ];

    searchIndex._requestPost('update?commit=true', arrDocs, {}, (err, res) => {
      if (!err) {
        callback(null, true);
      }
      else {
        callback(err);
      }
    });
  }

  static searchDocuments(queryObject, callback) {
    check(queryObject, Object);

    let queryString = queryObject.query,
        queryLocale = queryObject.locale ? queryObject.locale : null,
          queryTask = queryObject.task ? queryObject.task : null,
        queryDomain = queryObject.domain ? queryObject.domain : null;

    let q1 = `(title_t:${queryString} OR indexedBody_t: ${queryString} OR keywords_t: ${queryString})`,
        q2 = queryLocale ? ` AND locale_s:${queryLocale}` : '',
        q3 = queryTask ? ` AND task_s:${queryTask}` : '',
        q4 = queryDomain ? ` AND domain_s:${queryDomain}` : '',
        q5 = `start=0&rows=100`,
        q6 = `df=indexedBody_t`,
        q7 = `hl=on&hl.q=${queryString}&hl.fl=indexedBody_t&hl.snippets=3&hl.simple.pre=<em class="hl">&hl.simple.post=</em>`,
        q8 = `hl.fragmenter=regex&hl.regex.slop=0.2&hl.alternateField=body_t&hl.maxAlternateFieldLength=300`,
     query = `q=(${q1}${q2}${q3}${q4})&${q5}&${q6}&${q7}&${q8}&wt=json`;

    //console.log('SearchQuery', query);

    let respDocs = [];

    searchIndex.search(encodeURI(query), Meteor.bindEnvironment((err, res) => {
      if (!err) {
        let searchResponse = res,
                 searchNum = searchResponse.response.numFound,
                searchDocs = searchResponse.response.docs,
                  searchHl = searchResponse.highlighting;
        
        searchDocs.forEach((doc) => {
          let docId = doc.id,
             docObj = Documents.findOne({_id: docId});

             //document multimedia
             if(docObj == null){
               docObj = Video.findOne({_id:docId});
               if(docObj == null){
                docObj = Book.findOne({_id:docId});
                }
                if(docObj == null){
                  docObj = ImageSearch.findOne({_id:docId});
                }
             }
          docObj.searchSnippet = '';

          searchHl[docId].indexedBody_t.forEach((snip, idx, arr) => {
            docObj.searchSnippet += snip;
            if (idx < arr.length-1) docObj.searchSnippet += ' ... ';
          });

          delete docObj.indexedBody;
          
          respDocs.push(docObj);
        });

        callback(null, respDocs);
      }
      else {
        console.error(err);
        callback(err);
      }
    }));
  }
}