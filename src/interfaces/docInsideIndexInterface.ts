import { Types } from "mongoose";

// web documents inside index
export interface docInsideIndex {
  id: string,
  docId_s?: Types.ObjectId,
  locale_s: string,
  relevant_b: boolean,
  title_t: string,
  searchSnippet_t: { type?: string | undefined; }[],
  indexedBody_t: string,
  keywords_t: { type?: string | undefined; }[],
  tags_t: { type?: string | undefined; }[], // TODO: verify and ask what is _t _s etc
  url_t: string,
  type_t?: 'page' | 'audio' | 'book' | 'image', // TODO: verify/ask if this is correct
}