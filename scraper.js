const puppeteer = require('puppeteer');
const PARAM_URL = `https://ted.europa.eu/TED/search/search.do`;
const SEARCH_RESULT_LINK = (pageNumber) => `https://ted.europa.eu/TED/search/searchResult.do?page=${pageNumber}`;

const ObjectsToCsv = require('objects-to-csv');


const tedScraper = {

    browser: null,
    page: null,
    numberOfPages: 1,
    noticeData: [],
    noticeDataJSON: null,

    initialize: async function asyncCall() {
        this.browser = await puppeteer.launch({
            headless: false,
          });
        this.page = await this.browser.newPage();   
        await this.page.setDefaultNavigationTimeout(0); 
        await this.page.setViewport({width:1500, height:5000});    
      },

    setParams: async function asyncCall(CPV_ID) {
        await this.page.goto(PARAM_URL);
        await this.page.waitFor('#main');
        await this.page.click('#searchScope3');

        await this.page.type('input[id="DOCUMENT_TYPE"]', "'contract award notice'");
        await this.page.type('input[id="CPV"]', CPV_ID);
     
        await this.page.click('[title="Perform search"]');
        await this.page.waitFor('#notice');
    },

    getNumberOfPages: async function asyncCall() {   
        const pagelinks = await this.page.$x('//div[@class="pagelinks float-right"]'); 
        debugger; 
        if (pagelinks.length){
            debugger;
            let lastPageLink = await this.page.$eval('a.pagelast-link',  a => a.getAttribute('href'));
            this.numberOfPages = parseInt(lastPageLink.split('=')[1]);
        }        
    },
    
    startScraping: async function asyncCall(CPV_ID) {
        let docCounter = 1;
        for (let ii = 1; ii <= this.numberOfPages; ii++){
            await this.page.goto(SEARCH_RESULT_LINK(ii));
            
            await this.page.waitFor('#notice');
            await this.page.waitFor(2000);
            
            const noticeLinks = await this.page.$$('a[title="View this notice"]');        
      
            for (let yy = 0; yy < noticeLinks.length; yy++){
                
                await noticeLinks[yy].click({
                    button: 'middle'
                  });
                }

            const allPages = await this.browser.pages();           

            for (let yy = 2; yy < allPages.length; yy++){                
                
                let currentPage = allPages[yy];
                await currentPage.waitFor('#fullDocument');                
                
                const winnerNameArrElementHandles = await currentPage.$x("//span[contains(text(), 'V.')]/../..//*[contains(text(), 'Official name:')]");
                
                let docNum = await currentPage.$x("//div[@id='fullDocument']/div/div/p");            
                docNum = await currentPage.evaluate(el => el.innerText, docNum[1]);          
               
                let contactInfoFinal = [{                    
                    url: currentPage.url(),
                    name: " ",
                    email: " ",
                    phone: " ",
                    country: " ",
                    docNumber: docNum,
                    docCounter: docCounter
                }];
              
                let counter = 0;               
                for (const winner of winnerNameArrElementHandles) {          

                    let contactInfo = await currentPage.evaluate(el => el.innerText, winner);                
                    contactInfo = contactInfo.trim().split('\n');      

                    contactInfo = contactInfo.map(item => {                    
                        item = item.split(':');
                        return {[item[0]]: item[1]};                      
                    });
                  
                    contactInfo = Object.assign({}, ...contactInfo);                

                    if (counter){
                        contactInfoFinal.push({}); 
                        contactInfoFinal[counter]["url"] = currentPage.url();                    
                    }                    
                    contactInfoFinal[counter]["name"] = contactInfo["Official name"];
                    contactInfoFinal[counter]["email"] = contactInfo["E-mail"];
                    contactInfoFinal[counter]["phone"] = contactInfo["Telephone"];
                    contactInfoFinal[counter]["country"] = contactInfo["Country"];
                    contactInfoFinal[counter]["docNumber"] =  docNum;
                    contactInfoFinal[counter]["docCounter"] =  docCounter;
                    counter++;     
                }
                this.noticeData.push(contactInfoFinal);
                this.exportToCsv(contactInfoFinal, CPV_ID);

                currentPage.close();    
                docCounter++;            
            }
        }
    },

    exportToCsv: async function asyncCall(info, CPV_ID) {              
        new ObjectsToCsv(info).toDisk(`./${CPV_ID}.csv`, { append: true });    
    }     
}

module.exports = tedScraper;