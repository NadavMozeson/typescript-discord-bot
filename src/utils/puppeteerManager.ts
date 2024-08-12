import puppeteer, { ElementHandle, Page } from 'puppeteer';
import { client, config } from '../index'
import { withErrorHandling } from './errorHandler';

const USER_AGENT_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

const BLOCKED_DOMAINS = new Set([
    'c.amazon-adsystem.com',
    'google-analytics.com',
    'bpm://',
    'cdn1.vntsm.com',
    'hbopenbid.pubmatic.com',
    'doubleclick.net',
    'ads.yahoo.com',
    'doubleclick.net'
]);

export const getFutbinPlayerPageData = withErrorHandling(async function (url : string) {
    const selector = 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div'
    const selectorsToHide = ['body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-ps.price-box-original-player > a', 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-pc.price-box-original-player > a']
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

    const page: Page = await browser.newPage();

    await page.setUserAgent(USER_AGENT_STRING);
    
    const guild = await client.guilds.fetch(config.SERVER.INFO.ServerId.toString());
    const watermarkUrl = guild.iconURL()?.toString();
    const watermarkText = '@' + guild.name.toString();

    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
        const url = request.url();
        if ([...BLOCKED_DOMAINS].some(domain => url.includes(domain))) {
            request.abort();
        } else {
            request.continue();
        }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector(selector)

    const urlParts = url.split('/');
    const playerNameWithHyphens = urlParts[urlParts.length - 1];

    const playerName = playerNameWithHyphens
        .split('-') 
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).toString().replace(',', ' ');
    
    const playerRating = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent : null;
    }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-card-section > div:nth-child(1) > div > div.playercard-24-rating-pos-wrapper > div.playercard-24-rating');

    const country = await page.evaluate(() => {
        const row = Array.from(document.querySelectorAll('table tr')).find(row => {
            const th = row.querySelector('th');
            return th && th.textContent?.trim() === 'Nation';
        });
        const nationLink = row?.querySelector('td.row-with-image a');
        return nationLink ? nationLink.textContent?.trim() : null;
    });    
    
    const pricePC = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent : null;
    }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-pc.price-box-original-player > div.column > div.price.inline-with-icon.lowest-price-1');

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

        await page.evaluate((watermarkUrl: any) => {
            if (watermarkUrl) {
                const watermark = document.createElement('img');
                watermark.src = watermarkUrl;
                watermark.style.position = 'absolute';
                watermark.style.bottom = '135px';
                watermark.style.right = '250px';
                watermark.style.opacity = '1';
                watermark.style.zIndex = '9999';
                watermark.style.width = '110px';
                watermark.style.height = '110px';
                document.body.appendChild(watermark);
            }
        }, watermarkUrl)

        await page.evaluate((text: any) => {
            const textElement = document.createElement('div');
            textElement.textContent = text;
            textElement.style.position = 'absolute';
            textElement.style.bottom = '10px';
            textElement.style.left = '50%';
            textElement.style.transform = 'translateX(-50%)';
            textElement.style.color = 'white';
            textElement.style.fontFamily = 'Arial';
            textElement.style.padding = '5px';
            textElement.style.fontSize = '35px';
            textElement.style.zIndex = '9999';
            document.body.appendChild(textElement);
        }, watermarkText);

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
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page: Page = await browser.newPage();

    await page.setUserAgent(USER_AGENT_STRING);

    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
        const url = request.url();
        if ([...BLOCKED_DOMAINS].some(domain => url.includes(domain))) {
            request.abort();
        } else {
            request.continue();
        }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.goto(url);

    const content = await page.content();

    await browser.close();
    return content
})

export const getFutbinFoderPageData = withErrorHandling(async function (foderRating: number) {
    const foderSelectors: { [key: number]: string } = {
        81: 'body > div.widthControl.mainPagePadding > div.cheapestsbcplayerspage.medium-column > div.cheapestsbcplayerslist.m-row.stc-players-wrapper > div:nth-child(19) > div.xs-column',
        82: 'body > div.widthControl.mainPagePadding > div.cheapestsbcplayerspage.medium-column > div.cheapestsbcplayerslist.m-row.stc-players-wrapper > div:nth-child(20) > div.xs-column',
        83: 'body > div.widthControl.mainPagePadding > div.cheapestsbcplayerspage.medium-column > div.cheapestsbcplayerslist.m-row.stc-players-wrapper > div:nth-child(21) > div.xs-column',
        84: 'body > div.widthControl.mainPagePadding > div.cheapestsbcplayerspage.medium-column > div.cheapestsbcplayerslist.m-row.stc-players-wrapper > div:nth-child(22) > div.xs-column',
        85: 'body > div.widthControl.mainPagePadding > div.cheapestsbcplayerspage.medium-column > div.cheapestsbcplayerslist.m-row.stc-players-wrapper > div:nth-child(23) > div.xs-column',
        86: 'body > div.widthControl.mainPagePadding > div.cheapestsbcplayerspage.medium-column > div.cheapestsbcplayerslist.m-row.stc-players-wrapper > div:nth-child(24) > div.xs-column',
        87: 'body > div.widthControl.mainPagePadding > div.cheapestsbcplayerspage.medium-column > div.cheapestsbcplayerslist.m-row.stc-players-wrapper > div:nth-child(25) > div.xs-column',
        88: 'body > div.widthControl.mainPagePadding > div.cheapestsbcplayerspage.medium-column > div.cheapestsbcplayerslist.m-row.stc-players-wrapper > div:nth-child(26) > div.xs-column',
        89: 'body > div.widthControl.mainPagePadding > div.cheapestsbcplayerspage.medium-column > div.cheapestsbcplayerslist.m-row.stc-players-wrapper > div:nth-child(27) > div.xs-column',
        90: 'body > div.widthControl.mainPagePadding > div.cheapestsbcplayerspage.medium-column > div.cheapestsbcplayerslist.m-row.stc-players-wrapper > div:nth-child(28) > div.xs-column',
        91: 'body > div.widthControl.mainPagePadding > div.cheapestsbcplayerspage.medium-column > div.cheapestsbcplayerslist.m-row.stc-players-wrapper > div:nth-child(29) > div.xs-column',
    }
    const selector = foderSelectors[foderRating]
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

    const page: Page = await browser.newPage();

    await page.setUserAgent(USER_AGENT_STRING);

    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
        const url = request.url();
        if ([...BLOCKED_DOMAINS].some(domain => url.includes(domain))) {
            request.abort();
        } else {
            request.continue();
        }
    });

    await page.goto('https://www.futbin.com/stc/cheapest', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector(selector + ' > a:nth-child(5)')

    const playerName = `${foderRating} Rated Players`;
    
    const playerRating = foderRating.toString();
    const country = 'Gold Foder'

    const href = 'https://www.futbin.com' + await page.evaluate(selector => {
        const element = document.querySelector(`${selector} a`);
        return element ? element.getAttribute('href') : null;
    }, selector);

    let pricePC, priceConsole, pcMinPrice, consoleMinPrice
    if (href) {
        const newPage = await browser.newPage();

        await newPage.setUserAgent(USER_AGENT_STRING);

        await newPage.setRequestInterception(true);
        
        newPage.on('request', (request) => {
            const url = request.url();
            if ([...BLOCKED_DOMAINS].some(domain => url.includes(domain))) {
                request.abort();
            } else {
                request.continue();
            }
        });
        
        await newPage.goto(href, { timeout: 60000 });

        pricePC = await newPage.evaluate((selector) => {
            const element = document.querySelector(selector);
            return element ? element.textContent : null;
        }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-pc.price-box-original-player > div.column > div.price.inline-with-icon.lowest-price-1');
    
        priceConsole = await newPage.evaluate((selector) => {
            const element = document.querySelector(selector);
            return element ? element.textContent : null;
        }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-ps.price-box-original-player > div.column > div.price.inline-with-icon.lowest-price-1');
        
        pcMinPrice = await newPage.evaluate((selector) => {
            const element = document.querySelector(selector);
            return element ? element.textContent : null;
        }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-pc.price-box-original-player > div.price-wrapper > div.price-pr.font-small.semi-bold.text-faded.no-wrap');
    
        consoleMinPrice = await newPage.evaluate((selector) => {
            const element = document.querySelector(selector);
            return element ? element.textContent : null;
        }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-ps.price-box-original-player > div.price-wrapper > div.price-pr.font-small.semi-bold.text-faded.no-wrap');
    
        await newPage.close();
    }

    const element: ElementHandle | null = await page.$(selector);

    if (element) {
        const boundingBox = await element.boundingBox();
        
        if (boundingBox) {
            const marginBoundingBox = {
                x: boundingBox.x,
                y: boundingBox.y,
                width: boundingBox.width,
                height: boundingBox.height - 385
            };
            const imageBuffer = await page.screenshot({
                clip: marginBoundingBox
            });
            await browser.close();
            return { image: Buffer.from(imageBuffer), name: playerName, country: country, pricePC: pricePC, priceConsole: priceConsole, rating: playerRating, card: null, minPCPrice: pcMinPrice, minConsolePrice: consoleMinPrice };
        } 
    }
    await browser.close();
    return undefined;
})