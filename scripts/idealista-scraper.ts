import { chromium, type BrowserContext } from "playwright";
import * as fs from "fs";
import * as path from "path";

// --- Config ---
const SEARCH_URL =
  "https://www.idealista.com/areas/alquiler-viviendas/con-precio-hasta_2100,metros-cuadrados-mas-de_80,amueblado_amueblados,alquiler-temporal/?shape=%28%28i%7C_pFfm%7C%40%3FvlRteJ%3F%3FwlRueJ%3F%29%29&ordenado-por=fecha-publicacion-desc";
const SEEN_FILE = path.join(__dirname, "../data/seen-idealista-listings.json");
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const IDEALISTA_COOKIES = process.env.IDEALISTA_COOKIES!;
const BASE = "https://www.idealista.com";
const CONCURRENCY = 3;

// --- Helpers ---
function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, "utf-8")));
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  fs.mkdirSync(path.dirname(SEEN_FILE), { recursive: true });
  fs.writeFileSync(SEEN_FILE, JSON.stringify([...seen], null, 2));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function parseCookies(str: string) {
  return str
    .split("; ")
    .map((pair) => {
      const idx = pair.indexOf("=");
      return {
        name: pair.substring(0, idx),
        value: pair.substring(idx + 1),
        domain: ".idealista.com",
        path: "/",
      };
    })
    .filter((c) => c.name && c.name !== "undefined");
}

async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, ...body }),
  });
  if (!res.ok) console.error(`Telegram ${method} failed:`, await res.text());
  return res;
}

function escMd(s: string): string {
  return s.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

async function sendListing(listing: Listing) {
  const caption = [
    `🏠 *${escMd(listing.title)}*`,
    `💰 ${escMd(listing.price)}`,
    `📍 ${escMd(listing.location)}`,
    `👤 ${escMd(listing.owner)}`,
    "",
    escMd(listing.description.slice(0, 600)),
    "",
    `🔗 [Ver anuncio](${listing.url})`,
  ].join("\n");

  if (listing.photos.length > 0) {
    const media = listing.photos.slice(0, 10).map((url, i) => ({
      type: "photo" as const,
      media: url,
      ...(i === 0 ? { caption, parse_mode: "MarkdownV2" } : {}),
    }));
    await tg("sendMediaGroup", { media });
  } else {
    await tg("sendMessage", { text: caption, parse_mode: "MarkdownV2" });
  }
}

interface Listing {
  id: string;
  url: string;
  title: string;
  price: string;
  location: string;
  description: string;
  owner: string;
  photos: string[];
}

function isBlocked(html: string): boolean {
  return (
    html.includes("captcha-delivery.com") ||
    html.includes("Se ha detectado un uso indebido")
  );
}

interface SearchItem {
  url: string;
  id: string;
  isAgency: boolean;
}

// --- Scraping ---
async function getSearchItems(context: BrowserContext): Promise<SearchItem[]> {
  const page = await context.newPage();
  try {
    await page.goto(SEARCH_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000);

    const content = await page.content();
    if (isBlocked(content)) {
      await tg("sendMessage", {
        text: "⚠️ Idealista scraper blocked by DataDome — cookies may have expired. Update the IDEALISTA_COOKIES secret.",
      });
      throw new Error("Blocked by DataDome — cookies may have expired");
    }

    // Extract URLs and agency status from search page in one pass
    const items: SearchItem[] = await page.$$eval("article.item", (articles) =>
      articles
        .map((article) => {
          const link = article.querySelector('a.item-link[href*="/inmueble/"]');
          const href = link?.getAttribute("href");
          if (!href) return null;
          const idMatch = href.match(/\/inmueble\/(\d+)/);
          if (!idMatch) return null;
          const isAgency = !!article.querySelector(".logo-branding");
          return { url: href, id: idMatch[1], isAgency };
        })
        .filter(Boolean) as SearchItem[]
    );

    console.log(`Search page: ${items.length} listings (${items.filter((i) => i.isAgency).length} with agency branding)`);
    return items.map((i) => ({ ...i, url: i.url.startsWith("http") ? i.url : `${BASE}${i.url}` }));
  } finally {
    await page.close();
  }
}

async function scrapeListing(context: BrowserContext, url: string): Promise<Listing | null> {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(1000);

    const content = await page.content();
    if (isBlocked(content)) {
      throw new Error("Blocked by DataDome on listing page");
    }

    const nameEl = await page.$(".professional-name .name");
    const nameText = nameEl ? (await nameEl.textContent())?.trim() : "";
    if (!nameText || nameText !== "Particular") return null;

    const ownerEl = await page.$(".professional-name .particular");
    const owner = ownerEl ? (await ownerEl.textContent())?.trim() || "Particular" : "Particular";

    const titleEl = await page.$(".main-info__title-main, h1.main-info__title");
    const title = titleEl ? (await titleEl.textContent())?.trim() || "Sin título" : "Sin título";

    const priceEl = await page.$(".info-data-price, .price");
    const price = priceEl ? (await priceEl.textContent())?.trim() || "?" : "?";

    const locEl = await page.$(".main-info__title-minor, .header-map-list");
    const location = locEl ? (await locEl.textContent())?.trim() || "" : "";

    const descEl = await page.$(".comment p, .adCommentsLanguage p, .comment");
    const description = descEl ? (await descEl.textContent())?.trim() || "" : "";

    const photos = await page.$$eval('img[src*="idealista.com/blur"]', (els) => [
      ...new Set(els.map((el) => el.src)),
    ]);

    const id = url.match(/\/inmueble\/(\d+)/)?.[1] || url;
    return { id, url, title, price, location, description, owner, photos };
  } finally {
    await page.close();
  }
}

// --- Main ---
async function main() {
  if (!BOT_TOKEN || !CHAT_ID) throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID required");
  if (!IDEALISTA_COOKIES) throw new Error("IDEALISTA_COOKIES required");

  const seen = loadSeen();
  console.log(`Loaded ${seen.size} seen listings`);

  const isCI = !!process.env.CI;
  const browser = await chromium.launch({
    headless: isCI,
    channel: isCI ? undefined : "chrome",
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "es-ES",
    viewport: { width: 1920, height: 1080 },
  });

  await context.addCookies(parseCookies(IDEALISTA_COOKIES));

  try {
    const items = await getSearchItems(context);

    // Filter: skip seen, skip agency-branded
    const toCheck = items.filter((i) => !seen.has(i.id) && !i.isAgency);
    // Mark agency-branded as seen immediately
    for (const i of items) if (i.isAgency) seen.add(i.id);

    console.log(`${toCheck.length} new non-agency listings to check`);

    // Scrape in parallel batches
    const listings: Listing[] = [];
    for (let i = 0; i < toCheck.length; i += CONCURRENCY) {
      const batch = toCheck.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (item) => {
          try {
            const listing = await scrapeListing(context, item.url);
            seen.add(item.id);
            if (listing) console.log(`  ✓ ${listing.title} (${listing.price})`);
            else console.log(`  ✗ Agency: ${item.url}`);
            return listing;
          } catch (err) {
            console.error(`  ✗ Error ${item.url}: ${err}`);
            if (String(err).includes("Blocked")) throw err;
            return null;
          }
        })
      );
      listings.push(...results.filter((r): r is Listing => r !== null));
      if (i + CONCURRENCY < toCheck.length) await sleep(1000);
    }

    // Send to Telegram sequentially
    for (const listing of listings) {
      await sendListing(listing);
      await sleep(500);
    }

    console.log(`Sent ${listings.length} new private listings`);
  } finally {
    await browser.close();
    saveSeen(seen);
    console.log(`Saved ${seen.size} total seen`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
