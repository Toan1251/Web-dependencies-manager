import mongoose from "mongoose";

const dependencySchema = mongoose.Schema({
    dependencies: {
        name: {
            type:String,
            required: true
        },
        version: {
            type:String,
            required: true,
        },
        required:true,
        unique:true,
    },

    url: {
        type:Array,
        default: [],
    },
},{timestamps: true})

export default mongoose.model('Dependency', dependencySchema)

