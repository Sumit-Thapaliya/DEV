import { z } from 'zod';

// Optional fields keep older clients compatible. The new posting form requires
// description and minimum qualifications; every supplied value is validated here.
const optionalText = (max: number) => z.string().trim().max(max).nullish();
export const createJobSchema = z.object({
  title: z.string().trim().min(1, 'Job title is required').max(200),
  location: optionalText(200),
  department: optionalText(200),
  employmentType: z
    .enum(['Full-time', 'Part-time', 'Contract', 'Internship'])
    .nullish(),
  salary: optionalText(200),
  description: optionalText(20_000),
  minimumQualifications: optionalText(12_000),
  preferredQualifications: optionalText(12_000),
});
