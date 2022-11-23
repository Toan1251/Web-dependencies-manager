import axios from 'axios';
import cheerio from 'cheerio';
import urlParser from 'url';
import db from './db.js'

let seenUrl = {};
let limitCount = 0;
let acceptedUrl = [];
let linksQueue = [];

// getUrl to fetch
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
const checkValidUrl = (url, domain, module, ignore, limit) => {
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
    linksQueue.push(url);

    // BFS crawl hyperlinks
    while (linksQueue.length > 0 && limitCount < limit) {
        const nextUrl = linksQueue.shift();

        // filter and validate
        if(!checkValidUrl(nextUrl,domain, module, ignore, limit)) {
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
            linksQueue.push(...directlinks);

            // counter
            limitCount++;
            console.log(`Crawling ${limitCount} ${nextUrl}`);
            acceptedUrl.push(nextUrl);
            
            //save to db
            const nextUrlObj = await db.findObject({url: nextUrl}, 'url');
            if(nextUrlObj == null){
                const newUrlObj = await db.createObject({
                    url: nextUrl,
                    directlinks: directlinks,
                    type: urlType
                }, 'url')
            }
        }catch (e){
            console.log(`${nextUrl} can't be reached`);
            // crawl(linksQueue.shift(), domain, module, ignore, limit);
            continue;
        }
    }    

    console.log(`crawl full`)
    return acceptedUrl;
}


// load data from url by cheerio
export const cheerioLoader = async url => {
    try{
        const res = await axios.get(url);
        const data = res.data;
        const $ = cheerio.load(data);
        return $;
    }catch (e){
        console.log(e.message);
    }
}

// get resource type
// input    @url: an url want to get type
// return   {hyperlink, urlType}
//          @hyperlinks: a list of hyperlink was pointing to on this url
//          @urlType: type of data
export const getUrlAttributes = async (url) => {
    const $ = await cheerioLoader(url);
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

const clearCache = () => {
    seenUrl = {};
    limitCount = 0;
    acceptedUrl = [];
    linksQueue = [];
}

export const crawl = async (url="", domain="", module="", ignore="///", limit=1000) => {
    const hyperlinks = await crawlBot(url, domain, module, ignore, limit);
    clearCache();
    return hyperlinks;
}

export default crawl;