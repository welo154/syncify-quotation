import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.csv':'text/csv','.json':'application/json','.md':'text/plain','.sql':'text/plain'};
const server=http.createServer(async(req,res)=>{try{const route=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+(route==='/'?'/index.html':route));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}if(!path.extname(file))file+='.html';const content=await fs.readFile(file);res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(content);}catch{res.writeHead(404);res.end('Not found');}});
server.listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log(`SYNCIFY: http://localhost:${server.address().port}`));
