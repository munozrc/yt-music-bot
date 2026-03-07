import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import {
  BG,
  buildURL,
  GOOG_API_KEY,
  USER_AGENT,
  type WebPoSignalOutput,
} from "bgutils-js";
import { JSDOM } from "jsdom";
import Innertube, {
  Platform,
  type Types,
  UniversalCache,
  Utils,
  YTNodes,
} from "youtubei.js";

import { logger } from "@/config/logger";

import { Track } from "../../domain/entities/Track";
import type {
  AudioProvider,
  AudioStream,
} from "../../domain/repositories/AudioProvider";
import { TrackUrl } from "../../domain/value-objects/TrackUrl";

export class YoutubeAudioProvider implements AudioProvider {
  private client: Innertube;
  private static readonly YOUTUBE_REGEX =
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;

  private constructor(innertube: Innertube) {
    this.client = innertube;
  }

  /**
   * Factory method to create an instance of YoutubeAudioProvider.
   * @returns A promise that resolves to a YoutubeAudioProvider instance.
   */
  static async create(): Promise<YoutubeAudioProvider> {
    // Setup eval shim for youtubei.js
    Platform.shim.eval = async (
      data: Types.BuildScriptResult,
      env: Record<string, Types.VMPrimative>,
    ) => {
      const properties = [];
      if (env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`);
      if (env.sig)
        properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
      const code = `${data.output}\nreturn { ${properties.join(", ")} }`;
      return new Function(code)();
    };

    const innertube = await Innertube.create({
      user_agent: USER_AGENT,
      cache: new UniversalCache(true),
      enable_session_cache: false,
      player_id: "140dafda",
    });

    return new YoutubeAudioProvider(innertube);
  }

  supports(query: string): boolean {
    // Accepts YouTube URLs or plain search terms (fallback provider)
    return (
      YoutubeAudioProvider.YOUTUBE_REGEX.test(query) ||
      !query.startsWith("http")
    );
  }

  async resolve(query: string, requestedBy: string): Promise<Track> {
    const results = await this.client.music.search(query);

    // Navigate to the MusicShelf node containing the search results
    const musicShelf = results.contents?.[1]?.as(YTNodes.MusicShelf);
    const rawItems =
      musicShelf?.contents.as(YTNodes.MusicResponsiveListItem) ?? [];

    // Map raw items to SearchResult format
    const songs = rawItems.map((item) => {
      const artists = item.artists?.length
        ? item.artists
            .map((artist) => artist.name ?? "Unknown Artist")
            .join(", ")
        : (item.author?.name ?? "Unknown Artist");

      return {
        artists,
        title: item.title ?? "Unknown Title",
        videoId: item.id,
      };
    });

    const [firstSong] = songs.filter((song) => song.videoId);
    if (!firstSong) {
      throw new Error(`No valid YouTube results found for query: "${query}"`);
    }

    return Track.create(firstSong.videoId ?? "", {
      title: firstSong.title,
      thumbnailUrl: `https://i.ytimg.com/vi/${firstSong.videoId}/hqdefault.jpg`,
      durationSeconds: 0,
      url: TrackUrl.create(
        `https://www.youtube.com/watch?v=${firstSong.videoId}`,
      ),
      author: firstSong.artists,
      requestedBy,
    });
  }

  async stream(track: Track): Promise<AudioStream> {
    const cacheDir = path.resolve(process.cwd(), ".cache");
    if (!existsSync(cacheDir)) {
      mkdirSync(cacheDir);
    }

    const videoId = this.extractVideoId(track.url.getValue());
    const filename = `yt-provider-${videoId}.webm`;
    const filePath = path.resolve(cacheDir, filename);

    if (existsSync(filePath)) {
      return {
        resource: filePath,
        mimeType: "audio/webm",
      };
    }

    try {
      logger.debug(`Downloading ${videoId} to ${filename}...`);
      const { poToken } = await this.generateWebPoToken(videoId);

      const audioStream = await this.client.download(videoId, {
        type: "video+audio",
        quality: "bestefficiency",
        po_token: poToken,
        format: "mp4",
      });

      const tempWrite = createWriteStream(filePath, {
        encoding: "binary",
        flags: "w",
      });

      // Write the audio stream to the temporary file
      for await (const chunk of Utils.streamToIterable(audioStream)) {
        tempWrite.write(chunk);
      }

      // Finalize the write stream
      tempWrite.end();
      logger.debug(`Downloaded and cached: ${filename}`);

      return {
        resource: filePath,
        mimeType: "audio/webm",
      };
    } catch (error) {
      logger.error(`Failed to download ${videoId}:`, error);
      throw new Error(`Failed to download and cache track: ${track.title}`);
    }
  }

  private extractVideoId(url: string): string {
    const urlParams = new URLSearchParams(new URL(url).search);
    const videoId = urlParams.get("v");

    if (!videoId) {
      throw new Error("Video ID not found in URL");
    }

    return videoId;
  }

  /**
   * Generates a Web Po Token for YouTube requests.
   * @param contentBinding The content binding identifier.
   * @returns A promise that resolves to the Web Po Token result.
   */
  private async generateWebPoToken(contentBinding: string) {
    if (!contentBinding) {
      throw new Error("Could not get visitor data");
    }

    const dom = new JSDOM(
      '<!DOCTYPE html><html lang="en"><head><title></title></head><body></body></html>',
      {
        url: "https://www.youtube.com/",
        referrer: "https://www.youtube.com/",
      },
    );

    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      location: dom.window.location,
      origin: dom.window.origin,
    });

    if (!Reflect.has(globalThis, "navigator")) {
      Object.defineProperty(globalThis, "navigator", {
        value: dom.window.navigator,
      });
    }

    const challengeResponse = await this.client.getAttestationChallenge(
      "ENGAGEMENT_TYPE_UNBOUND",
    );

    if (!challengeResponse.bg_challenge) {
      throw new Error("Could not get challenge");
    }

    const interpreterUrl =
      challengeResponse.bg_challenge.interpreter_url
        .private_do_not_access_or_else_trusted_resource_url_wrapped_value;
    const bgScriptResponse = await fetch(`https:${interpreterUrl}`);
    const interpreterJavascript = await bgScriptResponse.text();

    if (interpreterJavascript) {
      new Function(interpreterJavascript)();
    } else {
      throw new Error("Could not load VM");
    }

    const botGuard = await BG.BotGuardClient.create({
      program: challengeResponse.bg_challenge.program,
      globalName: challengeResponse.bg_challenge.global_name,
      globalObj: globalThis,
    });

    const webPoSignalOutput: WebPoSignalOutput = [];
    const botGuardResponse = await botGuard.snapshot({ webPoSignalOutput });
    const requestKey = "O43z0dpjhgX20SCx4KAo";

    const integrityTokenResponse = await fetch(buildURL("GenerateIT", true), {
      method: "POST",
      headers: {
        "content-type": "application/json+protobuf",
        "x-goog-api-key": GOOG_API_KEY,
        "x-user-agent": "grpc-web-javascript/0.1",
        "user-agent": USER_AGENT,
      },
      body: JSON.stringify([requestKey, botGuardResponse]),
    });

    const response = (await integrityTokenResponse.json()) as unknown[];

    if (typeof response[0] !== "string") {
      throw new Error("Could not get integrity token");
    }

    const integrityTokenBasedMinter = await BG.WebPoMinter.create(
      { integrityToken: response[0] },
      webPoSignalOutput,
    );

    const contentPoToken =
      await integrityTokenBasedMinter.mintAsWebsafeString(contentBinding);

    return {
      poToken: contentPoToken,
      visitorData: contentBinding,
    };
  }
}
