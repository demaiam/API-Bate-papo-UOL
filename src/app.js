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

/*const participants = [
    {name: 'João', lastStatus: 12313123}
];
const messages = [
    {from: 'João', to: 'Todos', text: 'oi galera', type: 'message', time: '20:04:37'}
];*/


app.post("/participants", async (req, res) => {
    const { name } = req.body;

    const schemaParticipant = Joi.string().required;

    const validation = schemaParticipant.validate(req.body, { abortEarly: false });

    if (validation.error) {
		const errors = validation.error.details.map(detail => detail.message);
		return res.status(422).send(errors);
	}

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
		res.send(participants);
	} catch (err) {
		res.status(500).send(err.message);
	}
});

app.post("/messages", async (req, res) => {
    const { to, text, type } = req.body;
    const { from } = req.params;

    const schemaMessage = Joi.object({
        from: 
        to: Joi.string().required(),
        text: Joi.string().required(),
        type: Joi.string().valid('message', 'private_message').required,
    });

    const validation = schemaMessage.validate(req.body, { abortEarly: false });

    if (validation.error) {
		const errors = validation.error.details.map(detail => detail.message);
		return res.status(422).send(errors);
	}

    try {
        const newMessage = {
            from: '',
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