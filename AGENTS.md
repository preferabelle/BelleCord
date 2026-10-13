# Read this before you change BelleCord

BelleCord is my app. I made it and I share it with my friends. If you're an AI helping me with it, these are the rules.

## Every word people see is mine

Everything a person sees in BelleCord is written by me, in my own voice. That includes buttons, messages, errors,
tips, "What you need to do" lists, `READ ME FIRST.txt` and the release notes on GitHub. "I" and "me" mean me
(Belle). "You" means the person using the app.

- Good: "If it still won't load, send me a screenshot of this box."
- Bad: "Send Belle a screenshot." / "Contact the developer." / "Ask Claude to help." / "Paste this into ChatGPT."

Rules:
- Never tell people to ask Claude, ChatGPT or any other AI for help, and never say an AI wrote or helped with
  anything. Help comes from me: "tell me", "send me a screenshot".
- Never talk about me in the third person on screen.
- Write like a person typing: plain words, short sentences, normal keyboard punctuation (- not long dashes,
  ... not the single ellipsis character, straight quotes). Technical detail goes in a "Details" box.
- Code comments are plain notes. When they mention me, they say "I", "me" and "my".

## How updates reach people

- `app/update.json` holds the installed release's tag number ("version"), the update number people see ("name")
  and which zip of it is installed. The app checks the latest GitHub release of this repo. When the release tag
  (`vT`) is higher than "version", or it's the same release with a newer zip, it shows an Update button.
- I renumbered the updates once, so tags and titles don't match: tag `v12` is "BelleCord Update 8". Tags only
  count up (old copies of the app need that); the number in the title is the one people see. Update 9 is tag `v13`; the next one is
  tag `v14`, "BelleCord Update 10".
- A new number is only for real new things. A fix for something in the latest update goes into that same update:
  same tag, its notes rewritten to describe the whole update as it is now (not "fixed X"), and Post replaces it.
  Everyone who already has it still gets the fix.
- Update downloads the release's zip and replaces `app/*`, `package.json` and the `START` files. A person's own
  `app/hub.json` is kept. Then the app restarts.
- I make releases from my own copy of BelleCord with its "Post vN" button. That button commits the zip's files here
  and publishes the release. Don't push to this repo or make releases by hand.

## Never

- Never put tokens, passwords, `settings.txt`, or anything from my `data/` folder into this repo.
