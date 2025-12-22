"use server";

import { connectToDatabase } from "@/database/mongoose";
import Watchlist from "@/database/models/watchlist.model";

export const getWatchlistSymbolsByEmail = async (
  email: string
): Promise<string[]> => {
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;
    if (!db) throw new Error("Mongoose connection not connected");

    // Find the user by email in the user collection
    const user = await db.collection("user").findOne({ email });

    if (!user) {
      return [];
    }

    // Get userId (Better Auth uses 'id' field)
    const userId = user.id || user._id.toString();

    // Query the Watchlist by userId
    const watchlistItems = await Watchlist.find(
      { userId },
      { symbol: 1, _id: 0 }
    ).lean();

    // Return just the symbols as strings
    return watchlistItems.map((item) => item.symbol);
  } catch (error) {
    console.error("Error fetching watchlist symbols by email:", error);
    return [];
  }
};
