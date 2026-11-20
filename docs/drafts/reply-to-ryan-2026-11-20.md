# Reply to Ryan, re: book link and January reconciliation (his email of Nov 20, 2026)

Status: DRAFT. Items in [brackets] are facts only Sydney can confirm before sending.
---

Hi Ryan,

Thanks, this is enough to move the book forward.

Book

- The book is live: sensawellness.org/book, with a feature on the homepage below the kits and a Book link in the menu. The excerpt is the opening of "Before we begin," your own words. If you would rather it not be there, say so and it comes off the same day.
- Payhip shows the book as "On Sale, $0.00." If the base price is set to $0 rather than discounted to it, the listing reads as free instead of as a sale, which matches how the site now presents prices.
- The product id, free-checkout trigger, download event, and marketing opt-in answers only affect the measurement step, not the launch. Whenever you have them I will finish the Zapier connection. If it is easier, create the zap yourself: trigger Payhip New Sale, action Webhooks by Zapier POST to https://www.sensawellness.org/api/book-request, and I will send you the header value.

January

I think the two plans fit together as two batches rather than two competing offers:

- Batch 1, now: [N] kits we can assemble and ship within two weeks. The site sells these with a December 5 cutoff for Christmas delivery. [Sydney: confirm the number and that the two-week window still holds for the kits on hand.]
- Batch 2, January: once batch 1 is sold, or after December 5, checkout switches itself to paid pre-order wording. Those orders would be fulfilled from January with delivery across January and February, capped at your 500.

The switch already exists in the checkout code. What it needs from us is the January ship window stated at checkout (charged today, ships beginning January, full refund before it ships) and the 500 cap, and I can add both the day we agree. Orders so far: [Sydney: count from the admin Orders tab].

Two things would settle it:

1. Is the January kit the same swab-and-activator kit we ship now, or the dip-and-swirl version from slide 11? If it changes, the How To page, schema, app prompt, and demo video get one more pass before batch 2 opens.
2. The production dates behind the 500: when assembly starts and roughly how many per week, so the January and February delivery promise is one we can state at checkout.

Sydney
