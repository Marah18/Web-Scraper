import axios from 'axios';
import * as cheerio from 'cheerio';

async function loadHtml(url) {
  const { data } = await axios.get(url);
  //console.log(data)
  return cheerio.load(data);
}


async function extractLinksLabels(url) {
  process.stdout.write('Scraping available days... ');

  const root = await loadHtml(url);
  // Cheerio object to show the parsed HTML document.
  const anchors = root('a');
  const links = anchors.map((i, element) => root(element).attr('href')).get();
  const names = anchors.map((i, element) => root(element).text().trim().replace(/\s+/g, '')).get();
  return [links, names];
}

function findAvailableDays(callenders) {
  // Extract keys (friend names) and calendars
  const friendNames = Object.keys(callenders);
  const calendars = friendNames.map(name => callenders[name]);
  const availableDays = Object.keys(calendars[0]);

  // find available days for all friends
  for (let i = 1; i < calendars.length; i++) {
    const currentCalendar = calendars[i];
    availableDays.filter(day => currentCalendar[day] === 'ok');
  }
  if (availableDays.length == 0) {
    //console.log("The friends are not available to see each other on the weekends")
    return;
  }
  process.stdout.write('OK\n');

  return availableDays;
}

async function scrapCalendar(url, name) {
  const extracted = await extractLinksLabels(url);
  const urls = extracted[0];
  const labels = extracted[1];

  const calendar = {};

  for (let i = 0; i < urls.length; i++) {
    calendar[labels[i]] = await getIndividualCalendar(url + urls[i], labels[i]);
  }
  //console.log(calendar)

  // check if it is empty
  // Object.keys(calendar).forEach(friend => {
  //   calendar[friend] = {}; 
  // });
  const availableDays = findAvailableDays(calendar);
  //console.log('Available days for all friends:', availableDays)
  return calendar;
}

// Fetch individual calendar data from a specific URL/friend
async function getIndividualCalendar(url) {
  try {
    const { data } = await axios.get(url);
    const root = cheerio.load(data);

    const table = root('table');
    const headers = table.find('th').map((i, el) => root(el).text()).get();
    const values = table.find('td').map((i, el) => root(el).text()).get();

    const calendar = {};
    // check characters 
    const validText = text => /^[a-zA-Z0-9]+$/.test(text);

    headers.forEach((header, index) => {
      const value = values[index];
      if (validText(value)) {
        calendar[header] = value.toLowerCase();
      }
    });

    return calendar;
  } catch (error) {
    console.error('Error fetching individual calendar:', error);
    throw error;
  }

}


export default scrapCalendar;
