import express from "express";
import { existsSync } from "fs";
import { createServer } from "http";
import { join } from "path";
import { FindOptions, Op } from "sequelize";
import { Server } from "socket.io";
import { EntryModel, initDatabase } from "./Database";
import { initWatcher } from "./Watcher";

const PORT = Number(process.env.PORT) || 3000;

const publicDir = [
  join(process.cwd(), "public"),
  join(__dirname, "public"),
].find((dir) => existsSync(dir));

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.json());

app.get("/api/available-dates", async (req, res) => {
  const from = await EntryModel.min("timestamp");
  const to = await EntryModel.max("timestamp");

  res.json({ from, to });
});

app.post("/api/entries", async (req, res) => {
  const from = req.body.from;
  const to = req.body.to;

  const findOptions: FindOptions<EntryModel> = {
    where: {
      timestamp: {
        ...(from && { [Op.gte]: from }),
        ...(to && { [Op.lte]: to }),
      },
    },
  };

  const entries = await EntryModel.findAll(findOptions);

  res.json(entries);
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

if (publicDir) {
  app.use(express.static(publicDir));

  app.get("*", (req, res) => {
    res.sendFile(join(publicDir, "index.html"));
  });
}

initDatabase()
  .then(() => {
    console.log("Database initialized");

    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);

      initWatcher(io);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
  });
