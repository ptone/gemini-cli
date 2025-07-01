# Gemini CLI: Quota and Pricing

The quotas and pricing that apply to your usage of Gemini CLI depend on the type of account you use to authenticate with Google. Additionally both pricing and quota may may be calculated differently based on model version, requests, and tokens used.  A summary of model usage is available through the /stats command, and presented on exit at the end of a session. See [privacy and terms](./tos-privacy.md) for details on Privacy policy and Terms of Service. Published prices are list price, additional negotiated commercial discounting my apply.

This article outlines the specific quotas and pricing applicable for Gemini when using different authentication methods.

## 1. Login with Google (Gemini Code Assist Free Tier)

For users who authenticate using their Google account to access Gemini Code Assist for individuals:

- **Quota:**
    - 60 requests per minute
    - 1000 requests per day
    - Token usage is not applicable
- **Cost:** Free
- **Details:** [Gemini Code Assist Quotas](https://developers.google.com/gemini-code-assist/resources/quotas#quotas-for-agent-mode-gemini-cli)
- **Notes:** Specific quota for different models is not specified; model fallback may occur to preserve shared expeirence quality.

## 2. Gemini API Key (Unpaid)

If you are using a Gemini API key for the free tier:

- **Quota:**
    - Flash model only
    - 10 requests per minute
    - 250 requests per day
- **Cost:** Free
- **Details:** [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)


## 3. Gemini API Key (Paid)

If you are using a Gemini API key with a paid plan:

- **Quota:** Varies by pricing tier.
- **Cost:** Varies by pricing tier and model/token usage.
- **Details:** [Gemini API Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits), [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)

## 4. Login with Google (for Workspace or Licensed Code Assist users)

For users of Standard or Enterprise editions of Gemini Code Assist, quotas and pricing is based on a fixed price subsciption with assigned license seats:

- **Standard Tier:**
    - **Quota:** 120 requests per minute, 1500 per day
- **Enterprise Tier:**
    - **Quota:** 120 requests per minute, 2000 per day
- **Cost:** Fixed price included with your Gemini for Google Workspace or Gemini Code Assist subscription.
- **Details:** [Gemini Code Assist Quotas](https://developers.google.com/gemini-code-assist/resources/quotas#quotas-for-agent-mode-gemini-cli), [Gemini Code Assist Pricing](https://cloud.google.com/products/gemini/pricing)
- **Notes:**
    - Specific quota for different models is not specified; model fallback may occur to preserve shared expeirence quality.
    - Members of the Google Developer Program may have Gemini Code Assist licenses through their membership.


## 5. Vertex AI (Express Mode)

If you are using Vertex AI in Express Mode:

- **Quota:** Quotas are variable and specific to your account. See the source for more details.
- **Cost:** After your express mode usage is consumed and you enable billing for your project, cost is based on standard [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing).
- **Details:** [Vertex AI Express Mode Quotas](https://cloud.google.com/vertex-ai/generative-ai/docs/start/express-mode/overview#quotas)

## 6. Vertex AI (Regular Mode)

If you are using the standard Vertex AI service:

- **Quota:** Governed by a dynamic shared quota system or pre-purchased provisioned throughput.
- **Cost:** Based on model and token usage. See [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing).
- **Details:** [Vertex AI Dynamic Shared Quota](https://cloud.google.com/vertex-ai/generative-ai/docs/resources/dynamic-shared-quota)


## 7. Google One and Ultra plans, Gemini for Workspace plans

These plans currenly apply only to use of Gemini web based products provided by Google  based experiences (e.g., the Gemini web app, Flow video editor, etc) and do not apply to API usage which is powering Gemini CLI. Supporting these plans is under active consideration for future support.