export interface QueryObject {
  query: string,
  page: number,
  docAmount: number,
  locale?: string,
  //task?: string, // TODO: remove once tags are done
  //domain?: string
  tags?: string[]
}