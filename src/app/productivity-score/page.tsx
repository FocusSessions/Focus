"use client";

import { ArrowLeft, Zap, ChevronDown } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

const RANKS = [
  { range: "0â€“99", name: "Novice", color: "#9B9B8C", pct: 10 },
  { range: "100â€“249", name: "Builder", color: "#84936C", pct: 25 },
  { range: "250â€“449", name: "Craftsman", color: "#A07B52", pct: 45 },
  { range: "450â€“699", name: "Deep Worker", color: "#7A5C3A", pct: 70 },
  { range: "700â€“899", name: "Master", color: "#5C3D24", pct: 90 },
  { range: "900â€“1000", name: "Elite", color: "#2C1810", pct: 100 },
];

const V_REF = [
  { h: "100 hrs", pts: "~110 pts", pct: 22 },
  { h: "300 hrs", pts: "~265 pts", pct: 53 },
  { h: "700 hrs", pts: "~415 pts", pct: 83 },
  { h: "1,500 hrs", pts: "~490 pts", pct: 98 },
];

function Callout({ question, children }: { question: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        className="flex w-full items-start justify-between gap-2 text-left hover:opacity-80 transition-opacity"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-[13px] font-semibold leading-snug text-brown">{question}</span>
        <ChevronDown className={`mt-0.5 h-4 w-4 flex-shrink-0 text-brown-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] mt-2 opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
      >
        <div className="overflow-hidden">
          <div className="text-[13px] leading-relaxed text-brown-muted pb-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function RefTile({ h, pts, pct }: { h: string; pts: string; pct: number }) {
  return (
    <div className="rounded-xl border border-[#8A9282]/20 bg-[#8A9282]/5 px-3.5 py-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-xs text-brown-muted">{h}</span>
        <span className="text-[13px] font-semibold text-brown">{pts}</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-[#8A9282]/20">
        <div className="h-full rounded-full bg-[#8A9282]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ComponentCard({ letter, name, maxPts, accentColor, formula, children }: {
  letter: string; name: string; maxPts: number; accentColor: string; formula: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-border">
      <div className="h-1 w-full" style={{ backgroundColor: accentColor }} />
      <div className="p-6 md:p-7">
        <div className="mb-4 flex items-center gap-4">
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl font-serif text-xl text-white"
            style={{ backgroundColor: accentColor }}
          >
            {letter}
          </div>
          <div className="flex-1">
            <h2 className="font-serif text-xl leading-none text-brown">{name}</h2>
            <div className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-brown-muted">
              Max {maxPts} pts
            </div>
          </div>
          <div className="font-serif text-3xl text-brown/15">{maxPts}</div>
        </div>
        <div className="mb-4 rounded-xl border border-border bg-brown/5 px-4 py-3 font-mono text-sm tracking-wide text-brown">
          {formula}
        </div>
        <div className="space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ProductivityScorePage() {
  return (
    <div className="min-h-screen bg-cream pb-20 pt-8">
      <div className="mx-auto max-w-[680px] px-6">
        <Link
          href="/profile"
          className="group mb-8 inline-flex items-center gap-2 text-[13px] font-medium text-brown-muted transition-colors hover:text-brown"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Profile
        </Link>

        <h1 className="mb-3 font-serif text-[26px] leading-[1.2] text-brown md:text-[34px]">
          How Your Productivity<br />Score Is Calculated
        </h1>
        <p className="mb-10 text-[15px] leading-relaxed text-brown-muted">
          Your score goes up to 1,000. it&apos;s built from three parts, and no single thing (like just working long hours) will max out your score on its own.
        </p>

        <div className="flex flex-col gap-5">
          {/* Hero Card */}
          <div className="rounded-[18px] bg-[#3A2920] p-7">
            <div className="mb-5 font-mono text-[15px] tracking-[0.02em] text-[#F5F0EB] md:text-[20px]">
              P = min(1000, <span style={{ color: "#BEC9B0" }}>500</span>V + <span style={{ color: "#A4BC8C" }}>400</span>K + <span style={{ color: "#D4A87A" }}>100</span>Q)
            </div>

            <div className="mb-4 flex h-[7px] w-full overflow-hidden rounded">
              <div className="h-full bg-[#8A9282]" style={{ flex: 5 }} />
              <div className="h-full bg-[#7A8B64]" style={{ flex: 4 }} />
              <div className="h-full bg-[#A07B52]" style={{ flex: 1 }} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-surface/5 p-3">
                <div className="mb-1 font-serif text-[17px] text-[#8A9282]">V</div>
                <div className="leading-none text-[22px] font-semibold text-[#F5F0EB]">500</div>
                <div className="mt-1 text-[11px] text-[#F5F0EB]/50">Hours</div>
              </div>
              <div className="rounded-xl bg-surface/5 p-3">
                <div className="mb-1 font-serif text-[17px] text-[#7A8B64]">K</div>
                <div className="leading-none text-[22px] font-semibold text-[#F5F0EB]">400</div>
                <div className="mt-1 text-[11px] text-[#F5F0EB]/50">Consistency</div>
              </div>
              <div className="rounded-xl bg-surface/5 p-3">
                <div className="mb-1 font-serif text-[17px] text-[#A07B52]">Q</div>
                <div className="leading-none text-[22px] font-semibold text-[#F5F0EB]">100</div>
                <div className="mt-1 text-[11px] text-[#F5F0EB]/50">Depth</div>
              </div>
            </div>
          </div>

          {/* V Card */}
          <ComponentCard
            letter="V"
            name="Hours"
            maxPts={500}
            accentColor="#8A9282"
            formula={<span>V = 1 &minus; e<sup className="ml-0.5 text-xs">&minus;H / 400</sup></span>}
          >
            <p className="text-[14px] leading-relaxed text-brown-muted">
              This tracks your total lifetime focus hours. You get the most points when you first startâ€”your early hours boost your score fast. After about 400 hours, the points slow down, rewarding long-term dedication.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {V_REF.map(r => <RefTile key={r.h} h={r.h} pts={r.pts} pct={r.pct} />)}
            </div>
          </ComponentCard>

          {/* K Card */}
          <ComponentCard
            letter="K"
            name="Consistency"
            maxPts={400}
            accentColor="#7A8B64"
            formula={<span>K = r<sub className="text-[10px]">30</sub><sup className="text-xs">0.6</sup> &times; r<sub className="text-[10px]">90</sub><sup className="text-xs">0.4</sup></span>}
          >
            <p className="text-[14px] leading-relaxed text-brown-muted">
              This looks at how often you&apos;ve logged a session in the last 30 and 90 days. Recent days matter more. You can earn up to 400 points here.
            </p>
            <div className="mt-3 flex gap-2">
              <div className="flex-[6] rounded-xl border border-[#7A8B64]/20 bg-[#7A8B64]/5 p-2.5 text-center">
                <div className="text-[19px] font-semibold leading-none text-[#7A8B64]">60%</div>
                <div className="mt-1 text-[11px] text-brown-muted">30-day window</div>
              </div>
              <div className="flex-[4] rounded-xl border border-border bg-brown/5 p-2.5 text-center">
                <div className="text-[19px] font-semibold leading-none text-brown-muted">40%</div>
                <div className="mt-1 text-[11px] text-brown-muted">90-day window</div>
              </div>
            </div>
            <div className="mt-1">
              <Callout question="Why no streaks?">
                Streaks are punishingâ€”if you miss one day, you go back to zero. We don&apos;t do that here. Missing a day just lowers your 30-day average slightly. Just jump back in and it recovers. (Though if you don&apos;t focus for 30 days straight, this part of your score will reset).
              </Callout>
              <Callout question="What about new accounts?">
                If your account is only 15 days old, we only grade you on those 15 days. You can hit a perfect consistency score just like someone who has been here for years.
              </Callout>
              <Callout question="When does the day reset?">
                Days reset at 4am, not midnight. So if you start a session at 11:30 PM, the whole thing counts toward today.
              </Callout>
              <Callout question="I took a month off. Where did my points go?">
                If you don&apos;t log anything for a full 30 days, your consistency score drops to zero. But don&apos;t worryâ€”as soon as you start logging sessions again, the points will quickly build back up.
              </Callout>
              <Callout question="Why did my score drop if I worked yesterday?">
                it&apos;s a rolling window. If you had a really good streak exactly 31 days ago, those days are now falling out of your 30-day window, which can cause a small dip.
              </Callout>
              <Callout question="I imported historical data. Why didn't my consistency score go up?">
                Consistency only looks at the last 30 and 90 days. Older sessions will boost your Hours and Depth scores, but they won&apos;t change your current consistency.
              </Callout>
            </div>
          </ComponentCard>

          {/* Q Card */}
          <ComponentCard
            letter="Q"
            name="Session Depth"
            maxPts={100}
            accentColor="#A07B52"
            formula={<span>Q = 1 &minus; e<sup className="ml-0.5 text-xs">&minus;avg / 35</sup></span>}
          >
            <p className="text-[14px] leading-relaxed text-brown-muted">
              This tracks your average session length. For example, averaging 35 minutes per session gets you about 60% of the points, while 70-minute sessions get you closer to 85%.
            </p>
            <div className="mt-3 flex gap-2">
              <div className="flex-1 rounded-xl border border-[#A07B52]/20 bg-[#A07B52]/5 p-2.5 text-center">
                <div className="text-[12px] font-semibold text-[#A07B52]">Higher Q</div>
                <div className="mt-0.5 text-[12px] text-brown-muted">5 Ã— 2hr blocks</div>
              </div>
              <div className="flex-1 rounded-xl border border-border bg-brown/5 p-2.5 text-center">
                <div className="text-[12px] font-semibold text-brown-muted">Lower Q</div>
                <div className="mt-0.5 text-[12px] text-brown-muted">60 Ã— 10min stints</div>
              </div>
            </div>
            <p className="mt-3 text-[13px] italic text-sage">
              We cap this at 100 points because it&apos;s just a check to make sure you aren&apos;t spamming 2-minute sessions. As long as you&apos;re working in solid blocks, you&apos;ll naturally max this out.
            </p>
            <div className="mt-1">
              <Callout question="Can I raise Q without logging more total hours?">
                Your depth score is just your average session length. The best way to raise it is to work in longer, uninterrupted blocks instead of breaking your work into tiny pieces.
              </Callout>
              <Callout question="Does it matter how many sessions I log, or just total hours?">
                Both matter! Your total hours boost your &apos;Hours&apos; score, showing up every day boosts your &apos;Consistency&apos; score, and doing longer sessions boosts your &apos;Depth&apos; score.
              </Callout>
            </div>
          </ComponentCard>

          {/* How Combine */}
          <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border md:p-8">
            <h2 className="mb-4 font-serif text-xl text-brown">How the three combine</h2>
            <div className="mb-4 rounded-xl border border-border bg-brown/5 px-4 py-3 font-mono text-sm tracking-wide text-brown">
              P = min(1000, 500V + 400K + 100Q)
            </div>
            <p className="text-[14px] leading-relaxed text-brown-muted">
              Since each part has a maximum cap, you can&apos;t just grind hours to reach the top. Hitting 900+ means you&apos;ve put in the time, showed up consistently, and worked in solid blocks.
            </p>
            <div className="mt-4 pt-1 border-t border-border">
              <Callout question="Can my score ever reach exactly 1000?">
                Technically, no. The math treats 1000 as a physical limit that you can get infinitely close to, but never quite touch. You can definitely reach the high 900s if you stick with it for years, though!
              </Callout>
              <Callout question="Is there a shortcut to Elite?">
                Nope. You need roughly 700+ total hours, a near-perfect 90-day streak, and good average session lengths to break 900. it&apos;s meant to take real time and dedication to reach.
              </Callout>
            </div>
          </div>

          {/* Ranks */}
          <div className="rounded-2xl bg-surface p-6 shadow-sm ring-1 ring-border md:p-8">
            <h2 className="mb-5 font-serif text-xl text-brown">The Ranks</h2>
            <div className="flex flex-col gap-2.5">
              {RANKS.map((r) => (
                <div key={r.name} className="flex items-center gap-3">
                  <span className="w-14 flex-shrink-0 text-right font-mono text-[11px] text-brown-muted">{r.range}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-brown/5">
                    <div className="h-full rounded transition-all duration-500 ease-out" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
                  </div>
                  <span className="w-[85px] flex-shrink-0 text-right text-[13px] font-semibold" style={{ color: r.color }}>{r.name}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[13px] leading-relaxed text-brown-muted">
              Most people naturally settle somewhere around Builder or Deep Worker. Hitting Master takes a few months of real dedication, and Elite is kept intentionally rare.
            </p>
            <div className="mt-4 pt-1 border-t border-border">
              <Callout question="Why does my score feel slow to move at first?">
                Your score actually grows fastest when you first start! The illusion of slowness comes from the rank bands themselves. The early ranks (like Novice and Builder) cover huge 100-150 point gaps. you&apos;re making fast progress behind the scenes, and once you hit the higher ranks, they&apos;ll start changing much quicker.
              </Callout>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

