import React from "react";
import {
  Sparkles,
  Briefcase,
  BookOpen,
  CalendarClock,
  MessageSquare,
  Landmark,
  KeyRound,
  Globe,
  Users,
  FileText,
  Check,
  Building2,
  Plug,
  ShieldCheck,
  ListChecks,
  Search,
  History,
  ScrollText,
  Lock,
  AtSign,
  Share2,
} from "lucide-react";

export type FeatureSceneId =
  | "juria"
  | "matters"
  | "documents"
  | "calendar"
  | "chat"
  | "finance"
  | "roles"
  | "rtl"
  | "collab"
  | "portal"
  | "integrations"
  | "sso"
  | "automations"
  | "semantic"
  | "versions"
  | "audit"
  | "encryption"
  | "mentions"
  | "sharing";

/** Compact product-aligned scene for the media half of a features card. */
export function FeatureScene({ id }: { id: FeatureSceneId }) {
  switch (id) {
    case "juria":
      return (
        <div className="fd-scene fd-scene--juria">
          <div className="fd-scene__chip">
            <Sparkles className="fd-scene__icon" />
            JURIA
          </div>
          <div className="fd-scene__bubble fd-scene__bubble--bot">
            Draft clause ready for review
          </div>
          <div className="fd-scene__bubble fd-scene__bubble--user">Validate with counsel</div>
        </div>
      );
    case "matters":
      return (
        <div className="fd-scene fd-scene--matters">
          <div className="fd-scene__row">
            <Briefcase className="fd-scene__icon" />
            <span>Atlas · open</span>
          </div>
          <div className="fd-scene__row fd-scene__row--muted">
            <FileText className="fd-scene__icon" />
            <span>12 documents</span>
          </div>
          <div className="fd-scene__row fd-scene__row--muted">
            <Users className="fd-scene__icon" />
            <span>3 assigned</span>
          </div>
        </div>
      );
    case "documents":
      return (
        <div className="fd-scene fd-scene--docs">
          <div className="fd-scene__doc">
            <BookOpen className="fd-scene__icon" />
            <div>
              <strong>Contract.pdf</strong>
              <span>Litigation · tagged</span>
            </div>
          </div>
          <div className="fd-scene__doc fd-scene__doc--ghost">
            <FileText className="fd-scene__icon" />
            <div>
              <strong>Memo.docx</strong>
              <span>Preview ready</span>
            </div>
          </div>
        </div>
      );
    case "calendar":
      return (
        <div className="fd-scene fd-scene--cal">
          <div className="fd-scene__cal-head">
            <CalendarClock className="fd-scene__icon" />
            <span>This week</span>
          </div>
          <div className="fd-scene__cal-grid">
            {["M", "T", "W", "T", "F"].map((d) => (
              <span key={d} className="fd-scene__cal-day">
                {d}
              </span>
            ))}
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={`fd-scene__cal-cell${n === 3 ? " fd-scene__cal-cell--hot" : ""}`}
              >
                {n + 10}
              </span>
            ))}
          </div>
        </div>
      );
    case "chat":
      return (
        <div className="fd-scene fd-scene--chat">
          <div className="fd-scene__msg">
            <MessageSquare className="fd-scene__icon" />
            <span>Hearing prep?</span>
          </div>
          <div className="fd-scene__msg fd-scene__msg--reply">Yes — sharing notes</div>
          <div className="fd-scene__status">
            <span className="fd-scene__dot" />
            Live · 2 on call
          </div>
        </div>
      );
    case "finance":
      return (
        <div className="fd-scene fd-scene--finance">
          <div className="fd-scene__kpi">
            <Landmark className="fd-scene__icon" />
            <div>
              <span>Collected</span>
              <strong>MAD 48k</strong>
            </div>
          </div>
          <div className="fd-scene__bars" aria-hidden>
            <i style={{ height: "42%" }} />
            <i style={{ height: "68%" }} />
            <i style={{ height: "55%" }} />
            <i style={{ height: "88%" }} />
          </div>
        </div>
      );
    case "roles":
      return (
        <div className="fd-scene fd-scene--roles">
          {["Owner", "Admin", "Lawyer"].map((role, i) => (
            <div key={role} className="fd-scene__role">
              <KeyRound className="fd-scene__icon" />
              <span>{role}</span>
              {i === 0 ? <Check className="fd-scene__check" /> : null}
            </div>
          ))}
        </div>
      );
    case "rtl":
      return (
        <div className="fd-scene fd-scene--rtl" dir="ltr">
          <div className="fd-scene__lang">
            <Globe className="fd-scene__icon" />
            <span>FR</span>
            <span>EN</span>
            <span className="fd-scene__lang--active">AR</span>
          </div>
          <div className="fd-scene__rtl-line" dir="rtl">
            مساحة العمل جاهزة
          </div>
          <div className="fd-scene__rtl-line fd-scene__rtl-line--muted">Workspace ready</div>
        </div>
      );
    case "collab":
      return (
        <div className="fd-scene fd-scene--collab">
          <div className="fd-scene__avatars" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <div className="fd-scene__msg fd-scene__msg--reply">Shared with the team</div>
          <div className="fd-scene__status">
            <Users className="fd-scene__icon" />
            Chat · calls · alerts
          </div>
        </div>
      );
    case "portal":
      return (
        <div className="fd-scene">
          <div className="fd-scene__chip">
            <Building2 className="fd-scene__icon" />
            Client
          </div>
          <div className="fd-scene__row">
            <Briefcase className="fd-scene__icon" />
            <span>Matter status</span>
          </div>
          <div className="fd-scene__row fd-scene__row--muted">
            <FileText className="fd-scene__icon" />
            <span>Shared files</span>
          </div>
        </div>
      );
    case "integrations":
      return (
        <div className="fd-scene fd-scene--integrations">
          <div className="fd-scene__chip">
            <Plug className="fd-scene__icon" />
            Connect
          </div>
          <div className="fd-scene__role">
            <span className="fd-scene__tile-mark">Dr</span>
            <span>Drive</span>
            <Check className="fd-scene__check" />
          </div>
          <div className="fd-scene__role">
            <span className="fd-scene__tile-mark">Es</span>
            <span>E-sign</span>
            <Check className="fd-scene__check" />
          </div>
          <div className="fd-scene__role">
            <span className="fd-scene__tile-mark">{"{}"}</span>
            <span>API</span>
            <Check className="fd-scene__check" />
          </div>
        </div>
      );
    case "sso":
      return (
        <div className="fd-scene">
          <div className="fd-scene__chip">
            <ShieldCheck className="fd-scene__icon" />
            SSO
          </div>
          <div className="fd-scene__bubble">Firm directory</div>
          <div className="fd-scene__status">
            <KeyRound className="fd-scene__icon" />
            One login
          </div>
        </div>
      );
    case "automations":
      return (
        <div className="fd-scene">
          <div className="fd-scene__chip">
            <ListChecks className="fd-scene__icon" />
            Flow
          </div>
          <div className="fd-scene__row">
            <Check className="fd-scene__check" />
            <span>Intake checklist</span>
          </div>
          <div className="fd-scene__row fd-scene__row--muted">
            <Check className="fd-scene__check" />
            <span>Hearing prep</span>
          </div>
        </div>
      );
    case "semantic":
      return (
        <div className="fd-scene">
          <div className="fd-scene__chip">
            <Search className="fd-scene__icon" />
            Search
          </div>
          <div className="fd-scene__bubble">Find by meaning…</div>
          <div className="fd-scene__row fd-scene__row--muted">
            <FileText className="fd-scene__icon" />
            <span>3 related docs</span>
          </div>
        </div>
      );
    case "versions":
      return (
        <div className="fd-scene fd-scene--versions">
          <div className="fd-scene__doc">
            <FileText className="fd-scene__icon" />
            <div>
              <strong>Contract.pdf</strong>
              <span>v3 · Current</span>
            </div>
          </div>
          <div className="fd-scene__doc fd-scene__doc--ghost">
            <History className="fd-scene__icon" />
            <div>
              <strong>v2 · Yesterday</strong>
              <span>Restore</span>
            </div>
          </div>
          <div className="fd-scene__status">Compare versions</div>
        </div>
      );
    case "audit":
      return (
        <div className="fd-scene">
          <div className="fd-scene__chip">
            <ScrollText className="fd-scene__icon" />
            Audit
          </div>
          <div className="fd-scene__row">
            <span>Export opened</span>
          </div>
          <div className="fd-scene__row fd-scene__row--muted">
            <span>Role changed</span>
          </div>
        </div>
      );
    case "encryption":
      return (
        <div className="fd-scene">
          <div className="fd-scene__chip">
            <Lock className="fd-scene__icon" />
            At rest
          </div>
          <div className="fd-scene__bubble">Encrypted storage</div>
          <div className="fd-scene__status">
            <ShieldCheck className="fd-scene__icon" />
            Firm isolation
          </div>
        </div>
      );
    case "mentions":
      return (
        <div className="fd-scene">
          <div className="fd-scene__chip">
            <AtSign className="fd-scene__icon" />
            Mention
          </div>
          <div className="fd-scene__msg">
            <span>@Sara review this clause</span>
          </div>
          <div className="fd-scene__msg fd-scene__msg--reply">Noted — on it</div>
        </div>
      );
    case "sharing":
      return (
        <div className="fd-scene fd-scene--sharing">
          <div className="fd-scene__doc">
            <Share2 className="fd-scene__icon" />
            <div>
              <strong>Brief.pdf</strong>
              <span>External link</span>
            </div>
          </div>
          <div className="fd-scene__share-link">
            <Lock className="fd-scene__icon" />
            <span>jure.app/s/brief…</span>
          </div>
          <div className="fd-scene__row">
            <Users className="fd-scene__icon" />
            <span>View only · 7 days</span>
          </div>
        </div>
      );
    default:
      return null;
  }
}
