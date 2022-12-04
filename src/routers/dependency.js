import express from "express";
import db from "../utils/db.js"
import puppeteer from "puppeteer"

const router = express.Router();

router.get('/:dependency', async (req, res) => {
    const name = req.params.dependency;
    const version = req.query.v;
    const dependency = await db.findObject({name: name}, 'dependency');
    let repo = '', selector = ''
    switch (dependency.language){
        case 'java':
            repo = `https://mvnrepository.com/artifact/${name}/${version}`;
            selector = 'div.version-section tr td > a:nth-child(2)'
            break;
        case 'javascript':
            repo = `https://www.npmjs.com/package/${name}/v/${version}?activeTab=dependencies`
            selector = '#tabpanel-dependencies ul a'
            break;
        default:
            break;
    }
    try{
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(repo);
        const dependencies = await page.$$eval(selector, elements => elements.map(ele => ele.innerText));
        res.status(200).send({
            package: name,
            version: version,
            dependencies: {...dependencies}
        })

    }catch (e){
        console.log(e)
    }
})

export default router;