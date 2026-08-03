# Jellyfin Keyboard Navigation — Command Reference

A Tampermonkey/Violentmonkey userscript that lets you control Jellyfin entirely by typing. Start typing anywhere in the web UI (not while a video is playing, not while a real input field is focused) and press **Enter** to run a command, **Backspace** to edit, **Escape** to clear.

Examples below use well-known, currently popular titles (movies like *Oppenheimer*, *Dune*, *Barbie*; shows like *Stranger Things*, *The Bear*, *Breaking Bad*) rather than titles with their own keyboard aliases, so the examples show the parsing rules cleanly.

---

## 1. Core concepts — read this first

### Scope tags used below
- **`[current page]`** — only does something on the right kind of page you're already on
- **`[remote]`** — works from anywhere; resolves the target and jumps to it first
- **`[both]`** — works either way

### The universal execution order
When you combine several modifiers in one line, they run in this fixed order — **regardless of the order you typed them in**:
```
target → filter → view → sort → reset → play/shuffle/trailer/next-up/watched/favorite/submenu → letter
```
```
stranger things sort name view banner letter s
letter s stranger things sort name view banner        ← identical result
```

### Order-free vs. order-fixed vs. order-critical
Most two-part commands are **order-free** (`titanic play` = `play titanic`). Some are **order-fixed** (word A must always come before word B, or nothing matches). And a few pairs are **order-critical**: **both orders are valid commands, but they mean two different things** — swapping the words sends you somewhere else entirely. This is the single easiest mistake to make, so it gets its own callout:

> ⚠️ **`movies fav` ≠ `fav movies`**
> - `movies fav` — library word first → jumps to the **Movies library's own "Favorites" tab** (inside `movies.html`)
> - `fav movies` — favourite word first → jumps to the **global Favourites page's "Movies" section** (inside `home.html`'s Favourites view)
>
> Same two words, both valid, two completely different destinations. This applies to every Favourites/library-tab combination (`tvshows fav` vs `fav shows`, etc.) — see §2 for the full breakdown.

### The universal fallback pattern
A handful of *bare* words are **overloaded**: they could be a page-navigation action, or the start of a movie/show title. The script always tries the navigation action first, and only falls back to a title/folder search if that action isn't currently available on the page you're on:

| Bare word | Tries first | Falls back to | Force the action | Force the title search |
|---|---|---|---|---|
| `M` | click letter **M** in the visible A–Z picker | search title/folder "M" | `letter M` | `movie M` |
| `up` | scroll up (if the page has scrollable content) | search title/folder "Up" | `page up` | `movie up` |
| `next` | click the next-page arrow (if enabled) | search title/folder "Next" | `page next` | `movie next` |
| `65` | scroll to 65% of the page (if scrollable) | search title/folder "65" | `page 65` | `movie 65` |

Prefixing with `page` always forces the navigation action; prefixing with a type word (`movie`, `tvshow`, `person`...) always forces a title/person search instead. This pattern shows up again and again below — once you know it, you know it everywhere.

### Play vs. Resume vs. Replay — what's actually different
- **On a movie or episode directly**: two distinct player states exist. **Play** and **Resume** are the *same button* — Jellyfin shows "Resume" automatically if you have progress saved, otherwise "Play"; our script doesn't need to (and can't usefully) tell them apart, so `play` and `resume` do the exact same thing here. **Replay** is a genuinely separate button that forces playback from the beginning, ignoring any saved progress.
- **On a series, season, or collection**: there is no separate replay state at all — it's a playlist, not a single video. `play`, `resume`, and `replay` all do the same thing here (click the one visible Play button); only `shuffle` is meaningfully different.
- **Chapter/percent seeking** (`play titanic chapter 3`, `play titanic 50%`) only makes sense on a movie or episode directly — there's no chapter list for an entire series.

---

## 2. Navigating to a library — `[remote]` `Navigation`

Every library type has multiple trigger words (aliases) — any of them works interchangeably:

| Library | All trigger words |
|---|---|
| Movies | `movies`, `movie`, `film`, `films` |
| TV Shows | `shows`, `show`, `series`, `tvshow`, `tvshows`, `tv` |
| Live TV | `livetv`, `live`, `pvr`, `live tv` |
| Collections / Box Sets | `collections`, `collection`, `sets`, `set`, `boxsets`, `boxset` |
| Home Videos | `homevideos`, `homevideo`, `home videos`, `home video` |
| Music | `music`, `songs` |

Also works with the library's own custom name from your server, if renamed. Any Movies or TV Shows alias specifically lands you on that library's **own first tab** ("Movies" / "Shows") — enforced explicitly by the script, not just left to chance:
```
movies          film            movie           films        ← all four, identical result
tvshows         tv              series           show         ← all four, identical result
pvr             live tv         livetv                        ← all three, identical result
boxset          sets            collection                    ← all three, identical result
```

### Library tabs — `[both]` `Navigation`, order-fixed (library word first)
Any alias from the table above works as the library word here, exactly like in bare navigation:
```
movies suggestions          film suggestions            ← identical
tv upcoming                 tvshows upcoming             ← identical
movies genre comedy         (jump straight into one genre section)
```

**movies**: `movies` (self, any alias), `suggestions`/`suggestion`, `trailers`/`trailer`, `favorites`/`favourites`/`favourite`/`favorite`/`fav`, `collections`/`collection`/`sets`/`set`/`boxsets`/`boxset`, `genre`/`genres`
**tvshows**: `shows`/`show`/`tvshows`/`tvshow` (self, any alias), `suggestions`/`suggestion`, `upcoming`, `genre`/`genres`, `tv networks`/`tv network`/`networks`/`network`/`studios`/`studio`, `episodes`/`episode`
**livetv**: `programs`/`program`, `guide`, `channels`, `recordings`, `schedule`, `series`

If you're **already inside** the right library, the library word can be dropped — `[current page]` instead:
```
genres              (already in Movies or TVShows → switches to that library's own Genres tab)
suggestions          upcoming          tv networks     ← same idea for any tab word
```

### Genre overview screen — `[current page]` special priority, an explicit exception
While the "Genres" tab itself is open (the *list* of all genres, not a specific one yet), **any word matching a genre currently listed on screen wins priority over everything else** — including words that are normally reserved elsewhere, like `home` or `back`:
```
comedy or horror or drama...   → jumps into that genre, if it's listed
home                            → no genre is named "home" → falls through to normal Home navigation
```
This is a deliberate exception carved out specifically for this one screen — nowhere else does a title/genre match outrank a reserved word this way.

### Home / Favourites — `[both]` `Navigation`
```
home
favourites   favorites   favourite   favorite   fav        ← all five, identical result
fav movies    fav shows    fav episodes    fav people    fav collections    fav videos
                                                             (Favourites page's own sub-sections)
```

**Force-jump to the global Favourites page**, order-free, regardless of where you currently are or what "fav" would normally resolve to in your current library context:
```
home fav        fav home        home favourite        favourites home        ← all equivalent
```
See the order-critical callout in §1 — this force-jump exists *specifically* because `movies fav` and `fav movies` otherwise lead to two different places, and this gives you an explicit, unambiguous way to reach the global page from inside a library.

---

## 3. Finding media — `[remote]` `Navigation`

```
oppenheimer
oppenheimer 2023
dune
the bear
```

### Automatic title parsing
Tried in order: exact title → title with a trailing bracketed group stripped (`predator` finds *"Predator (Ultimate Hunter Edition)"*) → title cut off at a subtitle separator (`: `, ` - `, ` – `, ` — `; `blade runner` finds *"Blade Runner: The Final Cut"*). A trailing 4-digit number is tried both as part of the title and as a release-year filter (`dune 2021` vs. a hypothetical movie literally titled "Dune 2021").

### Season / Episode — `[remote]` `Navigation`
```
stranger things season 4
stranger things s4
stranger things s4e1              (colon optional: s4:e1)
stranger things specials          (= season 0)
```
Numbers accept 1–2 digits with an optional leading zero (`s4` = `s04`).

### Context shortcuts — `[current page]` `Navigation`, while already inside a series/season/episode
```
s4                    season 4                ← identical, while inside a show
e1                    episode 1                ← identical, while inside a season
s4e1
```

---

## 4. Collections — `[remote]` `Navigation`, order-fixed (title, then collection word)
```
john wick collection
alien anthology
```
Recognized collection-suffix words (multilingual): `collection`, `filmreihe`, `anthology`, `saga`, `set`, and equivalents in Portuguese, Spanish, Dutch, Italian, Polish, Czech, Slovak, Croatian, Slovenian, Romanian, Hungarian, Finnish, Scandinavian, and Turkish.

---

## 5. People — `[remote]` `Navigation`, order-free between the person word and the media-type word
```
person cillian murphy                    (his profile page)
movies persons cillian murphy            (his movies)
persons movies cillian murphy            ← identical, order-free
tvshows actors cillian murphy            (his TV appearances)
episode actors cillian murphy            (his individual episode appearances)
```
**Person triggers**: `person`, `persons`, `actor`, `actors`, `actress`, `actresses`, `people`, `peoples`, `celebrity`, `celeb`
**Media-type triggers**: `movie`/`movies`/`film`/`films`, `tvshow`/`tvshows`/`series`/`show`/`shows`/`tv`, `episode`/`episodes`
Every person word combines with every media-type word, in either order — that's 10 × 7 = 70 valid two-word combinations for this alone.

---

## 6. Tags, genres, studios — direct cross-library jump — `[remote]` `Navigation`, order-fixed (type word first)
```
tag based on true events
genre horror
studio a24
```
These jump to a cross-library list independent of which library the tag/genre/studio "belongs" to — unlike `movies genre horror` (§2), which stays scoped to one library's own genre tab.

### Random picks — `[remote]` `Navigation`
```
random
random movie      random show      random collection
```
Picks one random item of the given type(s) (all three combined if no type given) and jumps to it.

**Nested random** — currently implemented only for collections, and only combined with `play`. A plain random pick landing on a collection normally plays that collection's *first* movie; typing `random` twice picks a random movie **within** it instead:
```
play random random                  (if it lands on a collection, plays a random movie from inside it)
play random collection random       (same idea, forced to only ever pick among collections)
```
There's no TV-show equivalent yet (no "random show, then random episode within it") — a random show pick always plays its first episode.

---

## 7. Playing — `Navigation + Action`, `[both]`, order-free
```
play oppenheimer
oppenheimer play                        ← identical, order-free
resume oppenheimer                      (same as play — see §1)
replay oppenheimer                      (forces restart from the beginning — see §1)
shuffle                                 (Collection- TvShow- Season-Level, Libary Views (Movies, TvShows) & List Views (Tags, Genres, ..) not on Movies or Episodes)
```
`play`/`replay`/`resume`/`shuffle` work as prefix *or* suffix on almost any target, including context shortcuts:
```
stranger things season 4 play
s4 play                                 (while already inside the show)
```
On series/season/collections this clicks the visible Play/Shuffle button (there is no separate Replay state there — see §1). On movies/episodes it plays directly, distinguishing Resume/Play from Replay.

### Chapter & percent seeking — `[both]`, movies/episodes only
```
play oppenheimer chapter 3              (chapter number, count)
play oppenheimer 0%                     (% is optional, literally the same as forced replay)
play oppenheimer 50%                    (% is optional, counted half of video, everything betwen 0-100 possible)
play oppenheimer 100%                   (% is optional, 100% falls back to 99%)
play stranger things s4e1 chapter 2     (chapter number, count)
play stranger things s4e1 chaptername   (some videos includes real chapter names in Metadata)
play chapter 3                          (bare — seeks in the movie/episode you're already on)
```

### Trailer — `[both]`, order-free, position-free
`play` and `trailer` are two independent, freely-placeable words — every arrangement below is valid and identical:
```
play trailer oppenheimer
oppenheimer play trailer
trailer play oppenheimer
oppenheimer trailer play
play oppenheimer trailer
trailer oppenheimer play
trailer / play trailer / trailer play    (bare, current page)
```
Works on movies, series, seasons, collections — not individual episodes.

### Next Up — `[both]`, order-free, position-free (same pattern as Trailer)
```
next up                                 (bare — jumps to the Next Up episode on the series page you're on)
play next up                            (plays it directly instead of just opening it)
the bear next up                        (remote — jump to a series' Next Up episode first)
play the bear next up        play next up the bear        the bear play next up        ← all equivalent
```
Only works if the series actually shows a Next Up tile on its own page.

---

## 8. Filter — `[both]` `Action`
```
filter <category> <value> <category> <value> ...
```
`[current page]` wherever a filter button is already visible (including the genre-overview screen, §2); `[remote]` otherwise — navigates to the matching library first.

| Category word(s) | Filters |
|---|---|
| `genre` / `genres` | Genre |
| `year` / `years` | Production year |
| `tag` / `tags` | Tag |
| `rating` / `ratings` | Parental rating |
| `feature` / `features` | see below |
| `video type` / `video types` | see below |
| `filter` / `filters` | see below |

**`filter` values**: `played`, `unplayed`, `resumable`/`continue`/`continue watching`, `favorite`/`favorites`/`favourite`/`favourites`/`fav`
**`feature` values**: `subtitle`/`subtitles`, `trailer`/`trailers`, `special feature`/`special features`/`extra`/`extras`, `theme song`/`theme songs`, `theme video`/`theme videos`
**`video type` values**: `hd`, `sd`, `4k`, `3d`, `bd`/`bluray`/`blu-ray`, `dvd`

```
filter genre horror year 2023
movies filter genre comedy
tag a24 films filter feature trailer
```

### Reset — `[both]`
```
reset filters
movies reset filters
reset filters rating pg-13              (removes only that one filter, keeps the rest)
```

---

## 9. Sort — `[both]` `Action`
```
sort <sort-by> <order>
```
Auto-detects the right mechanism: radio dialog on movies/tvshows, dropdown on list views, and a **third, narrower** dialog specifically on the Collections tab within Movies — handled transparently, see §10 for why it needs special handling.

**Order**: `ascending`, `descending`
**Everywhere**: `name`, `community rating`/`communityrating`, `date added`/`dateadded`, `date played`/`dateplayed`, `parental rating`/`parentalrating`, `release date`/`releasedate`
**Movies only**: `critics rating`/`criticsrating`, `play count`/`playcount`, `runtime`, `random`
**TVShows only**: `date episode added`/`dateepisodeadded`
**List views only**: `folders`
**Collections tab specifically**: only `name`, `community rating`, `date added`, `parental rating`, `release date` exist there — the others simply don't apply.

```
sort name
sort community rating descending
sort ascending                          (order only, keeps current sort-by)
```

### View — `[both]` `Action`
```
view <value(s)>
```
**Movies/TVShows**: `banner`, `list`, `poster`, `poster card`/`postercard`, `thumb`, `thumb card`/`thumbcard`
**List views**: `primary`, `banner`, `disc`, `logo`, `thumb`, `list`, plus `show title`/`show the title` (checkbox, combinable: `view primary show title`)

---

10. Watched / Favorite — `[both]` `Action`

Watched — 23 fixed phrasings
```
watched
mark watched              mark as watched
played                    mark played              mark as played
set watched               unset watched
set as watched             unset from watched
set played                 unset played              unset as played
unmark from watched
set to watched              set to unwatched
set to unplayed
set unplayed
mark unwatched               mark as unwatched
mark unplayed
unplayed
toggle watched
```
Favorite — 75 generated phrasings (15 sentence patterns × 5 spellings)
Patterns: `add to` / `add` / `delete from` / `delete` / `mark as` / `mark` / `set to` / `set` / `unmark from` / `unmark` / `unset from` / `unset` / `remove from` / `remove` / `toggle`
Spellings: `favorite` / `favourite` / `favorites` / `favourites` / `fav`
Every pattern combines with every spelling — e.g. the `add to` pattern alone gives you:
```
add to favorite        add to favourite
add to favorites        add to favourites
add to fav
```
...and the same five-spelling set repeats for all 14 other patterns (`add`, `delete from`, `delete`, `mark as`, `mark`, `set to`, `set`, `unmark from`, `unmark`, `unset from`, `unset`, `remove from`, `remove`, `toggle`).
---
Both work bare (current page), as a remote prefix (`watched oppenheimer`), and as a remote suffix (`oppenheimer watched`).

### Submenu actions — `[both]` `Action`
```
download                   download all             (startsWith match — catches "Download All" on series/seasons too)
add to collection           addtocollection
add to playlist             addtoplaylist
copy stream url             copystreamurl
edit metadata                editmetadata
edit images                  editimages
edit subtitles                editsubtitles
identify
media info                    mediainfo
refresh metadata               refreshmetadata
share
delete
```
Every entry works spaced or squashed-together, bare, as remote prefix, or remote suffix:
```
oppenheimer download
download stranger things s4e1
```

---

## 11. A–Z letter picker — `[both]`
```
a                                        (bare — see the fallback table in §1)
letter a          letter #
tag a24 films letter s                   (combinable, always runs last regardless of typed position)
```

---

## 12. Pagination between library pages — `[both]` `Action`
`page`/`pages` are interchangeable everywhere in this section.
```
next page          page next          forward page          page forward         ← all four, identical
previous page       page previous       prev page             page prev
back page            page back                                                    (see §14 — "back" alone is different)
page first            first page          (click "previous" repeatedly until disabled)
page last              last page           (click "next" repeatedly until disabled)
```

### Multiple jumps at once
Number (1–99) and direction word in either order, `page`/`pages` optional:
```
next 3           3 next            page next 3          3 pages next          ← all four, identical
prev 5            5 prev            pages prev 2           2 pages prev
```
Clicks the arrow repeatedly (500ms apart) and stops early if it hits the end — no error either way.

Bare `next`/`forward`/`prev`/`previous` (no number, no "page"): see the fallback table in §1 — tries the arrow first, falls back to a title/folder search.

---

## 13. Scrolling within a page — `[both]` `Action`
```
page top       top page       page bottom       bottom page       page down       down page       page up       up page
page 50          page 50%                                                          (% optional)
```
Bare `top`/`bottom`/`down`/`up`/a bare percentage: see the fallback table in §1.

### Multiple scroll-screens at once
```
34 down           down 21           12 pages down           pages down 7          ← all four, identical
```
One jump, multiplied — pure client-side scrolling, no waiting between jumps needed (unlike page-to-page navigation in §12).

### Auto-scroll — `[both]`, keeps running until stopped, independent of anything else you type meanwhile
```
scroll                                   (starts at medium speed)
scroll slow        scroll slower        slow scroll        slower scroll         ← all four, identical
scroll fast          scroll faster        fast scroll         faster scroll        ← all four, identical
scroll delay 5                           (pause in seconds before restarting at the top; default 0 — only sets the value, doesn't start scrolling by itself)
stop        stop scroll        scroll stop                                        ← all three, identical
```

---

## 14. Miscellaneous — `[current page]` unless noted
```
search alien          find alien
reload         refresh         reset
back                                      (browser back — distinct from "back page"/"page back" in §12, which page-navigates instead)
fullscreen
window        windowed
```

---

## 15. Exceptions, overrides, and bugs fixed along the way

These are deliberate, specific carve-outs discovered and built during development — worth knowing about if something behaves "too cleverly."

**Genre-overview priority override** (§2): the one screen where a plain word can outrank reserved words like `home`/`back`/`movies`, because the check is a fast, local, on-screen DOM lookup rather than a network call — so it can afford to run first, safely.

**`movies`/`tvshows` force an explicit tab click, not just a fresh page load**: typing `movies` used to sometimes land you on whatever tab Jellyfin remembered you'd last visited (including "Genres") instead of the "Movies" tab itself. The script now explicitly clicks the "Movies"/"Shows" tab after navigating, rather than trusting the page's own default.

**Stale/duplicate DOM elements**: several buttons (pagination arrows, filter-dialog close button, A–Z letter buttons) can briefly exist twice in the page — one live, one a leftover from just before a transition. Every click in this script scans *all* matches and picks the first genuinely visible, enabled one, instead of blindly taking the first element found.

**Collections tab has its own Sort dialog**: sorting inside the Movies → Collections tab uses different underlying values than the regular Movies sort dialog (e.g. `CommunityRating,SortName` instead of `CommunityRating,SortName,ProductionYear`) — detected automatically by which tab is currently active.

**Keyboard capture phase**: the script listens for keystrokes in the capture phase rather than the default bubble phase, so it reliably receives input even on pages where Jellyfin's own components might otherwise intercept it first.

**`played`/`unplayed` vs. the Filter feature**: since `filter` always claims everything after it as filter values, words like `played` are safely available both as a filter value (`filter played`) *and* as a standalone watched-toggle (`played oppenheimer`) without colliding — filter parsing always runs before action-word parsing.

**Folder names that collide with a feature word**: if a folder (in Home Videos/Photos) happens to be named the same as a trigger word — e.g. a folder literally called "Images Persons" — the script tries a matching folder/photo-album on your *current* page **before** falling back to the word's usual meaning (like a person search).
