import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import geminiRouter from "./routes/gemini.js";
import moodleRouter from "./routes/moodle.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/gemini", geminiRouter);
app.use("/api/moodle", moodleRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Backend listening on port ${PORT}`);
});
