import mongoose from "mongoose";

const urlSchema = mongoose.Schema({
    url: {
        type:String,
        required:true
    },
    projectId:{
        type:String,
        required:true
    },
    links: {
        type:Array,
        default: []
    },
    type: {
        type:String,
        default: "page"
    }
},{timestamps: true})

export default mongoose.model('Url', urlSchema);