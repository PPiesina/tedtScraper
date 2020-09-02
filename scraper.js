const puppeteer = require('puppeteer');
const PARAM_URL = `https://ted.europa.eu/TED/search/search.do`;
const SEARCH_RESULT_LINK = (pageNumber) => `https://ted.europa.eu/TED/search/searchResult.do?page=${pageNumber}`;

const fs = require('fs');
const ObjectsToCsv = require('objects-to-csv');

const tedScraper = {

    browser: null,
    page: null,
    numberOfPages: 1,
    noticeData: [],
    noticeDataJSON: null,

    initialize: async () => {
        tedScraper.browser = await puppeteer.launch({
            headless: false,
          });
        tedScraper.page = await tedScraper.browser.newPage();   
        await tedScraper.page.setViewport({width:1500, height:800});
    },
    setParams: async (CPV_ID) => {
        await tedScraper.page.goto(PARAM_URL, { waitUntil: 'networkidle0' });
        await tedScraper.page.click('#searchScope3');

        await tedScraper.page.type('input[id="DOCUMENT_TYPE"]', "'contract award notice'");
        await tedScraper.page.type('input[id="CPV"]', CPV_ID);
     
        await tedScraper.page.click('[title="Perform search"]');
        await tedScraper.page.waitForNavigation({ waitUntil: 'networkidle0' }); 
    },
    getNumberOfPages: async () => {
        let lastPageLink = await tedScraper.page.$eval('a.pagelast-link',  a => a.getAttribute('href'));
        tedScraper.numberOfPages = parseInt(lastPageLink.split('=')[1]);
    },
    startScraping: async () => {
        for (let ii = 1; ii <= tedScraper.numberOfPages; ii++){
            await tedScraper.page.goto(SEARCH_RESULT_LINK(ii), { waitUntil: 'networkidle0' });

            let noticeLinks = await tedScraper.page.$$('a[title="View this notice"]');

            for (let yy = 0; yy < noticeLinks.length; yy++){
                noticeLinks = await tedScraper.page.$$('a[title="View this notice"]');
                await noticeLinks[yy].click();
                await tedScraper.page.waitFor('#fullDocument');

                const winnerNameArrElementHandles = await tedScraper.page.$x("//span[contains(text(), 'V.')]/../..//*[contains(text(), 'Official name:')]");
                
                let pageNumber = await tedScraper.page.$x("//div[@id='resultNav']//li//span[contains(text(), '/')]");
               
                pageNumber = await tedScraper.page.evaluate(el => el.innerText, pageNumber[0]);

                let contactInfoFinal = [{                    
                    url: tedScraper.page.url(),
                    name: " ",
                    email: " ",
                    phone: " ",
                    pageNum: pageNumber
                }];

                let counter = 0;

                for (const winner of winnerNameArrElementHandles) {
                    //create object with info
                    let contactInfo = await tedScraper.page.evaluate(el => el.innerText, winner);
                    contactInfo = contactInfo.trim().split('\n');
                    contactInfo = contactInfo.map(item => {
                        item = item.split(':');
                        return {[item[0]]: item[1]};
                    });
                    contactInfo = Object.assign({}, ...contactInfo);

                    //create object with needed data
                    if (counter){
                        contactInfoFinal.push({});
                        contactInfoFinal[counter]["url"] = " ";                        
                    } else {
                        contactInfoFinal[counter]["url"] = contactInfoFinal[counter]["url"];
                    }                 
                    contactInfoFinal[counter]["name"] = contactInfo["Official name"];
                    contactInfoFinal[counter]["email"] = contactInfo["E-mail"];
                    contactInfoFinal[counter]["phone"] = contactInfo["Telephone"];
                    contactInfoFinal[counter]["pageNum"] =  pageNumber
                    counter++;     
                }
                tedScraper.noticeData.push(contactInfoFinal);
                tedScraper.exportToCsv(contactInfoFinal);

                await tedScraper.page.goBack();
                await tedScraper.page.waitFor('#notice');
            }
        }
    },
    exportToCsv: async (info) => {      
        new ObjectsToCsv(info).toDisk('./test.csv', { append: true });    
    }     
}
module.exports = tedScraper;