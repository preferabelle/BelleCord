# BelleCord

Fluxer and Discord in one window, both signed in as you.

I made BelleCord for me and my friends. It puts Fluxer and Discord side by side in one app, with a dashboard,
themes, skins, game badges and a bridge bot you can run yourself.

## What's in it

- Both apps in one window: Fluxer servers on the left, Discord on the right, or everything in one list. Switch
  sides with Ctrl+1 / Ctrl+2, or see both at once.
- The dashboard: what's new, your inbox from both sides (mentions, replies and unread DMs), voice channels with
  people in them, countdowns, quick links, and more. Organize it however you want.
- Theme studio: colors, backgrounds (a lot of them move), fonts, cursors and effects, plus ready-made themes for
  games, anime, my book Soulbound, and moods.
- Skin studio: a different look on each side, with your own picture, banner and wallpaper.
- Game badges: Overwatch, Minecraft, Roblox, chess and more, next to your name for everyone with BelleCord.
- Noise suppression: my own, on Fluxer (the 🎙 button at the top).
- Streams between Fluxer and Discord in a bridged call: going live on Discord can show on Fluxer too (the share box
  asks), and Fluxer streams get a Watch button under Discord's call buttons. You can set it up on your own bridge too:
  BridgeCord does it by itself, and friends on other computers get their own link with `b!stream`.
- Chess with friends on Fluxer and Discord.
- Your bridge bot: join your own Fluxer community and Discord server into one. BridgeCord comes with the app.
- Sharing a computer: everyone gets their own sign-ins and their own BelleCord, one click to swap.
- A tutorial, and a tour for every big update.
- Works with a keyboard and a screen reader: focus you can see, buttons that say what they do, and less motion
  when your computer asks for it.

## Getting it

1. Download BelleCord.zip from the [latest release](../../releases/latest) and unzip it somewhere it won't get moved.
2. Install [Node.js](https://nodejs.org) (the LTS version).
3. Start it: `START (Windows).bat`, `START (Mac).command` (right-click > Open the first time) or `START (Linux).sh`.

The first start takes a few minutes. After that, updates show up as an Update button in the app.

More in `READ ME FIRST.txt`.

## Credits

Made by me, Belle ([preferabelle](https://github.com/preferabelle)).

Dialogue, Theme studio and animations were completely made with AI, as well as the integration of making BelleCord an app anyone can use.

The bridge bot, BridgeCord, is built on Fluxcord by Jb Carreon, used under the MIT License.

Noise suppression uses DeepFilterNet 3 by Hendrik Schroeter (MIT or Apache 2.0), in the web build made by MezonAI.
Streams use livekit-client by LiveKit (Apache 2.0). Their licenses are in `app/noise/` and
`app/livekit-client.LICENSE.txt`.

## License

MIT. See `LICENSE`.
