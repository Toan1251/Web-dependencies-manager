import express from "express";
import gPP from "../utils/getProjectProperty.js";
import db from "../utils/db.js"
import crawl from "../utils/crawl.js"
import cf from '../utils/config.js'

const router  = express.Router();

router.post('/', async (req, res) => {
    const url = req.body.url;
    const returnData = await crawl.getAllData(url);
    res.status(200).send({
        url: url,
        data: returnData
    });

    try{
        let urlObject = await db.findObject({url: url}, 'url');
        if(urlObject == null){
            urlObject = await db.createObject({
                url: url,
                type: 'page'
            }, 'url');
        }
        await db.updateObject(
            {url: url},
            {...returnData},
            'set',
            'url'
        )
    }catch (e){
        console.log(e);
    }
})

export default router;