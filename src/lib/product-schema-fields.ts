import { z } from 'zod'

/** Zod 4: `.optional()` allows undefined but not null — normalize empty values. */
export const optionalNumberField = () =>
  z.preprocess(
    (val) =>
      val === null || val === '' || val === undefined ? undefined : Number(val),
    z.number().optional(),
  )

export const optionalCategoryIdField = optionalNumberField()
