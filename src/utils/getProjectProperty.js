import { cheerioLoader } from './crawl.js';

// get all branch from a project with root_url project
const getBranches = async (url) => {
    const $ = await cheerioLoader(`${url}/branches`);
    const branches = $('ul li branch-filter-item').map((i, branch) => branch.attribs.branch).get();
    return branches;
}


// get all commit from a project with root_url project
const getCommits = async (url) => {
    const branch = await getBranches(url);
    const $ = await cheerioLoader(`${url}/commits/${branch[0]}`);
    const commits = $('ol li p a').map((i, commit) => {
        const cm = commit.attribs.href.split('/');
        return cm.pop();
    }).get();
    return commits;
}

export default {
    getCommits,
    getBranches,
}