const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function curlFetch(
  url: string,
  headers: Record<string, string>
): Promise<string | null> {
  if (process.platform !== "win32") return null;
  const { spawnSync } = await import("child_process");
  const args = [
    "-s",
    "-L",
    "-A",
    headers["User-Agent"] || USER_AGENT,
    "-H",
    `Accept: ${headers.Accept}`,
    "-H",
    `Accept-Language: ${headers["Accept-Language"]}`,
  ];
  if (headers.Referer) args.push("-H", `Referer: ${headers.Referer}`);
  args.push(url);

  const out = spawnSync("curl.exe", args, {
    encoding: "utf8",
    maxBuffer: 15 * 1024 * 1024,
  });
  if (out.status === 0 && out.stdout?.includes("lower-row")) {
    return out.stdout;
  }
  return null;
}

/** Récupère une page HTML — retries + curl.exe sur Windows si 403. */
export async function fetchHtmlWithFallback(
  url: string,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,fr;q=0.8",
    ...extraHeaders,
  };

  const delays = [0, 4000, 10000, 20000];
  let lastStatus = 0;

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) {
      await sleep(delays[i]);
    }

    try {
      const res = await fetch(url, { headers, next: { revalidate: 0 } });
      lastStatus = res.status;
      if (res.ok) {
        const text = await res.text();
        if (text.includes("lower-row")) return text;
      }
    } catch {
      /* retry */
    }

    const viaCurl = await curlFetch(url, headers);
    if (viaCurl) return viaCurl;
  }

  throw new Error(
    `HTTP ${lastStatus || 403} pour ${url} (fetch et curl, retries épuisés)`
  );
}
