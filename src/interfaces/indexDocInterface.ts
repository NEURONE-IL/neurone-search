import { Types } from "mongoose";

// database web documents
export interface IndexDocument {
  _id?: Types.ObjectId,
  docName: string,
  title: string,
  locale: string,
  relevant: boolean,
  tags: { type?: string | undefined }[],
  keywords: { type?: string | undefined; }[],
  date: string,
  url: string,
  maskedUrl: string,
  searchSnippet: { type?: string | undefined; }[],
  indexedBody: string,
  route: string,
  hash: string
}