import { zValidator } from "@hono/zod-validator";
import img2rules from "./lib/img2rules";
import { Hono } from "hono";
import z from "zod";
const app = new Hono();

const extractRulesSchema = z.object({
  base64Image: z.base64(),
});

const scan = app.post(
  "/",
  zValidator("json", extractRulesSchema),
  async (c) => {
    try{
    const data = c.req.valid("json");
    const result = await img2rules(data.base64Image);
    return c.json(
      {
      success: true,
      rules: result,
    }
   );}catch(error){
      console.log(error);
       return c.json(
        {
          success:false,
          rules:[{
            id:"-1",
            text:"e"
          }]
        }
       );
    }
  },
);

export default scan;
