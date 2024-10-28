export async function sendRequest(url: string, body: string): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body,
  });

  if (!response.ok) {
    const errorMessage = await response.text();
    throw new Error(`Request to ${url} failed: ${response.statusText} - ${errorMessage}`);
  }
}

export async function sendGetRequest(url: string): Promise<string> {
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });

  if (!response.ok) {
    const errorMessage = await response.text();
    throw new Error(`Request to ${url} failed: ${response.statusText} - ${errorMessage}`);
  }

  return response.text();
}
