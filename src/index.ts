import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import {crawl, crawlUrl, crawlData} from "./utils/crawl"
import {log} from "./utils/logger"

// config
dotenv.config();
mongoose.connect(process.env.MONGO_CONNECTION, ()=>{
    console.log(`connected to mongoDB`)
});

const app = express();
// middleware
app.use(bodyParser.json());
app.use(cors());


const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
}).setTimeout(600 * 1000)




// crawl("https://www.facebook.com/groups/sportsbook2vn", "www.facebook.com", "sportbook2vn").then(hyperlinks => console.log(hyperlinks));
crawlData("https://www.facebook.com/groups/sportsbook2vn").then(data => log(data, "sportbook2vn.html"));
crawlData("https://www.facebook.com/groups/sportsbook2vn").then(data => console.log(data));
