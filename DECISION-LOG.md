# Decision Log: Will My Agent Answer This? (agent-answer)

Append only. Newest entry at the bottom. Append corrections rather than rewriting.

---

## 2026-08-13 — Distribution baseline measured. It is zero.

### What triggered this

One week after the tool went live on GitHub Pages, the question was: has anyone used it,
how would I check, and is it worth marketing.

### Finding 1: usage cannot be measured, by design (verified)

- GitHub Pages provides no analytics for the hosted site. The feature request
  (community discussion #31474) has been open since August 2022 and is unresolved as of
  mid 2026 with no commitment from GitHub.
- Insights → Traffic measures visits to the *repository page on github.com*, not the
  Pages site. These are different numbers and are commonly confused.
- The tool ships zero telemetry behind a CSP of `default-src 'none'`, which blocks every
  outbound request. There is no usage data anywhere, in any log. This is the privacy
  promise working exactly as specified, and the cost of it is total blindness.

### Finding 2: the repo traffic baseline (verified, pulled 2026-08-13)

Fourteen day window, both side projects, read from GitHub Insights → Traffic while
signed in.

| Metric | agent-answer | save-the-dates |
|---|---|---|
| Unique visitors | 1 | 1 |
| Total views | 5 | 43 |
| Referring sites | github.com (3 views / 1 visitor) | github.com (39 / 1), roanukz.github.io (2 / 1) |
| Clones | 24 | 78 |
| Unique cloners | 17 | 47 |
| Stars / forks / watchers | 1 / 0 / 0 | 1 / 0 / 0 |

The single unique visitor on each repo is me. Every referrer is my own navigation from my
GitHub profile or from my own Pages site. Zero external referrers on either project in
fourteen days. The single star on each is my own.

### Finding 3: clone counts are contaminated and must not be cited (verified)

47 unique cloners on save-the-dates and 17 on agent-answer, against one human viewer
each. Nobody clones a repository they never viewed. Both repos also spiked on 08/04
simultaneously, which indicates one crawler fleet hitting the account rather than two
unrelated humans discovering two unrelated tools on the same day.

**Decision: never cite clone counts as traction.** "78 clones" reads as adoption in a
portfolio slide and collapses the moment an interviewer asks who cloned it. Inferred with
high confidence that these are AI training scrapers, mirror services, and security
scanners.

### Finding 4: two products have now been shipped into a vacuum

save-the-dates has been public longer than agent-answer and has the same one human
visitor. The pattern is not a product failure. It is that publishing to GitHub Pages and
stopping is not a distribution step. This is now evidenced rather than suspected.

### Positioning problems found while checking (verified)

1. ~~**The landing page oversells the product.**~~ **RETRACTED, same day, see below.**

   *Correction, 2026-08-13.* This entry originally claimed the landing page promised the
   test could run "across entire knowledge bases in seconds" while the tool takes one
   article at a time. **That was wrong, and the error was mine.** The quoted phrase came
   from an AI-generated summary of the page, not from the page. Reading the actual source,
   `index.html` says "I built a tool that runs it on every section in seconds," which
   refers to every section of one pasted article and is accurate. The page uses
   "a knowledge-base article" singular throughout, and line 860 names "no batch mode" as an
   explicit non-goal. There is no overclaim. No copy change is needed.

   *Method note worth keeping:* a model's paraphrase of a page is not a quote from that
   page. Verify against the source file before recording a finding, especially a finding
   that accuses an artifact of dishonesty.
2. **"Agent readiness" is now a crowded term meaning something else.** Cloudflare shipped
   an Agent Readiness score, chatthing.ai has an Agent Readiness Checker, AgentGrade sells
   Agent Readiness. All of these concern whether a *website* is legible to AI crawlers,
   which is a GEO/SEO category. This tool concerns whether a *KB article* survives
   retrieval. Sharing under agent-readiness language buries it in the wrong category.
   Lead with retrieval language instead.
3. **The agent-answer repo has no homepage URL in its About sidebar.** save-the-dates has
   one. The repo is currently the only surface anyone reaches, and it does not link to the
   live tool anywhere a visitor's eye lands.

### Audience: the earlier research named four, which means it named none

The opportunity research listed knowledge managers, technical writers, support ops, and
AI/PM practitioners. Buyer and user are split:

- The person with the pain is whoever is switching on an agent over the KB. Support ops or
  KM lead at a company deploying Zendesk AI, Intercom Fin, Moveworks, ServiceNow,
  Agentforce. This is the JTBD already stated on the landing page.
- The person who would actually paste text is a KB author or technical writer. They did
  not ask for this and do not own the decision.

**Decision: aim at the first group.**

### Measurement options considered

| Option | Cost | What it yields |
|---|---|---|
| A. Stay pure, zero telemetry | $0 | Nothing about the site. Channel-side numbers only |
| B. Beacon on the tool page | The differentiator | Everything, at the cost of the privacy promise |
| C. Beacon on the landing page only, tool.html stays clean | ~30 min | Landing views, referrers, click-through to the tool |
| D. Custom domain, requests counted at the edge | ~$12/yr + migration | Same as C with the promise fully intact |

**Recommended: C.** The project already has two surfaces. The landing page makes no
privacy promise; the tool does. Draw the line where the claim lives and state it in the
teardown, because being explicit reads as more credible than silent purity.

**Rejected: B**, because the CSP and the "turn off Wi-Fi and it still works" claim are the
whole differentiator, shared with save-the-dates.

**Open on D:** Cloudflare Web Analytics as documented is a client-side beacon, and there
is an open community thread about Pages injecting `beacon.min.js` even with analytics
disabled. Anyone taking this route must verify what actually lands in the HTML. Netlify's
current analytics price was not confirmed.

### Decision on marketing

Reframed. The question was never "is it worth marketing," because nothing has been
marketed. The two candidate goals need different work:

- **Users:** low payoff. Nothing is charged, the audience is narrow, there is no second act.
- **The PM move:** the actual goal. The artifact is the teardown, not the pageview count.
  Hiring managers ask what was learned and what would change next, not how many visits.

**Decision: one bounded push. One week, roughly four hours, instrumented first, aimed only
at the narrow audience.** Then branch:

- Clears ~200 landing visits *and* produces one real conversation with someone who runs a
  KB → continue. The conversation is worth more than the traffic.
- Does not → stop marketing the tool. It has done its job as a portfolio piece. Redirect to
  the teardown as the LinkedIn newsletter launch, where installment #1 in the newsletter
  plan is already "why don't enterprise chatbots just read the knowledge base."

**Correction to an earlier framing in this session:** the launch push and the user
conversations were first posed as competing uses of the same four hours. That was wrong.
At a zero baseline they are the same activity: the push is how the five people get found.
Run the post as recruitment, asking KB owners to run the tool on their worst article and
report what it got wrong. That converts on a smaller audience than "I built a thing" and
produces interview material either way.

### Correction logged: the LinkedIn link penalty

An earlier recommendation in this session leaned on a LinkedIn external-link reach
penalty. Roanuk pushed back. Checking the source research: it found van der Blom's 2026
study (1.3M posts) showing roughly 18.8% median reach reduction for one body link, other
datasets showing more, one showing the opposite effect, and LinkedIn's own Senior Director
of Product publicly denying any algorithmic penalty. The documented conclusion was
"direction consistent, magnitude disputed," not "no penalty exists."

So the pushback was half right. The finding was not "there is no penalty," but the
recommendation should not have rested on a contested number. **The reason to put the full
teardown in the post body is that a stub post gives a recruiter nothing to read.** That
holds if the penalty is exactly zero. Same action, sounder reason.

### Open threads

- Where the standing tools decision log should live long term. The cowork workspace has no
  domain for side-project tools; `newsletter/`, `career/`, and `life/` exist, and the tool
  repos sit outside cowork as siblings. Options are a new `tools/` domain copied from
  `_domain-template/`, or a `DECISION-LOG.md` inside each tool repo, which is what this
  file currently is. Not yet decided.
- Whether the launch push happens before or after the newsletter launch, given the
  teardown is installment #1's subject matter.
- **Whether GoatCounter ships at all.** Approved in principle on 2026-08-13, then paused
  the same day once the landing page source was actually read. See the entry below.

---

## 2026-08-13 (later) — Repo About link shipped. Analytics paused on new evidence.

### Shipped

`agent-answer` repo About sidebar now carries `https://roanukz.github.io/agent-answer/`,
set through the "Use your GitHub Pages website" checkbox. Reversible by clearing the field.

### Paused, and why the earlier approval no longer covers it

The plan approved was "add GoatCounter to the landing page only, keep tool.html clean, and
add a line to the teardown stating the split." Reading `index.html` and `vite.config.ts`
turned up two facts that make that description wrong about its own cost:

1. **The CSP is one constant applied to both pages.** `vite.config.ts` injects a single
   `CSP` string through `transformIndexHtml()`, which runs for every HTML entry. Splitting
   it is not a string edit. It means making the plugin page-aware, so the mechanism that
   enforces the brand promise gets rewritten to enforce two different promises.

2. **The landing page makes the zero-network claim in three places, one of them a headline
   stat above the fold.** The hero fact tile reads "Zero / Network requests, now enforced
   by the browser." Decision 2 is titled "Everything runs in your browser, with no network
   requests," argues that the CSP "refuses outbound connections of any kind," and lists its
   cost as "No usage data, now or ever."

GoatCounter uses `navigator.sendBeacon` to `https://roanuk.goatcounter.com/count`, so
shipping it on the landing page requires `script-src https://gc.zgo.at` and
`connect-src https://roanuk.goatcounter.com`, and falsifies all three passages on the page
they appear on. Retracting "no usage data, now or ever" inside the artifact being used as
interview material is a materially larger change than "add a line stating the split," which
is what was approved.

### The alternative that was under-weighted

LinkedIn reports post impressions and unique link clicks natively, for free, with no code
and no promise to rewrite. The bounded push is being run to answer one question, whether
the post drove anyone to the site, and LinkedIn answers exactly that. What it does not give
is referrers from other channels, return visits, or click-through from the teardown to the
tool.

### Decision: LinkedIn analytics only. GoatCounter not shipped.

Roanuk chose LinkedIn only, 2026-08-13. **No code change ships.** `index.html`,
`tool.html`, `vite.config.ts` and the CSP are untouched. The zero-network promise, the
"Zero / Network requests" hero tile, and Decision 2 all stand as written.

Reasoning: at a baseline of one visitor the only question is whether anyone arrives, and
LinkedIn answers that for free. Spending a headline claim to buy referrer resolution is
premature. Revisit if a second push runs across multiple channels, where referrer data
starts being worth the trade, and make that call on evidence rather than in advance.

The GoatCounter account at `roanuk.goatcounter.com` exists and is unused. Not a problem,
and it stays available if the trade ever becomes worth it.

### What gets recorded for the bounded push

Recorded from LinkedIn's own post analytics at 48 hours and at 7 days:

| Figure | Why it is here |
|---|---|
| Impressions | Denominator. Without it a click count means nothing |
| Unique link clicks | The only proxy for "someone arrived" that exists under this decision |
| Comments, and how many are from people who own a KB | The actual signal |
| DMs or replies containing a disagreement with a score | The thing the post asks for |

Also pull repo Insights → Traffic on day 7, while it is still inside the 14 day window,
and compare unique visitors against the baseline of 1.

**The branch is on replies, not clicks.** Clicks are the leading indicator; a KB owner
telling him what the score got wrong is the outcome. Continue if at least one person who
owns a knowledge base runs it and comes back with a disagreement. Stop marketing the tool
if seven days produce zero such replies, regardless of how good the impression count looks.

**Named in advance so it cannot be rationalized later:** a post with strong impressions,
strong likes, and no KB owner replies is a null result. It means the post performed as
content and failed as recruitment. That is a stop, not a "promising start."

---

## 2026-08-13 (evening) — A scoring defect fixed, and size and split checks shipped

The launch push has not run yet. This entry is about the product it would have pointed at,
which turned out to have a defect in the one thing it sells.

### The rubric certified articles it should have refused (verified by arithmetic)

Published model: five weighted checks at 25/20/20/15/20, each starting at 100, and "85 or
above is agent-ready." Multiplying that out:

| Case | Composite | Old verdict |
|---|---|---|
| The 15% check driven to 25, other four at 100 | 88.75 | agent-ready |
| The 15% check driven to **0**, other four at 100 | **85.0** | **agent-ready** |
| The 25% check driven to 25, other four at 100 | 81.25 | fails, correctly |

So a completely failed dimension sank the article or did not, depending on nothing but
which dimension it happened to be. Confirmed live, not only on paper: an eight-section
article scores exactly 85 with one check at 0 and would have been certified.

**Decision: a per-check floor of 60. No article is agent-ready with any check below it.**
60 rather than a new number, because 60 is already the line the tool draws between "needs
work" and "fail" on every check card, and the scoring page already told readers that a
failing check is a failing check whatever the total says. The fix makes the score obey a
sentence the page was already printing. The composite is never adjusted, only the verdict
it can buy, and the weakest check is now shown beside the total on every result.

**The lesson is not "test the code."** All 186 tests passed throughout. It is that a
scoring model needs its edge cases worked by hand before publication. Every number needed
to find this was printed on the public scoring page from day one, and I published the
weights without ever multiplying them out.

### Three quotes cut, because their sources could not be reached

The brief for this work named six vendor quotations documenting the retrieval mechanism.
Four verified exactly at the vendor's own page. Three were cut:

- **Salesforce Data 360, "max token limit for a chunk is 512"** — every `help.salesforce.com`
  page returns a JavaScript shell or a CSS error to a non-browser fetch; the two
  `developer.salesforce.com` chunking pages do not contain the number; Trailhead does not
  either.
- **Salesforce, "Section-Aware Chunking uses title and heading elements"** — same wall. A
  Trailhead page carries a near-equivalent sentence about HTML headings as "logical
  boundaries for passages", which is a different sentence from a different kind of source,
  so it was not substituted in.
- **ServiceNow, what a Q&A Genius Result card shows** — the `servicenow.com/docs` pages
  render as navigation only, the Horizon component page 403s, the newsroom 429s.

**Decision: cut rather than soften, and say so on the page.** A claim I cannot open is not
a citation. The consequence is stated in the teardown rather than buried: the 512-token
limit the tool checks against is **Moveworks' alone**, so the "two vendors independently
publishing 512" framing does not exist and nothing here is an industry standard. The
mechanism evidence is three companies, not five, and two of the surviving quotes are
Moveworks', which has been a ServiceNow company since 15 December 2025. That ownership is
disclosed beside the quotes.

This is the same discipline as the retracted landing-page finding above, applied before
publication instead of after: the vendor's own page, or nothing.

### A new rule was demoted before it ever shipped, because it contradicted an old one

`answer-only-in-table` flags a section whose answer exists only in a table, on Moveworks'
statement that "The bot is currently unable to surface content from tables in-chat." It was
specified as a major. Running the fixtures caught the collision: check 5 already contains
`prose-comparison`, which tells authors to *turn comparisons into tables*. A major would
have punished authors for taking the tool's own advice, with two rules arguing inside one
check.

**Decision: minor, with an additive fix — keep the table, and also write the takeaway in a
sentence.** The two rules then stop disagreeing, because the table is still the better
structure to parse. Moveworks' own word is "currently", which a major would have overstated
into a permanent fact about agents.

Worth keeping as a pattern: **a new rule has to be scored against the rules already in the
same check, not only against the evidence that justifies it.** Nothing in the source
material would have caught this. The fixture did.

### A rule that could not fire on the path most people use (found late, fixed)

`image-without-alt` shipped, was documented on the scoring page, passed its unit tests, and
was **structurally unable to fire on a pasted KB article**. The paste pipeline stripped
`<img>` as page chrome, so an unlabelled screenshot copied from a rendered page disappeared
before any rule could see it. It only ever worked on hand-typed markdown.

**Decision: keep images as markdown text (`![](src)`) instead of dropping them.** The cost
is nil: the textarea holds text, the article view builds text nodes rather than elements,
and `img-src 'self'` refuses a remote load even if something tried. Verified by pasting a
real KB-style page with an unlabelled image and confirming both that the rule fires and
that the network log stays empty.

**The general failure:** the unit test proved the rule worked on the input the test author
chose, and the input the test author chose was not the input the product actually receives.
Coverage was 100% and reachability was 0%.

### Fixture movement, accounted for

| Fixture | Before | After | Why |
|---|---|---|---|
| bad-article | 42 | 38 | Answer first 45→35 (new chat-cutoff rule). One idea 55→45 (the 500-word major retired, +15; the new 512-token major arrives, −25) |
| good-article | 100 | 98 | Structure 100→90, one minor on the soft-vs-hardware comparison table |

The good article losing 2 points is the demoted rule doing its job on a fixture built to
demonstrate good writing, and the advice it gives there is correct: the comparison's
takeaway exists only inside the table.

### The teardown now fails its own tool, and that is being left in

Pasting the teardown through the tool scores **61**, with one idea per section at 0. The
pieces it would be cut into run to 775, 942, 1,787 and 2,930 estimated tokens against a
limit of 512.

**Decision: leave the essay long and say why.** A teardown is written to be read from the
top by a person who chose to be here; a KB article is written to be cut up and read one
piece at a time by software that chose nothing. The rubric scores the second thing, so it
is correct to fail the first. Chopping the essay into retrieval-sized fragments to flatter
its own score would be optimising the artifact for a measurement that does not apply to it.

### Open threads

- Whether the launch post should now lead with the split map, which is the only feature no
  competitor has, rather than with the read-it-cold test. Not decided; the post is
  otherwise unchanged and still says what it said.
- The size and split work re-scored the roadmap. "Version 2 standalone-section check, using
  a model" fell from RICE 4 to 1, because the concrete insight I was reserving for a model
  turned out to be a character count. Recorded in the teardown's RICE table with the
  reasoning, since a roadmap re-scored after building something is worth more than one
  scored only before.

---

## 2026-08-13 (night) — End-to-end validation of the shipped build. Three fixes.

### What triggered this

Two implementations of the same brief existed: one pushed to `main`, one built in parallel
in a separate session. The remote was taken as the base because it was more complete, and
the parallel work was kept on `parallel-implementation-aug13` rather than merged. What
follows is what survived from it, plus what an end-to-end pass over the merged result
found.

### Ported from the parallel build: banding read the rounded composite (verified)

The floor closes the case where a collapsed check hides behind a weighted average. Reading
that code turned up a second route to the same threshold: `bandFor()` was handed
`Math.round(overallRaw)`, so a composite below 85 could be promoted into the band above it.

Checks of `[45, 100, 100, 90, 100]` average **84.75**, display as **85**, and certified.
Reachable with real check scores, not theoretical. The band now reads the unrounded average
and only the display rounds. Pinned in `tests/score.test.ts` beside the three floor cases.

The lesson is sharper than the first one: when a boundary bug turns up, the question is not
whether this one is fixed but how many ways there are to reach that boundary.

### Withdrawn: a correction that was itself wrong (verified, and worth recording)

The parallel build claimed `size.ts` had fabricated its quotation, on the grounds that
"Hard maximum" appears nowhere on the KB-articles page and that 512 is the threshold below
which a paragraph is *preserved*, not a ceiling above which chunks split.

That was wrong. The comment cites a different page,
`document-chunking-and-snippetization-overview`, which was never fetched before the claim
was made. That page says verbatim: "Minimum chunk size: 8 tokens (smaller chunks are
merged) Target chunk size: 256 tokens Hard maximum: 512 tokens (tables and lists: 1,024
tokens) If a structural block still exceeds the hard maximum, it is recursively split
further." The threshold, the citation and the framing were all correct as shipped, and the
"8 tokens" figure that had been cut as unverifiable is documented there too.

**Process correction: a challenge to someone else's citation starts at the source their
comment names, not at the source you happen to have open.** Both pages were needed; one was
read.

### Found by end-to-end validation: the tool contradicted itself (fixed)

Running the reference article through the finished build produced, on the same table, in
the same section, at the same time:

- STRENGTH: "This article presents structured facts as a table instead of burying them in prose."
- ISSUE: "This section's answer lives only in a table, with only 16 words of prose around it."

Both correct in isolation. Together they read as a tool that does not know its own mind.
A positive finding is now dropped when a negative finding lands on the exact same block, so
praise is never delivered for something criticised in the same run. Matched on the exact
span, so a strength elsewhere in a flagged section survives. Pinned in
`tests/contradiction.test.ts`.

`good-article.md` was also rewritten to state its answer in a sentence and keep the table as
the detail, which is what the finding tells every other author to do. It scores 100 again,
and the reference article now models the fix rather than the fault.

### Found by end-to-end validation: the split map reported internals, not consequences (fixed)

On the sample article the map said "No level qualified. The search runs H1, then H2, and
neither appears twice here." Algorithmically exact, and useless: it describes what the
algorithm did rather than what it costs the reader. The sample has one H1 and one H3, so the
whole 873-word article arrives as a single piece, which is the alarming part and was the
part left unsaid.

It now reads: "The whole article arrives as one piece. Cuts land on the largest heading
level that appears at least twice, and neither H1 nor H2 does that here, so nothing divides
it. Add a second H1 or a second H2 and you choose where it splits." Consequence first, then
the rule, then the action.

### Validation performed

- 246 tests, 32 files. Typecheck and production build clean.
- The brief's acceptance cases re-run against the built engine: a 1,500 word section is
  flagged and a 200 word one is not; one H1 with three H2s cuts on H2 into four pieces, and
  adding a second H1 moves the cut to H1 and two pieces; same input gives the same report.
- Every quotation on both shipped pages checked against a fetched copy of its own source.
  Quotations appearing on a page and unconfirmed at source: **zero**.
- 15 outbound links: 13 return 200; Gartner and Bloomfire return 403 to scripted requests
  and were confirmed by hand in a browser.
- Dark mode: every new component uses role tokens only, no raw values. Contrast measured on
  the new UI in dark: panel note 6.42, weakest-check line 12.69, piece rows 12.69, band 9.91.
  All pass AA.
- Zero horizontal overflow at 1280 and at 375. An earlier reading of 301px was a
  measurement artifact from a collapsed pane, not a layout bug.
- No `fetch(`, `XMLHttpRequest`, `sendBeacon` or `WebSocket` in the bundle. CSP present on
  both pages. No external subresources.
- House style: zero em or en dashes in either page's visible text, zero uses of "kill",
  and curly apostrophes removed from UI copy while quotations keep the ones their sources
  use.

### Open threads

- The sample article demonstrates the split map as a single undivided piece. That is the
  more alarming demonstration and it is now legible, but a second sample with real
  boundaries would show the feature working rather than only failing.
- `parallel-implementation-aug13` still exists locally. Nothing in it is unported; it is
  kept only as a record of what two independent passes at the same brief converged on,
  which was the floor at 60, the same justification for it, and the 500-character limit
  placed in check 2 rather than with the size rules.

### Later the same night: the market-size forecast was cut from the teardown

Part 3 rested on two outside numbers. One is now gone: knowledge management software
projected to reach $75.22 billion by 2034 at 12.3% (Straits Research).

The reason is not length, though the essay was being trimmed when it went. The same firm
publishes a materially different figure for the same market, which meant the number arrived
already carrying two caveats: that it is a forecast, and that its own publisher disagrees
with it. Nothing in the product rests on it, and it was doing no work that the incentive
analysis below it does not do better. A number that has to be qualified twice before it can
be read is not evidence, and keeping it only because the original brief asked for it would
be the same mistake as keeping the two vendor claims that could not be retrieved.

Gartner's 2029 prediction stays, still graded as a forecast, because it is the number that
gets budget approved and the page says so plainly.

Every remaining figure on the page now traces to Gartner, to a Moveworks published limit,
or to the product's own arithmetic.
