# Jellyfin Keyboard Navigation — Command Reference

A Tampermonkey/Violentmonkey userscript that lets you control Jellyfin entirely by typing. Start typing anywhere in the web UI (not while a video is playing) and press **Enter** to run a command, **Backspace** to edit, **Escape** to clear.

Most commands can be **combined** — the script strips out recognized modifiers (filter, sort, view, letter, list actions...) from anywhere in your sentence and applies them in order after resolving the target:

```
target → filter → view → sort → reset → play/shuffle/watched/favorite/submenu → letter
```

---

## 1. Navigating to a library

```
movies
tvshows
livetv
sets / collections
homevideos
```
Also works with the library's own custom name from your server.

### Library tabs (per library type)

**movies**
```
movies suggestions
movies trailers
movies favorites
movies collections
movies genres comedy        (jump straight into a genre section)
```

**tvshows**
```
tvshows suggestions
tvshows upcoming
tvshows tv networks / tvshows networks / tvshows studios
tvshows episodes
tvshows genres action
```

**livetv**
```
livetv programs
livetv guide
livetv channels
livetv recordings
livetv schedule
livetv series
```

If you're already inside the matching library, drop the prefix (`suggestions`, `genres action`, ...).

### Home / Favourites
```
home
favourites / favorites / fav
fav movies / fav shows            (jump into a section of the favourites page)
```

---

## 2. Finding media

```
titanic
titanic 1997
tos                                (aliases like ds9, voy, tng, pic... expand automatically)
star trek voyager
```

### Season / Episode
```
star trek ds9 season 2
star trek ds9 s2
star trek ds9 s2e5
star trek ds9 specials             (= season 0)
```

### Context shortcuts (while already inside a series/season/episode)
```
s2 / season 2
e5 / episode 5
s2e5
```

### Collections & People
```
matrix collection
person keanu reeves                (his profile page)
movies persons keanu reeves        (his movies — order-independent, e.g. also "persons movies keanu reeves")
tvshows actors keanu reeves        (his TV shows)
episode actors keanu reeves        (his individual episode appearances)
```
Person triggers: `person, persons, actor, actors, actress, actresses, people, peoples, celebrity, celeb`
Media-type triggers: `movie/movies/film/films`, `tvshow/tvshows/series/show/shows/tv`, `episode/episodes`

### Tags, genres, studios (mixed, cross-library)
```
tag star trek films
genre action
studio warner bros
```

### Random picks
```
random
random movie / random show / random collection
random movie random                (nested — random pick from within a random pick)
```

---

## 3. Playing

```
play titanic
titanic play                       (either order gives the same result)
resume titanic
replay titanic
shuffle
```
`play`/`replay`/`resume` also work as a suffix on almost any target: `star trek ds9 season 2 play`, `s2 play`. On series/season/collections this clicks the visible Play/Shuffle button; on movies/episodes it plays directly, distinguishing resume vs. replay.

### Chapter & percent seeking (movies/episodes, prefix form only)
```
play titanic chapter 3
play titanic 50%
play voyager s4e1 chapter 2
```

### Trailer
```
play trailer titanic
titanic play trailer               (any order/position of "play" + "trailer" works)
trailer                            (bare, current page)
```
Works on movies, series, seasons, collections — not individual episodes.

---

## 4. Filter

```
filter <category> <value> <category> <value> ...
```
Works bare (current page), remotely (`movies filter ...`), and on mixed views (`tags star trek films filter ...`).

| Category word(s) | What it filters |
|---|---|
| `genre` / `genres` | Genre |
| `year` / `years` | Production year |
| `tag` / `tags` | Tag |
| `rating` / `ratings` | Parental rating |
| `feature` / `features` | See values below |
| `video type` / `video types` | See values below |
| `filter` / `filters` | See values below |

**`filter` values:** `played`, `unplayed`, `resumable` / `continue` / `continue watching`, `favorite` / `favorites` / `fav`

**`feature` values:** `subtitle`/`subtitles`, `trailer`/`trailers`, `special feature`/`special features`/`extra`/`extras`, `theme song`/`theme songs`, `theme video`/`theme videos`

**`video type` values:** `hd`, `sd`, `4k`, `3d`, `bd`/`bluray`/`blu-ray`, `dvd`

```
filter genre comedy year 2020
movies filter genre action rating pg-13
tags star trek films filter feature trailer
```

### Reset
```
reset filters
movies reset filters
tags star trek films reset filters
reset filters rating pg-13         (removes only that filter, keeps the rest)
```

---

## 5. Sort

```
sort <sort-by> <order>
```
Same command works whether you're on a movies/tvshows page (radio dialog) or a list view like tags/sets/homevideos (dropdown) — the script picks the right mechanism automatically. Not every value exists on every page type.

**Order:** `ascending`, `descending`

**Sort by — available everywhere:** `name`, `community rating`/`communityrating`, `date added`/`dateadded`, `date played`/`dateplayed`, `parental rating`/`parentalrating`, `release date`/`releasedate`

**Only on movies:** `critics rating`/`criticsrating`, `play count`/`playcount`, `runtime`, `random`

**Only on tvshows:** `date episode added`/`dateepisodeadded`

**Only on list views (tags/sets/homevideos/...):** `folders`

```
sort name
sort community rating descending
sort ascending                     (order only, keeps current sort-by)
movies sort random
```

---

## 6. View (display style / image type)

```
view <value(s)>
```
Same command, auto-detects the mechanism (action sheet on movies/tvshows, dropdown elsewhere).

**On movies/tvshows:** `banner`, `list`, `poster`, `poster card`/`postercard`, `thumb`, `thumb card`/`thumbcard`

**On list views (tags/sets/homevideos/...):** `primary`, `banner`, `disc`, `logo`, `thumb`, `list`, plus `show title`/`show the title` (checkbox, combinable: `view primary show title`)

```
view poster
view primary show title
movies genre comedy view banner sort name letter c
```

---

## 7. Watched / Favorite / Submenu (single items)

```
watched
mark as watched / mark played / set watched / unset watched
add to favorites / mark as favorite / set fav / unmark fav
```
Work bare (current page), as a remote prefix (`watched titanic`), and as a remote suffix (`titanic watched`).

### Submenu
```
download / download all
add to collection / addtocollection
add to playlist / addtoplaylist
copy stream url / copystreamurl
edit metadata / editmetadata
edit images / editimages
edit subtitles / editsubtitles
identify
media info / mediainfo
refresh metadata / refreshmetadata
share
delete
```
```
titanic download
download s1e1 star trek ds9
```

---

## 8. A–Z letter picker

```
a                                  (tries navigating first, falls back to the letter picker)
letter a
letter #
tags star trek films letter s      (combinable, always runs last)
```

---

## 9. Miscellaneous

```
search alien / find alien
reload / refresh
back
fullscreen
window / windowed
```

### Page jump (instant, no animation)
```
page top / page bottom / page down / page up
page 50 / page 50%
top / bottom / down / up / 50%     (tries navigating first, falls back to scrolling)
```

### Auto-scroll (keeps running until stopped, independent of other commands)
```
scroll                             (starts at medium speed)
scroll slow / scroll fast
scroll delay 5                     (pause in seconds before restarting at the top; default 0)
stop / stop scroll
```
