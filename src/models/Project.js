import mongoose from "mongoose";

const projectSchema = mongoose.Schema({
    hostId: {
        type:String,
        required:true
    },
    root_urlId: {
        type:String,
    },
    config_fileId: {
        type:String,
    },
    name: {
        type:String,
        required:true,
        min: 5,
        max: 50
    },
    last_modified: {
        type:Date,
        required:true
    }
}, {timestamps: true})

export default mongoose.model('Project', projectSchema)