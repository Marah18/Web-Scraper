import axios from 'axios';
import * as cheerio from 'cheerio';

async function scrapBar(url) {
    const username = 'zeke';
    const password = 'coys';

    try {
        const { cookies, redirectUrl } = await performLogin(url, username, password);
        const values = await resReservations(redirectUrl, cookies);
        process.stdout.write('Scraping possible reservations... ');

        const bookingTimes = getBookingTime(values);
        process.stdout.write('OK\n');
        return bookingTimes;

    } catch (error) {
        console.error('Error scraping bar reservations:', error);
        return null;
    }
}

async function performLogin(url, username, password) {
    const document = await loadHtml(url);
    const form = document('form');
    let action = form.attr('action');

    if (!action.startsWith('http')) {
        action = new URL(action, url).href;
    }
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: `username=${username}&password=${password}&submit=login`,
        maxRedirects: 0, 
        validateStatus: status => status >= 200 && status < 400,
    };

    const res = await axios(action, options);
    // get from server the session cookie
    const setCookieHeader = res.headers['set-cookie'][0];
    const locationHeader = res.headers['location'];
    
    if (!setCookieHeader || !locationHeader) {
        throw new Error('Login failed or redirection headers missing');
    }
    
    const cookies = setCookieHeader.split(';')[0];
    const redirectUrl = new URL(locationHeader, action).href;

    return { cookies, redirectUrl };
}


function getBookingTime(days) {
    const data = {
        Friday: [],
        Saturday: [],
        Sunday: []
    };

    days.forEach(dayTime => {
        const day = dayTime.substring(0, 3);
        const startTime = dayTime.substring(3, 5) + ':00';
        const endTime = dayTime.substring(5, 7) + ':00';
        const movieTimeLength = `${startTime} - ${endTime}`;

        switch (day) {
            case 'fri':
                data.Friday.push(movieTimeLength);
                break;
            case 'sat':
                data.Saturday.push(movieTimeLength);
                break;
            case 'sun':
                data.Sunday.push(movieTimeLength);
                break;
            default:
                console.error(error)
                break;
        }
    });

    //console.log(data);
    return data;
}



async function resReservations(redirectUrl, cookies) {
    const req = await axios.get(redirectUrl, {
        headers: { Cookie: cookies },
    });

    const doc = req.data;
    const root = cheerio.load(doc);
    const radioOptions = root('input[type="radio"]');
    const values = radioOptions.map((i, element) => root(element).attr('value')).get();

    return values;
}


async function loadHtml(url) {
    const { data } = await axios.get(url);
    return cheerio.load(data);
}

export default scrapBar;