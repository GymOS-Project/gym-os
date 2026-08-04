import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    category: z.string(),
    readingTime: z.string(),
    featured: z.boolean().default(false),
  }),
});

const help = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    updatedAt: z.coerce.date(),
    audience: z.string(),
  }),
});

export const collections = { blog, help };
