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

- `app/update.json` holds the installed version number. The app checks the latest GitHub release of this repo.
  When the release tag (`vN`) is higher than that number, it shows an Update button.
- Update downloads the release's zip and replaces `app/*`, `package.json` and the `START` files. A person's own
  `app/hub.json` is kept. Then the app restarts.
- I make releases from my own copy of BelleCord with its "Post vN" button. That button commits the zip's files here
  and publishes the release. Don't push to this repo or make releases by hand.

## Never

- Never put tokens, passwords, `settings.txt`, or anything from my `data/` folder into this repo.
