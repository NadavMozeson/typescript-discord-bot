import puppeteer, { ElementHandle, Page } from 'puppeteer';
import { client, config } from '../index.js'
import { withErrorHandling } from './errorHandler.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const USER_AGENT_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

export const getFutbinPlayerPageData = withErrorHandling(async function (url : string) {
    const selector = 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div'
    const selectorsToHide = ['body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-ps.price-box-original-player > a', 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-pc.price-box-original-player > a', 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-card-section > div.player-card-wrapper > div > div', 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-card-section > div.player-stats-evolution-toggle.row', 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-pc.price-box-original-player > div.price-wrapper > div.prices-updated.no-wrap.inline-with-icon.text-faded', 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-ps.price-box-original-player > div.price-wrapper > div.prices-updated.no-wrap.inline-with-icon.text-faded', 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-pc.price-box-original-player > div.small-row.align-center.font-extra-small', 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-ps.price-box-original-player > div.small-row.align-center.font-extra-small', 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-card-section.full-height.minus-margin-top-16 > div.flex.full-height.align-end']
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const browser = currentDir.includes('sw33t') ? (await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })) : (await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], executablePath: process.env.BROWSER_PATH }))

    const page: Page = await browser.newPage();

    await page.setUserAgent(USER_AGENT_STRING);

    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
        const url = request.url();
        if (url.includes('futbin') || url.includes('discordapp')) {
            request.continue();
        } else {
            request.abort();
        }
    });

    await page.goto(url, { waitUntil : "networkidle0", timeout: 60000 });
    await page.waitForSelector(selector)

    const urlParts = url.split('/');
    const playerNameWithHyphens = urlParts[urlParts.length - 1];

    const playerName = playerNameWithHyphens
        .split('-') 
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).toString().replace(',', ' ');
    
    const playerRating = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent : null;
    }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-card-section > div.player-card-wrapper > div > a > div > div.playercard-25-rating-pos-wrapper > div.playercard-25-rating');

    const country = await page.evaluate(() => {
        const row = Array.from(document.querySelectorAll('table tr')).find(row => {
            const th = row.querySelector('th');
            return th && th.textContent?.trim() === 'Nation';
        });
        const nationLink = row?.querySelector('td.row-with-image a');
        return nationLink ? nationLink.textContent?.trim() : null;
    });    
    
    await page.waitForSelector('body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-pc.price-box-original-player > div.column > div.price.inline-with-icon.lowest-price-1')

    const pricePC = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent : null;
    }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-pc.price-box-original-player > div.column > div.price.inline-with-icon.lowest-price-1');

    await page.waitForSelector('body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-ps.price-box-original-player > div.column > div.price.inline-with-icon.lowest-price-1')

    const priceConsole = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent : null;
    }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-ps.price-box-original-player > div.column > div.price.inline-with-icon.lowest-price-1');

    const cardType = await page.evaluate(() => {
        const row = Array.from(document.querySelectorAll('table tr')).find(row => {
            const th = row.querySelector('th');
            return th?.textContent?.trim() === 'Revision';
        });
        const cardText = row?.querySelector('td');
        return cardText ? cardText.textContent?.trim() : null;
    });
    
    const pcMinPrice = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent : null;
    }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-pc.price-box-original-player > div.price-wrapper > div.price-pr.font-small.semi-bold.text-faded.no-wrap');

    const consoleMinPrice = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent : null;
    }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-ps.price-box-original-player > div.price-wrapper > div.price-pr.font-small.semi-bold.text-faded.no-wrap');
    

    const element: ElementHandle | null = await page.$(selector);

    if (element) {
        await page.evaluate((selectors: string[]) => {
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    element.setAttribute('style', 'display: none !important;');
                });
            });
        }, selectorsToHide);

        await page.evaluate((selector: string) => {
            const element = document.querySelector(selector);
            if (element) {
                element.setAttribute('style', 'height:300px');
            }
        }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.alternative-versions-row.xxs-row.align-center.full-width.flex-wrap');

        const boundingBox = await element.boundingBox();
        
        if (boundingBox) {
            const marginBoundingBox = {
                x: boundingBox.x - 20,
                y: boundingBox.y - 10,
                width: boundingBox.width,
                height: boundingBox.height - 280
            };
            const imageBuffer = await page.screenshot({
                clip: marginBoundingBox
            });
            await browser.close();
            return { image: Buffer.from(imageBuffer), name: playerName, country: country, pricePC: pricePC, priceConsole: priceConsole, rating: playerRating, card: cardType, minPCPrice: pcMinPrice?.toString().replace(/[^\d\s]/g, '').match(/\d+(?:,\d+)*?/), minConsolePrice: consoleMinPrice?.toString().replace(/[^\d\s]/g, '').match(/\d+(?:,\d+)*?/) };
        } 
    }
    await browser.close();
    return undefined;
})

export const getPageContent = withErrorHandling(async (url: string) => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const browser = currentDir.includes('sw33t') ? (await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })) : (await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], executablePath: process.env.BROWSER_PATH }))
    const page: Page = await browser.newPage();

    await page.setUserAgent(USER_AGENT_STRING);

    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
        const url = request.url();
        if (url.includes('futbin')) {
            request.continue();
        } else {
            request.abort();
        }
    });

    await page.goto(url, { waitUntil : "domcontentloaded", timeout: 60000 });

    await page.goto(url);

    const content = await page.content();

    await browser.close();
    return content
})

export const getFutbinFoderPageData = withErrorHandling(async function (foderRating: number) {
    const selector = '#content-container > div.extra-columns-wrapper.relative > div.players-table-wrapper.custom-scrollbar.overflow-x > table > tbody'
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const browser = currentDir.includes('sw33t') ? (await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })) : (await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], executablePath: process.env.BROWSER_PATH }))
    const page: Page = await browser.newPage();

    await page.setUserAgent(USER_AGENT_STRING);

    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
        const url = request.url();
        if (url.includes('futbin') || url.includes('discordapp')) {
            request.continue();
        } else {
            request.abort();
        }
    });

    await page.setViewport({
        width: 1200,
        height: 1758
    });

    await page.goto(`https://www.futbin.com/players?ps_price=200%2B&player_rating=${foderRating}-${foderRating}&sort=ps_price&order=asc`, { waitUntil : "networkidle0", timeout: 60000 });

    const playerName = `${foderRating} Rated Players`;

    const playerRating = foderRating.toString();
    const country = 'Gold Foder'

    let pricePC, priceConsole, pcMinPrice, consoleMinPrice
    for (let i = 1; i <= 5; i++) {
        const href = 'https://www.futbin.com' + await page.evaluate((selector, index) => {
            const element = document.querySelector(`${selector} > tr:nth-child(${index}) > td.table-name > a`);
            return element ? element.getAttribute('href') : null;
        }, selector, i);
    
        if (href.includes('/player/')) {
            const playerData = await getFutbinPlayerPageData(href);
            if (playerData && playerData.pricePC && playerData.priceConsole && playerData.minPCPrice && playerData.minConsolePrice) {
                pricePC = playerData.pricePC   
                priceConsole = playerData.priceConsole
                pcMinPrice = playerData.minPCPrice
                consoleMinPrice = playerData.minConsolePrice
                break
            }
        }
    }
    
    await page.evaluate((tbodySelector: string) => {
        const tbody = document.querySelector(tbodySelector);
        if (!tbody) return;

        const trs = Array.from(tbody.querySelectorAll('tr')).slice(0, 5);

        trs.forEach(tr => {
            const tdToMove = tr.querySelector('td.table-price.no-wrap.platform-ps-only') as HTMLTableCellElement;
            if (tdToMove) {
                const tds = Array.from(tr.querySelectorAll('td')) as HTMLTableCellElement[];
                const tdIndex = tds.indexOf(tdToMove);
                if (tdIndex !== -1 && tds.length > 1) {
                    tr.removeChild(tdToMove);
                    if (tds[1]) {
                        tr.insertBefore(tdToMove, tds[1]);
                    } else {
                        tr.appendChild(tdToMove);
                    }
                }
            }
        });
    }, selector);

    const columnWidths = await page.evaluate((tbodySelector) => {
        const tbody = document.querySelector(tbodySelector);
        if (!tbody) return null;

        const firstRow = tbody.querySelector('tr');
        if (!firstRow) return null;

        const columns = firstRow.querySelectorAll('td, th');
        if (columns.length < 2) return null;

        const width1 = window.getComputedStyle(columns[0]).width;
        const width2 = window.getComputedStyle(columns[1]).width;

        return {
            firstColumnWidth: parseInt(width1, 10),
            secondColumnWidth: parseInt(width2, 10)
        };
    }, selector);

    const marginBoundingBox = await page.evaluate((tbodySelector, columnWidths) => {
        const tbody = document.querySelector(tbodySelector);
        if (!tbody) return null;

        const trs = Array.from(tbody.querySelectorAll('tr')).slice(0, 5);
        if (trs.length === 0) return null;

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        trs.forEach(tr => {
            const boundingBox = tr.getBoundingClientRect();
            minX = Math.min(minX, boundingBox.x);
            minY = Math.min(minY, boundingBox.y);
            if (columnWidths) {
                maxX = Math.max(maxX, boundingBox.x + columnWidths.firstColumnWidth + columnWidths.secondColumnWidth);
            }
            maxX = Math.max(maxX, boundingBox.x + 340);
            maxY = Math.max(maxY, boundingBox.y + boundingBox.height);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }, selector, columnWidths);

    if (marginBoundingBox) {
        const imageBuffer = await page.screenshot({
            clip: marginBoundingBox
        });
        await browser.close();
        return { image: Buffer.from(imageBuffer), name: playerName, country: country, pricePC: pricePC, priceConsole: priceConsole, rating: playerRating, card: null, minPCPrice: pcMinPrice, minConsolePrice: consoleMinPrice };
    }
})

export const getFutbinTOTWPageData = withErrorHandling(async function (foderRating: number) {
    const selector = '#content-container > div.extra-columns-wrapper.relative > div.players-table-wrapper.custom-scrollbar.overflow-x > table > tbody'
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const browser = currentDir.includes('sw33t') ? (await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })) : (await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], executablePath: process.env.BROWSER_PATH }))
    const page: Page = await browser.newPage();

    await page.setUserAgent(USER_AGENT_STRING);

    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
        const url = request.url();
        if (url.includes('futbin') || url.includes('discordapp')) {
            request.continue();
        } else {
            request.abort();
        }
    });

    await page.setViewport({
        width: 1200,
        height: 1758
    });

    await page.goto(`https://www.futbin.com/players?ps_price=200%2B&version=if_gold&player_rating=${foderRating}-${foderRating}&sort=ps_price&order=asc`, { waitUntil : "networkidle0", timeout: 60000 });

    const playerName = `${foderRating} Rated TOTW Players`;

    const playerRating = foderRating.toString();
    const country = 'TOTW Inform'

    let pricePC, priceConsole, pcMinPrice, consoleMinPrice
    for (let i = 1; i <= 5; i++) {
        const href = 'https://www.futbin.com' + await page.evaluate((selector, index) => {
            const element = document.querySelector(`${selector} > tr:nth-child(${index}) > td.table-name > a`);
            return element ? element.getAttribute('href') : null;
        }, selector, i);
    
        if (href.includes('/player/')) {
            const playerData = await getFutbinPlayerPageData(href);
            if (playerData && playerData.pricePC && playerData.priceConsole && playerData.minPCPrice && playerData.minConsolePrice) {
                pricePC = playerData.pricePC   
                priceConsole = playerData.priceConsole
                pcMinPrice = playerData.minPCPrice
                consoleMinPrice = playerData.minConsolePrice
                break
            }
        }
    }
    
    await page.evaluate((tbodySelector: string) => {
        const tbody = document.querySelector(tbodySelector);
        if (!tbody) return;

        const trs = Array.from(tbody.querySelectorAll('tr')).slice(0, 5);

        trs.forEach(tr => {
            const tdToMove = tr.querySelector('td.table-price.no-wrap.platform-ps-only') as HTMLTableCellElement;
            if (tdToMove) {
                const tds = Array.from(tr.querySelectorAll('td')) as HTMLTableCellElement[];
                const tdIndex = tds.indexOf(tdToMove);
                if (tdIndex !== -1 && tds.length > 1) {
                    tr.removeChild(tdToMove);
                    if (tds[1]) {
                        tr.insertBefore(tdToMove, tds[1]);
                    } else {
                        tr.appendChild(tdToMove);
                    }
                }
            }
        });
    }, selector);

    const columnWidths = await page.evaluate((tbodySelector) => {
        const tbody = document.querySelector(tbodySelector);
        if (!tbody) return null;

        const firstRow = tbody.querySelector('tr');
        if (!firstRow) return null;

        const columns = firstRow.querySelectorAll('td, th');
        if (columns.length < 2) return null;

        const width1 = window.getComputedStyle(columns[0]).width;
        const width2 = window.getComputedStyle(columns[1]).width;

        return {
            firstColumnWidth: parseInt(width1, 10),
            secondColumnWidth: parseInt(width2, 10)
        };
    }, selector);

    const marginBoundingBox = await page.evaluate((tbodySelector, columnWidths) => {
        const tbody = document.querySelector(tbodySelector);
        if (!tbody) return null;

        const trs = Array.from(tbody.querySelectorAll('tr')).slice(0, 5);
        if (trs.length === 0) return null;

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        trs.forEach(tr => {
            const boundingBox = tr.getBoundingClientRect();
            minX = Math.min(minX, boundingBox.x);
            minY = Math.min(minY, boundingBox.y);
            if (columnWidths) {
                maxX = Math.max(maxX, boundingBox.x + columnWidths.firstColumnWidth + columnWidths.secondColumnWidth);
            }
            maxX = Math.max(maxX, boundingBox.x + 340);
            maxY = Math.max(maxY, boundingBox.y + boundingBox.height);
        });

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }, selector, columnWidths);

    if (marginBoundingBox) {
        const imageBuffer = await page.screenshot({
            clip: marginBoundingBox
        });
        await browser.close();
        return { image: Buffer.from(imageBuffer), name: playerName, country: country, pricePC: pricePC, priceConsole: priceConsole, rating: playerRating, card: null, minPCPrice: pcMinPrice, minConsolePrice: consoleMinPrice };
    }
});