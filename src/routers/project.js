import mongoose  from "mongoose";
import express from "express";
import axios  from "axios";
import gPP from "../utils/getProjectProperty.js";
import db from "../utils/db.js"
import crawl from "../utils/crawl.js"
import cf from '../utils/config.js'

const router = express.Router();

router.post('/', async (req, res) => {
    const root_url = req.body.url;
    try{
        // set up
        const branches = await gPP.getBranches(root_url);
        const commits = await gPP.getCommits(root_url);
        const name = root_url.split('/').pop();
        const newProject = await db.createObject({
            root_url: root_url,
            name: name,
            commits: commits,
            branches: branches
        }, 'project')
        branches.shift();
        const ignore = req.body.ignore;
        let newIgnore = `${branches.join(',')},${commits.join(',')},${ignore}`;
        if (newIgnore.startsWith(',')){
            newIgnore = newIgnore.substring(1, newIgnore.length)
        }
        
        // crawl and save urls
        const urlList = await crawl(root_url, req.body.domain, req.body.module, newIgnore);
        const updateUrl = [];
        urlList.forEach(ele => {
            updateUrl.push(db.updateObject({url: ele}, {projectId: newProject._id}, 'set', 'url'
            ))
        })
        const update = await Promise.all(updateUrl)
        const urlAfterUpdate = await db.findAllObjects({projectId: newProject._id}, 'url');
        res.status(200).send(urlAfterUpdate);

        // assign config to project
        const configUrls = await db.findAllObjects({
            projectId: newProject._id,
            type: 'config'
        }, 'url')

        configUrls.forEach(async url => {
            const dependenciesList = await cf.getConfig(url.url);
            dependenciesList.forEach(async dp => {
                let dependencyObj = await db.findObject(dp, 'dependency');
                if(dependencyObj == null){
                    dependencyObj = await db.createObject(dp, 'dependency');
                }
                await db.updateObject(
                    {_id: newProject._id},
                    {dependencies: dependencyObj._id},
                    'push',
                    'project'
                )
            })
        })
    }catch (e){
        console.log(e.message);
    }
})

router.get('/:projectName,')


export default router;