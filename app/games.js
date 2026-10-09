// The games that can have a badge: what each profile has (account, rank, main, stats). Overwatch and the two
// chess sites fill in live from their free public stats; the rest are filled in by hand.
(function () {
  "use strict";
  const T = (s) => s.split("|");
  const GAMES = [
    { key: "overwatch", name: "Overwatch", glyph: "OW", color: "#f99e1a", handle: "BattleTag", hint: "Name#1234", live: "overwatch",
      ranks: T("Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Champion|Top 500"), roles: T("Tank|Damage|Support"), mainLabel: "Main hero",
      mains: T("Ana|Ashe|Baptiste|Bastion|Brigitte|Cassidy|D.Va|Doomfist|Echo|Freja|Genji|Hanzo|Hazard|Illari|Junker Queen|Junkrat|Juno|Kiriko|Lifeweaver|Lúcio|Mauga|Mei|Mercy|Moira|Orisa|Pharah|Ramattra|Reaper|Reinhardt|Roadhog|Sigma|Sojourn|Soldier: 76|Sombra|Symmetra|Torbjörn|Tracer|Venture|Widowmaker|Winston|Wrecking Ball|Zarya|Zenyatta"),
      stats: T("Win rate|KDA|Games|Time played") },
    { key: "valorant", name: "Valorant", glyph: "VAL", color: "#ff4655", handle: "Riot ID", hint: "Name#TAG",
      ranks: T("Iron|Bronze|Silver|Gold|Platinum|Diamond|Ascendant|Immortal|Radiant"), mainLabel: "Main agent",
      mains: T("Astra|Breach|Brimstone|Chamber|Clove|Cypher|Deadlock|Fade|Gekko|Harbor|Iso|Jett|KAY/O|Killjoy|Neon|Omen|Phoenix|Raze|Reyna|Sage|Skye|Sova|Tejo|Viper|Vyse|Waylay|Yoru"),
      stats: T("Win rate|K/D|Headshot %|Peak rank") },
    { key: "league", name: "League of Legends", glyph: "LoL", color: "#c89b3c", handle: "Riot ID", hint: "Name#TAG",
      ranks: T("Iron|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Master|Grandmaster|Challenger"), roles: T("Top|Jungle|Mid|Bot|Support"), mainLabel: "Main champion",
      stats: T("Win rate|KDA|LP|Mastery") },
    { key: "cs2", name: "Counter-Strike 2", glyph: "CS2", color: "#de9b35", handle: "Steam name", hint: "Your Steam name",
      ranks: T("Premier <5k|Premier 5k|Premier 10k|Premier 15k|Premier 20k|Premier 25k|Premier 30k+|Faceit 1|Faceit 2|Faceit 3|Faceit 4|Faceit 5|Faceit 6|Faceit 7|Faceit 8|Faceit 9|Faceit 10"), mainLabel: "Main weapon",
      mains: T("AK-47|M4A4|M4A1-S|AWP|Desert Eagle|USP-S|Glock-18|SSG 08|MP9|MAC-10|Galil AR|FAMAS"),
      stats: T("Premier rating|K/D|Headshot %|Hours") },
    { key: "osu", name: "osu!", glyph: "osu!", color: "#ff66aa", handle: "osu! username", hint: "Your osu! name",
      ranks: T("osu!|osu!taiko|osu!catch|osu!mania"), rankLabel: "Mode", mainLabel: "Favorite map",
      stats: T("Global rank|pp|Accuracy|Play count") },
    { key: "fortnite", name: "Fortnite", glyph: "FN", color: "#9d4dbb", handle: "Epic name", hint: "Your Epic name",
      ranks: T("Bronze|Silver|Gold|Platinum|Diamond|Elite|Champion|Unreal"), mainLabel: "Favorite mode", mains: T("Battle Royale|Zero Build|Reload|Ballistic|OG|Creative|LEGO"),
      stats: T("Wins|K/D|Matches|Win rate") },
    { key: "apex", name: "Apex Legends", glyph: "APX", color: "#cd3333", handle: "EA name", hint: "Your EA name",
      ranks: T("Rookie|Bronze|Silver|Gold|Platinum|Diamond|Master|Apex Predator"), mainLabel: "Main legend",
      mains: T("Alter|Ash|Ballistic|Bangalore|Bloodhound|Catalyst|Caustic|Conduit|Crypto|Fuse|Gibraltar|Horizon|Lifeline|Loba|Mad Maggie|Mirage|Newcastle|Octane|Pathfinder|Rampart|Revenant|Seer|Sparrow|Valkyrie|Vantage|Wattson|Wraith"),
      stats: T("Kills|Damage|Wins|Level") },
    { key: "r6", name: "Rainbow Six Siege", glyph: "R6", color: "#4a6fd1", handle: "Ubisoft name", hint: "Your Ubisoft name",
      ranks: T("Copper|Bronze|Silver|Gold|Platinum|Emerald|Diamond|Champion"), mainLabel: "Main operator",
      stats: T("K/D|Win rate|Matches|Level") },
    { key: "rocketleague", name: "Rocket League", glyph: "RL", color: "#1c7cf4", handle: "Epic name", hint: "Your Epic name",
      ranks: T("Bronze|Silver|Gold|Platinum|Diamond|Champion|Grand Champion|Supersonic Legend"), mainLabel: "Main playlist", mains: T("1v1|2v2|3v3|Hoops|Rumble|Dropshot|Snow Day|Heatseeker"),
      stats: T("MMR|Wins|Goals|MVPs") },
    { key: "marvelrivals", name: "Marvel Rivals", glyph: "MR", color: "#e8b923", handle: "Player name", hint: "Your Marvel Rivals name",
      ranks: T("Bronze|Silver|Gold|Platinum|Diamond|Grandmaster|Celestial|Eternity|One Above All"), roles: T("Vanguard|Duelist|Strategist"), mainLabel: "Main hero",
      stats: T("Win rate|KDA|Matches|Hours") },
    { key: "dota2", name: "Dota 2", glyph: "D2", color: "#be2a1d", handle: "Steam name", hint: "Your Steam name",
      ranks: T("Herald|Guardian|Crusader|Archon|Legend|Ancient|Divine|Immortal"), roles: T("Carry|Mid|Offlane|Soft support|Hard support"), mainLabel: "Main hero",
      stats: T("MMR|Win rate|KDA|Matches") },
    { key: "minecraft", name: "Minecraft", glyph: "MC", color: "#5d9c3a", handle: "Minecraft name", hint: "Your Minecraft name",
      ranks: [], mainLabel: "Favorite mode", mains: T("Survival|Hardcore|Creative|Bedwars|Skywars|SkyBlock|Speedrun|PvP"),
      stats: T("Hours|Wins|Level|Server") },
    { key: "chess", name: "Chess.com", glyph: "♞", color: "#7fa650", handle: "Chess.com username", hint: "Your Chess.com name", live: "chess",
      ranks: [], mainLabel: "Favorite opening", stats: T("Rapid|Blitz|Bullet|Puzzles") },
    { key: "lichess", name: "Lichess", glyph: "♟", color: "#b0b0b0", handle: "Lichess username", hint: "Your Lichess name", live: "lichess",
      ranks: [], mainLabel: "Favorite opening", stats: T("Rapid|Blitz|Bullet|Classical") },
    { key: "roblox", name: "Roblox", glyph: "RBX", color: "#3b82f6", handle: "Roblox username", hint: "Your Roblox name",
      ranks: [], mainLabel: "Favorite game", stats: T("Hours|Favorite experience|Friends|Badges") },
  ];
  // ---- badge pictures: one small original picture per game (drawn here, white on the game's color) ----
  const S = (d) => '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  const ICONS = {
    overwatch: S('<circle cx="12" cy="12" r="7.5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><circle cx="12" cy="12" r="1.6" fill="#fff"/>'), // crosshair
    valorant: S('<path d="M5 19 16.5 7.5"/><path d="M14 4h6v6"/><path d="M8.5 13.5 5 17l2 2 3.5-3.5"/>'), // blade
    league: S('<path d="M4 4l9 9M4 4h3.5M4 4v3.5"/><path d="M20 4l-9 9M20 4h-3.5M20 4v3.5"/><path d="M8 16l-3 3M16 16l3 3M7 14l3 3M17 14l-3 3"/>'), // crossed swords
    cs2: S('<circle cx="11" cy="14" r="6"/><path d="M11 8V5.5h3.5"/><path d="M14.5 5.5 18 3"/><path d="M8.5 13.5h5"/>'), // grenade
    osu: S('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5" fill="#fff" stroke="none"/>'), // hit circle
    fortnite: S('<path d="M3 11a9 9 0 0 1 18 0z"/><path d="M12 11v8.5a2 2 0 0 1-4 0"/>'), // glider umbrella
    apex: S('<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6z"/><path d="M12 8.5v7M8.5 12h7"/>'), // shield + heal
    r6: S('<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7.5h8"/><path d="M12 11v6"/>'), // riot shield
    rocketleague: S('<circle cx="15" cy="12" r="5.5"/><path d="M2.5 8.5h5M1.5 12h5M2.5 15.5h5"/><path d="M12 8.5l6 7M18 8.5l-6 7"/>'), // ball on the move
    marvelrivals: S('<path d="M13.5 2.5 5 13.5h6l-1 8 8.5-11h-6z" fill="#fff"/>'), // lightning
    dota2: S('<path d="M4 18 3 7l5 4 4-6 4 6 5-4-1 11z"/><path d="M4 21h16"/>'), // crown
    minecraft: S('<path d="M4 5c5-3 11-3 16 0"/><path d="M12 4.5 9.5 21"/>'), // pickaxe
    chess: S('<circle cx="12" cy="6" r="2.8"/><path d="M9.5 11h5l1 6h-7z"/><path d="M7 20.5h10M8 17.5h8"/>'), // pawn
    lichess: S('<path d="M6 3.5h2.5v2h2.5v-2h2v2h2.5v-2H18V9l-2 1.5V17H8v-6.5L6 9z"/><path d="M5 20.5h14"/>'), // rook
    roblox: S('<rect x="3" y="12" width="9" height="8" rx="1"/><rect x="12" y="12" width="9" height="8" rx="1"/><rect x="7.5" y="4" width="9" height="8" rx="1"/><circle cx="7.5" cy="16" r="1" fill="#fff"/><circle cx="16.5" cy="16" r="1" fill="#fff"/><circle cx="12" cy="8" r="1" fill="#fff"/>'), // stacked bricks
  };
  const icon = (key) => ICONS[key] || "";

  const BY = Object.fromEntries(GAMES.map((g) => [g.key, g]));
  window.bcGames = { GAMES, BY, icon };
})();
