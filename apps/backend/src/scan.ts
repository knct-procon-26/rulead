import img2rules from "./lib/img2rules";
import { Hono } from "hono";
import z from "zod";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "./lib/validator";
const app = new Hono();
const extractRulesSchema = z.object({
  base64Image: z.base64(),
});
const scan = app.post(
  "/",
  zValidator("json", extractRulesSchema),
  async (c) => {
    try {
      const data = c.req.valid("json");
      const result = await img2rules(data.base64Image);
      return c.json(
        {
          success: true,
          rules: result,
        },
        200,
      );
    } catch (err) {
      if (err === "This is not rule sign.") {
        throw new HTTPException(400, { message: err });
      }
      throw err;
    }
  },
);

export default scan;
