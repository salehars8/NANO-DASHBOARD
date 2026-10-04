require('dotenv').config();
const express=require('express');
const mongoose=require('mongoose');
const path=require('path');
const dashboardRoutes=require('./routes/dashboard');
const app=express();
app.use(express.json({limit:'1mb'}));
app.use(express.urlencoded({extended:true}));
app.use(express.static(__dirname));

let cached=global.__nanoMongo;
async function connectDB(){
  if(cached?.readyState===1) return cached;
  if(!process.env.MONGO_URI) throw new Error('MONGO_URI غير مضبوط');
  cached=await mongoose.connect(process.env.MONGO_URI,{serverSelectionTimeoutMS:8000});
  global.__nanoMongo=cached;
  return cached;
}
app.use(async (req,res,next)=>{ if(req.path.startsWith('/api/health')) return next(); try{await connectDB(); next();}catch(e){res.status(503).json({success:false,error:'Database unavailable'});} });
app.get('/',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.use('/',dashboardRoutes);
app.get('/api',async(req,res)=>res.json({success:true,name:'NANO Dashboard',version:'2.0.0'}));

module.exports=app;
if(require.main===module){ const port=process.env.PORT||3000; connectDB().then(()=>app.listen(port,()=>console.log(`NANO dashboard listening on ${port}`))).catch(err=>{console.error(err);process.exit(1);}); }
