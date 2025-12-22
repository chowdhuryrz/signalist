"use server";

import { connectToDatabase } from "@/database/mongoose";
import Alert, { AlertItem } from "@/database/models/alert.model";
import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export const getUserAlerts = async (): Promise<AlertItem[]> => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    const alerts = await Alert.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return JSON.parse(JSON.stringify(alerts));
  } catch (error) {
    console.error("Error fetching alerts:", error);
    throw new Error("Failed to fetch alerts");
  }
};

export const createAlert = async (data: {
  symbol: string;
  company: string;
  alertName: string;
  alertType: 'upper' | 'lower';
  threshold: number;
  cadence: 'once' | 'daily' | 'weekly';
}) => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    await Alert.create({
      userId,
      symbol: data.symbol.toUpperCase(),
      company: data.company,
      alertName: data.alertName,
      alertType: data.alertType,
      threshold: data.threshold,
      cadence: data.cadence,
      isActive: true,
    });

    revalidatePath("/watchlist");
    return { success: true, message: "Alert created successfully" };
  } catch (error) {
    console.error("Error creating alert:", error);
    throw new Error("Failed to create alert");
  }
};

export const updateAlert = async (
  alertId: string,
  data: {
    alertName?: string;
    alertType?: 'upper' | 'lower';
    threshold?: number;
    cadence?: 'once' | 'daily' | 'weekly';
    isActive?: boolean;
  }
) => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    const alert = await Alert.findOne({ _id: alertId, userId });

    if (!alert) {
      throw new Error("Alert not found or unauthorized");
    }

    Object.assign(alert, data);
    await alert.save();

    revalidatePath("/watchlist");
    return { success: true, message: "Alert updated successfully" };
  } catch (error) {
    console.error("Error updating alert:", error);
    throw new Error("Failed to update alert");
  }
};

export const deleteAlert = async (alertId: string) => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    await Alert.deleteOne({ _id: alertId, userId });

    revalidatePath("/watchlist");
    return { success: true, message: "Alert deleted successfully" };
  } catch (error) {
    console.error("Error deleting alert:", error);
    throw new Error("Failed to delete alert");
  }
};

export const toggleAlertActive = async (alertId: string, isActive: boolean) => {
  try {
    await connectToDatabase();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    await Alert.updateOne({ _id: alertId, userId }, { isActive });

    revalidatePath("/watchlist");
    return { success: true, message: "Alert status updated" };
  } catch (error) {
    console.error("Error toggling alert:", error);
    throw new Error("Failed to toggle alert");
  }
};
