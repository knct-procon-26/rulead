import { zValidator } from "@hono/zod-validator";
import img2rules from "./lib/img2rules";
import { Hono } from "hono";
import z from "zod";
import {HTTPException} from "hono/http-exception";
const app = new Hono();
const extractRulesSchema = z.object({
  base64Image: z.base64(),
});
type MsRes={
  success:false;
  message:string;
};
const scan = app.post(
  "/",
  zValidator("json", extractRulesSchema,(result,c)=>{
    if(!result.success){
      const a:MsRes={
        success:false,
        message:"Invalid photo is used."
      };
     return c.json(
      a,
      406
     );
    }
  }),
  async (c) => {
    try{
    const data = c.req.valid("json");
    const result = await img2rules(data.base64Image);
    return c.json(
      {
      success: true,
      rules: result,
    },200
   );
  }catch(err){
        if(err instanceof HTTPException){
          return c.json({
            success:false,
            message:err.message
          },err.status);
        }
        if(err instanceof Error && err.message==="This is not sign."){
          return c.json({
            success:false,
            message:err.message
          },400);
        }
        else{
          return c.json({
              success:false,
              message:"Internal Server Error"
            },500);
        }
  }
},
)


export default scan;
