/**
 * Payload for creating a checkout session in the backend payment service.
 */
export type CreatePaymentCheckoutPayload = {
  subRaceId: string;
  participant: {
    fullName: string;
    email: string;
    dateOfBirth: string;
    gender: string;
    teamName: string;
    nationality: string;
    uciNumber?: string;
  };
  successUrl: string;
  cancelUrl: string;
};

/**
 * Successful response returned by the backend payment service.
 */
export type CreatePaymentCheckoutResponse = {
  checkoutUrl: string;
  sessionId: string;
};

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getApiBaseUrl(): string {
  const explicitBase = import.meta.env.VITE_API_BASE_URL;

  if (!explicitBase) {
    throw new Error('Missing VITE_API_BASE_URL environment variable.');
  }

  return trimTrailingSlash(explicitBase);
}

/**
 * Creates a Stripe Checkout session through the backend and returns the redirect URL.
 */
export async function createPaymentCheckout(
  payload: CreatePaymentCheckoutPayload
): Promise<CreatePaymentCheckoutResponse> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/payments/create-payment-intent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const body = (await response.json()) as
    | CreatePaymentCheckoutResponse
    | { message?: string; errors?: Array<{ msg?: string }> };

  if (!response.ok || !('checkoutUrl' in body) || !body.checkoutUrl) {
    const validationMessage =
      'errors' in body && Array.isArray(body.errors) && body.errors[0]?.msg
        ? body.errors[0].msg
        : null;

    throw new Error(
      validationMessage ||
        ('message' in body && body.message) ||
        'Could not start checkout.'
    );
  }

  return body;
}
