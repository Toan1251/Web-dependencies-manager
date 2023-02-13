import mongoose from "mongoose";

// Schema for Url
const urlSchema = mongoose.Schema({
    url: {
        type:String,
        required:true,
        unique:true,
    },
    projectId:{
        type:String,
        default: ""
    },
    type: {
        type:String,
        default: "page"
    },
    scripts: {
        type:Array,
        default: [],
    },
    stylesheet: {
        type:Array,
        default: [],
    },
    images: {
        type:Array,
        default: [],
    },
    hyperlinks: {
        type:Array,
        default: [],
    },
    links: {
        type:Array,
        default: [],
    }
},{timestamps: true})

export default mongoose.model('Url', urlSchema);