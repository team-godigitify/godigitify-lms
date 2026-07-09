import { z } from 'zod'

export const CreateCampaignSchema = z.object({
  name: z.string().trim().min(2, 'Campaign name required'),
  sourceId: z.string().cuid(),
  metaCampaignId: z.string().trim().max(100).optional(),
  spend: z.number().positive().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
})

export const UpdateCampaignSchema = z.object({
  name: z.string().trim().min(2).optional(),
  spend: z.number().positive().optional(),
  endDate: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
})

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignSchema>
