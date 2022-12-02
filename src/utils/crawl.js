import axios from 'axios';
import cheerio from 'cheerio';
import urlParser from 'url';
import db from './db.js'
import puppeteer from 'puppeteer'
import browser from './constants.js'


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

const fillData = arr => {
    return [...new Set(arr)];
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
            try{
                await axios.get(nextUrl);
            }catch(e){
                console.log(`${nextUrl} is not exist`);
                continue;
            }
            const {hyperlinks, urlType} = await getUrlAttributes(nextUrl);
            linksQueue.push(...hyperlinks);

            // counter
            limitCount++;
            console.log(`Crawling ${limitCount} ${nextUrl}`);
            acceptedUrl.push(nextUrl);
            
            //save to db
            const nextUrlObj = await db.findObject({url: nextUrl}, 'url');
            if(nextUrlObj == null){
                const newUrlObj = await db.createObject({
                    url: nextUrl,
                    directlinks: hyperlinks,
                    type: urlType
                }, 'url')
            }
        }catch (e){
            console.log(e);
            // crawl(linksQueue.shift(), domain, module, ignore, limit);
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
    let links = [];
    const page = browser.page;
    try{
        await page.goto(url);
        await page.waitForSelector('a', {timeout: 2500})
        links = await page.$$eval('a', elements => elements.map(ele => ele.href));
        links = links.map(link => deleteBookmark(link));
        links = fillData(links)
    }catch(e){
        console.log(e);
    }finally{
        let type;
        if(links.length !== 0) type = "page";
        else if(url.endsWith("package.json") || url.endsWith("pom.xml") || url.endsWith("build.gradle")) type = "config"
        else type = url.split(".").pop().toLowerCase();
        return {
            hyperlinks: links,
            urlType: type
        }
    }
}

const getAllData = async url => {
    const page = browser.page;
    let links, scripts, img, css, archon
    try{
        await page.goto(url);
        await page.waitForSelector('a', {timeout: 1500});

        links = await page.$$eval('link', links => links.map(link => link.href));
        
        scripts = await page.$$eval('script', scripts => scripts.map(script => script.src));
        img = (await page.$$eval('img', images => images.map(img => img.src)))
        .concat(await page.$$eval('link[rel*="icon"]', links => links.map(link => link.href)));
        css = await page.$$eval('link[rel="stylesheet"]', links => links.map(link => link.href));
        archon = (await page.$$eval('a', archons => archons.map(a => a.href))).map(a => deleteBookmark(a));
    }catch (e){
        console.log(e)
    }
    links = fillData(links);
    scripts = fillData(scripts);
    img = fillData(img);
    css = fillData(css);
    archon = fillData(archon);

    return {
        stylesheet: css,
        images: img,
        scripts: scripts,
        hyperlinks: archon
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