import puppeteer, { ElementHandle, Page } from 'puppeteer';
import { client, config } from '../index'
import { withErrorHandling } from './errorHandler';

const USER_AGENT_STRING = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'

export const getFutbinPlayerPageData = withErrorHandling(async function (url : string) {
    const selector = 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div'
    const selectorsToHide = ['body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-ps.price-box-original-player > a', 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-pc.price-box-original-player > a']
    const browser = await puppeteer.launch({ headless: true });

    const page: Page = await browser.newPage();

    await page.setUserAgent(USER_AGENT_STRING);
    
    const guild = await client.guilds.fetch(config.SERVER.INFO.ServerId.toString());
    const watermarkUrl = guild.iconURL()?.toString();
    const watermarkText = '@' + guild.name.toString();

    await page.goto(url);
    await page.waitForSelector(selector)

    const playerName = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent : null;
    }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.player-body-section.player-page-grid > div.medium-column > div.player-page-grid-inside > div.player-body-left.sidebar.gtSmartphone-only > div.standard-box.info-traits > div.info-wrapper > table > tbody > tr:nth-child(1) > td');

    const playerRating = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent : null;
    }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-card-section > div:nth-child(1) > div > div.playercard-24-rating-pos-wrapper > div.playercard-24-rating');

    const country = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent : null;
    }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.player-body-section.player-page-grid > div.medium-column > div.player-page-grid-inside > div.player-body-left.sidebar.gtSmartphone-only > div.standard-box.info-traits > div.info-wrapper > table > tbody > tr:nth-child(5) > td');
    
    const pricePC = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent : null;
    }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-pc.price-box-original-player > div.column > div.price.inline-with-icon.lowest-price-1');

    const priceConsole = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent : null;
    }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.column > div.m-column.relative > div.player-header-section > div > div.player-header-prices-section > div.price-box.player-price-not-ps.price-box-original-player > div.column > div.price.inline-with-icon.lowest-price-1');

    const cardType = await page.evaluate((selector) => {
        const element = document.querySelector(selector);
        return element ? element.textContent : null;
    }, 'body > div.widthControl.mainPagePadding > div.player-page.medium-column.displaying-market-prices > div.player-body-section.player-page-grid > div.medium-column > div.player-page-grid-inside > div.player-body-left.sidebar.gtSmartphone-only > div.standard-box.info-traits > div.info-wrapper > table > tbody > tr:nth-child(13) > td');

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
    const browser = await puppeteer.launch({ headless: true });
    const page: Page = await browser.newPage();

    await page.setUserAgent(USER_AGENT_STRING);

    await page.goto(url);

    const content = await page.content();

    await browser.close();
    return content
})