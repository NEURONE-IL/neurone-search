export interface docInsideIndex {
  id: string,
  docId_s?: string,
  locale_s: string,
  relevant_b: boolean,
  title_t: string,
  searchSnippet_t: string[], // Carlos: changed '' to []
  indexedBody_t: string,
  keywords_t: string[],
  task_s: string,
  domain_s: string,
  url_t: string,
  type_t?: 'page' | 'audio' | 'book' | 'image', // TODO: verify/asl if this is correct

}