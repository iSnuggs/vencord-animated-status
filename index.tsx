import "./styles.css";

import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Logger } from "@utils/Logger";
import { Button, Text } from "@webpack/common";

import { AnimationStep, EditorData, openStatusEditor, Preset } from "./StatusEditorModal";

const logger = new Logger("AnimatedStatus");

const MIN_TIMEOUT = 10_000;

const settings = definePluginSettings({
    animation: {
        type: OptionType.STRING,
        description: "JSON array of steps (edit via the button below, not directly)",
        default: "[]",
        hidden: true
    },
    presets: {
        type: OptionType.STRING,
        description: "JSON array of presets (edit via the button below, not directly)",
        default: "[]",
        hidden: true
    },
    activePreset: {
        type: OptionType.STRING,
        description: "Which preset is currently cycling - empty means all statuses",
        default: "",
        hidden: true
    },
    timeout: {
        type: OptionType.NUMBER,
        description: "Default step duration in ms (edit via the Settings tab in the editor)",
        default: MIN_TIMEOUT,
        hidden: true
    },
    randomize: {
        type: OptionType.BOOLEAN,
        description: "Randomize step order (edit via the Settings tab in the editor)",
        default: false,
        hidden: true
    },
    editStatuses: {
        type: OptionType.COMPONENT,
        description: "Add, edit, and organize your status steps",
        component: () => {
            const count = getActiveSteps().length;
            const total = parseAnimation().length;
            const summary = settings.store.activePreset
                ? `${count}/${total} steps active (preset: ${settings.store.activePreset})`
                : `${total} step${total === 1 ? "" : "s"} configured`;

            return (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Button size={Button.Sizes.SMALL} onClick={() => openStatusEditor(getEditorData(), saveEditorData)}>
                        Edit Statuses
                    </Button>
                    <Text variant="text-sm/normal">{summary}</Text>
                </div>
            );
        }
    }
});

// Vencord's official UserSettingsAPI wraps Discord's own internal settings
// module - the same modern protobuf-backed system Discord's own Settings UI
// uses to write custom status, as opposed to the legacy REST endpoint
// (PATCH /users/@me/settings) the original BD plugin used, which is what was
// getting hard-429'd regardless of interval. Going through the same path
// Discord's own client uses internally may avoid that throttling entirely -
// unconfirmed until tested live, but it's a real architectural difference,
// not just a different way of hitting the same wall.
const CustomStatus = getUserSettingLazy<{
    text: string | null;
    emojiName: string | null;
    emojiId: string | null;
    expiresAtMs?: string;
    createdAtMs?: string;
} | null>("status", "customStatus");

let loopHandle: ReturnType<typeof setTimeout> | undefined;
let cancelled = false;

function parseAnimation(): AnimationStep[] {
    try {
        const parsed = JSON.parse(settings.store.animation);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        logger.error("Animation setting is not valid JSON, treating as empty");
        return [];
    }
}

function parsePresets(): Preset[] {
    try {
        const parsed = JSON.parse(settings.store.presets);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function getActiveSteps(): AnimationStep[] {
    const all = parseAnimation();
    const active = settings.store.activePreset;
    return active ? all.filter(s => s.preset === active) : all;
}

function getEditorData(): EditorData {
    return {
        steps: parseAnimation(),
        presets: parsePresets(),
        timeout: settings.store.timeout,
        randomize: settings.store.randomize,
        activePreset: settings.store.activePreset
    };
}

function saveEditorData(data: EditorData) {
    settings.store.animation = JSON.stringify(data.steps);
    settings.store.presets = JSON.stringify(data.presets);
    settings.store.timeout = data.timeout;
    settings.store.randomize = data.randomize;
    settings.store.activePreset = data.activePreset;

    // Restart the loop so a changed active preset / timeout takes effect
    // immediately instead of waiting for the next scheduled tick.
    cancelled = true;
    if (loopHandle) clearTimeout(loopHandle);
    animationLoop(0);
}

async function setStatus(step: AnimationStep | null) {
    if (!CustomStatus) {
        logger.error("Could not find the customStatus user setting - is UserSettingsAPI enabled?");
        return;
    }

    try {
        if (step === null) {
            await CustomStatus.updateSetting(null);
            return;
        }

        await CustomStatus.updateSetting({
            text: step.text || null,
            emojiName: step.emojiName || null,
            emojiId: step.emojiId || null,
            expiresAtMs: "0",
            createdAtMs: Date.now().toString()
        });
    } catch (e) {
        logger.error("Failed to update status", e);
    }
}

function animationLoop(i = 0) {
    const animation = getActiveSteps();
    if (animation.length === 0) return;

    i = ((i % animation.length) + animation.length) % animation.length;
    cancelled = false;

    const step = animation[i];
    setStatus(step).then(() => {
        if (cancelled) return;

        const timeout = Math.max(settings.store.timeout, MIN_TIMEOUT);
        loopHandle = setTimeout(() => {
            let next = i + 1;
            if (settings.store.randomize && animation.length > 2) {
                next = i + 1 + Math.floor(Math.random() * (animation.length - 2));
            }
            animationLoop(next);
        }, timeout);
    });
}

export default definePlugin({
    name: "AnimatedStatus",
    description: "Cycles your custom status through a list of text/emoji steps on a timer.",
    authors: [{ name: "isnuggs", id: 1483261914392825958n }],
    dependencies: ["UserSettingsAPI"],
    settings,

    start() {
        if (getActiveSteps().length === 0) {
            logger.info("No animation steps configured - open plugin settings to add some");
            return;
        }
        animationLoop(0);
    },

    stop() {
        cancelled = true;
        if (loopHandle) clearTimeout(loopHandle);
        setStatus(null);
    }
});
