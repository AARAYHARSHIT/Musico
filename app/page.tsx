"use client";

import { FormEvent, useEffect, useState } from "react";

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

export default function Home() {
  const [query, setQuery] = useState("Lofi hip hop");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void runSearch("Lofi hip hop");
  }, []);

  const runSearch = async (searchQuery: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const payload = (await response.json()) as { tracks?: Track[]; error?: string };

      if (!response.ok || !payload.tracks?.length) {
        throw new Error(payload.error ?? "No tracks found.");
      }

      setTracks(payload.tracks);
      setActiveTrack(payload.tracks[0] ?? null);
    } catch (searchError) {
      setTracks([]);
      setActiveTrack(null);
      setError(searchError instanceof Error ? searchError.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return;
    }
    await runSearch(cleanQuery);
  };

  return (
    <main className="musico-root">
      <section className="hero container">
        <div className="logo-chip">
          <span className="material-icons">graphic_eq</span>
          Musico
        </div>
        <h1>Find music instantly.</h1>
        <p>
          A sleek online music surface inspired by modern streaming apps, with smooth hover effects
          and instant multi-source music search.
        </p>

        <form onSubmit={onSubmit} className="search-shell glass-card">
          <div className="input-field search-input-wrap">
            <span className="material-icons left">search</span>
            <input
              id="music-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search artist, mood, track..."
            />
          </div>
          <button className="btn waves-effect waves-light search-btn" type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
        {error ? <p className="error-note">{error}</p> : null}
      </section>

      <section className="container player-grid">
        <article className="glass-card now-playing">
          <h2>Now Playing</h2>
          {activeTrack ? (
            <>
              {activeTrack.mediaType === "video" ? (
                <div className="video-wrap">
                  <iframe
                    src={activeTrack.embedUrl}
                    title={activeTrack.title}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="audio-wrap">
                  <img src={activeTrack.thumbnail} alt={activeTrack.title} />
                  <audio controls autoPlay src={activeTrack.audioUrl} />
                </div>
              )}
              <div className="track-meta">
                <h3>{activeTrack.title}</h3>
                <p>{activeTrack.channel}</p>
              </div>
            </>
          ) : (
            <p className="muted-copy">Search a track to start playing.</p>
          )}
        </article>

        <article className="glass-card results">
          <div className="results-head">
            <h2>Top Results</h2>
            <span>{tracks.length} tracks</span>
          </div>
          <div className="results-list">
            {tracks.map((track) => (
              <button
                key={track.id}
                className={`track-item ${activeTrack?.id === track.id ? "active" : ""}`}
                onClick={() => setActiveTrack(track)}
                type="button"
              >
                <img src={track.thumbnail} alt={track.title} loading="lazy" />
                <span>
                  <strong>{track.title}</strong>
                  <small>{track.channel}</small>
                </span>
                <i className="material-icons">play_arrow</i>
              </button>
            ))}

            {!loading && !tracks.length ? (
              <p className="muted-copy">No tracks available. Try another query.</p>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
