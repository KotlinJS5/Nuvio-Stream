import { readFile } from "node:fs/promises";
const STREAMS_FILE=process.env.STREAMS_FILE||"./streams.json";

export async function getStreams(type,id){
  let data;
  try{data=JSON.parse(await readFile(STREAMS_FILE,"utf8"));}catch{return [];}
  const entries=data[id]||data[id.replace(/^tmdb:/i,"").replace(/^imdb:/i,"")]||[];
  if(!Array.isArray(entries))return [];

  const language=(process.env.LANGUAGE||"all").toLowerCase();
  return entries
    .filter(x=>x&&typeof x.url==="string"&&/^https?:\/\//i.test(x.url))
    .filter(x=>language==="all"||language==="both"||!x.language||x.language.toLowerCase()===language)
    .map((x,i)=>({
      name:[x.language,x.provider].filter(Boolean).join(" • ")||x.name||"Direct HTTP",
      title:x.title||"HTTP Stream",
      url:x.url,
      behaviorHints:{notWebReady:false,bingeGroup:"nuvio-"+type+"-"+i}
    }));
}