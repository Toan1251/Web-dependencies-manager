import models from '../models/Models.js';

const getModel = (model) => {
    return models[model.toLowerCase()];
}

const createUpdateObj = (method, update) => {
    return JSON.parse(`{
        "$${method}": ${JSON.stringify(update)}
    }`)
}

const createObject = async (obj, model) => {
    const mongooseModel = getModel(model);
    const saveObj = await new mongooseModel(obj);
    await saveObj.save();
    return saveObj;
}

const findObject = async (filter, model) => {
    const mongooseModel = getModel(model);
    const foundObj = await mongooseModel.findOne(filter);
    return foundObj;
}

const findAllObjects = async (filter, model) => {
    const mongooseModel = getModel(model);
    const foundAll = await mongooseModel.find(filter);
    return foundAll;
}

const updateObject = async (filter, update, method, model) => {
    const mongooseModel = getModel(model);
    const updObj = await mongooseModel.updateOne(filter, createUpdateObj(method, update));
    return updObj;
}

const deleteObject = async (filter, model) => {
    const mongooseModel = getModel(model);
    const delObj = await mongooseModel.deleteOne(filter);
    return delObj;
}

export default {
    createObject,
    findObject,
    findAllObjects,
    updateObject,
    deleteObject
}