import React, { useState } from "react";

// ---------- design tokens ----------
const T = {
  ink: "#1A2238",
  inkSoft: "#4A5468",
  paper: "#F7F8F5",
  card: "#FFFFFF",
  line: "#E3E6E0",
  marker: "#FFD43B",
  teal: "#2E7D6B",
  tealSoft: "#E7F2EE",
  red: "#B6452C",
};

const fontStack = '-apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
const mono = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

// Highlighter swipe — the signature element
const Hi = ({ children }) => (
  <span
    style={{
      background: `linear-gradient(104deg, transparent 2%, ${T.marker} 4%, ${T.marker}E6 96%, transparent 98%)`,
      padding: "0 6px",
      margin: "0 -2px",
      borderRadius: 2,
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
    }}
  >
    {children}
  </span>
);

// ---------- API helper ----------
async function askOpenAI(messages, system, maxTokens = 1000) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system, maxTokens }),
  });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "OpenAI request failed");
  }

  return data.text || "";
}

function parseJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  return JSON.parse(clean.slice(start, end + 1));
}

const TOTAL_QUESTIONS = 4;
const FIRST_QUESTION =
  "Walk me through a typical week in your role. Which tasks keep coming back — the things you do every week, almost on autopilot?";

const INTERVIEW_SYSTEM = `You are an AI adoption coach interviewing an employee to find tasks in their real work that AI could take over or speed up. You will ask ${TOTAL_QUESTIONS} questions total. Question 1 has already been asked. Based on the transcript so far, ask ONE next question that digs into specifics: which recurring tasks involve reading, writing, summarizing, formatting, comparing, drafting, or copying information between tools; how long things take; what they dread. Be warm, plain-spoken, and concrete. Never explain AI. Respond ONLY with JSON, no markdown fences: {"nextQuestion": "..."}`;

const MAP_SYSTEM = `You are an AI adoption coach. Based on the interview transcript, identify the 3 best opportunities for this specific person to use an AI assistant (like ChatGPT or Claude) in their actual work. Rank by impact. Be honest: only include tasks AI genuinely helps with today. For each, write a starter prompt the person can paste into an AI chat tool and adapt — written in second person about THEIR task, with [PLACEHOLDERS] for things they'd fill in. Respond ONLY with JSON, no markdown fences, in exactly this shape:
{"tasks":[{"title":"short task name","rationale":"1-2 plain sentences on why AI fits this and what the person still owns","hoursPerWeek":2.5,"difficulty":"Start today|Needs practice|Needs setup","starterPrompt":"..."}],"fluencyTip":"one sentence: the single habit that will make this person better with AI this month"}`;

// ---------- small components ----------
const Dots = () => (
  <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: T.inkSoft,
          animation: `pulse 1.2s ${i * 0.2}s infinite ease-in-out`,
        }}
      />
    ))}
    <style>{`@keyframes pulse { 0%,100%{opacity:.25;transform:translateY(0)} 50%{opacity:1;transform:translateY(-2px)} }`}</style>
  </span>
);

const Eyebrow = ({ children }) => (
  <div
    style={{
      fontFamily: mono,
      fontSize: 11,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: T.inkSoft,
      marginBottom: 10,
    }}
  >
    {children}
  </div>
);

const Button = ({ children, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      fontFamily: fontStack,
      fontSize: 15,
      fontWeight: 600,
      color: disabled ? T.inkSoft : T.paper,
      background: disabled ? T.line : T.ink,
      border: "none",
      borderRadius: 8,
      padding: "12px 22px",
      cursor: disabled ? "default" : "pointer",
    }}
  >
    {children}
  </button>
);

// ---------- main ----------
export default function UseCaseDiscoveryCoach() {
  const [stage, setStage] = useState("intro"); // intro | interview | generating | map
  const [role, setRole] = useState("");
  const [qa, setQa] = useState([]); // {q, a}
  const [currentQ, setCurrentQ] = useState(FIRST_QUESTION);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [map, setMap] = useState(null);
  const [copied, setCopied] = useState(-1);

  const transcript = (pairs) =>
    `Role: ${role}\n` +
    pairs.map((p, i) => `Q${i + 1}: ${p.q}\nA${i + 1}: ${p.a}`).join("\n");

  async function submitAnswer() {
    if (!answer.trim() || loading) return;
    setError("");
    const pairs = [...qa, { q: currentQ, a: answer.trim() }];
    setQa(pairs);
    setAnswer("");

    if (pairs.length >= TOTAL_QUESTIONS) {
      generateMap(pairs);
      return;
    }
    setLoading(true);
    try {
      const text = await askOpenAI(
        [
          {
            role: "user",
            content: `Interview so far:\n${transcript(pairs)}\n\nAsk question ${pairs.length + 1} of ${TOTAL_QUESTIONS}.`,
          },
        ],
        INTERVIEW_SYSTEM,
      );
      setCurrentQ(parseJSON(text).nextQuestion);
    } catch (e) {
      setError(e.message || "Couldn't reach the coach. Try sending your answer again.");
      setQa(qa); // roll back
      setAnswer(answer);
    }
    setLoading(false);
  }

  async function generateMap(pairs) {
    setStage("generating");
    try {
      const text = await askOpenAI(
        [{ role: "user", content: `Interview transcript:\n${transcript(pairs)}` }],
        MAP_SYSTEM,
        1000,
      );
      setMap(parseJSON(text));
      setStage("map");
    } catch (e) {
      setError(e.message || "Generating your map failed. You can retry.");
      setStage("interview");
    }
  }

  function copyPrompt(i, prompt) {
    navigator.clipboard?.writeText(prompt);
    setCopied(i);
    setTimeout(() => setCopied(-1), 1600);
  }

  const shell = {
    minHeight: "100vh",
    background: T.paper,
    fontFamily: fontStack,
    color: T.ink,
    display: "flex",
    justifyContent: "center",
    padding: "48px 20px 80px",
  };
  const col = { width: "100%", maxWidth: 680 };

  // ---------- intro ----------
  if (stage === "intro")
    return (
      <div style={shell}>
        <div style={col}>
          <Eyebrow>AI use-case discovery · 5 minutes · {TOTAL_QUESTIONS} questions</Eyebrow>
          <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 18px" }}>
            Find the work in <Hi>your week</Hi> that AI should be doing.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: T.inkSoft, maxWidth: 540, margin: "0 0 34px" }}>
            No training videos. The coach asks about your actual job, then hands you a
            personal map: your top three automatable tasks, each with a starter prompt
            you can use today.
          </p>
          <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
              What's your role? A few words is enough.
            </label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && role.trim() && setStage("interview")}
              placeholder="e.g. Regional sales manager, HR business partner, paralegal…"
              style={{
                width: "100%",
                boxSizing: "border-box",
                fontFamily: fontStack,
                fontSize: 16,
                padding: "12px 14px",
                border: `1px solid ${T.line}`,
                borderRadius: 8,
                marginBottom: 16,
                outline: "none",
                background: T.paper,
                color: T.ink,
              }}
            />
            <Button onClick={() => setStage("interview")} disabled={!role.trim()}>
              Start the interview
            </Button>
          </div>
          <p style={{ fontFamily: mono, fontSize: 12, color: T.inkSoft, marginTop: 22 }}>
            Demo prototype · answers aren't stored
          </p>
        </div>
      </div>
    );

  // ---------- interview ----------
  if (stage === "interview")
    return (
      <div style={shell}>
        <div style={col}>
          <Eyebrow>
            Question {qa.length + 1} of {TOTAL_QUESTIONS}
          </Eyebrow>
          <div style={{ display: "flex", gap: 6, marginBottom: 26 }}>
            {Array.from({ length: TOTAL_QUESTIONS }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 2,
                  background: i < qa.length ? T.marker : i === qa.length ? T.ink : T.line,
                }}
              />
            ))}
          </div>

          {qa.map((p, i) => (
            <div key={i} style={{ marginBottom: 18, opacity: 0.55 }}>
              <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>{p.q}</p>
              <p style={{ fontSize: 14, color: T.inkSoft, margin: 0 }}>{p.a}</p>
            </div>
          ))}

          <div style={{ background: T.card, border: `1px solid ${T.line}`, borderRadius: 12, padding: 24 }}>
            {loading ? (
              <p style={{ fontSize: 16, color: T.inkSoft, margin: 0 }}>
                Thinking about your answer <Dots />
              </p>
            ) : (
              <>
                <p style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4, margin: "0 0 16px" }}>{currentQ}</p>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={4}
                  placeholder="Plain language is perfect — describe it like you would to a colleague."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    fontFamily: fontStack,
                    fontSize: 15,
                    lineHeight: 1.5,
                    padding: "12px 14px",
                    border: `1px solid ${T.line}`,
                    borderRadius: 8,
                    marginBottom: 14,
                    outline: "none",
                    resize: "vertical",
                    background: T.paper,
                    color: T.ink,
                  }}
                />
                <Button onClick={submitAnswer} disabled={!answer.trim()}>
                  {qa.length + 1 === TOTAL_QUESTIONS ? "Finish and build my map" : "Send answer"}
                </Button>
              </>
            )}
            {error && (
              <p style={{ fontSize: 14, color: T.red, marginTop: 12, marginBottom: 0 }}>{error}</p>
            )}
          </div>
        </div>
      </div>
    );

  // ---------- generating ----------
  if (stage === "generating")
    return (
      <div style={shell}>
        <div style={{ ...col, textAlign: "center", paddingTop: 90 }}>
          <Eyebrow>Building your map</Eyebrow>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 10px" }}>
            Going through <Hi>your week</Hi>, task by task <Dots />
          </h2>
          <p style={{ fontSize: 15, color: T.inkSoft }}>Ranking what's worth automating first.</p>
        </div>
      </div>
    );

  // ---------- map ----------
  return (
    <div style={shell}>
      <div style={col}>
        <Eyebrow>Your automation map · {role}</Eyebrow>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          Three places AI fits <Hi>your actual job</Hi>
        </h1>
        <p style={{ fontSize: 15, color: T.inkSoft, margin: "0 0 30px" }}>
          Ranked by impact. Each comes with a starter prompt — copy it into your AI
          assistant and adapt the [placeholders].
        </p>

        {(map?.tasks || []).map((t, i) => (
          <div
            key={i}
            style={{
              background: T.card,
              border: `1px solid ${T.line}`,
              borderLeft: `5px solid ${T.marker}`,
              borderRadius: 12,
              padding: "22px 24px",
              marginBottom: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontFamily: mono, fontSize: 13, color: T.inkSoft }}>0{i + 1}</span>
              <h3 style={{ fontSize: 19, fontWeight: 700, margin: 0, flex: 1, minWidth: 180 }}>{t.title}</h3>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 12,
                  background: T.tealSoft,
                  color: T.teal,
                  borderRadius: 6,
                  padding: "4px 8px",
                }}
              >
                ~{t.hoursPerWeek} hrs/week back
              </span>
              <span style={{ fontFamily: mono, fontSize: 12, color: T.inkSoft, border: `1px solid ${T.line}`, borderRadius: 6, padding: "4px 8px" }}>
                {t.difficulty}
              </span>
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.55, color: T.inkSoft, margin: "10px 0 14px" }}>{t.rationale}</p>
            <div style={{ background: T.ink, borderRadius: 8, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.12em", color: "#9AA3B5", textTransform: "uppercase" }}>
                  Starter prompt
                </span>
                <button
                  onClick={() => copyPrompt(i, t.starterPrompt)}
                  style={{
                    fontFamily: mono,
                    fontSize: 12,
                    color: copied === i ? T.marker : "#C9CFDB",
                    background: "transparent",
                    border: `1px solid ${copied === i ? T.marker : "#3A4358"}`,
                    borderRadius: 6,
                    padding: "4px 10px",
                    cursor: "pointer",
                  }}
                >
                  {copied === i ? "Copied" : "Copy"}
                </button>
              </div>
              <p style={{ fontFamily: mono, fontSize: 13, lineHeight: 1.6, color: "#EDEFF4", margin: 0, whiteSpace: "pre-wrap" }}>
                {t.starterPrompt}
              </p>
            </div>
          </div>
        ))}

        {map?.fluencyTip && (
          <p style={{ fontSize: 15, lineHeight: 1.6, margin: "26px 0 0" }}>
            <strong>One habit to build this month:</strong> {map.fluencyTip}
          </p>
        )}

        <div style={{ borderTop: `1px solid ${T.line}`, marginTop: 34, paddingTop: 18 }}>
          <p style={{ fontFamily: mono, fontSize: 12, color: T.inkSoft, lineHeight: 1.7, margin: 0 }}>
            Enterprise view (concept): maps roll up per team, giving managers a live picture of
            where AI fits, hours reclaimed, and which teams need enablement next.
          </p>
          <button
            onClick={() => {
              setStage("intro");
              setQa([]);
              setMap(null);
              setRole("");
              setCurrentQ(FIRST_QUESTION);
            }}
            style={{
              marginTop: 16,
              fontFamily: fontStack,
              fontSize: 14,
              color: T.ink,
              background: "transparent",
              border: `1px solid ${T.line}`,
              borderRadius: 8,
              padding: "9px 16px",
              cursor: "pointer",
            }}
          >
            Run it again
          </button>
        </div>
      </div>
    </div>
  );
}
