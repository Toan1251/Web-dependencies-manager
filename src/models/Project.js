import mongoose from "mongoose";

// Schema for project
const projectSchema = mongoose.Schema({
    root_url: {
        type:String,
        required:true
    },
    name: {
        type:String,
        required:true,
        min: 5,
        max: 50
    },
    dependencies: {
        type:Array,
        default: [],
        required:true
    },
    devDependencies: {
        type:Array,
        default: [],
        required:true
    },
    commits: {
        type: Array,
        default: [],
    },
    branches: {
        type: Array,
        default: [],
    }
}, {timestamps: true})

export default mongoose.model('Project', projectSchema)