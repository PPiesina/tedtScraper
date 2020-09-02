const scraper = require('./scraper');

const CPV_ID = `39522530`;

(async () => {
    await scraper.initialize();
    await scraper.setParams(CPV_ID);
    await scraper.getNumberOfPages();
    await scraper.startScraping();
})();