import mongoose from 'mongoose';
//const uniqueValidator = require('mongoose-unique-validator');

const documentSchema =  new mongoose.Schema({

  docName: { type: String },
  title: { type: String },
  locale: { type: String },
  relevant: { type: String },
  task: [{ type: String }],
  domain: [{ type: String }],
  keywords: [{ type: String }],
  date: { type: String },
  url: { type: String },
  maskedUrl: { type: String },
  searchSnippet: [{ type: String }],
  indexedBody: { type: String },
  route: { type: String },
  hash: { type: String },

});

//formSchema.plugin(uniqueValidator);

export const DocumentsModel = mongoose.model('indexDocument', documentSchema);

