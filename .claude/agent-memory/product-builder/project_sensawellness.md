---
name: Sensa Wellness Site Structure
description: Static HTML wellness startup site - design system, page inventory, SEO setup, and conventions
type: project
---

- Static HTML site (no framework, no build step) for a saliva-based inflammation monitoring startup
- Design system: Nunito (headings 700) + Quicksand (body 500), navy #1800AD, bg #fffff7, coral #E85A39, orange #F59D06, gold #FAC234, text-dark #1a1a2e, text-muted #4a4a5a, 16px border-radius cards
- Pages: index.html, blog.html, app.html, take-action.html, how-to.html, start.html, deck.html, plus multiple post-*.html blog posts
- All CSS inline in <style> tags except app.html which also uses styles.css
- Google Fonts loaded via preconnect + stylesheet link
- Nav pattern: sticky header, logo left (logo.jpg), nav links right, mobile hamburger at 640px breakpoint
- Footer: dark navy #0d0066 (index uses var(--text-dark) = #1a1a2e), gradient top border, 3-col grid
- Footer Quick Links (index.html): Home, About, Blog, How To, Take Action
- Scroll reveal animations via IntersectionObserver (.reveal / .visible classes)
- Waitlist form button text: "Join Waitlist" (index.html)
- Waitlist select options: personal health, family, healthcare provider, corporate wellness, just curious
- Responsive breakpoints: 992px and 640px
- SEO (added 2026-03-24): all 4 main pages have meta description, OG tags, Twitter cards, canonical URLs, theme-color #1800AD
- index.html has JSON-LD Organization structured data
- All img tags on main 4 pages have loading="lazy"
- Domain: sensawellness.org, contact: Info@sensawellness.org
- Stripe checkout integration (added 2026-03-28): Vercel serverless functions in /api/ (checkout.js, webhook.js), package.json with stripe dependency
- take-action.html Buy Now buttons call handleCheckout(priceId) which POSTs { priceId } to /api/checkout, redirects to Stripe hosted checkout
- Pricing bundles (added 2026-03-29): 1 Kit $49, 3-Pack $99 (most popular), 4-Pack $129 (best value)
- Placeholder price IDs: price_1test, price_3pack, price_4pack
- Pricing cards on both index.html (#pricing section before team) and take-action.html (#waitlist section)
- .pricing-card.featured class = navy #1a1464 bg, gold badge, used for 3-pack
- success.html order confirmation page (noindex), Vercel deploy URL: sensa-wellness-website.vercel.app
- Env vars needed: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET
