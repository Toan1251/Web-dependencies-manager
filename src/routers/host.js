import express from "express";
import { saveObject } from '../utils/db.js';

const router = express.Router();

router.post('/', async (req, res) => {
    let data;
    try {
        data = await saveObject(req.body, 'host')
    }catch (err) {
        res.status(404).send(err.message);
    }
    
    console.log(data);
    res.status(200).send(data);
})

export default router;