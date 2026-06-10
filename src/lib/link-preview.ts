import ogs from "open-graph-scraper";
import type { OgObject } from "open-graph-scraper/types";

export type LinkPreviewMetadata = {
  previewTitle: string | null;
  previewDescription: string | null;
  previewImage: string | null;
  previewSiteName: string | null;
};

const USER_AGENT =
  "Mozilla/5.0 (compatible; TripMate/1.0; +https://tripmate.local)";
const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_SITE_NAME_LENGTH = 120;

const normalizeText = (value: string | undefined, maxLength: number) => {
  const normalized = value?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 3)}...`
    : normalized;
};

export const getUrlHostname = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const getAbsoluteImageUrl = (imageUrl: string | undefined, pageUrl: string) => {
  if (!imageUrl) {
    return null;
  }

  try {
    return new URL(imageUrl, pageUrl).toString();
  } catch {
    return null;
  }
};

const getPreviewImage = (result: OgObject, pageUrl: string) => {
  const image = result.ogImage?.find((item) => item.url)?.url;

  return getAbsoluteImageUrl(image, pageUrl);
};

export const getFallbackLinkPreview = (url: string): LinkPreviewMetadata => {
  const hostname = getUrlHostname(url);

  return {
    previewTitle: hostname,
    previewDescription: null,
    previewImage: null,
    previewSiteName: hostname,
  };
};

export const fetchLinkPreviewMetadata = async (
  url: string,
): Promise<LinkPreviewMetadata> => {
  const fallback = getFallbackLinkPreview(url);

  try {
    const data = await ogs({
      url,
      timeout: 6,
      fetchOptions: {
        headers: {
          "user-agent": USER_AGENT,
        },
      },
    });

    if (data.error) {
      return fallback;
    }

    const result = data.result;
    const previewTitle =
      normalizeText(result.ogTitle, MAX_TITLE_LENGTH) ?? fallback.previewTitle;
    const previewDescription = normalizeText(
      result.ogDescription,
      MAX_DESCRIPTION_LENGTH,
    );
    const previewSiteName =
      normalizeText(result.ogSiteName, MAX_SITE_NAME_LENGTH) ??
      fallback.previewSiteName;

    return {
      previewTitle,
      previewDescription,
      previewImage: getPreviewImage(result, url),
      previewSiteName,
    };
  } catch {
    return fallback;
  }
};
