import scrape from 'website-scraper';

export class WebsiteScraper {

  constructor(){}

  scrape() {

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36';

    const site = 'https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent'

    const optionsSc = {
      urls: [site],
      directory: './path/site',
      filenameGenerator: 'bySiteStructure', //'byType',
      recursive: false,
            httpResponseHandler: (response) => {
            const htmlBody = response.headers['content-type'].startsWith('text/html') && response.body;
            const re = /((https?:\/\/)(\w+)(.disqus.com))/;
            if (htmlBody && re.test(htmlBody)) {
              const updatedHtmlBody = htmlBody.replace(re, ''); 
              return Promise.resolve(updatedHtmlBody);
            }
            else {
              return Promise.resolve(response.body);
            }
          },
          request: {
            headers: { 'User-Agent': userAgent }
          }
    };

    scrape(optionsSc).then((result) => {console.log (result)}).catch(error => {console.log("ERROR:");console.error(error)});
  }

}