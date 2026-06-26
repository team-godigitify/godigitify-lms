import { z } from 'zod'
import { optionalUploadUrl } from './common'
import { InteractionType } from '../enums'

export const CreateInteractionSchema = z.object({
  type: z.nativeEnum(InteractionType),
  note: z.string().trim().max(5000).optional(),
  callRecordingUrl: optionalUploadUrl,
  callDurationSecs: z.number().int().min(0).max(86400).optional(),
  callDirection:    z.enum(['INBOUND', 'OUTBOUND']).optional(),
  isDuplicateDetected: z.boolean().optional(),
})
.refine(
  (data) => {
    // If type is CALL, note or recording should be present
    if (data.type === InteractionType.CALL) {
      return data.note != null || data.callRecordingUrl != null
    }
    // For NOTE type, note is required
    if (data.type === InteractionType.NOTE) {
      return data.note != null && data.note.trim().length > 0
    }
    return true
  },
  {
    message: 'Call interactions require a note or recording. Note interactions require a note.',
  }
)

export const EditInteractionSchema = z.object({
  note: z.string().trim().min(1, 'Note cannot be empty').max(5000),
})

export type CreateInteractionInput = z.infer<typeof CreateInteractionSchema>
export type EditInteractionInput = z.infer<typeof EditInteractionSchema>