// web documents inside index
export interface docInsideIndex {
  id: string,
  docId_s?: string,
  locale_s: string,
  relevant_b: boolean,
  title_t: string,
  searchSnippet_t: string[],
  indexedBody_t: string,
  keywords_t: string[],
  //task_s: string, // TODO: remove once tags are done
  //domain_s: string,
  tags_t: string[], // TODO: verify and ask what is _t _s etc
  url_t: string,
  type_t?: 'page' | 'audio' | 'book' | 'image', // TODO: verify/ask if this is correct
}