import axiosInstance from "@/utils/axiosInstance";
import type { ConsentEnvelope, ConsentWrite } from "./logic";

const PATH = "/cookie-consent/";

type ConsentResponse = ConsentEnvelope & { csrf_token?: string };

let csrfToken = "";

function rememberCsrf(data: ConsentResponse): ConsentEnvelope {
  if (data.csrf_token) csrfToken = data.csrf_token;
  return data;
}

export async function fetchConsent(): Promise<ConsentEnvelope> {
  const response = await axiosInstance.get<ConsentResponse>(PATH);
  return rememberCsrf(response.data);
}

export async function saveConsent(body: ConsentWrite): Promise<ConsentEnvelope> {
  const response = await axiosInstance.put<ConsentResponse>(PATH, body, {
    headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
  });
  return rememberCsrf(response.data);
}
