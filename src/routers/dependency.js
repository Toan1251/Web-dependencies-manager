import express from 'express';
import db from "../utils/db.js"
import puppeteer from "puppeteer"

const router = express.Router();

router.get('/', async (req, res) => {
    const name = req.query.d;
    const version = req.query.v;
    const dependency = await db.findObject({name: name}, 'dependency');

    let repo = '', selector = '', secondSelector = ''
    switch (dependency.language){
        case 'java':
            repo = `https://mvnrepository.com/artifact/${name}/${version}`;
            selector = 'div.version-section div tbody tr > td:nth-child(3) > a:nth-child(2)';
            secondSelector = 'div.version-section div tbody tr > td:nth-child(3) > a:nth-child(1)';
            break;
        case 'javascript':
            repo = `https://www.npmjs.com/package/${name}/v/${version}?activeTab=dependencies`
            selector = '#tabpanel-dependencies ul a'
            break;
        default:
            break;
    }
    try{
        const browser = await puppeteer.launch({headless: false});
        const page = await browser.newPage();
        await page.goto(repo);
        const dependencies = await page.$$eval(selector, elements => elements.map(ele => ele.innerText));
        if(dependency.language === 'java'){
            const packs = await page.$$eval(secondSelector, elements => elements.map(ele => ele.innerText));
            for(let i = 0; i < dependencies.length; i++){
                dependencies[i] = dependencies[i] + '/' + packs[i];
            }
        }
        await browser.close()
        res.status(200).send({
            package: name,
            version: version,
            dependencies: [...dependencies]
        })

    }catch (e){
        res.status(500).json(e)
    }
})



export default router;