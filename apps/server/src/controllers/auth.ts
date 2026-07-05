import type { Request, Response } from "express";
import { supabase } from "../supabase";

export async function signup(req: Request, res: Response) {
  const { email, password, gym_name, owner_name, phone, address } = req.body;

  if (!email || !password || !gym_name || !owner_name) {
    return res.status(400).json({
      message: "email, password, gym_name, and owner_name are required",
    });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  if (data.user) {
    const { error: adminError } = await supabase.from("admins").insert({
      user_id: data.user.id,
      gym_name,
      owner_name,
      phone: phone || null,
      address: address || null,
    });

    if (adminError) {
      return res.status(500).json({ message: adminError.message });
    }
  }

  return res.status(201).json({ message: "Account created. You can now sign in." });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return res.status(401).json({ message: error.message });
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return res.json({ session: data.session, user: data.user, admin });
}

export async function signout(req: Request, res: Response) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (token) {
    await supabase.auth.admin.signOut(token).catch(() => {});
  }

  return res.json({ message: "Signed out" });
}

export async function me(req: Request, res: Response) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { data: admin } = await supabase
    .from("admins")
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle();

  return res.json({ user: data.user, admin });
}
