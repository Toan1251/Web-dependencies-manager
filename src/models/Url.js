import mongoose from "mongoose";

// Schema for Url
const urlSchema = mongoose.Schema({
    url: {
        type:String,
        required:true
    },
    projectId:{
        type:String,
        default: ""
    },
    directlinks: {
        type:Array,
        default: []
    },
    type: {
        type:String,
        default: "page"
    }
},{timestamps: true})

export default mongoose.model('Url', urlSchema);