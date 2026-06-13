import { NextRequest, NextResponse } from "next/server";

type Track = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  sourceUrl: string;
  mediaType: "video" | "audio";
  embedUrl?: string;
  audioUrl?: string;
};

const extractYouTubeId = (urlString: string): string | null => {
  try {
    const parsed = new URL(urlString);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.slice(1) || null;
    }
    if (parsed.hostname.includes("youtube.com")) {
      return parsed.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
};

const searchWithBrave = async (query: string, apiKey: string): Promise<Track[]> => {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
    `${query} site:youtube.com/watch`
  )}&count=18`;

  const response = await fetch(url, {
    headers: {
      "X-Subscription-Token": apiKey,
      Accept: "application/json"
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`Brave search failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    web?: {
      results?: Array<{
        title?: string;
        url?: string;
        description?: string;
      }>;
    };
  };

  const tracks = (data.web?.results ?? [])
    .map((item) => {
      const sourceUrl = item.url ?? "";
      const id = extractYouTubeId(sourceUrl);
      if (!id) {
        return null;
      }

      return {
        id,
        title: item.title ?? "Untitled Track",
        channel: "YouTube",
        thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        sourceUrl,
        mediaType: "video" as const,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
      };
    })
    .filter((item) => item !== null) as Track[];

  return tracks;
};

const searchWithYouTube = async (query: string, apiKey: string): Promise<Track[]> => {
  const params = new URLSearchParams({
    part: "snippet",
    maxResults: "18",
    q: query,
    type: "video",
    videoCategoryId: "10",
    key: apiKey
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params.toString()}`,
    { next: { revalidate: 0 } }
  );

  if (!response.ok) {
    throw new Error(`YouTube API failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        channelTitle?: string;
        thumbnails?: {
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
    }>;
  };

  return (data.items ?? [])
    .map((item) => {
      const id = item.id?.videoId;
      if (!id) {
        return null;
      }
      return {
        id,
        title: item.snippet?.title ?? "Untitled Track",
        channel: item.snippet?.channelTitle ?? "YouTube",
        thumbnail:
          item.snippet?.thumbnails?.high?.url ??
          item.snippet?.thumbnails?.medium?.url ??
          item.snippet?.thumbnails?.default?.url ??
          `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        sourceUrl: `https://www.youtube.com/watch?v=${id}`,
        mediaType: "video" as const,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
      };
    })
    .filter((item) => item!== null)as Track[];
};

const collectVideoRenderers = (node: unknown, acc: Array<Record<string, unknown>>) => {
  if (!node || typeof node !== "object") {
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectVideoRenderers(item, acc));
    return;
  }

  const objectNode = node as Record<string, unknown>;
  if (objectNode.videoRenderer && typeof objectNode.videoRenderer === "object") {
    acc.push(objectNode.videoRenderer as Record<string, unknown>);
  }

  Object.values(objectNode).forEach((value) => collectVideoRenderers(value, acc));
};

const searchWithYouTubeWeb = async (query: string): Promise<Track[]> => {
  const response = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      },
      next: { revalidate: 0 }
    }
  );

  if (!response.ok) {
    throw new Error(`YouTube web search failed with ${response.status}`);
  }

  const html = await response.text();
  const initialDataMatch =
    html.match(/var ytInitialData = (\{.*?\});<\/script>/s) ??
    html.match(/ytInitialData"\s*:\s*(\{.*?\})\s*,\s*"ytInitialPlayerResponse"/s);

  if (!initialDataMatch?.[1]) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(initialDataMatch[1]);
  } catch {
    return [];
  }

  const videoRenderers: Array<Record<string, unknown>> = [];
  collectVideoRenderers(parsed, videoRenderers);

  return videoRenderers
    .slice(0, 18)
    .map((video) => {
      const id = typeof video.videoId === "string" ? video.videoId : null;
      if (!id) {
        return null;
      }

      const titleRuns =
        (video.title as { runs?: Array<{ text?: string }> } | undefined)?.runs ?? [];
      const title =
        titleRuns.map((run) => run.text ?? "").join("").trim() || "Untitled Track";

      const channel =
        (video.ownerText as { runs?: Array<{ text?: string }> } | undefined)?.runs?.[0]?.text ??
        "YouTube";

      const thumbnailList =
        (video.thumbnail as { thumbnails?: Array<{ url?: string }> } | undefined)?.thumbnails ??
        [];
      const thumbnail =
        thumbnailList[thumbnailList.length - 1]?.url ??
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

      return {
        id,
        title,
        channel,
        thumbnail,
        sourceUrl: `https://www.youtube.com/watch?v=${id}`,
        mediaType: "video" as const,
        embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
      };
    })
    .filter((item) => item!== null) as Track[];
};

const searchWithITunes = async (query: string): Promise<Track[]> => {
  const params = new URLSearchParams({
    term: query,
    media: "music",
    entity: "song",
    limit: "18"
  });

  const response = await fetch(`https://itunes.apple.com/search?${params.toString()}`, {
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`iTunes API failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    results?: Array<{
      trackId?: number;
      trackName?: string;
      artistName?: string;
      artworkUrl100?: string;
      previewUrl?: string;
      trackViewUrl?: string;
    }>;
  };

  return (data.results ?? [])
    .map((item) => {
      if (!item.trackId || !item.previewUrl) {
        return null;
      }

      const id = `it-${item.trackId}`;
      const cover =
        item.artworkUrl100?.replace("100x100bb", "512x512bb") ??
        "https://via.placeholder.com/512x512.png?text=Musico";

      return {
        id,
        title: item.trackName ?? "Untitled Track",
        channel: item.artistName ?? "iTunes",
        thumbnail: cover,
        sourceUrl: item.trackViewUrl ?? "https://music.apple.com",
        mediaType: "audio" as const,
        audioUrl: item.previewUrl
      };
    })
    .filter((item) => item!== null) as Track[];
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing search query." }, { status: 400 });
  }

  const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  const allowPreviewFallback = process.env.ALLOW_PREVIEW_FALLBACK === "true";

  try {
    let tracks: Track[] = [];

    if (youtubeApiKey) {
      tracks = await searchWithYouTube(query, youtubeApiKey);
    }

    if (!tracks.length) {
      tracks = await searchWithYouTubeWeb(query);
    }

    if (!tracks.length && braveApiKey) {
      tracks = await searchWithBrave(query, braveApiKey);
    }

    if (!tracks.length && allowPreviewFallback) {
      tracks = await searchWithITunes(query);
    }

    if (!tracks.length) {
      return NextResponse.json(
        {
          error:
            "No YouTube tracks found for this query. Add/verify YOUTUBE_API_KEY (and optionally BRAVE_SEARCH_API_KEY), or set ALLOW_PREVIEW_FALLBACK=true to use 30-second previews."
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ tracks });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Search provider request failed.",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
