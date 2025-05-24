import puppeteer, { ElementHandle, Page } from "puppeteer";
import { withErrorHandling } from "./errorHandler.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

const USER_AGENT_STRING =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

/**
 * Robust selector utilities for more stable scraping
 * Uses multiple fallback strategies to handle website changes:
 * 1. Specific class names (most stable)
 * 2. Partial class name matching (flexible)
 * 3. Semantic selectors based on content
 */
const robustSelectors = {
  // Player data selectors with fallbacks
  playerName: [
    ".playercard-25-name",
    ".player-name",
    '[class*="playercard"][class*="name"]',
    '[class*="player"][class*="name"]',
  ],

  playerRating: [
    ".playercard-25-rating",
    ".player-rating",
    '[class*="playercard"][class*="rating"]',
    '[class*="player"][class*="rating"]',
  ],

  // Player stats selectors
  playerStats: [
    ".playercard-25-extended-stats",
    ".playercard-extended-stats",
    '[class*="playercard"][class*="extended-stats"]',
    '[class*="player"][class*="stats"]',
  ],

  statNumber: [
    ".playercard-25-stat-number",
    ".playercard-stat-number",
    '[class*="stat-number"]',
  ],

  statValue: [
    ".playercard-25-stat-value",
    ".playercard-stat-value",
    '[class*="stat-value"]',
  ],

  // Nation/League/Club selectors
  nationImage: [
    'img[alt="Nation"]',
    "img.nation",
    '[class*="nation"]',
    'img[title*="Norway"], img[title*="Brazil"], img[title*="France"]', // Common nations
  ],

  leagueImage: [
    'img[alt="League"]',
    "img.playercard-25-league",
    '[class*="league"]',
  ],

  clubImage: ['img[alt="Club"]', "img.playercard-25-club", '[class*="club"]'],

  pricePC: [
    ".price-box.player-price-not-pc.price-box-original-player .price.lowest-price-1",
    ".price-box.player-price-not-pc .price.lowest-price-1",
    ".price-box-pc .price",
    '[class*="price-box"][class*="pc"] [class*="price"]',
    ".pc-price .price",
  ],

  priceConsole: [
    ".price-box.player-price-not-ps.price-box-original-player .price.lowest-price-1",
    ".price-box.player-price-not-ps .price.lowest-price-1",
    ".price-box-ps .price",
    '[class*="price-box"][class*="ps"] [class*="price"]',
    ".ps-price .price",
  ],

  minPricePC: [
    ".price-box.player-price-not-pc.price-box-original-player .price-pr",
    ".price-box.player-price-not-pc .price-pr",
    ".price-box-pc .min-price",
    '[class*="price-box"][class*="pc"] [class*="price-pr"]',
  ],

  minPriceConsole: [
    ".price-box.player-price-not-ps.price-box-original-player .price-pr",
    ".price-box.player-price-not-ps .price-pr",
    ".price-box-ps .min-price",
    '[class*="price-box"][class*="ps"] [class*="price-pr"]',
  ],

  playerHeaderSection: [
    ".player-header-section",
    '[class*="player-header"]',
    '[class*="player"][class*="section"]',
  ],

  elementsToHide: [
    '[class*="price-box"] a',
    '[class*="evolution-toggle"]',
    '[class*="prices-updated"]',
    '[class*="price-box"] .small-row',
  ],
};

/**
 * Generic function to wait for any of multiple selectors to be present
 */
async function waitForAnySelector(
  page: Page,
  selectors: string[],
  timeout: number = 30000
): Promise<boolean> {
  try {
    await page.waitForFunction(
      (selectorList) => {
        return selectorList.some((selector: string) =>
          document.querySelector(selector)
        );
      },
      { timeout },
      selectors
    );
    return true;
  } catch (error) {
    return false;
  }
}

// Robust element finder with multiple selector strategies
async function findElementRobustly(
  page: Page,
  selectors: string[]
): Promise<string | null> {
  for (const selector of selectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const text = await page.evaluate(
          (el) => el?.textContent?.trim(),
          element
        );
        if (text) return text;
      }
    } catch (error) {
      // Continue to next selector
    }
  }
  return null;
}

// Find element by text content (very stable approach)
async function findElementByText(
  page: Page,
  text: string,
  tag: string = "*"
): Promise<string | null> {
  try {
    const result = await page.evaluate(
      (searchText, tagName) => {
        const elements = document.querySelectorAll(tagName);
        for (const element of elements) {
          if (
            element.textContent
              ?.trim()
              .toLowerCase()
              .includes(searchText.toLowerCase())
          ) {
            return element.textContent?.trim();
          }
        }
        return null;
      },
      text,
      tag
    );
    return result;
  } catch (error) {
    return null;
  }
}

// Additional utility: Find by attribute patterns
async function findElementByAttribute(
  page: Page,
  attribute: string,
  value: string
): Promise<string | null> {
  try {
    const result = await page.evaluate(
      (attr, val) => {
        const elements = document.querySelectorAll(`[${attr}*="${val}"]`);
        for (const element of elements) {
          const text = element.textContent?.trim();
          if (text && /\d/.test(text)) return text;
        }
        return null;
      },
      attribute,
      value
    );
    return result;
  } catch (error) {
    return null;
  }
}

// Utility: Find element by proximity to another element
async function findElementNearText(
  page: Page,
  nearText: string,
  targetSelector: string
): Promise<string | null> {
  try {
    const result = await page.evaluate(
      (text, selector) => {
        // Find all elements containing the near text
        const elements = Array.from(document.querySelectorAll("*"));
        const nearElements = elements.filter((el) =>
          el.textContent?.toLowerCase().includes(text.toLowerCase())
        );

        for (const nearEl of nearElements) {
          // Look for target element in same container or nearby
          const container = nearEl.closest(
            'div, section, article, .container, [class*="container"]'
          );
          if (container) {
            const target = container.querySelector(selector);
            if (target?.textContent?.trim()) {
              return target.textContent.trim();
            }
          }
        }
        return null;
      },
      nearText,
      targetSelector
    );
    return result;
  } catch (error) {
    return null;
  }
}

// Find table data by header name (very stable for structured data)
async function findTableDataByHeader(
  page: Page,
  headerText: string
): Promise<string | null> {
  try {
    const result = await page.evaluate((header) => {
      const rows = Array.from(
        document.querySelectorAll('table tr, .table tr, [class*="table"] tr')
      );

      for (const row of rows) {
        const headerCell = row.querySelector(
          'th, td:first-child, [class*="header"]'
        );
        if (
          headerCell?.textContent
            ?.trim()
            .toLowerCase()
            .includes(header.toLowerCase())
        ) {
          const dataCell = row.querySelector(
            'td:not(:first-child), .data, [class*="data"]'
          );
          if (dataCell) {
            const link = dataCell.querySelector("a");
            return link?.textContent?.trim() || dataCell.textContent?.trim();
          }
        }
      }
      return null;
    }, headerText);
    return result || null;
  } catch (error) {
    return null;
  }
}

// Enhanced price finding with multiple strategies
async function findPriceDataEnhanced(
  page: Page,
  platform: "pc" | "console"
): Promise<{
  price: string | null;
  minPrice: string | null;
  maxPrice: string | null;
}> {
  const platformSelectors =
    platform === "pc" ? robustSelectors.pricePC : robustSelectors.priceConsole;
  const minPriceSelectors =
    platform === "pc"
      ? robustSelectors.minPricePC
      : robustSelectors.minPriceConsole;

  // Strategy 1: Use specific selectors
  let price: string | null = await findElementRobustly(page, platformSelectors);
  const priceRange = await findElementRobustly(page, minPriceSelectors);
  let minPrice: string | null = null;
  let maxPrice: string | null = null;
  if (priceRange) {
    const priceRangeArray = priceRange.replace("PR: ", "").split(" - ");
    minPrice = priceRangeArray[0];
    maxPrice = priceRangeArray[1];
  }

  // Strategy 2: Enhanced price box detection with original player filtering
  if (!price) {
    price = await page.evaluate((platform) => {
      const priceBoxes = document.querySelectorAll(".price-box");

      for (const box of priceBoxes) {
        const isOriginalPlayer = box.classList.contains(
          "price-box-original-player"
        );
        const isPlatformBox =
          platform === "pc"
            ? box.classList.contains("player-price-not-pc")
            : box.classList.contains("player-price-not-ps");

        if (isOriginalPlayer && isPlatformBox) {
          const priceElement = box.querySelector(".price.lowest-price-1");
          if (priceElement?.textContent) {
            const priceText = priceElement.textContent.trim();
            // Filter out "0" values
            if (priceText !== "0" && /\d+/.test(priceText)) {
              return priceText;
            }
          }
        }
      }
      return null;
    }, platform);
  }

  // Strategy 3: Look for any non-zero price in the correct platform section
  if (!price) {
    price = await page.evaluate((platform) => {
      const platformClass =
        platform === "pc" ? "player-price-not-pc" : "player-price-not-ps";
      const platformBoxes = document.querySelectorAll(`.${platformClass}`);

      for (const box of platformBoxes) {
        const priceElements = box.querySelectorAll(".price");
        for (const priceEl of priceElements) {
          const text = priceEl.textContent?.trim();
          if (text && text !== "0" && /\d+/.test(text)) {
            return text;
          }
        }
      }
      return null;
    }, platform);
  }

  // Strategy 4: Extract min price range
  if (!minPrice && price) {
    minPrice = await page.evaluate((platform) => {
      const platformClass =
        platform === "pc" ? "player-price-not-pc" : "player-price-not-ps";
      const platformBoxes = document.querySelectorAll(
        `.${platformClass}.price-box-original-player`
      );

      for (const box of platformBoxes) {
        const priceRangeEl = box.querySelector(".price-pr");
        if (priceRangeEl?.textContent) {
          const rangeText = priceRangeEl.textContent.trim();
          return rangeText;
        }
      }
      return null;
    }, platform);
  }

  return { price, minPrice, maxPrice };
}

// Extract player stats (Pac, Sho, Pas, Dri, Def, Phy)
async function extractPlayerStats(
  page: Page
): Promise<{ [key: string]: number } | null> {
  try {
    const stats = await page.evaluate((selectors) => {
      const statsContainer =
        document.querySelector(selectors.playerStats[0]) ||
        document.querySelector(selectors.playerStats[1]) ||
        document.querySelector(selectors.playerStats[2]);

      if (!statsContainer) return null;

      const statElements = statsContainer.querySelectorAll(
        '[class*="playercard-25-stats"], [class*="playercard-stats"]'
      );
      const statsObj: { [key: string]: number } = {};

      statElements.forEach((statEl) => {
        const numberEl = statEl.querySelector('[class*="stat-number"]');
        const valueEl = statEl.querySelector('[class*="stat-value"]');

        if (numberEl && valueEl) {
          const statName = valueEl.textContent?.trim();
          const statNumber = parseInt(numberEl.textContent?.trim() || "0");

          if (statName && !isNaN(statNumber)) {
            statsObj[statName] = statNumber;
          }
        }
      });

      return Object.keys(statsObj).length > 0 ? statsObj : null;
    }, robustSelectors);

    return stats;
  } catch (error) {
    console.warn("Failed to extract player stats:", error);
    return null;
  }
}

// Extract nation, league, and club information from images
async function extractPlayerInfo(
  page: Page
): Promise<{ nation?: string; league?: string; club?: string }> {
  try {
    const info = await page.evaluate((selectors) => {
      const result: { nation?: string; league?: string; club?: string } = {};

      // Extract nation
      const nationImg =
        document.querySelector(selectors.nationImage[0]) ||
        document.querySelector(selectors.nationImage[1]) ||
        document.querySelector(selectors.nationImage[2]);
      if (nationImg && nationImg.getAttribute("title")) {
        result.nation = nationImg.getAttribute("title") || undefined;
      }

      // Extract league
      const leagueImg =
        document.querySelector(selectors.leagueImage[0]) ||
        document.querySelector(selectors.leagueImage[1]) ||
        document.querySelector(selectors.leagueImage[2]);
      if (leagueImg && leagueImg.getAttribute("title")) {
        result.league = leagueImg.getAttribute("title") || undefined;
      }

      // Extract club
      const clubImg =
        document.querySelector(selectors.clubImage[0]) ||
        document.querySelector(selectors.clubImage[1]) ||
        document.querySelector(selectors.clubImage[2]);
      if (clubImg && clubImg.getAttribute("title")) {
        result.club = clubImg.getAttribute("title") || undefined;
      }

      return result;
    }, robustSelectors);

    return info;
  } catch (error) {
    console.warn("Failed to extract player info:", error);
    return {};
  }
}

// Enhanced player data extraction combining all information
async function extractCompletePlayerData(page: Page): Promise<{
  name?: string;
  rating?: string;
  stats?: { [key: string]: number };
  nation?: string;
  league?: string;
  club?: string;
}> {
  const [name, rating, stats, info] = await Promise.all([
    findElementRobustly(page, robustSelectors.playerName),
    findElementRobustly(page, robustSelectors.playerRating),
    extractPlayerStats(page),
    extractPlayerInfo(page),
  ]);

  return {
    name: name || undefined,
    rating: rating || undefined,
    stats: stats || undefined,
    ...info,
  };
}

export const getFutbinPlayerPageData = withErrorHandling(async function (
  url: string
) {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const browser = currentDir.includes("sw33t")
    ? await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
    : await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: process.env.BROWSER_PATH,
      });

  const page: Page = await browser.newPage();

  await page.setUserAgent(USER_AGENT_STRING);

  await page.setRequestInterception(true);

  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("futbin") || url.includes("discordapp")) {
      request.continue();
    } else {
      request.abort();
    }
  });

  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 }); // Wait for any player header section to load  const headerLoaded = await waitForAnySelector(page, [    ...robustSelectors.playerHeaderSection,    ...robustSelectors.playerName  ]);    if (!headerLoaded) {    console.warn('Player header section not found, continuing with fallback strategies');  }

  // Extract comprehensive player data
  const completePlayerData = await extractCompletePlayerData(page);

  // Extract player name with enhanced logic
  const urlParts = url.split("/");
  const playerNameWithHyphens = urlParts[urlParts.length - 1];

  // Strategy 1: Get full name from the info table (primary source)
  const fullNameFromTable = await findTableDataByHeader(page, "name");

  let playerName: string;

  if (fullNameFromTable) {
    // Check if the full name has 3 or more words
    const wordCount = fullNameFromTable.trim().split(/\s+/).length;

    if (wordCount > 3) {
      // Use short name from player card if full name is too long
      const shortNameFromCard =
        completePlayerData.name ||
        (await findElementRobustly(page, robustSelectors.playerName));

      playerName = shortNameFromCard || fullNameFromTable;
    } else {
      // Use full name from table (2 words or less)
      playerName = fullNameFromTable;
    }
  } else {
    // Fallback: use card name or URL parsing
    playerName =
      completePlayerData.name ||
      playerNameWithHyphens
        .split("-")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .toString()
        .replace(",", " ");
  }

  // Get player rating (from enhanced data or fallback)
  const playerRating =
    completePlayerData.rating ||
    (await findElementRobustly(page, robustSelectors.playerRating));

  // Get country using multiple strategies
  const country =
    completePlayerData.nation ||
    (await findTableDataByHeader(page, "nation")) ||
    (await findTableDataByHeader(page, "country"));

  // Get card type
  const cardType =
    (await findTableDataByHeader(page, "revision")) ||
    (await findTableDataByHeader(page, "version")) ||
    (await findTableDataByHeader(page, "type"));

  // Wait for price data to load (specifically wait for original player price boxes)
  await page.waitForFunction(
    () => {
      const originalPlayerBoxes = document.querySelectorAll(
        ".price-box-original-player"
      );
      const priceElements = document.querySelectorAll(".price.lowest-price-1");
      return originalPlayerBoxes.length > 0 && priceElements.length > 0;
    },
    { timeout: 45000 }
  );

  // Get PC and Console prices
  const pcPriceData = await findPriceDataEnhanced(page, "pc");
  const consolePriceData = await findPriceDataEnhanced(page, "console");

  // Find main screenshot element
  const screenshotElement =
    (await page.$(robustSelectors.playerHeaderSection[0])) ||
    (await page.$(robustSelectors.playerHeaderSection[1])) ||
    (await page.$(robustSelectors.playerHeaderSection[2]));

  if (screenshotElement) {
    // Hide unnecessary elements
    await page.evaluate((selectors: string[]) => {
      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          (element as HTMLElement).style.display = "none";
        });
      });
    }, robustSelectors.elementsToHide);

    // Adjust layout for screenshot
    await page.evaluate(() => {
      const altVersionsRow = document.querySelector(
        '[class*="alternative-versions"], [class*="versions"]'
      );
      if (altVersionsRow) {
        (altVersionsRow as HTMLElement).style.height = "300px";
      }
    });

    const boundingBox = await screenshotElement.boundingBox();

    if (boundingBox) {
      const marginBoundingBox = {
        x: boundingBox.x - 20,
        y: boundingBox.y - 10,
        width: boundingBox.width,
        height: boundingBox.height - 280,
      };
      const imageBuffer = await page.screenshot({
        clip: marginBoundingBox,
      });
      await browser.close();
      return {
        image: Buffer.from(imageBuffer),
        name: playerName,
        country: country,
        pricePC: pcPriceData.price,
        priceConsole: consolePriceData.price,
        rating: playerRating,
        card: cardType,
        minPCPrice: pcPriceData.minPrice
          ?.toString()
          .replace(/[^\d\s]/g, "")
          .match(/\d+(?:,\d+)*?/),
        minConsolePrice: consolePriceData.minPrice
          ?.toString()
          .replace(/[^\d\s]/g, "")
          .match(/\d+(?:,\d+)*?/),
        maxPCPrice: pcPriceData.maxPrice
          ?.toString()
          .replace(/[^\d\s]/g, "")
          .match(/\d+(?:,\d+)*?/),
        maxConsolePrice: consolePriceData.maxPrice
          ?.toString()
          .replace(/[^\d\s]/g, "")
          .match(/\d+(?:,\d+)*?/),
        // Enhanced data from the new extraction functions
        stats: completePlayerData.stats,
        league: completePlayerData.league,
        club: completePlayerData.club,
        fullNameFromTable: fullNameFromTable,
      };
    }
  }
  await browser.close();
  return undefined;
});

export const getPageContent = withErrorHandling(async (url: string) => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const browser = currentDir.includes("sw33t")
    ? await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
    : await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: process.env.BROWSER_PATH,
      });
  const page: Page = await browser.newPage();

  await page.setUserAgent(USER_AGENT_STRING);

  await page.setRequestInterception(true);

  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("futbin")) {
      request.continue();
    } else {
      request.abort();
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  await page.goto(url);

  const content = await page.content();

  await browser.close();
  return content;
});

export const getFutbinFoderPageData = withErrorHandling(async function (
  foderRating: number
) {
  const selector =
    "#content-container > div.extra-columns-wrapper.relative > div.players-table-wrapper.custom-scrollbar.overflow-x > table > tbody";
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const browser = currentDir.includes("sw33t")
    ? await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
    : await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: process.env.BROWSER_PATH,
      });
  const page: Page = await browser.newPage();

  await page.setUserAgent(USER_AGENT_STRING);

  await page.setRequestInterception(true);

  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("futbin") || url.includes("discordapp")) {
      request.continue();
    } else {
      request.abort();
    }
  });

  await page.setViewport({
    width: 1200,
    height: 1758,
  });

  await page.goto(
    `https://www.futbin.com/players?ps_price=200%2B&player_rating=${foderRating}-${foderRating}&sort=ps_price&order=asc`,
    { waitUntil: "networkidle0", timeout: 60000 }
  );

  const playerName = `${foderRating} Rated Players`;

  const playerRating = foderRating.toString();
  const country = "Gold Foder";

  let pricePC, priceConsole, pcMinPrice, consoleMinPrice;
  for (let i = 1; i <= 5; i++) {
    const href =
      "https://www.futbin.com" +
      (await page.evaluate(
        (selector, index) => {
          const element = document.querySelector(
            `${selector} > tr:nth-child(${index}) > td.table-name > a`
          );
          return element ? element.getAttribute("href") : null;
        },
        selector,
        i
      ));

    if (href.includes("/player/")) {
      const playerData = await getFutbinPlayerPageData(href);
      if (
        playerData &&
        playerData.pricePC &&
        playerData.priceConsole &&
        playerData.minPCPrice &&
        playerData.minConsolePrice
      ) {
        pricePC = playerData.pricePC;
        priceConsole = playerData.priceConsole;
        pcMinPrice = playerData.minPCPrice;
        consoleMinPrice = playerData.minConsolePrice;
        break;
      }
    }
  }

  await page.evaluate((tbodySelector: string) => {
    const tbody = document.querySelector(tbodySelector);
    if (!tbody) return;

    const trs = Array.from(tbody.querySelectorAll("tr")).slice(0, 5);

    trs.forEach((tr) => {
      const tdToMove = tr.querySelector(
        "td.table-price.no-wrap.platform-ps-only"
      ) as HTMLTableCellElement;
      if (tdToMove) {
        const tds = Array.from(
          tr.querySelectorAll("td")
        ) as HTMLTableCellElement[];
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

    const firstRow = tbody.querySelector("tr");
    if (!firstRow) return null;

    const columns = firstRow.querySelectorAll("td, th");
    if (columns.length < 2) return null;

    const width1 = window.getComputedStyle(columns[0]).width;
    const width2 = window.getComputedStyle(columns[1]).width;

    return {
      firstColumnWidth: parseInt(width1, 10),
      secondColumnWidth: parseInt(width2, 10),
    };
  }, selector);

  const marginBoundingBox = await page.evaluate(
    (tbodySelector, columnWidths) => {
      const tbody = document.querySelector(tbodySelector);
      if (!tbody) return null;

      const trs = Array.from(tbody.querySelectorAll("tr")).slice(0, 5);
      if (trs.length === 0) return null;

      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      trs.forEach((tr) => {
        const boundingBox = tr.getBoundingClientRect();
        minX = Math.min(minX, boundingBox.x);
        minY = Math.min(minY, boundingBox.y);
        if (columnWidths) {
          maxX = Math.max(
            maxX,
            boundingBox.x +
              columnWidths.firstColumnWidth +
              columnWidths.secondColumnWidth
          );
        }
        maxX = Math.max(maxX, boundingBox.x + 340);
        maxY = Math.max(maxY, boundingBox.y + boundingBox.height);
      });

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    },
    selector,
    columnWidths
  );

  if (marginBoundingBox) {
    const imageBuffer = await page.screenshot({
      clip: marginBoundingBox,
    });
    await browser.close();
    return {
      image: Buffer.from(imageBuffer),
      name: playerName,
      country: country,
      pricePC: pricePC,
      priceConsole: priceConsole,
      rating: playerRating,
      card: null,
      minPCPrice: pcMinPrice,
      minConsolePrice: consoleMinPrice,
    };
  }
});

export const getFutbinTOTWPageData = withErrorHandling(async function (
  foderRating: number
) {
  const selector =
    "#content-container > div.extra-columns-wrapper.relative > div.players-table-wrapper.custom-scrollbar.overflow-x > table > tbody";
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const browser = currentDir.includes("sw33t")
    ? await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
    : await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: process.env.BROWSER_PATH,
      });
  const page: Page = await browser.newPage();

  await page.setUserAgent(USER_AGENT_STRING);

  await page.setRequestInterception(true);

  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("futbin") || url.includes("discordapp")) {
      request.continue();
    } else {
      request.abort();
    }
  });

  await page.setViewport({
    width: 1200,
    height: 1758,
  });

  await page.goto(
    `https://www.futbin.com/players?ps_price=200%2B&version=if_gold&player_rating=${foderRating}-${foderRating}&sort=ps_price&order=asc`,
    { waitUntil: "networkidle0", timeout: 60000 }
  );

  const playerName = `${foderRating} Rated TOTW Players`;

  const playerRating = foderRating.toString();
  const country = "TOTW Inform";

  let pricePC, priceConsole, pcMinPrice, consoleMinPrice;
  for (let i = 1; i <= 5; i++) {
    const href =
      "https://www.futbin.com" +
      (await page.evaluate(
        (selector, index) => {
          const element = document.querySelector(
            `${selector} > tr:nth-child(${index}) > td.table-name > a`
          );
          return element ? element.getAttribute("href") : null;
        },
        selector,
        i
      ));

    if (href.includes("/player/")) {
      const playerData = await getFutbinPlayerPageData(href);
      if (
        playerData &&
        playerData.pricePC &&
        playerData.priceConsole &&
        playerData.minPCPrice &&
        playerData.minConsolePrice
      ) {
        pricePC = playerData.pricePC;
        priceConsole = playerData.priceConsole;
        pcMinPrice = playerData.minPCPrice;
        consoleMinPrice = playerData.minConsolePrice;
        break;
      }
    }
  }

  await page.evaluate((tbodySelector: string) => {
    const tbody = document.querySelector(tbodySelector);
    if (!tbody) return;

    const trs = Array.from(tbody.querySelectorAll("tr")).slice(0, 5);

    trs.forEach((tr) => {
      const tdToMove = tr.querySelector(
        "td.table-price.no-wrap.platform-ps-only"
      ) as HTMLTableCellElement;
      if (tdToMove) {
        const tds = Array.from(
          tr.querySelectorAll("td")
        ) as HTMLTableCellElement[];
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

    const firstRow = tbody.querySelector("tr");
    if (!firstRow) return null;

    const columns = firstRow.querySelectorAll("td, th");
    if (columns.length < 2) return null;

    const width1 = window.getComputedStyle(columns[0]).width;
    const width2 = window.getComputedStyle(columns[1]).width;

    return {
      firstColumnWidth: parseInt(width1, 10),
      secondColumnWidth: parseInt(width2, 10),
    };
  }, selector);

  const marginBoundingBox = await page.evaluate(
    (tbodySelector, columnWidths) => {
      const tbody = document.querySelector(tbodySelector);
      if (!tbody) return null;

      const trs = Array.from(tbody.querySelectorAll("tr")).slice(0, 5);
      if (trs.length === 0) return null;

      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      trs.forEach((tr) => {
        const boundingBox = tr.getBoundingClientRect();
        minX = Math.min(minX, boundingBox.x);
        minY = Math.min(minY, boundingBox.y);
        if (columnWidths) {
          maxX = Math.max(
            maxX,
            boundingBox.x +
              columnWidths.firstColumnWidth +
              columnWidths.secondColumnWidth
          );
        }
        maxX = Math.max(maxX, boundingBox.x + 340);
        maxY = Math.max(maxY, boundingBox.y + boundingBox.height);
      });

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };
    },
    selector,
    columnWidths
  );

  if (marginBoundingBox) {
    const imageBuffer = await page.screenshot({
      clip: marginBoundingBox,
    });
    await browser.close();
    return {
      image: Buffer.from(imageBuffer),
      name: playerName,
      country: country,
      pricePC: pricePC,
      priceConsole: priceConsole,
      rating: playerRating,
      card: null,
      minPCPrice: pcMinPrice,
      minConsolePrice: consoleMinPrice,
    };
  }
});
