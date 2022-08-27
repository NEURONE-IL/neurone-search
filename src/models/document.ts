import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';

const documentSchema =  new mongoose.Schema({

  docName: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  locale: { type: String, required: true },
  relevant: { type: Boolean, required: true },
  tags: [{ type: String }], // used to categorize documents
  keywords: [{ type: String }],
  date: { type: String, required: true },
  url: { type: String, required: true },
  maskedUrl: { type: String, required: true },
  searchSnippet: [{ type: String }],
  indexedBody: { type: String, required: true },
  route: { type: String, required: true },
  hash: { type: String, required: true },

});

documentSchema.plugin(uniqueValidator);

export const DocumentsModel = mongoose.model('indexDocument', documentSchema);

