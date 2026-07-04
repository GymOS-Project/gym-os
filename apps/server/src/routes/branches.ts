import { Router } from "express";
import { supabase } from "../supabase";

const router = Router();

router.get("/", async (req, res) => {
  const admin_id = req.query.admin_id as string;

  let query = supabase.from("admins").select("id, gym_name");
  if (admin_id) query = query.eq("id", admin_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

export default router;
