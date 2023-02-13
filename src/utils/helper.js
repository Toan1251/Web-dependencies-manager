import Cheerio  from "cheerio";
import axios from "axios";

const cheerioLoader = async (url) => {
    try{
        const res = await axios.get(url);
        const data = res.data;
        const $ = Cheerio.load(data);
        return $;
    }catch (e){
        console.log(e.message);
    }
}

const getUnique = (arr) => {
    return [...new Set(arr)];
}

export default {
    cheerioLoader,
    getUnique,
}