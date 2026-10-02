import { httpRouter } from "convex/server";
import { auth } from "./auth";

/* Convex Auth's own endpoints, the OAuth callback and the token exchange.
   Nothing else is mounted here yet; the app's HTTP surface is still Next.js. */
const http = httpRouter();
auth.addHttpRoutes(http);

export default http;
