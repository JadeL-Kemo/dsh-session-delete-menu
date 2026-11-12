window.__ModuleLoader__.load({ id: "dsh-session-delete-menu", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const DELETE_PATH = "/api/mobile-nav.session.delete";
const ERROR_LABELS = {
    "session-not-found": "会话不存在（可能已经删除，或会话列表已过期）",
    "session-busy": "该会话正在运行中，请先切换到其它会话再删除",
    "persistence-unavailable": "会话存储暂不可用，请稍后重试",
    "delete-failed": "会话删除失败，请稍后重试",
};
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
function errorLabel(code) {
    return ERROR_LABELS[code] ?? code;
}
async function deleteSession(ctx, sessionId, displayTitle) {
    const suffix = displayTitle ? `「${displayTitle}」` : "";
    const confirmed = window.confirm(
        `删除会话${suffix}？\n\n` +
        "会话文件和记录会移入回收站（.sessions-trash），24 小时内可以恢复。\n" +
        "这一步不能撤销已发生的对话内容，确定删除吗？"
    );
    if (!confirmed) return;
    let response;
    try {
        response = await fetch(DELETE_PATH, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ sessionId }),
        });
    } catch (error) {
        window.alert(`删除失败：${messageOf(error)}`);
        return;
    }
    let payload = null;
    try { payload = await response.json(); } catch { /* empty body */ }
    if (!response.ok || payload === null || payload.ok !== true) {
        const code = payload?.error?.code ?? payload?.code ?? `http-${response.status}`;
        window.alert(`删除失败：${errorLabel(code)}`);
        return;
    }
    try {
        if (typeof ctx.sessions?.refresh === "function") await ctx.sessions.refresh();
    } catch { /* list refresh is best-effort */ }
}
function apply(ctx) {
    ctx.effect(() => ctx.contextMenus.register({
        id: "plugin.sessionDelete",
        target: "session",
        order: 700,
        resolve: ({ sessionId, displayTitle }) => {
            if (typeof sessionId !== "string" || sessionId === "") return [];
            return [{
                id: "plugin.sessionDelete.run",
                label: "删除会话",
                danger: true,
                separatorBefore: true,
                run: () => { void deleteSession(ctx, sessionId, displayTitle); },
            }];
        },
    }), "session-delete-menu: session delete action");
}

exports.inject = ["contextMenus", "sessions"];
exports.apply = apply;
return module.exports; } });
