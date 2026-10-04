# NANO Dashboard

لوحة تحكم NANO مستقلة تعمل على Vercel، وتتصل بالبوت الموجود على Render عبر HTTPS.

## Vercel Environment Variables
- `MONGO_URI` — رابط MongoDB Atlas
- `DASHBOARD_TOKEN` — كلمة سر دخول لوحة التحكم
- `BOT_API_KEY` — مفتاح الربط السري بين Vercel وRender
- `BOT_NAME=نانو`

## Deployment
اجعل Root Directory في Vercel هو هذا المجلد، ثم Deploy.

بعد النشر، ضع رابط Vercel في Render:
`DASHBOARD_API_URL=https://YOUR-PROJECT.vercel.app`

ثم ضع نفس قيمة `BOT_API_KEY` في Render باسم `DASHBOARD_API_KEY`.
