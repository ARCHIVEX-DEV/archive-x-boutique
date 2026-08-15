# ARCHIVE X BOUTIQUE

Structure:
- index.html
- api/create-checkout-session.js
- api/stripe-webhook.js
- package.json

Variables Vercel:
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET
- RECAPTCHA_SECRET_KEY
- PUBLIC_SITE_URL=https://archive-x-boutique.vercel.app
- ARCHIVE_X_WEBHOOK

Stripe webhook URL:
https://archive-x-boutique.vercel.app/api/stripe-webhook

Events:
- checkout.session.completed
- payment_intent.succeeded

The custom promo codes are kept in both index.html and create-checkout-session.js so the displayed discount and the Stripe amount match.
