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

function resizePromptEditor() {
    const maxHeight = 460;
    elements.promptEditor.style.height = "auto";
    const nextHeight = Math.max(220, Math.min(elements.promptEditor.scrollHeight, maxHeight));
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

async function loadSettings() {
    state.settings = await api("/api/settings");
    applyFavoriteSyncSettings();
    syncToolbarFromSettings();
    syncSettingsForm();
}

async function syncRemoteFavorites({ silent = false } = {}) {
    if (!hasDanbooruAuth()) {
        state.favoriteSync.truncated = false;
        updateFavoritesCount();
        return;
    }

    try {
        const data = await api("/api/danbooru/favorites/sync");
        const nextFavorites = {};
        for (const postId of data.favorites || []) {
            const key = String(postId);
            nextFavorites[key] = state.remoteFavorites[key] || { id: key, _saved_at: new Date(0).toISOString() };
        }
        state.remoteFavorites = nextFavorites;
        state.favoriteSync.truncated = Boolean(data.truncated);
        saveFavoriteStore("remote");
        if (state.favoritesOnly && !state.loading) {
            renderResults();
        }
    } catch (error) {
        state.favoriteSync.truncated = false;
        updateFavoritesCount();
        if (!silent) {
            notify(`同步 Danbooru 收藏夹失败: ${error.message}`, "error");
        }
    }
}

async function saveSettings(event) {
    event.preventDefault();
    const payload = {
        danbooru_username: elements.settingsUsername.value.trim(),
        danbooru_api_key: elements.settingsApiKey.value.trim(),
        filter_tags: elements.settingsFilterTags.value
            .split(/[\n,]/)
            .map((tag) => tag.trim())
            .filter(Boolean),
        filter_enabled: elements.settingsFilterEnabled.checked,
        high_quality_previews: elements.settingsHighQualityPreviews.checked,
        autocomplete_max_results: Math.max(5, Number(elements.settingsAutocompleteMaxResults.value) || 20),
        selected_categories: Array.from(elements.settingsSelectedCategories)
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => checkbox.value),
    };

    state.settings = await api("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    applyFavoriteSyncSettings();
    syncToolbarFromSettings();
    syncSettingsForm();
    await syncRemoteFavorites({ silent: true });
    elements.settingsDialog.close();
    rerenderAllPrompts();
    await runSearch({ forceReload: true });
    notify("设置已保存。", "success");
}

async function persistSelectedCategories() {
    state.settings = await api("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_categories: getSelectedToolbarCategories() }),
    });
    syncToolbarFromSettings();
    rerenderAllPrompts();
}

async function toggleFilterSetting() {
    state.settings = await api("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter_enabled: !state.settings?.filter_enabled }),
    });
    syncToolbarFromSettings();
    rerenderAllPrompts();
}

function rerenderAllPrompts() {
    if (state.editingPostId && elements.editorDialog.open) {
        updatePromptPreview();
    }
    renderResults();
}

function getFavoritesArray() {
    return Object.values(state.localFavorites).sort((left, right) => {
        return String(right._saved_at || "").localeCompare(String(left._saved_at || ""));
    });
}

function filterFavoritesLocally() {
    const selectedRatings = getSelectedRatingValues();
    const limit = Math.max(1, Number(elements.searchLimit.value) || 20);
    let page = Math.max(1, Number(elements.searchPage.value) || 1);
    const tokens = convertSearchValueToApiTags(elements.searchTags.value)
        .split(/\s+/)
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean);

    let posts = getFavoritesArray();
    if (!selectedRatings.length) {
        posts = [];
    } else if (selectedRatings.length < RATING_VALUES.length) {
        posts = posts.filter((post) => selectedRatings.includes(normalizePostRating(post.rating)));
    }
    posts = posts.filter((post) => !isPostFiltered(post));
    if (tokens.length) {
        posts = posts.filter((post) => {
            const haystack = [
                post.id,
                post.tag_string,
                post.tag_string_artist,
                post.tag_string_copyright,
                post.tag_string_character,
                post.tag_string_general,
                post.tag_string_meta,
            ]
                .join(" ")
                .toLowerCase();
            return tokens.every((token) => haystack.includes(token));
        });
    }

    const total = posts.length;
    const lastPage = total ? Math.max(1, Math.ceil(total / limit)) : 1;
    if (page > lastPage) {
        page = lastPage;
        syncDisplayedPage(page);
    }
    const start = (page - 1) * limit;
    const visible = posts.slice(start, start + limit);
    state.currentPosts = visible;
    setPaginationState({ page, limit, totalKnown: total, visibleCount: visible.length, exhausted: true });
    elements.searchStatus.textContent = total
        ? `本地收藏 ${start + 1}-${Math.min(start + visible.length, total)} / ${total}`
        : "本地收藏为空";
}

async function runSearch({ resetPage = false, forceReload = false } = {}) {
    if (state.loading) {
        return;
    }

    if (resetPage) {
        elements.searchPage.value = "1";
    }

    updateSearchControlsState();
    saveUiPrefs();

    if (state.favoritesOnly && !hasDanbooruAuth()) {
        filterFavoritesLocally();
        renderResults();
        return;
    }

    const query = buildOnlineQueryContext();
    const resultLabel = state.favoritesOnly && hasDanbooruAuth() ? "云端收藏" : "在线结果";

    state.loading = true;
    elements.refreshBtn.classList.add("is-active");
    elements.searchStatus.textContent = state.favoritesOnly && hasDanbooruAuth() ? "同步收藏夹中..." : "检索中...";
    updateSearchControlsState();

    try {
        const cache = await ensureOnlineResults(query, forceReload);
        state.searchResults = cache.filteredPosts;

        let page = query.page;
        const maxPage = cache.filteredPosts.length
            ? Math.max(1, Math.ceil(cache.filteredPosts.length / query.limit))
            : 1;
        if (cache.exhausted && page > maxPage) {
            page = maxPage;
            syncDisplayedPage(page);
        }

        const start = (page - 1) * query.limit;
        const visible = cache.filteredPosts.slice(start, start + query.limit);
        state.currentPosts = visible;
        setPaginationState({
            page,
            limit: query.limit,
            totalKnown: cache.filteredPosts.length,
            visibleCount: visible.length,
            exhausted: cache.exhausted,
        });

        if (visible.length) {
            const end = start + visible.length;
            const totalLabel = cache.exhausted ? cache.filteredPosts.length : `${cache.filteredPosts.length}+`;
            elements.searchStatus.textContent = cache.filteredOut > 0
                ? `${resultLabel} ${start + 1}-${end} / ${totalLabel} · 过滤 ${cache.filteredOut}`
                : `${resultLabel} ${start + 1}-${end} / ${totalLabel}`;
        } else {
            elements.searchStatus.textContent = cache.exhausted ? `没有更多${resultLabel}` : `${resultLabel}为空`;
        }
        renderResults();
    } catch (error) {
        state.currentPosts = [];
        setPaginationState({
            page: Math.max(1, Number(elements.searchPage.value) || 1),
            limit: Math.max(1, Number(elements.searchLimit.value) || 20),
            totalKnown: 0,
            visibleCount: 0,
            exhausted: true,
        });
        elements.searchStatus.textContent = "检索失败";
        renderResults();
        notify(`${resultLabel}加载失败: ${error.message}`, "error");
    } finally {
        state.loading = false;
        elements.refreshBtn.classList.remove("is-active");
        updateSearchControlsState();
    }
}

function renderResults() {
    elements.resultsGrid.innerHTML = "";
    updateSearchControlsState();
    updateFavoritesCount();

    if (!state.currentPosts.length) {
        const empty = document.createElement("div");
        empty.className = "library-content-empty";
        empty.innerHTML = `
            <p class="empty-state">没有结果。可以直接刷新看看最新帖子，或切到收藏夹。</p>
        `;
        elements.resultsGrid.appendChild(empty);
        return;
    }

    for (const originalPost of state.currentPosts) {
        const post = getEffectivePost(originalPost.id) || originalPost;
        const card = document.createElement("article");
        card.className = "gallery-card";
        if (String(post.id) === String(state.editingPostId)) {
            card.classList.add("is-selected");
        }
        if (isPostEdited(post.id)) {
            card.classList.add("is-edited");
        }

        const prompt = buildPromptFromPost(post);
        card.innerHTML = `
            <div class="gallery-badges">
                <span class="rating-badge">${escapeHtml(String(post.rating || "?").toUpperCase())}</span>
                <div class="gallery-card-actions">
                    <button class="gallery-action ${isPostFavorited(post.id) ? "is-favorited" : ""}" type="button" data-action="favorite" data-post-id="${escapeHtml(post.id)}" title="收藏">★</button>
                    <button class="gallery-action" type="button" data-action="view" data-post-id="${escapeHtml(post.id)}" title="查看大图">⤢</button>
                    <button class="gallery-action" type="button" data-action="edit" data-post-id="${escapeHtml(post.id)}" title="编辑标签">✎</button>
                    <button class="gallery-action" type="button" data-action="open" data-post-id="${escapeHtml(post.id)}" title="打开原帖">↗</button>
                </div>
            </div>
            <button class="gallery-thumb" type="button" data-action="view" data-post-id="${escapeHtml(post.id)}" title="查看大图">
                <img alt="">
            </button>
            <div class="gallery-card-footer">
                <div class="gallery-card-topline">
                    <span>#${escapeHtml(post.id)}</span>
                    <span>${escapeHtml(post.image_width || "?")} × ${escapeHtml(post.image_height || "?")}</span>
                </div>
                <p class="gallery-card-prompt">${escapeHtml(truncateText(prompt || post.gallery_prompt || "无可用 Prompt", 180))}</p>
            </div>
        `;

        const image = card.querySelector("img");
        setImageSource(image, post);

        card.querySelectorAll("[data-action]").forEach((button) => {
            button.addEventListener("click", async (event) => {
                event.stopPropagation();
                const action = button.dataset.action;
                if (action === "favorite") {
                    await toggleFavoritePost(post.id);
                    renderResults();
                    return;
                }
                if (action === "open") {
                    window.open(post.post_url, "_blank", "noopener,noreferrer");
                    return;
                }
                if (action === "view") {
                    openImageViewer(post.id);
                    return;
                }
                await openEditor(post.id);
            });
        });

        elements.resultsGrid.appendChild(card);
    }

    updateSelectionStatus();
}

function favoriteSnapshot(post, store = getActiveFavoriteStore()) {
    return {
        ...clonePost(post),
        _saved_at: store[String(post.id)]?._saved_at || new Date().toISOString(),
    };
}

function applyFavoritePost(post, { remote = hasDanbooruAuth() } = {}) {
    const key = String(post.id);
    const store = remote ? state.remoteFavorites : state.localFavorites;
    store[key] = favoriteSnapshot(post, store);
    state.originalPosts[key] = state.originalPosts[key] || clonePost(post);
    saveFavoriteStore(remote ? "remote" : "local");
}

function removeFavoritePost(postId, { remote = hasDanbooruAuth() } = {}) {
    const key = String(postId);
    const store = remote ? state.remoteFavorites : state.localFavorites;
    delete store[key];
    saveFavoriteStore(remote ? "remote" : "local");
}

async function toggleFavoritePost(postId) {
    const key = String(postId);
    const post = getEffectivePost(key);
    if (!post) {
        return;
    }

    const isFavorited = Boolean(getActiveFavoriteStore()[key]);
    if (hasDanbooruAuth()) {
        const endpoint = isFavorited ? "/api/danbooru/favorites/remove" : "/api/danbooru/favorites/add";
        await api(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ post_id: Number(postId) }),
        });
        if (isFavorited) {
            removeFavoritePost(postId, { remote: true });
            notify(`已从 Danbooru 收藏移除 #${postId}`);
        } else {
            applyFavoritePost(post, { remote: true });
            notify(`已同步收藏到 Danbooru #${postId}`, "success");
        }
    } else {
        if (isFavorited) {
            removeFavoritePost(postId, { remote: false });
            notify(`已移除本地收藏 #${postId}`);
        } else {
            applyFavoritePost(post, { remote: false });
            notify(`未配置 Danbooru 账号，已收藏到本地 #${postId}`, "success");
        }
    }

    if (state.favoritesOnly && hasDanbooruAuth()) {
        state.onlineSearchCache = createEmptyOnlineSearchCache();
        await runSearch({ forceReload: true });
        return;
    }
    if (state.favoritesOnly) {
        filterFavoritesLocally();
    }
}

function syncFavoriteSnapshot(post) {
    const key = String(post.id);
    let updated = false;
    if (state.localFavorites[key]) {
        state.localFavorites[key] = favoriteSnapshot(post, state.localFavorites);
        saveFavoriteStore("local");
        updated = true;
    }
    if (state.remoteFavorites[key]) {
        state.remoteFavorites[key] = favoriteSnapshot(post, state.remoteFavorites);
        saveFavoriteStore("remote");
        updated = true;
    }
    return updated;
}

async function ensureTranslations(tags) {
    const missing = uniqueTags(tags).filter((tag) => tag && !(tag in state.translations));
    if (!missing.length) {
        return;
    }
    const data = await api("/api/tags/translate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: missing }),
    });
    state.translations = { ...state.translations, ...(data.translations || {}) };
}

function openImageViewer(postId) {
    const post = getEffectivePost(postId);
    if (!post) {
        notify("没有找到要查看的图片。", "error");
        return;
    }
    state.viewingPostId = String(postId);
    elements.viewerTitle.textContent = `#${post.id} 大图预览`;
    elements.viewerMeta.textContent = `评级 ${String(post.rating || "?").toUpperCase()} · ${post.image_width || "?"} × ${post.image_height || "?"} · 分数 ${post.score ?? 0}`;
    setImageSource(elements.viewerImage, post, { preferLarge: true });
    elements.viewerOpenPostBtn.disabled = !post.post_url;
    elements.viewerOpenPostBtn.dataset.postUrl = post.post_url || "";
    openDialog(elements.viewerDialog);
}

async function openEditor(postId) {
    const post = ensureEditablePost(postId);
    if (!post) {
        notify("没有找到要编辑的图片。", "error");
        return;
    }

    state.editingPostId = String(postId);
    state.editorAddCategory = "general";
    state.editorSelectedCategories = new Set(state.settings?.selected_categories || []);
    updateAddTargetLabel();

    const tags = uniqueTags(CATEGORY_ORDER.flatMap((category) => splitTagString(post[`tag_string_${category}`])));
    try {
        await ensureTranslations(tags);
    } catch (error) {
        notify(`标签翻译加载失败: ${error.message}`, "error");
    }

    elements.editorTitle.textContent = `编辑提示词 · #${post.id}`;
    elements.editorSubtitle.textContent = "分类勾选会影响当前 Prompt；点击标签可移除或恢复。";
    elements.editorMetaLine.textContent = `评分 ${String(post.rating || "?").toUpperCase()} · 分数 ${post.score ?? 0} · 收藏 ${post.fav_count ?? 0} · ${formatDate(post.created_at)}`;
    elements.editorPostLink.href = post.post_url || "#";
    elements.editorPostLink.classList.toggle("hidden", !post.post_url);
    setImageSource(elements.editorPreview, post, { highQuality: true });

    renderEditorTagGroups();
    updatePromptPreview();
    openDialog(elements.editorDialog);
    renderResults();
}

function openDialog(dialog) {
    if (!dialog.open) {
        dialog.showModal();
    }
}

function closeEditor() {
    if (state.editingPostId) {
        cleanupEditIfUnchanged(state.editingPostId);
    }
    elements.editorDialog.close();
}

function closeViewer() {
    state.viewingPostId = null;
    elements.viewerDialog.close();
}

function updateAddTargetLabel() {
    elements.addTagTargetLabel.textContent = `追加到 ${getCategoryLabel(state.editorAddCategory)}`;
}

function renderEditorTagGroups() {
    const post = getEffectivePost(state.editingPostId);
    if (!post) {
        elements.tagGroups.innerHTML = '<p class="empty-state">没有可编辑的标签。</p>';
        return;
    }

    const selected = new Set(
        state.editorSelectedCategories.size
            ? state.editorSelectedCategories
            : (state.settings?.selected_categories || []),
    );
    elements.tagGroups.innerHTML = "";

    for (const category of CATEGORY_ORDER) {
        const tags = splitTagString(post[`tag_string_${category}`]);
        const section = document.createElement("section");
        section.className = "tag-section";

        const chipHtml = tags.length
            ? tags
                  .map((tag) => {
                      const translation = state.translations[tag];
                      return `
                        <button
                            type="button"
                            class="tag-chip tag-category-${escapeHtml(CATEGORY_META[category].className)}"
                            data-tag="${escapeHtml(tag)}"
                            data-category="${escapeHtml(category)}"
                        >
                            <span>${escapeHtml(tag)}</span>
                            ${translation ? `<small>[${escapeHtml(translation)}]</small>` : ""}
                        </button>
                    `;
                  })
                  .join("")
            : '<span class="muted-text">当前分类暂无标签。</span>';

        section.innerHTML = `
            <div class="tag-section-header">
                <label class="tag-section-title">
                    <input type="checkbox" class="editor-category-checkbox" value="${escapeHtml(category)}" ${selected.has(category) ? "checked" : ""}>
                    <span>${escapeHtml(getCategoryLabel(category))}</span>
                </label>
                <div class="tag-section-actions">
                    <span class="small-badge">${tags.length}</span>
                    <button type="button" class="tag-add-target-btn ${state.editorAddCategory === category ? "is-active" : ""}" data-set-target="${escapeHtml(category)}" title="将追加标签目标切到${escapeHtml(getCategoryLabel(category))}">+</button>
                </div>
            </div>
            <div class="tag-chip-row">${chipHtml}</div>
        `;

        section.querySelectorAll("[data-tag]").forEach((button) => {
            button.addEventListener("click", () => {
                toggleEditorTag(button.dataset.category, button.dataset.tag);
            });
        });

        section.querySelectorAll(".editor-category-checkbox").forEach((checkbox) => {
            checkbox.addEventListener("change", () => {
                state.editorSelectedCategories = new Set(
                    Array.from(elements.tagGroups.querySelectorAll(".editor-category-checkbox"))
                        .filter((item) => item.checked)
                        .map((item) => item.value),
                );
                updatePromptPreview();
            });
        });

        section.querySelectorAll("[data-set-target]").forEach((button) => {
            button.addEventListener("click", () => {
                state.editorAddCategory = button.dataset.setTarget;
                updateAddTargetLabel();
                renderEditorTagGroups();
                elements.addTagInput.focus();
            });
        });

        elements.tagGroups.appendChild(section);
    }
}

function toggleEditorTag(category, tag) {
    const post = ensureEditablePost(state.editingPostId);
    if (!post) {
        return;
    }
    const key = `tag_string_${category}`;
    const tags = splitTagString(post[key]);
    if (tags.includes(tag)) {
        post[key] = joinTagString(tags.filter((item) => item !== tag));
    } else {
        post[key] = joinTagString([...tags, tag]);
    }
    rebuildCombinedTagString(post);
    syncFavoriteSnapshot(post);
    renderEditorTagGroups();
    updatePromptPreview();
    renderResults();
}

function findTagCategory(post, tag) {
    for (const category of CATEGORY_ORDER) {
        if (splitTagString(post[`tag_string_${category}`]).includes(tag)) {
            return category;
        }
    }
    return null;
}

async function addTagToEditor() {
    const post = ensureEditablePost(state.editingPostId);
    if (!post) {
        return;
    }

    const raw = elements.addTagInput.value.trim();
    if (!raw) {
        return;
    }

    let tag = elements.addTagInput.dataset.selectedTag || raw;
    if (/[\u4e00-\u9fff]/.test(tag)) {
        notify("中文标签请从自动补全结果中点选。", "error");
        return;
    }

    tag = normalizeSearchTag(tag);
    const cached = state.autocompleteCache[tag];
    const existingCategory = findTagCategory(post, tag);
    const targetCategory = elements.addTagInput.dataset.selectedCategory || cached?.category || state.editorAddCategory || "general";
    const finalCategory = existingCategory || targetCategory;
    const key = `tag_string_${finalCategory}`;
    const tags = splitTagString(post[key]);
    if (!tags.includes(tag)) {
        tags.push(tag);
    }
    post[key] = joinTagString(tags);
    rebuildCombinedTagString(post);

    if (elements.addTagInput.dataset.selectedTranslation) {
        state.translations[tag] = elements.addTagInput.dataset.selectedTranslation;
    }

    syncFavoriteSnapshot(post);
    elements.addTagInput.value = "";
    delete elements.addTagInput.dataset.selectedTag;
    delete elements.addTagInput.dataset.selectedCategory;
    delete elements.addTagInput.dataset.selectedTranslation;
    renderEditorTagGroups();
    updatePromptPreview();
    renderResults();
}

function updatePromptPreview() {
    const post = getEffectivePost(state.editingPostId);
    if (!post) {
        setPromptEditorValue("");
        return;
    }
    state.editorSelectedCategories = new Set(getSelectedEditorCategories());
    setPromptEditorValue(buildPromptFromPost(post, {
        categories: Array.from(state.editorSelectedCategories),
    }));
}

async function cleanPrompt() {
    const prompt = elements.promptEditor.value.trim();
    if (!prompt) {
        notify("当前 Prompt 为空。");
        return;
    }
    try {
        const data = await api("/api/prompts/clean", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt,
                prompt_formatting: elements.cleanOptions.format.checked,
                underscore_to_space: elements.cleanOptions.underscore.checked,
                complete_weight_syntax: elements.cleanOptions.weight.checked,
                smart_bracket_escaping: elements.cleanOptions.escape.checked,
                standardize_commas: elements.cleanOptions.commas.checked,
                fix_region_syntax: elements.cleanOptions.region.checked,
                remove_lora_tags: elements.cleanOptions.removeLora.checked,
                cleanup_newlines: elements.cleanOptions.newlines.value,
            }),
        });
        setPromptEditorValue(data.prompt || "");
        notify("Prompt 已清洗。", "success");
    } catch (error) {
        notify(`清洗失败: ${error.message}`, "error");
    }
}

async function copyPrompt() {
    const prompt = elements.promptEditor.value.trim();
    if (!prompt) {
        notify("当前没有可复制的 Prompt。");
        return;
    }
    await navigator.clipboard.writeText(prompt);
    notify("已复制到剪贴板。", "success");
}

function resetEditorTags() {
    if (!state.editingPostId) {
        return;
    }
    const key = String(state.editingPostId);
    delete state.postEdits[key];
    const post = getEffectivePost(key);
    if (!post) {
        return;
    }
    syncFavoriteSnapshot(post);
    renderEditorTagGroups();
    updatePromptPreview();
    renderResults();
    notify("标签已重置。", "success");
}

async function loadLibrary() {
    state.library = await api("/api/library");
    const categories = state.library.categories || [];
    if (!state.selectedCategory || !categories.some((category) => category.name === state.selectedCategory)) {
        state.selectedCategory = categories[0]?.name || null;
    }
    renderLibrary();
}

function renderLibrary() {
    const categories = state.library?.categories || [];
    const totalPrompts = categories.reduce((sum, category) => sum + (category.prompts || []).length, 0);
    elements.libraryMeta.textContent = `${categories.length} 个分类 · ${totalPrompts} 条词条 · 最后更新 ${state.library?.last_modified || "无"}`;

    elements.promptEntryCategory.innerHTML = categories
        .map((category) => `<option value="${escapeHtml(category.name)}">${escapeHtml(category.name)}</option>`)
        .join("");

    elements.categoryList.innerHTML = categories.length
        ? categories
              .map((category) => `
                <div class="category-entry ${category.name === state.selectedCategory ? "is-active" : ""}">
                    <button type="button" data-category="${escapeHtml(category.name)}">
                        ${escapeHtml(category.name)}
                        <small>${(category.prompts || []).length} 条</small>
                    </button>
                </div>
            `)
              .join("")
        : '<div class="library-content-empty"><p class="empty-state">词库还没有分类。</p></div>';

    elements.categoryList.querySelectorAll("[data-category]").forEach((button) => {
        button.addEventListener("click", () => {
            state.selectedCategory = button.dataset.category;
            renderLibrary();
        });
    });

    const activeCategory = categories.find((category) => category.name === state.selectedCategory);
    const prompts = activeCategory?.prompts || [];
    elements.promptList.innerHTML = prompts.length
        ? prompts
              .map((prompt) => `
                <article class="prompt-card">
                    <div class="prompt-card-header">
                        <div>
                            <strong>${escapeHtml(prompt.alias || "未命名词条")}</strong>
                            <span class="muted-text">${escapeHtml((prompt.tags || []).join(", ") || "无标签")}</span>
                        </div>
                        <span class="small-badge">${prompt.favorite ? "★ 已收藏" : "词条"}</span>
                    </div>
                    <pre>${escapeHtml(prompt.prompt || "")}</pre>
                    ${prompt.description ? `<p class="muted-text">${escapeHtml(prompt.description)}</p>` : ""}
                    <div class="prompt-card-actions">
                        <button type="button" class="toolbar-button" data-copy-prompt="${escapeHtml(prompt.id)}">复制</button>
                        <button type="button" class="toolbar-button" data-append-prompt="${escapeHtml(prompt.id)}">追加到当前编辑</button>
                        <button type="button" class="toolbar-button" data-edit-prompt="${escapeHtml(prompt.id)}">编辑</button>
                        <button type="button" class="toolbar-button" data-fav-prompt="${escapeHtml(prompt.id)}">${prompt.favorite ? "取消收藏" : "收藏"}</button>
                        <button type="button" class="toolbar-button" data-delete-prompt="${escapeHtml(prompt.id)}">删除</button>
                    </div>
                </article>
            `)
              .join("")
        : '<div class="library-content-empty"><p class="empty-state">这个分类下还没有词条。</p></div>';

    prompts.forEach((prompt) => {
        const bind = (selector, handler) => {
            const node = elements.promptList.querySelector(selector);
            if (node) {
                node.addEventListener("click", handler);
            }
        };

        bind(`[data-copy-prompt="${prompt.id}"]`, async () => {
            await navigator.clipboard.writeText(prompt.prompt || "");
            notify("词条已复制。", "success");
        });
        bind(`[data-append-prompt="${prompt.id}"]`, () => appendLibraryPrompt(prompt.prompt || ""));
        bind(`[data-edit-prompt="${prompt.id}"]`, () => openPromptDialog(prompt));
        bind(`[data-fav-prompt="${prompt.id}"]`, async () => {
            await api(`/api/library/prompts/${prompt.id}/toggle-favorite`, { method: "POST" });
            await loadLibrary();
        });
        bind(`[data-delete-prompt="${prompt.id}"]`, async () => {
            if (!window.confirm("确认删除这个词条？")) {
                return;
            }
            await api(`/api/library/prompts/${prompt.id}`, { method: "DELETE" });
            await loadLibrary();
        });
    });
}

function appendLibraryPrompt(prompt) {
    const text = prompt.trim();
    if (!text) {
        return;
    }
    if (elements.editorDialog.open) {
        const current = elements.promptEditor.value.trim();
        setPromptEditorValue(current ? `${current}, ${text}` : text);
        notify("词条已追加到当前 Prompt。", "success");
        return;
    }
    navigator.clipboard.writeText(text)
        .then(() => notify("当前没有打开编辑器，已直接复制词条。", "success"))
        .catch((error) => notify(`复制失败: ${error.message}`, "error"));
}

async function createCategory() {
    const name = window.prompt("输入新分类名称");
    if (!name || !name.trim()) {
        return;
    }
    await api("/api/library/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
    });
    await loadLibrary();
    state.selectedCategory = name.trim();
    renderLibrary();
}

async function renameCategory() {
    if (!state.selectedCategory) {
        notify("先选择要重命名的分类。");
        return;
    }
    const nextName = window.prompt("输入新的分类名称", state.selectedCategory);
    if (!nextName || !nextName.trim() || nextName.trim() === state.selectedCategory) {
        return;
    }
    await api("/api/library/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ old_name: state.selectedCategory, new_name: nextName.trim() }),
    });
    state.selectedCategory = nextName.trim();
    await loadLibrary();
}

async function deleteCategory() {
    if (!state.selectedCategory) {
        notify("先选择要删除的分类。");
        return;
    }
    if (!window.confirm(`确认删除分类“${state.selectedCategory}”？其中的词条也会删除。`)) {
        return;
    }
    await api(`/api/library/categories?name=${encodeURIComponent(state.selectedCategory)}`, {
        method: "DELETE",
    });
    state.selectedCategory = null;
    await loadLibrary();
}

function openPromptDialog(prompt = null) {
    elements.promptDialogTitle.textContent = prompt ? "编辑词条" : "新建词条";
    elements.promptEntryId.value = prompt?.id || "";
    elements.promptEntryCategory.value = prompt ? findPromptCategory(prompt.id) : state.selectedCategory || "";
    elements.promptEntryAlias.value = prompt?.alias || "";
    elements.promptEntryText.value = prompt?.prompt || "";
    elements.promptEntryDescription.value = prompt?.description || "";
    elements.promptEntryTags.value = Array.isArray(prompt?.tags) ? prompt.tags.join(", ") : "";
    openDialog(elements.promptDialog);
}

function closePromptDialog() {
    elements.promptDialog.close();
}

function findPromptCategory(promptId) {
    for (const category of state.library?.categories || []) {
        if ((category.prompts || []).some((prompt) => prompt.id === promptId)) {
            return category.name;
        }
    }
    return state.selectedCategory || "";
}

async function savePromptEntry(event) {
    event.preventDefault();
    const promptId = elements.promptEntryId.value;
    const payload = {
        category: elements.promptEntryCategory.value,
        alias: elements.promptEntryAlias.value.trim(),
        prompt: elements.promptEntryText.value.trim(),
        description: elements.promptEntryDescription.value.trim(),
        tags: elements.promptEntryTags.value.split(",").map((item) => item.trim()).filter(Boolean),
    };

    if (promptId) {
        await api(`/api/library/prompts/${promptId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    } else {
        await api("/api/library/prompts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    }

    closePromptDialog();
    await loadLibrary();
    notify("词条已保存。", "success");
}

function exportLibrary() {
    window.open("/api/library/export", "_blank", "noopener,noreferrer");
}

async function importLibrary() {
    const file = elements.importFileInput.files[0];
    if (!file) {
        return;
    }
    const formData = new FormData();
    formData.append("file", file);
    await api("/api/library/import", {
        method: "POST",
        body: formData,
    });
    elements.importFileInput.value = "";
    await loadLibrary();
    notify("词库导入完成。", "success");
}

function setRankingEnabled(enabled) {
    const tokens = tokenizeCommaInput(elements.searchTags.value);
    const filtered = tokens.filter((token) => token !== "order:rank");
    if (enabled) {
        filtered.push("order:rank");
    }
    elements.searchTags.value = buildSearchInputFromTokens(filtered);
}

function toggleRankingToken() {
    const isRankingEnabled = tokenizeCommaInput(elements.searchTags.value).includes("order:rank");
    if (!isRankingEnabled && state.favoritesOnly) {
        state.favoritesOnly = false;
    }
    setRankingEnabled(!isRankingEnabled);
    updateSearchControlsState();
    saveUiPrefs();
    runSearch({ resetPage: true, forceReload: true });
}

async function toggleFavoritesMode() {
    state.favoritesOnly = !state.favoritesOnly;
    if (state.favoritesOnly) {
        setRankingEnabled(false);
    }
    if (state.favoritesOnly && hasDanbooruAuth()) {
        await syncRemoteFavorites({ silent: true });
    }
    updateSearchControlsState();
    saveUiPrefs();
    await runSearch({ resetPage: true, forceReload: true });
}

function jumpToTypedPage() {
    goToPage(elements.searchPage.value);
}

function bindEvents() {
    bindDropdowns();
    attachAutocomplete(elements.searchTags, elements.searchAutocomplete, "search");
    attachAutocomplete(elements.addTagInput, elements.addTagAutocomplete, "replace");

    elements.searchTags.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            runSearch({ resetPage: true });
        }
    });
    elements.searchTags.addEventListener("input", () => {
        updateSearchControlsState();
        saveUiPrefs();
    });
    elements.clearSearchBtn.addEventListener("click", () => {
        elements.searchTags.value = "";
        updateSearchControlsState();
        saveUiPrefs();
        runSearch({ resetPage: true });
    });
    elements.ratingAllCheckbox.addEventListener("change", () => {
        const checked = elements.ratingAllCheckbox.checked;
        elements.ratingValueCheckboxes.forEach((checkbox) => {
            checkbox.checked = checked;
        });
        updateRatingButtonLabel();
        saveUiPrefs();
        runSearch({ resetPage: true });
    });
    elements.ratingValueCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            elements.ratingAllCheckbox.checked = getSelectedRatingValues().length === RATING_VALUES.length;
            updateRatingButtonLabel();
            saveUiPrefs();
            runSearch({ resetPage: true });
        });
    });
    elements.searchLimit.addEventListener("change", () => {
        saveUiPrefs();
        runSearch({ resetPage: true });
    });
    elements.searchPage.addEventListener("change", () => {
        jumpToTypedPage();
    });
    elements.searchPage.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            jumpToTypedPage();
        }
    });
    elements.prevPageBtn.addEventListener("click", () => {
        goToPage((Number(elements.searchPage.value) || 1) - 1);
    });
    elements.jumpPageBtn.addEventListener("click", jumpToTypedPage);
    elements.nextPageBtn.addEventListener("click", () => {
        goToPage((Number(elements.searchPage.value) || 1) + 1);
    });

    elements.rankingToggle.addEventListener("click", toggleRankingToken);
    elements.favoritesToggle.addEventListener("click", toggleFavoritesMode);
    elements.favoritesCountBtn.addEventListener("click", toggleFavoritesMode);
    elements.refreshBtn.addEventListener("click", () => runSearch({ forceReload: true }));
    elements.filterToggle.addEventListener("click", toggleFilterSetting);
    elements.openSettingsBtn.addEventListener("click", () => openDialog(elements.settingsDialog));
    elements.closeSettingsBtn.addEventListener("click", () => elements.settingsDialog.close());
    elements.cancelSettingsBtn.addEventListener("click", () => elements.settingsDialog.close());
    elements.settingsForm.addEventListener("submit", saveSettings);
    elements.toolbarCategoryCheckboxes.forEach((checkbox) => {
        checkbox.addEventListener("change", persistSelectedCategories);
    });
    elements.fmtReplaceUnderscores.addEventListener("change", () => {
        saveUiPrefs();
        rerenderAllPrompts();
    });
    elements.fmtEscapeBrackets.addEventListener("change", () => {
        saveUiPrefs();
        rerenderAllPrompts();
    });

    elements.closeEditorBtn.addEventListener("click", closeEditor);
    elements.editorDialog.addEventListener("close", () => {
        cleanupEditIfUnchanged(state.editingPostId);
        updateSelectionStatus();
        renderResults();
    });
    elements.closeViewerBtn.addEventListener("click", closeViewer);
    elements.viewerDialog.addEventListener("click", (event) => {
        if (event.target === elements.viewerDialog) {
            closeViewer();
        }
    });
    elements.viewerDialog.addEventListener("close", () => {
        state.viewingPostId = null;
    });
    elements.viewerOpenPostBtn.addEventListener("click", () => {
        const url = elements.viewerOpenPostBtn.dataset.postUrl;
        if (url) {
            window.open(url, "_blank", "noopener,noreferrer");
        }
    });
    elements.viewerEditBtn.addEventListener("click", async () => {
        const postId = state.viewingPostId;
        closeViewer();
        if (postId) {
            await openEditor(postId);
        }
    });
    elements.addTagBtn.addEventListener("click", addTagToEditor);
    elements.addTagInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            addTagToEditor();
        }
    });
    elements.cleanPromptBtn.addEventListener("click", cleanPrompt);
    elements.copyPromptBtn.addEventListener("click", copyPrompt);
    elements.resetTagsBtn.addEventListener("click", resetEditorTags);
    elements.promptEditor.addEventListener("input", resizePromptEditor);

    elements.openLibraryBtn.addEventListener("click", async () => {
        await loadLibrary();
        openDialog(elements.libraryDialog);
    });
    elements.closeLibraryBtn.addEventListener("click", () => elements.libraryDialog.close());
    elements.newCategoryBtn.addEventListener("click", createCategory);
    elements.renameCategoryBtn.addEventListener("click", renameCategory);
    elements.deleteCategoryBtn.addEventListener("click", deleteCategory);
    elements.newPromptBtn.addEventListener("click", () => {
        if (!state.library?.categories?.length) {
            notify("先创建一个分类，再新建词条。");
            return;
        }
        openPromptDialog();
    });
    elements.exportLibraryBtn.addEventListener("click", exportLibrary);
    elements.importLibraryBtn.addEventListener("click", () => elements.importFileInput.click());
    elements.importFileInput.addEventListener("change", importLibrary);

    elements.promptForm.addEventListener("submit", savePromptEntry);
    elements.closePromptDialogBtn.addEventListener("click", closePromptDialog);
    elements.cancelPromptDialogBtn.addEventListener("click", closePromptDialog);
}

async function init() {
    state.uiPrefs = {
        ...DEFAULT_UI_PREFS,
        replaceUnderscores: state.uiPrefs.replaceUnderscores,
        escapeBrackets: state.uiPrefs.escapeBrackets,
        limit: state.uiPrefs.limit || DEFAULT_UI_PREFS.limit,
    };
    syncUiPrefsToControls();
    updateFavoritesCount();
    updateSearchControlsState();
    bindEvents();
    await loadSettings();
    await syncRemoteFavorites({ silent: true });
    await loadLibrary();
    elements.searchTags.value = "order:rank";
    applySelectedRatingValues([...RATING_VALUES]);
    elements.searchPage.value = "1";
    saveUiPrefs();
    updateSearchControlsState();
    await runSearch({ resetPage: true });
}

init().catch((error) => {
    notify(`初始化失败: ${error.message}`, "error");
});
