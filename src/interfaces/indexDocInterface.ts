// database web documents
export interface IndexDocument {
  _id?: string,
  docName: string,
  title: string,
  locale: string,
  relevant?: boolean,
  //task: string, TODO: remove once tags are done
  //domain: string,
  tags: string[],
  keywords: string[],
  date: string,
  url: string,
  maskedUrl: string,
  searchSnippet: string[],
  indexedBody: string,
  route: string,
  hash: string
}