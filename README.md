# Jellyfin Keyboard Navigation — Command Reference

A Tampermonkey/Violentmonkey userscript that lets you control Jellyfin entirely by typing. Start typing anywhere in the web UI (not while a video is playing) and press **Enter** to run a command, **Backspace** to edit, **Escape** to clear.

Most commands can be **combined** — the script strips out recognized modifiers (filter, sort, view, letter, list actions...) from anywhere in your sentence and applies them in order after resolving the target:

```
target → filter → view → sort → reset → play/shuffle/watched/favorite/submenu → letter
```

---

## 1. Navigating to a library

```
Remote from everywhere:
movie(s) / film(s)
tvshow(s) / show(s) / tv / series
livetv / live / pvr
set(s) / collection(s)

From Home:
custom libary names (not hardcoded)
From Home Videos nested folder structure:
custom video folder names (not hardcoded)
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
star trek voyager
```
" - ", ": " and "(...)" are automatically parsed out, but they can be entered if desired.

### Season / Episode
```
Farscape season 2
Farscape s2
Farscape s2e5
Farscape specials             (= season 0)
Farscape s0                   (= specials)
```
It supports both "S01E01" and "S1E1". The 0 is parsed automatically. It also supports "S01:E01" / "S1:E1", the : is parsed automatically as well.

### Context shortcuts (while already inside a series/season/episode)
```
s2 / season 2
e5 / episode 5
s2e5
```
It supports both "S01E01" and "S1E1". The 0 is parsed automatically. It also supports "S01:E01" / "S1:E1", the : is parsed automatically as well.

### People
```
person keanu reeves                (his profile page)
movies persons keanu reeves        (his movies — order-independent, e.g. also "persons movies keanu reeves")
tvshows actors keanu reeves        (his TV shows)
episode actors keanu reeves        (his individual episode appearances)
```
Person triggers: `person, persons, actor, actors, actress, actresses, people, peoples, celebrity, celeb`
Media-type triggers: `movie/movies/film/films`, `tvshow/tvshows/series/show/shows/tv`, `episode/episodes`

### Genres (locked-library)
```
tvshows genre action
movies genre horror
```

### Tags, genres, studios (mixed, cross-library)
```
tag star trek films
genre action
studio warner bros
```

### Random picks
```
random                                           (random movie, tvshow or collection)
random movie / random show / random collection
random set random movie                          (nested — random pick from within a random pick)
random tvshow random episode                     (nested — random pick from within a random pick)
```

---

## 3. Playing

```
play titanic                       (triggers the resume button if there is already a marker in it)
titanic play                       (either order gives the same result)
resume titanic                     (triggers the resume button if there is already a marker in it)
replay titanic                     (forced triggered replay)
shuffle                            (Only on tvshows, seasons, collections, not movie or episode level)
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
reset filters                      (current page, resets all filters)
movies reset filters               (remote jumbs to movie libary and then resets all filters)
tags star trek films reset filters (remote jumbs to tag an then resets all filters)
reset filters rating pg-13         (current page, removes only that filter, keeps the rest)
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
sort name                          (current page)
sort community rating descending   (current page, combination of sort type + descending/ascending)
sort ascending                     (current page, order only, keeps current sort-by)
movies sort random                 (remote jumb to movie libary, then applies sort)
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
movies genre comedy view banner sort name
```

---

## 7. Watched / Favorite / Submenu (single items)

```
watched / mark as watched / mark played / set watched / unset watched
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
a                                          (current page, tries navigating first, falls back to the letter picker)
letter a                                   (current page, letter picker override)
letter #                                   (current page, letter picker override)
movies filter genre comedy letter s        (remote jump, combinable, always runs last)
movies view banner letter b                (remote jump, combinable, always runs last)
tvshows sort name letter f                 (remote jump, combinable, always runs last)
tag "tagname" letter k                     (remote jump, combinable, always runs last) 
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
