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
  ];
  const BY = Object.fromEntries(GAMES.map((g) => [g.key, g]));
  window.bcGames = { GAMES, BY };
})();
