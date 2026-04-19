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

