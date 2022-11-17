import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import {crawl} from "./utils/crawl.js"
import hostRouter from "./routers/host.js"

// config
dotenv.config();
mongoose.connect(process.env.MONGO_CONNECTION, ()=>{
    console.log(`connected to mongoDB`)
});

const app = express();
// middleware
app.use(bodyParser.json());
app.use(cors());


app.use('/host', hostRouter)
app.post('/linkedlist', async (req, res) => {
    let data;
    try{
        data = await crawl(req.body.url, req.body.domain, req.body.module, req.body.ignore);
        console.log(data);
    }catch(e){
        res.status(404).send(e.message);
    }
    res.status(200).send(data)
})


const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
}).setTimeout(3600 * 1000)


