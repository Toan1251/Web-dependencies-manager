import express from "express";
import db from "..utils/db.js";

const router = express.Router();

router.get('/:dependency', async (req, res) => {
    const name = req.params.dependency;
    const version = req.query.v;
})

export default router;