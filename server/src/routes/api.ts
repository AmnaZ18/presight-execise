import { Router } from "express";
import { getTopHobbies, getTopNationalities } from "../db/queries/facets.js";
import { getUsers } from "../db/queries/users.js";
import { parseQuery } from "../lib/http.js";
import { facetQuerySchema, userQuerySchema } from "../schemas/query.js";

export const apiRouter = Router();

// Docker healthcheck
apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

apiRouter.get("/users", (req, res) => {
  const query = parseQuery(userQuerySchema, req, res);
  if (!query) return;
  res.json(getUsers(query));
});

apiRouter.get("/hobbies/top", (req, res) => {
  const query = parseQuery(facetQuerySchema, req, res);
  if (!query) return;
  res.json({ hobbies: getTopHobbies(query) });
});

apiRouter.get("/nationalities/top", (req, res) => {
  const query = parseQuery(facetQuerySchema, req, res);
  if (!query) return;
  res.json({ nationalities: getTopNationalities(query) });
});
