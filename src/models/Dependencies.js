import mongoose from "mongoose";

// Schema for dependency
const dependencySchema = mongoose.Schema({
    name: {
        type:String,
        required: true
    },
    version: {
        major: {
            type: Number,
            default: 0,
            required: true
        },
        minor: {
            type: Number,
            default: 0,
            required: true
        },
        patch:{
            type: Number,
            default: 0,
            required: true
        },
        pre_release: {
            type: String,
        }
    },

    isLastest: {
        type:Boolean,
    }
},{timestamps: true})

export default mongoose.model('Dependency', dependencySchema)