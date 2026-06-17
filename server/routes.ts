import type { Express } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { setupAuth } from "./auth";
import { db } from "./db"; 
import { eq, and } from "drizzle-orm";
import { debtRecords } from "../shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // --- Auth Routes ---
  app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
      res.redirect("/");
    }
  );

  app.get("/api/current-user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out" });
    });
  });

  // --- Dues & Receivables Routes ---
  app.post("/api/debts", async (req, res) => {
    // Safely grab the user ID, falling back to 1 for local testing
    const userId = req.isAuthenticated() && req.user ? (req.user as any).id : 1;
    
    try {
      const datetimeValue = req.body.datetime ? new Date(req.body.datetime) : null;

      const newDebt = await db.insert(debtRecords).values({
        userId: userId,
        type: req.body.type,
        amount: req.body.amount.toString(),
        purpose: req.body.purpose,
        location: req.body.location || null,
        personName: req.body.personName,
        notes: req.body.notes || null,
        datetime: datetimeValue,
      }).returning();
      
      res.json(newDebt[0]);
    } catch (error: any) {
      console.error("DB Insert Error:", error);
      res.status(500).json({ error: "Failed to create record", details: error.message });
    }
  });

  app.get("/api/debts", async (req, res) => {
    const userId = req.isAuthenticated() && req.user ? (req.user as any).id : 1;
    
    try {
      const userDebts = await db.select().from(debtRecords).where(eq(debtRecords.userId, userId));
      res.json(userDebts);
    } catch (error: any) {
      console.error("DB Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch records", details: error.message });
    }
  });
  // Update / Edit / Settle a record
  app.put("/api/debts/:id", async (req, res) => {
    const userId = req.isAuthenticated() && req.user ? (req.user as any).id : 1;
    
    try {
      const datetimeValue = req.body.datetime ? new Date(req.body.datetime) : null;

      const updatedDebt = await db.update(debtRecords).set({
        type: req.body.type,
        amount: req.body.amount.toString(),
        purpose: req.body.purpose,
        location: req.body.location || null,
        personName: req.body.personName,
        notes: req.body.notes || null,
        datetime: datetimeValue,
        status: req.body.status || 'pending', // Update status if provided
      })
      .where(and(eq(debtRecords.id, parseInt(req.params.id)), eq(debtRecords.userId, userId)))
      .returning();
      
      res.json(updatedDebt[0]);
    } catch (error: any) {
      console.error("DB Update Error:", error);
      res.status(500).json({ error: "Failed to update record", details: error.message });
    }
  });

  // Delete a record
  app.delete("/api/debts/:id", async (req, res) => {
    const userId = req.isAuthenticated() && req.user ? (req.user as any).id : 1;
    
    try {
      await db.delete(debtRecords)
        .where(and(eq(debtRecords.id, parseInt(req.params.id)), eq(debtRecords.userId, userId)));
      res.json({ success: true });
    } catch (error: any) {
      console.error("DB Delete Error:", error);
      res.status(500).json({ error: "Failed to delete record", details: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
