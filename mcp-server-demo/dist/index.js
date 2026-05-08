import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile, writeFile, rename } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const FEATURES_PATH = join(__dirname, "../../config/features.json");
async function readFeatures() {
    const raw = await readFile(FEATURES_PATH, "utf-8");
    return JSON.parse(raw);
}
async function writeFeaturesAtomic(features) {
    const tmpPath = `${FEATURES_PATH}.tmp`;
    await writeFile(tmpPath, JSON.stringify(features, null, 2), "utf-8");
    await rename(tmpPath, FEATURES_PATH);
}
function todayIso() {
    return new Date().toISOString().slice(0, 10);
}
function dependencyStates(features, deps) {
    if (!deps?.length)
        return [];
    return deps.map((dep) => {
        const f = features[dep];
        return f
            ? { feature_name: dep, status: f.status }
            : { feature_name: dep, status: "UNKNOWN", error: "FEATURE_NOT_FOUND" };
    });
}
function asJsonContent(payload) {
    return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    };
}
function readErrorPayload(err, feature_name) {
    return {
        error: err instanceof SyntaxError ? "JSON_PARSE_ERROR" : "FILE_READ_ERROR",
        message: err instanceof Error ? err.message : String(err),
        feature_name,
    };
}
const server = new McpServer({
    name: "demo-server",
    version: "0.1.0",
});
// ---------------------------------------------------------------------------
// Tool 1: get_feature_info
// ---------------------------------------------------------------------------
const getFeatureInfoSchema = z.object({
    feature_name: z
        .string()
        .describe("snake_case ID фичи в features.json (например, 'search_v2', 'dark_mode')."),
});
server.tool("get_feature_info", [
    "Возвращает текущее состояние одного фиче-флага: status, traffic_percentage, last_modified",
    "и состояние каждой зависимости (depends_on с её status).",
    "",
    "Когда вызывать: пользователь спрашивает про статус/процент трафика/дату изменения конкретной",
    "фичи или хочет узнать, готовы ли её зависимости.",
    "Когда НЕ вызывать: для изменения состояния (используйте set_feature_state /",
    "adjust_traffic_rollout); для перечисления всех фич (такого тула в этом сервере нет).",
    "",
    "Read-only — файл features.json не модифицируется.",
    "",
    "Формат входа: { feature_name: string }.",
    "Формат выхода (success): { feature_name, status, traffic_percentage, last_modified,",
    "  dependencies: [{ feature_name, status }] }.",
    "Формат ошибки: { error: 'FEATURE_NOT_FOUND' | 'FILE_READ_ERROR' | 'JSON_PARSE_ERROR',",
    "  message: string, feature_name: string }.",
    "",
    "Примеры:",
    "1) get_feature_info({ feature_name: 'dark_mode' })",
    "   → { status: 'Testing', traffic_percentage: 20, last_modified: '2026-04-20', dependencies: [] }",
    "2) get_feature_info({ feature_name: 'semantic_search' })",
    "   → { status: 'Disabled', dependencies: [{ feature_name: 'search_v2', status: 'Testing' }] }",
    "3) get_feature_info({ feature_name: 'no_such_feature' })",
    "   → { error: 'FEATURE_NOT_FOUND', message: \"...\", feature_name: 'no_such_feature' }",
].join("\n"), getFeatureInfoSchema.shape, async (args) => {
    const { feature_name } = args;
    let features;
    try {
        features = await readFeatures();
    }
    catch (err) {
        return asJsonContent(readErrorPayload(err, feature_name));
    }
    const feature = features[feature_name];
    if (!feature) {
        return asJsonContent({
            error: "FEATURE_NOT_FOUND",
            message: `No feature with ID '${feature_name}' exists in features.json.`,
            feature_name,
        });
    }
    return asJsonContent({
        feature_name,
        status: feature.status,
        traffic_percentage: feature.traffic_percentage,
        last_modified: feature.last_modified,
        dependencies: dependencyStates(features, feature.dependencies),
    });
});
// ---------------------------------------------------------------------------
// Tool 2: set_feature_state
// ---------------------------------------------------------------------------
const setFeatureStateSchema = z.object({
    feature_name: z.string().describe("snake_case ID фичи."),
    state: z
        .enum(["Disabled", "Testing", "Enabled"])
        .describe("Целевой status. Только три значения, регистрозависимо: 'Disabled' (выключено),"
        + " 'Testing' (canary/ab-test), 'Enabled' (полностью включено)."),
});
server.tool("set_feature_state", [
    "Меняет status фичи на одно из 'Disabled', 'Testing', 'Enabled' и атомарно записывает",
    "features.json (write tmp → rename). Также пересчитывает traffic_percentage и обновляет",
    "last_modified на сегодняшнюю дату (UTC, YYYY-MM-DD).",
    "",
    "You MUST не переводить фичу в 'Enabled', если хотя бы одна её зависимость в 'Disabled' —",
    "сервер вернёт ошибку DEPENDENCY_NOT_ENABLED. Сначала включите зависимости.",
    "",
    "Side effects на traffic_percentage:",
    "  - Disabled  → 0",
    "  - Enabled   → 100",
    "  - Testing   → текущее значение, если в диапазоне 1..99; иначе 10 (безопасный старт canary).",
    "",
    "Когда вызывать: kill switch (rollback в Disabled), запуск canary/A-B (Testing),",
    "promote после успешного теста (Enabled).",
    "Когда НЕ вызывать: для подкрутки только процента трафика — используйте adjust_traffic_rollout.",
    "",
    "Формат входа: { feature_name: string, state: 'Disabled' | 'Testing' | 'Enabled' }.",
    "Формат выхода (success): { feature_name, status, traffic_percentage, last_modified,",
    "  dependencies: [{ feature_name, status }] }.",
    "Формат ошибки: { error: 'FEATURE_NOT_FOUND' | 'INVALID_STATE' | 'DEPENDENCY_NOT_ENABLED'",
    "  | 'FILE_READ_ERROR' | 'FILE_WRITE_ERROR' | 'JSON_PARSE_ERROR', message, feature_name,",
    "  blocking_dependencies?: string[] }.",
    "",
    "Примеры:",
    "1) set_feature_state({ feature_name: 'stripe_alternative', state: 'Disabled' })",
    "   → { status: 'Disabled', traffic_percentage: 0, last_modified: '<today>' }",
    "2) set_feature_state({ feature_name: 'cart_redesign', state: 'Enabled' })",
    "   → { status: 'Enabled', traffic_percentage: 100, ... } (если у фичи нет блокирующих deps)",
    "3) set_feature_state({ feature_name: 'semantic_search', state: 'Enabled' }) при search_v2 = 'Disabled'",
    "   → { error: 'DEPENDENCY_NOT_ENABLED', blocking_dependencies: ['search_v2'], ... }",
].join("\n"), setFeatureStateSchema.shape, async (args) => {
    const { feature_name, state } = args;
    let features;
    try {
        features = await readFeatures();
    }
    catch (err) {
        return asJsonContent(readErrorPayload(err, feature_name));
    }
    const feature = features[feature_name];
    if (!feature) {
        return asJsonContent({
            error: "FEATURE_NOT_FOUND",
            message: `No feature with ID '${feature_name}' exists in features.json.`,
            feature_name,
        });
    }
    if (state === "Enabled" && feature.dependencies?.length) {
        const blocking = feature.dependencies.filter((dep) => {
            const depFeature = features[dep];
            return !depFeature || depFeature.status === "Disabled";
        });
        if (blocking.length > 0) {
            return asJsonContent({
                error: "DEPENDENCY_NOT_ENABLED",
                message: `Cannot transition '${feature_name}' to Enabled: dependencies in Disabled `
                    + `(or missing) state — ${blocking.join(", ")}. Enable them first.`,
                feature_name,
                blocking_dependencies: blocking,
            });
        }
    }
    if (state === "Disabled") {
        feature.traffic_percentage = 0;
    }
    else if (state === "Enabled") {
        feature.traffic_percentage = 100;
    }
    else {
        const current = feature.traffic_percentage;
        if (!Number.isInteger(current) || current < 1 || current > 99) {
            feature.traffic_percentage = 10;
        }
    }
    feature.status = state;
    feature.last_modified = todayIso();
    try {
        await writeFeaturesAtomic(features);
    }
    catch (err) {
        return asJsonContent({
            error: "FILE_WRITE_ERROR",
            message: err instanceof Error ? err.message : String(err),
            feature_name,
        });
    }
    return asJsonContent({
        feature_name,
        status: feature.status,
        traffic_percentage: feature.traffic_percentage,
        last_modified: feature.last_modified,
        dependencies: dependencyStates(features, feature.dependencies),
    });
});
// ---------------------------------------------------------------------------
// Tool 3: adjust_traffic_rollout
// ---------------------------------------------------------------------------
const adjustTrafficRolloutSchema = z.object({
    feature_name: z.string().describe("snake_case ID фичи."),
    percentage: z
        .number()
        .int()
        .min(0)
        .max(100)
        .describe("Целое число 0..100 включительно. Дробные значения отвергаются."),
});
server.tool("adjust_traffic_rollout", [
    "Устанавливает traffic_percentage фичи в указанное целое 0..100. status НЕ меняется.",
    "Атомарно перезаписывает features.json и обновляет last_modified на сегодня.",
    "",
    "You MUST не вызывать с percentage > 0, если фича находится в status='Disabled' —",
    "сервер вернёт ошибку LOCKED_BY_DISABLED_STATUS. Сначала переведите фичу в Testing/Enabled",
    "через set_feature_state.",
    "",
    "Когда вызывать: пошаговая раскатка canary (5 → 25 → 50 → 100), подстройка трафика в",
    "A/B-тесте, обнуление процента без полной деактивации.",
    "Когда НЕ вызывать: для смены статуса (Disabled/Testing/Enabled) — это set_feature_state.",
    "Не передавайте дробные числа: они отвергаются валидацией.",
    "",
    "Формат входа: { feature_name: string, percentage: integer 0..100 }.",
    "Формат выхода (success): { feature_name, status, traffic_percentage, last_modified }.",
    "Формат ошибки: { error: 'FEATURE_NOT_FOUND' | 'INVALID_PERCENTAGE'",
    "  | 'LOCKED_BY_DISABLED_STATUS' | 'FILE_READ_ERROR' | 'FILE_WRITE_ERROR'",
    "  | 'JSON_PARSE_ERROR', message, feature_name }.",
    "",
    "Примеры:",
    "1) adjust_traffic_rollout({ feature_name: 'search_v2', percentage: 50 }) при status='Testing'",
    "   → { status: 'Testing', traffic_percentage: 50, last_modified: '<today>' }",
    "2) adjust_traffic_rollout({ feature_name: 'paypal_express_buttons', percentage: 80 }) при status='Enabled'",
    "   → { status: 'Enabled', traffic_percentage: 80, ... } (status не меняется)",
    "3) adjust_traffic_rollout({ feature_name: 'apple_pay', percentage: 10 }) при status='Disabled'",
    "   → { error: 'LOCKED_BY_DISABLED_STATUS', ... }",
].join("\n"), adjustTrafficRolloutSchema.shape, async (args) => {
    const { feature_name, percentage } = args;
    let features;
    try {
        features = await readFeatures();
    }
    catch (err) {
        return asJsonContent(readErrorPayload(err, feature_name));
    }
    const feature = features[feature_name];
    if (!feature) {
        return asJsonContent({
            error: "FEATURE_NOT_FOUND",
            message: `No feature with ID '${feature_name}' exists in features.json.`,
            feature_name,
        });
    }
    if (feature.status === "Disabled" && percentage > 0) {
        return asJsonContent({
            error: "LOCKED_BY_DISABLED_STATUS",
            message: `Cannot set traffic_percentage=${percentage} while '${feature_name}' is Disabled. `
                + "Use set_feature_state to move it to Testing/Enabled first.",
            feature_name,
        });
    }
    feature.traffic_percentage = percentage;
    feature.last_modified = todayIso();
    try {
        await writeFeaturesAtomic(features);
    }
    catch (err) {
        return asJsonContent({
            error: "FILE_WRITE_ERROR",
            message: err instanceof Error ? err.message : String(err),
            feature_name,
        });
    }
    return asJsonContent({
        feature_name,
        status: feature.status,
        traffic_percentage: feature.traffic_percentage,
        last_modified: feature.last_modified,
    });
});
// ---------------------------------------------------------------------------
// Connect transport last (after all tools are registered).
// ---------------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map