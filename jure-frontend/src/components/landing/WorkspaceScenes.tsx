import React from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Search,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import type { ShowcaseUi } from "@/marketing/content/workspaceShowcase";

export type WorkspaceSceneId =
  | "cases"
  | "client"
  | "calendar"
  | "documents"
  | "team"
  | "tasks"
  | "finance"
  | "juria"
  | "knowledge"
  | "connected";

const NAV: Array<{
  key: WorkspaceSceneId | "dashboard";
  icon: React.ComponentType<{ className?: string }>;
  label: keyof ShowcaseUi["nav"];
}> = [
  { key: "dashboard", icon: LayoutDashboard, label: "dashboard" },
  { key: "cases", icon: Briefcase, label: "cases" },
  { key: "client", icon: Users, label: "clients" },
  { key: "calendar", icon: Calendar, label: "calendar" },
  { key: "documents", icon: FolderOpen, label: "library" },
  { key: "team", icon: MessageSquare, label: "team" },
  { key: "finance", icon: Wallet, label: "finance" },
  { key: "juria", icon: Sparkles, label: "juria" },
];

function navActive(scene: WorkspaceSceneId): string {
  if (scene === "knowledge") return "documents";
  if (scene === "tasks") return "cases";
  if (scene === "connected") return "dashboard";
  return scene;
}

function Chain({ items }: { items: string[] }) {
  return (
    <div className="ws-chain" aria-hidden>
      {items.map((item, i) => (
        <React.Fragment key={`${item}-${i}`}>
          {i > 0 && <ChevronRight className="ws-chain__arrow rtl:rotate-180" />}
          <span className="ws-chain__node">{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "ok" | "brand" | "neutral" }) {
  return (
    <span className={`ws-pill ws-pill--${tone}`}>{children}</span>
  );
}

function SceneCases({ ui }: { ui: ShowcaseUi }) {
  return (
    <div className="ws-body">
      <div className="ws-matter-head ws-stagger">
        <div className="min-w-0">
          <div className="ws-matter-title">{ui.matter}</div>
          <div className="ws-muted">{ui.matterType}</div>
        </div>
        <Pill tone="ok">{ui.status}</Pill>
      </div>
      <Chain items={[ui.client, ui.documents, ui.tasks, ui.deadlines, ui.team]} />
      <div className="ws-grid-3 ws-stagger">
        {[
          [ui.client, ui.matter],
          [ui.documents, ui.docs[0]],
          [ui.deadlines, ui.events[1].title],
        ].map(([label, value]) => (
          <div key={label} className="ws-cell">
            <div className="ws-kicker">{label}</div>
            <div className="ws-cell-value">{value}</div>
          </div>
        ))}
      </div>
      <div className="ws-rows ws-stagger">
        {ui.docs.slice(0, 3).map((doc) => (
          <div key={doc} className="ws-row">
            <FileText className="ws-ico" />
            <span>{doc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SceneClient({ ui }: { ui: ShowcaseUi }) {
  return (
    <div className="ws-body">
      <div className="ws-matter-head ws-stagger">
        <span className="ws-avatar">
          <Building2 className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <div className="ws-matter-title">{ui.matter}</div>
          <div className="ws-muted">{ui.company}</div>
        </div>
        <Pill tone="ok">{ui.status}</Pill>
      </div>
      <Chain items={[ui.client, ui.matter, ui.documents]} />
      <div className="ws-cell ws-stagger">
        <div className="ws-kicker">{ui.contacts}</div>
        <div className="ws-cell-value">{ui.contactName}</div>
        <div className="ws-muted">{ui.contactRole}</div>
      </div>
      <div className="ws-rows ws-stagger">
        <div className="ws-row ws-row--focus">
          <Briefcase className="ws-ico" />
          <div className="min-w-0">
            <div>{ui.matterType}</div>
            <div className="ws-muted">{ui.activeMatters}</div>
          </div>
          <Pill tone="brand">{ui.status}</Pill>
        </div>
        <div className="ws-row">
          <FileText className="ws-ico" />
          <div className="min-w-0">
            <div>{ui.previousMatter}</div>
            <div className="ws-muted">{ui.previousMatters}</div>
          </div>
          <Pill>{ui.closed}</Pill>
        </div>
      </div>
    </div>
  );
}

function SceneCalendar({ ui }: { ui: ShowcaseUi }) {
  return (
    <div className="ws-body">
      <div className="ws-matter-head ws-stagger">
        <div className="ws-matter-title">{ui.nav.calendar}</div>
        <Pill tone="brand">{ui.calendarMatter}</Pill>
      </div>
      <Chain items={[ui.events[1].kind, ui.matter, ui.partner, ui.client]} />
      <div className="ws-rows">
        {ui.events.map((event, i) => (
          <div
            key={event.time}
            className={`ws-row ws-stagger-item ${i === 1 ? "ws-row--focus" : ""}`}
            style={{ animationDelay: `${0.12 + i * 0.14}s` }}
          >
            <span className="ws-time">{event.time}</span>
            <div className="min-w-0 flex-1">
              <div>{event.title}</div>
              <div className="ws-muted">{event.kind}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SceneDocuments({ ui }: { ui: ShowcaseUi }) {
  return (
    <div className="ws-body">
      <div className="ws-search ws-stagger">
        <Search className="ws-ico" />
        <span>{ui.searchQuery}</span>
      </div>
      <Chain items={[ui.documents, ui.matter]} />
      <div className="ws-split">
        <div className="ws-rows">
          {ui.docs.map((doc, i) => (
            <div
              key={doc}
              className={`ws-row ws-stagger-item ${i === 0 ? "ws-row--focus" : ""}`}
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <FileText className="ws-ico" />
              <span className="truncate">{doc}</span>
            </div>
          ))}
        </div>
        <div className="ws-preview ws-stagger">
          <div className="ws-kicker">{ui.preview}</div>
          <div className="ws-preview-page" />
          <div className="ws-attach">{ui.attach}</div>
          <div className="ws-muted">{ui.attached}</div>
        </div>
      </div>
    </div>
  );
}

function SceneTeam({ ui }: { ui: ShowcaseUi }) {
  const people = [
    { role: ui.partner, ini: "SA", on: true },
    { role: ui.associate, ini: "MK", on: true },
    { role: ui.assistant, ini: "YB", on: false },
    { role: ui.junior, ini: "AL", on: false },
  ];
  return (
    <div className="ws-body">
      <Chain items={[ui.matter, ui.team, ui.nav.team, ui.tasks]} />
      <div className="ws-split">
        <div className="ws-rows ws-stagger">
          {people.map((p) => (
            <div key={p.ini} className={`ws-row ${p.on ? "ws-row--focus" : ""}`}>
              <span className="ws-dot">{p.ini}</span>
              <div className="min-w-0">
                <div>{p.role}</div>
                <div className="ws-muted">{p.on ? ui.assigned : ui.matter}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="ws-chat ws-stagger">
          <div className="ws-kicker">{ui.matter}</div>
          <div className="ws-bubble">{ui.taskReview}</div>
          <div className="ws-bubble ws-bubble--me">{ui.associate}</div>
        </div>
      </div>
    </div>
  );
}

function SceneTasks({ ui }: { ui: ShowcaseUi }) {
  const steps = [
    [ui.taskReview, ui.matter],
    [ui.assigned, ui.associate],
    [ui.deadlines, ui.tomorrow],
        [ui.statusLabel, ui.inProgress],
  ];
  return (
    <div className="ws-body">
      <div className="ws-matter-head ws-stagger">
        <CheckCircle2 className="ws-ico" />
        <div className="ws-matter-title">{ui.taskReview}</div>
      </div>
      <div className="ws-rows">
        {steps.map(([label, value], i) => (
          <div
            key={label}
            className="ws-row ws-stagger-item"
            style={{ animationDelay: `${0.12 + i * 0.16}s` }}
          >
            <Clock className="ws-ico" />
            <div className="min-w-0 flex-1">
              <div className="ws-kicker">{label}</div>
              <div>{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SceneFinance({ ui }: { ui: ShowcaseUi }) {
  return (
    <div className="ws-body">
      <div className="ws-matter-head ws-stagger">
        <div>
          <div className="ws-kicker">{ui.invoice}</div>
          <div className="ws-matter-title">{ui.invoiceNo}</div>
        </div>
        <Pill tone="brand">{ui.pending}</Pill>
      </div>
      <Chain items={[ui.fees, ui.matter]} />
      <div className="ws-cell ws-stagger">
        <div className="ws-cell-value">{ui.legalFees}</div>
        <div className="ws-muted">{ui.billedTo}</div>
      </div>
      <div className="ws-row ws-row--focus ws-stagger">
        <Briefcase className="ws-ico" />
        <span>{ui.matter}</span>
      </div>
    </div>
  );
}

function SceneJuria({ ui }: { ui: ShowcaseUi }) {
  return (
    <div className="ws-body">
      <div className="ws-matter-head ws-stagger">
        <span className="ws-avatar ws-avatar--ai">
          <Sparkles className="w-3.5 h-3.5" />
        </span>
        <div>
          <div className="ws-matter-title">Juria</div>
          <div className="ws-muted">{ui.matter}</div>
        </div>
      </div>
      <Chain items={[ui.matter, ui.documents, "Juria"]} />
      <div className="ws-bubble ws-bubble--me ws-stagger">{ui.prompt}</div>
      <div className="ws-bubble ws-stagger">{ui.answer}</div>
      <div className="ws-sources ws-stagger">
        <div className="ws-kicker">{ui.sources}</div>
        <div className="ws-row">
          <FileText className="ws-ico" />
          <span className="truncate">{ui.docs[0]}</span>
        </div>
      </div>
      <div className="ws-ai-label">{ui.aiLabel}</div>
    </div>
  );
}

function SceneKnowledge({ ui }: { ui: ShowcaseUi }) {
  return (
    <div className="ws-body">
      <div className="ws-search ws-stagger">
        <Search className="ws-ico" />
        <span>{ui.searchQuery}</span>
      </div>
      <Chain items={[ui.matterDocs, ui.firmKnowledge, ui.search, ui.reusable]} />
      <div className="ws-rows ws-stagger">
        <div className="ws-row">
          <FileText className="ws-ico" />
          <div>
            <div>{ui.docs[0]}</div>
            <div className="ws-muted">{ui.matterDocs}</div>
          </div>
        </div>
        <div className="ws-row ws-row--focus">
          <FolderOpen className="ws-ico" />
          <div>
            <div>{ui.docs[3]}</div>
            <div className="ws-muted">{ui.firmKnowledge}</div>
          </div>
        </div>
        <div className="ws-row">
          <FolderOpen className="ws-ico" />
          <div>
            <div>{ui.docs[1]}</div>
            <div className="ws-muted">{ui.reusable}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SceneConnected({ ui }: { ui: ShowcaseUi }) {
  const ring = ui.network;
  return (
    <div className="ws-body ws-body--net">
      <div className="ws-net" aria-hidden>
        {ring.slice(0, 4).map((label, i) => (
          <span key={label} className={`ws-net__node ${i === 3 ? "ws-net__before-core" : ""}`}>
            {label}
          </span>
        ))}
        <div className="ws-net__core">
          JURE
          <span>{ring[8]}</span>
        </div>
        {ring.slice(4, 8).map((label) => (
          <span key={label} className="ws-net__node">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

const SCENES: Record<WorkspaceSceneId, React.FC<{ ui: ShowcaseUi }>> = {
  cases: SceneCases,
  client: SceneClient,
  calendar: SceneCalendar,
  documents: SceneDocuments,
  team: SceneTeam,
  tasks: SceneTasks,
  finance: SceneFinance,
  juria: SceneJuria,
  knowledge: SceneKnowledge,
  connected: SceneConnected,
};

const TITLES: Record<WorkspaceSceneId, keyof ShowcaseUi["nav"] | "cases"> = {
  cases: "cases",
  client: "clients",
  calendar: "calendar",
  documents: "library",
  team: "team",
  tasks: "cases",
  finance: "finance",
  juria: "juria",
  knowledge: "library",
  connected: "dashboard",
};

export const WorkspaceCanvas: React.FC<{
  scene: WorkspaceSceneId;
  ui: ShowcaseUi;
  reduced?: boolean;
}> = ({ scene, ui, reduced }) => {
  const Body = SCENES[scene];
  const active = navActive(scene);
  const titleKey = TITLES[scene];
  const title = ui.nav[titleKey as keyof ShowcaseUi["nav"]];

  return (
    <div className="ws-frame landing-app-frame" role="img" aria-label={`${ui.brand} — ${title}`}>
      <div className="ws-chrome">
        <span className="ws-brand">{ui.brand}</span>
        <span className="ws-chrome-title">{title}</span>
      </div>
      <div className="ws-shell">
        <nav className="ws-nav" aria-hidden>
          {NAV.map(({ key, icon: Icon, label }) => (
            <div
              key={key}
              className={`ws-nav__item ${key === active ? "is-current" : ""}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{ui.nav[label]}</span>
            </div>
          ))}
        </nav>
        <div className={`ws-scene ${reduced ? "is-reduced" : ""}`} key={scene}>
          <Body ui={ui} />
        </div>
      </div>
    </div>
  );
};
