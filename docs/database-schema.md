# Database Schema

This MVP stores data in `localStorage`, but these tables are the intended production schema for Firebase, Supabase, Postgres, MySQL, or a small Node backend.

## vendors

| Field | Type | Notes |
| --- | --- | --- |
| id | string / uuid | Primary key |
| business_name | string | Example: Hhb Cake Bites |
| whatsapp_number | string | International format without spaces, example `923001234567` |
| currency | string | Example `PKR` |
| delivery_start_offset_days | integer | Use `1` for next-calendar-day ordering |
| delivery_start_time | string | Example `10:00` |
| delivery_end_time | string | Example `22:00` |
| created_at | timestamp | |
| updated_at | timestamp | |

## categories

| Field | Type | Notes |
| --- | --- | --- |
| id | string / uuid | Primary key |
| vendor_id | string / uuid | Foreign key to `vendors.id` |
| name | string | Cakes, Cookies, Pastries |
| sort_order | integer | Optional display order |
| created_at | timestamp | |
| updated_at | timestamp | |

## products

| Field | Type | Notes |
| --- | --- | --- |
| id | string / uuid | Primary key |
| vendor_id | string / uuid | Foreign key to `vendors.id` |
| category_id | string / uuid | Foreign key to `categories.id` |
| name | string | |
| description | text | |
| price | decimal | Store as numeric decimal or integer minor units |
| image_url | text | Public image URL used in storefront and WhatsApp order text |
| is_visible | boolean | Show/hide on storefront |
| created_at | timestamp | |
| updated_at | timestamp | |

## orders

| Field | Type | Notes |
| --- | --- | --- |
| id | string / uuid | Primary key |
| vendor_id | string / uuid | Foreign key to `vendors.id` |
| customer_name | string | Required |
| customer_phone | string | Optional |
| address | text | Optional |
| delivery_at | timestamp | Must be on the next calendar day or later |
| delivery_slot | string | Must be between `10:00` and `22:00` |
| total_amount | decimal | |
| status | string | Example: `whatsapp_sent`, `confirmed`, `cancelled`, `completed` |
| whatsapp_message | text | Snapshot of generated message |
| created_at | timestamp | |

## order_items

| Field | Type | Notes |
| --- | --- | --- |
| id | string / uuid | Primary key |
| order_id | string / uuid | Foreign key to `orders.id` |
| product_id | string / uuid | Foreign key to `products.id` |
| product_name | string | Snapshot at order time |
| quantity | integer | Minimum `1` |
| unit_price | decimal | Snapshot at order time |
| image_url | text | Snapshot at order time |
