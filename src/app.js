import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import Joi from "joi";
import dayjs from "dayjs";

const app = express();

app.use(cors());
app.use(express.json());
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
	await mongoClient.connect();
	console.log("MongoDB connected");
} catch (err) {
	(err) => console.log(err.message);
}

const db = mongoClient.db();


app.post("/participants", async (req, res) => {
    const { name } = req.body;

    const schemaName = Joi.object({
        name: Joi.string().required()
    });

    const validateName = schemaName.validate(req.body, { abortEarly: false });

    if (validateName.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    const nameSearch = await db.collection("participants").findOne({ name: name });
    if (nameSearch) return res.status(409).send("User already exists");

    try {
        await db.collection("participants").insertOne({
            name: name,
            lastStatus: Date.now()
        });

        await db.collection("messages").insertOne({
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        });

        res.sendStatus(201);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get("/participants", async (req, res) => {
    try {
        const participants = await db.collection("participants").find().toArray();
        res.send(participants).status(201);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


app.post("/messages", async (req, res) => {
    const { user } = req.params;
    const { to, text, type } = req.body;

    const searchUser = await db.collection("participants").findOne({ name: user });
    if (searchUser) return res.status(422).send("User doesn't exist");

    const schemaMessage = Joi.object({
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid('message', 'private_message').required()
    });

    const validateMessage = schemaMessage.validate(req.body, { abortEarly: false });

    if (validateMessage.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    try {
        await db.collection("messages").insertOne({
            from: user,
            to: to,
            text: text,
            type: type,
            time: dayjs().format('HH:mm:ss')
        });
        res.sendStatus(201);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


app.get("/messages", async (req, res) => {
    const { user } = req.headers.user;
    const { limit } = parseInt(req.query.limit);

    const schemaUser = Joi.object({
        user: Joi.string().required()
    });

    const validateUser = schemaUser.validate(req.headers.user, { abortEarly: false });

    if (validateUser.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }
    
    const schemaLimit = Joi.object({
        limit: Joi.number().integer().min(1)
    });

    const validateLimit = schemaLimit(req.query.limit, { abortEarly: false });

    if (validateLimit.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    try {
        const messages = await db.collection("messages").find({ $or: [{ from: user }, { to: user }, { type: 'message' }] }).limit(limit).toArray();
        res.send(messages).status(201);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


app.post("/status", async (req, res) => {
    const { user } = req.headers.user;
    
    /*
    const schemaUser = Joi.object({
        user: Joi.string().required()
    });

    const validateUser = schemaUser.validate(req.headers.user, { abortEarly: false });

    if (validateUser.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }
    */

    const nameSearch = await db.collection("participants").findOne({ name: user });
    if (!nameSearch) return res.status(404).send("User doesn't exist");

    try {
        await db.collection("status").updateOne({
            name: user,
            $set: { lastStatus: Date.now() } 
        });
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));