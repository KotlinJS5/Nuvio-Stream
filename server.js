import http from "node:http";
import { URL } from "node:url";
import { readFile } from "node:fs/promises";
import { getStreams } from "./providers/local.js";
const PORT=Number(process.env.PORT||7000),HOST=process.env.HOST||"0.0.0.0";
const manifest=JSON.parse(await readFile("./manifest.json","utf8"));
function send(res,status,body){res.writeHead(status,{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"*","Cache-Control":"no-store"});res.end(JSON.stringify(body));}
function parseStream(p){const m=p.match(/^\/stream\/(movie|series)\/([^/]+)\.json$/);return m?{type:m[1],id:decodeURIComponent(m[2])}:null;}
http.createServer(async(req,res)=>{try{if(req.method!=="GET")return send(res,405,{error:"Method not allowed"});const u=new URL(req.url,"http://"+(req.headers.host||"localhost"));if(u.pathname==="/")return send(res,200,{name:manifest.name,version:manifest.version,manifest:"/manifest.json",status:"ok"});if(u.pathname==="/manifest.json")return send(res,200,manifest);const r=parseStream(u.pathname);if(r)return send(res,200,{streams:await getStreams(r.type,r.id)});return send(res,404,{error:"Not found"});}catch(e){console.error(e);send(res,500,{error:"Internal server error"});}}).listen(PORT,HOST,()=>console.log("Nuvio Stream listening on port "+PORT));