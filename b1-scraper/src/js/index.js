import axios from 'axios';
import * as cheerio from 'cheerio';
import scrapCinema from './cinemaScraper.js';
import scrapCalendar from './calendarScraper.js';
import scrapBar from './restaurantScraper.js';


export async function scrapeWebsite(url) {
  const extractedData = await extractData(url);
  const finalData = await processScrapedData(extractedData);
  return finalData;
}

// get the HTML content of the URL and extracts urls and names of lables from <a>.
async function processScrapedData(extractedData) {
  const [urls, labels] = extractedData;
  const resultData = {};

  for (let i = 0; i < urls.length; i++) {
    const labelLowerCase = labels[i].toLowerCase();

    try {
      const scrappedData = await scrapData(labelLowerCase, urls[i], labels[i]);
      if (scrappedData) {
        resultData[scrappedData.key] = scrappedData.value;
      } else {
        console.log(`No data for: ${labelLowerCase}`);
      }
    } catch (error) {
      console.error(`Error processing ${labelLowerCase}:`, error);
    }
  }

  return resultData;
}

async function scrapData(type, link, name) {
  switch (type) {
    case 'calendar':
      return { key: 'calendar', value: await scrapCalendar(link) };
    case 'thecinema!':
      return { key: 'movies', value: await scrapCinema(link) };
    case "zeke'sbar!":
      return { key: 'dinner', value: await scrapBar(link) };
    default:
      return null;
  }
}

async function extractData(url) {
  return await extractLinksLabels(url, 'links');
}

async function extractLinksLabels(url, name) {
  process.stdout.write('Scraping ' + name + '... OK\n');

  const root = await loadHtml(url);
  // Cheerio object to show the parsed HTML document.
  const anchors = root('a');
  const links = anchors.map((i, element) => root(element).attr('href')).get();
  const names = anchors.map((i, element) => root(element).text().trim().replace(/\s+/g, '')).get();
  return [links, names];
}


async function loadHtml(url) {
  const { data } = await axios.get(url);
  return cheerio.load(data);
}

function findAvailableDays(calendars) {
  const availableDays = {};

  for (const friend in calendars) {
    for (const day in calendars[friend]) {
      if (calendars[friend][day] === 'ok') {
        if (!availableDays[day]) {
          availableDays[day] = 1;
        } else {
          availableDays[day]++;
        }
      }
    }
  }

  return Object.keys(availableDays).filter(day => availableDays[day] === 3);
}

function minChanger(time) {
  const [tim, min] = time.split(':').map(Number);
  return tim * 60 + min;
}

export function checkReserv(data) {
  process.stdout.write('\nRecommendations:\n');
  process.stdout.write('=================\n');

  const availableDays = findAvailableDays(data.calendar);

  if (availableDays.length === 0) {
    process.stdout.write('No reservations found!\n');
    return;
  }

  //console.log('Available Days:', availableDays);

  availableDays.forEach(day => {
    let available = true;
    const movies = data.movies[day];
    const AvailableDinner = data.dinner[day];

    // console.log('Movies:', movies);
    // console.log('Dinner:', );

    if (!movies || !AvailableDinner) {
      available = false;
    }

    if (!available) {
      process.stdout.write('No reservations found!' + day);

      return;
    }

    const possibleReservations = [];

    for (const movie in movies) {
      movies[movie].forEach(movieTime => {
        // because None of the movies are longer then 1 hour and 40 minutes.
        const movieEndTime = minChanger(movieTime) + 100; 
        //console.log(`movie: ${movie}, movie mime: ${movieTime},  end time: ${movieEndTime}`);

        AvailableDinner.forEach(dinnerSlot => {
          const [dinnerStartTime] = dinnerSlot.split(' - ');
          const dinnerTimeMin = minChanger(dinnerStartTime);
          if (dinnerTimeMin >= movieEndTime) {
            possibleReservations.push([movie, movieTime, dinnerSlot]);
          }
        });
      });
    }

    if (possibleReservations.length === 0) {
      process.stdout.write('No reservations found!' + day);
      
    } else {
      possibleReservations.forEach(reservation => {
        process.stdout.write('* On ' + day + ' the movie "' + reservation[0] + '" starts at ' + reservation[1] + ' and there is a free table at ' + reservation[2] + '.\n');
      });
    }
  });
}

// async function main() {
//   //console.log('Start Scraping ...');
//   const data = await scrapeWebsite(main_url);
//   //console.log('Scraped Data:', data); 
//   checkReserv(data);
// }

// main().catch(console.error);
