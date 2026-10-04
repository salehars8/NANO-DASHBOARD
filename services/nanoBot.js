const axios = require('axios');
const { AutoReply, UserLoyalty, Ticket, Giveaway } = require('../models/Database');

async function handleInstagramInteraction(webhookData) {
    try {
        const { text, ownerId, commenterId, isDm } = webhookData;
        if (!text || !ownerId || !commenterId) return;

        // 1. الألعاب الخفيفة في الـ DMs (مثل لعبة تخمين الكلمة أو التسلية)
        if (isDm && text.toLowerCase() === '!game') {
            await sendInstagramMessage(ownerId, commenterId, '🎮 أهلاً بك في لعبة التخمين السريعة! ما هي عاصمة فرنسا؟ (أرسل إجابتك بـ !guess والكلمة)');
            return;
        }
        if (isDm && text.toLowerCase().startsWith('!guess')) {
            const guess = text.split(' ')[1];
            if (guess && guess.toLowerCase() === 'باريس') {
                await sendInstagramMessage(ownerId, commenterId, '🎉 إجابة صحيحة! لقد ربحت 50 نقطة ولاء.');
                let userLoyalty = await UserLoyalty.findOne({ userId: commenterId });
                if (!userLoyalty) {
                    await UserLoyalty.create({ userId: commenterId, points: 50 });
                } else {
                    userLoyalty.points += 50;
                    await userLoyalty.save();
                }
            } else {
                await sendInstagramMessage(ownerId, commenterId, '❌ إجابة خاطئة، حاول مرة أخرى!');
            }
            return;
        }

        // 2. نظام التذاكر (إذا أرسل المستخدم رسالة تبدأ بـ !support)
        if (isDm && text.toLowerCase().startsWith('!support')) {
            const issueText = text.replace('!support', '').trim();
            let ticket = await Ticket.findOne({ userId: commenterId, status: 'open' });
            if (!ticket) {
                ticket = await Ticket.create({
                    userId: commenterId,
                    subject: issueText || 'استفسار عام',
                    messages: [{ sender: commenterId, text: issueText }]
                });
                await sendInstagramMessage(ownerId, commenterId, '🎫 تم فتح تذكرة دعم فني بنجاح! سيقوم فريقنا بالرد عليك قريباً عبر لوحة التحكم.');
            } else {
                ticket.messages.push({ sender: commenterId, text: issueText });
                await ticket.save();
                await sendInstagramMessage(ownerId, commenterId, '📩 تم إضافة رسالتك إلى التذكرة المفتوحة.');
            }
            return;
        }

        // 3. الردود التلقائية والنقاط الاعتيادية
        const activeRules = await AutoReply.find({ userId: ownerId, isActive: true });
        for (let rule of activeRules) {
            if (text.toLowerCase().includes(rule.keyword.toLowerCase())) {
                await sendInstagramMessage(ownerId, commenterId, rule.replyMessage);
                break;
            }
        }

    } catch (error) {
        console.error('Error handling interaction:', error);
    }
}

async function sendInstagramMessage(ownerId, recipientId, text) {
    await axios.post(`https://graph.facebook.com/v17.0/${ownerId}/messages`, {
        recipient: { id: recipientId },
        message: { text },
        access_token: process.env.INSTAGRAM_ACCESS_TOKEN
    });
}

module.exports = { handleInstagramInteraction };

