import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const documentSchema =  new mongoose.Schema({

  docName: { type: String, unique: true },
  title: { type: String },
  locale: { type: String },
  relevant: { type: String },
  //task: { type: String },
  //domain: { type: String },
  tags: [{ type: String }], // replacement of task/domain, used to simply categorize documents
  keywords: [{ type: String }],
  date: { type: String },
  url: { type: String },
  maskedUrl: { type: String },
  searchSnippet: [{ type: String }],
  indexedBody: { type: String },
  route: { type: String },
  hash: { type: String },

});

documentSchema.plugin(uniqueValidator);

export const DocumentsModel = mongoose.model('indexDocument', documentSchema);

