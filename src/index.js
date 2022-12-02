import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import crawl from "./utils/crawl.js"
import projectRouter from './routers/project.js'
import db from './utils/db.js'
import urlRouter from './routers/url.js'
// config
dotenv.config();
mongoose.connect(process.env.MONGO_CONNECTION, ()=>{
    console.log(`connected to mongoDB`)
});

const app = express();
// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }))
app.use(cors());

app.use('/project', projectRouter);
app.use('/url', urlRouter);

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
}).setTimeout(3600 * 1000)


