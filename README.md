# Jellyfin Keyboard Navigation — Command Reference

This userscript that lets you control Jellyfin entirely by typing. Start typing anywhere in the web UI (not while a video is playing, not while a real input field is focused, e.g. on search) and press **Enter** to run a command, **Backspace** to edit, **Escape** to clear.

---

## Installation

Requires the [JavaScript Injector](https://github.com/n00bcodr/Jellyfin-JavaScript-Injector) plugin.

1. Go to **Dashboard → Plugins → JavaScript Injector**, add a new script entry, and paste in the full contents of the .js script. Save and enable it.
2. Reload the Jellyfin web UI in your browser. Hover any collection card to see it in action.

---

## Tested on

- Windows 11
- Chrome
- Jellyfin Web 10.10.7
- Jellyfin JavaScript Injector

## License

MIT

---

Every example line below is annotated with: whether it's **bare** (current page only) or **remote** (jumps from anywhere), whether it **jumps** or **plays**, and — where a line is a variation of the one above — what exactly changed. Titles and actors are deliberately varied line by line rather than repeated, so you can see the breadth of a real library reflected throughout.

## 1. Core concepts — read this first

### Scope tags used below
- **`bare`** — only does something on the right kind of page you're already on
- **`remote`** — works from anywhere; resolves the target and jumps to it first

### The universal execution order
```
target → filter → view → sort → reset → play/shuffle/trailer/next-up/random/watched/favorite/submenu → letter
```
```
armageddon sort name view banner letter a		(remote · jump+sort+view+letter · baseline)
letter a armageddon sort name view banner		(remote · same result · only typed order changed)
sort name armageddon letter a view banner		(remote · same result · typed order changed again)
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
- **On a movie or episode directly**: Play and Resume are the same button. Replay forces a restart, ignoring saved progress.<br>
- **On a series, season, or collection**: no separate replay state exists — `play`, `resume`, `replay` all click the one visible Play button; only `shuffle` differs.<br>
- **Chapter/percent seeking** only makes sense once a specific movie or episode has been resolved — see §8.<br>

---

## 2. Navigating to a library — `remote` · jump

Also works with a library's own custom server name — including a renamed Photos/Home Videos library, since the script falls back to matching your library list by exact name.

**Movies**: `movies`, `movie`, `film`, `films` — all identical<br>
**TV Shows**: `tvshows`, `tvshow`, `tv`, `series`, `show`, `shows` — all identical<br>
**Live TV**: `livetv`, `live`, `pvr`, `live tv` — all identical<br>
**Collections / Box Sets**: `collections`, `collection`, `sets`, `set`, `boxsets`, `boxset` — all identical<br>
**Home Videos**: `homevideos`, `homevideo`, `home videos`, `home video` — all identical<br>
**Music**: `music`, `songs` — all identical<br>

Any Movies or TV Shows alias lands you on that library's own first tab (enforced explicitly, not left to the page's own memory):
```
movies		(remote · jump — Movies library)
film		(remote · jump — same, "film" instead of "movies")
films		(remote · jump — same, plural)
tvshows		(remote · jump — TV Shows library)
series		(remote · jump — same, "series" instead)
show		(remote · jump — same, singular)
livetv		(remote · jump — Live TV library)
pvr		(remote · jump — same, "pvr" instead)
boxsets		(remote · jump — Collections library)
holiday photos		(remote · jump — a custom-named library, e.g. Home Videos & Photos, exact name required)
```

### Library tabs — only Movies, TV Shows, and Live TV have sub-tabs
Order-fixed: library word first.

**Movies tabs**: Movies (self) `movies`/`movie`/`film`/`films` · Suggestions `suggestions`/`suggestion` · Trailers `trailers`/`trailer` · Favorites `favorites`/`favourites`/`favourite`/`favorite`/`fav` · Collections `collections`/`collection`/`sets`/`set`/`boxsets`/`boxset` · Genres `genre`/`genres`<br>
**TV Shows tabs**: Shows (self) `shows`/`show`/`tvshows`/`tvshow` · Suggestions `suggestions`/`suggestion` · Upcoming `upcoming` · Genres `genre`/`genres` · TV Networks `tv networks`/`networks`/`studios`/`studio` · Episodes `episodes`/`episode`<br>
**Live TV tabs**: Programs `programs`/`program` · Guide `guide` · Channels `channels` · Recordings `recordings` · Schedule `schedule` · Series `series`<br>

```
movies trailers		(remote · jump — Movies library, Trailers tab)
movie suggestions		(remote · jump — Movies library, Suggestions tab, "movie" instead of "movies")
trailer		(bare · jump — same idea as above, already inside Movies)
film favourites		(remote · jump — Movies library, Favorites tab)
tvshows tv networks		(remote · jump — TV Shows library, Networks tab)
show tv networks		(remote · jump — same, "show" instead of "tvshows")
network		(bare · jump — same, already inside TV Shows)
series upcoming		(remote · jump — TV Shows library, Upcoming tab)
livetv guide		(remote · jump — Live TV library, Guide tab)
live guide		(remote · jump — same, "live" instead of "livetv")
livetv recordings		(remote · jump — Live TV library, Recordings tab)
movies genre war		(remote · jump — genre section within Movies)
genres war		(bare · jump — same, already inside Movies)
genrename (e.g. war, comedy, ...)    	(bare · jump — already inside Movies or TV Shows genres tab)
```

### Genre overview screen — `bare`, special priority<br>
While the "Genres" tab is open, typing a listed genre's own name jumps straight into it — works bare (already on the tab) and remotely (`tvshows genre drama` from anywhere).

### Returning to the series level — `bare`, from inside an episode or season
```
main		(bare · jump — from an episode or season, back up to the series page)
show main		(bare · jump — same, "show" added, order swapped)
main series		(bare · jump — same, "series" instead of "show")
```

### Home / Favourites
```
favourites		(remote · jump — global Favourites page)
favorites		(remote · jump — same, American plural)
favourite		(remote · jump — same, singular)
favorite		(remote · jump — same, singular + American)
fav		(remote · jump — same, short form)
fav movies		(remote · jump — Favourites page's Movies section)
movies      (bare · jump — Favourites page's Movies section when already on the Favourites page)
fav shows		(remote · jump — its TV Shows section)
shows      (bare · jump — Favourites page's TV Shows section when already on the Favourites page)
fav episodes		(remote · jump — its Episodes section)
episodes      (bare · jump — Favourites page's Episodes section when already on the Favourites page)
fav people		(remote · jump — its People section)
people      (bare · jump — Favourites page's People section when already on the Favourites page)
fav collections		(remote · jump — its Collections section)
collections      (bare · jump — Favourites page's Collection section when already on the Favourites page)
fav videos		(remote · jump — its Home Videos section)
videos      (bare · jump — Favourites page's Home Videos section when already on the Favourites page)
```
### Home / Favourites overview screen — `bare`, special priority<br>
While the "Home Favourites" tab is open, typing a listed Sub (movies, shows, episodes, people, collections, videos) name jumps straight into it — works bare (already on the tab) and remotely (`fav people, fav movies, fav collections, ...` from anywhere).

Force-jump to the global Favourites page, order-free, ten equivalent phrasings:
```
home fav		(remote · jump — force-jump, overrides context, see §1)
fav home		(remote · jump — same, order swapped)
home favourite		(remote · jump — same, singular spelling)
favourite home		(remote · jump — same, order swapped)
home favorite		(remote · jump — American spelling)
favorite home		(remote · jump — same, order swapped)
home favorites		(remote · jump — American plural)
favorites home		(remote · jump — same, order swapped)
home favourites		(remote · jump — British plural)
favourites home		(remote · jump — same, order swapped)
```
*When you are in Movies, there is also a Favourites tab. In this tab, short favourite phrasings have priority. This can be overridden by using a forced "global/home Favourites" jump.

---

## 3. Finding media — `remote` · jump

The year and the library distinction between Movie or TV Show are purely optional. However, they are useful for differentiation if there are two identical matches, because if the match is not unambiguous, no match will be returned.<br>
<br>
For movies with the same title, the year is required to distinguish between them.<br>
For TV shows (at least in my setup), the year is already treated as part of the title, for example **Doctor Who** & **Doctor Who (2005)** or **MacGyver** & **MacGyver (2016)**.<br>
<br>
The matching process follows these steps:<br>
**Exact title → title with a trailing bracketed group stripped → title cut at a subtitle separator.**<br>
A trailing 4-digit number is tried both as part of the title and as a release-year filter, allowing special cases like **Blade Runner 2049 (2017)** to be distinguished from **Blade Runner (1982)**.<br>
<br>
Examples that exist both as a series and a movie: **Doctor Who, Spartacus, Star Wars: The Clone Wars**.

```
gladiator		(remote · jump — title only)
movie starship troopers		(remote · jump — movie prefix optional)
movie armageddon 1998		(remote · jump — movie prefix optional, with a release year to disambiguate)
blade runner final cut		(remote · jump — version/edition/cut suffix appended to the end)
```
*When a movie exists multiple times in the library, its distinguisher must be included. In this example, " (International Theatrical)" and " (Final Cut)" are appended after the title. The parentheses themselves are ignored during matching. If there is only one match, the content inside the parentheses is also ignored. However, if there are multiple matches, the text inside the parentheses must be provided to identify the correct item.

### TV Show / Season / Episode
```
farscape		(remote · jump show — title only)
tvshow farscape   (remote · jump show — TV Show prefix optional)
farscape season 2		(remote · jump season — full word)
farscape s2		(remote · jump season — same, compact)
farscape s02		(remote · jump season — same, leading zero)
stargate sg-1 s5e14		(remote · jump episode — same show family, specific episode)
stargate atlantis s02e01		(remote · jump episode — different show, leading zeros)
stargate atlantis s2:e1		(remote ·  jump episode — same, colon separator)
babylon 5 specials		(remote ·  jump season — season 0)
```
### Context shortcuts — `bare`, already inside a series/season/episode
```
s2		(bare · jump — Season 2, while inside the show)
season 2		(bare · jump — same, spelled out)
e1		(bare · jump — Episode 1, while inside a season)
episode 1		(bare · jump — same, spelled out)
s2e1		(bare · jump — Season 2 Episode 1 directly)
```

---

## 4. Collections — `remote` · jump, order-fixed (title, then collection word)
```
john wick collection		(remote · jump — English)
mission impossible set		(remote · jump — different collection, "set" instead of "collection")
dark knight saga		(remote · jump — different collection, "saga")
harry potter filmreihe		(remote · jump — different collection, German)
```
Recognized suffix words, by language: `collection`, `anthology`, `saga`, `set` (English) · `filmreihe` (German) · `colecao` (Portuguese) · `coleccion` (Spanish) · `collectie` (Dutch) · `collezione` (Italian) · `kolekcja` (Polish) · `kolekce` (Czech) · `kolekcia` (Slovak) · `kolekcija` (Croatian) · `zbirka` (Slovenian) · `colectie` (Romanian) · `gyujtemeny` (Hungarian) · `kokoelma` (Finnish) · `samling` (Scandinavian) · `koleksiyon` (Turkish). `trilogy` is **not** recognized.

---

## 5. People — `remote` · jump, order-free between person word and media-type word

**Person triggers**: `person`, `persons`, `actor`, `actors`, `actress`, `actresses`, `people`, `peoples`, `celebrity`, `celeb`<br>
**Media-type triggers**:<br>
Movies appearances: `movie`/`movies`/`film`/`films`<br>
TV Show appearances: `tvshow`/`tvshows`/`series`/`show`/`shows`/`tv`<br>
Episode appearances: `episode`/`episodes`<br>

Profile pages, five different actors, identical-in-structure phrasings:
```
person tom hardy		(remote · jump — profile page)
persons cate blanchett		(remote · jump — same idea, plural word, different actress)
actor idris elba		(remote · jump — different word, different actor)
actress charlize theron		(remote · jump — different actress)
celeb keanu reeves		(remote · jump — short form, different actor)
```
Movies — equivalent-structure phrasings, mixing singular/plural and both orders:
```
movies persons dwayne johnson		(remote · jump — his movies)
persons movies jason statham		(remote · jump — order swapped, different actor)
movie persons milla jovovich		(remote · jump — singular "movie", different actress)
persons movie christian bale		(remote · jump — order swapped)
film person henry cavill		(remote · jump — "film"/"person" singular)
person film hugh jackman		(remote · jump — order swapped)
films actor sandra bullock		(remote · jump — "films"/"actor")
actor films tom cruise		(remote · jump — order swapped)
movies actors scarlett johansson		(remote · jump — "actors" plural)
actors movies leonardo dicaprio		(remote · jump — order swapped)
```
TV appearances — same pattern:
```
tvshows actors matt damon		(remote · jump — his TV shows)
actors tvshows will smith		(remote · jump — order swapped)
show actor ryan reynolds		(remote · jump — singular "show"/"actor")
actor show sylvester stallone		(remote · jump — order swapped)
shows actress emily blunt		(remote · jump — "shows"/"actress")
actress shows kate beckinsale		(remote · jump — order swapped)
series people arnold schwarzenegger		(remote · jump — "series"/"people")
people series harrison ford		(remote · jump — order swapped)
tv peoples samuel l jackson		(remote · jump — "tv"/"peoples")
peoples tv liam neeson		(remote · jump — order swapped)
```
Individual episode appearances:
```
episode celebrity chris evans		(remote · jump — his episode appearances)
celebrity episode chris hemsworth		(remote · jump — order swapped, different actor)
episodes celeb chris pratt		(remote · jump — plural "episodes"/"celeb")
celeb episodes gerard butler		(remote · jump — order swapped)
```

---

## 6. Tags, genres, studios — `remote` · jump, order-fixed (type word first)
```
tag based on true events		(remote · jump — singular, cross-library list)
tags war films		(remote · jump — plural, different tag, cross-library list)
genre war		(remote · jump — a genre, cross-library list, both Movies & TV Shows)
genres science fiction		(remote · jump — plural, different genre, cross-library list, both Movies & TV Shows)
studio a24		(remote · jump — a studio, cross-library list, both Movies & TV Shows)
```
Jumps to a cross-library list, independent of which library the tag/genre/studio "belongs" to — unlike `movies genre war` (§2), which stays scoped to one library's own genre tab.

---

## 7. Random — `bare` and `remote` · jump or play

Bare `random` is context-aware: it picks among whatever's actually relevant to where you currently are.

### Context-based — `bare`
```
random		(bare · jump — from home, pick random movie or random show or random collection")
play random		(bare · play — from home, played instead of just opened, random movie or random show or random collection)
random		(bare · jump — filtered tag/genre list → random pick among only what's shown)
random		(bare · jump — inside a series, no season chosen → random episode from anywhere in the show)
random		(bare · jump — inside one specific season → random episode from that season only)
random		(bare · jump — inside a collection → random movie from it)
```

### Explicit type words override the context
```
random movie		(jump — random pick from all movies)
random movies		(jump — same, plural)
random film		(jump — same, "film" instead of "movie")
random films		(jump — same, plural)
random collection		(jump — random pick from all collections)
random collections		(jump — same, plural)
random set		(jump — same, "set" instead)
random tvshow		(jump — random pick from all shows)
random show		(jump — same, "show" instead)
random series		(jump — same, "series" instead)
```

### With a specific title — `remote`, order-free between `random`/`play` and the title
```
play random movie		(play — random movie, played instead of opened)
play random set		(play — random collection, Play button clicked)
play random tvshow		(play — random show, played instead of opened)
farscape random		(remote · jump — random episode of this show)
random babylon 5		(remote · jump — different show, order swapped)
play stargate sg-1 random		(remote · play — random episode played)
play random stargate atlantis		(remote · play — different show, order swapped)
stargate atlantis play random		(remote · play — different show, "play" moved to the middle)
random play babylon 5		(remote · play — order swapped again)
mission impossible collection random		(remote · jump — random movie of this specific collection)
random mission impossible collection		(remote · jump — same, order swapped)
play random john wick collection		(remote · play — different collection, played)
john wick collection play random		(remote · play — same, "play" moved to the middle)
```
Force a random **season**, a random **movie**, or limit the pick to one **specific season**:
```
farscape random season		(remote · jump — random season page, not a random episode)
random season farscape		(remote · jump — same, order swapped)
play babylon 5 random season		(remote · play — different show, Play clicked on that random season)
dark knight collection random movie		(remote · jump — redundant word, same as without "movie")
stargate sg-1 random s2		(remote · jump — random episode, but only from Season 2)
stargate sg-1 s2 random		(remote · jump — same, order swapped)
random stargate sg-1 s2		(remote · jump — same, "random" moved to the front)
play stargate atlantis random s3		(remote · play — different show/season, played)
play random stargate atlantis s3		(remote · play — same, order swapped)
random play stargate atlantis s3		(remote · play — same, order swapped again)
```

### Nested random — `bare` and `remote`, two type words + `random` twice
```
random tvshow random episode		(jump — random show, then a random episode from anywhere in it)
random show random season		(jump — same idea, different word, a random season instead)
random collection random movie		(jump — random collection, then a random movie from inside it)
random set random movie		(jump — same, "set" instead of "collection")
play random series random episode		(play — random show's random episode, played directly)
play random tvshow random season		(play — random show's random season, Play clicked there)
play random set random movie		(play — random collection's random movie, played directly)
play random collection random movie		(play — same, "collection" instead of "set")
play random tvshow		(play — random show, Play button at series level, no nested pick)
play random collection		(play — random collection, Play button at collection level, no nested pick)
```

### Chapter & percent with random
```
play farscape random chapter 3		(remote · play — random episode, seeks to chapter 3)
play random babylon 5 chapter 3		(remote · play — different show, order swapped)
play stargate sg-1 random season chapter 2		(remote · play — random episode within a random season, seeks to chapter 2)
play random tvshow random episode 50%		(play — random show's random episode, seeks to halfway)
play dark knight collection random 50%		(remote · play — random movie of this collection, seeks to halfway)
```

---

## 8. Playing — `bare` and `remote`, order-free
```
play gladiator		(remote · play — baseline)
armageddon play		(remote · play — different movie, order swapped)
resume con air		(remote · play — same button as "play", see §1)
starship troopers resume		(remote · play — same, order swapped)
replay pearl harbor		(remote · play — different button, forces restart)
blade replay		(remote · play — same, order swapped)
shuffle		(bare · play — current page, not on a single movie or episode)
```
```
farscape season 2 play		(remote · play — Play button on that season)
s2 play		(bare · play — same idea, while already inside the show)
babylon 5 shuffle		(remote · play — Shuffle button on that show's page)
shuffle stargate sg-1		(remote · play — different show, order swapped)
```

### Context-aware play — `bare` and `remote`, no title needed once you're already there
```
play		(bare · play — whatever you're already viewing)
play s2		(bare · play — inside a show, Season 2: first unwatched episode, or from the start)
play e3		(bare · play — inside a season, Episode 3 directly)
play s2e3		(bare · play — inside a show, that specific episode directly)
play farscape		(remote · play — the whole show: first unwatched episode, or from the beginning)
play stargate atlantis s3		(remote · play — that season: first unwatched episode, or from the season's start)
```

### Chapter & percent seeking — `bare` and `remote`, movies/episodes only
```
play gladiator chapter 3		(remote · play — jump to chapter number 3)
play armageddon chaptername		(remote · play — by the chapter's actual name instead of a number — needs a file with named chapters in its metadata)
play con air 0%		(remote · play — the very start, equivalent to a forced replay)
play starship troopers 50%		(remote · play — the halfway point)
play sphere 100%		(remote · play — capped down to 99%, to avoid landing past the end)
play babylon 5 s2e1 chapter 2		(remote · play — specific episode, by chapter number)
play stargate sg-1 s5e14 chaptername		(remote · play — specific episode, by chapter name)
play chapter 3		(bare · play — seeks chapter number in the movie/episode you're already on)
play chaptername		(bare · play — seeks chaptername in the movie/episode you're already on)
play 75%		(bare · play — seeks in the movie/episode you're already on)
```

### Trailer — `bare` and `remote`, order-free, position-free
Trailers are allowed on Movie, Collection, TV Show, and Season level. Only episode level and home videos are excluded.
```
trailer / play trailer / trailer play		(bare · play — current page, all three identical)
play trailer movie gladiator		(remote · play — library identifier and baseline)
armageddon play trailer		(remote · play — different movie, title moved to the front)
trailer play con air		(remote · play — different movie, "trailer" moved to the front)
starship troopers trailer play		(remote · play — different movie, "play" moved to the end)
play sphere trailer		(remote · play — different movie, "trailer" moved to the end)
tvshow falling skies play trailer		(remote · play — library identifier and baseline)
trailer armageddon play		(remote · play — different arrangement)
farscape trailer		(remote · play — trailer at series level)
babylon 5 season 2 trailer		(remote · play — trailer at that specific season's level)
stargate sg-1 s5 trailer		(remote · play — same idea, different show/season)
john wick collection trailer		(remote · play — trailer at collection level)
mission impossible collection trailer		(remote · play — different collection)
```

### Next Up — `bare` and `remote`, order-free, position-free
```
next up		(bare · jump — Next Up episode on the series page you're on)
play next up		(bare · play — same episode, played directly)
farscape next up		(remote · jump — remote version)
tvshow farscape next up		(remote · jump — remote version with library identifier)
next up babylon 5		(remote · jump — different show, order swapped)
play stargate sg-1 next up		(remote · play — different show, played)
play next up stargate atlantis		(remote · play — different show, order swapped)
babylon 5 play next up		(remote · play — different show, "play" moved to the middle)
```

---

## 9. Filter — `bare` and `remote`
```
filter <category> <value> <category> <value> ...
```
**`filter` values**: `played`, `unplayed`, `resumable`/`continue`/`continue watching`, `favorite`/`favorites`/`favourite`/`favourites`/`fav`<br>
**`feature` values**: `subtitle`/`subtitles`, `trailer`/`trailers`, `special feature`/`special features`, `theme song`/`theme songs`, `theme video`/`theme videos`<br>
**`video type` values**: `hd`, `sd`, `4k`, `3d`, `bd`/`bluray`/`blu-ray`, `dvd`<br>
**Category words**: `genre`/`genres` · `year`/`years` · `tag`/`tags` · `rating`/`ratings` · `feature`/`features` · `video type`/`video types` · `filter`/`filters`<br>
```
filter genre war		(bare/remote · single category)
filter genre war year 1998		(bare/remote · two categories at once)
filter genre action year 2000 rating pg-13		(bare/remote · three categories at once)
filter tag based on true events		(bare/remote · tag category)
filter rating r		(bare/remote · rating category)
filter feature trailer		(bare/remote · feature category)
filter video type 4k		(bare/remote · video type category)
filter filter played		(bare/remote · watched-state category)
filter filter favorite		(bare/remote · favourite-state category)
movies filter genre action		(remote · jump then filter)
tag based on true events filter feature trailer		(remote · jump then filter, combined with a tag lookup)
```

### Reset
```
reset filters		(bare/remote · clears every active filter)
movies reset filters		(remote · jump then reset)
reset filters rating pg-13		(bare/remote · removes only that one filter, keeps the rest)
reset filters genre war		(bare/remote · same idea, a genre filter instead)
reset filters year 1998 rating r		(bare/remote · removes two specific filters, keeps any others)
```

---

## 10. Sort — `bare` and `remote`
```
sort <sort-by> <order>
```
**Order**: `ascending`, `descending`<br>
**Everywhere**: `name`, `community rating`/`communityrating`, `date added`/`dateadded`, `date played`/`dateplayed`, `parental rating`/`parentalrating`, `release date`/`releasedate`<br>
**Movies only**: `critics rating`/`criticsrating`, `play count`/`playcount`, `runtime`, `random`<br>
**TVShows only**: `date episode added`/`dateepisodeadded`<br>
**List views only**: `folders`<br>
**Collections tab specifically**: only `name`, `community rating`, `date added`, `parental rating`, `release date`.<br>
```
sort name		(bare/remote · applies sort)
sort community rating		(bare/remote · different sort-by)
sort community rating descending		(bare/remote · sort-by + order together)
sort date added ascending		(bare/remote · different sort-by + order)
sort runtime		(bare/remote · Movies-only sort-by)
sort play count		(bare/remote · different Movies-only sort-by)
sort date episode added		(bare/remote · TVShows-only sort-by)
sort folders		(bare/remote · list-views-only sort-by)
sort ascending		(bare/remote · order only, keeps whatever sort-by was already active)
sort descending		(bare/remote · same, the other direction)
```

---

## 11. View — `bare` and `remote`
```
view <value(s)>
```
**Movies/TVShows**: `banner`, `list`, `poster`, `poster card`/`postercard`, `thumb`, `thumb card`/`thumbcard`<br>
**List views**: `primary`, `banner`, `disc`, `logo`, `thumb`, `list`, plus `show title`/`show the title` (checkbox)<br>
```
view poster		(bare/remote · Movies/TVShows view)
view banner		(bare/remote · different view)
view list		(bare/remote · different view)
view thumb card		(bare/remote · same idea, spaced)
view thumbcard		(bare/remote · same, squashed together)
view primary		(bare/remote · list-view-only value)
view disc		(bare/remote · different list-view-only value)
view logo		(bare/remote · different list-view-only value)
view show title		(bare/remote · just the checkbox, spaced)
view primary show title		(bare/remote · view + the checkbox together)
```

---

## 12. A–Z letter picker — `bare` and `remote`
```
a		(bare · jump — see the fallback table in §1)
letter a		(bare · jump — forced, no fallback ambiguity)
letter b		(bare · jump — different letter)
letter #		(bare · jump — non-alphabetic entries)
tag based on true events letter s		(remote · jump — combinable, runs last regardless of typed position)
movies letter g		(remote · jump — jump to Movies, then to letter G)
```
The same fallback pattern from §1, with its two dedicated real-movie examples:
```
m		(bare · tries the letter picker first, falls back to the movie titled "M")
movie m		(bare · forces the title search, skips the letter picker entirely)
9		(bare · would try a percent-scroll first if the page is scrollable — otherwise falls back to the movie titled "9")
movie 9		(bare · forces the title search for "9")
```

---

## 13. Combining view, sort, filter, and letter

All four can be combined in one line, in any typed order — the script always executes them in the fixed order from §1 (filter → view → sort → ... → letter), regardless of how you typed them:
```
movies view banner sort name letter g		(remote · jump, then view, then sort, then letter)
movies letter g sort name view banner		(remote · same result, typed in reverse)
movies sort name letter g view banner		(remote · same result, yet another typed order)
filter genre war view poster sort name		(bare/remote · filter, then view, then sort — no letter this time)
filter genre war sort name view poster		(bare/remote · same result, filter/sort/view reordered)
movies filter genre action view thumb sort runtime letter d		(remote · all four together, one line)
movies letter d sort runtime view thumb filter genre action		(remote · same result, fully reversed typed order)
```

### Combining multiple filter categories in one line
Filters chain freely — keep adding `<category> <value>` pairs:
```
filter genre war year 1998		(bare/remote · two categories)
filter genre action rating pg-13		(bare/remote · two different categories)
filter genre war year 1998 rating r		(bare/remote · three categories)
filter genre action feature trailer video type 4k		(bare/remote · three categories, feature + video type included)
filter year 1998 rating r feature subtitle video type hd		(bare/remote · four categories at once)
```

### Removing filters again — reset, whole or partial
```
reset filters		(bare/remote · clears every active filter at once)
reset filters year		(bare/remote · removes all years in the filter, keeps any others active)
reset filters year 1998		(bare/remote · removes explicit year filter, keeps any others active)
reset filters genre (bare/remote · removes all genre specific filters, keeps any others)
reset filters genre war (bare/remote · removes explicit war genre specific filter, keeps any others)
reset filters genre war rating r		(bare/remote · removes two specific filters, keeps any others)
reset filters rating r		(bare/remote · removes explicit rating r specific filter, keeps any others)
reset filters rating		(bare/remote · removes all reating specific filters, keeps any others)
movies reset filters		(remote · jump to Movies, then clear all its filters)
movies reset filters genre action		(remote · jump to Movies, then remove just that one filter)
```

---

## 14. Watched — `bare` and `remote`, fully unified: 15 sentence patterns × 4 word spellings

**Sentence patterns** (15, all identical in meaning): `add to`, `add`, `delete from`, `delete`, `mark as`, `mark`, `set to`, `set`, `unmark from`, `unmark`, `unset from`, `unset`, `remove from`, `remove`, `toggle`<br>
**Word spellings** (4, all identical in meaning): `watched`, `unwatched`, `played`, `unplayed`<br>
Plus each spelling works entirely bare, with no pattern at all — 60 patterned + 4 bare = 64 total.
```
watched		(toggle · bare — no pattern needed)
unwatched		(toggle · bare — negated spelling)
played		(toggle · bare — different spelling, same meaning as "watched")
unplayed		(toggle · bare — negated, different spelling)
add to watched		(toggle · bare — pattern "add to")
add watched		(toggle · bare — pattern "add")
delete from watched		(toggle · bare — pattern "delete from")
delete watched		(toggle · bare — pattern "delete")
mark as watched		(toggle · bare — pattern "mark as")
mark watched		(toggle · bare — pattern "mark")
set to unplayed		(toggle · bare — pattern "set to", spelling "unplayed")
set unplayed		(toggle · bare — pattern "set", spelling "unplayed")
unmark from played		(toggle · bare — pattern "unmark from", spelling "played")
unmark played		(toggle · bare — pattern "unmark", spelling "played")
unset from unwatched		(toggle · bare — pattern "unset from", spelling "unwatched")
unset unwatched		(toggle · bare — pattern "unset", spelling "unwatched")
remove from watched		(toggle · bare — pattern "remove from")
remove watched		(toggle · bare — pattern "remove")
toggle played		(toggle · bare — pattern "toggle", spelling "played")
```
```
watched gladiator		(remote prefix · toggle)
armageddon watched		(remote suffix · toggle — different movie, order swapped)
mark played con air		(remote prefix · toggle — different pattern, different movie)
starship troopers mark played		(remote suffix · toggle — order swapped)
toggle unwatched sphere		(remote prefix · toggle — different pattern, different spelling, different movie)
pearl harbor toggle unwatched		(remote suffix · toggle — order swapped)
```

---

## 15. Favorite — `bare` and `remote`, fully unified: 15 sentence patterns × 5 word spellings

**Sentence patterns** (15, identical set to Watched): `add to`, `add`, `delete from`, `delete`, `mark as`, `mark`, `set to`, `set`, `unmark from`, `unmark`, `unset from`, `unset`, `remove from`, `remove`, `toggle`<br>
**Word spellings** (5, all identical in meaning): `favorite`, `favourite`, `favorites`, `favourites`, `fav`<br>
75 phrasings total, no bare-word-only form for this category.
```
add to favorite		(toggle · bare — American singular)
add to favourite		(toggle · bare — British singular)
add favorites		(toggle · bare — American plural, pattern "add")
add favourites		(toggle · bare — British plural, pattern "add")
delete from fav		(toggle · bare — short form, pattern "delete from")
delete fav		(toggle · bare — same spelling, pattern "delete")
mark as favourite		(toggle · bare — pattern "mark as")
mark favorite		(toggle · bare — pattern "mark")
set to favourites		(toggle · bare — pattern "set to")
set favorites		(toggle · bare — pattern "set")
unmark from fav		(toggle · bare — pattern "unmark from")
unmark fav		(toggle · bare — pattern "unmark")
unset from favourite		(toggle · bare — pattern "unset from")
unset favorite		(toggle · bare — pattern "unset")
remove from favourites		(toggle · bare — pattern "remove from")
remove favorites		(toggle · bare — pattern "remove")
toggle fav		(toggle · bare — pattern "toggle", short form)
```
```
mark fav gladiator		(remote prefix · toggle)
armageddon mark fav		(remote suffix · toggle — different movie, order swapped)
toggle favourite con air		(remote prefix · toggle — different pattern, different movie)
starship troopers toggle favourite		(remote suffix · toggle — order swapped)
add to favorites sphere		(remote prefix · toggle — different pattern, different movie)
pearl harbor add to favorites		(remote suffix · toggle — order swapped)
```

---

## 16. Submenu actions — `bare` and `remote`
```
download		(bare · triggers download)
download all		(bare · same, "all" added — startsWith match, catches Jellyfin's own "Download All" button on series/seasons)
add to collection		(bare · opens that submenu action)
addtocollection		(bare · same, squashed together)
add to playlist
addtoplaylist
copy stream url
copystreamurl
edit metadata
editmetadata
edit images
editimages
edit subtitles
editsubtitles
identify
media info
mediainfo
refresh metadata
refreshmetadata
share
delete
```
Downloading works at every level except collections, whole libary and list views — a single movie, a whole series, one season, or one episode:
```
gladiator download		(remote suffix · action — one movie)
download armageddon		(remote prefix · action — different movie, order swapped)
farscape download		(remote suffix · action — the whole show, every episode)
download babylon 5		(remote prefix · action — different show, order swapped)
stargate sg-1 season 5 download		(remote suffix · action — one specific season)
download stargate atlantis s3		(remote prefix · action — different show/season, order swapped, compact form)
download farscape s2e1		(remote prefix · action — one specific episode)
farscape s2e1 download		(remote suffix · action — same, order swapped)
con air mediainfo		(remote suffix · action — squashed spelling, different action)
share sphere		(remote prefix · action — different action, different movie)
```

---

## 17. Pagination & scrolling — `bare` and `remote`

`page`/`pages` are interchangeable throughout this section. Bare `next`/`prev`/`forward`/`previous` (no number, no "page") and a bare number alone (like `21` or `45`) both follow the exact same fallback pattern explained in §1: the navigation/scroll action is tried first, and only falls back to a title search if it isn't available on the current page.

### Between library pages
```
next		(bare/remote · tries the next-page arrow first, falls back to the movie titled "Next")
prev		(bare/remote · tries the previous-page arrow — same fallback logic, no equally-famous "Prev"-titled movie)
next page		(bare/remote · forced page-navigation, no fallback ambiguity)
page next		(bare/remote · same, order swapped)
forward page		(bare/remote · same, "forward" instead of "next")
page forward		(bare/remote · same, order swapped)
previous page		(bare/remote · the other direction)
page previous		(bare/remote · same, order swapped)
prev page		(bare/remote · same, shorter word)
page prev		(bare/remote · same, order swapped)
back page		(bare/remote · same as "previous page" — not the same as bare "back" in §18)
page back		(bare/remote · same, order swapped)
page first		(bare/remote · clicks "previous" repeatedly until disabled — jumps to page 1)
first page		(bare/remote · same, order swapped)
page last		(bare/remote · clicks "next" repeatedly until disabled — jumps to the last page)
last page		(bare/remote · same, order swapped)
```
Multiple jumps at once — number (1–99) and direction word in either order, `page`/`pages` optional:
```
next 3		(bare/remote · clicks "next" three times, 500ms apart)
3 next		(bare/remote · same, order swapped)
page next 3		(bare/remote · same, "page" added for clarity, no effect on the outcome)
3 pages next		(bare/remote · same, "pages" plural, order swapped)
prev 5		(bare/remote · same idea, other direction)
5 prev		(bare/remote · same, order swapped)
pages prev 2		(bare/remote · same, "pages" plural)
2 pages prev		(bare/remote · same, order swapped)
next 10		(bare/remote · a bigger jump)
10 pages next		(bare/remote · same, order swapped)
```
Stops early if it hits the end of the pages.

### Within a page
```
65		(bare/remote · tries scrolling to 50% first, falls back to the movie titled "65")
page 65		(bare/remote · 50% down the page, % sign optional)
page 65%		(bare/remote · same, % sign included)
up		(bare/remote · tries scrolling up first, falls back to the movie titled "Up")
down		(bare/remote · one screen-height down)
top		(bare/remote · forced, instant jump, no animation)
bottom		(bare/remote · the other end)
page top		(bare/remote · forced, instant jump, no animation)
top page		(bare/remote · same, order swapped)
page bottom		(bare/remote · the other end)
bottom page		(bare/remote · same, order swapped)
page down		(bare/remote · one screen-height down)
down page		(bare/remote · same, order swapped)
page up		(bare/remote · one screen-height up)
up page		(bare/remote · same, order swapped)
```
Multiple scroll-screens at once, pure client-side scrolling, no waiting needed between them:
```
34 down		(bare/remote · 34 screen-heights down in one jump)
down 21		(bare/remote · same idea, order swapped, different count)
12 pages down		(bare/remote · same, "pages" plural)
pages down 7		(bare/remote · same, order swapped)
50 up		(bare/remote · same idea, other direction)
up 50		(bare/remote · same, order swapped)
```

### Auto-scroll — `bare`, keeps running until stopped, independent of anything else you type meanwhile
```
scroll		(bare · starts at medium speed)
scroll slow		(bare · starts/switches to slow speed)
slow scroll		(bare · same, order swapped)
scroll slower		(bare · same idea, different word)
scroll fast		(bare · starts/switches to fast speed)
fast scroll		(bare · same, order swapped)
scroll faster		(bare · same idea, different word)
scroll delay 5		(bare · sets a 5-second pause before restarting at the top — only sets the value, doesn't start scrolling by itself)
stop		(bare · stops the auto-scroll)
stop scroll		(bare · same, "scroll" added)
scroll stop		(bare · same, order swapped)
```

---

## 18. Miscellaneous — `bare` unless noted
```
search alien		(bare/remote · opens the search results for "alien")
find gladiator		(bare/remote · same, different trigger word, different title)
reload		(bare · reloads the current page)
refresh		(bare · same, different word)
back		(bare · the browser's own back button — not the same as "back page"/"page back" in §17, which page-navigates instead)
fullscreen		(bare · enters fullscreen)
window		(bare · exits fullscreen)
windowed		(bare · same, different word)
```
