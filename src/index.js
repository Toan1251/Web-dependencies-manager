import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import projectRouter from './routers/project.js'
import urlRouter from './routers/url.js'
import dependencyRouter from './routers/dependency.js'
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
app.use('/dependency', dependencyRouter);

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server is running at ${PORT}`);
}).setTimeout(3600 * 1000)


