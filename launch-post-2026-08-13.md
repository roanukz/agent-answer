Your AI support agent never reads a whole article.

It retrieves one section, out of context, and answers from that. So the question that matters before you switch an agent on is not whether your knowledge base is any good. It is which sections stop making sense the moment they are read alone, because a lone section is the only form the agent will ever see them in.

The recommended way to test that is manual, and it is brutal. The guidance from the KM vendors is to pull a paragraph out of the middle of an article, strip the title and the surrounding context, and read it the way an agent would: as a standalone fragment. If it cannot be understood without what came before it, rewrite it. Then repeat. For every paragraph. In every article.

Nobody does that at 2,000 articles, so the audit either does not happen or it happens after customers have already found the gaps. And although the failure shows up as a bad answer from the agent, the cause sits upstream, in an article that was written to be read from the top.

I built the automated version of that read-it-cold test. Paste one article, get a 0 to 100 score across five checks: standalone sections, answer-first openings, unresolved back-references, one idea per section, and parseable structure. 25 rules underneath, and every deduction explains itself, so when a finding is wrong for your article you can see exactly why it fired and overrule it.

Free, no account, and it runs entirely in your browser. No telemetry, no server, nothing uploaded. Turn your Wi-Fi off and it still works.

Here is what I actually want from this post. If you own a knowledge base, run it on your worst article and tell me what the score got wrong. I have a scoring rubric I believe in and no evidence that it matches how the people who own this content judge it themselves, and since I wrote the rules from vendor guidance rather than from watching anyone work, the disagreements are worth more to me than the agreements.

Two things it does not do yet: batch mode, and rewriting. It tells you what to fix and why. The words stay yours.

roanukz.github.io/agent-answer
