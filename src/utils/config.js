import axios from 'axios';
import {xml2js} from 'xml-js'
import g2js from './g2js.js'

// get a list of dependencies config from config file
// input    @url:raw project config url
//          @option: (nodejs, maven or gradle dependencies config), type of project config
// return:  A list of dependencies object: {name: dependency name, version: minimum dependency version}
const getConfig = async (url, option) => {
    let data;
    try{
        const res = await axios.get(url)
        data = await res.data;
    }catch(e){
        throw new Error(`Could not get config from ${url}`);
    }

    switch(option){
        case 'nodejs dependencies config':
            return getConfigNode(data);
        case 'maven dependencies config':
            return getConfigMaven(data);
        case 'gradle dependencies config':
            return await getConfigGradle(data);
        default:
            throw new Error(`missing option`);
    }
}

// use for nodejs option
const getConfigNode = data => {
    const dependencies = data.dependencies;
    const dependenciesList = [];
    for(const [key, value] of Object.entries(dependencies)) {
        dependenciesList.push({
            name: key,
            version: getVersion(value)
        })
    }
    console.log(dependenciesList);
    return dependenciesList;
}

// split version into major.minor.path.pre-release structure
const getVersion = version => {
    let verString = version, pre_release;
    if(verString.startsWith('^') || verString.startsWith('~')){
        verString = verString.substring(1, verString.length);
    }

    if(verString.includes('-')){
        pre_release = verString.substring(verString.indexOf('-') + 1, verString.length);
        verString = verString.substring(0, verString.indexOf('-'));
    }

    const [major, minor, patch] = verString.split('.');

    return {major: major, minor: minor, patch: patch, pre_release: pre_release}
}

// compare 2 version, return true when version1 is greater than version2
const isHigherOrEqual = (ver1, ver2) => {
    if(Number(ver1.major) > Number(ver2.major)) return true;
    if(Number(ver1.minor) > Number(ver2.minor)) return true;
    if(Number(ver1.patch) >= Number(ver2.patch)) return true;
    return false;
}


// use for maven option
const getConfigMaven = data => {
    const configObj = xml2js(data, {compact:true, spaces: 4})
    const dependencies = configObj.project.dependencyManagement.dependencies.dependency;
    const dependenciesList = [];

    dependencies.forEach(dependency => {
        let dependencyName = `${dependency.groupId._text}/${dependency.artifactId._text}`;
        dependenciesList.push({
            name: dependencyName,
            version: getVersion(dependency.version._text)
        })
    })

    return dependenciesList;
}


// use for gradle option
const getConfigGradle = async (data) => {
    const configObj = await g2js.parseText(data);
    const dependencies = configObj.dependencies
    const dependenciesList = [];
    
    dependencies.forEach(dependency => {
        let dependencyName = `${dependency.group}/${dependency.name}`;
        dependenciesList.push({
            name: dependencyName,
            version: getVersion(dependency.version)
        })
    })
    return dependenciesList;
}

export default {
    getConfig,
    getVersion
}