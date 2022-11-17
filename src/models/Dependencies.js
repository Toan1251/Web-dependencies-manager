import mongoose from "mongoose";

const dependencySchema = mongoose.Schema({
    name: {
        type:String,
        required: true
    },
    version: {
        type:String,
        required: true,
    },

    isLastest: {
        type:Boolean,
    },

    url: {
        type:Array,
        default: [],
    },
},{timestamps: true})

export default mongoose.model('Dependency', dependencySchema)

