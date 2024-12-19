
import { scrapeWebsite, checkReserv } from './index.js';

const args = process.argv.slice(2);
// The application is able to take a parameter with the start URL.
const main_url = args[0] || 'https://courselab.lnu.se/scraper-site-1';

async function main() {
  const data = await scrapeWebsite(main_url);
  checkReserv(data);
}

main().catch(console.error);
