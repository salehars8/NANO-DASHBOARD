const mongoose = require('mongoose');

const autoReplySchema = new mongoose.Schema({ userId: String, keyword: String, replyMessage: String, isActive: {type:Boolean,default:true} }, {timestamps:true});
const userLoyaltySchema = new mongoose.Schema({ userId: {type:String,required:true,unique:true}, points:{type:Number,default:0}, level:{type:Number,default:1} }, {timestamps:true});
const ticketSchema = new mongoose.Schema({ userId:String, subject:String, status:{type:String,default:'open'}, messages:[{sender:String,text:String,timestamp:{type:Date,default:Date.now}}] }, {timestamps:true});
const giveawaySchema = new mongoose.Schema({ mediaId:String, prize:String, isOpen:{type:Boolean,default:true}, winners:[String] }, {timestamps:true});
const botStateSchema = new mongoose.Schema({
  botId:{type:String,default:'nano',unique:true}, online:{type:Boolean,default:false}, paused:{type:Boolean,default:false}, maintenance:{type:Boolean,default:false},
  username:String, version:String, model:String, lastSeen:Date, stats:{type:mongoose.Schema.Types.Mixed,default:{}}, config:{type:mongoose.Schema.Types.Mixed,default:{}}, metadata:{type:mongoose.Schema.Types.Mixed,default:{}}
}, {timestamps:true});
const botActionSchema = new mongoose.Schema({ action:String, payload:{type:mongoose.Schema.Types.Mixed,default:{}}, status:{type:String,default:'pending'}, createdAt:{type:Date,default:Date.now}, consumedAt:Date });
const auditSchema = new mongoose.Schema({ actor:String, action:String, payload:{type:mongoose.Schema.Types.Mixed,default:{}}, createdAt:{type:Date,default:Date.now} });

const AutoReply = mongoose.model('AutoReply', autoReplySchema);
const UserLoyalty = mongoose.model('UserLoyalty', userLoyaltySchema);
const Ticket = mongoose.model('Ticket', ticketSchema);
const Giveaway = mongoose.model('Giveaway', giveawaySchema);
const BotState = mongoose.model('BotState', botStateSchema);
const BotAction = mongoose.model('BotAction', botActionSchema);
const AuditLog = mongoose.model('AuditLog', auditSchema);
module.exports = { AutoReply, UserLoyalty, Ticket, Giveaway, BotState, BotAction, AuditLog };
