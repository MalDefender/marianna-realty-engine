import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Введите логин").max(64),
  password: z.string().min(1, "Введите пароль").max(200),
});

export const LISTING_TYPES = ["Квартира", "Апартаменты", "Дом"] as const;

export const listingSchema = z
  .object({
    type: z.enum(LISTING_TYPES),
    title: z.string().trim().min(2, "Заголовок слишком короткий").max(120),
    price: z.coerce.number().int().min(0).max(100_000_000_000),
    location: z.string().trim().max(160).default(""),
    rooms: z.string().trim().max(20).default(""),
    area: z.string().trim().max(20).default(""),
    floor: z.string().trim().max(20).default(""),
    land: z.string().trim().max(30).default(""),
    description: z.string().trim().max(4000).default(""),
    photos: z.array(z.string().uuid()).max(20).default([]),
    published: z.coerce.boolean().default(true),
    sort: z.coerce.number().int().min(0).max(100000).default(0),
  })
  // Участок бывает только у дома; этаж — только у квартиры/апартаментов.
  // Чистим несовместимые поля на сервере, чтобы их нельзя было протащить в обход UI.
  .transform((v) =>
    v.type === "Дом"
      ? { ...v, floor: "" }
      : { ...v, land: "" }
  );

export type ListingForm = z.infer<typeof listingSchema>;

// Image upload constraints
export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB
