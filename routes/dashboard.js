const express = require('express');
const router = express.Router();
const { AutoReply, Ticket, Giveaway, BotState, BotAction, AuditLog, UserLoyalty } = require('../models/Database');

function timingSafeEqual(a,b){ const x=Buffer.from(String(a||'')); const y=Buffer.from(String(b||'')); return x.length===y.length && require('crypto').timingSafeEqual(x,y); }
function dashboardAuth(req,res,next){
  if (!process.env.DASHBOARD_TOKEN) return res.status(500).json({success:false,error:'DASHBOARD_TOKEN غير مضبوط'});
  const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'') || req.headers['x-dashboard-token'];
  if (!timingSafeEqual(token,process.env.DASHBOARD_TOKEN)) return res.status(401).json({success:false,error:'غير مصرح'});
  next();
}
function botAuth(req,res,next){
  const token=req.headers['x-bot-key'];
  if (!process.env.BOT_API_KEY || !timingSafeEqual(token,process.env.BOT_API_KEY)) return res.status(401).json({success:false,error:'Bot authentication failed'});
  next();
}
async function audit(actor, action, payload={}) { await AuditLog.create({actor,action,payload}); }

router.get('/api/health', async (req,res)=>res.json({success:true,service:'nano-dashboard',time:new Date().toISOString()}));

router.get('/api/dashboard', dashboardAuth, async (req,res)=>{
  const [state, users, tickets, giveaways, replies, audits] = await Promise.all([
    BotState.findOne({botId:'nano'}).lean(), UserLoyalty.countDocuments(), Ticket.countDocuments({status:'open'}), Giveaway.countDocuments({isOpen:true}), AutoReply.countDocuments({isActive:true}), AuditLog.find().sort({createdAt:-1}).limit(12).lean()
  ]);
  res.json({success:true,data:{bot:state||null, users, openTickets:tickets, activeGiveaways:giveaways, activeAutoReplies:replies, audits}});
});

router.get('/api/bot/state', dashboardAuth, async (req,res)=>{
  const state=await BotState.findOne({botId:'nano'}).lean();
  if(state?.lastSeen) state.online=(Date.now()-new Date(state.lastSeen).getTime()) < 45000;
  res.json({success:true,data:state});
});
router.post('/api/bot/action', dashboardAuth, async (req,res)=>{
  const allowed=['pause','resume','maintenance_on','maintenance_off','set_model','set_bot_name','wake','sleep'];
  const {action,payload={}}=req.body||{};
  if(!allowed.includes(action)) return res.status(400).json({success:false,error:'إجراء غير مدعوم'});
  const item=await BotAction.create({action,payload,status:'pending'});
  await audit(req.headers['x-admin-name']||'dashboard', action, payload);
  res.json({success:true,data:item});
});

// Bot heartbeat: called only by Nano using BOT_API_KEY.
router.post('/api/bot/heartbeat', botAuth, async (req,res)=>{
  const b=req.body||{};
  const state=await BotState.findOneAndUpdate({botId:'nano'}, {$set:{online:true,paused:!!b.paused,maintenance:!!b.maintenance,username:b.username||'',version:b.version||'',model:b.model||'',lastSeen:new Date(),stats:b.stats||{},metadata:b.metadata||{}}}, {upsert:true,new:true,setDefaultsOnInsert:true});
  res.json({success:true,data:{serverTime:new Date().toISOString(),stateId:state._id}});
});

// Bot pulls pending commands from the dashboard.
router.get('/api/bot/actions', botAuth, async (req,res)=>{
  const items=await BotAction.find({status:'pending'}).sort({createdAt:1}).limit(20).lean();
  if(items.length) await BotAction.updateMany({_id:{$in:items.map(x=>x._id)}},{$set:{status:'delivered'}});
  res.json({success:true,data:items});
});
router.post('/api/bot/action-result', botAuth, async (req,res)=>{
  const {id,status='done',result={}}=req.body||{};
  if(id) await BotAction.findByIdAndUpdate(id,{$set:{status,result,consumedAt:new Date()}});
  res.json({success:true});
});

router.get('/api/autoreply', dashboardAuth, async (req,res)=>res.json({success:true,data:await AutoReply.find().sort({createdAt:-1}).limit(200).lean()}));
router.post('/api/autoreply', dashboardAuth, async (req,res)=>{
  const {userId='global',keyword,replyMessage}=req.body||{};
  if(!keyword||!replyMessage) return res.status(400).json({success:false,error:'keyword و replyMessage مطلوبان'});
  const item=await AutoReply.create({userId,keyword:String(keyword).toLowerCase(),replyMessage});
  await audit('dashboard','autoreply.create',{id:item._id}); res.json({success:true,data:item});
});
router.delete('/api/autoreply/:id', dashboardAuth, async (req,res)=>{await AutoReply.findByIdAndDelete(req.params.id);res.json({success:true});});

router.get('/api/tickets', dashboardAuth, async (req,res)=>res.json({success:true,data:await Ticket.find({status:'open'}).sort({updatedAt:-1}).lean()}));
router.post('/api/tickets/close', dashboardAuth, async (req,res)=>{await Ticket.findByIdAndUpdate(req.body.ticketId,{status:'closed'});res.json({success:true,message:'تم إغلاق التذكرة'});});
router.post('/api/tickets/reply', dashboardAuth, async (req,res)=>{const {ticketId,text}=req.body||{}; const t=await Ticket.findById(ticketId); if(!t)return res.status(404).json({success:false}); t.messages.push({sender:'dashboard',text}); await t.save(); res.json({success:true,data:t});});

router.get('/api/giveaways', dashboardAuth, async (req,res)=>res.json({success:true,data:await Giveaway.find().sort({createdAt:-1}).limit(100).lean()}));
router.post('/api/giveaway/create', dashboardAuth, async (req,res)=>{const {mediaId,prize}=req.body||{}; if(!mediaId||!prize)return res.status(400).json({success:false,error:'mediaId و prize مطلوبان'}); res.json({success:true,data:await Giveaway.create({mediaId,prize})});});

module.exports=router;
