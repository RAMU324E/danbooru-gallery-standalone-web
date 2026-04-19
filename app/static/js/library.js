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

