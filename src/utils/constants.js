import puppeteer from 'puppeteer'

const browser = await puppeteer.launch({headless: false});
const page = await browser.newPage();

export default {
    browser: browser,
    page: page
}