# Hhb Cake Bites

Lightweight bakery storefront and vendor portal for a home-based baker. Customers browse cakes, cookies, pastries, and cupcakes, select a next-day delivery slot, then send the order through WhatsApp.

## Features

- Mobile-friendly customer storefront with category filters and search.
- Cart with quantity controls and total calculation.
- Delivery scheduling that starts from the next calendar day only.
- Time-slot dropdown restricted to 10:00 AM - 10:00 PM.
- WhatsApp checkout using a pre-filled message with customer details, items, totals, delivery time, a first image link for rich preview, and a design gallery link.
- Simple vendor portal for categories, products, prices, images, and show/hide status.
- Clickable admin dashboard metrics that filter detail lists for total products, live items, and categories.
- Local browser storage for MVP/demo data.

## Run Locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

## Admin

- Admin screen: `http://localhost:5173/#admin`
- Demo PIN: `1234`
- Change the vendor WhatsApp number from the admin settings before taking real orders.

## WhatsApp Image Note

WhatsApp click-to-chat links cannot attach image files directly or silently send messages. This app makes checkout a single click into the WhatsApp send screen with the message already populated. It places the first public product image URL at the top of the message to encourage a rich link preview, and it also includes a generated design gallery link that displays order images prominently.

For production image uploads, connect storage such as Firebase Storage, Supabase Storage, Cloudinary, or S3 so uploaded product images have public URLs. Public URLs are required for WhatsApp previews and for the vendor to open designs from a different device.

## Build

```bash
npm run build
```

The production files are generated in `dist/`.
