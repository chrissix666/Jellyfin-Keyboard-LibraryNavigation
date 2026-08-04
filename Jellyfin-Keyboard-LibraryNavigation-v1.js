(function () {
  "use strict";
  const CONFIG = {
    idleResetMs: 2500, // ms of inactivity before the input buffer resets
    minLength: 1, // minimum characters before Enter triggers a command
    preventSpaceScroll: "smart", // true = always block, false = never block, "smart" = only block once you've already started typing a command (default)
    showIndicator: true, // show input buffer overlay
    indicatorCorner: "top-center", // top-left, top-right, bottom-left, bottom-right, top-center, center-center, bottom-center
    // Additional offset from the corner above, in vw/vh (percent of window width/height)
    // instead of pixels - stays resolution-independent this way. Positive X = further right,
    // positive Y = further down, regardless of which corner the indicator is anchored to.
    indicatorOffsetX: "0vw",
    indicatorOffsetY: "6vh",
    indicatorColor: "#00ff41", // indicator text color, any RGB hex code works
  };
  const COLLECTION_KEYWORDS = [
    "collection", "filmreihe", "anthology", "saga", "set",
    "colecao",
    "coleccion",
    "collectie",
    "collezione",
    "kolekcja",
    "kolekce",
    "kolekcia",
    "kolekcija",
    "zbirka",
    "colectie",
    "gyujtemeny",
    "kokoelma",
    "samling",
    "koleksiyon",
  ];
  const PERSON_KEYWORDS = ["person", "persons", "actor", "actors", "actress", "actresses", "people", "peoples", "celebrity", "celeb"];
  const PERSON_MEDIA_TYPE_KEYWORDS = {
    movie: "Movie", movies: "Movie", film: "Movie", films: "Movie",
    tvshow: "Series", tvshows: "Series", series: "Series", show: "Series", shows: "Series", tv: "Series",
    episode: "Episode", episodes: "Episode",
  };
  const MOVIE_TYPE_KEYWORDS = ["movie", "movies", "film", "films"];
  const SERIES_TYPE_KEYWORDS = ["tvshow", "tvshows", "series", "show", "shows", "tv"];
  const EPISODE_FILLER_WORDS = ["episode", "episodes"];
  const ALIASES = {
    ds9: ["deep space nine"],
    voy: ["voyager", "raumschiff voyager"],
    voyager: ["raumschiff voyager"],
    ent: ["enterprise"],
    dsc: ["discovery"],
    tos: ["the original series", "raumschiff enterprise"],
    pic: ["picard"],
    snw: ["strange new worlds"],
    low: ["lower decks"],
    pro: ["prodigy"],
    tas: ["the animated series"],
    tng: ["the next generation", "raumschiff enterprise das nächste jahrhundert"],
  };
  let buffer = "";
  let idleTimer = null;
  let indicatorEl = null;
  let commandToken = 0;
  let autoScrollActive = false;
  let autoScrollSpeedIndex = 1;
  const AUTO_SCROLL_SPEEDS = [0.03, 0.06, 0.2];
  let autoScrollDelaySeconds = 0;
  let autoScrollTopPending = true;
  function computeIndicatorPosition(corner, offsetX, offsetY) {
    const style = { top: "", left: "", right: "", bottom: "", transform: "" };
    const transforms = [];
    if (corner.startsWith("top")) {
      style.top = `calc(12px + ${offsetY})`;
    } else if (corner.startsWith("bottom")) {
      style.bottom = `calc(12px - ${offsetY})`;
    } else {
      style.top = `calc(50% + ${offsetY})`;
      transforms.push("translateY(-50%)");
    }
    if (corner.endsWith("left")) {
      style.left = `calc(12px + ${offsetX})`;
    } else if (corner.endsWith("right")) {
      style.right = `calc(12px - ${offsetX})`;
    } else {
      style.left = `calc(50% + ${offsetX})`;
      transforms.push("translateX(-50%)");
    }
    style.transform = transforms.join(" ");
    return style;
  }
  function ensureIndicator() {
    if (!CONFIG.showIndicator || indicatorEl) return;
    indicatorEl = document.createElement("div");
    const cornerStyle = computeIndicatorPosition(
      CONFIG.indicatorCorner || "top-center",
      CONFIG.indicatorOffsetX || "0vw",
      CONFIG.indicatorOffsetY || "0vh"
    );
    Object.assign(indicatorEl.style, {
      position: "fixed",
      ...cornerStyle,
      padding: "4px 10px",
      background: "rgba(0,0,0,0.6)",
      color: CONFIG.indicatorColor,
      fontFamily: "monospace",
      fontSize: "13px",
      borderRadius: "6px",
      zIndex: 999999,
      pointerEvents: "none",
      opacity: "0",
      transition: "opacity 0.15s ease",
    });
    document.body.appendChild(indicatorEl);
  }
  function updateIndicator(text) {
    if (!CONFIG.showIndicator) return;
    ensureIndicator();
    indicatorEl.textContent = text;
    indicatorEl.style.color = CONFIG.indicatorColor;
    indicatorEl.style.opacity = text ? "1" : "0";
  }
  function flashResult(ok) {
    if (!CONFIG.showIndicator || !indicatorEl) return;
    indicatorEl.style.color = ok ? "#4caf50" : "#f44336";
    setTimeout(() => {
      indicatorEl.style.opacity = "0";
    }, 700);
  }
  function isVideoPlaying() {
    return document.querySelectorAll("video").length > 0;
  }
  function isTypingInRealField(target) {
    if (!target) return false;
    const tag = target.tagName;
    return (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      target.isContentEditable
    );
  }
  function resetBuffer() {
    buffer = "";
    updateIndicator("");
  }
  function scheduleIdleReset() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(resetBuffer, CONFIG.idleResetMs);
  }
  document.addEventListener("keydown", (e) => {
    if (isTypingInRealField(document.activeElement)) return;
    if (isVideoPlaying()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "Enter") {
      e.preventDefault();
      processBuffer();
      return;
    }
    if (e.key === "Escape") {
      resetBuffer();
      return;
    }
    if (e.key === "Backspace") {
      buffer = buffer.slice(0, -1);
      updateIndicator(buffer);
      scheduleIdleReset();
      return;
    }
    if (e.key.length === 1) {
      if (e.key === " " && CONFIG.preventSpaceScroll === "smart" && buffer.length === 0) {
        return;
      }
      if (e.key === " " && (CONFIG.preventSpaceScroll === true || CONFIG.preventSpaceScroll === "smart")) e.preventDefault();
      const charToAdd = e.key === "_" ? " " : e.key;
      buffer += charToAdd;
      updateIndicator(buffer);
      scheduleIdleReset();
    }
  }, true);
  function normalizeBase(str) {
    return (str || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+[-–—]\s+/g, " ")
      .replace(/:\s+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function squash(str) {
    return normalizeBase(str).replace(/\s+/g, "");
  }
  function titleCase(str) {
    return str.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  const FILTER_CATEGORY_WORDS = {
    genre: "Genres", genres: "Genres",
    year: "Years", years: "Years",
    tag: "Tags", tags: "Tags",
    rating: "OfficialRatings", ratings: "OfficialRatings",
    feature: "Features", features: "Features",
    filter: "Filters", filters: "Filters",
  };
  const FILTERS_VALUE_MAP = {
    played: "IsPlayed",
    unplayed: "IsUnplayed",
    resumable: "IsResumable",
    continue: "IsResumable",
    "continue watching": "IsResumable",
    favorite: "IsFavorite",
    favorites: "IsFavorite",
    favourite: "IsFavorite",
    favourites: "IsFavorite",
    fav: "IsFavorite",
  };
  const FEATURES_VALUE_MAP = {
    subtitle: "HasSubtitles",
    subtitles: "HasSubtitles",
    trailer: "HasTrailer",
    trailers: "HasTrailer",
    "special feature": "HasSpecialFeature",
    "special features": "HasSpecialFeature",
    extra: "HasSpecialFeature",
    extras: "HasSpecialFeature",
    "theme song": "HasThemeSong",
    "theme songs": "HasThemeSong",
    "theme video": "HasThemeVideo",
    "theme videos": "HasThemeVideo",
  };
  const VIDEOTYPE_VALUE_MAP = {
    hd: { param: "IsHD", value: "true" },
    sd: { param: "IsHD", value: "false" },
    "4k": { param: "Is4K", value: "true" },
    "3d": { param: "Is3D", value: "true" },
    bd: { param: "VideoTypes", value: "BluRay" },
    bluray: { param: "VideoTypes", value: "BluRay" },
    "blu-ray": { param: "VideoTypes", value: "BluRay" },
    dvd: { param: "VideoTypes", value: "Dvd" },
  };
  const FILTER_PARAM_PIPE = ["Genres", "Tags", "OfficialRatings"];
  const FILTER_PARAM_COMMA = ["Years", "Filters", "VideoTypes"];
  function matchFilterCategoryAt(tokens, i) {
    if (tokens[i] === "video" && (tokens[i + 1] === "type" || tokens[i + 1] === "types")) {
      return { category: "VideoTypes", consumed: 2 };
    }
    if (FILTER_CATEGORY_WORDS[tokens[i]]) {
      return { category: FILTER_CATEGORY_WORDS[tokens[i]], consumed: 1 };
    }
    return null;
  }
  function parseFilterChain(tokens) {
    const chain = {};
    let currentCategory = "Filters";
    function pushValue(category, value) {
      if (!chain[category]) chain[category] = [];
      chain[category].push(value);
    }
    let i = 0;
    while (i < tokens.length) {
      const m = matchFilterCategoryAt(tokens, i);
      if (m) {
        currentCategory = m.category;
        i += m.consumed;
        continue;
      }
      if (currentCategory === "Features" || currentCategory === "Filters") {
        const twoWord = i + 1 < tokens.length ? `${tokens[i]} ${tokens[i + 1]}` : null;
        const twoWordMap = currentCategory === "Features" ? FEATURES_VALUE_MAP : FILTERS_VALUE_MAP;
        if (twoWord && twoWordMap[twoWord]) {
          pushValue(currentCategory, twoWord);
          i += 2;
          continue;
        }
      }
      pushValue(currentCategory, tokens[i]);
      i++;
    }
    return chain;
  }
  function buildFilterParams(chain) {
    const params = {};
    function addParam(name, value) {
      if (!params[name]) params[name] = [];
      params[name].push(value);
    }
    Object.entries(chain).forEach(([category, values]) => {
      values.forEach((raw) => {
        const lower = raw.toLowerCase().trim();
        if (category === "Filters") {
          const mapped = FILTERS_VALUE_MAP[lower];
          if (mapped) addParam("Filters", mapped);
          return;
        }
        if (category === "Features") {
          const mapped = FEATURES_VALUE_MAP[lower];
          if (mapped) addParam(mapped, "true");
          return;
        }
        if (category === "VideoTypes") {
          const mapped = VIDEOTYPE_VALUE_MAP[lower];
          if (mapped) addParam(mapped.param, mapped.value);
          return;
        }
        if (category === "Years") {
          addParam("Years", raw.trim());
          return;
        }
        addParam(category, titleCase(raw.trim()));
      });
    });
    return params;
  }
  function filterParamsToQueryObject(filterParams) {
    if (!filterParams) return {};
    const out = {};
    Object.entries(filterParams).forEach(([name, values]) => {
      if (FILTER_PARAM_PIPE.includes(name)) {
        out[name] = values.join("|");
      } else if (FILTER_PARAM_COMMA.includes(name)) {
        out[name] = [...new Set(values)].join(",");
      } else {
        out[name] = values[values.length - 1];
      }
    });
    return out;
  }
  const FILTERS_UI_LABELS = {
    played: "Played",
    unplayed: "Unplayed",
    resumable: "Continue watching",
    continue: "Continue watching",
    "continue watching": "Continue watching",
    favorite: "Favorite",
    favorites: "Favorite",
    favourite: "Favorite",
    favourites: "Favorite",
    fav: "Favorite",
  };
  const FEATURES_UI_LABELS = {
    subtitle: "Subtitles",
    subtitles: "Subtitles",
    trailer: "Trailers",
    trailers: "Trailers",
    extra: "Extras",
    extras: "Extras",
    "special feature": "Extras",
    "special features": "Extras",
    "theme song": "Theme songs",
    "theme songs": "Theme songs",
    "theme video": "Theme videos",
    "theme videos": "Theme videos",
  };
  const VIDEOTYPE_UI_LABELS = {
    hd: "HD",
    sd: "SD",
    "4k": "4K",
    "3d": "3D",
    bd: "Blu-ray",
    bluray: "Blu-ray",
    "blu-ray": "Blu-ray",
    dvd: "DVD",
  };
  const CATEGORY_SECTION_HEADERS = {
    Features: ["Features"],
    Genres: ["Genres"],
    OfficialRatings: ["Parental Ratings"],
    Tags: ["Tags"],
    VideoTypes: ["Video Types", "Video Type"],
    Years: ["Years"],
  };
  function resolveUiLabel(category, raw) {
    const lower = raw.toLowerCase().trim();
    if (category === "Filters") return FILTERS_UI_LABELS[lower] || null;
    if (category === "Features") return FEATURES_UI_LABELS[lower] || null;
    if (category === "VideoTypes") return VIDEOTYPE_UI_LABELS[lower] || null;
    return titleCase(raw.trim());
  }
  function findByExactText(selector, text, scope) {
    const candidates = (scope || document).querySelectorAll(selector);
    for (const el of candidates) {
      if (el.textContent.trim().toLowerCase() === text.toLowerCase()) return el;
    }
    return null;
  }
  function findFilterSection(labels) {
    const targets = labels.map((l) => l.toLowerCase().trim());
    const collapseSections = document.querySelectorAll('[is="emby-collapse"]');
    for (const el of collapseSections) {
      const attr = (el.getAttribute("title") || "").toLowerCase().trim();
      if (targets.includes(attr)) return { scope: el, needsExpand: true };
    }
    const headings = document.querySelectorAll(".checkboxListLabel");
    for (const h of headings) {
      const text = h.textContent.trim().toLowerCase();
      if (targets.includes(text)) {
        const scope = h.closest(".verticalSection") || h.parentElement || h;
        return { scope, needsExpand: false };
      }
    }
    return null;
  }
  function isCollapseExpanded(el) {
    if (el.classList.contains("expanded") || el.getAttribute("data-expanded") === "true") return true;
    const content = el.querySelector(".collapseContent");
    if (!content) return false;
    return content.offsetHeight > 0 && getComputedStyle(content).display !== "none";
  }
  function clickCollapseHeader(el) {
    const header =
      el.querySelector("button, .emby-collapsible-header, .emby-collapsible-button, h2, h3") || el;
    header.click();
  }
  function waitForLabelInScope(scope, text, token, timeoutMs = 4000, intervalMs = 150) {
    return new Promise((resolve) => {
      const start = Date.now();
      const tryFind = () => {
        if (token !== commandToken) {
          resolve(null);
          return;
        }
        const label = findByExactText("label", text, scope);
        if (label) {
          resolve(label);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          resolve(null);
          return;
        }
        setTimeout(tryFind, intervalMs);
      };
      tryFind();
    });
  }
  const FILTER_BUTTON_SELECTORS = [
    '[title="Filter"]',
    ".btnFilter",
    'button[data-action="filter"]',
    ".filterButton",
  ];
  function hasVisibleFilterButtonNow() {
    for (const sel of FILTER_BUTTON_SELECTORS) {
      const candidates = document.querySelectorAll(sel);
      for (const el of candidates) {
        if (el.offsetParent !== null) return true;
      }
    }
    return false;
  }
  function alphaPickerSelector(value) {
    return `.alphaPickerButton[data-value="${value}"]`;
  }
  const ACTIONSHEET_DATA_ID = { Banner: "Banner", List: "List", Poster: "Poster", PosterCard: "PosterCard", Thumb: "Thumb", ThumbCard: "ThumbCard" };
  const SELECT_OPTION_VALUE = { Primary: "primary", Banner: "banner", Disc: "disc", Logo: "logo", Thumb: "thumb", List: "list" };
  const ALL_VIEW_TERMS = [
    { phrase: "poster card", value: "PosterCard" },
    { phrase: "postercard", value: "PosterCard" },
    { phrase: "thumb card", value: "ThumbCard" },
    { phrase: "thumbcard", value: "ThumbCard" },
    { phrase: "show the title", value: "ShowTitle" },
    { phrase: "show title", value: "ShowTitle" },
    { phrase: "poster", value: "Poster" },
    { phrase: "banner", value: "Banner" },
    { phrase: "list", value: "List" },
    { phrase: "thumb", value: "Thumb" },
    { phrase: "primary", value: "Primary" },
    { phrase: "disc", value: "Disc" },
    { phrase: "logo", value: "Logo" },
  ].sort((a, b) => b.phrase.split(" ").length - a.phrase.split(" ").length);
  function extractViewOverride(tokens) {
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] !== "view") continue;
      let pos = i + 1;
      const values = [];
      while (pos < tokens.length) {
        let matched = null;
        for (const term of ALL_VIEW_TERMS) {
          const words = term.phrase.split(" ");
          if (pos + words.length > tokens.length) continue;
          if (tokens.slice(pos, pos + words.length).join(" ") === term.phrase) {
            matched = { value: term.value, wordCount: words.length };
            break;
          }
        }
        if (!matched) break;
        values.push(matched.value);
        pos += matched.wordCount;
      }
      if (values.length > 0) return { values, startIndex: i, endIndex: pos };
      return null;
    }
    return null;
  }
  const RADIO_SORTBY_DATA_ID_MOVIES = {
    Name: "SortName,ProductionYear",
    Random: "Random",
    CommunityRating: "CommunityRating,SortName,ProductionYear",
    CriticsRating: "CriticRating,SortName,ProductionYear",
    DateAdded: "DateCreated,SortName,ProductionYear",
    DatePlayed: "DatePlayed,SortName,ProductionYear",
    ParentalRating: "OfficialRating,SortName,ProductionYear",
    PlayCount: "PlayCount,SortName,ProductionYear",
    ReleaseDate: "PremiereDate,SortName,ProductionYear",
    Runtime: "Runtime,SortName,ProductionYear",
  };
  const RADIO_SORTBY_DATA_ID_MOVIES_SETS = {
    Name: "SortName",
    CommunityRating: "CommunityRating,SortName",
    DateAdded: "DateCreated,SortName",
    ParentalRating: "OfficialRating,SortName",
    ReleaseDate: "PremiereDate,SortName",
  };
  const RADIO_SORTBY_DATA_ID_TVSHOWS = {
    Name: "SortName",
    Random: "Random",
    CommunityRating: "CommunityRating,SortName",
    DateAdded: "DateCreated,SortName",
    DateEpisodeAdded: "DateLastContentAdded,SortName",
    DatePlayed: "SeriesDatePlayed,SortName",
    ParentalRating: "OfficialRating,SortName",
    ReleaseDate: "PremiereDate,SortName",
  };
  const RADIO_SORTORDER_VALUE = { Ascending: "Ascending", Descending: "Descending" };
  const SELECT_SORTBY_OPTION_VALUE = {
    Name: "SortName",
    CommunityRating: "CommunityRating,SortName",
    CriticsRating: "CriticRating,SortName",
    DateAdded: "DateCreated,SortName",
    DatePlayed: "DatePlayed,SortName",
    Folders: "IsFolder,SortName",
    ParentalRating: "OfficialRating,SortName",
    PlayCount: "PlayCount,SortName",
    ReleaseDate: "ProductionYear,PremiereDate,SortName",
    Runtime: "Runtime,SortName",
  };
  const SELECT_SORTORDER_OPTION_VALUE = { Ascending: "Ascending", Descending: "Descending" };
  function extractResetOverride(tokens) {
    for (let i = 0; i < tokens.length - 1; i++) {
      if (tokens[i] !== "reset") continue;
      if (tokens[i + 1] !== "filter" && tokens[i + 1] !== "filters") continue;
      if (i === 0) return null;
      return { startIndex: i, rest: tokens.slice(i + 2) };
    }
    return null;
  }
  const ALL_SORT_TERMS = [
    { phrase: "community rating", value: "CommunityRating" },
    { phrase: "communityrating", value: "CommunityRating" },
    { phrase: "critics rating", value: "CriticsRating" },
    { phrase: "criticsrating", value: "CriticsRating" },
    { phrase: "date episode added", value: "DateEpisodeAdded" },
    { phrase: "dateepisodeadded", value: "DateEpisodeAdded" },
    { phrase: "date added", value: "DateAdded" },
    { phrase: "dateadded", value: "DateAdded" },
    { phrase: "date played", value: "DatePlayed" },
    { phrase: "dateplayed", value: "DatePlayed" },
    { phrase: "parental rating", value: "ParentalRating" },
    { phrase: "parentalrating", value: "ParentalRating" },
    { phrase: "play count", value: "PlayCount" },
    { phrase: "playcount", value: "PlayCount" },
    { phrase: "release date", value: "ReleaseDate" },
    { phrase: "releasedate", value: "ReleaseDate" },
    { phrase: "name", value: "Name" },
    { phrase: "random", value: "Random" },
    { phrase: "folders", value: "Folders" },
    { phrase: "runtime", value: "Runtime" },
    { phrase: "ascending", value: "Ascending" },
    { phrase: "descending", value: "Descending" },
  ].sort((a, b) => b.phrase.split(" ").length - a.phrase.split(" ").length);
  function extractSortOverride(tokens) {
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] !== "sort") continue;
      let pos = i + 1;
      const values = [];
      while (pos < tokens.length) {
        let matched = null;
        for (const term of ALL_SORT_TERMS) {
          const words = term.phrase.split(" ");
          if (pos + words.length > tokens.length) continue;
          if (tokens.slice(pos, pos + words.length).join(" ") === term.phrase) {
            matched = { value: term.value, wordCount: words.length };
            break;
          }
        }
        if (!matched) break;
        values.push(matched.value);
        pos += matched.wordCount;
      }
      if (values.length > 0) return { values, startIndex: i, endIndex: pos };
      return null;
    }
    return null;
  }
  function clickSelectorsWhenReady(selectors, token, timeoutMs = 5000, intervalMs = 150) {
    return new Promise((resolve) => {
      const start = Date.now();
      const tryClick = () => {
        if (token !== commandToken) {
          resolve(false);
          return;
        }
        for (const sel of selectors) {
          const candidates = document.querySelectorAll(sel);
          for (const el of candidates) {
            if (el.offsetParent !== null) {
              el.click();
              resolve(true);
              return;
            }
          }
        }
        if (Date.now() - start > timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(tryClick, intervalMs);
      };
      tryClick();
    });
  }
  const DIALOG_CLOSE_SELECTORS = [
    ".dlgFilter .btnCloseDialog",
    ".formDialogHeader .btnCloseDialog",
    "button.btnCloseDialog",
    '.formDialogHeader button[is="paper-icon-button-light"]',
    ".dialog .btnCancel",
  ];
  function isFilterDialogOpen() {
    const selectors = ['.resetFilters', '[is="emby-collapse"]', ".checkboxListLabel", ".basicFilterSection"];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        if (el.offsetParent !== null) return true;
      }
    }
    return false;
  }
  function isSortDialogOpen() {
    const radios = document.querySelectorAll('input[name="SortBy"], input[name="SortOrder"]');
    for (const r of radios) {
      if (r.offsetParent !== null) return true;
    }
    return false;
  }
  function removeOrphanedDialogBackdrops() {
    const leftovers = document.querySelectorAll(".dialog");
    leftovers.forEach((el) => el.remove());
  }
  function waitWhile(conditionFn, timeoutMs, intervalMs = 100) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (!conditionFn() || Date.now() - start > timeoutMs) {
          resolve();
          return;
        }
        setTimeout(check, intervalMs);
      };
      check();
    });
  }
  const HEADER_CLOSE_SELECTORS = [
    ".formDialogHeader .btnCancel",
    '.formDialogHeader button[is="paper-icon-button-light"]',
  ];
  async function closeFilterDialog() {
    if (!isFilterDialogOpen()) {
      removeOrphanedDialogBackdrops();
      return true;
    }
    for (const sel of [...HEADER_CLOSE_SELECTORS, ...DIALOG_CLOSE_SELECTORS]) {
      const candidates = document.querySelectorAll(sel);
      const btn = [...candidates].find((el) => el.offsetParent !== null);
      if (btn) {
        btn.click();
        await waitWhile(isFilterDialogOpen, 400);
        if (!isFilterDialogOpen()) {
          removeOrphanedDialogBackdrops();
          return true;
        }
      }
    }
    window.history.back();
    await waitWhile(isFilterDialogOpen, 400);
    if (!isFilterDialogOpen()) {
      removeOrphanedDialogBackdrops();
      return true;
    }
    const container = document.querySelector(".dialogContainer");
    if (container) {
      container.remove();
      await waitWhile(isFilterDialogOpen, 200);
      if (!isFilterDialogOpen()) {
        removeOrphanedDialogBackdrops();
        return true;
      }
    }
    console.warn("[SilentSearch] Filter dialog could not be closed");
    return false;
  }
  async function performFullFilterReset(token) {
    const opened = await clickSelectorsWhenReady(FILTER_BUTTON_SELECTORS, token);
    if (!opened) return false;
    await waitForDomSettle(300, 1200);
    if (token !== commandToken) return false;
    const resetBtn = document.querySelector(".resetFilters");
    if (resetBtn) {
      resetBtn.click();
      await waitForDomSettle(150, 600);
      if (token !== commandToken) return false;
    } else {
      console.warn("[SilentSearch] Reset filter button not found");
    }
    let totalUnchecked = 0;
    for (let attempt = 0; attempt < 30; attempt++) {
      const allBoxes = document.querySelectorAll('input[type="checkbox"][is="emby-checkbox"]');
      const checkedBox = [...allBoxes].find((b) => b.checked === true);
      if (!checkedBox) break;
      checkedBox.click();
      totalUnchecked++;
      await waitForDomSettle(120, 400);
      if (token !== commandToken) return false;
    }
    if (totalUnchecked) {
      console.log("[SilentSearch] Additionally manually reset checkboxes:", totalUnchecked);
    }
    await closeFilterDialog();
    return !!resetBtn || totalUnchecked > 0;
  }
  async function applyFilterChainViaUi(filterChain, token, desiredChecked = true) {
    if (!filterChain) return true;
    const opened = await clickSelectorsWhenReady(FILTER_BUTTON_SELECTORS, token);
    if (!opened) return false;
    await waitForDomSettle();
    if (token !== commandToken) return false;
    let allOk = true;
    for (const [category, values] of Object.entries(filterChain)) {
      const sectionLabels = CATEGORY_SECTION_HEADERS[category];
      let scope = document;
      if (sectionLabels) {
        const section = findFilterSection(sectionLabels);
        if (section) {
          scope = section.scope;
          if (section.needsExpand && !isCollapseExpanded(section.scope)) {
            clickCollapseHeader(section.scope);
            await waitForDomSettle(150, 800);
            if (token !== commandToken) return false;
          }
        } else {
          console.warn(`[SilentSearch] Filter section "${sectionLabels[0]}" not found`);
        }
      }
      for (const raw of values) {
        const uiLabel = resolveUiLabel(category, raw);
        if (!uiLabel) {
          allOk = false;
          continue;
        }
        let success = false;
        let notFound = false;
        for (let attempt = 0; attempt < 2 && !success; attempt++) {
          const label = await waitForLabelInScope(scope, uiLabel, token);
          if (!label) {
            notFound = true;
            break;
          }
          const checkbox = label.querySelector('input[type="checkbox"]');
          if (checkbox) {
            if (checkbox.checked !== desiredChecked) {
              checkbox.click();
            }
            if (checkbox.checked !== desiredChecked) {
              checkbox.checked = desiredChecked;
              checkbox.dispatchEvent(new Event("input", { bubbles: true }));
              checkbox.dispatchEvent(new Event("change", { bubbles: true }));
            }
          } else {
            label.click();
          }
          await waitForDomSettle(150, 500);
          if (token !== commandToken) return false;
          const recheckLabel = findByExactText("label", uiLabel, scope);
          const recheckBox = recheckLabel ? recheckLabel.querySelector('input[type="checkbox"]') : null;
          success = !!(recheckBox && recheckBox.checked === desiredChecked && document.contains(recheckBox));
        }
        if (notFound) {
          console.warn(`[SilentSearch] Checkbox "${uiLabel}" (category "${category}") not found`);
          allOk = false;
        } else if (!success) {
          console.warn(`[SilentSearch] Checkbox "${uiLabel}" did not stay in the desired state`);
          allOk = false;
        }
      }
    }
    await waitForDomSettle(200, 900);
    if (token !== commandToken) return false;
    await closeFilterDialog();
    return allOk;
  }
  function buildTitleCandidatesSpaced(tokens) {
    const original = tokens.join(" ");
    const variants = [];
    tokens.forEach((tok, idx) => {
      const key = tok.toLowerCase();
      if (ALIASES[key]) {
        ALIASES[key].forEach((expansion) => {
          const replaced = [...tokens.slice(0, idx), expansion, ...tokens.slice(idx + 1)].join(" ");
          variants.push(replaced);
          variants.push(expansion);
        });
      }
    });
    variants.push(original);
    return variants;
  }
  function extractChapterAndStrip(tokens) {
    for (let i = 0; i < tokens.length - 1; i++) {
      if (tokens[i].toLowerCase() !== "chapter") continue;
      if (/^\d{1,2}$/.test(tokens[i + 1])) {
        return {
          chapterNum: parseInt(tokens[i + 1], 10),
          chapterName: null,
          tokens: [...tokens.slice(0, i), ...tokens.slice(i + 2)],
        };
      }
      return {
        chapterNum: null,
        chapterName: tokens.slice(i + 1).join(" "),
        tokens: tokens.slice(0, i),
      };
    }
    return null;
  }
  function extractPercentAndStrip(tokens) {
    const buildResult = (idx, numStr, consumedCount) => {
      const val = parseInt(numStr, 10);
      if (val > 100) return { invalid: true };
      return {
        percent: val === 100 ? 99 : val,
        tokens: [...tokens.slice(0, idx), ...tokens.slice(idx + consumedCount)],
      };
    };
    for (let i = 0; i < tokens.length; i++) {
      const m = tokens[i].match(/^(\d{1,3})%$/);
      if (m) return buildResult(i, m[1], 1);
    }
    for (let i = 0; i < tokens.length - 1; i++) {
      if (/^\d{1,3}$/.test(tokens[i]) && (tokens[i + 1] === "%" || tokens[i + 1].toLowerCase() === "percent")) {
        return buildResult(i, tokens[i], 2);
      }
    }
    return null;
  }
  function parseSpaced(raw) {
    let tokens = raw.split(" ").filter(Boolean);
    if (tokens.length === 0) return null;
    let isPlay = false;
    let isReplay = false;
    let isResume = false;
    let isTrailer = false;
    let isRandom = false;
    let typeFilter = null;
    if (tokens[0].toLowerCase() === "play") {
      isPlay = true;
      tokens.shift();
    } else if (tokens[0].toLowerCase() === "replay") {
      isPlay = true;
      isReplay = true;
      tokens.shift();
    } else if (tokens[0].toLowerCase() === "resume") {
      isPlay = true;
      isResume = true;
      tokens.shift();
    }
    let changed = true;
    while (changed && tokens.length) {
      changed = false;
      const front = tokens[0].toLowerCase();
      if (isPlay && front === "trailer") { isTrailer = true; tokens.shift(); changed = true; continue; }
      if (front === "random") { isRandom = true; tokens.shift(); changed = true; continue; }
      if (isRandom && EPISODE_FILLER_WORDS.includes(front)) { tokens.shift(); changed = true; continue; }
      if (MOVIE_TYPE_KEYWORDS.includes(front)) { typeFilter = "Movie"; tokens.shift(); changed = true; continue; }
      if (SERIES_TYPE_KEYWORDS.includes(front)) { typeFilter = "Series"; tokens.shift(); changed = true; continue; }
      if (!tokens.length) break;
      const back = tokens[tokens.length - 1].toLowerCase();
      if (isPlay && back === "trailer") { isTrailer = true; tokens.pop(); changed = true; continue; }
      if (back === "random") { isRandom = true; tokens.pop(); changed = true; continue; }
      if (isRandom && EPISODE_FILLER_WORDS.includes(back)) { tokens.pop(); changed = true; continue; }
      if (MOVIE_TYPE_KEYWORDS.includes(back)) { typeFilter = "Movie"; tokens.pop(); changed = true; continue; }
      if (SERIES_TYPE_KEYWORDS.includes(back)) { typeFilter = "Series"; tokens.pop(); changed = true; continue; }
    }
    if (tokens.length === 0) return null;
    let chapterNum = null;
    let chapterName = null;
    let percentValue = null;
    if (isPlay && !isReplay && !isResume) {
      const chapterResult = extractChapterAndStrip(tokens);
      if (chapterResult) {
        tokens = chapterResult.tokens;
        chapterNum = chapterResult.chapterNum;
        chapterName = chapterResult.chapterName;
      }
      const percentResult = extractPercentAndStrip(tokens);
      if (percentResult) {
        if (percentResult.invalid) return null;
        if (chapterNum !== null || chapterName !== null) return null;
        tokens = percentResult.tokens;
        percentValue = percentResult.percent;
      }
      if (tokens.length === 0 && (chapterNum !== null || chapterName !== null || percentValue !== null)) {
        return {
          mode: "spaced",
          type: "chapterSeekCurrentPage",
          chapterNum,
          chapterName,
          percentValue,
        };
      }
    }
    if (tokens.length === 0) return null;
    if (isPlay) {
      const bareJoinedLower = tokens.join(" ").toLowerCase();
      const bareSE = matchBareSeasonEpisode(bareJoinedLower);
      if (bareSE) {
        return {
          mode: "spaced",
          type: "contextPlay",
          kind: "seasonEpisodeContext",
          season: bareSE.season,
          episode: bareSE.episode,
          isPlay,
          isReplay,
          isTrailer,
          chapterNum,
          chapterName,
          percentValue,
        };
      }
      const bareSeasonOnly = matchBareSeasonOnly(bareJoinedLower);
      if (bareSeasonOnly !== null) {
        return {
          mode: "spaced",
          type: "contextPlay",
          kind: "seasonContext",
          season: bareSeasonOnly,
          isPlay,
          isReplay,
          isTrailer,
          chapterNum,
          chapterName,
          percentValue,
        };
      }
      const bareEpisodeOnly = matchBareEpisodeOnly(bareJoinedLower);
      if (bareEpisodeOnly !== null) {
        return {
          mode: "spaced",
          type: "contextPlay",
          kind: "episodeContext",
          episode: bareEpisodeOnly,
          isPlay,
          isReplay,
          isTrailer,
          chapterNum,
          chapterName,
          percentValue,
        };
      }
    }
    const base = {
      mode: "spaced",
      isPlay,
      isReplay,
      isTrailer,
      isRandom,
      typeFilter,
      fallbackRaw: raw,
      chapterNum,
      chapterName,
      percentValue,
    };
    const episodeMatch = tokens[tokens.length - 1].match(/^s(\d{1,2}):?e(\d{1,2})$/i);
    if (episodeMatch) {
      return {
        ...base,
        type: "episode",
        season: parseInt(episodeMatch[1], 10),
        episode: parseInt(episodeMatch[2], 10),
        titleCandidates: buildTitleCandidatesSpaced(tokens.slice(0, -1)),
      };
    }
    if (
      tokens.length >= 4 &&
      tokens[tokens.length - 4].toLowerCase() === "season" &&
      /^\d{1,2}$/.test(tokens[tokens.length - 3]) &&
      tokens[tokens.length - 2].toLowerCase() === "episode" &&
      /^\d{1,2}$/.test(tokens[tokens.length - 1])
    ) {
      return {
        ...base,
        type: "episode",
        season: parseInt(tokens[tokens.length - 3], 10),
        episode: parseInt(tokens[tokens.length - 1], 10),
        titleCandidates: buildTitleCandidatesSpaced(tokens.slice(0, -4)),
      };
    }
    if (
      tokens.length >= 2 &&
      tokens[tokens.length - 2].toLowerCase() === "season" &&
      /^\d{1,2}$/.test(tokens[tokens.length - 1])
    ) {
      return {
        ...base,
        type: "season",
        season: parseInt(tokens[tokens.length - 1], 10),
        titleCandidates: buildTitleCandidatesSpaced(tokens.slice(0, -2)),
      };
    }
    const seasonMatch = tokens[tokens.length - 1].match(/^s(?:eason)?(\d{1,2})$/i);
    if (seasonMatch) {
      return {
        ...base,
        type: "season",
        season: parseInt(seasonMatch[1], 10),
        titleCandidates: buildTitleCandidatesSpaced(tokens.slice(0, -1)),
      };
    }
    if (tokens[tokens.length - 1].toLowerCase() === "specials") {
      return {
        ...base,
        type: "season",
        season: 0,
        titleCandidates: buildTitleCandidatesSpaced(tokens.slice(0, -1)),
      };
    }
    if (COLLECTION_KEYWORDS.includes(normalizeBase(tokens[tokens.length - 1]))) {
      return {
        ...base,
        type: "collection",
        titleCandidates: buildTitleCandidatesSpaced(tokens.slice(0, -1)),
        fallbackTitleCandidates: buildTitleCandidatesSpaced(tokens),
        originalText: tokens.join(" "),
      };
    }
    if (PERSON_KEYWORDS.includes(tokens[0].toLowerCase())) {
      return {
        ...base,
        type: "person",
        titleCandidates: buildTitleCandidatesSpaced(tokens.slice(1)),
        fallbackTitleCandidates: buildTitleCandidatesSpaced(tokens),
        originalText: tokens.join(" "),
      };
    }
    if (PERSON_KEYWORDS.includes(tokens[tokens.length - 1].toLowerCase())) {
      return {
        ...base,
        type: "person",
        titleCandidates: buildTitleCandidatesSpaced(tokens.slice(0, -1)),
        fallbackTitleCandidates: buildTitleCandidatesSpaced(tokens),
        originalText: tokens.join(" "),
      };
    }
    let year = null;
    let titleTokens = tokens;
    let literalTitleCandidates = null;
    const yearMatch = tokens[tokens.length - 1].match(/^\d{4}$/);
    if (yearMatch) {
      year = parseInt(yearMatch[0], 10);
      titleTokens = tokens.slice(0, -1);
      literalTitleCandidates = buildTitleCandidatesSpaced(tokens);
    }
    return {
      ...base,
      type: "title",
      year,
      titleCandidates: buildTitleCandidatesSpaced(titleTokens),
      literalTitleCandidates,
    };
  }
  const NAV_COMMANDS = {
    home: ["home"],
    favourites: ["favourites", "favorites", "favourite", "favorite", "fav"],
  };
  const SECTION_KEYWORDS = {
    movies: "Movies", movie: "Movies", film: "Movies", films: "Movies",
    shows: "Shows", show: "Shows", series: "Shows", tvshow: "Shows", tvshows: "Shows", tv: "Shows",
    episodes: "Episodes", episode: "Episodes",
    people: "People", person: "People", actor: "People", actors: "People", actress: "People", actresses: "People",
    collection: "Collections", collections: "Collections", set: "Collections", sets: "Collections", boxset: "Collections", boxsets: "Collections",
    video: "Videos", videos: "Videos", homevideo: "Videos", homevideos: "Videos",
  };
  const LIB_KEYWORDS = ["lib", "library", "folder"];
  const LIBRARY_TYPE_ALIASES = {
    movies: "movies", movie: "movies", film: "movies", films: "movies",
    shows: "tvshows", show: "tvshows", series: "tvshows", tvshow: "tvshows", tvshows: "tvshows", tv: "tvshows",
    music: "music", songs: "music",
    collections: "boxsets", collection: "boxsets", sets: "boxsets", set: "boxsets", boxsets: "boxsets", boxset: "boxsets",
    homevideos: "homevideos", homevideo: "homevideos", "home videos": "homevideos", "home video": "homevideos",
    livetv: "livetv", live: "livetv", pvr: "livetv", "live tv": "livetv",
  };
  const STANDALONE_WORDS = new Set([
    ...Object.keys(SECTION_KEYWORDS),
    ...Object.keys(LIBRARY_TYPE_ALIASES),
  ]);
  const RANDOM_TYPE_KEYWORDS = {
    movie: "Movie", film: "Movie", films: "Movie", movies: "Movie",
    collection: "BoxSet", set: "BoxSet", collections: "BoxSet", sets: "BoxSet",
    show: "Series", series: "Series", tvshow: "Series", tv: "Series", shows: "Series", tvshows: "Series",
  };
  const INNER_LEVEL_WORDS = {
    season: "season",
    episode: "episode",
    movie: "movie", movies: "movie", film: "movie", films: "movie",
  };
  function parseCommandCore(trimmed) {
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (lower === "back") {
      return { type: "back" };
    }
    for (const [target, keywords] of Object.entries(NAV_COMMANDS)) {
      if (keywords.includes(lower)) {
        return { type: "nav", target };
      }
    }
    if (STANDALONE_WORDS.has(lower)) {
      return { type: "section", section: SECTION_KEYWORDS[lower] || null, word: lower };
    }
    {
      let pmTokens = lower.split(" ").filter(Boolean);
      let pmIsPlay = false;
      if (pmTokens[0] === "play") {
        pmIsPlay = true;
        pmTokens = pmTokens.slice(1);
      }
      let pmIsRandom = false;
      if (pmTokens[0] === "random") {
        pmIsRandom = true;
        pmTokens = pmTokens.slice(1);
      }
      if (pmTokens.length >= 3 && PERSON_MEDIA_TYPE_KEYWORDS[pmTokens[0]] && PERSON_KEYWORDS.includes(pmTokens[1])) {
        return {
          type: "personMedia",
          mediaType: PERSON_MEDIA_TYPE_KEYWORDS[pmTokens[0]],
          isPlay: pmIsPlay,
          isRandom: pmIsRandom,
          personTitleCandidates: buildTitleCandidatesSpaced(pmTokens.slice(2)),
          fallbackTitleCandidates: buildTitleCandidatesSpaced(pmTokens.slice(1)),
        };
      }
      if (pmTokens.length >= 3 && PERSON_KEYWORDS.includes(pmTokens[0]) && PERSON_MEDIA_TYPE_KEYWORDS[pmTokens[1]]) {
        return {
          type: "personMedia",
          mediaType: PERSON_MEDIA_TYPE_KEYWORDS[pmTokens[1]],
          isPlay: pmIsPlay,
          isRandom: pmIsRandom,
          fallbackTitleCandidates: buildTitleCandidatesSpaced([pmTokens[0], ...pmTokens.slice(2)]),
          personTitleCandidates: buildTitleCandidatesSpaced(pmTokens.slice(2)),
        };
      }
    }
    const tokens = lower.split(" ");
    if (tokens.length === 2) {
      if (tokens[0] === "all" && STANDALONE_WORDS.has(tokens[1])) {
        return { type: "section", section: SECTION_KEYWORDS[tokens[1]] || null, word: tokens[1], forceGlobal: true };
      }
      if (tokens[1] === "all" && STANDALONE_WORDS.has(tokens[0])) {
        return { type: "section", section: SECTION_KEYWORDS[tokens[0]] || null, word: tokens[0], forceGlobal: true };
      }
    }
    if (tokens.length === 2) {
      for (const [target, keywords] of Object.entries(NAV_COMMANDS)) {
        if (keywords.includes(tokens[0]) && SECTION_KEYWORDS[tokens[1]]) {
          return { type: "nav", target, section: SECTION_KEYWORDS[tokens[1]] };
        }
      }
    }
    if (tokens.length >= 2 && LIB_KEYWORDS.includes(tokens[0])) {
      return { type: "library", term: tokens.slice(1).join(" ") };
    }
    return parseSpaced(trimmed);
  }
  const RESET_TYPE_WORDS = {
    movie: "movies", movies: "movies", film: "movies", films: "movies",
    tvshow: "tvshows", tvshows: "tvshows", show: "tvshows", shows: "tvshows", series: "tvshows", tv: "tvshows",
    collection: "boxsets", collections: "boxsets", set: "boxsets", sets: "boxsets", boxset: "boxsets", boxsets: "boxsets",
    homevideos: "homevideos", homevideo: "homevideos", "home videos": "homevideos", "home video": "homevideos",
  };
  function isLibraryFilterActive() {
    const hash = window.location.hash || "";
    const queryString = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const params = new URLSearchParams(queryString);
    const filterParamNames = ["Genres", "Years", "OfficialRatings", "Tags", "Filters", "VideoTypes"];
    return filterParamNames.some((name) => {
      const value = params.get(name);
      return value !== null && value !== "";
    });
  }
  async function detectCurrentLibraryType() {
    const hash = window.location.hash || "";
    if (/collectionType=movies\b/i.test(hash)) return "movies";
    if (/collectionType=tvshows\b/i.test(hash)) return "tvshows";
    if (/collectionType=livetv\b/i.test(hash)) return "livetv";
    const queryString = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const params = new URLSearchParams(queryString);
    const parentId = params.get("parentId") || params.get("topParentId");
    if (!parentId) return null;
    const views = await getUserViews();
    const match = views.find((v) => v.Id === parentId);
    if (!match) return null;
    return (match.CollectionType || "").toLowerCase() || null;
  }
  const DETAILS_ACTION_PHRASES = {
    play: "play",
    "play all": "play",
    resume: "resume",
    replay: "replay",
    trailer: "trailer",
    "play trailer": "trailer",
    shuffle: "shuffle",
    watched: "watched",
    unwatched: "watched",
    played: "watched",
    unplayed: "watched",
    ...Object.fromEntries(
      [
        "add to",
        "add",
        "delete from",
        "delete",
        "mark as",
        "mark",
        "set to",
        "set",
        "unmark from",
        "unmark",
        "unset from",
        "unset",
        "remove from",
        "remove",
        "toggle",
      ].flatMap((prefix) =>
        ["watched", "unwatched", "played", "unplayed"].map((w) => [`${prefix} ${w}`, "watched"])
      )
    ),
    ...Object.fromEntries(
      [
        "add to",
        "add",
        "delete from",
        "delete",
        "mark as",
        "mark",
        "set to",
        "set",
        "unmark from",
        "unmark",
        "unset from",
        "unset",
        "remove from",
        "remove",
        "toggle",
      ].flatMap((prefix) =>
        ["favorite", "favourite", "favorites", "favourites", "fav"].map((w) => [`${prefix} ${w}`, "favorite"])
      )
    ),
  };
  const SUBMENU_ITEM_PHRASES = {
    "add to collection": { match: "exact", text: "Add to collection" },
    addtocollection: { match: "exact", text: "Add to collection" },
    "add to playlist": { match: "exact", text: "Add to playlist" },
    addtoplaylist: { match: "exact", text: "Add to playlist" },
    download: { match: "startsWith", text: "Download" },
    "copy stream url": { match: "exact", text: "Copy Stream URL" },
    copystreamurl: { match: "exact", text: "Copy Stream URL" },
    "edit metadata": { match: "exact", text: "Edit metadata" },
    editmetadata: { match: "exact", text: "Edit metadata" },
    "edit images": { match: "exact", text: "Edit images" },
    editimages: { match: "exact", text: "Edit images" },
    "edit subtitles": { match: "exact", text: "Edit subtitles" },
    editsubtitles: { match: "exact", text: "Edit subtitles" },
    identify: { match: "exact", text: "Identify" },
    "media info": { match: "exact", text: "Media Info" },
    mediainfo: { match: "exact", text: "Media Info" },
    "refresh metadata": { match: "exact", text: "Refresh metadata" },
    refreshmetadata: { match: "exact", text: "Refresh metadata" },
    share: { match: "exact", text: "Share" },
    delete: { match: "startsWith", text: "Delete" },
  };
  const PREFIXABLE_DETAILS_ACTIONS = { ...DETAILS_ACTION_PHRASES };
  delete PREFIXABLE_DETAILS_ACTIONS.play;
  delete PREFIXABLE_DETAILS_ACTIONS["play all"];
  delete PREFIXABLE_DETAILS_ACTIONS.resume;
  delete PREFIXABLE_DETAILS_ACTIONS.replay;
  delete PREFIXABLE_DETAILS_ACTIONS.trailer;
  delete PREFIXABLE_DETAILS_ACTIONS["play trailer"];
  const ALL_LIST_ACTION_TERMS = [
    { phrase: "play all", kind: "listButton", data: "play" },
    { phrase: "shuffle", kind: "listButton", data: "shuffle" },
    { phrase: "play", kind: "listButton", data: "play" },
    { phrase: "replay", kind: "listButton", data: "replay" },
    { phrase: "resume", kind: "listButton", data: "resume" },
    ...Object.entries(PREFIXABLE_DETAILS_ACTIONS).map(([phrase, action]) => ({ phrase, kind: "listButton", data: action })),
    ...Object.entries(SUBMENU_ITEM_PHRASES).map(([phrase, spec]) => ({ phrase, kind: "submenuAction", data: spec })),
  ].sort((a, b) => b.phrase.split(" ").length - a.phrase.split(" ").length);
  function extractListActionOverride(tokens) {
    for (let i = 0; i < tokens.length; i++) {
      for (const term of ALL_LIST_ACTION_TERMS) {
        if (["play", "delete", "replay", "resume"].includes(term.phrase) && i === 0) continue;
        const words = term.phrase.split(" ");
        if (i + words.length > tokens.length) continue;
        if (tokens.slice(i, i + words.length).join(" ") === term.phrase) {
          return { kind: term.kind, data: term.data, startIndex: i, endIndex: i + words.length };
        }
      }
    }
    return null;
  }
  const ALL_ACTION_PHRASE_ENTRIES = [
    ...Object.entries(PREFIXABLE_DETAILS_ACTIONS).map(([phrase, action]) => ({
      phrase,
      kind: "detailsAction",
      data: action,
    })),
    ...Object.entries(SUBMENU_ITEM_PHRASES).map(([phrase, spec]) => ({
      phrase,
      kind: "submenuAction",
      data: spec,
    })),
  ].sort((a, b) => b.phrase.split(" ").length - a.phrase.split(" ").length);
  function matchActionPrefix(tokens) {
    for (const entry of ALL_ACTION_PHRASE_ENTRIES) {
      const words = entry.phrase.split(" ");
      if (words.length >= tokens.length) continue;
      if (tokens.slice(0, words.length).join(" ") === entry.phrase) {
        return { wordCount: words.length, kind: entry.kind, data: entry.data };
      }
    }
    return null;
  }
  function matchBareSeasonEpisode(lower) {
    let m = lower.match(/^s(\d{1,2}):?e(\d{1,2})$/);
    if (m) return { season: parseInt(m[1], 10), episode: parseInt(m[2], 10) };
    m = lower.match(/^season\s?(\d{1,2})\s+episode\s?(\d{1,2})$/);
    if (m) return { season: parseInt(m[1], 10), episode: parseInt(m[2], 10) };
    return null;
  }
  function matchBareSeasonOnly(lower) {
    if (lower === "specials") return 0;
    const m = lower.match(/^s(\d{1,2})$/) || lower.match(/^season\s?(\d{1,2})$/);
    return m ? parseInt(m[1], 10) : null;
  }
  function matchBareEpisodeOnly(lower) {
    const m = lower.match(/^e(\d{1,2})$/) || lower.match(/^episode\s?(\d{1,2})$/);
    return m ? parseInt(m[1], 10) : null;
  }
  function parseTargetSpec(tokens) {
    if (tokens.length === 0) return null;
    const joined = tokens.join(" ");
    const lower = joined.toLowerCase();
    const se = matchBareSeasonEpisode(lower);
    if (se) return { kind: "seasonEpisodeContext", season: se.season, episode: se.episode };
    const seasonOnly = matchBareSeasonOnly(lower);
    if (seasonOnly !== null) return { kind: "seasonContext", season: seasonOnly };
    const episodeOnly = matchBareEpisodeOnly(lower);
    if (episodeOnly !== null) return { kind: "episodeContext", episode: episodeOnly };
    const mediaCmd = parseCommandCore(joined);
    if (mediaCmd) return { kind: "media", cmd: mediaCmd };
    return null;
  }
  const RELOAD_PHRASES = new Set([
    "reload",
    "page reload",
    "reload page",
    "refresh",
    "page refresh",
    "refresh page",
    "reset",
  ]);
  const FULLSCREEN_PHRASES = new Set(["fullscreen"]);
  const WINDOWED_PHRASES = new Set(["window", "windowed"]);
  const SCROLL_START_MEDIUM = new Set(["scroll"]);
  const SCROLL_START_SLOW = new Set(["scroll slow", "scroll slower", "slow scroll", "slower scroll"]);
  const SCROLL_START_FAST = new Set(["scroll fast", "scroll faster", "fast scroll", "faster scroll"]);
  const SCROLL_STOP_PHRASES = new Set(["stop", "stop scroll", "scroll stop"]);
  const MAIN_PHRASES = new Set([
    "main",
    ...SERIES_TYPE_KEYWORDS.map((kw) => `main ${kw}`),
    ...SERIES_TYPE_KEYWORDS.map((kw) => `${kw} main`),
  ]);
  const DIRECT_LOOKUP_KEYWORDS = {
    genre: "genre",
    genres: "genre",
    studio: "studio",
    studios: "studio",
    tag: "tag",
    tags: "tag",
  };
  const LIBRARY_TAB_PHRASES = {
    movies: {
      movies: "Movies",
      movie: "Movies",
      suggestions: "Suggestions",
      suggestion: "Suggestions",
      trailers: "Trailers",
      trailer: "Trailers",
      favorites: "Favorites",
      favorite: "Favorites",
      favourites: "Favorites",
      favourite: "Favorites",
      fav: "Favorites",
      collections: "Collections",
      collection: "Collections",
      sets: "Collections",
      set: "Collections",
      boxsets: "Collections",
      boxset: "Collections",
    },
    tvshows: {
      shows: "Shows",
      show: "Shows",
      tvshows: "Shows",
      tvshow: "Shows",
      suggestions: "Suggestions",
      suggestion: "Suggestions",
      upcoming: "Upcoming",
      "tv networks": "TV Networks",
      "tv network": "TV Networks",
      networks: "TV Networks",
      network: "TV Networks",
      studios: "TV Networks",
      studio: "TV Networks",
      episodes: "Episodes",
      episode: "Episodes",
    },
    livetv: {
      programs: "Programs",
      program: "Programs",
      guide: "Guide",
      channels: "Channels",
      channel: "Channels",
      recordings: "Recordings",
      recording: "Recordings",
      schedule: "Schedule",
      series: "Series",
    },
  };
  const GENRE_TAB_TEXT = { movies: "Genres", tvshows: "Genres" };
  function matchTabPhraseTokens(tokens, libraryType) {
    if (tokens.length === 0) return null;
    if ((tokens[0] === "genre" || tokens[0] === "genres") && GENRE_TAB_TEXT[libraryType]) {
      const name = tokens.slice(1).join(" ");
      return { tabText: GENRE_TAB_TEXT[libraryType], subName: name || null };
    }
    const tabPhrases = LIBRARY_TAB_PHRASES[libraryType];
    if (!tabPhrases) return null;
    const joined = tokens.join(" ");
    if (tabPhrases[joined]) return { tabText: tabPhrases[joined], subName: null };
    return null;
  }
  function matchLibraryTabPrefix(allTokens) {
    if (allTokens.length < 2) return null;
    const libWord = allTokens[0];
    const libraryType = LIBRARY_TYPE_ALIASES[libWord];
    if (!libraryType) return null;
    const result = matchTabPhraseTokens(allTokens.slice(1), libraryType);
    if (!result) return null;
    return { libraryType, ...result };
  }
  function getCurrentActiveTabText() {
    const active = document.querySelector(".emby-tab-button-active .emby-button-foreground");
    return active ? active.textContent.trim() : null;
  }
  function waitForActiveTab(expectedText, timeoutMs = 2000, intervalMs = 100) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (getCurrentActiveTabText() === expectedText) {
          resolve(true);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(check, intervalMs);
      };
      check();
    });
  }
  const SEARCH_KEYWORDS = ["search", "find"];
  async function parseCommand(raw) {
    const trimmed0 = raw.trim().replace(/\s+/g, " ");
    if (!trimmed0) return null;
    const originalTokens0 = trimmed0.split(" ");
    const lowerTokens0 = trimmed0.toLowerCase().split(" ");
    let letterOverride = null;
    let trimmed = trimmed0;
    for (let i = 0; i < lowerTokens0.length - 1; i++) {
      if (lowerTokens0[i] === "letter") {
        const rawVal = originalTokens0[i + 1];
        const value = rawVal === "#" ? "#" : rawVal.toUpperCase();
        if (value === "#" || /^[A-Z]$/.test(value)) {
          letterOverride = value;
          trimmed = [...originalTokens0.slice(0, i), ...originalTokens0.slice(i + 2)].join(" ").trim();
          break;
        }
      }
    }
    if (!trimmed) {
      return letterOverride ? { type: "alphaPicker", value: letterOverride } : null;
    }
    let viewOverride = null;
    {
      const originalTokens1 = trimmed.split(" ");
      const lowerTokens1 = trimmed.toLowerCase().split(" ");
      const viewMatch = extractViewOverride(lowerTokens1);
      if (viewMatch) {
        viewOverride = viewMatch.values;
        trimmed = [...originalTokens1.slice(0, viewMatch.startIndex), ...originalTokens1.slice(viewMatch.endIndex)].join(" ").trim();
      }
    }
    if (!trimmed) {
      let emptyCmd = viewOverride ? { type: "withViewAfter", innerCmd: null, values: viewOverride } : null;
      if (letterOverride) {
        emptyCmd = { type: "withLetterAfter", innerCmd: emptyCmd, letter: letterOverride };
      }
      return emptyCmd;
    }
    let sortOverride = null;
    {
      const originalTokens2 = trimmed.split(" ");
      const lowerTokens2 = trimmed.toLowerCase().split(" ");
      const sortMatch = extractSortOverride(lowerTokens2);
      if (sortMatch) {
        sortOverride = sortMatch.values;
        trimmed = [...originalTokens2.slice(0, sortMatch.startIndex), ...originalTokens2.slice(sortMatch.endIndex)].join(" ").trim();
      }
    }
    if (!trimmed) {
      let emptyCmd2 = sortOverride ? { type: "withSortAfter", innerCmd: null, values: sortOverride } : null;
      if (viewOverride) {
        emptyCmd2 = { type: "withViewAfter", innerCmd: emptyCmd2, values: viewOverride };
      }
      if (letterOverride) {
        emptyCmd2 = { type: "withLetterAfter", innerCmd: emptyCmd2, letter: letterOverride };
      }
      return emptyCmd2;
    }
    let trailerOverride = false;
    {
      const lowerTokens2c = trimmed.toLowerCase().split(" ");
      const playIdx = lowerTokens2c.indexOf("play");
      const trailerIdx = lowerTokens2c.indexOf("trailer");
      if (playIdx !== -1 && trailerIdx !== -1) {
        trailerOverride = true;
        const originalTokens2c = trimmed.split(" ");
        const removeIndices = new Set([playIdx, trailerIdx]);
        trimmed = originalTokens2c.filter((_, i) => !removeIndices.has(i)).join(" ").trim();
      }
    }
    if (trailerOverride && !trimmed) {
      let emptyCmd2c = { type: "detailsAction", action: "trailer" };
      if (sortOverride) {
        emptyCmd2c = { type: "withSortAfter", innerCmd: emptyCmd2c, values: sortOverride };
      }
      if (viewOverride) {
        emptyCmd2c = { type: "withViewAfter", innerCmd: emptyCmd2c, values: viewOverride };
      }
      if (letterOverride) {
        emptyCmd2c = { type: "withLetterAfter", innerCmd: emptyCmd2c, letter: letterOverride };
      }
      return emptyCmd2c;
    }
    let nextUpOverride = null;
    {
      const lowerTokensNU = trimmed.toLowerCase().split(" ");
      const nextIdx = lowerTokensNU.findIndex((t, i) => t === "next" && lowerTokensNU[i + 1] === "up");
      if (nextIdx !== -1) {
        const playIdx = lowerTokensNU.indexOf("play");
        nextUpOverride = { shouldPlay: playIdx !== -1 };
        const originalTokensNU = trimmed.split(" ");
        const removeIndices = new Set([nextIdx, nextIdx + 1]);
        if (playIdx !== -1) removeIndices.add(playIdx);
        trimmed = originalTokensNU.filter((_, i) => !removeIndices.has(i)).join(" ").trim();
      }
    }
    if (nextUpOverride && !trimmed) {
      let emptyCmdNU = { type: "withNextUpAfter", innerCmd: null, shouldPlay: nextUpOverride.shouldPlay };
      if (sortOverride) {
        emptyCmdNU = { type: "withSortAfter", innerCmd: emptyCmdNU, values: sortOverride };
      }
      if (viewOverride) {
        emptyCmdNU = { type: "withViewAfter", innerCmd: emptyCmdNU, values: viewOverride };
      }
      if (letterOverride) {
        emptyCmdNU = { type: "withLetterAfter", innerCmd: emptyCmdNU, letter: letterOverride };
      }
      return emptyCmdNU;
    }
    let randomOverride = null;
    {
      let rTokens = trimmed.toLowerCase().split(" ");
      const randomIndices = [];
      rTokens.forEach((t, i) => {
        if (t === "random") randomIndices.push(i);
      });
      if (randomIndices.length > 0) {
        const playIdx = rTokens.indexOf("play");
        const isPlayRP = playIdx !== -1;
        const removeIdx = new Set(randomIndices);
        if (isPlayRP) removeIdx.add(playIdx);
        let remainder = rTokens.filter((_, i) => !removeIdx.has(i));
        let chapterNumRP = null;
        let chapterNameRP = null;
        let percentValueRP = null;
        if (isPlayRP) {
          const chRes = extractChapterAndStrip(remainder);
          if (chRes) {
            remainder = chRes.tokens;
            chapterNumRP = chRes.chapterNum;
            chapterNameRP = chRes.chapterName;
          }
          if (chapterNumRP === null && chapterNameRP === null) {
            const pctRes = extractPercentAndStrip(remainder);
            if (pctRes && !pctRes.invalid) {
              remainder = pctRes.tokens;
              percentValueRP = pctRes.percent;
            }
          }
        }
        let seasonNumRP = null;
        if (remainder.length > 0) {
          const lastTokRP = remainder[remainder.length - 1];
          const compactMatchRP = lastTokRP.match(/^s(\d{1,2})$/i);
          if (compactMatchRP) {
            seasonNumRP = parseInt(compactMatchRP[1], 10);
            remainder = remainder.slice(0, -1);
          } else if (remainder.length >= 2 && remainder[remainder.length - 2] === "season" && /^\d{1,2}$/.test(lastTokRP)) {
            seasonNumRP = parseInt(lastTokRP, 10);
            remainder = remainder.slice(0, -2);
          }
        }
        let innerLevel = null;
        if (remainder.length > 0) {
          const lastWordRP = remainder[remainder.length - 1];
          const isAmbiguousWithType = remainder.length === 1 && RANDOM_TYPE_KEYWORDS[lastWordRP];
          if (INNER_LEVEL_WORDS[lastWordRP] && !isAmbiguousWithType) {
            innerLevel = INNER_LEVEL_WORDS[lastWordRP];
            remainder = remainder.slice(0, -1);
          }
        }
        let mode;
        let pickTypes = null;
        let rawTitleText = null;
        if (remainder.length === 0) {
          mode = "context";
        } else if (remainder.every((t) => RANDOM_TYPE_KEYWORDS[t])) {
          mode = "type";
          pickTypes = [...new Set(remainder.map((t) => RANDOM_TYPE_KEYWORDS[t]))];
        } else {
          mode = "title";
          rawTitleText = remainder.join(" ");
        }
        randomOverride = {
          isPlay: isPlayRP,
          randomCount: randomIndices.length,
          mode,
          pickTypes,
          rawTitleText,
          innerLevel,
          seasonNum: seasonNumRP,
          chapterNum: chapterNumRP,
          chapterName: chapterNameRP,
          percentValue: percentValueRP,
        };
        trimmed = "";
      }
    }
    if (randomOverride) {
      let emptyCmdRP = { type: "randomPick2", ...randomOverride };
      if (sortOverride) {
        emptyCmdRP = { type: "withSortAfter", innerCmd: emptyCmdRP, values: sortOverride };
      }
      if (viewOverride) {
        emptyCmdRP = { type: "withViewAfter", innerCmd: emptyCmdRP, values: viewOverride };
      }
      if (letterOverride) {
        emptyCmdRP = { type: "withLetterAfter", innerCmd: emptyCmdRP, letter: letterOverride };
      }
      return emptyCmdRP;
    }
    let resetOverride = null;
    {
      const lowerTokens2c = trimmed.toLowerCase().split(" ");
      const resetMatch = extractResetOverride(lowerTokens2c);
      if (resetMatch) {
        resetOverride = { targetFilterChain: resetMatch.rest.length ? parseFilterChain(resetMatch.rest) : null };
        const originalTokens2c = trimmed.split(" ");
        trimmed = originalTokens2c.slice(0, resetMatch.startIndex).join(" ").trim();
      }
    }
    let filterChain = null;
    let filterParams = null;
    {
      const lowerTokensCheck = trimmed.toLowerCase().split(" ");
      if (!lowerTokensCheck.includes("reset")) {
        const originalTokens3 = trimmed.split(" ");
        const filterIdx3 = lowerTokensCheck.findIndex((t) => t === "filter" || t === "filters");
        if (filterIdx3 !== -1) {
          const chainTokens = lowerTokensCheck.slice(filterIdx3 + 1);
          filterChain = parseFilterChain(chainTokens);
          filterParams = buildFilterParams(filterChain);
          trimmed = originalTokens3.slice(0, filterIdx3).join(" ").trim();
        }
      }
    }
    let listActionOverride = null;
    {
      const originalTokens2b = trimmed.split(" ");
      const lowerTokens2b = trimmed.toLowerCase().split(" ");
      const actionMatch2 = extractListActionOverride(lowerTokens2b);
      if (actionMatch2) {
        listActionOverride = { kind: actionMatch2.kind, data: actionMatch2.data };
        trimmed = [...originalTokens2b.slice(0, actionMatch2.startIndex), ...originalTokens2b.slice(actionMatch2.endIndex)].join(" ").trim();
      }
    }
    if (!trimmed) {
      let emptyCmd3;
      if (filterChain && hasVisibleFilterButtonNow()) {
        emptyCmd3 = { type: "filterCurrentPage" };
      } else {
        const currentType0 = await detectCurrentLibraryType();
        emptyCmd3 = currentType0 ? { type: "library", term: currentType0 } : filterChain ? { type: "filterCurrentPage" } : null;
      }
      if (emptyCmd3 && filterParams && Object.keys(filterParams).length > 0) {
        emptyCmd3.filterParams = filterParams;
        emptyCmd3.filterChain = filterChain;
      }
      if (sortOverride) {
        emptyCmd3 = { type: "withSortAfter", innerCmd: emptyCmd3, values: sortOverride };
      }
      if (viewOverride) {
        emptyCmd3 = { type: "withViewAfter", innerCmd: emptyCmd3, values: viewOverride };
      }
      if (resetOverride) {
        emptyCmd3 = { type: "withResetAfter", innerCmd: emptyCmd3, targetFilterChain: resetOverride.targetFilterChain };
      }
      if (listActionOverride) {
        emptyCmd3 = { type: "withListActionAfter", innerCmd: emptyCmd3, kind: listActionOverride.kind, data: listActionOverride.data };
      }
      if (letterOverride) {
        emptyCmd3 = { type: "withLetterAfter", innerCmd: emptyCmd3, letter: letterOverride };
      }
      return emptyCmd3;
    }
    const lowerFull = trimmed.toLowerCase();
    const lowerFullPageNorm = lowerFull.replace(/\bpages\b/g, "page");
    const allTokens = lowerFull.split(" ").filter(Boolean);
    const cmd = await (async () => {
      if (DETAILS_ACTION_PHRASES[lowerFull]) {
        return { type: "detailsAction", action: DETAILS_ACTION_PHRASES[lowerFull] };
      }
      if (SUBMENU_ITEM_PHRASES[lowerFull]) {
        const { match, text } = SUBMENU_ITEM_PHRASES[lowerFull];
        return { type: "submenuAction", match, text };
      }
      if (
        allTokens.length === 2 &&
        ((allTokens[0] === "home" && NAV_COMMANDS.favourites.includes(allTokens[1])) ||
          (NAV_COMMANDS.favourites.includes(allTokens[0]) && allTokens[1] === "home"))
      ) {
        return { type: "nav", target: "favourites" };
      }
      if (RELOAD_PHRASES.has(lowerFull)) {
        return { type: "reload" };
      }
      if (FULLSCREEN_PHRASES.has(lowerFull)) {
        return { type: "fullscreen" };
      }
      if (WINDOWED_PHRASES.has(lowerFull)) {
        return { type: "windowed" };
      }
      if (["page top", "top page", "page bottom", "bottom page", "page down", "down page", "page up", "up page"].includes(lowerFullPageNorm)) {
        const target = lowerFullPageNorm.includes("top") ? "top" : lowerFullPageNorm.includes("bottom") ? "bottom" : lowerFullPageNorm.includes("down") ? "down" : "up";
        return { type: "scrollJump", target };
      }
      if (lowerFullPageNorm === "next page" || lowerFullPageNorm === "page next" || lowerFullPageNorm === "forward page" || lowerFullPageNorm === "page forward") {
        return { type: "pageNav", direction: "next" };
      }
      if (lowerFullPageNorm === "previous page" || lowerFullPageNorm === "page previous" || lowerFullPageNorm === "prev page" || lowerFullPageNorm === "page prev" || lowerFullPageNorm === "back page" || lowerFullPageNorm === "page back") {
        return { type: "pageNav", direction: "previous" };
      }
      if (lowerFullPageNorm === "page last" || lowerFullPageNorm === "last page") {
        return { type: "pageNavToEnd", direction: "next" };
      }
      if (lowerFullPageNorm === "page first" || lowerFullPageNorm === "first page") {
        return { type: "pageNavToEnd", direction: "previous" };
      }
      {
        const pageMatch = lowerFullPageNorm.match(/^page (\d{1,3})%?$/);
        if (pageMatch && parseInt(pageMatch[1], 10) <= 100) {
          return { type: "scrollJump", target: "percent", percentValue: parseInt(pageMatch[1], 10) };
        }
      }
      {
        const tokensPN = lowerFullPageNorm.split(" ").filter((t) => t !== "page");
        if (tokensPN.length === 2) {
          const DIRECTION_WORDS_PN = { next: "next", forward: "next", prev: "previous", previous: "previous", down: "down", up: "up" };
          let dirWord = null;
          let numStr = null;
          if (DIRECTION_WORDS_PN[tokensPN[0]] && /^\d{1,2}$/.test(tokensPN[1])) {
            dirWord = DIRECTION_WORDS_PN[tokensPN[0]];
            numStr = tokensPN[1];
          } else if (DIRECTION_WORDS_PN[tokensPN[1]] && /^\d{1,2}$/.test(tokensPN[0])) {
            dirWord = DIRECTION_WORDS_PN[tokensPN[1]];
            numStr = tokensPN[0];
          }
          if (dirWord && numStr) {
            const count = parseInt(numStr, 10);
            if (count >= 1 && count <= 99) {
              if (dirWord === "next" || dirWord === "previous") {
                return { type: "pageNavMulti", direction: dirWord, count };
              }
              return { type: "scrollJump", target: dirWord, multiplier: count };
            }
          }
        }
      }
      if (SCROLL_STOP_PHRASES.has(lowerFull)) {
        return { type: "autoScrollStop" };
      }
      if (SCROLL_START_SLOW.has(lowerFull)) {
        return { type: "autoScrollStart", speedIndex: 0 };
      }
      if (SCROLL_START_FAST.has(lowerFull)) {
        return { type: "autoScrollStart", speedIndex: 2 };
      }
      if (SCROLL_START_MEDIUM.has(lowerFull)) {
        return { type: "autoScrollStart", speedIndex: 1 };
      }
      {
        const delayMatch = lowerFull.match(/^scroll delay (\d{1,4})$/);
        if (delayMatch) {
          return { type: "autoScrollDelay", seconds: parseInt(delayMatch[1], 10) };
        }
      }
      if (MAIN_PHRASES.has(lowerFull)) {
        return { type: "mainSeries" };
      }
      const libraryTabMatch = matchLibraryTabPrefix(allTokens);
      if (libraryTabMatch) {
        return { type: "libraryTab", alreadyInLibrary: false, ...libraryTabMatch };
      }
      if (allTokens[0] === "all" && DIRECT_LOOKUP_KEYWORDS[allTokens[1]] && allTokens.length >= 3) {
        const kind = DIRECT_LOOKUP_KEYWORDS[allTokens[1]];
        const name = trimmed.split(" ").slice(2).join(" ");
        return { type: "directLookup", kind, name, fallbackTitleCandidates: buildTitleCandidatesSpaced(allTokens.slice(1)) };
      }
      if (
        allTokens.length === 2 &&
        allTokens[0] === "all" &&
        ["fav", "favorites", "favourites", "favorite", "favourite"].includes(allTokens[1])
      ) {
        return { type: "nav", target: "favourites" };
      }
      if (
        (DIRECT_LOOKUP_KEYWORDS[allTokens[0]] === "tag" || DIRECT_LOOKUP_KEYWORDS[allTokens[0]] === "studio") &&
        allTokens.length >= 2
      ) {
        const kind = DIRECT_LOOKUP_KEYWORDS[allTokens[0]];
        const name = trimmed.split(" ").slice(1).join(" ");
        return { type: "directLookup", kind, name, fallbackTitleCandidates: buildTitleCandidatesSpaced(allTokens) };
      }
      if (["movies", "tvshows", "livetv"].some((lt) => matchTabPhraseTokens(allTokens, lt) !== null)) {
        const currentType = await detectCurrentLibraryType();
        if (currentType) {
          const tabResult = matchTabPhraseTokens(allTokens, currentType);
          if (tabResult) {
            return { type: "libraryTab", alreadyInLibrary: true, libraryType: currentType, ...tabResult };
          }
        }
      }
      if (getCurrentActiveTabText() === "Genres") {
        const currentType = await detectCurrentLibraryType();
        if (currentType && GENRE_TAB_TEXT[currentType] && findSectionHeading(trimmed)) {
          return {
            type: "libraryTab",
            alreadyInLibrary: true,
            tabAlreadyActive: true,
            libraryType: currentType,
            tabText: GENRE_TAB_TEXT[currentType],
            subName: trimmed,
          };
        }
      }
      if (DIRECT_LOOKUP_KEYWORDS[allTokens[0]] && allTokens.length >= 2) {
        const kind = DIRECT_LOOKUP_KEYWORDS[allTokens[0]];
        const name = trimmed.split(" ").slice(1).join(" ");
        return { type: "directLookup", kind, name, fallbackTitleCandidates: buildTitleCandidatesSpaced(allTokens) };
      }
      for (const kw of SEARCH_KEYWORDS) {
        if (lowerFull.startsWith(kw + " ")) {
          const term = trimmed.slice(kw.length + 1).trim();
          if (term) return { type: "search", term };
        }
      }
      const actionMatch = matchActionPrefix(allTokens);
      if (actionMatch) {
        const remainder = allTokens.slice(actionMatch.wordCount);
        const target = parseTargetSpec(remainder);
        if (target) {
          return { type: "targetedAction", actionKind: actionMatch.kind, actionData: actionMatch.data, target };
        }
      }
      const bareSeasonEpisode = matchBareSeasonEpisode(lowerFull);
      if (bareSeasonEpisode) {
        return { type: "contextJump", kind: "seasonEpisodeContext", season: bareSeasonEpisode.season, episode: bareSeasonEpisode.episode };
      }
      const bareSeason = matchBareSeasonOnly(lowerFull);
      if (bareSeason !== null) {
        return { type: "contextJump", kind: "seasonContext", season: bareSeason };
      }
      const bareEpisode = matchBareEpisodeOnly(lowerFull);
      if (bareEpisode !== null) {
        return { type: "contextJump", kind: "episodeContext", episode: bareEpisode };
      }
      if (allTokens.includes("reset")) {
        const isFilterWord = (t) => t === "filter" || t === "filters";
        const hasFilterWord = allTokens.some(isFilterWord);
        if (hasFilterWord) {
          const remaining = allTokens.filter((t) => t !== "reset" && !isFilterWord(t));
          let libraryTypeFromTokens = null;
          let rest = remaining;
          if (remaining.length >= 2 && RESET_TYPE_WORDS[remaining.slice(0, 2).join(" ")]) {
            libraryTypeFromTokens = RESET_TYPE_WORDS[remaining.slice(0, 2).join(" ")];
            rest = remaining.slice(2);
          } else if (remaining.length >= 1 && RESET_TYPE_WORDS[remaining[0]]) {
            libraryTypeFromTokens = RESET_TYPE_WORDS[remaining[0]];
            rest = remaining.slice(1);
          }
          const libraryType = libraryTypeFromTokens || (hasVisibleFilterButtonNow() ? null : await detectCurrentLibraryType());
          if (libraryType) {
            const targetChain = rest.length ? parseFilterChain(rest) : null;
            const hasTargetChain = targetChain && Object.keys(targetChain).length > 0;
            return {
              type: "resetFilters",
              libraryType,
              targetFilterChain: hasTargetChain ? targetChain : null,
            };
          }
          const currentPageTargetChain = rest.length ? parseFilterChain(rest) : null;
          const currentPageHasTargetChain = currentPageTargetChain && Object.keys(currentPageTargetChain).length > 0;
          return {
            type: "resetFiltersCurrentPage",
            targetFilterChain: currentPageHasTargetChain ? currentPageTargetChain : null,
          };
        }
      }
      return parseCommandCore(trimmed);
    })();
    if (cmd && filterParams && Object.keys(filterParams).length > 0) {
      cmd.filterParams = filterParams;
      cmd.filterChain = filterChain;
    }
    let finalCmd = cmd;
    if (!filterChain && /^[A-Za-z]$/.test(trimmed)) {
      finalCmd = { type: "bareLetterWithAlphaFallback", innerCmd: cmd, letter: trimmed.toUpperCase() };
    }
    if (!filterChain && ["top", "bottom"].includes(trimmed.toLowerCase())) {
      finalCmd = { type: "bareScrollArrowFallback", innerCmd: cmd, target: trimmed.toLowerCase() };
    }
    if (!filterChain && ["down", "up"].includes(trimmed.toLowerCase())) {
      finalCmd = { type: "bareScrollArrowFallback", innerCmd: cmd, target: trimmed.toLowerCase() };
    }
    if (!filterChain && /^\d{1,3}%?$/.test(trimmed) && parseInt(trimmed, 10) <= 100) {
      finalCmd = { type: "bareScrollArrowFallback", innerCmd: cmd, target: "percent", percentValue: parseInt(trimmed, 10) };
    }
    if (!filterChain && ["next", "forward"].includes(trimmed.toLowerCase())) {
      finalCmd = { type: "bareArrowFallback", innerCmd: cmd, direction: "next" };
    }
    if (!filterChain && ["prev", "previous"].includes(trimmed.toLowerCase())) {
      finalCmd = { type: "bareArrowFallback", innerCmd: cmd, direction: "previous" };
    }
    if (viewOverride && finalCmd) {
      finalCmd = { type: "withViewAfter", innerCmd: finalCmd, values: viewOverride };
    }
    if (sortOverride && finalCmd) {
      finalCmd = { type: "withSortAfter", innerCmd: finalCmd, values: sortOverride };
    }
    if (resetOverride && finalCmd) {
      finalCmd = { type: "withResetAfter", innerCmd: finalCmd, targetFilterChain: resetOverride.targetFilterChain };
    }
    if (listActionOverride && finalCmd) {
      finalCmd = { type: "withListActionAfter", innerCmd: finalCmd, kind: listActionOverride.kind, data: listActionOverride.data };
    }
    if (trailerOverride && finalCmd) {
      finalCmd = { type: "withListActionAfter", innerCmd: finalCmd, kind: "trailerAction", data: null };
    }
    if (nextUpOverride && finalCmd) {
      finalCmd = { type: "withNextUpAfter", innerCmd: finalCmd, shouldPlay: nextUpOverride.shouldPlay };
    }
    if (letterOverride && finalCmd) {
      return { type: "withLetterAfter", innerCmd: finalCmd, letter: letterOverride };
    }
    return finalCmd;
  }
  function getUserId() {
    return window.ApiClient ? window.ApiClient.getCurrentUserId() : null;
  }
  async function getUserViews() {
    if (!window.ApiClient) return [];
    try {
      const result = await window.ApiClient.getUserViews({ userId: getUserId() });
      return (result && result.Items) || [];
    } catch (err) {
      return [];
    }
  }
  async function resolveLibrary(term) {
    const lower = term.toLowerCase().trim();
    const mappedType = LIBRARY_TYPE_ALIASES[lower];
    const views = await getUserViews();
    if (mappedType) {
      const byType = views.find((v) => (v.CollectionType || "").toLowerCase() === mappedType);
      if (byType) return byType;
    }
    const target = squash(term);
    const byName = views.find((v) => squash(v.Name) === target);
    if (byName) return byName;
    return null;
  }
  const LIBRARY_PAGE_BY_TYPE = {
    movies: { page: "movies.html", idParam: "topParentId" },
    tvshows: { page: "tv.html", idParam: "topParentId" },
    livetv: { page: "livetv.html", idParam: null },
  };
  function buildLibraryHash(library, mappedType) {
    const serverId = window.ApiClient.serverId ? window.ApiClient.serverId() : "";
    const pageConfig = LIBRARY_PAGE_BY_TYPE[mappedType];
    const params = new URLSearchParams();
    if (pageConfig) {
      if (pageConfig.idParam) params.set(pageConfig.idParam, library.Id);
      params.set("collectionType", mappedType);
    } else {
      params.set("parentId", library.Id);
    }
    if (serverId) params.set("serverId", serverId);
    return `#/${(pageConfig && pageConfig.page) || "list.html"}?${params.toString()}`;
  }
  async function tryCurrentFolderChild(term, token) {
    const hash = window.location.hash || "";
    const queryString = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const params = new URLSearchParams(queryString);
    const parentId = params.get("parentId") || params.get("topParentId");
    if (!parentId || !window.ApiClient) return false;
    let children;
    try {
      const result = await window.ApiClient.getItems(getUserId(), {
        ParentId: parentId,
        Recursive: false,
      });
      children = (result && result.Items) || [];
    } catch (err) {
      return false;
    }
    const target = squash(term);
    const matches = children.filter((c) => (c.Type === "Folder" || c.Type === "PhotoAlbum") && squash(c.Name) === target);
    if (matches.length !== 1) return false;
    const folder = matches[0];
    const serverId = window.ApiClient.serverId ? window.ApiClient.serverId() : "";
    const navParams = new URLSearchParams();
    navParams.set("parentId", folder.Id);
    if (serverId) navParams.set("serverId", serverId);
    window.location.hash = `#/list.html?${navParams.toString()}`;
    return true;
  }
  const PRIMARY_TAB_TEXT = { movies: "Movies", tvshows: "Shows" };
  async function tryLibraryOrStatic(term, filterChain, token) {
    const folderHandled = await tryCurrentFolderChild(term, token);
    if (folderHandled) return true;
    const lower = term.toLowerCase().trim();
    const mappedType = LIBRARY_TYPE_ALIASES[lower];
    const library = await resolveLibrary(term);
    if (library) {
      const hash = buildLibraryHash(library, mappedType);
      window.location.hash = hash;
      if (PRIMARY_TAB_TEXT[mappedType]) {
        await waitForDomSettle();
        if (token !== undefined && token !== commandToken) return true;
        await clickTextWhenReady(PRIMARY_TAB_TEXT[mappedType], token);
      }
      if (filterChain) {
        await waitForDomSettle();
        if (token !== undefined && token !== commandToken) return true;
        const filterApplied = await applyFilterChainViaUi(filterChain, token);
        if (!filterApplied) {
          console.warn("[SilentSearch] Filters could NOT be applied via the UI");
        }
      }
      return true;
    }
    return false;
  }
  async function searchItems(title, includeTypes) {
    if (!window.ApiClient) return [];
    const params = {
      SearchTerm: title,
      IncludeItemTypes: includeTypes,
      Recursive: true,
      Limit: 25,
      Fields: "OriginalTitle,ProductionYear",
    };
    try {
      const result = await window.ApiClient.getItems(getUserId(), params);
      return (result && result.Items) || [];
    } catch (err) {
      return [];
    }
  }
  function buildPunctuationSearchVariants(title) {
    const words = title.split(" ").filter(Boolean);
    const variants = [];
    for (let i = 1; i < words.length; i++) {
      const before = words.slice(0, i).join(" ");
      const after = words.slice(i).join(" ");
      variants.push(`${before}: ${after}`);
      variants.push(`${before} - ${after}`);
    }
    return variants;
  }
  async function searchItemsBroad(fullTitle, includeTypes) {
    const words = fullTitle.split(" ").filter(Boolean);
    const searchTerms = new Set([fullTitle]);
    if (words.length > 1) searchTerms.add(words.slice(0, 2).join(" "));
    if (words.length > 0) searchTerms.add(words[0]);
    buildPunctuationSearchVariants(fullTitle).forEach((v) => searchTerms.add(v));
    const seen = new Map();
    for (const term of searchTerms) {
      const items = await searchItems(term, includeTypes);
      items.forEach((i) => seen.set(i.Id, i));
    }
    return Array.from(seen.values());
  }
  async function fetchAllOfType(includeTypes, extraParams) {
    if (!window.ApiClient) return [];
    try {
      const result = await window.ApiClient.getItems(getUserId(), {
        IncludeItemTypes: includeTypes,
        Recursive: true,
        Fields: "OriginalTitle,ProductionYear",
        Limit: 2000,
        ...filterParamsToQueryObject(extraParams),
      });
      return (result && result.Items) || [];
    } catch (err) {
      return [];
    }
  }
  async function getPersonMedia(personId, includeType, extraParams) {
    if (!window.ApiClient) return [];
    try {
      const result = await window.ApiClient.getItems(getUserId(), {
        PersonIds: personId,
        IncludeItemTypes: includeType,
        Recursive: true,
        Fields: "OriginalTitle,ProductionYear",
        Limit: 2000,
        ...filterParamsToQueryObject(extraParams),
      });
      return (result && result.Items) || [];
    } catch (err) {
      return [];
    }
  }
  function resolveUniqueMatch(items, title) {
    const target = squash(title);
    const exact = items.filter((i) => {
      const nameMatches = squash(i.Name) === target;
      const origMatches = i.OriginalTitle && squash(i.OriginalTitle) === target;
      return nameMatches || origMatches;
    });
    if (exact.length === 1) return exact[0];
    if (exact.length > 1) return null;
    return null;
  }
  function stripParenChars(str) {
    return (str || "").replace(/[()]/g, "");
  }
  function stripTrailingBracketGroup(str) {
    return (str || "").replace(/\s*\([^()]*\)\s*$/, "").trim();
  }
  function stripSubtitleAfterSeparator(str) {
    const s = str || "";
    const match = s.match(/:\s+|\s+[-–—]\s+/);
    if (!match) return s.trim();
    return s.slice(0, match.index).trim();
  }
  function resolveUniqueTitleMatch(items, title) {
    const target = squash(stripParenChars(title));
    const stage1 = items.filter((i) => {
      const nameMatches = squash(stripParenChars(i.Name)) === target;
      const origMatches = i.OriginalTitle && squash(stripParenChars(i.OriginalTitle)) === target;
      return nameMatches || origMatches;
    });
    if (stage1.length === 1) return stage1[0];
    if (stage1.length > 1) return null;
    const targetNoBracket = squash(stripParenChars(stripTrailingBracketGroup(title)));
    const stage2 = items.filter((i) => {
      const nameMatches = squash(stripParenChars(stripTrailingBracketGroup(i.Name))) === targetNoBracket;
      const origMatches =
        i.OriginalTitle &&
        squash(stripParenChars(stripTrailingBracketGroup(i.OriginalTitle))) === targetNoBracket;
      return nameMatches || origMatches;
    });
    if (stage2.length === 1) return stage2[0];
    const targetNoSubtitle = squash(stripParenChars(stripSubtitleAfterSeparator(title)));
    const stage3 = items.filter((i) => {
      const nameMatches = squash(stripParenChars(stripSubtitleAfterSeparator(i.Name))) === targetNoSubtitle;
      const origMatches =
        i.OriginalTitle &&
        squash(stripParenChars(stripSubtitleAfterSeparator(i.OriginalTitle))) === targetNoSubtitle;
      return nameMatches || origMatches;
    });
    if (stage3.length === 1) return stage3[0];
    return null;
  }
  async function resolveFallbackTitle(fallbackTitleCandidates, typeFilter) {
    if (!fallbackTitleCandidates) return null;
    return await resolveTitle({ titleCandidates: fallbackTitleCandidates, literalTitleCandidates: null, typeFilter: typeFilter || null });
  }
  async function runResolvedItem(item, cmd, token) {
    if (!item) return false;
    if (cmd.isTrailer) return await playTrailer(item, token);
    const type = item.Type;
    if (cmd.isPlay && (type === "Movie" || type === "Episode")) {
      return await playViaUiWithSeek(item, token, cmd.chapterNum, cmd.chapterName, cmd.percentValue, false);
    }
    navigateToItem(item);
    await waitForDomSettle();
    if (token !== commandToken) return false;
    if (cmd.filterChain) {
      await applyFilterChainViaUi(cmd.filterChain, token);
    }
    if (cmd.isPlay) {
      return await clickWhenReadyForItem(item.Id, DETAILS_ACTION_SELECTORS.play, token, 3000);
    }
    return true;
  }
  async function resolveTitle(cmd) {
    const includeTypes = cmd.typeFilter || "Movie,Series";
    if (cmd.literalTitleCandidates) {
      for (const candidate of cmd.literalTitleCandidates) {
        const items = await searchItemsBroad(candidate, includeTypes);
        const match = resolveUniqueTitleMatch(items, candidate);
        if (match) return match;
      }
      const allLiteral = await fetchAllOfType(includeTypes);
      for (const candidate of cmd.literalTitleCandidates) {
        const match = resolveUniqueTitleMatch(allLiteral, candidate);
        if (match) return match;
      }
    }
    for (const candidate of cmd.titleCandidates) {
      const items = await searchItemsBroad(candidate, includeTypes);
      const filtered = cmd.year ? items.filter((i) => i.ProductionYear === cmd.year) : items;
      const match = resolveUniqueTitleMatch(filtered, candidate);
      if (match) return match;
    }
    const all = await fetchAllOfType(includeTypes);
    for (const candidate of cmd.titleCandidates) {
      const filtered = cmd.year ? all.filter((i) => i.ProductionYear === cmd.year) : all;
      const match = resolveUniqueTitleMatch(filtered, candidate);
      if (match) return match;
    }
    return null;
  }
  async function resolveSeriesFor(cmd) {
    for (const candidate of cmd.titleCandidates) {
      const items = await searchItemsBroad(candidate, "Series");
      const match = resolveUniqueTitleMatch(items, candidate);
      if (match) return match;
    }
    const all = await fetchAllOfType("Series");
    for (const candidate of cmd.titleCandidates) {
      const match = resolveUniqueTitleMatch(all, candidate);
      if (match) return match;
    }
    return null;
  }
  async function resolveCollectionFor(cmd) {
    const candidatesWithSuffix = [];
    cmd.titleCandidates.forEach((base) => {
      COLLECTION_KEYWORDS.forEach((kw) => candidatesWithSuffix.push(`${base} ${kw}`));
      candidatesWithSuffix.push(base);
    });
    for (const candidate of candidatesWithSuffix) {
      const items = await searchItemsBroad(candidate, "BoxSet");
      const match = resolveUniqueMatch(items, candidate);
      if (match) return match;
    }
    const all = await fetchAllOfType("BoxSet");
    for (const candidate of candidatesWithSuffix) {
      const match = resolveUniqueMatch(all, candidate);
      if (match) return match;
    }
    return null;
  }
  async function resolveGenreId(name) {
    if (!window.ApiClient) return null;
    try {
      const genre = await window.ApiClient.getJSON(
        window.ApiClient.getUrl(`Genres/${encodeURIComponent(name)}`, { UserId: getUserId() })
      );
      if (!genre || !genre.Id) return null;
      if (squash(genre.Name || "") !== squash(name)) return null;
      return genre.Id;
    } catch (err) {
      return null;
    }
  }
  async function resolveStudioId(name) {
    if (!window.ApiClient) return null;
    try {
      const studio = await window.ApiClient.getJSON(
        window.ApiClient.getUrl(`Studios/${encodeURIComponent(name)}`, { UserId: getUserId() })
      );
      if (!studio || !studio.Id) return null;
      if (squash(studio.Name || "") !== squash(name)) return null;
      return studio.Id;
    } catch (err) {
      return null;
    }
  }
  async function resolveTagName(name) {
    if (!window.ApiClient) return null;
    try {
      const result = await window.ApiClient.getItems(getUserId(), {
        Tags: name,
        Recursive: true,
        Limit: 1,
        Fields: "Tags",
      });
      const items = (result && result.Items) || [];
      if (items.length === 0) return null;
      const target = name.toLowerCase();
      const matchedTag = (items[0].Tags || []).find((t) => t.toLowerCase() === target);
      return matchedTag || name;
    } catch (err) {
      console.warn("[SilentSearch] resolveTagName failed:", err);
      return null;
    }
  }
  function personsUrl(params) {
    return window.ApiClient.getUrl("Persons", params);
  }
  async function searchPersons(term) {
    if (!window.ApiClient) return [];
    try {
      const result = await window.ApiClient.getJSON(
        personsUrl({ SearchTerm: term, UserId: getUserId(), Limit: 25 })
      );
      return (result && result.Items) || [];
    } catch (err) {
      return [];
    }
  }
  async function fetchAllPersons() {
    if (!window.ApiClient) return [];
    try {
      const result = await window.ApiClient.getJSON(
        personsUrl({ UserId: getUserId(), Limit: 2000 })
      );
      return (result && result.Items) || [];
    } catch (err) {
      return [];
    }
  }
  async function resolvePersonFor(cmd) {
    for (const candidate of cmd.titleCandidates) {
      const items = await searchPersons(candidate);
      const match = resolveUniqueMatch(items, candidate);
      if (match) return match;
    }
    const all = await fetchAllPersons();
    for (const candidate of cmd.titleCandidates) {
      const match = resolveUniqueMatch(all, candidate);
      if (match) return match;
    }
    return null;
  }
  async function getSeasonsOfSeries(seriesId) {
    try {
      const result = await window.ApiClient.getSeasons(seriesId, { userId: getUserId() });
      return (result && result.Items) || [];
    } catch (err) {
      return [];
    }
  }
  async function resolveSeason(seriesId, seasonNum) {
    const seasons = await getSeasonsOfSeries(seriesId);
    const matches = seasons.filter((s) => s.IndexNumber === seasonNum);
    return matches.length === 1 ? matches[0] : null;
  }
  async function getEpisodesOfSeries(seriesId, seasonId) {
    try {
      const params = { userId: getUserId() };
      if (seasonId) params.seasonId = seasonId;
      const result = await window.ApiClient.getEpisodes(seriesId, params);
      return (result && result.Items) || [];
    } catch (err) {
      return [];
    }
  }
  function getCurrentDetailsItemId() {
    const hash = window.location.hash || "";
    if (!hash.startsWith("#/details")) return null;
    const queryString = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const params = new URLSearchParams(queryString);
    return params.get("id");
  }
  async function getCurrentDetailsItem() {
    const id = getCurrentDetailsItemId();
    if (!id || !window.ApiClient) return null;
    try {
      const result = await window.ApiClient.getItems(getUserId(), {
        Ids: id,
        Fields: "SeriesId,SeasonId,ParentId",
      });
      return (result.Items || [])[0] || null;
    } catch (err) {
      return null;
    }
  }
  async function resolveContextItem(target) {
    const current = await getCurrentDetailsItem();
    if (!current) return null;
    if (target.kind === "seasonContext") {
      const seriesId = current.Type === "Series" ? current.Id : current.SeriesId;
      if (!seriesId) return null;
      return await resolveSeason(seriesId, target.season);
    }
    if (target.kind === "episodeContext") {
      const seasonId = current.Type === "Season" ? current.Id : current.Type === "Episode" ? current.SeasonId : null;
      const seriesId = current.Type === "Season" || current.Type === "Episode" ? current.SeriesId : null;
      if (!seasonId || !seriesId) return null;
      const episodes = await getEpisodesOfSeries(seriesId, seasonId);
      return episodes.find((e) => e.IndexNumber === target.episode) || null;
    }
    if (target.kind === "seasonEpisodeContext") {
      const seriesId = current.Type === "Series" ? current.Id : current.SeriesId;
      if (!seriesId) return null;
      const season = await resolveSeason(seriesId, target.season);
      if (!season) return null;
      const episodes = await getEpisodesOfSeries(seriesId, season.Id);
      return episodes.find((e) => e.IndexNumber === target.episode) || null;
    }
    return null;
  }
  async function resolveMediaCmdItem(cmd) {
    switch (cmd.type) {
      case "title": {
        return await resolveTitle(cmd);
      }
      case "episode": {
        const series = await resolveSeriesFor(cmd);
        if (!series) return null;
        const season = await resolveSeason(series.Id, cmd.season);
        if (!season) return null;
        const episodes = await getEpisodesOfSeries(series.Id, season.Id);
        return episodes.find((e) => e.IndexNumber === cmd.episode) || null;
      }
      case "season": {
        const series = await resolveSeriesFor(cmd);
        if (!series) return null;
        return await resolveSeason(series.Id, cmd.season);
      }
      case "collection": {
        return await resolveCollectionFor(cmd);
      }
      default:
        return null;
    }
  }
  async function resolveTargetedActionItem(target) {
    if (target.kind === "media") return await resolveMediaCmdItem(target.cmd);
    return await resolveContextItem(target);
  }
  async function getCollectionMovies(collectionId) {
    try {
      const result = await window.ApiClient.getItems(getUserId(), {
        ParentId: collectionId,
        IncludeItemTypes: "Movie",
        Recursive: true,
        SortBy: "SortName",
        Fields: "ProductionYear",
      });
      return (result && result.Items) || [];
    } catch (err) {
      return [];
    }
  }
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  async function getContextRandomPool(innerLevel) {
    const current = await getCurrentDetailsItem();
    if (current) {
      if (current.Type === "Episode") {
        const seriesId = current.SeriesId;
        if (!seriesId) return [];
        return await getEpisodesOfSeries(seriesId);
      }
      if (current.Type === "Series") {
        if (innerLevel === "season") return await getSeasonsOfSeries(current.Id);
        return await getEpisodesOfSeries(current.Id);
      }
      if (current.Type === "Season") {
        const seriesId = current.SeriesId;
        if (!seriesId) return [];
        return await getEpisodesOfSeries(seriesId, current.Id);
      }
      if (current.Type === "BoxSet") {
        return await getCollectionMovies(current.Id);
      }
    }
    if (!isLibraryFilterActive()) {
      const libType = await detectCurrentLibraryType();
      if (libType === "movies") return await fetchAllOfType("Movie");
      if (libType === "tvshows") return await fetchAllOfType("Series");
      if (libType === "boxsets") return await fetchAllOfType("BoxSet");
    }
    const urlPool = await getUrlBasedRandomPool();
    if (urlPool) return urlPool;
    return await fetchAllOfType("Movie,Series,BoxSet");
  }
  async function getUrlBasedRandomPool() {
    if (!window.ApiClient) return null;
    const hash = window.location.hash || "";
    const queryString = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const params = new URLSearchParams(queryString);
    const genreId = params.get("genreId");
    const studioId = params.get("studioId");
    const tag = params.get("tag");
    const personId = params.get("personId");
    if (!genreId && !studioId && !tag && !personId) return null;
    try {
      const query = { Recursive: true, SortBy: "Random", Limit: 1, UserId: getUserId() };
      if (genreId) query.GenreIds = genreId;
      if (studioId) query.StudioIds = studioId;
      if (tag) query.Tags = tag;
      if (personId) query.PersonIds = personId;
      const typeParam = params.get("type");
      if (typeParam) query.IncludeItemTypes = typeParam;
      const result = await window.ApiClient.getItems(getUserId(), query);
      return (result && result.Items) || [];
    } catch (err) {
      return [];
    }
  }
  async function resolveRandomOuterTitle(rawTitleText) {
    const seriesItems = await searchItemsBroad(rawTitleText, "Series");
    const seriesMatch = resolveUniqueTitleMatch(seriesItems, rawTitleText);
    if (seriesMatch) return seriesMatch;
    const candidatesWithSuffix = [rawTitleText, ...COLLECTION_KEYWORDS.map((kw) => `${rawTitleText} ${kw}`)];
    for (const candidate of candidatesWithSuffix) {
      const items = await searchItemsBroad(candidate, "BoxSet");
      const match = resolveUniqueMatch(items, candidate);
      if (match) return match;
    }
    return null;
  }
  async function executeRandomOutcome(item, rp, token) {
    const type = item.Type;
    if (type === "Movie") {
      if (rp.isPlay) return await playViaUiWithSeek(item, token, rp.chapterNum, rp.chapterName, rp.percentValue, false);
      navigateToItem(item);
      await waitForDomSettle();
      if (token !== commandToken) return false;
      return true;
    }
    if (type === "Episode") {
      if (rp.isPlay) return await playViaUiWithSeek(item, token, rp.chapterNum, rp.chapterName, rp.percentValue, false);
      navigateToItem(item);
      await waitForDomSettle();
      if (token !== commandToken) return false;
      return true;
    }
    if (type === "Season") {
      navigateToItem(item);
      await waitForDomSettle();
      if (token !== commandToken) return false;
      if (rp.isPlay) return await clickWhenReadyForItem(item.Id, DETAILS_ACTION_SELECTORS.play, token, 3000);
      return true;
    }
    if (type === "Series") {
      if (rp.seasonNum != null) {
        const season = await resolveSeason(item.Id, rp.seasonNum);
        if (!season) return false;
        const episodes = await getEpisodesOfSeries(item.Id, season.Id);
        if (episodes.length === 0) return false;
        return await executeRandomOutcome(pickRandom(episodes), rp, token);
      }
      let effectiveInner = rp.innerLevel;
      if (rp.mode === "title" && !effectiveInner) effectiveInner = "episode";
      if (rp.mode === "type" && rp.randomCount < 2) effectiveInner = null;
      if (!effectiveInner) {
        navigateToItem(item);
        await waitForDomSettle();
        if (token !== commandToken) return false;
        if (rp.isPlay) return await clickWhenReadyForItem(item.Id, DETAILS_ACTION_SELECTORS.play, token, 3000);
        return true;
      }
      if (effectiveInner === "season") {
        const seasons = await getSeasonsOfSeries(item.Id);
        if (seasons.length === 0) return false;
        return await executeRandomOutcome(pickRandom(seasons), rp, token);
      }
      if (effectiveInner && effectiveInner !== "episode") return false;
      const episodes = await getEpisodesOfSeries(item.Id);
      if (episodes.length === 0) return false;
      return await executeRandomOutcome(pickRandom(episodes), rp, token);
    }
    if (type === "BoxSet") {
      let effectiveInner = rp.innerLevel;
      if (rp.mode === "title" && !effectiveInner) effectiveInner = "movie";
      if (rp.mode === "type" && rp.randomCount < 2) effectiveInner = null;
      if (!effectiveInner) {
        navigateToItem(item);
        await waitForDomSettle();
        if (token !== commandToken) return false;
        if (rp.isPlay) return await clickWhenReadyForItem(item.Id, DETAILS_ACTION_SELECTORS.play, token, 3000);
        return true;
      }
      if (effectiveInner && effectiveInner !== "movie") return false;
      const movies = await getCollectionMovies(item.Id);
      if (movies.length === 0) return false;
      return await executeRandomOutcome(pickRandom(movies), rp, token);
    }
    return false;
  }
  function navigateToItem(item) {
    const serverId = window.ApiClient.serverId ? window.ApiClient.serverId() : "";
    const hash = `#/details?id=${encodeURIComponent(item.Id)}${
      serverId ? "&serverId=" + encodeURIComponent(serverId) : ""
    }`;
    window.location.hash = hash;
  }
  function navigateToPersonMediaList(personId, mediaType) {
    const serverId = window.ApiClient.serverId ? window.ApiClient.serverId() : "";
    const params = new URLSearchParams();
    params.set("type", mediaType);
    params.set("personId", personId);
    if (serverId) params.set("serverId", serverId);
    window.location.hash = `#/list.html?${params.toString()}`;
  }
  function isOnDedicatedLibraryPage() {
    const hash = window.location.hash || "";
    return /\/movies\.html/i.test(hash) || /\/tv\.html/i.test(hash);
  }
  function getScrollContainer() {
    return document.querySelector(".main-content") || document.documentElement;
  }
  function isPageScrollable() {
    const el = getScrollContainer();
    return el.scrollHeight > el.clientHeight;
  }
  function clickPageNavButtonWhenReady(direction, token, timeoutMs, intervalMs = 150) {
    const selector = direction === "next" ? ".btnNextPage" : ".btnPreviousPage";
    return new Promise((resolve) => {
      const start = Date.now();
      const tryClick = () => {
        if (token !== commandToken) {
          resolve(false);
          return;
        }
        const candidates = document.querySelectorAll(selector);
        const btn = [...candidates].find((el) => el.offsetParent !== null && !el.disabled);
        if (btn) {
          btn.click();
          resolve(true);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(tryClick, intervalMs);
      };
      tryClick();
    });
  }
  function jumpScroll(target, percentValue, multiplier = 1) {
    const el = getScrollContainer();
    if (target === "top") {
      el.scrollTop = 0;
      return true;
    }
    if (target === "bottom") {
      el.scrollTop = el.scrollHeight;
      return true;
    }
    if (target === "down") {
      el.scrollTop += window.innerHeight * multiplier;
      return true;
    }
    if (target === "up") {
      el.scrollTop -= window.innerHeight * multiplier;
      return true;
    }
    if (target === "percent") {
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTop = maxScroll * (percentValue / 100);
      return true;
    }
    return false;
  }
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function autoScrollSleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async function runAutoScrollLoop() {
    while (autoScrollActive) {
      const el = getScrollContainer();
      if (el.scrollTop === 0 && autoScrollTopPending) {
        autoScrollTopPending = false;
        if (autoScrollDelaySeconds > 0) {
          await autoScrollSleep(autoScrollDelaySeconds * 1000);
          if (!autoScrollActive) break;
        }
      }
      el.scrollTop += AUTO_SCROLL_SPEEDS[autoScrollSpeedIndex] * 16;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight) {
        await autoScrollSleep(3000);
        if (!autoScrollActive) break;
        el.scrollTop = 0;
        autoScrollTopPending = true;
      }
      await autoScrollSleep(16);
    }
  }
  function startAutoScroll(speedIndex) {
    if (speedIndex !== undefined) autoScrollSpeedIndex = speedIndex;
    if (!autoScrollActive) {
      autoScrollActive = true;
      autoScrollTopPending = true;
      runAutoScrollLoop();
    }
    return true;
  }
  function stopAutoScroll() {
    autoScrollActive = false;
    return true;
  }
  function waitForDomSettle(quietMs = 200, maxWaitMs = 2000) {
    return new Promise((resolve) => {
      let settled = false;
      let quietTimer;
      const finish = () => {
        if (settled) return;
        settled = true;
        observer.disconnect();
        clearTimeout(quietTimer);
        clearTimeout(maxTimer);
        resolve();
      };
      const observer = new MutationObserver(() => {
        clearTimeout(quietTimer);
        quietTimer = setTimeout(finish, quietMs);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      quietTimer = setTimeout(finish, quietMs);
      const maxTimer = setTimeout(finish, maxWaitMs);
    });
  }
  const PLAY_BUTTON_SELECTORS = [
    ".btnPlay:not(.hide)",
    "button.btnPlay",
    ".mainDetailButtons .btnPlay",
    '[data-action="resume"]',
  ];
  const TRAILER_BUTTON_SELECTORS = [
    ".btnPlayTrailer:not(.hide)",
    'button[data-action="trailer"]',
    ".trailerButton",
  ];
  const DETAILS_ACTION_SELECTORS = {
    play: PLAY_BUTTON_SELECTORS,
    resume: PLAY_BUTTON_SELECTORS,
    replay: [".btnReplay:not(.hide)", "button.btnReplay", ...PLAY_BUTTON_SELECTORS],
    trailer: TRAILER_BUTTON_SELECTORS,
    shuffle: [".btnShuffle:not(.hide)", "button.btnShuffle"],
    watched: [".btnPlaystate:not(.hide)", "button.btnPlaystate"],
    favorite: [".btnUserRating:not(.hide)", "button.btnUserRating"],
  };
  const LIST_VIEW_ACTION_SELECTORS = {
    play: [".itemsViewSettingsContainer .btnPlay:not(.hide)", ".itemsViewSettingsContainer button.btnPlay"],
    shuffle: [".itemsViewSettingsContainer .btnShuffle:not(.hide)", ".itemsViewSettingsContainer button.btnShuffle"],
  };
  const MORE_MENU_BUTTON_SELECTORS = [
    '[title="More"]',
    ".btnMoreCommands",
    'button[data-action="menu"]',
  ];
  function findActionSheetItem(match, text) {
    const candidates = document.querySelectorAll(
      ".actionSheetScroller button, .actionsheetContent button, li.listItem button"
    );
    const target = text.trim().toLowerCase();
    for (const el of candidates) {
      const textEl = el.querySelector(".actionSheetItemText, .listItemBodyText") || el;
      const content = textEl.textContent.trim().toLowerCase();
      if (match === "startsWith" ? content.startsWith(target) : content === target) {
        return el;
      }
    }
    return null;
  }
  async function applyViewOverride(values, token) {
    const currentType = await detectCurrentLibraryType();
    if ((currentType === "movies" || currentType === "tvshows") && isOnDedicatedLibraryPage()) {
      const dataIdValue = values.map((v) => ACTIONSHEET_DATA_ID[v]).find(Boolean);
      if (!dataIdValue) return false;
      const opened = await clickSelectorsWhenReady([".btnSelectView"], token, 2000);
      if (!opened) return false;
      await waitForDomSettle(150, 800);
      if (token !== commandToken) return false;
      return await clickSelectorsWhenReady([`.actionSheetMenuItem[data-id="${dataIdValue}"]`], token, 2000);
    }
    const hasSelectValue = values.some((v) => SELECT_OPTION_VALUE[v] || v === "ShowTitle");
    if (!hasSelectValue) return false;
    const opened = await clickSelectorsWhenReady([".btnViewSettings"], token, 2000);
    if (!opened) return false;
    await waitForDomSettle(150, 800);
    if (token !== commandToken) return false;
    for (const v of values) {
      if (v === "ShowTitle") {
        const checkbox = document.querySelector(".chkShowTitle");
        if (checkbox) {
          checkbox.click();
          await waitForDomSettle(100, 400);
          if (token !== commandToken) return false;
        }
        continue;
      }
      const optionValue = SELECT_OPTION_VALUE[v];
      if (!optionValue) continue;
      const select = document.querySelector(".selectImageType");
      if (select) {
        select.value = optionValue;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        await waitForDomSettle(100, 400);
        if (token !== commandToken) return false;
      }
    }
    const cancelBtn = document.querySelector(".btnCancel");
    if (cancelBtn) cancelBtn.click();
    return true;
  }
  async function applySortOverride(values, token) {
    const currentType = await detectCurrentLibraryType();
    if ((currentType === "movies" || currentType === "tvshows") && isOnDedicatedLibraryPage()) {
      const dataIdMap =
        currentType === "movies" && getCurrentActiveTabText() === "Collections"
          ? RADIO_SORTBY_DATA_ID_MOVIES_SETS
          : currentType === "movies"
            ? RADIO_SORTBY_DATA_ID_MOVIES
            : RADIO_SORTBY_DATA_ID_TVSHOWS;
      const sortByValue = values.map((v) => dataIdMap[v]).find(Boolean);
      const sortOrderValue = values.map((v) => RADIO_SORTORDER_VALUE[v]).find(Boolean);
      if (!sortByValue && !sortOrderValue) return false;
      const opened = await clickSelectorsWhenReady([".btnSort"], token, 2000);
      if (!opened) return false;
      await waitForDomSettle(150, 800);
      if (token !== commandToken) return false;
      if (sortByValue) {
        const radio = document.querySelector(`input[name="SortBy"][data-id="${sortByValue}"]`);
        if (radio && !radio.checked) {
          radio.click();
          await waitForDomSettle(100, 400);
          if (token !== commandToken) return false;
        }
      }
      if (sortOrderValue) {
        const radio = document.querySelector(`input[name="SortOrder"][value="${sortOrderValue}"]`);
        if (radio && !radio.checked) {
          radio.click();
          await waitForDomSettle(100, 400);
          if (token !== commandToken) return false;
        }
      }
      if (isSortDialogOpen()) {
        window.history.back();
        await waitWhile(isSortDialogOpen, 400);
      }
      removeOrphanedDialogBackdrops();
      return true;
    }
    const selectSortByValue = values.map((v) => SELECT_SORTBY_OPTION_VALUE[v]).find(Boolean);
    const selectSortOrderValue = values.map((v) => SELECT_SORTORDER_OPTION_VALUE[v]).find(Boolean);
    if (!selectSortByValue && !selectSortOrderValue) return false;
    const opened = await clickSelectorsWhenReady([".btnSort"], token, 2000);
    if (!opened) return false;
    await waitForDomSettle(150, 800);
    if (token !== commandToken) return false;
    if (selectSortByValue) {
      const select = document.querySelector(".selectSortBy");
      if (select) {
        select.value = selectSortByValue;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        await waitForDomSettle(100, 400);
        if (token !== commandToken) return false;
      }
    }
    if (selectSortOrderValue) {
      const select = document.querySelector(".selectSortOrder");
      if (select) {
        select.value = selectSortOrderValue;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        await waitForDomSettle(100, 400);
        if (token !== commandToken) return false;
      }
    }
    const cancelBtn2 = document.querySelector(".btnCancel");
    if (cancelBtn2) cancelBtn2.click();
    return true;
  }
  async function triggerSubmenuAction(match, text, token) {
    const opened = await clickSelectorsWhenReady(MORE_MENU_BUTTON_SELECTORS, token, 1500);
    if (!opened) return false;
    await waitForDomSettle(150, 800);
    if (token !== commandToken) return false;
    const item = findActionSheetItem(match, text);
    if (!item) {
      console.warn(`[SilentSearch] Menu item "${text}" not found`);
      return false;
    }
    item.click();
    return true;
  }
  function clickWhenReadyForItem(itemId, selectors, token, timeoutMs = 5000, intervalMs = 150) {
    return new Promise((resolve) => {
      const start = Date.now();
      const tryClick = () => {
        if (token !== commandToken) {
          resolve(false);
          return;
        }
        const hashReady = window.location.hash.includes(itemId);
        const idButton = document.querySelector(`.mainDetailButtons [data-id="${itemId}"]`);
        const container = idButton ? idButton.closest(".mainDetailButtons") : null;
        if (hashReady && container) {
          for (const sel of selectors) {
            const el = container.querySelector(sel);
            if (el) {
              el.click();
              resolve(true);
              return;
            }
          }
        }
        if (Date.now() - start > timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(tryClick, intervalMs);
      };
      tryClick();
    });
  }
  function clickTextWhenReady(label, token, timeoutMs = 5000, intervalMs = 150) {
    return new Promise((resolve) => {
      const start = Date.now();
      const tryClick = () => {
        if (token !== commandToken) {
          resolve(false);
          return;
        }
        const candidates = document.querySelectorAll(".emby-button-foreground");
        for (const el of candidates) {
          if (el.textContent.trim().toLowerCase() === label.toLowerCase()) {
            const btn = el.closest("button") || el.closest("a") || el;
            btn.click();
            resolve(true);
            return;
          }
        }
        if (Date.now() - start > timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(tryClick, intervalMs);
      };
      tryClick();
    });
  }
  function findSectionHeading(label) {
    const headings = document.querySelectorAll(".sectionTitle");
    for (const h of headings) {
      if (h.offsetParent === null) continue;
      if (h.textContent.trim().toLowerCase() === label.toLowerCase()) return h;
    }
    return null;
  }
  function scrollToSectionWhenReady(label, token, timeoutMs = 5000, intervalMs = 150) {
    return new Promise((resolve) => {
      const start = Date.now();
      const tryFind = () => {
        if (token !== commandToken) {
          resolve(false);
          return;
        }
        const h = findSectionHeading(label);
        if (h) {
          const container = h.closest(".sectionTitleContainer") || h.parentElement;
          const moreLink = container ? container.querySelector("a, button") : null;
          const clickTarget = moreLink || h.closest("a") || h;
          clickTarget.click();
          resolve(true);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(tryFind, intervalMs);
      };
      tryFind();
    });
  }
  async function playViaUi(item, token) {
    navigateToItem(item);
    return clickWhenReadyForItem(item.Id, PLAY_BUTTON_SELECTORS, token);
  }
  const FRESH_PLAY_BUTTON_SELECTORS = [".btnReplay:not(.hide)", "button.btnReplay", ...PLAY_BUTTON_SELECTORS];
  async function playViaUiFreshStart(item, token) {
    navigateToItem(item);
    return clickWhenReadyForItem(item.Id, FRESH_PLAY_BUTTON_SELECTORS, token);
  }
  async function getItemChapters(itemId) {
    if (!window.ApiClient) return [];
    try {
      const result = await window.ApiClient.getItems(getUserId(), { Ids: itemId, Fields: "Chapters" });
      const item = (result.Items || [])[0];
      return (item && item.Chapters) || [];
    } catch (err) {
      return [];
    }
  }
  function normalizeChapterName(str) {
    return (str || "").trim().toLowerCase().replace(/\s+/g, " ");
  }
  function resolveChapterSeconds(chapters, chapterNum, chapterName) {
    if (chapterName != null) {
      const target = normalizeChapterName(chapterName);
      const matches = chapters.filter((ch) => normalizeChapterName(ch.Name) === target);
      if (matches.length === 1) return (matches[0].StartPositionTicks || 0) / 10000000;
      return null;
    }
    const paddedNum = String(chapterNum).padStart(2, "0");
    const nameMatch = chapters.find((ch) => {
      const name = normalizeChapterName(ch.Name);
      return name === `chapter ${chapterNum}` || name === `chapter ${paddedNum}`;
    });
    if (nameMatch) return (nameMatch.StartPositionTicks || 0) / 10000000;
    const byPosition = chapters[chapterNum - 1];
    if (byPosition) return (byPosition.StartPositionTicks || 0) / 10000000;
    return null;
  }
  function seekVideoTo(seekSeconds, timeoutMs = 5000) {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      const tryFind = () => {
        const video = document.querySelector("video");
        if (video) {
          const applySeek = () => {
            try {
              video.currentTime = seekSeconds;
            } catch (err) {
            }
          };
          if (video.readyState >= 1) applySeek();
          else video.addEventListener("loadedmetadata", applySeek, { once: true });
          video.addEventListener("canplay", applySeek, { once: true });
          video.addEventListener("playing", () => setTimeout(applySeek, 150), { once: true });
          resolve(true);
          return;
        }
        if (Date.now() > deadline) {
          resolve(false);
          return;
        }
        setTimeout(tryFind, 100);
      };
      tryFind();
    });
  }
  function seekVideoToPercent(percent, timeoutMs = 5000) {
    return new Promise((resolve) => {
      const deadline = Date.now() + timeoutMs;
      const tryFind = () => {
        const video = document.querySelector("video");
        if (video) {
          const applySeek = () => {
            if (!video.duration || Number.isNaN(video.duration)) return;
            try {
              video.currentTime = video.duration * (percent / 100);
            } catch (err) {
            }
          };
          if (video.readyState >= 1 && video.duration) {
            applySeek();
          } else {
            video.addEventListener("loadedmetadata", applySeek, { once: true });
          }
          video.addEventListener("canplay", applySeek, { once: true });
          video.addEventListener("playing", () => setTimeout(applySeek, 150), { once: true });
          resolve(true);
          return;
        }
        if (Date.now() > deadline) {
          resolve(false);
          return;
        }
        setTimeout(tryFind, 100);
      };
      tryFind();
    });
  }
  async function playViaUiReplayOnly(item, token) {
    navigateToItem(item);
    return clickWhenReadyForItem(item.Id, [".btnReplay:not(.hide)", "button.btnReplay", ...PLAY_BUTTON_SELECTORS], token);
  }
  async function playViaUiWithSeek(item, token, chapterNum, chapterName, percentValue, isReplay) {
    if (chapterNum != null || chapterName != null) {
      const chapters = await getItemChapters(item.Id);
      const seconds = resolveChapterSeconds(chapters, chapterNum, chapterName);
      if (seconds == null) return false;
      const played = isReplay ? await playViaUiReplayOnly(item, token) : await playViaUiFreshStart(item, token);
      if (!played) return false;
      await seekVideoTo(seconds);
      return true;
    }
    if (percentValue != null) {
      const played = isReplay ? await playViaUiReplayOnly(item, token) : await playViaUiFreshStart(item, token);
      if (!played) return false;
      await seekVideoToPercent(percentValue);
      return true;
    }
    if (isReplay) return await playViaUiReplayOnly(item, token);
    return await playViaUi(item, token);
  }
  async function playItemsLegacy(items) {
    if (!items || items.length === 0) return false;
    if (!window.playbackManager) return false;
    window.playbackManager.play({ items });
    return true;
  }
  async function playTrailer(item, token) {
    navigateToItem(item);
    const clicked = await clickWhenReadyForItem(item.Id, TRAILER_BUTTON_SELECTORS, token, 3000);
    if (clicked) return true;
    try {
      const trailers = await window.ApiClient.getLocalTrailers(getUserId(), item.Id);
      if (trailers && trailers.length > 0) {
        return playItemsLegacy([trailers[0]]);
      }
    } catch (err) {}
    if (item.RemoteTrailers && item.RemoteTrailers.length > 0) {
      window.open(item.RemoteTrailers[0].Url, "_blank");
      return true;
    }
    return false;
  }
  async function playTrailerByCurrentPage(token) {
    const itemId = getCurrentDetailsItemId();
    if (!itemId) return false;
    const clicked = await clickWhenReadyForItem(itemId, TRAILER_BUTTON_SELECTORS, token, 3000);
    if (clicked) return true;
    try {
      const trailers = await window.ApiClient.getLocalTrailers(getUserId(), itemId);
      if (trailers && trailers.length > 0) {
        return playItemsLegacy([trailers[0]]);
      }
    } catch (err) {}
    try {
      const result = await window.ApiClient.getItems(getUserId(), { Ids: itemId, Fields: "RemoteTrailers" });
      const item = (result.Items || [])[0];
      if (item && item.RemoteTrailers && item.RemoteTrailers.length > 0) {
        window.open(item.RemoteTrailers[0].Url, "_blank");
        return true;
      }
    } catch (err) {}
    return false;
  }
  async function runCommand(cmd, token) {
    switch (cmd.type) {
      case "back": {
        window.history.back();
        return true;
      }
      case "detailsAction": {
        const itemId = getCurrentDetailsItemId();
        if (itemId) {
          const selectors = DETAILS_ACTION_SELECTORS[cmd.action] || [];
          return await clickWhenReadyForItem(itemId, selectors, token, 1500);
        }
        const listSelectors = LIST_VIEW_ACTION_SELECTORS[cmd.action];
        if (!listSelectors) return false;
        return await clickSelectorsWhenReady(listSelectors, token, 1500);
      }
      case "contextJump": {
        const item = await resolveContextItem(cmd);
        if (!item) return false;
        navigateToItem(item);
        await waitForDomSettle();
        if (token !== commandToken) return false;
        return true;
      }
      case "contextPlay": {
        const item = await resolveContextItem(cmd);
        if (!item) return false;
        if (cmd.kind === "seasonContext") {
          if (cmd.isTrailer) return await playTrailer(item, token);
          navigateToItem(item);
          await waitForDomSettle();
          if (token !== commandToken) return false;
          return await clickWhenReadyForItem(item.Id, DETAILS_ACTION_SELECTORS.play, token, 3000);
        }
        if (cmd.isTrailer) return false;
        return await playViaUiWithSeek(item, token, cmd.chapterNum, cmd.chapterName, cmd.percentValue, cmd.isReplay);
      }
      case "chapterSeekCurrentPage": {
        const itemId = getCurrentDetailsItemId();
        if (!itemId) return false;
        return await playViaUiWithSeek({ Id: itemId }, token, cmd.chapterNum, cmd.chapterName, cmd.percentValue, false);
      }
      case "targetedAction": {
        const item = await resolveTargetedActionItem(cmd.target);
        if (!item) return false;
        navigateToItem(item);
        if (cmd.actionKind === "detailsAction") {
          const selectors = DETAILS_ACTION_SELECTORS[cmd.actionData] || [];
          return await clickWhenReadyForItem(item.Id, selectors, token, 3000);
        }
        if (cmd.actionKind === "submenuAction") {
          await waitForDomSettle();
          if (token !== commandToken) return false;
          return await triggerSubmenuAction(cmd.actionData.match, cmd.actionData.text, token);
        }
        return false;
      }
      case "reload": {
        window.location.reload();
        return true;
      }
      case "fullscreen": {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        }
        return true;
      }
      case "windowed": {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
        return true;
      }
      case "mainSeries": {
        const current = await getCurrentDetailsItem();
        if (!current) return false;
        const seriesId = current.Type === "Episode" || current.Type === "Season" ? current.SeriesId : null;
        if (!seriesId) return false;
        navigateToItem({ Id: seriesId });
        return true;
      }
      case "alphaPicker": {
        return await clickSelectorsWhenReady([alphaPickerSelector(cmd.value)], token, 2000);
      }
      case "withLetterAfter": {
        if (cmd.innerCmd) {
          const success = await runCommand(cmd.innerCmd, token);
          if (!success) return false;
        }
        return await clickSelectorsWhenReady([alphaPickerSelector(cmd.letter)], token, 2000);
      }
      case "withViewAfter": {
        if (cmd.innerCmd) {
          const success = await runCommand(cmd.innerCmd, token);
          if (!success) return false;
        }
        return await applyViewOverride(cmd.values, token);
      }
      case "withSortAfter": {
        if (cmd.innerCmd) {
          const success = await runCommand(cmd.innerCmd, token);
          if (!success) return false;
        }
        return await applySortOverride(cmd.values, token);
      }
      case "withResetAfter": {
        if (cmd.innerCmd) {
          const success = await runCommand(cmd.innerCmd, token);
          if (!success) return false;
        }
        if (cmd.targetFilterChain) {
          return await applyFilterChainViaUi(cmd.targetFilterChain, token, false);
        }
        return await performFullFilterReset(token);
      }
      case "withNextUpAfter": {
        if (cmd.innerCmd) {
          const success = await runCommand(cmd.innerCmd, token);
          if (!success) return false;
        }
        const card = document.querySelector(".nextUpItems .card");
        if (!card) return false;
        if (cmd.shouldPlay) {
          const resumeBtn = card.querySelector('button[data-action="resume"]');
          if (!resumeBtn) return false;
          resumeBtn.click();
          return true;
        }
        const itemId = card.getAttribute("data-id");
        if (!itemId) return false;
        navigateToItem({ Id: itemId });
        await waitForDomSettle();
        if (token !== commandToken) return false;
        return true;
      }
      case "withListActionAfter": {
        if (cmd.innerCmd) {
          const success = await runCommand(cmd.innerCmd, token);
          if (!success) return false;
        }
        if (cmd.kind === "submenuAction") {
          return await triggerSubmenuAction(cmd.data.match, cmd.data.text, token);
        }
        if (cmd.kind === "trailerAction") {
          return await playTrailerByCurrentPage(token);
        }
        const selectors = DETAILS_ACTION_SELECTORS[cmd.data] || PLAY_BUTTON_SELECTORS;
        return await clickSelectorsWhenReady(selectors, token, 2000);
      }
      case "bareLetterWithAlphaFallback": {
        const btn = document.querySelector(alphaPickerSelector(cmd.letter));
        if (btn && btn.offsetParent !== null) {
          btn.click();
          return true;
        }
        if (cmd.innerCmd) return await runCommand(cmd.innerCmd, token);
        return false;
      }
      case "scrollJump": {
        return jumpScroll(cmd.target, cmd.percentValue, cmd.multiplier || 1);
      }
      case "pageNav": {
        return await clickPageNavButtonWhenReady(cmd.direction, token, 2000);
      }
      case "pageNavMulti": {
        let clickedAny = false;
        for (let i = 0; i < cmd.count; i++) {
          if (token !== commandToken) return clickedAny;
          const clicked = await clickPageNavButtonWhenReady(cmd.direction, token, 1000);
          if (!clicked) break;
          clickedAny = true;
          await sleep(500);
        }
        return clickedAny;
      }
      case "pageNavToEnd": {
        let clickedAny = false;
        for (let i = 0; i < 100; i++) {
          if (token !== commandToken) return clickedAny;
          const clicked = await clickPageNavButtonWhenReady(cmd.direction, token, 1000);
          if (!clicked) break;
          clickedAny = true;
          await sleep(500);
        }
        return clickedAny;
      }
      case "bareScrollArrowFallback": {
        if (isPageScrollable()) {
          return jumpScroll(cmd.target, cmd.percentValue);
        }
        if (cmd.innerCmd) return await runCommand(cmd.innerCmd, token);
        return false;
      }
      case "bareArrowFallback": {
        const clicked = await clickPageNavButtonWhenReady(cmd.direction, token, 0);
        if (clicked) return true;
        if (cmd.innerCmd) return await runCommand(cmd.innerCmd, token);
        return false;
      }
      case "autoScrollStart": {
        return startAutoScroll(cmd.speedIndex);
      }
      case "autoScrollStop": {
        return stopAutoScroll();
      }
      case "autoScrollDelay": {
        autoScrollDelaySeconds = cmd.seconds;
        return true;
      }
      case "libraryTab": {
        if (!cmd.alreadyInLibrary) {
          const library = await resolveLibrary(cmd.libraryType);
          if (!library) return false;
          const hash = buildLibraryHash(library, cmd.libraryType);
          window.location.hash = hash;
          await waitForDomSettle();
          if (token !== commandToken) return false;
        }
        if (!cmd.tabAlreadyActive) {
          const clickedTab = await clickTextWhenReady(cmd.tabText, token);
          if (!clickedTab) return false;
        }
        if (cmd.subName) {
          await waitForDomSettle();
          if (token !== commandToken) return false;
          const scrolled = await scrollToSectionWhenReady(cmd.subName, token);
          if (!scrolled) return false;
          await waitForDomSettle();
          if (token !== commandToken) return false;
          await sleep(500);
          if (token !== commandToken) return false;
        }
        if (cmd.filterChain) {
          await waitForDomSettle();
          if (token !== commandToken) return false;
          await applyFilterChainViaUi(cmd.filterChain, token);
        }
        return true;
      }
      case "directLookup": {
        if (!window.ApiClient) return false;
        const serverId = window.ApiClient.serverId ? window.ApiClient.serverId() : "";
        const params = new URLSearchParams();
        let lookupFailed = false;
        if (cmd.kind === "tag") {
          const tagName = await resolveTagName(cmd.name);
          if (!tagName) {
            lookupFailed = true;
          } else {
            params.set("type", "tag");
            params.set("tag", tagName);
          }
        } else {
          const id = cmd.kind === "genre" ? await resolveGenreId(cmd.name) : await resolveStudioId(cmd.name);
          if (!id) {
            lookupFailed = true;
          } else {
            params.set(cmd.kind === "genre" ? "genreId" : "studioId", id);
          }
        }
        if (lookupFailed) {
          const fallbackTitle = await resolveFallbackTitle(cmd.fallbackTitleCandidates);
          if (fallbackTitle) return await runResolvedItem(fallbackTitle, cmd, token);
          return false;
        }
        if (serverId) params.set("serverId", serverId);
        window.location.hash = `#/list.html?${params.toString()}`;
        await waitForDomSettle();
        if (token !== commandToken) return false;
        if (cmd.filterChain) {
          await applyFilterChainViaUi(cmd.filterChain, token);
        }
        return true;
      }
      case "search": {
        window.location.hash = `#/search.html?query=${encodeURIComponent(cmd.term)}`;
        return true;
      }
      case "submenuAction": {
        return await triggerSubmenuAction(cmd.match, cmd.text, token);
      }
      case "resetFilters": {
        const library = await resolveLibrary(cmd.libraryType);
        if (!library) return false;
        const hash = buildLibraryHash(library, cmd.libraryType);
        window.location.hash = hash;
        await waitForDomSettle();
        if (token !== commandToken) return false;
        if (cmd.targetFilterChain) {
          return await applyFilterChainViaUi(cmd.targetFilterChain, token, false);
        }
        return await performFullFilterReset(token);
      }
      case "resetFiltersCurrentPage": {
        if (cmd.targetFilterChain) {
          return await applyFilterChainViaUi(cmd.targetFilterChain, token, false);
        }
        return await performFullFilterReset(token);
      }
      case "personMedia": {
        const person = await resolvePersonFor({ titleCandidates: cmd.personTitleCandidates });
        if (!person) {
          const fallbackTitle = await resolveFallbackTitle(cmd.fallbackTitleCandidates, cmd.mediaType);
          if (fallbackTitle) return await runResolvedItem(fallbackTitle, cmd, token);
          return false;
        }
        if (!cmd.isRandom) {
          navigateToPersonMediaList(person.Id, cmd.mediaType);
          await waitForDomSettle();
          if (token !== commandToken) return false;
          if (cmd.filterChain) {
            await applyFilterChainViaUi(cmd.filterChain, token);
          }
          return true;
        }
        const items = await getPersonMedia(person.Id, cmd.mediaType, cmd.filterParams);
        if (items.length === 0) return false;
        const picked = pickRandom(items);
        if (cmd.isPlay) return await playViaUi(picked, token);
        navigateToItem(picked);
        return true;
      }
      case "randomPick2": {
        let outerItem = null;
        if (cmd.mode === "context") {
          const pool = await getContextRandomPool(cmd.innerLevel);
          if (pool.length === 0) return false;
          outerItem = pickRandom(pool);
        } else if (cmd.mode === "type") {
          if (cmd.randomCount === 1 && cmd.pickTypes.length === 1 && cmd.pickTypes[0] === "Movie") {
            const current = await getCurrentDetailsItem();
            if (current && current.Type === "BoxSet") {
              const items = await getCollectionMovies(current.Id);
              if (items.length > 0) outerItem = pickRandom(items);
            }
          }
          if (!outerItem) {
            const includeTypes = cmd.pickTypes.join(",");
            const items = await fetchAllOfType(includeTypes);
            if (items.length === 0) return false;
            outerItem = pickRandom(items);
          }
        } else if (cmd.mode === "title") {
          outerItem = await resolveRandomOuterTitle(cmd.rawTitleText);
        }
        if (!outerItem) return false;
        return await executeRandomOutcome(outerItem, cmd, token);
      }
      case "nav": {
        window.location.hash = "#/home.html";
        await waitForDomSettle();
        if (token !== commandToken) return false;
        if (cmd.target === "home") {
          const clicked = await clickTextWhenReady("Home", token);
          if (!clicked) return false;
          await waitForActiveTab("Home");
          return true;
        }
        if (cmd.target === "favourites") {
          const clicked = await clickTextWhenReady("Favorites", token);
          if (!clicked) return false;
          await waitForActiveTab("Favorites");
          if (!cmd.section) return true;
          await waitForDomSettle();
          if (token !== commandToken) return false;
          return await scrollToSectionWhenReady(cmd.section, token);
        }
        return false;
      }
      case "section": {
        if (!cmd.filterChain && !cmd.forceGlobal && cmd.section && findSectionHeading(cmd.section)) {
          return await scrollToSectionWhenReady(cmd.section, token);
        }
        const handled = await tryLibraryOrStatic(cmd.word, cmd.filterChain, token);
        if (handled) return true;
        if (!cmd.section) return false;
        return await scrollToSectionWhenReady(cmd.section, token);
      }
      case "library": {
        return await tryLibraryOrStatic(cmd.term, cmd.filterChain, token);
      }
      case "filterCurrentPage": {
        return await applyFilterChainViaUi(cmd.filterChain, token);
      }
      case "title": {
        if (!cmd.isPlay && !cmd.isTrailer && !cmd.isRandom) {
          const handled = await tryLibraryOrStatic(cmd.fallbackRaw, cmd.filterChain, token);
          if (handled) return true;
        }
        const item = await resolveTitle(cmd);
        if (!item) return false;
        if (item.Type === "Movie") {
          if (cmd.isTrailer) return await playTrailer(item, token);
          if (cmd.isPlay) return await playViaUiWithSeek(item, token, cmd.chapterNum, cmd.chapterName, cmd.percentValue, cmd.isReplay);
          navigateToItem(item);
          await waitForDomSettle();
          if (token !== commandToken) return false;
          return true;
        }
        if (item.Type === "Series") {
          if (cmd.isTrailer) return await playTrailer(item, token);
          if (cmd.isRandom) {
            const episodes = await getEpisodesOfSeries(item.Id);
            if (episodes.length === 0) return false;
            const chosen = pickRandom(episodes);
            if (cmd.isPlay) return await playViaUiWithSeek(chosen, token, cmd.chapterNum, cmd.chapterName, cmd.percentValue, cmd.isReplay);
            navigateToItem(chosen);
            await waitForDomSettle();
            if (token !== commandToken) return false;
            return true;
          }
          navigateToItem(item);
          await waitForDomSettle();
          if (token !== commandToken) return false;
          if (cmd.isPlay) {
            return await clickWhenReadyForItem(item.Id, DETAILS_ACTION_SELECTORS.play, token, 3000);
          }
          return true;
        }
        return false;
      }
      case "collection": {
        if (cmd.originalText && !cmd.isPlay && !cmd.isTrailer && !cmd.isRandom) {
          const folderJump = await tryCurrentFolderChild(cmd.originalText, token);
          if (folderJump) return true;
        }
        const collection = await resolveCollectionFor(cmd);
        if (!collection) {
          const fallbackTitle = await resolveFallbackTitle(cmd.fallbackTitleCandidates);
          if (fallbackTitle) return await runResolvedItem(fallbackTitle, cmd, token);
          return false;
        }
        if (cmd.isTrailer) return await playTrailer(collection, token);
        if (cmd.isRandom) {
          const movies = await getCollectionMovies(collection.Id);
          if (movies.length === 0) return false;
          const chosen = pickRandom(movies);
          if (cmd.isPlay) return await playViaUi(chosen, token);
          navigateToItem(chosen);
          await waitForDomSettle();
          if (token !== commandToken) return false;
          return true;
        }
        navigateToItem(collection);
        await waitForDomSettle();
        if (token !== commandToken) return false;
        if (cmd.isPlay) {
          return await clickWhenReadyForItem(collection.Id, DETAILS_ACTION_SELECTORS.play, token, 3000);
        }
        return true;
      }
      case "person": {
        if (cmd.originalText && !cmd.isPlay && !cmd.isTrailer && !cmd.isRandom) {
          const folderJump = await tryCurrentFolderChild(cmd.originalText, token);
          if (folderJump) return true;
        }
        const person = await resolvePersonFor(cmd);
        if (person) {
          navigateToItem(person);
          await waitForDomSettle();
          if (token !== commandToken) return false;
          return true;
        }
        if (cmd.fallbackTitleCandidates) {
          const fallbackTitle = await resolveFallbackTitle(cmd.fallbackTitleCandidates, cmd.typeFilter);
          if (fallbackTitle) return await runResolvedItem(fallbackTitle, cmd, token);
        }
        return false;
      }
      case "season": {
        const series = await resolveSeriesFor(cmd);
        if (!series) return false;
        const season = await resolveSeason(series.Id, cmd.season);
        if (!season) return false;
        if (cmd.isTrailer) return await playTrailer(season, token);
        if (cmd.isRandom) {
          const episodes = await getEpisodesOfSeries(series.Id, season.Id);
          if (episodes.length === 0) return false;
          const chosen = pickRandom(episodes);
          if (cmd.isPlay) return await playViaUiWithSeek(chosen, token, cmd.chapterNum, cmd.chapterName, cmd.percentValue, cmd.isReplay);
          navigateToItem(chosen);
          await waitForDomSettle();
          if (token !== commandToken) return false;
          return true;
        }
        navigateToItem(season);
        await waitForDomSettle();
        if (token !== commandToken) return false;
        if (cmd.isPlay) {
          return await clickWhenReadyForItem(season.Id, DETAILS_ACTION_SELECTORS.play, token, 3000);
        }
        return true;
      }
      case "episode": {
        if (cmd.isTrailer) return false;
        const series = await resolveSeriesFor(cmd);
        if (!series) return false;
        const season = await resolveSeason(series.Id, cmd.season);
        if (!season) return false;
        const episodes = await getEpisodesOfSeries(series.Id, season.Id);
        const episode = episodes.find((e) => e.IndexNumber === cmd.episode);
        if (!episode) return false;
        if (cmd.isPlay) return await playViaUiWithSeek(episode, token, cmd.chapterNum, cmd.chapterName, cmd.percentValue, cmd.isReplay);
        navigateToItem(episode);
        await waitForDomSettle();
        if (token !== commandToken) return false;
        return true;
      }
      default:
        return false;
    }
  }
  async function processBuffer() {
    const raw = buffer;
    resetBuffer();
    if (raw.trim().length < CONFIG.minLength) return;
    const cmd = await parseCommand(raw);
    if (!cmd) {
      flashResult(false);
      return;
    }
    const token = ++commandToken;
    try {
      const success = await runCommand(cmd, token);
      if (token === commandToken) flashResult(success);
    } catch (err) {
      if (token === commandToken) flashResult(false);
    }
  }
})();