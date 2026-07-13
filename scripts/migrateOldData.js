// One-off migration: old flat "people" export -> Noted's schema.
//
// Field mapping:
//   dateOfBirth              -> birthdate
//   isArchived                -> archived
//   likes / dislikes (blob)   -> likes / dislikes (array), best-effort split
//                                on commas/semicolons. Anything that couldn't
//                                be split cleanly is left as one array item
//                                AND the doc gets needsReview: true so it's
//                                easy to find and tidy up in-app afterwards.
//   likesColors/dislikesColors -> kept as legacyTagColors (unused by any UI
//                                right now, just preserved in case a colour-
//                                tag feature gets built later)
//   christmasHiddenThisYear,
//   christmasPresentBought,
//   lastChristmasSeasonYear   -> moved to occasions/{personId}/christmas-{year}
//                                (firestore.rules already reserves this path)
//   info                      -> carried over as-is (not read by any current
//                                UI, harmless to keep)
//   id, "Document ID"         -> dropped, the Firestore doc ID is the ID
//
// Run once via the "Migrate old data" GitHub Action (workflow_dispatch).
// Safe to re-run: uses set(..., {merge:false}) per person doc, so re-running
// just overwrites with the same transform rather than duplicating anything.

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// --- raw data, tab-separated, exactly as exported -------------------------
const RAW_TSV = `Document ID\tchristmasHiddenThisYear\tchristmasPresentBought\tdateOfBirth\tdislikes\tdislikesColors\tid\tinfo\tisArchived\tlastChristmasSeasonYear\tlikes\tlikesColors\tname
/people/107\tfalse\tfalse\t"1997-02-18"\t"portaloos"\t""\t107\t""\tfalse\t2026\t"music; lawrence, Boyce avenue gym, running lego walking/hiking"\t""\t"Matthew Jarvis"
/people/108\tfalse\tfalse\t"1997-03-10"\t""\t""\t108\t""\tfalse\t2026\t""\t""\t"Izzie King"
/people/109\tfalse\tfalse\t"1998-01-11"\t""\t""\t109\t""\tfalse\t2026\t""\t""\t"Jess Lambert"
/people/110\tfalse\tfalse\t"2020-01-18"\t""\t""\t110\t""\ttrue\t2025\t""\t""\t"Kirsty Brown"
/people/111\tfalse\tfalse\t"1997-01-18"\t""\t""\t111\t""\tfalse\t2026\t"photography hikes sentimental memories rugby and football musicals food over alcohol - loves experiences fezanda sorted food triple chocolate cookies lewis capaldi"\t"{}"\t"Matt Pindar"
/people/112\tfalse\tfalse\t"2006-02-13"\t""\t""\t112\t""\tfalse\t2026\t""\t""\t"Shelby Flockhart"
/people/113\tfalse\tfalse\t"2020-01-04"\t""\t""\t113\t""\tfalse\t2026\t"War of the worlds (musical not film)"\t"{"War of the worlds (musical not film)":"#1E8E3E"}"\t"Angela Blair"
/people/114\tfalse\tfalse\t"2020-03-20"\t""\t""\t114\t""\tfalse\t2026\t""\t""\t"Elsie Hannah"
/people/115\tfalse\tfalse\t"1948-03-24"\t""\t""\t115\t""\tfalse\t2026\t""\t""\t"Geoff Lambert"
/people/116\tfalse\tfalse\t"1973-03-25"\t""\t""\t116\t""\tfalse\t2026\t"Emma bridgewater sophie alport palma violet laura geller steel band"\t""\t"Kate Blair"
/people/117\tfalse\tfalse\t"1998-08-29"\t""\t""\t117\t""\tfalse\t2026\t"big foodie truffles steak white socks"\t""\t"Dan Blair"
/people/118\tfalse\tfalse\t"1972-09-21"\t""\t""\t118\t""\tfalse\t2026\t"Ferrero rocher sausage rolls"\t""\t"Stuart Blair"
/people/119\tfalse\tfalse\t"2009-09-30"\t""\t""\t119\t""\tfalse\t2026\t""\t""\t"Noah Blair"
/people/120\tfalse\tfalse\t"1989-11-17"\t""\t""\t120\t""\tfalse\t2026\t""\t""\t"Fay Benson"
/people/121\tfalse\tfalse\t"1998-11-28"\t"Beans anniseed"\t""\t121\t""\tfalse\t2026\t"F1 - piastri supporter Lego Raye musicion baking music walks her fiat 500 makeup - deer sephora gin margaritas lost cherry perfume Coffee high end gift set trial peoducts jelly brains gifts ceramic painting?? hanz zimmer music music - raye, sabrina carpenter, dua lipa, mumford and sons, Lumineers, coldplay, musicals (any), sam fender dauschunds elizabeth scarlett 101 dalmations test"\t"{"test":"#1E8E3E"}"\t"Kerry Hannah"
/people/122\tfalse\tfalse\t"1996-11-29"\t""\t""\t122\t""\tfalse\t2026\t"golf d&d mythos beer"\t""\t"Sam Eccleston"
/people/123\tfalse\tfalse\t"2020-12-15"\t""\t""\t123\t""\tfalse\t2026\t""\t""\t"Mary Lambert"
/people/124\tfalse\tfalse\t"1974-12-16"\t""\t""\t124\t""\tfalse\t2026\t""\t""\t"Tracy Mellors"
/people/125\tfalse\tfalse\t"1980-12-17"\t""\t""\t125\t""\tfalse\t2026\t""\t""\t"Chris Flockhart"
/people/126\tfalse\tfalse\t"1947-12-26"\t""\t""\t126\t""\tfalse\t2026\t""\t""\t"Helen Blair"
/people/127\tfalse\tfalse\t"1996-08-21"\t"scared of pigeons"\t""\t127\t""\tfalse\t2026\t""\t""\t"Amy Beaumont"
/people/128\tfalse\tfalse\t"2022-07-23"\t""\t""\t128\t""\ttrue\t2026\t""\t""\t"Sam and Kerry anniversary"
/people/129\tfalse\tfalse\t"2020-07-28"\t""\t""\t129\t""\tfalse\t2026\t""\t""\t"Laura Frederickson"
/people/130\tfalse\tfalse\t"2020-07-14"\t""\t""\t130\t""\tfalse\t2026\t""\t""\t"Stephen Morgan"
/people/131\tfalse\tfalse\t"1975-06-03"\t""\t""\t131\t""\tfalse\t2026\t""\t""\t"Kerry Lambert"
/people/132\tfalse\tfalse\t"1997-06-11"\t""\t""\t132\t""\tfalse\t2026\t""\t""\t"Ash Cowley"
/people/133\tfalse\tfalse\t"1964-06-11"\t"chocolate wine"\t""\t133\t""\tfalse\t2026\t"heart wrenching films (angela's ashes)"\t""\t"Mandy Hannah"
/people/134\tfalse\tfalse\t"1946-06-20"\t""\t""\t134\t""\tfalse\t2026\t""\t""\t"Trevor Blair"
/people/135\tfalse\tfalse\t"2020-06-23"\t""\t""\t135\t""\ttrue\t2025\t""\t""\t"Pam Hallam"
/people/136\tfalse\tfalse\t"1986-04-04"\t""\t""\t136\t""\tfalse\t2026\t""\t""\t"Amy Lambert-Flockhart"
/people/137\tfalse\tfalse\t"1997-04-05"\t""\t""\t137\t""\tfalse\t2026\t"disco ball dressing up fancy dreSS neon orange/pink oasis lionell lol"\t"{"lol":"#1E8E3E"}"\t"Abbi Foster"
/people/138\tfalse\tfalse\t"2020-04-26"\t""\t""\t138\t""\tfalse\t2026\t""\t""\t"Ali Jo"
/people/139\tfalse\tfalse\t"1996-05-06"\t""\t""\t139\t""\tfalse\t2026\t""\t""\t"James Grant"
/people/140\tfalse\tfalse\t"1997-05-14"\t""\t""\t140\t""\tfalse\t2026\t"friends musicals jazz new girl puzzles lego"\t""\t"Olivia Walker"
/people/141\tfalse\tfalse\t"2020-05-23"\t""\t""\t141\t""\tfalse\t2026\t""\t""\t"Sophie Borill"
/people/142\tfalse\tfalse\t"1980-05-23"\t""\t""\t142\t""\tfalse\t2026\t""\t""\t"Stephen Benson"
/people/143\tfalse\tfalse\t"2022-11-06"\t""\t""\t143\t""\ttrue\t2026\t""\t""\t"John and Steph's Anniversary"
/people/144\tfalse\tfalse\t"2003-01-18"\t""\t""\t144\t""\tfalse\t2026\t""\t""\t"Jack Hannah"
/people/145\tfalse\tfalse\t"1989-02-24"\t""\t""\t145\t""\tfalse\t2026\t"Turkish delight"\t""\t"John Hannah"
/people/146\tfalse\tfalse\t"1997-03-30"\t""\t""\t146\t""\tfalse\t2026\t""\t""\t"Jacob Parkes"
/people/147\tfalse\tfalse\t"1999-04-02"\t""\t""\t147\t""\tfalse\t2026\t""\t""\t"Innes Orr"
/people/148\tfalse\tfalse\t"1997-05-12"\t""\t""\t148\t""\tfalse\t2026\t""\t""\t"Imogen Blackburn"
/people/149\tfalse\tfalse\t"2022-10-08"\t""\t""\t149\t""\ttrue\t2026\t""\t""\t"Odette and Hamish' anniversary"
/people/150\tfalse\tfalse\t"1972-05-18"\t""\t""\t150\t""\tfalse\t2026\t""\t""\t"Ian Palmer"
/people/151\tfalse\tfalse\t"2023-07-30"\t""\t""\t151\t""\ttrue\t2026\t""\t""\t"Fay and Steve anniversary"
/people/152\tfalse\tfalse\t"2007-08-19"\t""\t""\t152\t""\tfalse\t2026\t""\t""\t"Charlie Flockhart"
/people/153\tfalse\tfalse\t"1995-09-16"\t""\t""\t153\t""\tfalse\t2026\t""\t""\t"Kate and Stuart's Anniversary"
/people/154\tfalse\tfalse\t"2020-11-22"\t""\t""\t154\t""\ttrue\t2026\t""\t""\t"Matt and Liv anniversary"
/people/155\tfalse\tfalse\t"2005-10-10"\t""\t""\t155\t""\tfalse\t2026\t""\t""\t"Callum Blair"
/people/156\tfalse\tfalse\t"2019-12-26"\t""\t""\t156\t""\tfalse\t2026\t""\t""\t"Robin Benson"
/people/157\tfalse\tfalse\t"2017-11-30"\t""\t""\t157\t""\tfalse\t2026\t""\t""\t"Layland Benson"
/people/158\tfalse\tfalse\t"2008-08-28"\t""\t""\t158\t""\tfalse\t2026\t""\t""\t"Emily Lambert"
/people/159\tfalse\tfalse\t"2023-07-07"\t""\t""\t159\t""\ttrue\t2026\t""\t""\t"Nanna and grandpa anniversary"
/people/160\tfalse\tfalse\t"1977-07-21"\t""\t""\t160\t""\tfalse\t2026\t""\t""\t"Scott Blair"
/people/161\tfalse\tfalse\t"1962-06-23"\t""\t""\t161\t""\tfalse\t2026\t""\t""\t"Trish Lambert"
/people/162\tfalse\tfalse\t"2018-05-10"\t""\t""\t162\t""\tfalse\t2026\t""\t""\t"Lucy Flockhart"
/people/163\tfalse\tfalse\t"2010-04-20"\t""\t""\t163\t""\tfalse\t2026\t""\t""\t"Gracie Flockhart"
/people/164\tfalse\tfalse\t"2012-04-14"\t""\t""\t164\t""\tfalse\t2026\t""\t""\t"Bentley Flockhart"
/people/165\tfalse\tfalse\t"2002-04-02"\t""\t""\t165\t""\tfalse\t2026\t""\t""\t"Thomas Mellors"
/people/166\tfalse\tfalse\t"2007-02-07"\t""\t""\t166\t""\tfalse\t2026\t""\t""\t"Lucas Blair"
/people/167\tfalse\tfalse\t"1994-01-09"\t""\t""\t167\t"Went to amsterdam for his stag, enjoys football, physio"\tfalse\t2026\t"heniekan - went to Amsterdam for his stag"\t""\t"Dan Sweeting"
/people/168\tfalse\tfalse\t"1991-01-24"\t""\t""\t168\t"paddle boarding"\tfalse\t2026\t"gym baking her pets running"\t"{"running":"#1E8E3E"}"\t"Sam Watkins"
/people/169\tfalse\tfalse\t"1996-02-20"\t""\t""\t169\t""\ttrue\t2025\t""\t""\t"Emma Varley"
/people/170\tfalse\tfalse\t"1999-03-06"\t""\t""\t170\t""\tfalse\t2026\t"Whippets vegetarian netball crafting vintage clothes charity shops/car boots favourite cake: carrot cake"\t"{"favourite cake: carrot cake":"#1E8E3E"}"\t"Alannah Friend"
/people/171\tfalse\tfalse\t"2024-07-10"\t""\t""\t171\t""\tfalse\t2026\t""\t""\t"Lillie Scott"
/people/172\tfalse\tfalse\t"2002-03-10"\t""\t""\t172\t""\tfalse\t2026\t"gold jewellery eatily"\t""\t"Millie Whitlock"
/people/173\tfalse\tfalse\t"2024-04-05"\t""\t""\t173\t""\tfalse\t2026\t""\t""\t"Stephanie Hannah"
/people/174\tfalse\tfalse\t"1994-04-22"\t""\t""\t174\t""\tfalse\t2026\t""\t""\t"Eden Marrison"
/people/175\tfalse\tfalse\t"2024-04-08"\t""\t""\t175\t""\tfalse\t2026\t""\t""\t"Mia Poppy Varley"
/people/176\tfalse\tfalse\t"1995-11-05"\t"dystopian novels"\t""\t176\t""\tfalse\t2026\t"sancerre wine reading - wuthering heights cheese safi test"\t"{"test":"#1E8E3E"}"\t"Al Askew"
/people/177\tfalse\tfalse\t"2020-03-20"\t""\t""\t177\t""\tfalse\t2026\t""\t""\t"Jade Pind-Addy"
/people/178\tfalse\tfalse\t"1996-11-15"\t"no alcohol (currently abstinant)"\t""\t178\t""\tfalse\t2026\t"her dog yellow sunflowers egg shaped chocolate"\t"{"egg shaped chocolate":"#1E8E3E"}"\t"Libby Richardson"
/people/179\tfalse\tfalse\t"2017-12-24"\t""\t""\t179\t""\tfalse\t2026\t"zelda Lego Star wars"\t""\t"Elliot Hannah"
/people/180\tfalse\tfalse\t"1998-06-09"\t""\t""\t180\t""\tfalse\t2026\t""\t""\t"Amy Mclackland"
/people/181\tfalse\tfalse\t"2002-06-12"\t"nut allergy"\t""\t181\t""\tfalse\t2026\t"coffee Traitors Reality tv"\t"{"coffee":"#1E8E3E","Traitors":"#1E8E3E","Reality tv":"#1E8E3E"}"\t"Katie Wilson"
/people/182\tfalse\tfalse\t"1996-06-14"\t""\t""\t182\t""\tfalse\t2026\t"the shining coke twirl orange?"\t""\t"Jade Webster"
/people/183\tfalse\tfalse\t"2024-12-03"\t""\t""\t183\t""\tfalse\t2026\t""\t""\t"Logan Benson"
/people/184\tfalse\tfalse\t"2025-09-14"\t""\t""\t184\t""\ttrue\t2026\t""\t""\t"Abbi and James anniversary"
/people/185\tfalse\tfalse\t"2023-03-29"\t""\t""\t185\t""\tfalse\t2026\t"Alfie Boe opera Singer"\t""\t"Sean Hannah"
/people/186\tfalse\tfalse\t"1998-08-08"\t""\t""\t186\t""\tfalse\t2026\t""\t""\t"Jack Mills"
/people/187\tfalse\tfalse\t"2024-06-02"\t""\t""\t187\t""\tfalse\t2026\t""\t""\t"Quinn Lambert"
/people/188\tfalse\tfalse\t"1996-09-07"\t""\t""\t188\t""\tfalse\t2026\t""\t""\t"Chloe Cossey"
/people/189\tfalse\tfalse\t"1985-03-13"\t""\t""\t189\t""\tfalse\t2026\t"mt Blanc ski jump run d&d"\t""\t"Andy Gordon"
/people/190\tfalse\tfalse\t"2025-09-30"\t""\t""\t190\t""\tfalse\t2026\t""\t""\t"Sean Diver"
/people/191\tfalse\tfalse\t"2022-06-20"\t""\t""\t191\t""\ttrue\t2025\t""\t""\t"Trevor Blair's birthday"
/people/192\tfalse\tfalse\t"2022-03-20"\t""\t""\t192\t""\ttrue\t0\t""\t""\t"Elsie Hannah's birthday"
/people/193\tfalse\tfalse\t"1995-10-23"\t""\t""\t193\t""\tfalse\t2026\t""\t""\t"Lucy Shaw"
/people/194\tfalse\tfalse\t"2026-01-07"\t""\t""\t194\t""\tfalse\t2026\t"misses black pudding tottenham golf crosswords ginger cake"\t""\t"Chris Young"
/people/195\tfalse\tfalse\t"1998-08-19"\t""\t""\t195\t""\tfalse\t2026\t"carlos sienz and f1 Violin test"\t"{"test":"#1E8E3E"}"\t"Ailsa pettigrew"
/people/196\tfalse\tfalse\t"2025-12-18"\t""\t""\t196\t""\ttrue\t0\t""\t""\t"Christmas?"
/people/197\tfalse\tfalse\t"1990-12-18"\t""\t""\t197\t""\tfalse\t2026\t""\t""\t"Jack Hughes"
/people/198\tfalse\tfalse\t"2025-11-12"\t""\t""\t198\t""\ttrue\t0\t""\t""\t"Ian rememberance"
/people/199\tfalse\tfalse\t"2025-09-13"\t""\t""\t199\t""\ttrue\t2025\t""\t""\t"Sean rememberance"
/people/200\tfalse\tfalse\t\t""\t""\t200\t""\tfalse\t2026\t"kinder bueno Metallica Tillie her daughter whisky wwe hunger games walking dead beauty and the beast - fave musical"\t"{"beauty and the beast - fave musical":"#1E8E3E"}"\t"Nicole Gray"
/people/201\tfalse\tfalse\t"1996-09-27"\t"marshmallow football most sports rollercoasters air pods (he uses android) velvet"\t""\t201\t""\tfalse\t2026\t"f1, wrestling, tech (smart home future), fitness (lifting and running), water sports, clothes from vinted back or minimal logo, hot chocolate,"\t""\t"Sam Blair"
/people/202\tfalse\tfalse\t\t""\t""\t202\t""\tfalse\t2026\t"laura saccord chocolate mints canada only lindt and orange liquer - discontinued?"\t""\t"Ros Pryor"
/people/203\tfalse\tfalse\t\t""\t""\t203\t""\tfalse\t2026\t"crocheting secret garden party"\t""\t"Sam Heuchan"
/people/204\tfalse\tfalse\t\t""\t""\t204\t""\ttrue\t2026\t""\t""\t"our anniversary"
/people/205\tfalse\tfalse\t"2025-12-28"\t""\t""\t205\t""\tfalse\t2026\t""\t""\t"Nic Lacy"
/people/206\t\t\t"2026-01-21"\t""\t""\t206\t""\ttrue\t\t""\t""\t"Test"`;

// --- parsing helpers --------------------------------------------------------

function unquote(v) {
  if (v === undefined) return "";
  const t = v.trim();
  if (t.startsWith('"') && t.endsWith('"')) return t.slice(1, -1);
  return t;
}

function toBool(v) {
  return v.trim().toLowerCase() === "true";
}

// Best-effort split: break on ; or , that separate distinct ideas. Leaves
// genuinely undelimited blobs as a single item. An item only gets flagged for
// review if it's a long, undelimited run of words (4+) - a short single word
// or phrase (e.g. "portaloos", "chocolate wine") is left alone as-is, since
// there's nothing useful to split there.
function splitBlob(raw) {
  const s = unquote(raw).trim();
  if (!s) return { items: [], flagged: false };
  const hadDelimiter = /[;,]/.test(s);
  const items = s
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean);
  const flagged = !hadDelimiter && items.some((item) => item.split(/\s+/).length >= 4);
  return { items, flagged };
}

function parseTsv(raw) {
  const lines = raw.split("\n");
  const header = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const cells = line.split("\t");
    const row = {};
    header.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

// --- main --------------------------------------------------------------------

async function migrate() {
  const rows = parseTsv(RAW_TSV);
  let written = 0;
  let flaggedForReview = 0;

  for (const row of rows) {
    const personId = row["Document ID"].replace("/people/", "").trim();
    if (!personId) continue;

    const name = unquote(row.name);
    const birthdate = unquote(row.dateOfBirth) || null;
    const archived = toBool(row.isArchived);
    const info = unquote(row.info);

    const likesSplit = splitBlob(row.likes);
    const dislikesSplit = splitBlob(row.dislikes);
    const needsReview = likesSplit.flagged || dislikesSplit.flagged;

    const likesColorsRaw = unquote(row.likesColors);
    const dislikesColorsRaw = unquote(row.dislikesColors);
    let legacyTagColors = null;
    try {
      const merged = {
        ...(likesColorsRaw ? JSON.parse(likesColorsRaw) : {}),
        ...(dislikesColorsRaw ? JSON.parse(dislikesColorsRaw) : {}),
      };
      if (Object.keys(merged).length) legacyTagColors = merged;
    } catch {
      // malformed colour map in the source data - skip rather than fail the whole migration
    }

    const personDoc = {
      name,
      birthdate,
      archived,
      likes: likesSplit.items,
      dislikes: dislikesSplit.items,
      ...(info ? { info } : {}),
      ...(legacyTagColors ? { legacyTagColors } : {}),
      ...(needsReview ? { needsReview: true } : {}),
    };

    await db.doc(`people/${personId}`).set(personDoc);
    written++;
    if (needsReview) flaggedForReview++;

    // Christmas tracking -> occasions/{personId}/christmas-{year}
    const year = row.lastChristmasSeasonYear ? row.lastChristmasSeasonYear.trim() : "";
    const hidden = toBool(row.christmasHiddenThisYear);
    const bought = toBool(row.christmasPresentBought);
    if (year && (hidden || bought)) {
      await db.doc(`occasions/${personId}/christmas-${year}`).set({
        hidden,
        bought,
      });
    }
  }

  console.log(`Migrated ${written} people. ${flaggedForReview} flagged with needsReview:true (undelimited likes/dislikes blobs to tidy up by hand).`);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
