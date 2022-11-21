import mongoose  from "mongoose";
import express from "express";
import axios  from "axios";
import gPP from "../utils/getProjectProperty.js";
import db from "../utils/db.js"
import crawl from "../utils/crawl.js"

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
        console.log(branches)
        console.log(commits)
        const ignore = req.body.ignore;
        let newIgnore = `${branches.join(',')},${commits.join(',')},${ignore}`;
        if (newIgnore.startsWith(',')){
            newIgnore = newIgnore.substring(1, newIgnore.length)
        }
        console.log(newIgnore);
        
        // crawl and save data
        const urlList = await crawl(root_url, req.body.domain, req.body.module, newIgnore);
        const updateUrl = [];
        urlList.forEach(ele => {
            updateUrl.push(db.updateObject({url: ele}, {projectId: newProject._id}, 'set', 'url'
            ))
        })
        const update = await Promise.all(updateUrl)
        const urlAfterUpdate = await db.findAllObjects({projectId: newProject._id}, 'url');
        res.status(200).send(urlAfterUpdate);

    }catch (e){
        console.log(e.message);
    }
})


export default router;