# Book reader follow-up sequence (draft, Nov 4, 2026)

Status: copy drafted, nothing scheduled. Sends start only after the book page is public and the Payhip link is live. Timing follows slide 39 of Ryan's guide: delivery, then two optional emails at +2 and +5 days for readers who opted into marketing updates at Payhip checkout.

Rules for the whole sequence

- Only the delivery email goes to everyone. Emails 2 and 3 go only to people who ticked the marketing opt-in at Payhip checkout.
- Suppress emails 2 and 3 for anyone who has already bought a kit (match on email against Stripe customer email) and for anyone who unsubscribes.
- Never infer a health condition from the download. No "since you are worried about inflammation" phrasing.
- Plain text or the branded template at emails/template.html. No emojis, no em dashes, American English.
- Every link carries utm_source=book_email, utm_medium=email, utm_campaign=book_sequence, utm_content=email1 | email2 | email3 so the measurement spec can separate the three sends.
- Sender: Ryan A. Robinson, from the orders@ or info@ address once Resend's domain is verified. Reply-to info@sensawellness.org.
- Footer on every email: the wellness disclaimer, the mailing address (2 Ocean Ave Apt 408, Revere, MA 02151), and an unsubscribe link.

Wellness disclaimer (footer, verbatim from the site)

Sensa is a general wellness product intended to support a healthy lifestyle. It is not intended to diagnose, treat, cure, or prevent any disease or medical condition. Results are not a substitute for professional medical advice, diagnosis, or treatment. If you have concerns about your health, consult a qualified healthcare provider.

---

## Email 1. At delivery. "Here is your free guide"

Subject: Your copy of Inflammation: Weight Loss and Aging
Preview text: The PDF is attached. Here is where to start.

Hi,

Thank you for requesting the book. Your PDF is attached and the download link below will keep working if you need it on another device.

[Download the book] (Payhip download link)

Where to start

You can read straight through, or begin with the chapter that matches your question:

- If weight loss brought you here, start with Chapter 2, Weight loss and metabolic health.
- If joint pain is the issue, start with Chapter 3, Arthritis and joint health.
- If a CRP result made you anxious, Chapter 11, Blood and saliva monitoring, will help you prepare a more productive conversation with your clinician.

The last chapters give you a simple way to turn observations into decisions, plus a one-page baseline record and a worksheet for your next appointment. You do not need to buy a test or a supplement to benefit from any of it.

One request. If something in the book is unclear or you think a claim is wrong, reply to this email. I read every reply and corrections go into the next edition.

Ryan A. Robinson
Author, and founder of Sensa Wellness

A note on my interest: I founded Sensa, which makes an at-home saliva wellness kit, and I have a financial interest in its products. The book identifies company information separately from the scientific evidence so you can tell which is which.

(Footer: disclaimer, address, unsubscribe)

---

## Email 2. Two days after delivery, opted in only. "One useful idea from the book"

Subject: When someone says they are "inflamed," what do they mean?
Preview text: One question that makes the next decision clearer.

Hi,

Here is the idea I would keep if you only kept one thing from the book.

"Inflamed" is not one thing. It might mean a sore knee, a blood test result, fatigue, trouble losing weight, or a general sense that your body is not working the way it used to. Those experiences all deserve attention. But they are not interchangeable, and giving them one name can make the next decision less clear rather than more clear.

So before any test, including ours, ask one question first:

What decision could this measurement improve?

If the answer is "none," more testing adds cost and anxiety without improving anything. If the answer is specific, such as "whether to bring this pattern to my next appointment" or "whether the routine I started in October is doing anything," then you know what to measure, how often, and what you will do with the result.

That question is the backbone of Chapter 12, which borrows a decision loop called OODA and adapts it for everyday health: observe, orient, decide, act. The short version is on pages 56 to 63, and the one-page worksheet on page 73 walks you through it.

[Read the excerpt on our site] (https://www.sensawellness.org/book?utm_source=book_email&utm_medium=email&utm_campaign=book_sequence&utm_content=email2)

A safety note worth repeating from page 7: do not wait for any test result if you develop emergency symptoms such as chest pressure, severe trouble breathing, sudden weakness on one side, or trouble speaking. Call emergency services.

Ryan

(Footer: disclaimer, address, unsubscribe)

---

## Email 3. Five days after delivery, opted in only. "How Sensa fits a wellness routine"

Subject: Where a saliva kit fits, and where it does not
Preview text: The real kit, what it measures, what it costs, and when it ships.

Hi,

Chapter 11 is where I explain the kit I make, so this email is the honest version of that chapter in five paragraphs.

What it is. Sensa is an at-home saliva kit. You swab the inside of your mouth, mix the swab into a small vial of activator, wait 15 to 30 minutes, and scan the vial with the Sensa app. The app reads the color change and gives you a 0 to 100 inflammation score. No needle, no lab, no appointment.

What it is for. Tracking your own trend over time, as one observation inside the loop from Chapter 12. The useful comparison is you against your own earlier readings, under similar conditions, alongside notes about sleep, illness, a medication change, or a sore gum. That is the "observe" step. The kit does not do the "orient" or "decide" steps for you.

What it is not. It is not a diagnosis of arthritis, heart disease, diabetes, or anything else. It is not a reason to change a medication. It is not a substitute for a blood CRP or hsCRP test, and there is no conversion from a saliva reading to a blood value. If a result worries you, the right next step is a conversation with a clinician, not another kit.

What it costs and when it ships. A single kit is $39. A 3-pack is $79 and a 4-pack is $103, which is the better choice if you want a baseline plus follow-ups. Shipping is free. Kits ship within 2 weeks of your order, and you can get a full refund any time before yours ships.

[See the kit] (https://www.sensawellness.org/kit?utm_source=book_email&utm_medium=email&utm_campaign=book_sequence&utm_content=email3)

If you would rather keep reading and not buy anything, that is a completely reasonable outcome of the book. This is the last email in this short series. You will only hear from us again if you stay subscribed to occasional updates.

Ryan

(Footer: disclaimer, address, unsubscribe)

---

Open items before scheduling

- Confirm which tool sends emails 2 and 3 (Payhip's own follow-up feature, or export opt-ins to our sender). Payhip can deliver email 1 automatically.
- Ryan to approve the page references (pages 7, 56 to 63, and 73 match the free digital edition dated November 2026).
- If the January kit changes the procedure (dip and swirl, then activator), update the "What it is" paragraph in email 3.
