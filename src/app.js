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

    const schemaParticipant = Joi.object({
        name: Joi.string().required()
    });

    const validation = schemaParticipant.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    const nameSearch = await db.collection("participants").findOne({ name: name });
    if (nameSearch) return res.status(409).send("This user already exists");

    try {        
        const newParticipant = {
            name: name,
            lastStatus: Date.now()
        };

        const newMessage = {
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        };

        await db.collection("participants").insertOne(newParticipant);
        await db.collection("messages").insertOne(newMessage);

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
    const { to, text, type } = req.body;
    const { from } = req.params;

    const nameSearch = await db.collection("participants").findOne({ $or: [{ name: from }, { name: to }] });
    if (nameSearch) return res.status(404).send("User doesn't exist");

    const schemaMessage = Joi.object({
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid('message', 'private_message').required()
    });

    const validation = schemaMessage.validate(req.body, { abortEarly: false });

    if (validation.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    try {
        const newMessage = {
            from: from,
            to: to,
            text: text,
            type: type,
            time: dayjs().format('HH:mm:ss')
        }

        await db.collection("messages").insertOne(newMessage);
        res.sendStatus(201);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


app.get("/messages", async (req, res) => {
    const limit = parseInt(req.query.limit);
    if (limit < 1) return res.status(422).send("Invalid limit");

    const user = req.headers.user;
    
    try {
        const messages = await db.collection("messages").find({ $or: [{ to: 'Todos' }, { to: user }, { from: user }] }).limit(limit).toArray();
        res.send(messages).status(201);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


app.post("/status", async (req, res) => {
    const user = req.headers.user;
    if (!user) return res.status(404).send("Invalid header");

    const nameSearch = await db.collection("participants").findOne({ name: user });
    if (!nameSearch) return res.status(404).send("User doesn't exist");

    try {
        const newParticipant = {
            name: user,
            lastStatus: Date.now()
        };

        await db.collection("status").insertOne(newParticipant);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));