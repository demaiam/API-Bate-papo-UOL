import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
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

    const schemaName = Joi.object({ name: Joi.string().required() });
    const validateName = schemaName.validate(req.body, { abortEarly: false });

    if (validateName.error) return res.status(422).send("Invalid name");

    try {
        const nameSearch = await db.collection("participants").findOne({ name: name });
        if (nameSearch) return res.status(409).send("User already exists");

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
    const user = req.headers.user;
    const { to, text, type } = req.body;

    const schemaMessage = Joi.object({
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid('message', 'private_message').required()
    });

    const validateMessage = schemaMessage.validate(req.body, { abortEarly: false });

    if (validateMessage.error) return res.status(422).send("Invalid message");

    try {
        const searchUser = await db.collection("participants").findOne({ name: user });
        if (!searchUser) return res.status(422).send("User doesn't exist");

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
    const user = req.headers.user;
    const { limit } = req.query;

    const schemaLimit = Joi.object({ limit: Joi.number().integer().min(1) });

    const validateLimit = schemaLimit(req.query, { abortEarly: false });
    if (validateLimit.error) return res.status(422).send("Invalid limit");

    try {
        const messages = await db.collection("messages").find({ $or: [{ from: user }, { to: user }, { to: 'Todos' }] }).limit(limit).toArray();
        res.send(messages).status(201);
    } catch (err) {
        res.status(500).send(err.message);
    }
});


app.post("/status", async (req, res) => {
    const user = req.headers.user;

    try {
        const nameSearch = await db.collection("participants").findOne({ name: user });
        if (!nameSearch) return res.status(404).send("User doesn't exist");

        await db.collection("status").updateOne(
            { name: user },
            { $set: { lastStatus: Date.now() } }
        );
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

/*
setInterval(async () => {
    try {
        const participants = await db.collection("participants").find().toArray();
        for (let i = 0; i < participants.length; i++) {
            if (participants[i].lastStatus > Date.now() - 10000) {
                await db.collection("participants").delete({ name: participants[i].name });
                await db.collection("messages").insertOne({
                    from: participants[i].name,
                    to: 'Todos',
                    text: 'sai da sala...',
                    type: 'status',
                    time: dayjs().format('HH:mm:ss')
                });
            }
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
}, 15000);
*/

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));