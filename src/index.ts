import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getInput, info, setFailed, setOutput, warning } from "@actions/core";
// The renderer is a build-time dependency: esbuild bundles it into dist/index.js,
// so the action does no install at run time and the action tag pins the version.
import { api, topLangs, pin, wakatime, gist, CardConfig } from "@stats-forge/api";
import type { ApiResult } from "@stats-forge/api";

type CardName = "stats" | "top-langs" | "pin" | "wakatime" | "gist";
type Handler = (
  query: Record<string, string>,
  config: CardConfig,
) => Promise<ApiResult>;

const HANDLERS: Record<CardName, Handler> = {
  stats: api,
  "top-langs": topLangs,
  pin,
  wakatime,
  gist,
};

/** The option each card cannot render without. */
const REQUIRED_OPTION: Record<CardName, string> = {
  stats: "username",
  "top-langs": "username",
  wakatime: "username",
  pin: "repo",
  gist: "id",
};

const isCardName = (value: string): value is CardName =>
  Object.hasOwn(HANDLERS, value);

/**
 * @param options Raw option values from JSON input.
 * @returns Options with every value coerced to the string a query string would yield.
 */
const normalizeOptions = (
  options: Record<string, unknown>,
): Record<string, string> => {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(options)) {
    if (value === null || value === undefined) {
      continue;
    }
    normalized[key] = Array.isArray(value) ? value.join(",") : String(value);
  }
  return normalized;
};

/**
 * Parse the `options` input, which is either a query string or a JSON object.
 *
 * @param value Raw `options` input.
 * @returns Parsed options.
 * @throws {Error} If the value starts with `{` but is not valid JSON.
 */
const parseOptions = (value: string): Record<string, string> => {
  if (!value) {
    return {};
  }
  const trimmed = value.trim();

  if (trimmed.startsWith("{")) {
    try {
      return normalizeOptions(JSON.parse(trimmed) as Record<string, unknown>);
    } catch {
      throw new Error("Invalid JSON in options.");
    }
  }

  const options: Record<string, string> = {};
  const query = trimmed.startsWith("?") ? trimmed.slice(1) : trimmed;
  for (const [key, value] of new URLSearchParams(query).entries()) {
    // A repeated key is how the query-string form expresses a list.
    const existing = options[key];
    options[key] = existing === undefined ? value : `${existing},${value}`;
  }
  return options;
};

/**
 * @param card Card being rendered.
 * @param options Parsed options, mutated to fill in a default username.
 * @param repoOwner `GITHUB_REPOSITORY_OWNER`, used as the username default.
 * @throws {Error} If the card's required option is missing.
 */
const validateOptions = (
  card: CardName,
  options: Record<string, string>,
  repoOwner: string | undefined,
): void => {
  if (options["username"] === undefined && repoOwner !== undefined) {
    options["username"] = repoOwner;
    warning("username not provided; defaulting to repository owner.");
  }
  const required = REQUIRED_OPTION[card];
  if (options[required] === undefined) {
    throw new Error(`${required} is required for the ${card} card.`);
  }
};

const run = async (): Promise<void> => {
  if (getInput("core_version")) {
    warning(
      "`core_version` is ignored: the renderer is bundled into this action. " +
        "Pin a version by using a released action tag, e.g. @v1.2.3.",
    );
  }

  const card = getInput("card", { required: true }).toLowerCase();
  if (!isCardName(card)) {
    throw new Error(
      `Unsupported card type: ${card}. Expected one of ${Object.keys(HANDLERS).join(", ")}.`,
    );
  }

  const token = getInput("token");
  const config = new CardConfig({
    pats: token ? [{ name: "action input `token`", value: token }] : [],
  });

  const options = parseOptions(getInput("options"));
  validateOptions(card, options, process.env["GITHUB_REPOSITORY_OWNER"]);

  const result = await HANDLERS[card](options, config);

  // The renderer never throws on a data-fetch error; it returns a `status` starting
  // with "error" plus a "Something went wrong" SVG. Fail before writing, so a broken
  // card is never committed over a good one.
  if (/^(true|1|yes)$/i.test(getInput("fail_on_error")) && result.status.startsWith("error")) {
    throw new Error(`Card generation failed while fetching data (${result.status}).`);
  }
  if (!result.content) {
    throw new Error("Card renderer returned empty output.");
  }

  const outputPath = getInput("path") || path.join("profile", `${card}.svg`);
  const resolved = path.resolve(process.cwd(), outputPath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, result.content, "utf8");

  info(`Wrote ${resolved}`);
  setOutput("path", outputPath);
};

try {
  await run();
} catch (error) {
  setFailed(error instanceof Error ? error.message : String(error));
}
