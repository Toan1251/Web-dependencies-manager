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

const isUrlHave = (url, checkstring) => {
    const checkstringList = checkstring.split(',');
    const filter = checkstringList.map(str => str.trim()).filter(str => url.includes(str));
    if(filter.length === 0) return false;
    else return true;
}

const checkValidUrl = (url, domain, module, ignore, limit) => {
    if(limit < limitCount) return false
    if(!isUrlHave(url,domain)) return false;
    if(!isUrlHave(url,module)) return false;
    if(isUrlHave(url,ignore)) return false;
    if(seenUrl[url]) return false;
    return true;
}

// crawl a url, return {hyperlinks with url, resource type}
export const crawl = async (url="", domain="", module="", ignore="///", limit=5000) => {
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
            hyperlinks.forEach(link => {
                linksQueue.push(getUrl(link, host, protocol))
            })

            // counter
            limitCount++;
            console.log(`Crawling ${limitCount} ${nextUrl}`);
            acceptedUrl.push(nextUrl);
        }catch (e){
            console.log(`${nextUrl} can't be reached`);
            // crawl(linksQueue.shift(), domain, module, ignore, limit);
            continue;
        }
    }    

    console.log(`crawl full`)
    return acceptedUrl;
}

// get resource type
const getUrlAttributes = async (url) => {
    const res = await axios.get(url);
    const html = await res.data;
    const $ = cheerio.load(html);
    const links = $("a").map((i, link) => link.attribs.href).get();

    let type;
    if(links.length !== 0) type = "page";
    else if(url.endsWith("package.json")) type = "nodejs dependencies config"
    else if(url.endsWith("pom.xml")) type = "maven dependencies config"
    else if(url.endsWith("app/build.gradle")) type = "gradle dependencies config"
    else type = url.split(".").pop();
    return {
        hyperlinks: links,
        urlType: type
    }
}

// BFS crawl hyperlinks
// export const crawl = async (url="", domain="", module="", ignore="///", limit=1000) => {
//     linksQueue.push(url);
//     while (linksQueue.length > 0){
//         try{
//             await crawlUrl(linksQueue.shift(), domain, module, ignore, limit);
//         }catch(e){
//             //console.log(e.message);
//             continue;
//         }
//     }

//     //clear data and return
//     const data = acceptedUrl;
//     clearCache();
//     return data;
// }

const clearCache = () => {
    seenUrl = {};
    limitCount = 0;
    acceptedUrl = [];
    linksQueue = [];
}

