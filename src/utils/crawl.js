import axios from 'axios';
import cheerio from 'cheerio';
import urlParser from 'url';
import db from './db.js'
import puppeteer from 'puppeteer'
import helper from './helper.js';

const getUrl = (link, host, protocol) => {
    let url;
    if (link.startsWith("http")) {
        url = link;
    } else if (link.startsWith("//")) {
        url = `${protocol}${link}`;
    } else if(link.startsWith("/")){
        url = `${protocol}//${host}${link}`;
    }
    else {
        url = `${protocol}//${host}/${link}`;
    }
    return deleteBookmark(url);
};
// delete bookmark #
const deleteBookmark = url => {
    if(url.includes("#")){
        return url.substring(0, url.indexOf("#"))
    }
    return url;
}


// checking if url have a special string
const isUrlHave = (url, checkstring) => {
    const checkstringList = checkstring.split(',');
    const filter = checkstringList.map(str => str.trim()).filter(str => url.includes(str));
    if(filter.length === 0) return false;
    else return true;
}

// checking if url is valid
const checkValidUrl = (url, domain, module, ignore, limit,seenUrl, limitCount) => {
    if(limit < limitCount) return false
    if(!isUrlHave(url,domain)) return false;
    if(!isUrlHave(url,module)) return false;
    if(isUrlHave(url,ignore)) return false;
    if(seenUrl[url]) return false;
    return true;
}

// crawl a url, return {hyperlinks with url, resource type
const crawlBot = async (url, domain, module, ignore, limit) => {
    // prepare
    // linksQueue.push(url);
    let limitCount = 0;
    let seenUrl = {};
    let acceptedUrl = [];
    let linksQueue = [url];

    // BFS crawl hyperlinks
    while (linksQueue.length > 0 && limitCount < limit) {
        const nextUrl = linksQueue.shift();

        // filter and validate
        if(!checkValidUrl(nextUrl,domain, module, ignore, limit, seenUrl, limitCount)) {
            continue;
        }else{
            seenUrl[nextUrl] = true;
        }

        try{
            const {hyperlinks, urlType} = await getUrlAttributes(nextUrl);
            const {host, protocol} = urlParser.parse(nextUrl);
            const directlinks = []
            hyperlinks.forEach(link => {
                directlinks.push(getUrl(link, host, protocol))
            });
            linksQueue.push(...helper.getUnique(directlinks));

            // counter
            limitCount++;
            console.log(`Crawling ${limitCount} ${nextUrl}`);
            acceptedUrl.push(nextUrl);
            
            //save to db
            const nextUrlObj = await db.findObject({url: nextUrl}, 'url');
            if(nextUrlObj == null){
                const newUrlObj = await db.createObject({
                    url: nextUrl,
                    type: urlType,
                    hyperlinks: directlinks
                }, 'url')
            }
        }catch (e){
            console.log(`${nextUrl} can't be reached`);
            continue;
        }
    }    
    console.log(`crawl full`)
    return acceptedUrl;
}

// get resource type
// input    @url: an url want to get type
// return   {hyperlink, urlType}
//          @hyperlinks: a list of hyperlink was pointing to on this url
//          @urlType: type of data
const getUrlAttributes = async (url) => {
    const $ = await helper.cheerioLoader(url);
    const links = $("a").map((i, link) => link.attribs.href).get();

    let type;
    if(links.length !== 0) type = "page";
    else if(url.endsWith("package.json") || url.endsWith("pom.xml") || url.endsWith("build.gradle")) type = "config"
    else type = url.split(".").pop();
    return {
        hyperlinks: links,
        urlType: type
    }
}

const getAllData = async url => {
    let links = [], scripts = [], img = [], css = [], archon = [];
    try{
        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();
        page.setDefaultTimeout(15000);
        await page.goto(url);

        links = await page.$$eval('link', links => links.map(link => link.href));
        scripts = await page.$$eval('script', scripts => scripts.map(script => script.src));
        css = await page.$$eval('link[rel="stylesheet"]', links => links.map(link => link.href));
        img = (await page.$$eval('img', images => images.map(img => img.src)))
        .concat(await page.$$eval('link[rel*="icon"]', links => links.map(link => link.href)));
        archon = await page.$$eval('a', archons => archons.map(a => a.href));
        let pH = 0;
        while(pH < await page.evaluate("document.body.scrollHeight")){
            try{
                pH = await page.evaluate("document.body.scrollHeight");
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
                await page.waitForFunction(
                    `document.body.scrollHeight > ${pH}`,
                    {timeout: 2000}
                );
                await new Promise((resolve) => setTimeout(resolve, 1000));
                img = img.concat(await page.$$eval('img', images => images.map(img => img.src)));
                archon = archon.concat(await page.$$eval('a', archons => archons.map(a => a.href)));
            }catch (e){
                continue;
            }
        }
        await page.close();
        await browser.close();
    }catch (e){

    }

    links = helper.getUnique(links);
    scripts = helper.getUnique(scripts);
    img = helper.getUnique(img);
    css = helper.getUnique(css);
    archon = helper.getUnique(archon.map(a => deleteBookmark(a)));
    return {
        stylesheet: css,
        images: img,
        scripts: scripts,
        hyperlinks: archon,
        links: links
    }
}

export const crawl = async (url="", domain="", module="", ignore="///", limit=1000) => {
    const hyperlinks = await crawlBot(url, domain, module, ignore, limit);
    return hyperlinks;
}

export default {
    crawl,
    getAllData
}