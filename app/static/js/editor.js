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
    if (dialog === elements.editorDialog) {
        window.requestAnimationFrame(() => {
            dialog.scrollTop = 0;
            resizePromptEditor();
        });
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

