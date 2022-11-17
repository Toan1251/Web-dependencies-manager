import mongoose from "mongoose";

const HostSchema = mongoose.Schema({
    hostname: {
        type: String,
        required: true,
        unique: true
    },
    port: {
        type: Number,
    },
    protocol:{
        type: String,
    },
    Project: {
        type: Array,
        default: [],
    }
}, {timestamps: true})

export default mongoose.model('Host', HostSchema);