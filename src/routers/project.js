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
    const project = await db.findObject({root_url: root_url}, 'project');
    if(project != null) {
        res.status(302).redirect(`/project/${project._id}`);
        return;
    }
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


        // assign config to project
        const configUrls = await db.findAllObjects({
            projectId: newProject._id,
            type: 'config'
        }, 'url')

        const returnDependency = []
        const configs = [];
        configUrls.forEach(async url => {
            const dependenciesList = await cf.getConfig(url.url);
            configs.push(...dependenciesList);
            dependenciesList.forEach(async dp => {
                let dependencyObj = await db.findObject(dp, 'dependency');
                if(dependencyObj == null){
                    dependencyObj = await db.createObject(dp, 'dependency');
                }
                returnDependency.push(dependencyObj);
                await db.updateObject(
                    {_id: newProject._id},
                    {dependencies: dependencyObj._id},
                    'push',
                    'project'
                )
            });
        })

        //direct to get project
        const redirect = () => {
            if(returnDependency.length == configs.length && configs.length != 0){
                res.status(302).redirect(`/project/${newProject._id}`);
            }else {
                setTimeout(redirect, 1000)
            }
        }
        redirect(); 
    }catch (e){
        console.log(e.message);
    }
})

router.get('/:projectId', async (req, res) => {
    try{
        //find project
        const project = await db.findObject({_id: req.params.projectId}, 'project');
        const dependencyIds = project.dependencies;

        //find project dependencies
        const dependenciesPromise = [];
        dependencyIds.forEach(id => {
            dependenciesPromise.push(db.findObject({_id: id}, 'dependency'))
        })
        const dependenciesList = await Promise.all(dependenciesPromise);
        const dependencies = dependenciesList.map(dependencyObj => {
            return {
                name: dependencyObj.name,
                ver: dependencyObj.version
            }
        })

        res.status(200).send({
            name: project.name,
            root_url: project.root_url,
            dependencies: dependencies
        })
    }catch (e){
        console.log(e.message);
    }
})



export default router;