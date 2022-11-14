import axios from 'axios';
import cheerio from 'cheerio';
import urlParser from 'url';

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

export const crawlData = async url => {
    let data
    try {
        const res = await axios.get(url);
        data = res.data;
    }catch (e) {
        return;
    }
    return data;
}

// crawl a url, return {hyperlinks with url, resource type}
export const crawlUrl = async (url="", domain="", module="", ignore="///", limit=1000) => {
    // filter and counter
    if(seenUrl[url] || url.includes(ignore) || !url.includes(module)) return; //throw new Error("this url is not valid or was crawled");
    if(limitCount >= limit) return; //throw new RangeError("over limit crawl");
    seenUrl[url] = true;

    // parser
    const {host, protocol} = urlParser.parse(url);
    if(!host.includes(domain)) return; //throw new Error("this url is not valid");

    // fetch url
    let html;
    try{
        const res = await axios.get(url);
        html = await res.data;
    }catch(e){
        console.log(`${url} can't be reached`);
        return; //throw new Error(`can not get data from ${url}`);
    }

    // counter
    limitCount++;
    console.log(`Crawling success ${limitCount} ${url}`);
    acceptedUrl.push(url);

    const $ = cheerio.load(html);
    const links = $("a").map((i, link) => link.attribs.href).get();

    // get url, type
    links.forEach(link => {
        linksQueue.push(getUrl(link, host, protocol))
    })

    //console.log(result.hyperlinks);
    if(links.length === 0) {
        return getFileType(url);
    }
    //console.log(result);
    return "page";
}

// get resource type
const getFileType = url => {
    if(url.endsWith("package.json")) return "nodejs dependencies config"
    else if(url.endsWith("pom.xml")) return "maven dependencies config"
    else if(url.endsWith("app/build.gradle")) return "gradle dependencies config"
    else return url.split(".").pop();
}

// BFS crawl hyperlinks
export const crawl = async (url="", domain="", module="", ignore="///", limit=1000) => {
    linksQueue.push(url);
    while (linksQueue.length > 0){
        try{
            const result = await crawlUrl(linksQueue.shift(), domain, module, ignore, limit);
        }catch(e){
            //console.log(e.message);
            continue;
        }
    }

    //clear data and return
    const data = acceptedUrl;
    seenUrl = {};
    limitCount = 0;
    acceptedUrl = [];
    linksQueue = [];
    return data;
}

