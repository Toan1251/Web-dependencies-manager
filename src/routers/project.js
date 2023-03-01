import express from "express";
import gPP from "../utils/getProjectProperty.js";
import db from "../utils/db.js"
import crawl from "../utils/crawl.js"
import cf from '../utils/config.js'

const router = express.Router();

router.post('/', async (req, res) => {
    const root_url = req.body.url;
    const project = await db.findObject({root_url: root_url}, 'project');
    if(project != null) {
        const now = new Date();
        const last_update = new Date(project.updatedAt);
        if(now - last_update < 10*24*60*60*1000){
            res.status(302).redirect(`/project/${project._id}`);
            return;
        }
    }
    try{
        // set up
        const branches = await gPP.getBranches(root_url);
        const commits = await gPP.getCommits(root_url);
        const name = root_url.split('/').pop();
        let newProject = project
        if(project == null) {
            newProject = await db.createObject({
                root_url: root_url,
                name: name,
                commits: commits,
                branches: branches
            }, 'project')
        }

        branches.shift();
        const ignore = req.body.ignore;
        let newIgnore = `${branches.join(',')},${commits.join(',')},${ignore}`;
        if (newIgnore.startsWith(',')){
            newIgnore = newIgnore.substring(1, newIgnore.length)
        }
        
        // crawl and save urls
        const urlList = await crawl.crawl(root_url, req.body.domain, req.body.module, newIgnore);
        const updateUrl = [];
        urlList.forEach(ele => {
            updateUrl.push(db.updateObject({url: ele}, {projectId: newProject._id}, 'set', 'url'
            ))
        })
        const update = await Promise.all(updateUrl)
        const urlAfterUpdate = await db.findAllObjects({projectId: newProject._id}, 'url');

        setTimeout(() =>{
            res.status(302).redirect(`/project/${newProject._id}`);
        }, 5000)

        // assign config to project
        const configUrls = await db.findAllObjects({
            projectId: newProject._id,
            type: 'config'
        }, 'url')

        const temp = configUrls[0].url
        
        let language = "";
        if(temp.endsWith('package.json')){
            language = 'javascript'
        }else if(temp.endsWith('pom.xml') || temp.endsWith('build.gradle')){
            language = 'java'
        }

        const fn = async(isDev=false) => {
            configUrls.forEach(async url => {
                const dependenciesList = await cf.getConfig(url.url, isDev);
                dependenciesList.forEach(async dp => {
                    let dependencyObj = await db.findObject(dp, 'dependency');
                    if(dependencyObj == null){
                        dependencyObj = await db.createObject({...dp, language: language}, 'dependency');
                    }

                    await db.updateObject(
                        {_id: newProject._id},
                        isDev ? {devDependencies: dependencyObj._id} : {dependencies: dependencyObj._id},
                        'push',
                        'project'
                    )
                });
            });
        }
        fn();
        fn(true);

    }catch (e){
        console.log(e.message);
    }
})

router.get('/:projectId', async (req, res) => {
    try{
        //find project
        const project = await db.findObject({_id: req.params.projectId}, 'project');

        const fn = async(isDev=false) => {
            const dependenciesPromise = [];
            let ids = isDev ? project.devDependencies : project.dependencies
            ids.forEach(id => {
                dependenciesPromise.push(db.findObject({_id: id}, 'dependency'))
            })
            const dependenciesList = await Promise.all(dependenciesPromise);
            const dependencies = dependenciesList.map(dependencyObj => {
                return {
                    name: dependencyObj.name,
                    ver: dependencyObj.version
                }
            })
            return dependencies
        }
        //find project dependencies
        res.status(200).send({
            name: project.name,
            root_url: project.root_url,
            id: project._id,
            dependencies: await fn(),
            devDependencies: await fn(true)
        })
    }catch (e){
        console.log(e.message);
    }
})

router.get('/', async (req, res) => {
    try{
        const projects = await db.findAllObjects({}, 'project');
        res.status(200).send({
            projects: projects
        })
    }catch(e){
        console.log(e)
    }
})

export default router;