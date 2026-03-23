# Sensa Wellness Project

## Project Location
`/Users/sydneymurphy/sensawellness/`

## What it is
Sensa Wellness is a saliva-based inflammation monitoring tool. The landing page is a single HTML file with inline CSS and JS.

## Key Files
- `index.html` - Main landing page (single file, all CSS in `<style>`, all JS in `<script>`)
- `logo.jpg` - Brand logo referenced in header
- `blog.html` - Blog listing page (linked from nav)
- `styles.css` - Shared stylesheet for blog/post pages
- `post-silent-inflammation.html` - Blog post (pre-existing)
- `post-gut-inflammation.html` - Blog post (pre-existing)
- `post-inflammation-cause-of-disease.html` - Featured blog post (pre-existing)
- 9 condition blog posts (created March 2026): post-diabetes-inflammation.html, post-arthritis-inflammation.html, post-injuries-inflammation.html, post-cancer-inflammation.html, post-weight-loss-inflammation.html, post-aging-inflammation.html, post-copd-inflammation.html, post-heart-disease-inflammation.html, post-allergies-inflammation.html
- `app.html` - App showcase page (CSS phone mockups, features grid, how-it-works flow, screenshots carousel, CTA)

## Blog Post Template
- All posts use shared `styles.css` (not inline styles like index.html)
- Template structure: progress-bar, header, article.post > .post-header-section + .post-body + .post-cta + .related-posts, footer, scroll-top button, script
- Nav CTA button text: "Take Action" (not "Join Waitlist") -- fully standardized across all files
- Nav order: Home, About, Blog, App, Team, Take Action (button)
- Related posts section links to 3 other condition posts
- Condition items in index.html are `<a>` tags wrapping the condition content, linking to corresponding blog posts
- Footer "Mobile Integration" link points to app.html across all files

## Brand / Design
- Typography: Nunito (headers, weight 700, letter-spacing -0.065em), Quicksand (body, weight 500)
- Colors: #fac234 (gold), #f59d06 (orange), #e85a39 (coral), #1800ad (navy), #7267f2 (purple), #41a6f0 (blue), #fffff7 (bg)
- Google Fonts URL in head

## Team Members (10)
Ryan (Founder), Faith (Sales), Nathan (Admin), Priyank (Manufacturing & Data Compliance), Magaga (Partnerships), Steve (Project Management), Sydney (Marketing & Creative), Shreya (Data Scientist), Chelsea (Supporting Member), Saurav (Supporting Member)

## Features Implemented (March 2026)
- Scroll-reveal animations with IntersectionObserver + staggered delays
- Hero stats bar with counter animation (7 in 10, 5 min, 100%)
- SVG icons for "Why Choose" cards (droplet, coin, globe) with gradient top borders
- SVG condition icons with brand-color tint backgrounds
- Team card hover effects with purple ring on avatar
- Improved buttons (8px radius, box-shadow, hover lift)
- Section dividers (gradient lines between sections)
- Floating vial animation
- Footer gradient top border
- Form focus glow effect
- Waitlist form card with purple left border accent
- Hero radial gradient overlays for depth
- Focus-visible accessibility outlines
