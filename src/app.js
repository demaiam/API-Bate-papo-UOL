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

    const validateName = schemaParticipant.validate(req.body, { abortEarly: false });

    if (validateName.error) {
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
    const { user } = req.params;

    const schemaUser = Joi.object({
        user: Joi.string().required()
    })

    const validateUser = schemaUser(req.params, { abortEarly: false });

    if (validateUser.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    const searchUser = await db.collection("participants").findOne({ $or: [{ from: user }, { to: user }] });
    if (searchUser) return res.status(422).send("User doesn't exist");

    const { to, text, type } = req.body;

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
        const newMessage = {
            from: user,
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
    const { limit } = parseInt(req.query.limit);

    const schemaLimit = Joi.object({
        limit: Joi.number().integer().min(1)
    });

    const validateLimit = schemaLimit(req.query.limit, { abortEarly: false });

    if (validateLimit.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

    const { user } = req.headers.user;

    const schemaUser = Joi.object({
        user: Joi.string().required()
    });

    const validateUser = schemaUser.validate(req.headers.user, { abortEarly: false });

    if (validateUser.error) {
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
    const user = req.headers.user;
    
    const schemaUser = Joi.object({
        user: Joi.string().required()
    });

    const validateUser = schemaUser.validate(req.headers.user, { abortEarly: false });

    if (validateUser.error) {
        const errors = validation.error.details.map(detail => detail.message);
        return res.status(422).send(errors);
    }

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