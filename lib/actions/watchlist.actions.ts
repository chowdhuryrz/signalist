"use server";

import { connectToDatabase } from "@/database/mongoose";
import Watchlist from "@/database/models/watchlist.model";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

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

export const addToWatchlist = async (symbol: string, company: string) => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    // Check if already exists
    const existing = await Watchlist.findOne({ userId, symbol: symbol.toUpperCase() });
    if (existing) {
      return { success: true, message: "Already in watchlist" };
    }

    await Watchlist.create({
      userId,
      symbol: symbol.toUpperCase(),
      company,
    });

    revalidatePath("/watchlist");
    return { success: true, message: "Added to watchlist" };
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    throw new Error("Failed to add to watchlist");
  }
};

export const removeFromWatchlist = async (symbol: string) => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    await Watchlist.deleteOne({ userId, symbol: symbol.toUpperCase() });

    revalidatePath("/watchlist");
    return { success: true, message: "Removed from watchlist" };
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    throw new Error("Failed to remove from watchlist");
  }
};
