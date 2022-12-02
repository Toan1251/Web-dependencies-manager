import puppeteer from 'puppeteer'
import browser from './constants.js'


// get all branch from a project with root_url project
const getBranches = async (url) => {
    const page = browser.page;
    let branches;
    try{
        await page.goto(`${url}/branches`);
        await page.waitForSelector('ul li branch-filter-item', {timeout: 3000});
        branches = await page.$$eval("ul li branch-filter-item", elements => elements.map(e => e.branch))
    }catch (e){
        console.log(e);
    }finally{
        return branches;
    }
}


// get all commit from a project with root_url project
const getCommits = async (url) => {
    const page = browser.page;
    try{
        const branches = await getBranches(url);
        let commits = [];

        while (branches.length > 0) {
            const branch = branches.shift();
            await page.goto(`${url}/commits/${branch}`);
            await page.waitForSelector('ol li p a' ,{timeout: 3000});
            const commitOfBranch = await page.$$eval("ol li p a", elements => elements.map(e => e.href.split('/').pop()));
            commits.push(...commitOfBranch)
        }
        commits = [...new Set(commits)];
        return commits;
    }catch (e){
        console.log(e);
    }
}

export default {
    getCommits,
    getBranches,
}
