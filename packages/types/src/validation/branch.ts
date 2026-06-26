import { z } from 'zod'

export const CreateBranchSchema = z.object({
  name:    z.string().trim().min(2, 'Branch name required'),
  city:    z.string().trim().min(2, 'City required'),
  address: z.string().trim().max(500).optional(),
})

export const UpdateBranchSchema = z.object({
  name:     z.string().trim().min(2).optional(),
  city:     z.string().trim().min(2).optional(),
  address:  z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
})

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>
export type UpdateBranchInput = z.infer<typeof UpdateBranchSchema>