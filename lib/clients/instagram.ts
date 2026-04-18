import axios from "axios";

const IG_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
const IG_USER_ID = process.env.INSTAGRAM_USER_ID ?? "";
const GRAPH_API_BASE = "https://graph.facebook.com/v25.0";

interface PublishResult {
  success: boolean;
  mediaId?: string;
  error?: string;
}

function validateEnv(): string | null {
  if (!IG_ACCESS_TOKEN || !IG_USER_ID) {
    return "Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID in your environment to enable auto-posting";
  }
  return null;
}

async function createMediaContainer(
  payload: Record<string, string>,
): Promise<{ success: boolean; containerId?: string; error?: string }> {
  const envError = validateEnv();
  if (envError) {
    return { success: false, error: envError };
  }

  try {
    const response = await axios.post(
      `${GRAPH_API_BASE}/${IG_USER_ID}/media`,
      null,
      {
        params: {
          ...payload,
          access_token: IG_ACCESS_TOKEN,
        },
        timeout: 30_000,
      },
    );

    return {
      success: true,
      containerId: String(response.data?.id ?? ""),
    };
  } catch (error: unknown) {
    const message =
      axios.isAxiosError(error)
        ? (error.response?.data?.error?.message as string | undefined) ??
          error.message
        : error instanceof Error
          ? error.message
          : "Instagram media creation failed";

    return { success: false, error: message };
  }
}

async function publishContainer(creationId: string): Promise<PublishResult> {
  try {
    const response = await axios.post(
      `${GRAPH_API_BASE}/${IG_USER_ID}/media_publish`,
      null,
      {
        params: {
          creation_id: creationId,
          access_token: IG_ACCESS_TOKEN,
        },
        timeout: 30_000,
      },
    );

    return {
      success: true,
      mediaId: String(response.data?.id ?? ""),
    };
  } catch (error: unknown) {
    const message =
      axios.isAxiosError(error)
        ? (error.response?.data?.error?.message as string | undefined) ??
          error.message
        : error instanceof Error
          ? error.message
          : "Instagram publishing failed";

    return { success: false, error: message };
  }
}

export const instagramClient = {
  hasCredentials(): boolean {
    return Boolean(IG_ACCESS_TOKEN && IG_USER_ID);
  },

  async publishPhoto(imageUrl: string, caption: string): Promise<PublishResult> {
    const created = await createMediaContainer({
      image_url: imageUrl,
      caption,
      media_type: "IMAGE",
    });

    if (!created.success || !created.containerId) {
      return { success: false, error: created.error ?? "Instagram media creation failed" };
    }

    return publishContainer(created.containerId);
  },

  async publishReel(videoUrl: string, caption: string): Promise<PublishResult> {
    const created = await createMediaContainer({
      video_url: videoUrl,
      caption,
      media_type: "REELS",
    });

    if (!created.success || !created.containerId) {
      return { success: false, error: created.error ?? "Instagram media creation failed" };
    }

    return publishContainer(created.containerId);
  },

  async getAccountInfo(): Promise<{ username: string; id: string }> {
    const envError = validateEnv();
    if (envError) {
      throw new Error(envError);
    }

    const response = await axios.get(`${GRAPH_API_BASE}/${IG_USER_ID}`, {
      params: {
        fields: "username,id",
        access_token: IG_ACCESS_TOKEN,
      },
      timeout: 30_000,
    });

    return {
      username: String(response.data?.username ?? ""),
      id: String(response.data?.id ?? IG_USER_ID),
    };
  },

  async getMediaPermalink(mediaId: string): Promise<string | null> {
    const envError = validateEnv();
    if (envError) {
      return null;
    }

    try {
      const response = await axios.get(`${GRAPH_API_BASE}/${mediaId}`, {
        params: {
          fields: "permalink",
          access_token: IG_ACCESS_TOKEN,
        },
        timeout: 30_000,
      });

      const permalink = response.data?.permalink;
      return typeof permalink === "string" ? permalink : null;
    } catch {
      return null;
    }
  },
};
