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
    .max(200)
    .describe('A detailed description of what this data semantically represents'),
  keyFields: z
    .array(
      z.object({
        path: z.string().min(1).describe("Actual accessor key or path to the data field (e.g., 'A', 'user.name', 'items[0].id')"),
        label: z.string().min(1).describe("Human-readable field description for display")
      })
    )
    .max(5)
    .describe('The most important fields in the data and what they mean'),
  recommendedVisualization: z
    .enum(['table', 'map', 'tree', 'cards', 'chart'])
    .describe('The best way to visualize this data structure'),
  rationale: z
    .string()
    .min(10)
    .max(200)
    .describe('Why this visualization approach is recommended for this data'),
}).describe('Analysis of structured data format and recommended visualization');

export type Analysis = z.infer<typeof analysisSchema>;
