import express from "express";
import db from '../utils/db.js';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const data = await db.createObject(req.body, 'host');    
        console.log(data);
        res.status(200).send(data);
    }catch (err) {
        res.status(404).send(err.message);
    }
})

router.put('/:hostname', async (req, res) => {
    try{
        const updateHost = await db.updateObject({hostname: req.params.hostname}, req.body, 'set', 'host');
        console.log(updateHost);
        res.status(200).send(updateHost);
    }catch(e){
        res.status(404).send(e.message);
    }
})

export default router;