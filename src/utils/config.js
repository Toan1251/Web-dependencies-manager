import axios from 'axios';
import {xml2js} from 'xml-js'
import g2js from './g2js.js'

// get a list of dependencies config from config file
// input    @url:raw project config url
//          @isDev  = true: get dev dependencies
//                  = false: get dependencies
// return:  A list of dependencies object: {name: dependency name, version: minimum dependency version}
const getConfig = async (url, isDev) => {
    let data;
    try{
        const res = await axios.get(url)
        data = await res.data;
    }catch(e){
        throw new Error(`Could not get config from ${url}`);
    }
    const dependenciesList = await getConfigData(url, data, isDev);
    return dependenciesList;
}

const getConfigData = async (url, data, isDev) => {
    if(url.endsWith('package.json')) return getConfigNode(data, isDev);
    else if(url.endsWith('pom.xml')) return getConfigMaven(data, isDev);
    else if(url.endsWith('build.gradle')) return await getConfigGradle(data, isDev);
    else throw new Error('not a config url');
}

// use for nodejs option
const getConfigNode = (data, isDev) => {
    const dependencies = isDev ? data.devDependencies : data.dependencies;
    const dependenciesList = [];
    if(dependencies == undefined){
        return dependenciesList;
    }
    
    for(const [key, value] of Object.entries(dependencies)) {
        dependenciesList.push({
            name: key,
            version: getVersion(value)
        })
    }
    return dependenciesList;
}

// split version into major.minor.path.pre-release structure
const getVersion = version => {
    let verString = version, pre_release;
    verString = verString.replace('*', '0').replace('x', '0');
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
const getConfigMaven = (data, isDev) => {
    const configObj = xml2js(data, {compact:true, spaces: 4})
    const dependencies = configObj.project.dependencyManagement.dependencies.dependency;
    const dependenciesList = [];
    if(dependencies == undefined){
        return dependenciesList;
    }
    dependencies.forEach(dependency => {
        if(isDev ? dependency.scope != undefined : dependency.scope == undefined){
            let dependencyName = `${dependency.groupId._text}/${dependency.artifactId._text}`;
            dependenciesList.push({
                name: dependencyName,
                version: getVersion(dependency.version._text)
            })
        }
    })

    return dependenciesList;
}


// use for gradle option
const getConfigGradle = async (data, isDev) => {
    const dependenciesList = [];
    const configObj = await g2js.parseText(data);
    const dependencies = configObj.dependencies;
    if(dependencies === undefined){
        return dependenciesList;
    }

    dependencies.forEach(dependency => {
        if(isDev ? dependency.type != 'implementation' : dependency.type == 'implementation') {
            let dependencyName = `${dependency.group}/${dependency.name}`;
            dependenciesList.push({
                name: dependencyName,
                version: getVersion(dependency.version)
            })
        }
    })

    return dependenciesList;
}

export default {
    getConfig,
    getVersion
}