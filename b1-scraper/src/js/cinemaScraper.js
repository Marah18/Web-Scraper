import axios from 'axios';
import * as cheerio from 'cheerio';

async function loadHtml(url) {
    const { data } = await axios.get(url);
    return cheerio.load(data);
}

async function extractCinemaSelOpt(url) {
    const data = await loadHtml(url);
    const selectItms = data('select');
    const movieNames = {};
    const day = {};
    const movieIds = {};
    const dayIds = {};

    selectItms.each((i, select) => {
        const options = data(select).find('option').slice(1);

        const selectedName = data(select).attr('name');
        const convetedText = options.map((i, option) => data(option).text()).get();
        const optionValues = options.map((i, option) => data(option).val()).get();

        if (selectedName.includes('movie')) {
            movieNames[selectedName] = convetedText;
            movieIds[selectedName] = optionValues;
        } else if (selectedName.includes('day')) {
            day[selectedName] = convetedText;
            dayIds[selectedName] = optionValues;
        }
    });

    return { movieNames, dayNames: day, movieIds, dayIds };
}

async function getMovieTimes(url, dayId, movieId) {
    const response = await axios.get(`${url}/check?day=${dayId}&movie=${movieId}`);
    const showtimeData = response.data;

    const availableShowtimes = [];
    for (let i = 0; i < showtimeData.length; i++) {
        if (showtimeData[i].status === 1) {
            availableShowtimes.push(showtimeData[i].time);
        }
    }
    return availableShowtimes;
}

async function scrapCinema(url) {
    const { movieNames, dayNames, movieIds, dayIds } = await extractCinemaSelOpt(url);
    process.stdout.write('Scraping showtimes ...');

    const showtimesData = {};

    for (let i = 0; i < movieNames['movie'].length; i++) {
        for (const day of dayNames['day']) {
            const showtimes = await getMovieTimes(url, dayIds['day'][dayNames['day'].indexOf(day)], movieIds['movie'][i]);
            if (showtimes.length === 0) continue;

            if (!showtimesData[day]) {
                showtimesData[day] = {};
            }
            if (!showtimesData[day][movieNames['movie'][i]]) {
                showtimesData[day][movieNames['movie'][i]] = showtimes;
            }
        }
    }
    process.stdout.write('OK\n');

    //console.log(showtimesData);
    return showtimesData;
}

export default scrapCinema;
