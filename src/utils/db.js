import models from '../models/Models.js';

export const saveObject = async (obj, model) => {
    const mongooseModel = models[model];
    const saveObj = await new mongooseModel(obj);
    await saveObj.save();
    return saveObj;
}