import express from "express";
import { dbStorage } from "../db.js";
import * as schema from "../../shared/schema.js";
import { eq, like, and, or, sql } from "drizzle-orm";

const router = express.Router();

// البحث العام
router.get("/", async (req, res) => {
  try {
    const { q: query, category } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: "Query parameter is required" });
    }

    const searchTerm = `%${query}%`;
    
    // البحث في التصنيفات وعناصر القوائم فقط (single-store)
    const categories = await dbStorage.searchCategories(searchTerm);
    const menuItems = await dbStorage.searchMenuItems(searchTerm);

    res.json({
      restaurants: [],
      categories,
      menuItems,
      total: categories.length + menuItems.length
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// الحصول على المطاعم - stub (single-store Tamtom)
router.get("/restaurants", async (_req, res) => {
  res.json([]);
});

// الحصول على التصنيفات
router.get("/categories", async (req, res) => {
  try {
    const categories = await dbStorage.getCategories();
    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// الحصول على قائمة مطعم
router.get("/restaurants/:restaurantId/menu", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const menuItems = await dbStorage.getMenuItems(restaurantId);
    res.json(menuItems);
  } catch (error) {
    console.error("Get menu items error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// stub
router.get("/categories/:categoryId/restaurants", async (_req, res) => {
  res.json([]);
});

export default router;