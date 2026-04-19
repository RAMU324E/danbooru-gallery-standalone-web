const CATEGORY_ORDER = ["artist", "copyright", "character", "general", "meta"];
const RATING_VALUES = ["general", "sensitive", "questionable", "explicit"];
const RATING_META = {
    general: { label: "普通", api: "g" },
    sensitive: { label: "敏感", api: "s" },
    questionable: { label: "可疑", api: "q" },
    explicit: { label: "显式", api: "e" },
};
const RATING_API_TO_VALUE = {
    g: "general",
    s: "sensitive",
    q: "questionable",
    e: "explicit",
};
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "bmp", "tiff", "tif"];
const ONLINE_BATCH_MIN = 30;
const ONLINE_BATCH_MAX = 80;
const ONLINE_BATCH_MULTIPLIER = 3;
const CATEGORY_META = {
    artist: { label: "画师", className: "artist" },
    copyright: { label: "版权", className: "copyright" },
    character: { label: "角色", className: "character" },
    general: { label: "普通", className: "general" },
    meta: { label: "元数据", className: "meta" },
};
const DANBOORU_CATEGORY_MAP = {
    0: "general",
    1: "artist",
    3: "copyright",
    4: "character",
    5: "meta",
};
const STORAGE_KEYS = {
    localFavorites: "danbooru-standalone-favorites",
    remoteFavorites: "danbooru-standalone-remote-favorites",
    uiPrefs: "danbooru-standalone-ui",
};
const DEFAULT_UI_PREFS = {
    searchValue: "order:rank",
    ratingValues: [...RATING_VALUES],
    limit: 20,
    page: 1,
    replaceUnderscores: true,
    escapeBrackets: true,
};

const state = {
    settings: null,
    library: null,
    selectedCategory: null,
    searchResults: [],
    currentPosts: [],
    originalPosts: {},
    postEdits: {},
    editingPostId: null,
    viewingPostId: null,
    editorAddCategory: "general",
    editorSelectedCategories: new Set(),
    translations: {},
    favoritesOnly: false,
    localFavorites: loadStoredFavorites(STORAGE_KEYS.localFavorites),
    remoteFavorites: loadStoredFavorites(STORAGE_KEYS.remoteFavorites),
    uiPrefs: loadUiPrefs(),
    autocompleteCache: {},
    loading: false,
    favoriteSync: {
        hasAuth: false,
        username: "",
        truncated: false,
    },
    appExit: {
        ignoreBeforeUnloadPrompt: false,
        shutdownInFlight: false,
    },
    onlineSearchCache: createEmptyOnlineSearchCache(),
    pagination: {
        page: 1,
        limit: DEFAULT_UI_PREFS.limit,
        totalKnown: 0,
        exhausted: false,
        hasNext: true,
    },
};

const elements = {
    sourceBadge: document.getElementById("source-badge"),
    searchStatus: document.getElementById("search-status"),
    favoritesCountBtn: document.getElementById("favorites-count-btn"),
    openExitDialogBtn: document.getElementById("open-exit-dialog-btn"),
    selectionStatus: document.getElementById("selection-status"),
    searchTags: document.getElementById("search-tags"),
    clearSearchBtn: document.getElementById("clear-search-btn"),
    searchAutocomplete: document.getElementById("search-autocomplete"),
    rankingToggle: document.getElementById("ranking-toggle"),
    favoritesToggle: document.getElementById("favorites-toggle"),
    ratingDropdownBtn: document.getElementById("rating-dropdown-btn"),
    ratingButtonValue: document.getElementById("rating-button-value"),
    ratingAllCheckbox: document.getElementById("rating-all"),
    ratingValueCheckboxes: document.querySelectorAll(".rating-checkbox-value"),
    toolbarCategoryCheckboxes: document.querySelectorAll(".toolbar-category-checkbox"),
    fmtReplaceUnderscores: document.getElementById("fmt-replace-underscores"),
    fmtEscapeBrackets: document.getElementById("fmt-escape-brackets"),
    filterToggle: document.getElementById("filter-toggle"),
    openLibraryBtn: document.getElementById("open-library-btn"),
    openSettingsBtn: document.getElementById("open-settings-btn"),
    refreshBtn: document.getElementById("refresh-btn"),
    searchLimit: document.getElementById("search-limit"),
    searchPage: document.getElementById("search-page"),
    prevPageBtn: document.getElementById("prev-page-btn"),
    jumpPageBtn: document.getElementById("jump-page-btn"),
    nextPageBtn: document.getElementById("next-page-btn"),
    resultsGrid: document.getElementById("results-grid"),
    viewerDialog: document.getElementById("viewer-dialog"),
    viewerTitle: document.getElementById("viewer-title"),
    viewerMeta: document.getElementById("viewer-meta"),
    viewerImage: document.getElementById("viewer-image"),
    viewerOpenPostBtn: document.getElementById("viewer-open-post-btn"),
    viewerEditBtn: document.getElementById("viewer-edit-btn"),
    closeViewerBtn: document.getElementById("close-viewer-btn"),
    exitDialog: document.getElementById("exit-dialog"),
    closeExitDialogBtn: document.getElementById("close-exit-dialog-btn"),
    cancelExitBtn: document.getElementById("cancel-exit-btn"),
    closePageBtn: document.getElementById("close-page-btn"),
    confirmExitAppBtn: document.getElementById("confirm-exit-app-btn"),
    editorDialog: document.getElementById("editor-dialog"),
    closeEditorBtn: document.getElementById("close-editor-btn"),
    editorTitle: document.getElementById("editor-title"),
    editorSubtitle: document.getElementById("editor-subtitle"),
    editorPreview: document.getElementById("editor-preview"),
    editorMetaLine: document.getElementById("editor-meta-line"),
    editorPostLink: document.getElementById("editor-post-link"),
    addTagTargetLabel: document.getElementById("add-tag-target-label"),
    addTagInput: document.getElementById("add-tag-input"),
    addTagAutocomplete: document.getElementById("add-tag-autocomplete"),
    addTagBtn: document.getElementById("add-tag-btn"),
    tagGroups: document.getElementById("tag-groups"),
    promptEditor: document.getElementById("prompt-editor"),
    cleanPromptBtn: document.getElementById("clean-prompt-btn"),
    copyPromptBtn: document.getElementById("copy-prompt-btn"),
    resetTagsBtn: document.getElementById("reset-tags-btn"),
    settingsDialog: document.getElementById("settings-dialog"),
    settingsForm: document.getElementById("settings-form"),
    closeSettingsBtn: document.getElementById("close-settings-btn"),
    cancelSettingsBtn: document.getElementById("cancel-settings-btn"),
    settingsUsername: document.getElementById("settings-username"),
    settingsApiKey: document.getElementById("settings-api-key"),
    settingsFilterTags: document.getElementById("settings-filter-tags"),
    settingsFilterEnabled: document.getElementById("settings-filter-enabled"),
    settingsHighQualityPreviews: document.getElementById("settings-high-quality-previews"),
    settingsAutocompleteMaxResults: document.getElementById("settings-autocomplete-max-results"),
    settingsSelectedCategories: document.querySelectorAll('input[name="settings-selected-categories"]'),
    libraryDialog: document.getElementById("library-dialog"),
    closeLibraryBtn: document.getElementById("close-library-btn"),
    libraryMeta: document.getElementById("library-meta"),
    categoryList: document.getElementById("category-list"),
    promptList: document.getElementById("prompt-list"),
    newCategoryBtn: document.getElementById("new-category-btn"),
    renameCategoryBtn: document.getElementById("rename-category-btn"),
    deleteCategoryBtn: document.getElementById("delete-category-btn"),
    newPromptBtn: document.getElementById("new-prompt-btn"),
    exportLibraryBtn: document.getElementById("export-library-btn"),
    importLibraryBtn: document.getElementById("import-library-btn"),
    importFileInput: document.getElementById("import-file-input"),
    promptDialog: document.getElementById("prompt-dialog"),
    promptDialogTitle: document.getElementById("prompt-dialog-title"),
    promptForm: document.getElementById("prompt-form"),
    closePromptDialogBtn: document.getElementById("close-prompt-dialog-btn"),
    cancelPromptDialogBtn: document.getElementById("cancel-prompt-dialog-btn"),
    promptEntryId: document.getElementById("prompt-entry-id"),
    promptEntryCategory: document.getElementById("prompt-entry-category"),
    promptEntryAlias: document.getElementById("prompt-entry-alias"),
    promptEntryText: document.getElementById("prompt-entry-text"),
    promptEntryDescription: document.getElementById("prompt-entry-description"),
    promptEntryTags: document.getElementById("prompt-entry-tags"),
    toastRegion: document.getElementById("toast-region"),
    cleanOptions: {
        format: document.getElementById("opt-format"),
        underscore: document.getElementById("opt-underscore"),
        weight: document.getElementById("opt-weight"),
        escape: document.getElementById("opt-escape"),
        commas: document.getElementById("opt-commas"),
        region: document.getElementById("opt-region"),
        removeLora: document.getElementById("opt-remove-lora"),
        newlines: document.getElementById("opt-newlines"),
    },
};

async function api(path, options = {}) {
    const response = await fetch(path, options);
    if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const data = await response.json();
            throw new Error(data.detail || JSON.stringify(data));
        }
        throw new Error((await response.text()) || `HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        return response.json();
    }
    return response.text();
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function notify(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast ${type === "success" ? "is-success" : ""} ${type === "error" ? "is-error" : ""}`.trim();
    toast.textContent = message;
    elements.toastRegion.appendChild(toast);
    window.setTimeout(() => {
        toast.remove();
    }, 3200);
}

function loadUiPrefs() {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEYS.uiPrefs);
        if (!raw) {
            return { ...DEFAULT_UI_PREFS };
        }
        const parsed = JSON.parse(raw);
        if (!parsed.ratingValues) {
            if (parsed.rating && parsed.rating !== "all") {
                parsed.ratingValues = [RATING_API_TO_VALUE[parsed.rating] || parsed.rating];
            } else {
                parsed.ratingValues = [...RATING_VALUES];
            }
        }
        return { ...DEFAULT_UI_PREFS, ...parsed };
    } catch {
        return { ...DEFAULT_UI_PREFS };
    }
}

function saveUiPrefs() {
    window.localStorage.setItem(
        STORAGE_KEYS.uiPrefs,
        JSON.stringify({
            searchValue: elements.searchTags.value,
            ratingValues: getSelectedRatingValues(),
            limit: Number(elements.searchLimit.value) || 20,
            page: Number(elements.searchPage.value) || 1,
            replaceUnderscores: elements.fmtReplaceUnderscores.checked,
            escapeBrackets: elements.fmtEscapeBrackets.checked,
        }),
    );
}

function loadStoredFavorites(storageKey) {
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return Object.fromEntries(parsed.map((item) => [String(item.id), item]));
        }
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function hasDanbooruAuth() {
    return Boolean(state.favoriteSync.hasAuth && state.favoriteSync.username);
}

function getActiveFavoriteStore() {
    return hasDanbooruAuth() ? state.remoteFavorites : state.localFavorites;
}

function getAnyFavoriteStore(postId) {
    const key = String(postId);
    return state.remoteFavorites[key] || state.localFavorites[key] || null;
}

function saveFavoriteStore(kind) {
    const storageKey = kind === "remote" ? STORAGE_KEYS.remoteFavorites : STORAGE_KEYS.localFavorites;
    const store = kind === "remote" ? state.remoteFavorites : state.localFavorites;
    window.localStorage.setItem(storageKey, JSON.stringify(store));
    updateFavoritesCount();
}

function saveActiveFavoriteStore() {
    saveFavoriteStore(hasDanbooruAuth() ? "remote" : "local");
}

function isPostFavorited(postId) {
    return Boolean(getActiveFavoriteStore()[String(postId)]);
}

function createEmptyOnlineSearchCache(key = "") {
    return {
        key,
        filteredPosts: [],
        nextServerPage: 1,
        rawFetched: 0,
        filteredOut: 0,
        exhausted: false,
    };
}

function updateFavoritesCount() {
    const count = Object.keys(getActiveFavoriteStore()).length;
    const suffix = hasDanbooruAuth() && state.favoriteSync.truncated ? "+" : "";
    elements.favoritesCountBtn.textContent = `收藏 ${count}${suffix}`;
}

function updateSelectionStatus() {
    if (state.editingPostId) {
        const post = getEffectivePost(state.editingPostId);
        elements.selectionStatus.textContent = post
            ? `当前选中 #${post.id} · ${isPostEdited(post.id) ? "已编辑" : "未编辑"}`
            : "点击图片进入标签编辑。";
        return;
    }
    elements.selectionStatus.textContent = "点击图片进入标签编辑。";
}

function tokenizeCommaInput(value) {
    return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function splitTagString(raw) {
    return String(raw || "")
        .split(" ")
        .map((tag) => tag.trim())
        .filter(Boolean);
}

function uniqueTags(tags) {
    const seen = new Set();
    const result = [];
    for (const tag of tags) {
        if (!tag || seen.has(tag)) {
            continue;
        }
        seen.add(tag);
        result.push(tag);
    }
    return result;
}

function joinTagString(tags) {
    return uniqueTags(tags).join(" ");
}

function clonePost(post) {
    return JSON.parse(JSON.stringify(post));
}

function normalizeSearchTag(tag) {
    let converted = tag.trim().replace(/\\([()])/g, "$1");
    if (!converted.includes(":")) {
        converted = converted.replace(/\s+/g, "_");
    }
    return converted;
}

function normalizePostRating(rating) {
    if (!rating) {
        return "";
    }
    return RATING_API_TO_VALUE[String(rating).toLowerCase()] || String(rating).toLowerCase();
}

function getSelectedRatingValues() {
    return Array.from(elements.ratingValueCheckboxes)
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);
}

function updateRatingButtonLabel() {
    const selected = getSelectedRatingValues();
    let label = "全部";
    if (!selected.length) {
        label = "无";
    } else if (selected.length === 1) {
        label = RATING_META[selected[0]]?.label || selected[0];
    } else if (selected.length < RATING_VALUES.length) {
        label = selected.map((value) => RATING_META[value]?.label || value).join(" / ");
    }
    elements.ratingButtonValue.textContent = label;
}

function applySelectedRatingValues(selectedValues = RATING_VALUES) {
    const normalized = Array.isArray(selectedValues) && selectedValues.length
        ? selectedValues.filter((value) => RATING_VALUES.includes(value))
        : [...RATING_VALUES];
    elements.ratingValueCheckboxes.forEach((checkbox) => {
        checkbox.checked = normalized.includes(checkbox.value);
    });
    elements.ratingAllCheckbox.checked = normalized.length === RATING_VALUES.length;
    updateRatingButtonLabel();
}

function getServerRatingParam() {
    const selected = getSelectedRatingValues();
    if (selected.length === 1) {
        return RATING_META[selected[0]]?.api || "all";
    }
    return "all";
}

function filterPostsBySelectedRatings(posts) {
    const selected = getSelectedRatingValues();
    if (!selected.length) {
        return [];
    }
    if (selected.length === RATING_VALUES.length) {
        return posts;
    }
    return posts.filter((post) => selected.includes(normalizePostRating(post.rating)));
}

function isValidImageType(post) {
    const fileExt = String(post.file_ext || "").toLowerCase().trim();
    if (fileExt) {
        return ALLOWED_IMAGE_EXTENSIONS.includes(fileExt);
    }
    const fileUrl = String(post.file_url || "").toLowerCase();
    const match = fileUrl.match(/\.([^.?#]+)(?:\?|#|$)/);
    if (!match) {
        return false;
    }
    return ALLOWED_IMAGE_EXTENSIONS.includes(match[1]);
}

function isPostBlacklisted(post) {
    const blacklist = Array.isArray(state.settings?.blacklist) ? state.settings.blacklist : [];
    if (!blacklist.length) {
        return false;
    }
    const allTags = [
        post.tag_string,
        post.tag_string_artist,
        post.tag_string_copyright,
        post.tag_string_character,
        post.tag_string_general,
        post.tag_string_meta,
    ]
        .flatMap((value) => splitTagString(value))
        .map((tag) => tag.toLowerCase().trim());

    return blacklist.some((item) => {
        const normalized = String(item || "").toLowerCase().trim();
        return normalized && allTags.includes(normalized);
    });
}

function isPostFiltered(post) {
    return !isValidImageType(post) || isPostBlacklisted(post);
}

function getPromptEditorHeightBounds() {
    const isCompactViewport = window.innerWidth <= 580 || window.innerHeight <= 860;
    const minHeight = isCompactViewport ? 140 : 220;
    const viewportRatio = isCompactViewport ? 0.28 : 0.42;
    const viewportCap = Math.floor(window.innerHeight * viewportRatio);
    const maxHeight = Math.min(460, Math.max(minHeight + 40, viewportCap));
    return { minHeight, maxHeight, isCompactViewport };
}

function resizePromptEditor() {
    const { minHeight, maxHeight, isCompactViewport } = getPromptEditorHeightBounds();
    elements.promptEditor.style.height = "auto";
    if (isCompactViewport) {
        const expandedHeight = Math.max(minHeight, elements.promptEditor.scrollHeight);
        elements.promptEditor.style.height = `${expandedHeight}px`;
        elements.promptEditor.style.overflowY = "hidden";
        return;
    }
    const nextHeight = Math.max(minHeight, Math.min(elements.promptEditor.scrollHeight, maxHeight));
    elements.promptEditor.style.height = `${nextHeight}px`;
    elements.promptEditor.style.overflowY = elements.promptEditor.scrollHeight > maxHeight ? "auto" : "hidden";
}

function setPromptEditorValue(value) {
    elements.promptEditor.value = value || "";
    elements.promptEditor.scrollTop = 0;
    resizePromptEditor();
}

function convertSearchValueToApiTags(value) {
    return tokenizeCommaInput(value).map(normalizeSearchTag).join(" ");
}

function buildEffectiveSearchTags(value) {
    const tokens = tokenizeCommaInput(value).map(normalizeSearchTag);
    if (state.favoritesOnly && hasDanbooruAuth()) {
        const favoriteToken = `ordfav:${state.favoriteSync.username}`;
        if (!tokens.includes(favoriteToken)) {
            tokens.push(favoriteToken);
        }
    }
    return tokens.join(" ");
}

function normalizeKeyValues(values = []) {
    return [...new Set(values.map((value) => String(value || "").trim().toLowerCase()).filter(Boolean))].sort();
}

function buildOnlineQueryContext() {
    const limit = Math.max(1, Math.min(100, Number(elements.searchLimit.value) || 20));
    const page = Math.max(1, Number(elements.searchPage.value) || 1);
    const tags = buildEffectiveSearchTags(elements.searchTags.value);
    const selectedRatings = getSelectedRatingValues();
    const serverRating = getServerRatingParam();
    const blacklist = normalizeKeyValues(Array.isArray(state.settings?.blacklist) ? state.settings.blacklist : []);
    return {
        key: JSON.stringify({
            tags,
            selectedRatings: normalizeKeyValues(selectedRatings),
            serverRating,
            blacklist,
        }),
        tags,
        selectedRatings,
        serverRating,
        limit,
        page,
        batchSize: Math.min(ONLINE_BATCH_MAX, Math.max(ONLINE_BATCH_MIN, limit * ONLINE_BATCH_MULTIPLIER)),
    };
}

function buildSearchInputFromTokens(tokens) {
    return tokens.join(", ");
}

function formatDate(value) {
    if (!value) {
        return "未知时间";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }
    return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getCategoryLabel(category) {
    return CATEGORY_META[category]?.label || category;
}

function categoryFromApiValue(value) {
    if (typeof value === "string" && CATEGORY_META[value]) {
        return value;
    }
    return DANBOORU_CATEGORY_MAP[Number(value)] || "general";
}

function getEffectivePost(postId) {
    return state.postEdits[String(postId)] || state.originalPosts[String(postId)] || getAnyFavoriteStore(postId) || null;
}

function ensureEditablePost(postId) {
    const key = String(postId);
    if (!state.postEdits[key]) {
        const original = getEffectivePost(key);
        if (!original) {
            return null;
        }
        state.postEdits[key] = clonePost(original);
    }
    return state.postEdits[key];
}

function cleanupEditIfUnchanged(postId) {
    const key = String(postId);
    const original = state.originalPosts[key] || getAnyFavoriteStore(key);
    const edited = state.postEdits[key];
    if (!original || !edited) {
        return;
    }
    const changed = CATEGORY_ORDER.some(
        (category) => String(original[`tag_string_${category}`] || "") !== String(edited[`tag_string_${category}`] || ""),
    ) || String(original.tag_string || "") !== String(edited.tag_string || "");
    if (!changed) {
        delete state.postEdits[key];
    }
}

function isPostEdited(postId) {
    const key = String(postId);
    if (!state.postEdits[key]) {
        return false;
    }
    cleanupEditIfUnchanged(key);
    return Boolean(state.postEdits[key]);
}

function rebuildCombinedTagString(post) {
    post.tag_string = CATEGORY_ORDER
        .flatMap((category) => splitTagString(post[`tag_string_${category}`]))
        .join(" ");
}

function getSelectedToolbarCategories() {
    return Array.from(elements.toolbarCategoryCheckboxes)
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);
}

function getSelectedEditorCategories() {
    if (!elements.tagGroups.querySelector(".editor-category-checkbox")) {
        return Array.from(state.editorSelectedCategories);
    }
    return Array.from(elements.tagGroups.querySelectorAll(".editor-category-checkbox"))
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value);
}

function buildPromptFromPost(post, options = {}) {
    const categories = options.categories || getSelectedToolbarCategories();
    const filterEnabled = options.filterEnabled ?? state.settings?.filter_enabled ?? true;
    const filterTags = new Set((state.settings?.filter_tags || []).map((tag) => tag.toLowerCase().trim()));
    const replaceUnderscores = options.replaceUnderscores ?? elements.fmtReplaceUnderscores.checked;
    const escapeBrackets = options.escapeBrackets ?? elements.fmtEscapeBrackets.checked;

    let tags = [];
    for (const category of CATEGORY_ORDER) {
        if (!categories.includes(category)) {
            continue;
        }
        tags.push(...splitTagString(post[`tag_string_${category}`]));
    }

    if (!tags.length) {
        tags = splitTagString(post.tag_string);
    }

    if (filterEnabled && filterTags.size) {
        tags = tags.filter((tag) => !filterTags.has(tag.toLowerCase().trim()));
    }

    tags = uniqueTags(tags).map((tag) => {
        let next = tag;
        if (replaceUnderscores) {
            next = next.replaceAll("_", " ");
        }
        if (escapeBrackets) {
            next = next.replaceAll("(", "\\(").replaceAll(")", "\\)");
        }
        return next;
    });

    return tags.join(", ");
}

function truncateText(value, maxLength = 180) {
    const text = String(value || "").trim();
    if (text.length <= maxLength) {
        return text;
    }
    return `${text.slice(0, maxLength - 1)}…`;
}

function proxyImageUrl(url) {
    return url ? `/api/danbooru/image?url=${encodeURIComponent(url)}` : null;
}

function buildImageCandidates(post, options = {}) {
    const preferLarge = Boolean(options.preferLarge);
    const highQuality = preferLarge || options.highQuality === true || Boolean(state.settings?.high_quality_previews);
    const raw = preferLarge
        ? [post.sample_url, post.file_url, post.preview_url]
        : highQuality
            ? [post.sample_url, post.preview_url, post.file_url]
            : [post.preview_url, post.sample_url, post.file_url];
    return [...new Set(raw.filter(Boolean).map(proxyImageUrl).filter(Boolean))];
}

function setImageSource(img, post, options = {}) {
    const candidates = buildImageCandidates(post, options);
    let index = 0;
    img.loading = options.preferLarge ? "eager" : "lazy";
    img.decoding = "async";
    img.onerror = () => {
        index += 1;
        if (index < candidates.length) {
            img.src = candidates[index];
        }
    };
    img.src = candidates[index] || "";
}

function syncToolbarFromSettings() {
    const selected = new Set(state.settings?.selected_categories || []);
    elements.toolbarCategoryCheckboxes.forEach((checkbox) => {
        checkbox.checked = selected.has(checkbox.value);
    });
    elements.filterToggle.classList.toggle("is-active", Boolean(state.settings?.filter_enabled));
    elements.settingsFilterEnabled.checked = Boolean(state.settings?.filter_enabled);
}

function syncSettingsForm() {
    elements.settingsUsername.value = state.settings?.danbooru_username || "";
    elements.settingsApiKey.value = state.settings?.danbooru_api_key || "";
    elements.settingsFilterTags.value = (state.settings?.filter_tags || []).join(", ");
    elements.settingsFilterEnabled.checked = Boolean(state.settings?.filter_enabled);
    elements.settingsHighQualityPreviews.checked = Boolean(state.settings?.high_quality_previews);
    elements.settingsAutocompleteMaxResults.value = state.settings?.autocomplete_max_results || 20;
    const selected = new Set(state.settings?.selected_categories || []);
    elements.settingsSelectedCategories.forEach((checkbox) => {
        checkbox.checked = selected.has(checkbox.value);
    });
}

function applyFavoriteSyncSettings() {
    const username = String(state.settings?.danbooru_username || "").trim();
    const apiKey = String(state.settings?.danbooru_api_key || "").trim();
    state.favoriteSync.hasAuth = Boolean(username && apiKey);
    state.favoriteSync.username = username;
    if (!state.favoriteSync.hasAuth) {
        state.favoriteSync.truncated = false;
    }
    updateFavoritesCount();
}

function syncUiPrefsToControls() {
    elements.searchTags.value = state.uiPrefs.searchValue || "";
    applySelectedRatingValues(state.uiPrefs.ratingValues);
    elements.searchLimit.value = String(state.uiPrefs.limit || 20);
    elements.searchPage.value = String(state.uiPrefs.page || 1);
    elements.fmtReplaceUnderscores.checked = Boolean(state.uiPrefs.replaceUnderscores);
    elements.fmtEscapeBrackets.checked = Boolean(state.uiPrefs.escapeBrackets);
}

function updateSearchControlsState() {
    const tokens = tokenizeCommaInput(elements.searchTags.value);
    const hasRanking = tokens.includes("order:rank");
    const page = Math.max(1, Number(elements.searchPage.value) || 1);
    elements.rankingToggle.classList.toggle("is-active", hasRanking);
    elements.favoritesToggle.classList.toggle("is-active", state.favoritesOnly);
    elements.clearSearchBtn.classList.toggle("hidden", !elements.searchTags.value.trim());
    elements.sourceBadge.textContent = state.favoritesOnly
        ? (hasDanbooruAuth() ? "云端收藏" : "本地收藏")
        : "在线结果";
    elements.searchLimit.disabled = state.loading;
    elements.searchPage.disabled = state.loading;
    elements.prevPageBtn.disabled = state.loading || page <= 1;
    elements.jumpPageBtn.disabled = state.loading;
    elements.nextPageBtn.disabled = state.loading || !state.pagination.hasNext;
    updateRatingButtonLabel();
    updateSelectionStatus();
}

function goToPage(nextPage) {
    const page = Math.max(1, Number(nextPage) || 1);
    const currentPage = Math.max(1, Number(state.pagination.page) || Number(elements.searchPage.value) || 1);
    elements.searchPage.value = String(page);
    if (page === currentPage) {
        updateSearchControlsState();
        return;
    }
    saveUiPrefs();
    updateSearchControlsState();
    runSearch();
}

function setPaginationState({ page, limit, totalKnown, visibleCount, exhausted }) {
    const endIndex = Math.max(0, (page - 1) * limit + visibleCount);
    state.pagination = {
        page,
        limit,
        totalKnown,
        exhausted,
        hasNext: endIndex < totalKnown || !exhausted,
    };
}

function rememberOriginalPosts(posts) {
    posts.forEach((post) => {
        state.originalPosts[String(post.id)] = clonePost(post);
    });
}

function applyOnlineFilters(posts) {
    return filterPostsBySelectedRatings(posts).filter((post) => !isPostFiltered(post));
}

function syncOnlineCache(query, forceReload = false) {
    if (forceReload || state.onlineSearchCache.key !== query.key) {
        state.onlineSearchCache = createEmptyOnlineSearchCache(query.key);
    }
    return state.onlineSearchCache;
}

async function fetchOnlineBatch(query, serverPage) {
    const params = new URLSearchParams({
        tags: query.tags,
        rating: query.serverRating,
        limit: String(query.batchSize),
        page: String(serverPage),
    });
    const results = await api(`/api/danbooru/posts?${params.toString()}`);
    return Array.isArray(results) ? results : [];
}

async function ensureOnlineResults(query, forceReload = false) {
    const cache = syncOnlineCache(query, forceReload);
    const targetCount = query.page * query.limit;
    const seenIds = new Set(cache.filteredPosts.map((post) => String(post.id)));

    while (cache.filteredPosts.length < targetCount && !cache.exhausted) {
        const batch = await fetchOnlineBatch(query, cache.nextServerPage);
        cache.nextServerPage += 1;
        cache.rawFetched += batch.length;
        if (!batch.length || batch.length < query.batchSize) {
            cache.exhausted = true;
        }

        rememberOriginalPosts(batch);
        const filteredBatch = applyOnlineFilters(batch);
        cache.filteredOut += Math.max(batch.length - filteredBatch.length, 0);
        for (const post of filteredBatch) {
            const key = String(post.id);
            if (seenIds.has(key)) {
                continue;
            }
            seenIds.add(key);
            cache.filteredPosts.push(post);
        }
    }

    return cache;
}

function syncDisplayedPage(page) {
    elements.searchPage.value = String(page);
    saveUiPrefs();
}

function normalizeAutocompleteItems(items = []) {
    return items.map((item) => {
        const tag = item.name || item.tag || "";
        return {
            tag,
            translation: item.translation || item.translation_cn || "",
            postCount: item.post_count || 0,
            category: categoryFromApiValue(item.category),
        };
    });
}

function fillAutocomplete(items, input, container, mode) {
    container.innerHTML = "";
    const normalized = normalizeAutocompleteItems(items);
    if (!normalized.length) {
        container.classList.add("hidden");
        return;
    }

    for (const item of normalized) {
        state.autocompleteCache[item.tag] = item;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "autocomplete-item";
        button.innerHTML = `
            <strong>${escapeHtml(item.tag)}</strong>
            <span>${escapeHtml(item.translation || "无中文")} · ${item.postCount}</span>
        `;
        button.addEventListener("click", () => {
            if (mode === "search") {
                const segments = elements.searchTags.value.split(",");
                segments[segments.length - 1] = ` ${item.tag}`;
                elements.searchTags.value = segments
                    .map((segment) => segment.trim())
                    .filter(Boolean)
                    .join(", ");
                if (elements.searchTags.value) {
                    elements.searchTags.value += ", ";
                }
                updateSearchControlsState();
                saveUiPrefs();
            } else {
                input.value = item.tag;
                input.dataset.selectedTag = item.tag;
                input.dataset.selectedCategory = item.category;
                input.dataset.selectedTranslation = item.translation;
            }
            container.classList.add("hidden");
        });
        container.appendChild(button);
    }
    container.classList.remove("hidden");
}

function attachAutocomplete(input, container, mode) {
    let timer = null;

    input.addEventListener("input", () => {
        if (mode !== "search") {
            delete input.dataset.selectedTag;
            delete input.dataset.selectedCategory;
            delete input.dataset.selectedTranslation;
        }

        const raw = mode === "search"
            ? (input.value.split(",").pop() || "").trim()
            : input.value.trim();

        window.clearTimeout(timer);
        if (!raw) {
            container.classList.add("hidden");
            return;
        }

        timer = window.setTimeout(async () => {
            const limit = Math.max(5, Number(state.settings?.autocomplete_max_results || 12));
            const endpoint = /[\u4e00-\u9fff]/.test(raw)
                ? `/api/tags/search-chinese?query=${encodeURIComponent(raw)}&limit=${limit}`
                : `/api/tags/autocomplete?query=${encodeURIComponent(raw)}&limit=${limit}`;
            try {
                const data = await api(endpoint);
                fillAutocomplete(data.results || data, input, container, mode);
            } catch (error) {
                container.classList.add("hidden");
                notify(`自动补全失败: ${error.message}`, "error");
            }
        }, 160);
    });

    document.addEventListener("click", (event) => {
        if (!container.contains(event.target) && event.target !== input) {
            container.classList.add("hidden");
        }
    });
}

function bindDropdowns() {
    document.querySelectorAll("[data-dropdown-button]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            const targetId = button.dataset.dropdownButton;
            const target = document.getElementById(targetId);
            const willShow = target.classList.contains("hidden");
            document.querySelectorAll(".dropdown-menu").forEach((menu) => menu.classList.add("hidden"));
            if (willShow) {
                target.classList.remove("hidden");
            }
        });
    });

    document.querySelectorAll(".dropdown-menu").forEach((menu) => {
        menu.addEventListener("click", (event) => {
            event.stopPropagation();
        });
    });

    document.addEventListener("click", () => {
        document.querySelectorAll(".dropdown-menu").forEach((menu) => menu.classList.add("hidden"));
    });
}

