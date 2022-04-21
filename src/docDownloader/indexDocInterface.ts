export interface IndexDocument {
  //_id: string,
  docName: string,
  title: string,
  locale: string,
  relevant?: boolean,
  task: string[],
  domain: string[],
  keywords: string[],
  date: string,
  url: string,
  maskedUrl: string,
  searchSnippet: string[],
  indexedBody: string,
  route: string,
  hash: string
}