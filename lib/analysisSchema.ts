import { z } from 'zod';

export const analysisSchema = z.object({
  dataType: z
    .string()
    .min(2)
    .max(20)
    .describe('A concise label for the type of data (e.g., "User Records", "Transactions")'),
  description: z
    .string()
    .min(10)
    .max(400)
    .describe('A detailed description of what this data semantically represents (aim for 1-2 sentences, ~200 characters)'),
  keyFields: z
    .array(
      z.object({
        path: z.string().min(1).describe("Actual accessor key or path to the data field (e.g., 'A', 'user.name', 'items[0].id')"),
        label: z.string().min(1).describe("Human-readable field description for display")
      })
    )
    .max(5)
    .describe('The most important fields in the data and what they mean'),
  recommendedVisualisation: z
    .enum(['table', 'map', 'tree', 'cards', 'chart'])
    .describe('The best way to visualise this data structure'),
  rationale: z
    .string()
    .min(10)
    .max(500)
    .describe('Why this visualisation approach is recommended for this data (aim for 1-2 sentences, ~200 characters)'),
}).describe('Analysis of structured data format and recommended visualisation');

export type Analysis = z.infer<typeof analysisSchema>;
