# Jellyfin Keyboard Navigation — Command Reference

A Tampermonkey/Violentmonkey userscript that lets you control Jellyfin entirely by typing. Start typing anywhere in the web UI (not while a video is playing, not while a real input field is focused) and press **Enter** to run a command, **Backspace** to edit, **Escape** to clear.

Every example line below is annotated with: whether it's **bare** (current page only) or **remote** (jumps from anywhere), whether it **jumps** or **plays**, and — where a line is a variation of the one above — what exactly changed. Titles and actors are deliberately varied line by line rather than repeated, so you can see the breadth of a real library reflected throughout.

---

## 1. Core concepts — read this first

### Scope tags used below
- **`bare`** — only does something on the right kind of page you're already on
- **`remote`** — works from anywhere; resolves the target and jumps to it first

### The universal execution order
```
armageddon sort name view banner letter a          (remote · jump+sort+view+letter · baseline)
letter a armageddon sort name view banner            (remote · same result · only typed order changed)
sort name armageddon letter a view banner             (remote · same result · typed order changed again)
```
```
target → filter → view → sort → reset → play/shuffle/trailer/next-up/random/watched/favorite/submenu → letter
```

### Order-free vs. order-fixed vs. order-critical
> ⚠️ **`movies fav` ≠ `fav movies`**
> - `movies fav` (remote · jump) — library word first → the **Movies library's own "Favorites" tab**
> - `fav movies` (remote · jump) — favourite word first → the **global Favourites page's "Movies" section**
>
> Same two words, both valid, two completely different destinations. See §2.

### The universal fallback pattern
A handful of bare words are overloaded: page-navigation action first, title search as fallback. Real movie titles make this concrete:

| Bare word | Tries first | Falls back to (real movie title) | Force the action | Force the title search |
|---|---|---|---|---|
| `M` | click letter **M** in the A–Z picker | search title/folder "M" (1931 film) | `letter M` | `movie M` |
| `up` | scroll up (if scrollable) | search title/folder "Up" (2009 film) | `page up` | `movie up` |
| `next` | click the next-page arrow (if enabled) | search title/folder "Next" (2007 film) | `page next` | `movie next` |
| `9` | scroll to 9% of the page | search title/folder "9" (2009 film) | `page 9` | `movie 9` |
| `65` | scroll to 65% of the page | search title/folder "65" (2023 film) | `page 65` | `movie 65` |

### Play vs. Resume vs. Replay
- **On a movie or episode directly**: Play and Resume are the same button. Replay forces a restart, ignoring saved progress.
- **On a series, season, or collection**: no separate replay state exists — `play`, `resume`, `replay` all click the one visible Play button; only `shuffle` differs.
- **Chapter/percent seeking** only makes sense once a specific movie or episode has been resolved — see §8.

---

## 2. Navigating to a library — `remote` · jump

Also works with a library's own custom server name — including a renamed Photos/Home Videos library, since the script falls back to matching your library list by exact name.

**Movies**: `movies`, `movie`, `film`, `films` — all identical
**TV Shows**: `tvshows`, `tvshow`, `tv`, `series`, `show`, `shows` — all identical
**Live TV**: `livetv`, `live`, `pvr`, `live tv` — all identical
**Collections / Box Sets**: `collections`, `collection`, `sets`, `set`, `boxsets`, `boxset` — all identical
**Home Videos**: `homevideos`, `homevideo`, `home videos`, `home video` — all identical
**Music**: `music`, `songs` — all identical

Any Movies or TV Shows alias lands you on that library's own first tab (enforced explicitly, not left to the page's own memory):
```
film                                 (remote · jump — Movies library, its own first tab)
holiday photos                        (remote · jump — a custom-named library, exact name required)
```

### Library tabs — only Movies, TV Shows, and Live TV have sub-tabs
Order-fixed: library word first.

**Movies tabs**: Movies (self) `movies`/`movie`/`film`/`films` · Suggestions `suggestions`/`suggestion` · Trailers `trailers`/`trailer` · Favorites `favorites`/`favourites`/`favourite`/`favorite`/`fav` · Collections `collections`/`collection`/`sets`/`set`/`boxsets`/`boxset` · Genres `genre`/`genres`
**TV Shows tabs**: Shows (self) `shows`/`show`/`tvshows`/`tvshow` · Suggestions `suggestions`/`suggestion` · Upcoming `upcoming` · Genres `genre`/`genres` · TV Networks `tv networks`/`networks`/`studios`/`studio` · Episodes `episodes`/`episode`
**Live TV tabs**: Programs `programs`/`program` · Guide `guide` · Channels `channels` · Recordings `recordings` · Schedule `schedule` · Series `series`

```
movies trailers                      (remote · jump — Movies library, Trailers tab)
movie suggestions                     (remote · jump — Movies library, Suggestions tab, "movie" instead of "movies")
trailer                                (bare · jump — same idea as above, already inside Movies)
tvshows tv networks                     (remote · jump — TV Shows library, Networks tab)
show tv networks                         (remote · jump — same, "show" instead of "tvshows")
network                                    (bare · jump — same, already inside TV Shows)
livetv guide                                (remote · jump — Live TV library, Guide tab)
live guide                                   (remote · jump — same, "live" instead of "livetv")
movies genre war                              (remote · jump — genre section within Movies)
genres war                                     (bare · jump — same, already inside Movies)
```

### Genre overview screen — `bare`, special priority
While the "Genres" tab is open, typing a listed genre's own name jumps straight into it — works bare (already on the tab) and remotely (`tvshows genre drama` from anywhere).

### Returning to the series level — `bare`, from inside an episode or season
```
main                                  (bare · jump — from an episode or season, back up to the series page)
show main                              (bare · jump — same, "show" added, order swapped)
main series                             (bare · jump — same, "series" instead of "show")
```

### Home / Favourites
```
favourites                           (remote · jump — global Favourites page)
favorite                              (remote · jump — same, American singular)
fav                                    (remote · jump — same, short form)
fav movies                              (remote · jump — Favourites page's Movies section)
fav shows                                (remote · jump — its TV Shows section)
fav people                                (remote · jump — its People section)
home fav                                   (remote · jump — force-jump, overrides context, see §1)
fav home                                    (remote · jump — same, order swapped)
```

---

## 3. Finding media — `remote` · jump
```
gladiator                            (remote · jump — exact title)
armageddon 1998                       (remote · jump — same idea, with a release year to disambiguate)
con air                                (remote · jump — different movie)
starship troopers                       (remote · jump — different movie)
```
Exact title → title with a trailing bracketed group stripped → title cut at a subtitle separator. A trailing 4-digit number is tried both as part of the title and as a release-year filter.

### Season / Episode
```
farscape season 2                    (remote · jump — full word)
farscape s2                           (remote · jump — same, compact)
stargate sg-1 s5e14                    (remote · jump — same show family, specific episode)
stargate atlantis s02e01                (remote · jump — different show, leading zeros)
babylon 5 specials                       (remote · jump — season 0)
```
### Context shortcuts — `bare`, already inside a series/season/episode
```
s2                                    (bare · jump — Season 2, while inside the show)
season 2                               (bare · jump — same, spelled out)
e1                                       (bare · jump — Episode 1, while inside a season)
s2e1                                      (bare · jump — Season 2 Episode 1 directly)
```

---

## 4. Collections — `remote` · jump, order-fixed (title, then collection word)
```
john wick collection                 (remote · jump — English)
mission impossible set                (remote · jump — different collection, "set" instead of "collection")
dark knight saga                        (remote · jump — different collection, "saga")
```
Recognized suffix words, by language: `collection`, `anthology`, `saga`, `set` (English) · `filmreihe` (German) · `colecao` (Portuguese) · `coleccion` (Spanish) · `collectie` (Dutch) · `collezione` (Italian) · `kolekcja` (Polish) · `kolekce` (Czech) · `kolekcia` (Slovak) · `kolekcija` (Croatian) · `zbirka` (Slovenian) · `colectie` (Romanian) · `gyujtemeny` (Hungarian) · `kokoelma` (Finnish) · `samling` (Scandinavian) · `koleksiyon` (Turkish). `trilogy` is **not** recognized.

---

## 5. People — `remote` · jump, order-free between person word and media-type word

**Person triggers**: `person`, `persons`, `actor`, `actors`, `actress`, `actresses`, `people`, `peoples`, `celebrity`, `celeb`
**Media-type triggers**: `movie`/`movies`/`film`/`films` · `tvshow`/`tvshows`/`series`/`show`/`shows`/`tv` · `episode`/`episodes`

Profile pages, five different actors, five identical-in-structure phrasings:
```
person tom hardy                     (remote · jump — profile page)
persons cate blanchett                (remote · jump — same idea, plural word, different actress)
actor idris elba                       (remote · jump — different word, different actor)
actress charlize theron                 (remote · jump — different actress)
celeb keanu reeves                       (remote · jump — short form, different actor)
```
Movies — ten equivalent-structure phrasings, mixing singular/plural and both orders, ten different actors:
```
movies persons dwayne johnson        (remote · jump — his movies)
persons movies jason statham          (remote · jump — order swapped, different actor)
movie persons milla jovovich           (remote · jump — singular "movie", different actress)
persons movie christian bale            (remote · jump — order swapped)
film person henry cavill                 (remote · jump — "film"/"person" singular)
person film hugh jackman                  (remote · jump — order swapped)
films actor sandra bullock                 (remote · jump — "films"/"actor")
actor films tom cruise                      (remote · jump — order swapped)
movies actors scarlett johansson             (remote · jump — "actors" plural)
actors movies leonardo dicaprio               (remote · jump — order swapped)
```
TV appearances — same pattern, ten more actors:
```
tvshows actors matt damon            (remote · jump — his TV shows)
actors tvshows will smith             (remote · jump — order swapped)
show actor ryan reynolds               (remote · jump — singular "show"/"actor")
actor show sylvester stallone           (remote · jump — order swapped)
shows actress emily blunt                (remote · jump — "shows"/"actress")
actress shows kate beckinsale             (remote · jump — order swapped)
series people arnold schwarzenegger        (remote · jump — "series"/"people")
people series harrison ford                 (remote · jump — order swapped)
tv peoples samuel l jackson                  (remote · jump — "tv"/"peoples")
peoples tv liam neeson                        (remote · jump — order swapped)
```
Individual episode appearances:
```
episode celebrity chris evans        (remote · jump — his episode appearances)
celebrity episode chris hemsworth     (remote · jump — order swapped, different actor)
episodes celeb chris pratt              (remote · jump — plural "episodes"/"celeb")
celeb episodes gerard butler             (remote · jump — order swapped)
```

---

## 6. Tags, genres, studios — `remote` · jump, order-fixed (type word first)
```
tag based on true events             (remote · jump — singular)
tags war films                        (remote · jump — plural, different tag)
genre war                              (remote · jump — a genre)
genres science fiction                  (remote · jump — plural, different genre)
studio a24                               (remote · jump — a studio)
```
Jumps to a cross-library list, independent of which library the tag/genre/studio "belongs" to — unlike `movies genre war` (§2), which stays scoped to one library's own genre tab.

---

## 7. Random — `bare` and `remote` · jump or play

Bare `random` is context-aware: it picks among whatever's actually relevant to where you currently are.

### Context-based — `bare`
```
random                               (bare · jump — plain, unfiltered library page → queried across the *entire* library, same reach as "random movie"/"random show"/"random collection")
play random                           (bare · play — same pick, played instead of just opened)
random                                 (bare · jump — filtered tag/genre list → random pick among only what's shown)
random                                  (bare · jump — inside a series, no season chosen → random episode from anywhere in the show)
random                                   (bare · jump — inside one specific season → random episode from that season only)
random                                    (bare · jump — inside a collection → random movie from it)
```

### Explicit type words override the context
```
random movie                         (jump — random pick from all movies)
random collection                     (jump — random pick from all collections)
random tvshow                          (jump — random pick from all shows, "tvshow" instead of "show")
play random film                        (play — random movie, played instead of opened, "film" instead of "movie")
play random set                          (play — random collection, Play button clicked, "set" instead of "collection")
```

### With a specific title — `remote`, order-free between `random`/`play` and the title
```
farscape random                      (remote · jump — random episode of this show)
random babylon 5                      (remote · jump — different show, order swapped)
play stargate sg-1 random              (remote · play — random episode played)
play random stargate atlantis           (remote · play — different show, order swapped)
mission impossible collection random     (remote · jump — random movie of this specific collection)
play random john wick collection          (remote · play — different collection, order swapped)
```
Force a random **season**, a random **movie**, or limit the pick to one **specific season**:
```
farscape random season               (remote · jump — random season page, not a random episode)
play babylon 5 random season           (remote · play — different show, Play clicked on that random season)
dark knight collection random movie      (remote · jump — redundant word, same as without "movie")
stargate sg-1 random s2                    (remote · jump — random episode, but only from Season 2)
play random stargate atlantis s3            (remote · play — different show/season, order swapped)
```

### Nested random — `bare` and `remote`, two type words + `random` twice
```
random tvshow random episode         (jump — random show, then a random episode from anywhere in it)
random show random season             (jump — same idea, different word, a random season instead)
random collection random movie         (jump — random collection, then a random movie from inside it)
play random series random episode       (play — random show's random episode, played directly, "series" instead of "tvshow")
play random set random movie             (play — random collection's random movie, played directly, "set" instead of "collection")
play random tvshow                        (play — random show, Play button at series level, no nested pick)
play random collection                     (play — random collection, Play button at collection level, no nested pick)
```

### Chapter & percent with random
```
play farscape random chapter 3       (remote · play — random episode, seeks to chapter 3)
play random babylon 5 chapter 3       (remote · play — different show, order swapped)
play stargate sg-1 random season chapter 2  (remote · play — random episode within a random season, seeks to chapter 2)
play random tvshow random episode 50%         (play — random show's random episode, seeks to halfway)
play dark knight collection random 50%          (remote · play — random movie of this collection, seeks to halfway)
```

---

## 8. Playing — `bare` and `remote`, order-free
```
play gladiator                       (remote · play — baseline)
armageddon play                       (remote · play — different movie, order swapped)
resume con air                         (remote · play — same button as "play", see §1)
replay starship troopers                (remote · play — different button, forces restart)
shuffle                                  (bare · play — current page, not on a single movie or episode)
```
```
farscape season 2 play               (remote · play — Play button on that season)
s2 play                               (bare · play — same idea, while already inside the show)
babylon 5 shuffle                       (remote · play — Shuffle button on that show's page)
shuffle stargate sg-1                    (remote · play — different show, order swapped)
```

### Context-aware play — `bare` and `remote`, no title needed once you're already there
```
play                                  (bare · play — whatever you're already viewing)
play s2                                (bare · play — inside a show, Season 2: first unwatched episode, or from the start)
play e3                                 (bare · play — inside a season, Episode 3 directly)
play s2e3                                (bare · play — inside a show, that specific episode directly)
play farscape                             (remote · play — the whole show: first unwatched episode, or from the beginning)
play stargate atlantis s3                  (remote · play — that season: first unwatched episode, or from the season's start)
```

### Chapter & percent seeking — `bare` and `remote`, movies/episodes only
```
play gladiator chapter 3             (remote · play — jump to chapter number 3)
play armageddon chaptername           (remote · play — by the chapter's actual name instead of a number — needs a file with named chapters in its metadata)
play con air 0%                        (remote · play — the very start, equivalent to a forced replay)
play starship troopers 50%              (remote · play — the halfway point)
play sphere 100%                         (remote · play — capped down to 99%, to avoid landing past the end)
play babylon 5 s2e1 chapter 2               (remote · play — specific episode, by chapter number)
play chapter 3                               (bare · play — seeks in the movie/episode you're already on)
play 75%                                      (bare · play — seeks in the movie/episode you're already on)
```

### Trailer — `bare` and `remote`, order-free, position-free
```
play trailer gladiator               (remote · play — baseline)
armageddon play trailer               (remote · play — different movie, title moved to the front)
trailer play con air                   (remote · play — different movie, "trailer" moved to the front)
starship troopers trailer play          (remote · play — different movie, "play" moved to the end)
trailer / play trailer / trailer play    (bare · play — current page, all three identical)
```
Works on movies, series, seasons, and collections directly — not on individual episodes:
```
farscape trailer                     (remote · play — trailer at series level)
babylon 5 season 2 trailer            (remote · play — trailer at that specific season's level)
john wick collection trailer            (remote · play — trailer at collection level)
```

### Next Up — `bare` and `remote`, order-free, position-free
```
next up                              (bare · jump — Next Up episode on the series page you're on)
play next up                          (bare · play — same episode, played directly)
farscape next up                        (remote · jump — remote version)
play stargate sg-1 next up               (remote · play — different show, played)
babylon 5 play next up                    (remote · play — different show, "play" moved to the middle)
```

---

## 9. Filter — `bare` and `remote`
```
filter <category> <value> <category> <value> ...
```
**`filter` values**: `played`, `unplayed`, `resumable`/`continue`/`continue watching`, `favorite`/`favorites`/`favourite`/`favourites`/`fav`
**`feature` values**: `subtitle`/`subtitles`, `trailer`/`trailers`, `special feature`/`special features`, `theme song`/`theme songs`, `theme video`/`theme videos`
**`video type` values**: `hd`, `sd`, `4k`, `3d`, `bd`/`bluray`, `dvd`
```
filter genre war year 1998           (bare/remote · two categories at once)
movies filter genre action             (remote · jump then filter)
tag based on true events filter feature trailer  (remote · jump then filter, combined with a tag lookup)
```

### Reset
```
reset filters                        (bare/remote · clears every active filter)
movies reset filters                  (remote · jump then reset)
reset filters rating pg-13             (bare/remote · removes only that one filter)
```

---

## 10. Sort & View — `bare` and `remote`
**Order**: `ascending`, `descending`
**Everywhere**: `name`, `community rating`, `date added`, `date played`, `parental rating`, `release date`
**Movies only**: `critics rating`, `play count`, `runtime`, `random`
**TVShows only**: `date episode added`
**List views only**: `folders`
```
sort name                            (bare/remote · applies sort)
sort community rating descending      (bare/remote · sort-by + order together)
sort ascending                         (bare/remote · order only)
```
**Movies/TVShows view**: `banner`, `list`, `poster`, `poster card`, `thumb`, `thumb card`
**List views**: `primary`, `banner`, `disc`, `logo`, `thumb`, `list`, plus `show title`
```
view poster                          (bare/remote · applies view)
view primary show title               (bare/remote · view + the "show title" checkbox together)
```

---

## 11. Watched — `bare` and `remote`, 15 sentence patterns × 4 word spellings (64 total)
```
watched                               (toggle · bare — no pattern needed)
played                                  (toggle · bare — different spelling, same meaning)
mark as unwatched                         (toggle · bare — full pattern, negated)
set unplayed                                (toggle · bare — shorter pattern)
```
```
watched gladiator                    (remote prefix · toggle)
armageddon watched                    (remote suffix · toggle — different movie, order swapped)
mark played con air                     (remote prefix · toggle — different pattern, different movie)
starship troopers mark played             (remote suffix · toggle — order swapped)
```

---

## 12. Favorite — `bare` and `remote`, 15 sentence patterns × 5 word spellings (75 total)
```
add to favorite                      (toggle · bare — American singular)
add to favourites                       (toggle · bare — same pattern, British plural)
add to fav                                (toggle · bare — same pattern, short form)
```
```
mark fav gladiator                   (remote prefix · toggle)
armageddon mark fav                    (remote suffix · toggle — different movie, order swapped)
toggle favourite con air                 (remote prefix · toggle — different pattern, different movie)
starship troopers toggle favourite          (remote suffix · toggle — order swapped)
```

---

## 13. Submenu actions — `bare` and `remote`
```
download                             (bare · triggers download — startsWith match, also catches "Download All" on series/seasons)
addtocollection                        (bare · squashed spelling of "add to collection")
media info
share
delete
```
```
gladiator download                   (remote suffix · action)
download armageddon                   (remote prefix · action — different movie, order swapped)
download farscape s2e1                  (remote prefix · action — combined with a season/episode target)
con air mediainfo                         (remote suffix · action — squashed spelling)
```

---

## 14. A–Z letter picker — `bare` and `remote`
```
a                                     (bare · jump — see the fallback table in §1)
letter a                              (bare · jump — forced, no fallback ambiguity)
letter #                               (bare · jump — non-alphabetic entries)
tag based on true events letter s        (remote · jump — combinable, runs last regardless of typed position)
m                                          (bare · tries the letter picker first, falls back to the movie titled "M")
movie m                                     (bare · forces the title search, skips the letter picker)
9                                             (bare · tries a percent-scroll first, falls back to the movie titled "9")
movie 9                                        (bare · forces the title search for "9")
```

---

## 15. Pagination & scrolling — `bare` and `remote`

`page`/`pages` are interchangeable throughout. Bare `next`/`prev`/`forward`/`previous` and a bare number alone follow the same fallback pattern as §1:
```
next                                 (bare · tries the next-page arrow first, falls back to the movie titled "Next")
movie next                            (bare · forces the title search, skips the arrow)
up                                      (bare · tries scrolling up first, falls back to the movie titled "Up")
movie up                                 (bare · forces the title search for "Up")
65                                          (bare · tries scrolling to 65% first, falls back to the movie titled "65")
movie 65                                     (bare · forces the title search for "65")
```

### Between library pages
```
next page                            (bare/remote · forced page-navigation)
page next                             (bare/remote · same, order swapped)
forward page                           (bare/remote · same, "forward" instead of "next")
previous page                            (bare/remote · the other direction)
prev page                                 (bare/remote · same, shorter word)
back page                                  (bare/remote · same as "previous page" — not the same as bare "back" in §16)
page first                                  (bare/remote · clicks "previous" repeatedly until disabled)
last page                                     (bare/remote · clicks "next" repeatedly until disabled)
```
Multiple jumps at once — number and direction word in either order, `page`/`pages` optional:
```
next 3                               (bare/remote · clicks "next" three times, 500ms apart)
3 next                                (bare/remote · same, order swapped)
page next 3                            (bare/remote · same, "page" added, no effect on the outcome)
prev 5                                   (bare/remote · same idea, other direction)
```

### Within a page
```
page top                             (bare/remote · forced, instant jump, no animation)
page bottom                           (bare/remote · the other end)
page down                               (bare/remote · one screen-height down)
page up                                  (bare/remote · one screen-height up)
page 50                                    (bare/remote · 50% down the page, % sign optional)
```
Multiple scroll-screens at once, pure client-side scrolling:
```
34 down                              (bare/remote · 34 screen-heights down in one jump)
down 21                               (bare/remote · same idea, order swapped, different count)
12 pages down                          (bare/remote · same, "pages" plural)
```

### Auto-scroll — `bare`, keeps running until stopped
```
scroll                               (bare · starts at medium speed)
scroll slow                           (bare · starts/switches to slow speed)
scroll fast                            (bare · starts/switches to fast speed)
scroll delay 5                          (bare · sets a 5-second pause before restarting at the top — only sets the value)
stop                                      (bare · stops the auto-scroll)
```

---

## 16. Miscellaneous — `bare` unless noted
```
search alien                         (bare/remote · opens the search results for "alien")
find gladiator                        (bare/remote · same, different trigger word, different title)
reload                                 (bare · reloads the current page)
back                                     (bare · the browser's own back button — not "back page"/"page back" in §15, which page-navigates instead)
fullscreen                               (bare · enters fullscreen)
windowed                                  (bare · exits fullscreen)
```
