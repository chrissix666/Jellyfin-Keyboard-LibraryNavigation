# Jellyfin Keyboard Navigation — Command Reference

A Tampermonkey/Violentmonkey userscript that lets you control Jellyfin entirely by typing. Start typing anywhere in the web UI (not while a video is playing, not while a real input field is focused) and press **Enter** to run a command, **Backspace** to edit, **Escape** to clear.

Examples below use English original titles from a typical library (no edition/cut suffixes, no titles with their own keyboard aliases like "Star Trek"), so the examples show the parsing rules cleanly. Where a section allows lots of variation (aliases, singular/plural, swapped order), the examples deliberately repeat the same destination several times over, so you can see the whole space of valid phrasings at a glance.

---

## 1. Core concepts — read this first

### Scope tags used below
- **`[current page]`** — only does something on the right kind of page you're already on
- **`[remote]`** — works from anywhere; resolves the target and jumps to it first
- **`[both]`** — works either way

### The universal execution order
```
target → filter → view → sort → reset → play/shuffle/trailer/next-up/random/watched/favorite/submenu → letter
```
```
stargate sg-1 sort name view banner letter s
letter s stargate sg-1 sort name view banner        ← identical result
sort name stargate sg-1 letter s view banner          ← identical result
view banner letter s stargate sg-1 sort name           ← identical result
```

### Order-free vs. order-fixed vs. order-critical
Most two-part commands are **order-free** (`gladiator play` = `play gladiator`). Some are **order-fixed**. And a few pairs are **order-critical**: both orders are valid, but mean two different things.

> ⚠️ **`movies fav` ≠ `fav movies`**
> - `movies fav` — library word first → jumps to the **Movies library's own "Favorites" tab** (inside `movies.html`)
> - `fav movies` — favourite word first → jumps to the **global Favourites page's "Movies" section** (inside `home.html`'s Favourites view)
>
> Same two words, both valid, two completely different destinations. See §2.

### The universal fallback pattern
A handful of *bare* words are overloaded: they could be a page-navigation action, or the start of a title. The navigation action is always tried first; a title/folder search is the fallback if it isn't available:

| Bare word | Tries first | Falls back to | Force the action | Force the title search |
|---|---|---|---|---|
| `M` | click letter **M** in the visible A–Z picker | search title/folder "M" | `letter M` | `movie M` |
| `up` | scroll up (if the page has scrollable content) | search title/folder "Up" | `page up` | `movie up` |
| `next` | click the next-page arrow (if enabled) | search title/folder "Next" | `page next` | `movie next` |
| `65` | scroll to 65% of the page (if scrollable) | search title/folder "65" | `page 65` | `movie 65` |

Prefixing with `page` always forces the navigation action; prefixing with a type word (`movie`, `tvshow`, `person`...) always forces a title/person search instead.

### Play vs. Resume vs. Replay
- **On a movie or episode directly**: **Play** and **Resume** are the *same button*. **Replay** is a separate button that forces playback from the beginning, ignoring saved progress.
- **On a series, season, or collection**: no separate replay state exists. `play`, `resume`, `replay` all click the one visible Play button; only `shuffle` differs.
- **Chapter/percent seeking** only makes sense once a specific movie or episode has been resolved — see §8.

---

## 2. Navigating to a library — `[remote]` `Navigation`

| Library | All trigger words |
|---|---|
| Movies | `movies`, `movie`, `film`, `films` |
| TV Shows | `shows`, `show`, `series`, `tvshow`, `tvshows`, `tv` |
| Live TV | `livetv`, `live`, `pvr`, `live tv` |
| Collections / Box Sets | `collections`, `collection`, `sets`, `set`, `boxsets`, `boxset` |
| Home Videos | `homevideos`, `homevideo`, `home videos`, `home video` |
| Music | `music`, `songs` |

Any Movies or TV Shows alias lands you on that library's **own first tab** — enforced explicitly:
```
movies
movie
film
films
tvshows
tv
series
show
shows
tvshow
```
```
livetv          live          pvr          live tv
collections     collection    sets         set          boxsets    boxset
```

### Library tabs — `[both]` `Navigation`, order-fixed (library word first)
```
movies suggestions
movie suggestions
film suggestions
films suggestions
suggestions                     (already inside any Movies-family page)

tvshows upcoming
tv upcoming
series upcoming
show upcoming
upcoming                        (already inside TV Shows)
```
```
movies genre action
movie genre action
film genres action
genre action                    (already inside Movies)
genres action                   (already inside Movies)
```

**movies**: `movies` (self, any alias), `suggestions`/`suggestion`, `trailers`/`trailer`, `favorites`/`favourites`/`favourite`/`favorite`/`fav`, `collections`/`collection`/`sets`/`set`/`boxsets`/`boxset`, `genre`/`genres`
**tvshows**: `shows`/`show`/`tvshows`/`tvshow` (self, any alias), `suggestions`/`suggestion`, `upcoming`, `genre`/`genres`, `tv networks`/`tv network`/`networks`/`network`/`studios`/`studio`, `episodes`/`episode`
**livetv**: `programs`/`program`, `guide`, `channels`, `recordings`, `schedule`, `series`

### Genre overview screen — `[current page]` special priority
While the "Genres" tab itself is open, any word matching a genre currently on screen wins priority over everything else — including `home`/`back`:
```
action                → jumps into Action, if listed
comedy                 → jumps into Comedy, if listed
drama                    → jumps into Drama, if listed
horror                    → jumps into Horror, if listed
thriller                    → jumps into Thriller, if listed
science fiction               → jumps into Science Fiction, if listed
war                             → jumps into War, if listed
home                             → no genre named "home" → falls through to Home navigation
back                              → no genre named "back" → falls through to browser back
```

### Home / Favourites — `[both]` `Navigation`
```
favourites
favorites
favourite
favorite
fav
```
```
fav movies
fav shows
fav episodes
fav people
fav collections
fav videos
```
Force-jump to the global Favourites page, order-free, regardless of context:
```
home fav
fav home
home favourite
favourite home
home favorite
favorite home
home favorites
favorites home
home favourites
favourites home
```

---

## 3. Finding media — `[remote]` `Navigation`
```
gladiator
gladiator 2000
inception
interstellar
saving private ryan
die hard
armageddon
stargate
```
### Automatic title parsing
Exact title → title with a trailing bracketed group stripped → title cut at a subtitle separator (`: `, ` - `, ` – `, ` — `). A trailing 4-digit number is tried both as part of the title and as a release-year filter.

### Season / Episode — `[remote]` `Navigation`
```
falling skies season 2
falling skies s2
falling skies s02
falling skies s2e1
falling skies s02e01
falling skies s2:e1
falling skies specials            (= season 0)
stargate sg-1 season 5
stargate sg-1 s5e14
stargate atlantis season 3
stargate atlantis s3e1
```
### Context shortcuts — `[current page]` `Navigation`, already inside a series/season/episode
```
s2              season 2            ← identical, while inside a show
s02              season 02           ← identical, while inside a show
e1                episode 1           ← identical, while inside a season
e01                episode 01          ← identical, while inside a season
s2e1
s02e01
s2:e1
```

---

## 4. Collections — `[remote]` `Navigation`, order-fixed (title, then collection word)
```
john wick collection
john wick set
mission impossible collection
mission impossible saga
dark knight collection
dark knight saga
harry potter collection
harry potter filmreihe              (German)
```
Recognized suffix words, by language: `collection`, `anthology`, `saga`, `set` (English) · `filmreihe` (German) · `colecao` (Portuguese) · `coleccion` (Spanish) · `collectie` (Dutch) · `collezione` (Italian) · `kolekcja` (Polish) · `kolekce` (Czech) · `kolekcia` (Slovak) · `kolekcija` (Croatian) · `zbirka` (Slovenian) · `colectie` (Romanian) · `gyujtemeny` (Hungarian) · `kokoelma` (Finnish) · `samling` (Scandinavian) · `koleksiyon` (Turkish)

`trilogy` is **not** currently recognized — only the words listed above.

---

## 5. People — `[remote]` `Navigation`, order-free between the person word and the media-type word

**Person triggers** (10): `person`, `persons`, `actor`, `actors`, `actress`, `actresses`, `people`, `peoples`, `celebrity`, `celeb`
**Media-type triggers**: `movie`, `movies`, `film`, `films` (movies) · `tvshow`, `tvshows`, `series`, `show`, `shows`, `tv` (TV shows) · `episode`, `episodes` (individual episode appearances)

```
person keanu reeves
persons keanu reeves
actor keanu reeves
actors keanu reeves
celeb keanu reeves
```
His movies — ten equivalent phrasings, mixing singular/plural and both word orders:
```
movies persons keanu reeves
persons movies keanu reeves
movie persons keanu reeves
persons movie keanu reeves
film person keanu reeves
person film keanu reeves
films actor keanu reeves
actor films keanu reeves
movies actors keanu reeves
actors movies keanu reeves
```
Her TV appearances — same idea, a different actress:
```
tvshows actresses scarlett johansson
actresses tvshows scarlett johansson
show actress scarlett johansson
actress show scarlett johansson
shows actress scarlett johansson
actress shows scarlett johansson
series people scarlett johansson
people series scarlett johansson
tv peoples scarlett johansson
peoples tv scarlett johansson
```
His individual episode appearances:
```
episode celebrity tom hardy
celebrity episode tom hardy
episodes celeb tom hardy
celeb episodes tom hardy
episode actor tom hardy
actor episode tom hardy
```

---

## 6. Tags, genres, studios — direct cross-library jump — `[remote]` `Navigation`, order-fixed (type word first)
```
tag based on true events
tags based on true events
genre war
genres war
studio a24
```
Jumps to a cross-library list, independent of which library the tag/genre/studio "belongs" to — unlike `movies genre war` (§2), which stays scoped to one library's own genre tab.

---

## 7. Random — `[both]` `Navigation + Action`

Bare `random` (and `play random`) is **context-aware**: it picks among whatever's actually relevant to where you currently are.

### Context-based, `[current page]`
```
random                              (in a filtered/tag/genre list → random pick among what's actually shown)
play random                         (same pick, played instead of just opened)
random                              (inside a series, no season chosen → random episode from anywhere in the show)
random                              (inside one specific season → random episode from that season only)
random                              (inside a collection → random movie from it)
random                              (on a plain library page, no filter → random pick across that whole library)
```

### Explicit type words override the context — `[both]`, override
```
random movie
random show
random collection
random tvshow
random film
random series
play random movie
play random collection
```
Type words: `movie`/`movies`/`film`/`films` → Movie · `collection`/`collections`/`set`/`sets` → Collection · `show`/`shows`/`series`/`tvshow`/`tvshows`/`tv` → Series. With none of these words at all, all three types are combined.

### With a specific title, `[remote]`, order-free between `random`/`play` and the title
```
falling skies random
random falling skies
play falling skies random
play random falling skies
falling skies play random
random play falling skies
john wick collection random
random john wick collection
play john wick collection random
play random john wick collection
```
Force a random **season** instead of a random episode, or a random **movie** instead of the collection's default:
```
falling skies random season
random season falling skies
play falling skies random season
john wick collection random movie          (redundant but valid)
```

### Nested random, `[both]`, two type words + `random` twice
```
random tvshow random episode        (random show, then a random episode from anywhere in it)
random tvshow random season         (random show, then a random season)
random collection random movie      (random collection, then a random movie from inside it)
play random tvshow random episode   (same, but plays the resulting episode directly)
play random tvshow random season    (same, but clicks Play on that random season)
play random collection random movie (same, but plays the resulting movie directly)
play random tvshow                  (random show, Play button at series level — no episode resolved)
play random collection              (random collection, Play button at collection level — no movie resolved)
```
Without `play`, nested random always jumps straight to the final item's own detail page.

### Chapter & percent with random, `[both]`, only once a movie/episode is actually resolved
```
play falling skies random chapter 3
play random falling skies chapter 3
play falling skies random season chapter 2
play random tvshow random episode 50%
play john wick collection random 50%
play random collection random movie chapter 4
```

---

## 8. Playing — `Navigation + Action`, `[both]`, order-free
```
play gladiator
gladiator play
resume gladiator
resume inception
replay gladiator
replay inception
shuffle
```
`shuffle` only exists at Collection/Series/Season level and library/list views — not on an individual movie or episode.
```
falling skies season 2 play
s2 play                                 (while already inside the show)
falling skies shuffle
shuffle falling skies
```

### Context-aware play, no title needed once you're already there — `[both]`
```
play                                    (bare — plays whatever you're already viewing)
play s2                                 (bare, inside a show — first unwatched episode of Season 2, or from the start)
play e3                                 (bare, inside a season — plays Episode 3 directly)
play s2e3                               (bare, inside a show — plays that specific episode directly)
play falling skies                      (remote — first unwatched episode, or from the beginning)
play falling skies s2                   (remote — first unwatched episode of that season, or from the start)
play stargate sg-1
play stargate sg-1 s5
play stargate atlantis
play stargate atlantis s3
```

### Chapter & percent seeking — `[both]`, movies/episodes only
```
play gladiator chapter 3
play gladiator chaptername
play gladiator 0%
play gladiator 50%
play gladiator 100%                     (capped down to 99%)
play falling skies s2e1 chapter 2
play stargate sg-1 s5e14 chapter 1
play stargate atlantis s3e1 50%
play chapter 3                          (bare — seeks in the movie/episode you're already on)
play 75%                                (bare — seeks in the movie/episode you're already on)
```

### Trailer — `[both]`, order-free, position-free
```
play trailer gladiator
gladiator play trailer
trailer play gladiator
gladiator trailer play
play gladiator trailer
trailer gladiator play
play trailer inception
inception trailer play
trailer / play trailer / trailer play    (bare, current page)
```
Works on movies, series, seasons, collections — not individual episodes.

### Next Up — `[both]`, order-free, position-free
```
next up                                 (bare)
play next up
falling skies next up
next up falling skies
play falling skies next up
play next up falling skies
falling skies play next up
falling skies next up play
stargate sg-1 next up
play stargate sg-1 next up
```

---

## 9. Filter — `[both]` `Action`
```
filter <category> <value> <category> <value> ...
```

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
filter genre war year 1998
filter genre action
filter feature trailer
filter video type 4k
filter rating pg-13
movies filter genre action
movies filter genre war rating r
tag based on true events filter feature trailer
```

### Reset — `[both]`
```
reset filters
movies reset filters
reset filters rating pg-13
```

---

## 10. Sort & View — `[both]` `Action`
```
sort <sort-by> <order>
```
**Order**: `ascending`, `descending`
**Everywhere**: `name`, `community rating`/`communityrating`, `date added`/`dateadded`, `date played`/`dateplayed`, `parental rating`/`parentalrating`, `release date`/`releasedate`
**Movies only**: `critics rating`/`criticsrating`, `play count`/`playcount`, `runtime`, `random`
**TVShows only**: `date episode added`/`dateepisodeadded`
**List views only**: `folders`
**Collections tab specifically**: only `name`, `community rating`, `date added`, `parental rating`, `release date`.
```
sort name
sort community rating
sort community rating descending
sort ascending
sort descending
```

```
view <value(s)>
```
**Movies/TVShows**: `banner`, `list`, `poster`, `poster card`/`postercard`, `thumb`, `thumb card`/`thumbcard`
**List views**: `primary`, `banner`, `disc`, `logo`, `thumb`, `list`, plus `show title`/`show the title`
```
view poster
view banner
view list
view primary
view primary show title
```

---

## 11. Watched — `[both]` `Action`, fully unified: 15 sentence patterns × 4 word spellings

**Sentence patterns** (15): `add to`, `add`, `delete from`, `delete`, `mark as`, `mark`, `set to`, `set`, `unmark from`, `unmark`, `unset from`, `unset`, `remove from`, `remove`, `toggle`
**Word spellings** (4): `watched`, `unwatched`, `played`, `unplayed`
Plus each spelling works entirely bare. 64 total.
```
watched
played
mark as watched
mark played
set watched
unset from played
toggle watched
add to unwatched
remove unplayed
unmark from unwatched
```
```
watched gladiator
gladiator watched
mark played inception
inception mark played
toggle watched stargate sg-1
stargate sg-1 toggle watched
```

---

## 12. Favorite — `[both]` `Action`, fully unified: 15 sentence patterns × 5 word spellings

**Word spellings** (5): `favorite`, `favourite`, `favorites`, `favourites`, `fav`. 75 total.
```
add to favorite
add to favourites
delete from fav
mark as favourite
set favorite
unmark from favorites
unset fav
remove favourite
toggle favorites
toggle fav
```
```
mark fav gladiator
gladiator mark fav
add to favorite inception
inception add to favorite
toggle favourite stargate atlantis
stargate atlantis toggle favourite
```

---

## 13. Submenu actions — `[both]` `Action`
```
download                   download all
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
```
download
gladiator download
download gladiator
download falling skies s2e1
media info inception
inception mediainfo
share stargate sg-1
stargate sg-1 share
```

---

## 14. A–Z letter picker — `[both]`
```
a                                        (bare — see the fallback table in §1)
letter a
letter b
letter #
tag based on true events letter s
movies letter g
tvshows letter s
letter s movies
```

---

## 15. Pagination & scrolling — `[both]` `Action`

`page`/`pages` are interchangeable throughout.

### Between library pages
```
next page          page next          forward page          page forward
previous page       page previous       prev page             page prev
back page            page back
page first            first page
page last              last page
```
```
next 3           3 next            page next 3          3 pages next
prev 5            5 prev            pages prev 2           2 pages prev
next 10            10 pages next
prev 8              8 pages prev
```

### Within a page
```
page top       top page       page bottom       bottom page
page down       down page       page up       up page
page 50          page 50%
```
```
34 down           down 21           12 pages down           pages down 7
50 up               up 50
```

### Auto-scroll
```
scroll
scroll slow        scroll slower        slow scroll        slower scroll
scroll fast          scroll faster        fast scroll         faster scroll
scroll delay 5
stop        stop scroll        scroll stop
```

---

## 16. Miscellaneous — `[current page]` unless noted
```
search alien          find alien
reload         refresh         reset
back
fullscreen
window        windowed
```

---

## 17. Exceptions, overrides, and bugs fixed along the way

**Genre-overview priority override** (§2): the one screen where a plain word can outrank reserved words like `home`/`back`/`movies` — a fast, local DOM lookup rather than a network call.

**`movies`/`tvshows` force an explicit tab click**: the script explicitly clicks the "Movies"/"Shows" tab after navigating, rather than trusting the page's own remembered default.

**Stale/duplicate DOM elements**: pagination arrows, the filter-dialog close button, and A–Z letters can briefly exist twice on a page. Every click scans *all* matches and picks the first genuinely visible, enabled one.

**Collections tab has its own Sort dialog**: different underlying values than the regular Movies sort dialog — detected automatically by the active tab.

**Keyboard capture phase**: the script listens in the capture phase, not the default bubble phase, so it reliably receives input even where Jellyfin's own components might otherwise intercept it first.

**`played`/`unplayed` vs. the Filter feature**: filter parsing always runs before action-word parsing, so `played` safely works both as a filter value and as a standalone watched-toggle.

**Folder names that collide with a feature word**: the script tries a matching folder/photo-album on your current page before falling back to the word's usual meaning.
