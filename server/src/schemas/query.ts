import { z } from "zod";
import { uniqueTrimmed } from "../lib/values.js";

const SORT_FIELDS = ["first_name", "last_name", "age", "nationality"] as const;
const SORT_DIRS = ["asc", "desc"] as const;

const toStringArray = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => uniqueTrimmed(value === undefined ? [] : Array.isArray(value) ? value : [value]));

const pageNumber = z.coerce.number().int().min(1).default(1);

const pageSizeNumber = z.coerce.number().int().min(1).max(100).default(60);

export const filterFields = {
  search: z.string().trim().default(""),
  nationality: toStringArray,
  hobby: toStringArray,
};

export const userQuerySchema = z.object({
  ...filterFields,
  sort: z.enum(SORT_FIELDS).default("first_name"),
  dir: z.enum(SORT_DIRS).default("asc"),
  page: pageNumber,
  pageSize: pageSizeNumber,
});

export type UserQuery = z.infer<typeof userQuerySchema>;

export const facetQuerySchema = z.object(filterFields);

export type FacetQuery = z.infer<typeof facetQuerySchema>;
