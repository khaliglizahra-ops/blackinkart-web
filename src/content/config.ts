import { defineCollection, z } from 'astro:content';

const artVariant = z.enum(['flow', 'radiate', 'steps', 'waves', 'bodymap', 'ornament', 'scatter', 'lattice']);

const guideSchema = z.object({
  title: z.string(),
  description: z.string(),
  order: z.number(),
  updatedAt: z.string(),
  // Guide hero visual: a real photo (heroImage) OR generated line-art (heroArt). Pick one.
  heroImage: z.string().optional(),
  heroArt: artVariant.optional(),
  heroSeed: z.number().optional(),
});

const dovmeRehberi = defineCollection({
  type: 'content',
  schema: guideSchema,
});

const piercingRehberi = defineCollection({
  type: 'content',
  schema: guideSchema,
});

const piercingBolgeleri = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    updatedAt: z.string(),
    priceSlug: z.enum(['kulak', 'burun', 'dudak', 'dil', 'diger']),
    healingTime: z.string(),
    painLevel: z.enum(['Düşük', 'Orta', 'Orta-Yüksek', 'Yüksek']),
    photos: z.array(z.string()).default([]),
  }),
});

const sanatcilar = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    since: z.string(),
    photo: z.string(),
    description: z.string(),
  }),
});

export const collections = {
  'dovme-rehberi': dovmeRehberi,
  'piercing-rehberi': piercingRehberi,
  'piercing-bolgeleri': piercingBolgeleri,
  sanatcilar,
};
