import axios from "axios";
import { Server } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { EntryModel } from "./Database";

const watchInterval = Number(process.env.WATCH_INTERVAL) || 1000;

export async function initWatcher(
  socket: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) {
  let lastEntry: EntryModel | null = await EntryModel.findOne({
    order: [["timestamp", "DESC"]],
  });

  async function logEntry(timestamp: number, ip: string) {
    if (lastEntry && lastEntry.ip === ip) {
      lastEntry.lastUpdated = timestamp;
      await lastEntry.save();
      socket.emit("update_entry", lastEntry.toJSON());
      return;
    }

    console.log("Logging entry...", { timestamp, ip });

    lastEntry = await EntryModel.create({
      ip,
      timestamp,
      lastUpdated: timestamp,
      changedAfter: lastEntry ? timestamp - lastEntry.timestamp : 0,
    });

    socket.emit("new_entry", lastEntry.toJSON());
  }

  setInterval(async () => {
    const timestamp = Date.now();

    try {
      const response = await axios.get("https://api.ipify.org?format=json");

      if (response.status === 200) {
        const ip = response.data.ip;

        await logEntry(timestamp, ip);
      } else {
        throw new Error("Failed to get IP address!");
      }
    } catch (error) {
      console.error("Failed to get IP address!", error);

      await logEntry(timestamp, "N/A");
    }
  }, watchInterval);
}
