const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assessDrift,
  assessExtraction,
  buildLiveSmokeSummary,
  getTargetConfigs,
  parseCookies
} = require("../scripts/live-smoke-utils");

test("parses cookie header input into Playwright cookies", () => {
  const cookies = parseCookies(
    "session_token=abc123; cf_clearance=xyz789",
    "https://chatgpt.com/c/example"
  );

  assert.deepEqual(cookies, [
    {
      name: "session_token",
      value: "abc123",
      domain: "chatgpt.com",
      path: "/",
      secure: true,
      sameSite: "Lax"
    },
    {
      name: "cf_clearance",
      value: "xyz789",
      domain: "chatgpt.com",
      path: "/",
      secure: true,
      sameSite: "Lax"
    }
  ]);
});

test("parses cookie JSON input and preserves cookie metadata", () => {
  const cookies = parseCookies(
    JSON.stringify([
      {
        name: "__Secure-1PSID",
        value: "token",
        domain: ".google.com",
        secure: true,
        sameSite: "None"
      }
    ]),
    "https://gemini.google.com/app/example"
  );

  assert.equal(cookies[0].domain, ".google.com");
  assert.equal(cookies[0].sameSite, "None");
});

test("builds skipped configs for missing live smoke targets", () => {
  const configs = getTargetConfigs({});
  assert.equal(configs.length, 3);
  assert.equal(configs[0].status, "skipped");
  assert.match(configs[0].skipReason, /SMOKE_CHATGPT_URL/);
});

test("fails live smoke assessment when expected authors are missing", () => {
  const assessment = assessExtraction(
    {
      minMessages: 2,
      requiredAuthors: ["You", "Gemini"]
    },
    {
      messageCount: 4,
      authors: ["You"]
    }
  );

  assert.equal(assessment.status, "failed");
  assert.match(assessment.failureReason, /Missing expected authors: Gemini/);
});

test("assessDrift flags strategy and source changes against baseline", () => {
  const target = { url: "https://chatgpt.com/share/abc", id: "chatgpt" };
  const baseline = {
    url: "https://chatgpt.com/share/abc",
    strategyId: "role-attributes",
    source: "dom",
    messageCount: 17,
    authors: ["You", "ChatGPT"]
  };

  const matched = assessDrift(
    target,
    {
      strategyId: "role-attributes",
      source: "dom",
      messageCount: 17,
      authors: ["ChatGPT", "You"]
    },
    baseline
  );
  assert.equal(matched.status, "matched");
  assert.deepEqual(matched.details, []);

  const drifted = assessDrift(
    target,
    {
      strategyId: "generic-fallback",
      source: "dom",
      messageCount: 12,
      authors: ["ChatGPT", "You"]
    },
    baseline
  );
  assert.equal(drifted.status, "drifted");
  assert.match(
    drifted.details[0],
    /strategy: baseline "role-attributes" -> live "generic-fallback"/
  );
  assert.match(drifted.details[1], /message count: baseline 17 -> live 12/);

  const noBaseline = assessDrift(
    target,
    { strategyId: "x", source: "dom", messageCount: 1, authors: [] },
    null
  );
  assert.equal(noBaseline.status, "no-baseline");
});

test("assessDrift ignores message count when live URL differs from baseline", () => {
  const baseline = {
    url: "https://chatgpt.com/share/baseline-conversation",
    strategyId: "role-attributes",
    source: "dom",
    messageCount: 17,
    authors: ["You", "ChatGPT"]
  };
  const result = assessDrift(
    { url: "https://chatgpt.com/share/different-conversation", id: "chatgpt" },
    { strategyId: "role-attributes", source: "dom", messageCount: 3, authors: ["You", "ChatGPT"] },
    baseline
  );
  assert.equal(result.status, "matched");
});

test("renders a DRIFT line with the changed fields", () => {
  const summary = buildLiveSmokeSummary([
    {
      displayName: "ChatGPT",
      status: "drifted",
      extraction: { messageCount: 12, source: "dom", strategyId: "generic-fallback" },
      drift: {
        status: "drifted",
        details: [
          'strategy: baseline "role-attributes" -> live "generic-fallback"',
          "message count: baseline 17 -> live 12"
        ]
      }
    }
  ]);
  assert.match(summary, /- Drifted: 1/);
  assert.match(
    summary,
    /- DRIFT ChatGPT: structure changed vs baseline \(source: dom, strategy: generic-fallback\)/
  );
  assert.match(summary, /strategy: baseline "role-attributes" -> live "generic-fallback"/);
});

test("renders live smoke summary with pass fail and skip counts", () => {
  const summary = buildLiveSmokeSummary(
    [
      {
        displayName: "ChatGPT",
        status: "passed",
        extraction: {
          messageCount: 8,
          source: "state",
          strategyId: "chatgpt-state"
        }
      },
      {
        displayName: "Gemini",
        status: "failed",
        failureReason: "Expected at least 2 messages but captured 0.",
        extraction: {
          source: "dom",
          strategyId: "combined"
        }
      },
      {
        displayName: "Perplexity",
        status: "skipped",
        skipReason: "SMOKE_PERPLEXITY_URL is not configured."
      }
    ],
    "1.11.0"
  );

  assert.match(summary, /- Version: 1.11.0/);
  assert.match(summary, /- Passed: 1/);
  assert.match(summary, /- Failed: 1/);
  assert.match(summary, /- Skipped: 1/);
  assert.match(summary, /PASS ChatGPT: 8 messages via state\/chatgpt-state/);
  assert.match(summary, /FAIL Gemini: Expected at least 2 messages but captured 0/);
  assert.match(summary, /SKIP Perplexity: SMOKE_PERPLEXITY_URL is not configured/);
});
