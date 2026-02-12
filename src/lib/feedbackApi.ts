import Constants from 'expo-constants';
import { Platform } from 'react-native';

export type FeedbackRequestType = 'feedback' | 'bug_report';

export type FeedbackImagePayload = {
  filename: string;
  mimeType: string;
  base64: string;
};

type SubmitFeedbackParams = {
  type: FeedbackRequestType;
  name?: string;
  email: string;
  message: string;
  featureRequest?: string;
  images?: FeedbackImagePayload[];
};

type ErrorResponse = {
  error?: unknown;
};

const FEEDBACK_ENDPOINT = 'https://onemoreset-feedback.andrewying1999.workers.dev/feedback';
const REQUEST_TIMEOUT_MS = 15000;

const sanitizeText = (value: string, maxLength: number): string => value.trim().slice(0, maxLength);

const normalizeBase64 = (value: string): string =>
  value.trim().replace(/^data:[^,]+,/, '').replace(/\s+/g, '');

const resolveAppVersion = (): string => {
  const configVersion = Constants.expoConfig?.version;
  if (typeof configVersion === 'string' && configVersion.trim().length > 0) {
    return configVersion.trim();
  }

  const nativeVersion = Constants.nativeAppVersion;
  if (typeof nativeVersion === 'string' && nativeVersion.trim().length > 0) {
    return nativeVersion.trim();
  }

  return 'unknown';
};

const resolveDeviceModel = (): string => {
  const maybeDeviceName = (Constants as unknown as { deviceName?: unknown }).deviceName;
  return typeof maybeDeviceName === 'string' && maybeDeviceName.trim().length > 0
    ? maybeDeviceName.trim()
    : 'unknown';
};

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as ErrorResponse;
    if (typeof data.error === 'string' && data.error.trim().length > 0) {
      return data.error.trim();
    }
  } catch {
    // no-op
  }

  return `Request failed (${response.status})`;
};

export async function submitFeedback(params: SubmitFeedbackParams): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const normalizedImages =
    params.images && params.images.length > 0
      ? params.images.map((image) => ({
        filename: sanitizeText(image.filename, 120),
        mimeType: sanitizeText(image.mimeType, 100),
        base64: normalizeBase64(image.base64),
      }))
      : undefined;

  const payload = {
    type: params.type,
    name: params.name ? sanitizeText(params.name, 120) : '',
    email: sanitizeText(params.email, 200),
    message: sanitizeText(params.message, 5000),
    featureRequest: params.featureRequest ? sanitizeText(params.featureRequest, 2000) : '',
    appVersion: resolveAppVersion(),
    platform: Platform.OS,
    osVersion: String(Platform.Version),
    deviceModel: resolveDeviceModel(),
    // Keep legacy single-image key for older deployed workers while using the new images array.
    image: normalizedImages ? normalizedImages[0] : undefined,
    images: normalizedImages,
  };

  try {
    const response = await fetch(FEEDBACK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }

    if (error instanceof Error && error.message.trim().length > 0) {
      throw error;
    }

    throw new Error('Unable to submit right now. Please try again.');
  } finally {
    clearTimeout(timeoutId);
  }
}
