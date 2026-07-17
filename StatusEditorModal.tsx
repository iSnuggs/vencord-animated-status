import { Switch } from "@components/Switch";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { ModalProps } from "@vencord/discord-types";
import { Button, Forms, Select, TabBar, Text, TextInput, useState, UserStore } from "@webpack/common";

const EMOJI_MARKDOWN_REGEX = /<a?:([^:]+):(\d+)>/;
const MIN_TIMEOUT_S = 5;
const MAX_TIMEOUT_S = 60;
const TIMEOUT_TICKS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

export interface AnimationStep {
    text?: string;
    emojiName?: string;
    emojiId?: string;
    preset?: string;
}

export interface Preset {
    id: string;
    name: string;
}

export interface EditorData {
    steps: AnimationStep[];
    presets: Preset[];
    timeout: number;
    randomize: boolean;
    activePreset: string;
}

enum Tab { STATUSES = "statuses", PRESETS = "presets", SETTINGS = "settings" }

// Custom server emojis paste as <:name:id> / <a:name:id> markdown - those get
// split into name+id so the CDN image can be resolved. A plain typed/pasted
// Unicode emoji (e.g. 🔮) never matches that pattern (it's just a character,
// not markdown), so it's kept as-is with no id - Discord's real custom
// status API accepts both shapes (emoji_id is only ever set for custom
// server emojis).
function parseEmojiMarkdown(input: string): { emojiName: string; emojiId?: string; } | null {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const match = trimmed.match(EMOJI_MARKDOWN_REGEX);
    if (match) return { emojiName: match[1], emojiId: match[2] };

    return { emojiName: trimmed };
}

function getEmojiUrl(id: string): string {
    return `https://cdn.discordapp.com/emojis/${id}.png?size=32`;
}

function Panel({ children, className = "" }: { children: any; className?: string; }) {
    return <div className={`vc-as-panel ${className}`}>{children}</div>;
}

function CheckIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
    );
}

// Thin wrapper around Discord's real themed Select component (found via a
// confirmed working example in customRPC's settings) instead of a native
// <select>, which renders as an unstyled OS dropdown in Electron.
function PresetSelect({ value, presets, onChange, noneLabel }: {
    value: string;
    presets: Preset[];
    onChange: (v: string) => void;
    noneLabel: string;
}) {
    const options = [
        { label: noneLabel, value: "" },
        ...presets.map(p => ({ label: p.name, value: p.name }))
    ];

    return (
        <Select
            className="vc-as-preset-select"
            placeholder={noneLabel}
            options={options}
            select={onChange}
            isSelected={v => v === value}
            serialize={v => String(v)}
        />
    );
}

function StatusPreview({ text, emojiId, emojiName }: { text: string; emojiId?: string; emojiName?: string; }) {
    const user = UserStore.getCurrentUser();
    return (
        <Panel className="vc-as-preview-panel">
            <div className="vc-as-preview-label">
                <CheckIcon />
                <Text variant="text-xs/bold">PREVIEW</Text>
            </div>
            <div className="vc-as-preview-card">
                <div className="vc-as-preview-avatar-wrapper">
                    <img src={user ? user.getAvatarURL(void 0, 64, true) : undefined} alt="" className="vc-as-preview-avatar" />
                    <span className="vc-as-preview-dot" />
                </div>
                <div className="vc-as-preview-body">
                    <Text variant="text-sm/semibold">{user?.username ?? "You"}</Text>
                    <div className="vc-as-preview-status">
                        {emojiId ? (
                            <img src={getEmojiUrl(emojiId)} alt="" className="vc-as-preview-emoji" />
                        ) : emojiName ? (
                            <span className="vc-as-preview-emoji-text">{emojiName}</span>
                        ) : null}
                        <Text variant="text-sm/normal" className="vc-as-preview-text">
                            {text || <span className="vc-as-preview-placeholder">It's just a preview</span>}
                        </Text>
                    </div>
                </div>
            </div>
        </Panel>
    );
}

function TimeoutSlider({ valueSeconds, onChange }: {
    valueSeconds: number;
    onChange: (v: number) => void;
}) {
    const clamped = Math.min(MAX_TIMEOUT_S, Math.max(MIN_TIMEOUT_S, valueSeconds));
    const percent = ((clamped - MIN_TIMEOUT_S) / (MAX_TIMEOUT_S - MIN_TIMEOUT_S)) * 100;

    return (
        <div className="vc-as-slider-block">
            <div className="vc-as-slider-endlabels">
                <Text variant="text-xs/normal">FASTER ({MIN_TIMEOUT_S}s)</Text>
                <Text variant="text-xs/normal">SLOWER ({MAX_TIMEOUT_S}s)</Text>
            </div>
            <div className="vc-as-slider-row">
                <div className="vc-as-slider-track-wrapper">
                    <input
                        type="range"
                        min={MIN_TIMEOUT_S}
                        max={MAX_TIMEOUT_S}
                        value={clamped}
                        className="vc-as-slider"
                        style={{ "--vc-as-fill": `${percent}%` } as any}
                        onChange={e => onChange(Number(e.target.value))}
                    />
                    <div className="vc-as-slider-ticks">
                        {TIMEOUT_TICKS.map(t => <span key={t} className="vc-as-tick">{t}</span>)}
                    </div>
                </div>
                <div className="vc-as-slider-value-box">{clamped}s</div>
            </div>
        </div>
    );
}

function StatusRow({ step, presets, onChange, onDelete }: {
    step: AnimationStep;
    presets: Preset[];
    onChange: (step: AnimationStep) => void;
    onDelete: () => void;
}) {
    const [text, setText] = useState(step.text ?? "");
    const [emojiInput, setEmojiInput] = useState("");

    const applyText = (value: string) => {
        setText(value);
        onChange({ ...step, text: value });
    };

    // Commits on Enter/blur rather than every keystroke, since we now accept
    // plain typed/pasted Unicode emoji as well as custom-emoji markdown, and
    // committing mid-type would be wrong for the plain-emoji case.
    const commitEmojiInput = () => {
        const parsed = parseEmojiMarkdown(emojiInput);
        if (parsed) {
            onChange({ ...step, emojiName: parsed.emojiName, emojiId: parsed.emojiId });
        }
        setEmojiInput("");
    };

    const clearEmoji = () => onChange({ ...step, emojiName: undefined, emojiId: undefined });

    return (
        <div className="vc-as-row-card">
            <div className="vc-as-row-main">
                <div className="vc-as-row-line">
                    {step.emojiId ? (
                        <div className="vc-as-emoji-chip">
                            <img src={getEmojiUrl(step.emojiId)} alt="" className="vc-as-emoji-chip-img" />
                            <span className="vc-as-emoji-chip-remove" onClick={clearEmoji}>×</span>
                        </div>
                    ) : step.emojiName ? (
                        <div className="vc-as-emoji-chip vc-as-emoji-chip-text">
                            <span>{step.emojiName}</span>
                            <span className="vc-as-emoji-chip-remove" onClick={clearEmoji}>×</span>
                        </div>
                    ) : null}
                    <div className="vc-as-input-wrapper">
                        <TextInput value={text} onChange={applyText} placeholder="Status text" />
                    </div>
                    <div className="vc-as-emoji-input-wrapper">
                        <TextInput
                            value={emojiInput}
                            onChange={setEmojiInput}
                            onBlur={commitEmojiInput}
                            onKeyDown={(e: any) => { if (e.key === "Enter") commitEmojiInput(); }}
                            placeholder="Emoji"
                        />
                    </div>
                    <PresetSelect
                        value={step.preset ?? ""}
                        presets={presets}
                        onChange={v => onChange({ ...step, preset: v || undefined })}
                        noneLabel="No preset"
                    />
                </div>
            </div>
            <button className="vc-as-icon-delete" onClick={onDelete} title="Delete">×</button>
        </div>
    );
}

function StatusesTab({ steps, setSteps, presets }: {
    steps: AnimationStep[];
    setSteps: (s: AnimationStep[]) => void;
    presets: Preset[];
}) {
    const [filterPreset, setFilterPreset] = useState("");
    const [newText, setNewText] = useState("");
    const previewStep = steps[steps.length - 1];
    const filtered = filterPreset ? steps.filter(s => s.preset === filterPreset) : steps;

    const updateStep = (index: number, step: AnimationStep) => setSteps(steps.map((s, i) => i === index ? step : s));
    const deleteStep = (index: number) => setSteps(steps.filter((_, i) => i !== index));
    const addStep = () => {
        if (!newText.trim()) return;
        setSteps([...steps, { text: newText.trim(), preset: filterPreset || undefined }]);
        setNewText("");
    };

    return (
        <div className="vc-as-tab">
            <StatusPreview text={previewStep?.text ?? ""} emojiId={previewStep?.emojiId} emojiName={previewStep?.emojiName} />

            <Panel>
                <Forms.FormTitle tag="h5" className="vc-as-panel-title">+ Add New Status</Forms.FormTitle>
                <div className="vc-as-row-line">
                    <div className="vc-as-input-wrapper">
                        <TextInput
                            value={newText}
                            onChange={setNewText}
                            placeholder="Your status here"
                            onKeyDown={(e: any) => { if (e.key === "Enter") addStep(); }}
                        />
                    </div>
                    <Button color={Button.Colors.BRAND} size={Button.Sizes.SMALL} onClick={addStep} disabled={!newText.trim()}>
                        Add
                    </Button>
                </div>
            </Panel>

            <div className="vc-as-list-header">
                <Forms.FormTitle tag="h5">Your Status Messages ({filtered.length})</Forms.FormTitle>
                {presets.length > 0 && (
                    <PresetSelect value={filterPreset} presets={presets} onChange={setFilterPreset} noneLabel="All presets" />
                )}
            </div>
            <div className="vc-as-list">
                {filtered.map(step => {
                    const actualIndex = steps.indexOf(step);
                    return (
                        <StatusRow
                            key={actualIndex}
                            step={step}
                            presets={presets}
                            onChange={s => updateStep(actualIndex, s)}
                            onDelete={() => deleteStep(actualIndex)}
                        />
                    );
                })}
            </div>
        </div>
    );
}

function PresetsTab({ presets, setPresets, steps, setSteps, activePreset, setActivePreset }: {
    presets: Preset[];
    setPresets: (p: Preset[]) => void;
    steps: AnimationStep[];
    setSteps: (s: AnimationStep[]) => void;
    activePreset: string;
    setActivePreset: (v: string) => void;
}) {
    const [newName, setNewName] = useState("");

    const createPreset = () => {
        const name = newName.trim();
        if (!name || presets.some(p => p.name === name)) return;
        setPresets([...presets, { id: Date.now().toString(), name }]);
        setNewName("");
    };

    const deletePreset = (preset: Preset) => {
        setPresets(presets.filter(p => p.id !== preset.id));
        setSteps(steps.map(s => s.preset === preset.name ? { ...s, preset: undefined } : s));
        if (activePreset === preset.name) setActivePreset("");
    };

    return (
        <div className="vc-as-tab">
            <Panel>
                <Forms.FormTitle tag="h5" className="vc-as-panel-title">Presets</Forms.FormTitle>
                <Text variant="text-sm/normal" className="vc-as-tab-desc">
                    Group statuses into presets, then choose which one actually cycles. Assign a status to a preset from the dropdown on its row.
                </Text>
                <div className="vc-as-row-line vc-as-preset-create">
                    <div className="vc-as-input-wrapper">
                        <TextInput value={newName} onChange={setNewName} placeholder="New preset name..." />
                    </div>
                    <Button color={Button.Colors.BRAND} size={Button.Sizes.SMALL} onClick={createPreset} disabled={!newName.trim()}>
                        + Create
                    </Button>
                </div>
            </Panel>

            <Panel>
                <Forms.FormTitle tag="h5" className="vc-as-panel-title">Active Preset</Forms.FormTitle>
                <Text variant="text-sm/normal" className="vc-as-tab-desc">
                    Which set of statuses actually cycles. Choose "All Statuses" to ignore presets entirely.
                </Text>
                <PresetSelect value={activePreset} presets={presets} onChange={setActivePreset} noneLabel="All Statuses" />
            </Panel>

            <div className="vc-as-list">
                {presets.map(preset => {
                    const count = steps.filter(s => s.preset === preset.name).length;
                    return (
                        <div key={preset.id} className="vc-as-row-card">
                            <div className="vc-as-row-main">
                                <Text variant="text-md/medium">
                                    {preset.name}
                                    {activePreset === preset.name && <span className="vc-as-active-tag"> • Active</span>}
                                </Text>
                                <Text variant="text-sm/normal" className="vc-as-tab-desc">
                                    {count} status{count === 1 ? "" : "es"}
                                </Text>
                            </div>
                            <button className="vc-as-icon-delete" onClick={() => deletePreset(preset)} title="Delete">×</button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SettingsTab({ timeout, randomize, onTimeoutChange, onRandomizeChange }: {
    timeout: number;
    randomize: boolean;
    onTimeoutChange: (v: number) => void;
    onRandomizeChange: (v: boolean) => void;
}) {
    return (
        <div className="vc-as-tab">
            <Panel>
                <Forms.FormTitle tag="h5" className="vc-as-panel-title">Update Interval</Forms.FormTitle>
                <Text variant="text-sm/normal" className="vc-as-tab-desc">
                    How long each status stays up before switching to the next one.
                </Text>
                <TimeoutSlider valueSeconds={timeout / 1000} onChange={v => onTimeoutChange(v * 1000)} />
                <div className="vc-as-hint">
                    Minimum value is {MIN_TIMEOUT_S} seconds. Very short intervals are more likely to hit Discord's rate limits.
                </div>
            </Panel>

            <Panel>
                <Forms.FormTitle tag="h5" className="vc-as-panel-title">Animation Options</Forms.FormTitle>
                <div className="vc-as-switch-row">
                    <div>
                        <Text variant="text-sm/semibold">Randomize Order</Text>
                        <Text variant="text-sm/normal" className="vc-as-tab-desc">Shuffle steps instead of cycling in sequence</Text>
                    </div>
                    <Switch checked={randomize} onChange={onRandomizeChange} />
                </div>
            </Panel>

            <div className="vc-as-hint">
                <Text variant="text-xs/semibold">Tip: emoji placement</Text><br />
                The dedicated Emoji field (on each status row) is for custom server emoji only — Discord always
                shows those before your text, no matter what. For a plain Unicode emoji anywhere in the middle
                or end of a status, just type/paste it directly into that status's text box instead.
            </div>
        </div>
    );
}

function StatusEditor({ initial, onSave, modalProps }: {
    initial: EditorData;
    onSave: (data: EditorData) => void;
    modalProps: ModalProps;
}) {
    const [tab, setTab] = useState<Tab>(Tab.STATUSES);
    const [steps, setSteps] = useState(initial.steps);
    const [presets, setPresets] = useState(initial.presets);
    const [timeout_, setTimeout_] = useState(initial.timeout);
    const [randomize, setRandomize] = useState(initial.randomize);
    const [activePreset, setActivePreset] = useState(initial.activePreset);

    const save = () => {
        onSave({
            steps: steps.filter(s => (s.text && s.text.trim()) || s.emojiId || s.emojiName),
            presets,
            timeout: timeout_,
            randomize,
            activePreset
        });
        modalProps.onClose();
    };

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE} className="vc-as-modal">
            <ModalHeader className="vc-as-header">
                <Text variant="heading-lg/semibold">Animated Status</Text>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <TabBar className="vc-as-tabbar" type="top" selectedItem={tab} onItemSelect={(t: Tab) => setTab(t)}>
                <TabBar.Item className="vc-as-tab-item" id={Tab.STATUSES}>Statuses</TabBar.Item>
                <TabBar.Item className="vc-as-tab-item" id={Tab.PRESETS}>Presets</TabBar.Item>
                <TabBar.Item className="vc-as-tab-item" id={Tab.SETTINGS}>Settings</TabBar.Item>
            </TabBar>
            <ModalContent className="vc-as-modal-content">
                {tab === Tab.STATUSES && <StatusesTab steps={steps} setSteps={setSteps} presets={presets} />}
                {tab === Tab.PRESETS && (
                    <PresetsTab
                        presets={presets} setPresets={setPresets}
                        steps={steps} setSteps={setSteps}
                        activePreset={activePreset} setActivePreset={setActivePreset}
                    />
                )}
                {tab === Tab.SETTINGS && (
                    <SettingsTab
                        timeout={timeout_} randomize={randomize}
                        onTimeoutChange={setTimeout_} onRandomizeChange={setRandomize}
                    />
                )}
            </ModalContent>
            <ModalFooter className="vc-as-footer">
                <Button color={Button.Colors.GREEN} onClick={save}>Save</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function openStatusEditor(initial: EditorData, onSave: (data: EditorData) => void) {
    openModal(modalProps => (
        <StatusEditor initial={initial} onSave={onSave} modalProps={modalProps} />
    ));
}
