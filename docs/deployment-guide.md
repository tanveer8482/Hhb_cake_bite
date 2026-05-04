# Deployment Guide

## Best MVP Option: Vercel

1. Push this project to GitHub.
2. Import the repository in Vercel.
3. Use the default Vite settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add a custom domain if needed.

This works well for the current static MVP because product and category data is stored in each browser's `localStorage`.

## Production Upgrade Path

For real vendor management across devices, replace `localStorage` with one of these:

- Firebase Auth + Firestore + Firebase Storage
- Supabase Auth + Postgres + Supabase Storage
- Node/Express API + Postgres + Cloudinary

Use public image storage so WhatsApp messages can include accessible product image URLs.

## Required Production Checks

- Replace the demo admin PIN with real authentication.
- Store vendor settings in a database.
- Validate the next-calendar-day rule and 10:00 AM - 10:00 PM delivery slots on the backend as well as the frontend.
- Use public image URLs for every product.
- For rich WhatsApp previews of the generated design gallery, serve an order-summary route with server-rendered Open Graph image tags.
- Add an order history table if the vendor needs tracking beyond WhatsApp.
