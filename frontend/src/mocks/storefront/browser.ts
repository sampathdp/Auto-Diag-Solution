import { setupWorker } from "msw/browser";
import { accountHandlers } from "./handlers";

export const worker = setupWorker(...accountHandlers);
