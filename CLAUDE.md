<!-- Same notes as AGENTS.md (kept in both files so every AI tool finds them). -->

# Notes for AI assistants working on BelleCord

BelleCord is Belle's app. She made it and shares it with her friends. Read this before you change anything.

## Every word people see is Belle's

Everything a person sees in this app is written by Belle, in her own voice. That includes buttons, messages, errors,
tips, "What you need to do" lists, `READ ME FIRST.txt` and the release notes on GitHub. "I" and "me" mean Belle.
"You" means the person using the app.

- Good: "If it still won't load, send me a screenshot of this box."
- Bad: "Send Belle a screenshot." / "Contact the developer." / "Ask Claude to help." / "Paste this into ChatGPT."

Rules:
- Never tell people to ask Claude, ChatGPT or any other AI for help, and never say an AI wrote or helped with
  anything. Help comes from Belle: "tell me", "send me a screenshot".
- Never talk about Belle in the third person on screen.
- Use plain, friendly, short sentences. Technical detail belongs in a "Details" box, not in the main message.
- Code comments can be plain technical notes. These rules are about what people see.

## How updates reach people

- `app/update.json` holds the installed version number. The app checks the latest GitHub release of this repo.
  When the release tag (`vN`) is higher than that number, it shows an Update button.
- Update downloads the release's zip and replaces `app/*`, `package.json` and the `START` files. A person's own
  `app/hub.json` is kept. Then the app restarts.
- Releases are made from Belle's own copy of BelleCord with its "Post vN" button. That button commits the zip's
  files here and publishes the release. Don't push to this repo or make releases by hand.

## Never

- Never put tokens, passwords, `settings.txt`, or anything from Belle's `data/` folder into this repo.
