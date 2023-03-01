import helper from './helper.js';

// get all branch from a project with root_url project
const getBranches = async (url) => {
    const $ = await helper.cheerioLoader(`${url}/branches`);
    const branches = $('ul li branch-filter-item').map((i, branch) => branch.attribs.branch).get();
    return branches;
}


// get all commit from a project with root_url project
const getCommits = async (url) => {
    const branches = await getBranches(url);
    const commits = [];
    while (branches.length > 0) {
        const branch = branches.shift();
        const $ = await helper.cheerioLoader(`${url}/commits/${branch}`);
        const commitOfBranch = $('ol li div.BtnGroup a').map((i, commit) => commit.attribs.href.split('/').pop());
        commits.push(...commitOfBranch);
    }
    return helper.getUnique(commits);
}

export default {
    getCommits,
    getBranches,
}