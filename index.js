const scraper = require('./scraper');

const CPV_ID = process.argv[2];

(async () => {
    
    await scraper.initialize();
    
    await scraper.setParams(CPV_ID);
    await scraper.getNumberOfPages();
    await scraper.startScraping(CPV_ID);
})();